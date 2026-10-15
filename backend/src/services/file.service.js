const fs = require('fs')
const path = require('path')
const AppError = require('../utils/AppError')

const uploadDir = path.join(__dirname, '../../uploads')

class FileService {
  /**
   * Save uploaded files and return metadata
   */
  static extractFileMetadata(files) {
    if (!files || files.length === 0) {
      return []
    }

    return files.map((file) => ({
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      filePath: `uploads/${file.filename}`, // Store relative path
    }))
  }

  /**
   * Delete files by paths
   */
  static deleteFiles(filePaths) {
    if (!filePaths || filePaths.length === 0) return

    filePaths.forEach((filePath) => {
      try {
        const fullPath = path.join(__dirname, '../../', filePath)
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath)
        }
      } catch (error) {
        console.error(`[FileService] Error deleting file: ${filePath}`, error)
        // Don't throw - continue deleting other files
      }
    })
  }

  /**
   * Get file stream for download
   */
  static getFileStream(filePath) {
    try {
      const fullPath = path.join(__dirname, '../../', filePath)

      if (!fs.existsSync(fullPath)) {
        throw AppError('File not found', {
          statusCode: 404,
          code: 'FILE_NOT_FOUND',
        })
      }

      // Verify file is within uploads directory (security check)
      const resolvedPath = path.resolve(fullPath)
      const resolvedUploadDir = path.resolve(uploadDir)

      if (!resolvedPath.startsWith(resolvedUploadDir)) {
        throw AppError('Invalid file path', {
          statusCode: 403,
          code: 'FORBIDDEN',
        })
      }

      return fs.createReadStream(fullPath)
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw AppError('File not found', {
          statusCode: 404,
          code: 'FILE_NOT_FOUND',
        })
      }
      throw error
    }
  }

  /**
   * Get original filename from stored path
   */
  static getOriginalFileName(filePath) {
    // The stored path is like "uploads/1728998765432-123456789-originalname.ext"
    // Extract the original filename from the end
    const parts = filePath.split('-')
    if (parts.length >= 3) {
      return parts.slice(2).join('-') // Handle filenames with hyphens
    }
    return path.basename(filePath)
  }

  /**
   * Get file size in human-readable format
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Get file extension
   */
  static getFileExtension(fileName) {
    return path.extname(fileName).toLowerCase().substring(1)
  }

  /**
   * Check if file is an image
   */
  static isImage(mimeType) {
    return mimeType && mimeType.startsWith('image/')
  }

  /**
   * Check if file is a PDF
   */
  static isPDF(mimeType) {
    return mimeType === 'application/pdf'
  }
}

module.exports = FileService
