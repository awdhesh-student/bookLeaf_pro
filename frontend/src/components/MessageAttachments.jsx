import React, { useState } from 'react'
import { DownloadOutlined, FileTextOutlined, PictureOutlined, FileOutlined, AlertOutlined } from '@ant-design/icons'
import './MessageAttachments.css'

const MessageAttachments = ({ attachments, ticketId, messageId, senderRole }) => {
  const [downloading, setDownloading] = useState(null)
  const [error, setError] = useState(null)

  if (!attachments || attachments.length === 0) {
    return null
  }

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Get file icon
  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return <PictureOutlined className="attachment-icon attachment-icon-image" />
    }
    if (mimeType.includes('pdf')) {
      return <FileTextOutlined className="attachment-icon attachment-icon-pdf" />
    }
    return <FileOutlined className="attachment-icon attachment-icon-default" />
  }

  // Get file extension
  const getFileExtension = (fileName) => {
    return fileName.split('.').pop().toUpperCase()
  }

  // Handle download
  const handleDownload = async (attachment) => {
    try {
      setDownloading(attachment.fileName)
      setError(null)

      const encodedFileName = encodeURIComponent(attachment.fileName)
      // Get user role from localStorage
      const storedUser = localStorage.getItem('bookleaf_user')
      const userRole = storedUser ? JSON.parse(storedUser).role : 'author'
      const endpoint = userRole === 'admin' ? 'admin' : 'author'
      const url = `${import.meta.env.VITE_API_BASE_URL}/${endpoint}/tickets/${ticketId}/files/${messageId}/${encodedFileName}`

      const response = await fetch(url, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`)
      }

      // Create blob and download
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = attachment.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('[MessageAttachments] Download error:', err)
      setError(`Failed to download ${attachment.fileName}`)
    } finally {
      setDownloading(null)
    }
  }

  // Check if attachment is an image (for preview)
  const isImage = (mimeType) => mimeType && mimeType.startsWith('image/')

  return (
    <div className="message-attachments">
      <div className="attachments-header">
        <span className="attachments-title">
          📎 {attachments.length} Attachment{attachments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div className="attachments-error">
          <AlertOutlined />
          <span>{error}</span>
        </div>
      )}

      <div className="attachments-list">
        {attachments.map((attachment, index) => (
          <div key={index} className="attachment-item">
            {/* Image Preview */}
            {isImage(attachment.mimeType) && (
              <div className="attachment-preview">
                <img
                  src={`/uploads/${attachment.filePath.split('/').pop()}`}
                  alt={attachment.fileName}
                  className="attachment-image"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              </div>
            )}

            {/* File Info */}
            <div className="attachment-info">
              <div className="attachment-header-row">
                <div className="attachment-name-section">
                  {getFileIcon(attachment.mimeType)}
                  <div className="attachment-details">
                    <p className="attachment-name" title={attachment.fileName}>
                      {attachment.fileName}
                    </p>
                    <div className="attachment-meta">
                      <span className="attachment-size">{formatFileSize(attachment.fileSize)}</span>
                      <span className="attachment-type">{getFileExtension(attachment.fileName)}</span>
                    </div>
                  </div>
                </div>

                <button
                  className={`attachment-download-btn ${downloading === attachment.fileName ? 'loading' : ''}`}
                  onClick={() => handleDownload(attachment)}
                  disabled={downloading === attachment.fileName}
                  title="Download file"
                >
                  <DownloadOutlined />
                  {downloading === attachment.fileName ? 'Downloading...' : 'Download'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MessageAttachments
