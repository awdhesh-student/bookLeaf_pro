import React, { useState } from 'react'
import { UploadOutlined, CloseOutlined, FileTextOutlined, PictureOutlined, FileOutlined } from '@ant-design/icons'
import './FileUploader.css'

const FileUploader = ({ onFilesSelected, maxFiles = 5, maxFileSize = 10 }) => {
  const [files, setFiles] = useState([])
  const [dragActive, setDragActive] = useState(false)

  // File type icons
  const getFileIcon = (mimeType, fileName) => {
    if (mimeType.startsWith('image/')) return <PictureOutlined className="file-icon-image" />
    if (mimeType.includes('pdf')) return <FileTextOutlined className="file-icon-pdf" />
    return <FileOutlined className="file-icon-default" />
  }

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Validate file
  const isValidFile = (file) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]

    const fileSizeInMB = file.size / (1024 * 1024)
    if (fileSizeInMB > maxFileSize) {
      alert(`File "${file.name}" exceeds ${maxFileSize}MB limit`)
      return false
    }

    if (!allowedMimes.includes(file.type)) {
      alert(`File type not allowed: ${file.type || 'unknown'}`)
      return false
    }

    return true
  }

  // Handle file selection
  const handleFileSelect = (fileList) => {
    const newFiles = Array.from(fileList).filter(isValidFile)
    const combined = [...files, ...newFiles]

    if (combined.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    setFiles(combined)
    onFilesSelected(combined)
  }

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  // Remove file
  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onFilesSelected(newFiles)
  }

  return (
    <div className="file-uploader-container">
      <div
        className={`file-upload-area ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-input"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt,.xls,.xlsx"
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
          disabled={files.length >= maxFiles}
        />

        <label htmlFor="file-input" className="upload-label">
          <UploadOutlined className="upload-icon" />
          <p className="upload-text">
            Drag and drop files here or <span className="upload-link">click to browse</span>
          </p>
          <p className="upload-hint">
            Max {maxFiles} files, {maxFileSize}MB each (PDF, Images, Word, Excel, Text)
          </p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          <h4 className="file-list-title">Selected Files ({files.length})</h4>
          <div className="files">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-info">
                  {getFileIcon(file.type, file.name)}
                  <div className="file-details">
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="file-remove-btn"
                  title="Remove file"
                >
                  <CloseOutlined />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUploader
