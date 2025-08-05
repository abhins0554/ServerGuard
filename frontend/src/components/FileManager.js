import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  File as FileIcon,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Upload,
  Download,
  Edit,
  Save,
  X,
  Home,
  AlertCircle,
  Plus,
  FolderPlus,
  Loader
} from 'lucide-react';
import { fileAPI, cacheUtils } from '../services/api';
import BinaryFileViewer from './BinaryFileViewer';

const FileManager = () => {
  const [currentPath, setCurrentPath] = useState('.');
  const [directoryContents, setDirectoryContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isBinary, setIsBinary] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showBinaryViewer, setShowBinaryViewer] = useState(false);
  const [selectedBinaryFile, setSelectedBinaryFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Update breadcrumbs function extracted for reuse
  const updateBreadcrumbs = useCallback((path) => {
    if (path === 'System Drives') {
      setBreadcrumbs([{ name: 'System Drives', path: 'System Drives' }]);
      return;
    }
    
    const parts = path.split(/[/\\]/).filter(Boolean);
    const crumbs = [{ name: 'System Drives', path: '.' }];
    
    let currentBuildPath = '.';
    for (const part of parts) {
      currentBuildPath = `${currentBuildPath}/${part}`;
      crumbs.push({ name: part, path: currentBuildPath });
    }
    
    setBreadcrumbs(crumbs);
  }, []);
  
  // Load directory contents with optimized caching
  const loadDirectory = useCallback(async (path = currentPath) => {
    try {
      setLoading(true);
      setError('');
      setSelectedFile(null);
      setFileContent('');
      setIsEditing(false);
      setIsBinary(false);
      setSearchTerm(''); // Clear search when changing directories
      
      const data = await fileAPI.listDirectory(path);
      
      setDirectoryContents(data.items);
      setCurrentPath(data.path);
      updateBreadcrumbs(data.path);
    } catch (err) {
      setError(`Failed to load directory: ${err.message}`);
      console.error('Error loading directory:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPath, updateBreadcrumbs]);
  
  // Initial load
  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  // Check if file is likely binary based on extension
  const isLikelyBinary = (filename) => {
    const binaryExtensions = new Set([
      '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.db', '.sqlite', 
      '.sqlite3', '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.ico', '.svg',
      '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.wav',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.msi', '.pkg', '.deb', '.rpm', '.app', '.dmg'
    ]);
    
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) {
      // No extension - assume it might be text and try to read it
      return false;
    }
    
    const extension = filename.toLowerCase().substring(lastDotIndex);
    return binaryExtensions.has(extension);
  };

  // Handle file selection
  const handleFileSelect = async (file) => {
    if (file.is_directory) {
      loadDirectory(file.path);
      return;
    }
    
    try {
      setSelectedFile(file);
      setLoading(true);
      setError('');
      setSaveError('');
      
      // Check if file is likely binary before attempting to read content
      if (isLikelyBinary(file.name)) {
        setIsBinary(true);
        setFileContent('');
        // For binary files, open the binary viewer directly
        setSelectedBinaryFile(file);
        setShowBinaryViewer(true);
        setLoading(false);
        return;
      }
      
      // Only try to read content for non-binary files
      const data = await fileAPI.getFileContent(file.path);
      
      if (data.is_binary) {
        setIsBinary(true);
        setFileContent('');
        // For binary files, open the binary viewer
        setSelectedBinaryFile(file);
        setShowBinaryViewer(true);
      } else {
        setIsBinary(false);
        setFileContent(data.content);
      }
      
      setIsEditing(false);
    } catch (err) {
      setError(`Failed to load file: ${err.message}`);
      console.error('Error loading file:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle navigation
  const navigateTo = (path) => {
    loadDirectory(path);
  };

  // Handle go up one level
  const goUp = () => {
    if (breadcrumbs.length <= 1) return;
    const parentPath = breadcrumbs[breadcrumbs.length - 2].path;
    navigateTo(parentPath);
  };

  // Handle file edit
  const toggleEdit = () => {
    if (isBinary) return; // Can't edit binary files
    setIsEditing(!isEditing);
    setSaveError('');
  };

  // Handle file save
  const saveFile = async () => {
    if (!selectedFile || isBinary) return;
    
    try {
      setSaveLoading(true);
      setSaveError('');
      
      await fileAPI.updateFile(selectedFile.path, fileContent);
      setIsEditing(false);
      
      // Clear cache for this file
      cacheUtils.clearCache('files_content');
    } catch (err) {
      setSaveError(`Failed to save file: ${err.message}`);
      console.error('Error saving file:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle file download
  const downloadFile = () => {
    if (!selectedFile || selectedFile.is_directory) return;
    fileAPI.downloadFile(selectedFile.path);
  };

  // Handle file upload with progress
  const handleUpload = async () => {
    if (!uploadFile) return;
    
    try {
      setUploadLoading(true);
      setUploadError('');
      setUploadProgress(0);
      
      const uploadPath = `${currentPath}/${uploadFile.name}`;
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);
      
      await fileAPI.uploadFile(uploadPath, uploadFile);
      
      setUploadProgress(100);
      setTimeout(() => {
        setUploadProgress(0);
      }, 500);
      
      // Refresh directory after upload
      loadDirectory(currentPath);
      setUploadFile(null);
    } catch (err) {
      setUploadError(`Failed to upload file: ${err.message}`);
      console.error('Error uploading file:', err);
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle file creation
  const createNewFile = async () => {
    if (!newFileName.trim()) return;
    
    try {
      setSaveLoading(true);
      setSaveError('');
      
      const newFilePath = `${currentPath}/${newFileName}`;
      await fileAPI.updateFile(newFilePath, '');
      
      // Refresh directory and select the new file
      await loadDirectory(currentPath);
      const newFile = directoryContents.find(item => item.name === newFileName);
      if (newFile) handleFileSelect(newFile);
      
      setNewFileName('');
      setIsCreatingFile(false);
    } catch (err) {
      setSaveError(`Failed to create file: ${err.message}`);
      console.error('Error creating file:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle folder creation
  const createNewFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      setSaveLoading(true);
      setSaveError('');
      
      const newFolderPath = `${currentPath}/${newFolderName}`;
      await fileAPI.createDirectory(newFolderPath);
      
      // Refresh directory
      loadDirectory(currentPath);
      
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (err) {
      setSaveError(`Failed to create folder: ${err.message}`);
      console.error('Error creating folder:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0 || bytes === null || bytes === undefined) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Handle file/directory deletion
  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      setDeleteLoading(true);
      setDeleteError('');
      
      await fileAPI.deleteFile(itemToDelete.path);
      
      // Refresh directory
      loadDirectory(currentPath);
      
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (err) {
      setDeleteError(`Failed to delete: ${err.message}`);
      console.error('Error deleting item:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Confirm deletion
  const confirmDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
    setDeleteError('');
  };

  const closeBinaryViewer = () => {
    setShowBinaryViewer(false);
    setSelectedBinaryFile(null);
  };

  // Filter directory contents based on search term
  const filteredDirectoryContents = directoryContents.filter(item => {
    if (!searchTerm.trim()) return true;
    return item.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">File Manager</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Folder className="h-4 w-4" />
          <span>Browse and manage files on the system</span>
        </div>
      </div>

      {/* File Manager Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Directory Browser */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {/* Navigation Controls */}
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex space-x-2">
              <button 
                onClick={goUp}
                disabled={breadcrumbs.length <= 1}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Go up one level"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              
              <button 
                onClick={() => navigateTo('.')}
                className="p-1 rounded hover:bg-gray-200"
                title="Go to home directory"
              >
                <Home className="h-5 w-5 text-gray-600" />
              </button>
              
              <button 
                onClick={() => loadDirectory(currentPath)}
                className="p-1 rounded hover:bg-gray-200"
                title="Refresh"
              >
                <RefreshCw className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => setIsCreatingFile(true)}
                className="p-1 rounded hover:bg-gray-200"
                title="New File"
              >
                <Plus className="h-5 w-5 text-gray-600" />
              </button>
              
              <button 
                onClick={() => setIsCreatingFolder(true)}
                className="p-1 rounded hover:bg-gray-200"
                title="New Folder"
              >
                <FolderPlus className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Breadcrumbs */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center overflow-x-auto whitespace-nowrap">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />}
                <button
                  onClick={() => navigateTo(crumb.path)}
                  className={`text-sm ${index === breadcrumbs.length - 1 ? 'font-medium text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          
          {/* Create New File/Folder Forms */}
          {isCreatingFile && (
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center">
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Enter file name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={createNewFile}
                  disabled={!newFileName.trim() || saveLoading}
                  className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveLoading ? <Loader className="h-4 w-4 animate-spin" /> : 'Create'}
                </button>
                <button
                  onClick={() => setIsCreatingFile(false)}
                  className="ml-2 p-2 text-gray-600 hover:text-gray-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {saveError && (
                <div className="mt-2 text-sm text-red-600">{saveError}</div>
              )}
            </div>
          )}
          
          {isCreatingFolder && (
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={createNewFolder}
                  disabled={!newFolderName.trim() || saveLoading}
                  className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveLoading ? <Loader className="h-4 w-4 animate-spin" /> : 'Create'}
                </button>
                <button
                  onClick={() => setIsCreatingFolder(false)}
                  className="ml-2 p-2 text-gray-600 hover:text-gray-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {saveError && (
                <div className="mt-2 text-sm text-red-600">{saveError}</div>
              )}
            </div>
          )}
          
          {/* File Upload */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <input
                type="file"
                id="file-upload"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-l-lg cursor-pointer hover:bg-gray-200 truncate"
              >
                {uploadFile ? uploadFile.name : 'Choose a file to upload...'}
              </label>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploadLoading}
                className="px-3 py-2 bg-green-600 text-white rounded-r-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {uploadLoading ? (
                  <>
                    <Loader className="h-4 w-4 mr-1 animate-spin" />
                    {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </>
                )}
              </button>
            </div>
            {uploadError && (
              <div className="mt-2 text-sm text-red-600">{uploadError}</div>
            )}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          
                     {/* Search Bar */}
           <div className="p-4 border-b border-gray-200">
             <div className="relative">
               <input
                 type="text"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="Search files and folders..."
                 className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
               />
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                 </svg>
               </div>
               {searchTerm && (
                 <button
                   onClick={() => setSearchTerm('')}
                   className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                 >
                   <X className="h-4 w-4" />
                 </button>
               )}
             </div>
             {searchTerm && (
               <div className="mt-2 text-xs text-gray-500">
                 Showing {filteredDirectoryContents.length} of {directoryContents.length} items
               </div>
             )}
           </div>
           
           {/* Directory Contents */}
           <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
             {loading && directoryContents.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Loader className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">
                {error}
              </div>
                         ) : filteredDirectoryContents.length === 0 ? (
               <div className="p-4 text-center text-gray-500">
                 {searchTerm ? 'No files match your search' : 'This directory is empty'}
               </div>
             ) : (
               <ul className="divide-y divide-gray-200">
                 {filteredDirectoryContents.map((item) => (
                  <li key={item.path} className="group">
                    <div className="flex items-center">
                      <button
                        onClick={() => handleFileSelect(item)}
                        className={`flex-1 px-4 py-3 flex items-center hover:bg-gray-50 ${selectedFile?.path === item.path ? 'bg-blue-50' : ''}`}
                      >
                        {item.is_drive ? (
                          <div className="w-5 h-5 bg-green-500 rounded mr-3 flex-shrink-0 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">D</span>
                          </div>
                        ) : item.is_directory ? (
                          <Folder className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                        ) : (
                          <FileIcon className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                        )}
                        <div className="flex-1 text-left truncate">
                          <div className="font-medium text-gray-900 truncate flex items-center">
                            {item.name}
                            {item.is_hidden && (
                              <span className="ml-1 text-xs text-gray-400">(hidden)</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 flex justify-between">
                            <span>
                              {item.is_drive ? 'Drive' : 
                               item.is_directory ? 'Directory' : 
                               formatFileSize(item.size)}
                            </span>
                            <span>{formatDate(item.modified)}</span>
                          </div>
                          {item.permissions && (
                            <div className="text-xs text-gray-400">
                              Permissions: {item.permissions} | 
                              {item.readable ? ' R' : ''}
                              {item.writable ? ' W' : ''}
                              {item.executable ? ' X' : ''}
                            </div>
                          )}
                        </div>
                        {!item.is_directory && !item.is_drive && (
                          <ChevronRight className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
                        )}
                      </button>
                      
                      {/* Delete button - only show on hover and for non-system items */}
                      {!item.is_drive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(item);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 transition-opacity"
                          title="Delete"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* File Viewer/Editor */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {selectedFile ? (
            <>
              {/* File Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center">
                  {selectedFile.is_directory ? (
                    <Folder className="h-5 w-5 text-yellow-500 mr-2" />
                  ) : (
                    <FileIcon className="h-5 w-5 text-blue-500 mr-2" />
                  )}
                  <span className="font-medium text-gray-900">{selectedFile.name}</span>
                </div>
                
                <div className="flex space-x-2">
                  {!selectedFile.is_directory && !isBinary && (
                    <button
                      onClick={toggleEdit}
                      className={`p-1 rounded ${isEditing ? 'bg-green-100 text-green-700' : 'hover:bg-gray-200 text-gray-600'}`}
                      title={isEditing ? 'Save' : 'Edit'}
                    >
                      {isEditing ? <Save className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
                    </button>
                  )}
                  
                  {!selectedFile.is_directory && (
                    <button
                      onClick={downloadFile}
                      className="p-1 rounded hover:bg-gray-200 text-gray-600"
                      title="Download"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* File Content */}
              <div className="p-4">
                {loading ? (
                  <div className="text-center text-gray-500 py-8">
                    <Loader className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading file content...
                  </div>
                ) : selectedFile.is_directory ? (
                  <div className="text-center text-gray-500 py-8">
                    This is a directory. Select files within it from the left panel.
                  </div>
                ) : isBinary ? (
                  <div className="text-center text-gray-500 py-8">
                    This appears to be a binary file and cannot be displayed in the browser.
                    Use the download button to save it to your computer.
                  </div>
                ) : isEditing ? (
                  <div className="relative">
                    <textarea
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="w-full h-96 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="mt-4 flex justify-end space-x-3">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveFile}
                        disabled={saveLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {saveLoading ? (
                          <>
                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                    {saveError && (
                      <div className="mt-2 text-sm text-red-600">{saveError}</div>
                    )}
                  </div>
                ) : (
                  <pre className="w-full h-96 p-3 border border-gray-300 rounded-lg font-mono text-sm overflow-auto bg-gray-50">
                    {fileContent}
                  </pre>
                )}
              </div>
              
              {/* File Info */}
              {!selectedFile.is_directory && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">File Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Size:</span>{' '}
                      <span className="text-gray-900">{formatFileSize(selectedFile.size)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Modified:</span>{' '}
                      <span className="text-gray-900">{formatDate(selectedFile.modified)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Path:</span>{' '}
                      <span className="text-gray-900 break-all">{selectedFile.path}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>{' '}
                      <span className="text-gray-900">{isBinary ? 'Binary File' : 'Text File'}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Folder className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No File Selected</h3>
              <p className="text-gray-500 max-w-md">
                Select a file from the directory browser on the left to view its contents.
                You can navigate through directories, upload new files, or create new files and folders.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Safety Notice */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
          <div>
            <h4 className="font-medium text-yellow-800">Safety Notice</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Be careful when modifying system files. Incorrect changes could affect system stability.
              It's recommended to only edit files you understand and have permission to modify.
              File operations are optimized with caching for better performance.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{itemToDelete?.name}</strong>?
              This action cannot be undone.
            </p>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{deleteError}</p>
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setItemToDelete(null);
                  setDeleteError('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {deleteLoading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Binary File Viewer */}
      {showBinaryViewer && selectedBinaryFile && (
        <BinaryFileViewer
          file={selectedBinaryFile}
          onClose={closeBinaryViewer}
        />
      )}
    </div>
  );
};

export default FileManager;