const fs = require('fs')
const path = require('path')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const { z } = require('zod')

const env = require('../config/env')
const connectToDB = require('../config/database')
const { ROLES, SEED_EXPECTATIONS } = require('../constants')
const AuthorProfile = require('../models/AuthorProfile')
const Book = require('../models/Book')
const User = require('../models/User')

const nullableDate = z
  .union([z.string().min(1), z.null()])
  .transform((value) => (value ? new Date(value) : null))

const nullableNumber = z.union([z.number(), z.null()])

const bookSchema = z.object({
  book_id: z.string().min(1),
  title: z.string().min(1),
  isbn: z.string().nullable().optional(),
  genre: z.string().nullable().optional(),
  publication_date: nullableDate,
  status: z.string().min(1),
  mrp: nullableNumber,
  author_royalty_per_copy: nullableNumber,
  total_copies_sold: z.number().min(0),
  total_royalty_earned: z.number().min(0),
  royalty_paid: z.number().min(0),
  royalty_pending: z.number().min(0),
  last_royalty_payout_date: nullableDate,
  print_partner: z.string().nullable().optional(),
  available_on: z.array(z.string()).default([]),
})

const authorSchema = z.object({
  author_id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  joined_date: nullableDate,
  books: z.array(bookSchema),
})

const datasetSchema = z.object({
  authors: z.array(authorSchema),
})

const loadDataset = () => {
  const filePath = path.join(__dirname, 'data', 'authors.json')
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  return datasetSchema.parse(raw)
}

const assertSourceTotals = (authors) => {
  const books = authors.flatMap((author) => author.books)
  const totals = {
    authors: authors.length,
    books: books.length,
    copiesSold: books.reduce((sum, book) => sum + book.total_copies_sold, 0),
    royaltyEarned: books.reduce((sum, book) => sum + book.total_royalty_earned, 0),
    royaltyPaid: books.reduce((sum, book) => sum + book.royalty_paid, 0),
    royaltyPending: books.reduce((sum, book) => sum + book.royalty_pending, 0),
  }

  const mismatches = Object.entries(SEED_EXPECTATIONS)
    .filter(([key, expected]) => totals[key] !== expected)
    .map(([key, expected]) => `${key}: expected ${expected}, got ${totals[key]}`)

  if (mismatches.length > 0) {
    throw new Error('Source dataset failed validation:\n' + mismatches.join('\n'))
  }

  return totals
}

const upsertUser = async (fields) => {
  const user = (await User.findOne({ email: fields.email })) || new User()
  user.set(fields)
  await user.save()
}

const upsertAuthorAndBooks = async (author, authorPasswordHash) => {
  await AuthorProfile.findOneAndUpdate(
    { authorId: author.author_id },
    {
      $set: {
        authorId: author.author_id,
        name: author.name,
        email: author.email.toLowerCase(),
        phone: author.phone ?? null,
        city: author.city ?? null,
        joinedDate: author.joined_date,
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true }
  )

  await upsertUser({
    email: author.email.toLowerCase(),
    passwordHash: authorPasswordHash,
    role: ROLES.AUTHOR,
    authorId: author.author_id,
    isActive: true,
  })

  for (const book of author.books) {
    await Book.findOneAndUpdate(
      { bookId: book.book_id },
      {
        $set: {
          bookId: book.book_id,
          authorId: author.author_id,
          title: book.title,
          isbn: book.isbn ?? null,
          genre: book.genre ?? null,
          publicationDate: book.publication_date,
          status: book.status,
          mrp: book.mrp,
          authorRoyaltyPerCopy: book.author_royalty_per_copy,
          totalCopiesSold: book.total_copies_sold,
          totalRoyaltyEarned: book.total_royalty_earned,
          royaltyPaid: book.royalty_paid,
          royaltyPending: book.royalty_pending,
          lastRoyaltyPayoutDate: book.last_royalty_payout_date,
          printPartner: book.print_partner ?? null,
          availableOn: book.available_on || [],
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    )
  }
}

const upsertAdmin = async (adminPasswordHash) => {
  await upsertUser({
    email: env.SEED_ADMIN_EMAIL.toLowerCase(),
    passwordHash: adminPasswordHash,
    role: ROLES.ADMIN,
    authorId: null,
    isActive: true,
  })
}

const verifyImportedTotals = async () => {
  const [authorCount, bookCount, bookAgg] = await Promise.all([
    AuthorProfile.countDocuments(),
    Book.countDocuments(),
    Book.aggregate([
      {
        $group: {
          _id: null,
          copiesSold: { $sum: '$totalCopiesSold' },
          royaltyEarned: { $sum: '$totalRoyaltyEarned' },
          royaltyPaid: { $sum: '$royaltyPaid' },
          royaltyPending: { $sum: '$royaltyPending' },
        },
      },
    ]),
  ])

  const totals = bookAgg[0] || {
    copiesSold: 0,
    royaltyEarned: 0,
    royaltyPaid: 0,
    royaltyPending: 0,
  }

  const imported = {
    authors: authorCount,
    books: bookCount,
    copiesSold: totals.copiesSold,
    royaltyEarned: totals.royaltyEarned,
    royaltyPaid: totals.royaltyPaid,
    royaltyPending: totals.royaltyPending,
  }

  const mismatches = Object.entries(SEED_EXPECTATIONS)
    .filter(([key, expected]) => imported[key] !== expected)
    .map(([key, expected]) => `${key}: expected ${expected}, got ${imported[key]}`)

  if (mismatches.length > 0) {
    throw new Error('Imported database failed verification:\n' + mismatches.join('\n'))
  }

  return imported
}

const seed = async () => {
  const dataset = loadDataset()
  const sourceTotals = assertSourceTotals(dataset.authors)

  await connectToDB()

  const [authorPasswordHash, adminPasswordHash] = await Promise.all([
    bcrypt.hash(env.SEED_AUTHOR_PASSWORD, 10),
    bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10),
  ])

  for (const author of dataset.authors) {
    await upsertAuthorAndBooks(author, authorPasswordHash)
  }

  await upsertAdmin(adminPasswordHash)

  const imported = await verifyImportedTotals()
  const authorLogins = await User.countDocuments({ role: ROLES.AUTHOR })
  const adminLogins = await User.countDocuments({ role: ROLES.ADMIN })

  console.log('Seed completed successfully.')
  console.log('Source totals:', sourceTotals)
  console.log('Imported totals:', imported)
  console.log(`Author logins: ${authorLogins}`)
  console.log(`Admin logins: ${adminLogins}`)
  console.log(`Admin email: ${env.SEED_ADMIN_EMAIL}`)
  console.log('Author emails use the source dataset addresses.')
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.connection.close()
  })
