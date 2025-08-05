import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download,
  Share2,
  Copy,
  X,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  File,
  AlertCircle,
  CheckCircle,
  Loader,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RotateCw,
  Info
} from 'lucide-react';
import { fileAPI } from '../services/api';

const BinaryFileViewer = ({ file, onClose }) => {
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [previewError, setPreviewError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  const modalRef = useRef(null);
  const previewRef = useRef(null);

  // Cleanup function for share links
  const cleanupShareLink = useCallback(() => {
    if (shareLink) {
      setShareLink('');
      setCopySuccess(false);
    }
  }, [shareLink]);

  // Handle escape key and click outside
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
      cleanupShareLink();
    };
  }, [onClose, cleanupShareLink]);

  // Load file info
  const loadFileInfo = useCallback(async () => {
    if (!file?.path) {
      setError('Invalid file path');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setPreviewError('');
      setRetryCount(0);
      
      const info = await fileAPI.getBinaryFileInfo(file.path);
      
      // Validate file info
      if (!info || !info.name) {
        throw new Error('Invalid file information received');
      }
      
      setFileInfo(info);
    } catch (err) {
      console.error('Error loading file info:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load file information';
      setError(errorMessage);
      
      // Retry logic for network errors
      if (retryCount < maxRetries && (err.code === 'NETWORK_ERROR' || err.response?.status >= 500)) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadFileInfo();
        }, 1000 * (retryCount + 1)); // Exponential backoff
      }
    } finally {
      setLoading(false);
    }
  }, [file?.path, retryCount]);

  useEffect(() => {
    if (file) {
      loadFileInfo();
    }
  }, [file, loadFileInfo]);

  // Handle download with proper error handling
  const handleDownload = async () => {
    if (!file?.path) {
      setError('Invalid file path for download');
      return;
    }

    try {
      setDownloadLoading(true);
      setError('');
      
      // Use the API method for download
      fileAPI.downloadFile(file.path);
      
      // Show success feedback
      setTimeout(() => {
        setDownloadLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download file');
      setDownloadLoading(false);
    }
  };

  // Handle share link creation with proper error handling
  const handleCreateShareLink = async () => {
    if (!file?.path) {
      setError('Invalid file path for sharing');
      return;
    }

    try {
      setShareLoading(true);
      setError('');
      cleanupShareLink();
      
      const linkData = await fileAPI.createShareableLink(file.path, 1200); // 20 minutes
      
      if (!linkData?.link_id) {
        throw new Error('Invalid share link response');
      }
      
      const fullUrl = fileAPI.getShareableLinkUrl(linkData.link_id);
      setShareLink(fullUrl);
    } catch (err) {
      console.error('Error creating share link:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create share link';
      setError(errorMessage);
    } finally {
      setShareLoading(false);
    }
  };

  // Handle copy link with proper error handling
  const handleCopyLink = async () => {
    if (!shareLink) {
      setError('No share link available to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Error copying link:', err);
      setError('Failed to copy link to clipboard');
    }
  };

  // Get file icon based on category
  const getFileIcon = (category) => {
    switch (category) {
      case 'image':
        return <FileImage className="w-8 h-8 text-blue-500" />;
      case 'video':
        return <FileVideo className="w-8 h-8 text-red-500" />;
      case 'audio':
        return <FileAudio className="w-8 h-8 text-green-500" />;
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-600" />;
      case 'text':
        return <FileText className="w-8 h-8 text-gray-500" />;
      default:
        return <File className="w-8 h-8 text-gray-400" />;
    }
  };

  // Get file category display name
  const getFileCategoryName = (category) => {
    switch (category) {
      case 'image':
        return 'Image';
      case 'video':
        return 'Video';
      case 'audio':
        return 'Audio';
      case 'pdf':
        return 'PDF Document';
      case 'text':
        return 'Text File';
      default:
        return 'Binary File';
    }
  };

  // Format file size with proper handling
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get preview URL with proper authentication
  const getPreviewUrl = (filePath, useStream = false) => {
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('token') || '';
    const encodedPath = encodeURIComponent(filePath);
    
    if (useStream) {
      return `${baseUrl}/api/files/stream?path=${encodedPath}&token=${token}`;
    }
    return `${baseUrl}/api/files/download?path=${encodedPath}`;
  };

  // Render file preview with proper error handling
  const renderFilePreview = () => {
    if (!fileInfo) return null;

    const { file_category, mime_type } = fileInfo;

    // Handle preview errors
    if (previewError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-gray-500">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-sm text-center mb-2">Failed to load preview</p>
          <p className="text-xs text-gray-400 text-center">{previewError}</p>
          <button
            onClick={() => {
              setPreviewError('');
              setShowPreview(true);
            }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry Preview
          </button>
        </div>
      );
    }

      // Handle large files
  const isLargeFile = fileInfo.size > 50 * 1024 * 1024; // 50MB
  if (isLargeFile && file_category !== 'text') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500">
        <File className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-sm text-center mb-2">File too large for preview</p>
        <p className="text-xs text-gray-400 text-center">
          Size: {formatFileSize(fileInfo.size)}
        </p>
        <button
          onClick={handleDownload}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Download to View
        </button>
      </div>
    );
  }

  // Handle unreadable files
  if (fileInfo && fileInfo.readable === false) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-sm text-center mb-2">File not readable</p>
        <p className="text-xs text-gray-400 text-center">
          You don't have permission to read this file
        </p>
        <button
          onClick={handleDownload}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try Download
        </button>
      </div>
    );
  }

    switch (file_category) {
      case 'image':
        return (
          <div className="flex justify-center relative">
            <img
              ref={previewRef}
              src={getPreviewUrl(file.path, true)}
              alt={fileInfo.name}
              className={`max-w-full rounded-lg shadow-lg transition-all duration-300 ${
                isFullscreen ? 'max-h-none' : 'max-h-96 object-contain'
              }`}
              onError={(e) => {
                console.error('Image preview error:', e);
                setPreviewError('Failed to load image preview');
                e.target.style.display = 'none';
              }}
              onLoad={() => setPreviewError('')}
              crossOrigin="anonymous"
            />
            {fileInfo.size > 5 * 1024 * 1024 && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                Large file - loading may take time
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="flex justify-center">
            <video
              ref={previewRef}
              controls
              className={`max-w-full rounded-lg shadow-lg transition-all duration-300 ${
                isFullscreen ? 'max-h-none' : 'max-h-96'
              }`}
              onError={(e) => {
                console.error('Video preview error:', e);
                setPreviewError('Failed to load video preview');
              }}
              onLoadStart={() => setPreviewError('')}
              crossOrigin="anonymous"
            >
              <source
                src={getPreviewUrl(file.path, true)}
                type={mime_type}
              />
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="flex justify-center">
            <audio
              ref={previewRef}
              controls
              className="w-full max-w-md"
              onError={(e) => {
                console.error('Audio preview error:', e);
                setPreviewError('Failed to load audio preview');
              }}
              onLoadStart={() => setPreviewError('')}
              crossOrigin="anonymous"
            >
              <source
                src={getPreviewUrl(file.path, true)}
                type={mime_type}
              />
              Your browser does not support the audio tag.
            </audio>
          </div>
        );

      case 'pdf':
        return (
          <div className="flex justify-center">
            <iframe
              ref={previewRef}
              src={getPreviewUrl(file.path)}
              className={`w-full rounded-lg shadow-lg transition-all duration-300 ${
                isFullscreen ? 'h-screen' : 'h-96'
              }`}
              title={fileInfo.name}
              onError={() => setPreviewError('Failed to load PDF preview')}
              onLoad={() => setPreviewError('')}
            />
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            {getFileIcon(file_category)}
            <p className="mt-2 text-sm text-center">Preview not available for this file type</p>
            <p className="text-xs text-gray-400 text-center">{mime_type}</p>
            <div className="mt-4 flex space-x-2">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Download File
              </button>
              <button
                onClick={handleCreateShareLink}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Share Link
              </button>
            </div>
          </div>
        );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
          <Loader className="w-6 h-6 animate-spin text-blue-500" />
          <span>Loading file information...</span>
          {retryCount > 0 && (
            <span className="text-sm text-gray-500">(Retry {retryCount}/{maxRetries})</span>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !fileInfo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h3 className="font-semibold text-lg">Error Loading File</h3>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={loadFileInfo}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className={`bg-white rounded-lg shadow-xl transition-all duration-300 ${
          isFullscreen 
            ? 'w-full h-full max-w-none max-h-none' 
            : 'max-w-4xl max-h-[90vh] w-full'
        } overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {fileInfo && getFileIcon(fileInfo.file_category)}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate" title={fileInfo?.name || file.name}>
                {fileInfo?.name || file.name}
              </h3>
              {fileInfo && (
                <div className="text-sm text-gray-500 truncate">
                  <p>{formatFileSize(fileInfo.size)} • {getFileCategoryName(fileInfo.file_category)}</p>
                  <p className="text-xs text-gray-400">{fileInfo.mime_type}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Preview toggle for media files */}
            {fileInfo && ['image', 'video', 'audio', 'pdf'].includes(fileInfo.file_category) && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                title={showPreview ? 'Hide Preview' : 'Show Preview'}
              >
                {showPreview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}
            
            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* File Preview */}
        <div className={`overflow-auto transition-all duration-300 ${
          isFullscreen ? 'h-full' : 'max-h-[60vh]'
        }`}>
          {showPreview ? (
            <div className="p-6">
              {renderFilePreview()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <File className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-sm text-center">Preview hidden</p>
              <button
                onClick={() => setShowPreview(true)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Show Preview
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex flex-col space-y-3">
            {/* Primary actions */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleDownload}
                  disabled={downloadLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {downloadLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{downloadLoading ? 'Downloading...' : 'Download'}</span>
                </button>

                <button
                  onClick={handleCreateShareLink}
                  disabled={shareLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {shareLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  <span>{shareLoading ? 'Creating...' : 'Share Link'}</span>
                </button>
              </div>

              {/* File info */}
              {fileInfo && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Info className="w-4 h-4" />
                  <span>Modified: {new Date(fileInfo.modified).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Share link section */}
            {shareLink && (
              <div className="flex flex-col space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-blue-700">Share Link:</span>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    {copySuccess ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="px-3 py-2 border rounded bg-white text-sm w-full"
                  onClick={(e) => e.target.select()}
                />
                <div className="flex items-center justify-between text-xs text-blue-600">
                  <span>This link will expire in 20 minutes</span>
                  <button
                    onClick={cleanupShareLink}
                    className="text-red-500 hover:text-red-700"
                  >
                    Clear Link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BinaryFileViewer; 