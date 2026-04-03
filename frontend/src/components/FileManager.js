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
  Loader,
  Search,
  HardDrive
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
    if (path == null || typeof path !== 'string') {
      setBreadcrumbs([{ name: 'System Drives', path: '.' }]);
      return;
    }
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
      const resolvedPath = typeof data.path === 'string' ? data.path : path;
      setCurrentPath(resolvedPath);
      updateBreadcrumbs(resolvedPath);
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
  const filteredDirectoryContents = (Array.isArray(directoryContents) ? directoryContents : []).filter(item => {
    if (!searchTerm.trim()) return true;
    return item.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const divider = 'border-gray-200/80 dark:border-gray-800/80';
  const toolBtn =
    'p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

  return (
    <div className="page-shell">
      {/* Header — Finder-style title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-1">
          Files
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Folder className="h-4 w-4 shrink-0 opacity-80" />
          <span>Browse folders and files on the connected system</span>
        </div>
      </div>

      {/* Unified window: split pane like Finder */}
      <div
        className={`rounded-2xl overflow-hidden border ${divider} shadow-lg bg-white/70 dark:bg-gray-950/50 backdrop-blur-xl flex flex-col lg:flex-row lg:min-h-[min(68vh,620px)]`}
      >
        {/* Sidebar / list column */}
        <div
          className={`w-full lg:w-[380px] xl:w-[400px] shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r ${divider} bg-gray-100/90 dark:bg-gray-900/55`}
        >
          {/* Toolbar */}
          <div className={`px-3 py-2.5 flex items-center justify-between border-b ${divider} bg-white/60 dark:bg-gray-900/40`}>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={goUp} disabled={breadcrumbs.length <= 1} className={toolBtn} title="Enclosing folder">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => navigateTo('.')} className={toolBtn} title="Home">
                <Home className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => loadDirectory(currentPath)} className={toolBtn} title="Refresh">
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => setIsCreatingFile(true)} className={toolBtn} title="New document">
                <Plus className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => setIsCreatingFolder(true)} className={toolBtn} title="New folder">
                <FolderPlus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Path bar */}
          <div className={`px-3 py-2 border-b ${divider} flex items-center gap-1 overflow-x-auto bg-white/40 dark:bg-gray-950/30`}>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0" />}
                <button
                  type="button"
                  onClick={() => navigateTo(crumb.path)}
                  className={`shrink-0 text-xs px-2 py-1 rounded-md transition-colors ${
                    index === breadcrumbs.length - 1
                      ? 'font-medium text-gray-900 dark:text-gray-100 bg-gray-200/70 dark:bg-gray-800/80'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          
          {/* Create New File/Folder Forms */}
          {isCreatingFile && (
            <div className={`p-3 border-b ${divider} bg-blue-50/90 dark:bg-blue-950/35`}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="File name"
                  className="input-field flex-1 rounded-xl py-2 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={createNewFile}
                  disabled={!newFileName.trim() || saveLoading}
                  className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50 shrink-0"
                >
                  {saveLoading ? <Loader className="h-4 w-4 animate-spin" /> : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingFile(false)}
                  className={`${toolBtn} shrink-0`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {saveError && <div className="mt-2 text-sm text-red-600 dark:text-red-400">{saveError}</div>}
            </div>
          )}

          {isCreatingFolder && (
            <div className={`p-3 border-b ${divider} bg-blue-50/90 dark:bg-blue-950/35`}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="input-field flex-1 rounded-xl py-2 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={createNewFolder}
                  disabled={!newFolderName.trim() || saveLoading}
                  className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50 shrink-0"
                >
                  {saveLoading ? <Loader className="h-4 w-4 animate-spin" /> : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  className={`${toolBtn} shrink-0`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {saveError && <div className="mt-2 text-sm text-red-600 dark:text-red-400">{saveError}</div>}
            </div>
          )}

          {/* Upload */}
          <div className={`p-3 border-b ${divider}`}>
            <div className="flex items-stretch gap-0 rounded-xl overflow-hidden border border-gray-200/90 dark:border-gray-700/90">
              <input
                type="file"
                id="file-upload"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="flex-1 px-3 py-2.5 text-sm cursor-pointer truncate bg-white/80 dark:bg-gray-950/40 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                {uploadFile ? uploadFile.name : 'Choose file…'}
              </label>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!uploadFile || uploadLoading}
                className="px-3 py-2 bg-emerald-600 dark:bg-emerald-600 text-white text-sm hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1 shrink-0"
              >
                {uploadLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
            {uploadError && <div className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadError}</div>}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Search */}
          <div className={`p-3 border-b ${divider}`}>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search"
                className="input-field w-full rounded-xl py-2 pl-9 pr-9 text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchTerm && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {filteredDirectoryContents.length} of {directoryContents.length} items
              </div>
            )}
          </div>

          {/* File list */}
          <div className="flex-1 overflow-y-auto min-h-[200px]" style={{ maxHeight: 'calc(100vh - 380px)' }}>
            {loading && directoryContents.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                <Loader className="h-6 w-6 animate-spin mx-auto mb-2 opacity-70" />
                Loading…
              </div>
            ) : error ? (
              <div className="p-6 text-center text-sm text-red-600 dark:text-red-400">{error}</div>
            ) : filteredDirectoryContents.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No matches' : 'Folder is empty'}
              </div>
            ) : (
              <ul className="py-1">
                {filteredDirectoryContents.map((item) => (
                  <li key={item.path} className="group px-2">
                    <div className="flex items-center rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleFileSelect(item)}
                        className={`flex-1 min-w-0 pl-2 pr-1 py-2 flex items-center rounded-lg text-left transition-colors ${
                          selectedFile?.path === item.path
                            ? 'bg-blue-500/12 dark:bg-blue-500/20'
                            : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                        }`}
                      >
                        {item.is_drive ? (
                          <div className="w-8 h-8 rounded-md bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 mr-3 shrink-0 flex items-center justify-center shadow-sm">
                            <HardDrive className="h-4 w-4 text-slate-600 dark:text-slate-200" />
                          </div>
                        ) : item.is_directory ? (
                          <Folder className="h-6 w-6 text-sky-500 dark:text-sky-400 mr-3 shrink-0" strokeWidth={1.75} />
                        ) : (
                          <FileIcon className="h-6 w-6 text-gray-400 dark:text-gray-500 mr-3 shrink-0" strokeWidth={1.75} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                            {item.name}
                            {item.is_hidden && (
                              <span className="text-xs font-normal text-gray-400 dark:text-gray-500">hidden</span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex justify-between gap-2 mt-0.5">
                            <span>
                              {item.is_drive ? 'Volume' : item.is_directory ? 'Folder' : formatFileSize(item.size)}
                            </span>
                            <span className="shrink-0 tabular-nums">{formatDate(item.modified)}</span>
                          </div>
                          {item.permissions && (
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                              {item.permissions}
                              {item.readable ? ' · read' : ''}
                              {item.writable ? ' · write' : ''}
                              {item.executable ? ' · exec' : ''}
                            </div>
                          )}
                        </div>
                        {!item.is_directory && !item.is_drive && (
                          <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 ml-1 shrink-0" />
                        )}
                      </button>
                      {!item.is_drive && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(item);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-opacity shrink-0"
                          title="Move to Trash"
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

        {/* Preview / editor column */}
        <div className="flex-1 flex flex-col min-w-0 bg-white/60 dark:bg-gray-950/30">
          {selectedFile ? (
            <>
              <div className={`px-4 py-3 border-b ${divider} flex items-center justify-between gap-3 bg-white/70 dark:bg-gray-900/40`}>
                <div className="flex items-center min-w-0 gap-2">
                  {selectedFile.is_directory ? (
                    <Folder className="h-5 w-5 text-sky-500 dark:text-sky-400 shrink-0" strokeWidth={1.75} />
                  ) : (
                    <FileIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 shrink-0" strokeWidth={1.75} />
                  )}
                  <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                    {selectedFile.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!selectedFile.is_directory && !isBinary && (
                    <button
                      type="button"
                      onClick={toggleEdit}
                      className={`p-2 rounded-lg transition-colors ${
                        isEditing
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          : `${toolBtn}`
                      }`}
                      title={isEditing ? 'Done' : 'Edit'}
                    >
                      {isEditing ? <Save className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
                    </button>
                  )}
                  {!selectedFile.is_directory && (
                    <button type="button" onClick={downloadFile} className={toolBtn} title="Download">
                      <Download className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 p-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400 text-sm">
                    <Loader className="h-6 w-6 animate-spin mb-2 opacity-70" />
                    Loading…
                  </div>
                ) : selectedFile.is_directory ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    Open a folder from the sidebar, then choose a file to preview here.
                  </div>
                ) : isBinary ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    This file type can’t be previewed here. Use Download to save a copy locally.
                  </div>
                ) : isEditing ? (
                  <div className="flex flex-col flex-1 min-h-0">
                    <textarea
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="input-field flex-1 min-h-[240px] font-mono text-sm rounded-xl resize-y"
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="btn-secondary py-2 px-4 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveFile}
                        disabled={saveLoading}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
                      >
                        {saveLoading ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          'Save'
                        )}
                      </button>
                    </div>
                    {saveError && <div className="mt-2 text-sm text-red-600 dark:text-red-400">{saveError}</div>}
                  </div>
                ) : (
                  <pre className="flex-1 min-h-[240px] max-h-[min(60vh,520px)] p-4 rounded-xl border border-gray-200/90 dark:border-gray-800/90 font-mono text-xs sm:text-sm overflow-auto bg-gray-50/80 dark:bg-gray-950/50 text-gray-800 dark:text-gray-200">
                    {fileContent}
                  </pre>
                )}
              </div>

              {!selectedFile.is_directory && (
                <div className={`px-4 py-3 border-t ${divider} bg-gray-50/80 dark:bg-gray-900/50`}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    Info
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Size</span>
                      <div className="text-gray-900 dark:text-gray-100 tabular-nums">{formatFileSize(selectedFile.size)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Modified</span>
                      <div className="text-gray-900 dark:text-gray-100">{formatDate(selectedFile.modified)}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 dark:text-gray-400">Where</span>
                      <div className="text-gray-900 dark:text-gray-100 break-all text-xs mt-0.5">{selectedFile.path}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Kind</span>
                      <div className="text-gray-900 dark:text-gray-100">{isBinary ? 'Binary' : 'Text'}</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center min-h-[280px]">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center mb-5">
                <Folder className="h-10 w-10 text-gray-300 dark:text-gray-600" strokeWidth={1.25} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">No selection</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
                Select an item in the sidebar to preview or edit. Create folders, upload, or search from the toolbar.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800/60 bg-yellow-50 dark:bg-yellow-950/25">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Safety</h4>
            <p className="text-sm text-yellow-800/95 dark:text-yellow-400/90 mt-1 leading-relaxed">
              Changes affect the real filesystem on this machine. Edit only what you understand. Listings are cached briefly for speed.
            </p>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-500 shrink-0" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete permanently?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              <span className="font-medium text-gray-900 dark:text-gray-100">{itemToDelete?.name}</span> will be removed.
              This can’t be undone.
            </p>
            {deleteError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50">
                <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setItemToDelete(null);
                  setDeleteError('');
                }}
                className="btn-secondary py-2 px-4 text-sm"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-500 disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Deleting…
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