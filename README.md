# BookLeaf Author Support Portal

A full-stack web application for managing support tickets between BookLeaf authors and support team. Features real-time messaging, AI-powered ticket classification, file attachments, and role-based access control.

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Node](https://img.shields.io/badge/Node-v20+-brightgreen)
![React](https://img.shields.io/badge/React-19-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [API Endpoints](#api-endpoints)
- [File Structure](#file-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Overview

BookLeaf Author Support Portal is a comprehensive ticketing system designed for publishers to manage author support requests. It combines real-time communication, AI-assisted ticket handling, and file management in a single platform.

**Key Users:**
- **Authors:** Submit tickets, track status, receive updates in real-time
- **Admin/Support:** Manage tickets, generate AI drafts, assign and prioritize issues

---

## Features

### Core Features ✅

| Feature | Description |
|---------|-------------|
| **Authentication** | Secure login with JWT, role-based access (Admin/Author) |
| **Ticket Management** | Create, view, filter, search support tickets |
| **Real-time Messaging** | Bi-directional communication via Socket.IO |
| **File Attachments** | Upload/download files (PDF, Images, Documents) |
| **AI Integration** | Auto-classify tickets, recommend priority, generate response drafts |
| **Public & Internal Notes** | Public replies visible to authors, internal notes for admins only |
| **Author Dashboard** | View books, royalty info, ticket status at a glance |
| **Admin Dashboard** | Operations overview, ticket queue, assignment management |
| **Responsive Design** | Works on desktop, tablet, and mobile devices |
| **Database Seeding** | Pre-loaded sample data for testing |

### Advanced Features 🚀

- Real-time Socket.IO updates with REST API fallback
- Google Gemini AI for intelligent responses
- Drag-and-drop file uploads with validation
- Image inline previews
- Automatic ticket status progression
- Rate limiting and security hardening
- Comprehensive error handling

---

## Tech Stack

### Backend
```
Runtime:      Node.js v20+
Framework:    Express.js 5.3
Database:     MongoDB 5+
Real-time:    Socket.IO 4.8
Authentication: JWT + bcrypt
File Handling: multer 1.4
AI:           Google Gemini API
Validation:   Zod 4.6
```

### Frontend
```
Framework:    React 19
Build Tool:   Vite 8.3
UI Library:   Ant Design 6.6
Real-time:    Socket.IO client 4.7
Router:       React Router 7.18
HTTP:         Axios 1.7
State:        React Hooks + localStorage
```

### Database
```
Provider:     MongoDB Atlas
Collections:  Users, AuthorProfiles, Books, Tickets, TicketMessages
Indexes:      On frequently queried fields
Backups:      Automatic daily backups (Atlas)
```

---

## System Requirements

### Development Environment

**Minimum Requirements:**
- Node.js: v18.0.0 or higher
- npm: v9.0.0 or higher
- MongoDB: v5.0.0 or higher (local or Atlas)
- Git: Latest version

**Recommended:**
- Node.js: v20.0.0+
- npm: v10.0.0+
- MongoDB Atlas (cloud-hosted)
- 8GB RAM, SSD storage

### Production Deployment

- Vercel account (free tier works)
- MongoDB Atlas account (free M0 tier works)
- Google Gemini API key (free tier available)
- GitHub account (for deployment)

---

## Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/bookleaf-support-portal.git
cd bookleaf-support-portal
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

**What gets installed:**
- Express.js for API server
- MongoDB driver (Mongoose)
- Socket.IO for real-time features
- multer for file uploads
- Google Gemini API client
- JWT & bcrypt for authentication
- Zod for validation

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

**What gets installed:**
- React framework
- Vite build tool
- Ant Design UI components
- Socket.IO client
- React Router for navigation
- Axios for API calls

### Step 4: Verify Installation

```bash
# Backend
cd backend
npm list

# Frontend
cd ../frontend
npm list
```

---

## Configuration

### Step 1: Environment Variables Setup

#### Backend Configuration

Create `backend/.env` file:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/bookleaf_support
MONGODB_DB_NAME=bookleaf_support

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1d
COOKIE_NAME=bookleaf_session

# AI (Google Gemini)
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-3.5-flash-lite

# AI Settings
AI_TIMEOUT_MS=20000
AI_MAX_RETRIES=1
AI_MAX_OUTPUT_TOKENS=700

# Logging
LOG_LEVEL=info

# Seeding
SEED_AUTHOR_PASSWORD=Author@123456
SEED_ADMIN_EMAIL=admin@bookleaf.local
SEED_ADMIN_PASSWORD=Admin@123456
```

#### Frontend Configuration

Create `frontend/.env` file:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

### Step 2: Get API Keys

#### MongoDB Atlas

1. Go to https://cloud.mongodb.com
2. Create account and project
3. Create M0 (free) cluster
4. Set database username and password
5. Allow network access (0.0.0.0/0 for development)
6. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`

#### Google Gemini API

1. Go to https://aistudio.google.com/app/apikey
2. Click "Get API Key"
3. Create new API key
4. Copy and paste to `.env` file

---

## Database Setup

### Step 1: MongoDB Connection

**Option A: Local MongoDB**

```bash
# Install MongoDB locally
# macOS (Homebrew)
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install -y mongodb

# Windows
# Download from https://www.mongodb.com/try/download/community
```

**Option B: MongoDB Atlas (Cloud)**

```bash
# Connection string format
mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

### Step 2: Database Seeding

Seed includes: 10 authors, 18 books, test users, sample data

```bash
cd backend
npm run seed
```

**What gets seeded:**
- Admin user: `admin@bookleaf.local` / `Admin@123456`
- 10 authors with sample credentials
- 18 books with royalty information
- Sample tickets and messages

### Step 3: Verify Seeding

```bash
# MongoDB CLI
mongo
> use bookleaf_support
> db.users.count()          # Should be 11 (1 admin + 10 authors)
> db.authorprofiles.count() # Should be 10
> db.books.count()          # Should be 18
```

---

## Running Locally

### Step 1: Start Backend Server

```bash
cd backend
npm run dev
```

**Expected output:**
```
Server is running on port 5000
[Socket.IO] Initialized
[AI Service] Google Gemini available
```

### Step 2: Start Frontend Development Server

```bash
cd frontend
npm run dev
```

**Expected output:**
```
  VITE v8.3.0 ready in 250 ms
  
  ➜  Local:   http://localhost:5173/
  ➜  Press h to show help
```

### Step 3: Open Application

```
Frontend:  http://localhost:5173
Backend:   http://localhost:5000
API:       http://localhost:5000/api/v1
```

### Step 4: Login

**Admin Account:**
- Email: `admin@bookleaf.local`
- Password: `Admin@123456`

**Author Account:**
- Email: `priya.sharma@email.com`
- Password: `Author@123456`

---

## Deployment

### Quick Deployment to Vercel (15 minutes)

See `QUICK_DEPLOYMENT_GUIDE.txt` for detailed steps.

**Summary:**
1. Push to GitHub
2. Create MongoDB Atlas production database
3. Deploy backend to Vercel
4. Deploy frontend to Vercel
5. Configure environment variables
6. Test deployment

### Detailed Deployment Guide

See `VERCEL_DEPLOYMENT_STEPS.txt` for complete instructions with:
- Environment variable setup
- MongoDB Atlas configuration
- Vercel project setup
- Troubleshooting section

### Production Environment Variables

**Backend Production:**
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://bookleaf_user:PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority
CLIENT_URL=https://your-frontend.vercel.app
JWT_SECRET=generate-random-string
GEMINI_API_KEY=your-api-key
# ... other variables (see VERCEL_DEPLOYMENT_STEPS.txt)
```

**Frontend Production:**
```env
VITE_API_BASE_URL=https://your-backend.vercel.app/api/v1
VITE_SOCKET_URL=https://your-backend.vercel.app
```

---

## API Endpoints

### Authentication

```
POST   /api/v1/auth/login          # Login
POST   /api/v1/auth/logout         # Logout
GET    /api/v1/auth/me             # Get current user
```

### Author Routes

```
GET    /api/v1/author/dashboard              # Dashboard stats
GET    /api/v1/author/books                  # List books
GET    /api/v1/author/tickets                # My tickets
POST   /api/v1/author/tickets                # Create ticket
GET    /api/v1/author/tickets/:id            # Ticket detail
POST   /api/v1/author/tickets/:id/reply      # Add reply
POST   /api/v1/author/tickets/:id/reply-with-attachment  # Reply with file
```

### Admin Routes

```
GET    /api/v1/admin/tickets                 # All tickets
GET    /api/v1/admin/tickets/:id             # Ticket detail
PATCH  /api/v1/admin/tickets/:id             # Update ticket
POST   /api/v1/admin/tickets/:id/assign-self # Assign to me
POST   /api/v1/admin/tickets/:id/messages    # Add message
POST   /api/v1/admin/tickets/:id/messages/with-attachment  # Message with file
POST   /api/v1/admin/tickets/:id/ai-draft    # Generate AI draft
POST   /api/v1/admin/tickets/:id/ai-classify # Classify with AI
GET    /api/v1/admin/tickets/:ticketId/files/:messageId/:fileName  # Download file
```

### Health Check

```
GET    /health                     # Server health
GET    /ai/status                  # AI service status
```

---

## File Structure

### Backend Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── config.js            # Environment config
│   │   └── database.js          # MongoDB connection
│   ├── models/
│   │   ├── User.js              # User schema
│   │   ├── AuthorProfile.js     # Author profile
│   │   ├── Book.js              # Book info
│   │   ├── Ticket.js            # Support ticket
│   │   └── TicketMessage.js     # Messages with attachments
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── author.controller.js
│   │   └── admin.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── ticket.service.js
│   │   ├── book.service.js
│   │   ├── ai.service.js        # AI integration
│   │   └── file.service.js      # File operations
│   ├── middleware/
│   │   ├── authenticate.js      # JWT verification
│   │   ├── authorize.js         # Role checking
│   │   ├── validate.js          # Input validation
│   │   ├── errorHandler.js      # Error handling
│   │   └── upload.js            # File upload (multer)
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── author.routes.js
│   │   └── admin.routes.js
│   ├── sockets/
│   │   └── ticket.socket.js     # Socket.IO handlers
│   ├── scripts/
│   │   └── seed.js              # Database seeding
│   ├── utils/
│   │   ├── AppError.js
│   │   ├── asyncHandler.js
│   │   └── jwt.js
│   ├── app.js                   # Express app
│   └── server.js                # Entry point
├── uploads/                      # File storage
├── .env                          # Environment variables
├── package.json
└── vercel.json                  # Vercel config
```

### Frontend Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── auth/
│   │   │   └── Login.jsx
│   │   ├── admin/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── TicketList.jsx
│   │   │   └── TicketDetail.jsx
│   │   └── author/
│   │       ├── Dashboard.jsx
│   │       ├── Books.jsx
│   │       ├── Tickets.jsx
│   │       └── TicketDetail.jsx
│   ├── components/
│   │   ├── FileUploader.jsx     # Upload UI
│   │   └── MessageAttachments.jsx # File display
│   ├── services/
│   │   ├── api.js               # API client
│   │   └── socket.js            # Socket.IO client
│   ├── context/
│   │   └── AuthContext.jsx      # Auth state
│   ├── hooks/
│   ├── utils/
│   ├── App.jsx                  # Main app
│   ├── main.jsx                 # Entry point
│   └── index.css
├── public/
│── .env                         # Environment variables
├── package.json
└── vite.config.js
```

---

## Key Features Explained

### Real-time Messaging

**How it works:**
1. User opens ticket detail
2. Client connects to Socket.IO
3. Joins ticket room
4. Listens for new messages
5. Broadcasts new message to room
6. All connected users see update instantly

**Fallback:** If Socket.IO unavailable, uses REST API

### AI Integration

**Classification:**
- Analyzes ticket content
- Categorizes into 6 categories
- Recommends priority level
- Returns AI reasoning

**Draft Generation:**
- Uses ticket context
- Incorporates knowledge base
- Generates empathetic response
- Admin can edit before sending

### File Uploads

**Supported Types:**
- PDF documents
- Images (JPEG, PNG, GIF, WebP)
- Microsoft Office (Word, Excel)
- Plain text files

**Validation:**
- Max 10MB per file
- Max 5 files per message
- MIME type verification
- File extension checking

---

## Troubleshooting

### Backend Won't Start

**Error: "Cannot find module 'express'"**
```bash
# Solution: Install dependencies
cd backend
npm install
```

**Error: "Connection refused - MongoDB"**
```bash
# Solution: Start MongoDB
# macOS
brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod

# Or use MongoDB Atlas connection string
```

### Frontend Build Fails

**Error: "Module not found"**
```bash
# Solution: Install dependencies
cd frontend
npm install
```

**Error: "VITE_API_BASE_URL is undefined"**
```bash
# Solution: Create .env file with correct variables
echo "VITE_API_BASE_URL=http://localhost:5000/api/v1" > .env
echo "VITE_SOCKET_URL=http://localhost:5000" >> .env
```

### API Calls Fail

**Error: "CORS error"**
```bash
# Solution: Verify CLIENT_URL in backend .env
# Should be: http://localhost:5173 (for development)
```

**Error: "Cannot POST /api/v1/..."**
```bash
# Solution: Verify backend is running
# Check: http://localhost:5000/health
```

### File Upload Issues

**Error: "File too large"**
- Maximum 10MB per file
- Reduce file size or split into smaller files

**Error: "Invalid file type"**
- Only PDF, Images, Word, Excel, Text allowed
- Convert file to supported format

### Socket.IO Not Connecting

**Error: "WebSocket connection failed"**
- Check VITE_SOCKET_URL is correct
- Verify backend is running
- Check browser console for errors
- Falls back to REST API automatically

---

## Security

### Authentication
- JWT tokens with expiration
- Password hashing with bcrypt
- HttpOnly cookies
- CORS protection

### Database
- MongoDB user credentials
- Connection string secrets
- No secrets in code
- Environment variables only

### File Upload
- MIME type validation
- File extension checking
- Size limits (10MB)
- Path traversal prevention

### API Security
- Input validation with Zod
- Rate limiting on routes
- SQL injection prevention
- XSS protection

---

## Performance Optimization

### Backend
- Database query indexing
- Efficient pagination
- Caching strategies
- Rate limiting

### Frontend
- Code splitting with Vite
- Image optimization
- Lazy loading
- Socket.IO reconnection

### Database
- Connection pooling
- Index optimization
- Query optimization
- Backup strategies

---

## Testing

### Manual Testing

**Test Admin Features:**
1. Login as admin
2. View dashboard
3. Create test ticket
4. Send message
5. Upload file
6. Generate AI draft
7. Assign ticket
8. Update status

**Test Author Features:**
1. Login as author
2. View books and royalties
3. Create ticket
4. View ticket status
5. Add reply with file
6. Download attachments

**Test Real-time:**
1. Open same ticket in 2 tabs
2. Send message in one tab
3. Verify instant appearance in other tab

### Run Tests

```bash
# Backend
npm run test:all

# Frontend
npm run dev  # Manual testing
```

---

## Contributing

### Before Submitting PR

1. Test locally with both users (admin & author)
2. Test file uploads if modified
3. Verify no console errors
4. Check all features working
5. Format code properly
6. Update documentation if needed

### Code Style

- Use consistent naming
- Add comments for complex logic
- Follow existing patterns
- Keep functions small

### Commit Messages

```
feat: Add new feature
fix: Bug fix
docs: Documentation update
style: Code formatting
test: Test additions
```

---

## Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables set
- [ ] Database seeding done
- [ ] API endpoints working
- [ ] Real-time features working
- [ ] File uploads working
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Documentation updated
- [ ] Ready for production

---

## FAQ

### Q: How do I reset the admin password?
**A:** Update `SEED_ADMIN_PASSWORD` in `.env` and run `npm run seed` again.

### Q: Can I use my own domain?
**A:** Yes! Configure in Vercel project settings after deployment.

### Q: How do I backup my database?
**A:** MongoDB Atlas auto-backups daily. Manual backups available in dashboard.

### Q: Where are uploaded files stored?
**A:** Development: Local `backend/uploads/` directory. Production: Vercel filesystem (ephemeral - migrate to S3 for persistence).

### Q: How do I enable https?
**A:** Automatic on Vercel. For local development, use self-signed certificates or ngrok.

### Q: Can I modify the seed data?
**A:** Yes! Edit `backend/src/scripts/data/authors.json` before running seed.

### Q: How do I scale the application?
**A:** See scaling guide in documentation. Key steps: upgrade MongoDB tier, migrate files to S3, add caching.

---

## Support

For issues and questions:
- Check troubleshooting section
- Review deployment guides
- Check GitHub issues
- Read API documentation

---

## License

MIT License - See LICENSE file

---

## Roadmap

**Planned Features:**
- [ ] Email notifications
- [ ] Advanced search filters
- [ ] Message templates
- [ ] Analytics dashboard
- [ ] Custom branding
- [ ] Two-factor authentication
- [ ] API rate limiting improvements
- [ ] File encryption

---

## Version History

**v1.0.0** (Current)
- Initial release
- Core features complete
- Real-time messaging
- AI integration
- File attachments
- Production-ready

---

## Quick Links

| Link | Purpose |
|------|---------|
| [Vercel Deployment](./QUICK_DEPLOYMENT_GUIDE.txt) | Deploy in 15 minutes |
| [Environment Guide](./ENV_VARIABLES_GUIDE.txt) | Variable reference |
| [Deployment Steps](./VERCEL_DEPLOYMENT_STEPS.txt) | Detailed deployment |
| [Checklist](./PRODUCTION_DEPLOYMENT_CHECKLIST.txt) | Pre-deployment checklist |

---

## Getting Help

1. **Local Issues:** Check troubleshooting section above
2. **Deployment:** See `VERCEL_DEPLOYMENT_STEPS.txt`
3. **API:** Check API Endpoints section
4. **General:** Review feature documentation

---

## Credits

Built with:
- Express.js
- React
- MongoDB
- Socket.IO
- Google Gemini API
- Ant Design

---

**Happy Developing! 🚀**

For the complete deployment guide, see `QUICK_DEPLOYMENT_GUIDE.txt`
