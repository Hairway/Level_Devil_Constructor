import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  logout,
  initAuth,
  listDriveFiles,
  loadDriveFileContent,
  createDriveFile,
  updateDriveFile,
  deleteDriveFile,
  DriveFile
} from '../firebase';
import { GameConfig } from '../types';
import {
  Cloud,
  CloudLightning,
  CloudOff,
  FolderOpen,
  Save,
  Trash2,
  RefreshCw,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronRight,
  Info,
  FolderDown,
  Download
} from 'lucide-react';

interface GoogleDriveSyncProps {
  currentConfig: GameConfig;
  onConfigChange: (config: GameConfig) => void;
  onLogEvent: (type: string, description: string) => void;
}

export default function GoogleDriveSync({
  currentConfig,
  onConfigChange,
  onLogEvent
}: GoogleDriveSyncProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [newFileName, setNewFileName] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [overwriteTarget, setOverwriteTarget] = useState<DriveFile | null>(null);

  // New Folder Import state
  const [activeTab, setActiveTab] = useState<'presets' | 'import'>('presets');
  const [folderUrl, setFolderUrl] = useState('https://drive.google.com/drive/folders/13m46dLm46epKY3ZPU8IHb8jcVLWB6HY9?usp=drive_link');
  const [importingFolder, setImportingFolder] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        fetchFiles(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchFiles = async (accessToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const driveFiles = await listDriveFiles(accessToken);
      setFiles(driveFiles);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch files from Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        onLogEvent('SYSTEM', `Signed in with Google as ${result.user.email}`);
        fetchFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setError('Google Authentication failed.');
    }
  };

  const handleLogout = async () => {
    setError(null);
    setSuccess(null);
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setFiles([]);
      onLogEvent('SYSTEM', 'Signed out from Google Drive');
    } catch (err: any) {
      console.error(err);
      setError('Logout failed.');
    }
  };

  const handleSave = async (forceOverwrite = false) => {
    if (!token) return;
    if (!newFileName.trim()) {
      setError('Please provide a file name.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const formattedName = newFileName.trim().toLowerCase().replace(/\s+/g, '-');
    const fullFileName = formattedName.startsWith('level-devil-') 
      ? (formattedName.endsWith('.json') ? formattedName : `${formattedName}.json`)
      : `level-devil-${formattedName}.json`;

    try {
      // Check if file already exists
      const existingFile = files.find(f => f.name.toLowerCase() === fullFileName.toLowerCase());

      if (existingFile && !forceOverwrite) {
        setOverwriteTarget(existingFile);
        setSaving(false);
        return;
      }

      if (existingFile && forceOverwrite) {
        const confirmed = window.confirm(
          `Are you sure you want to overwrite "${existingFile.name}" on Google Drive? This action cannot be undone.`
        );
        if (!confirmed) {
          setSaving(false);
          setOverwriteTarget(null);
          return;
        }

        await updateDriveFile(token, existingFile.id, currentConfig);
        onLogEvent('SYSTEM', `Overwrote level "${existingFile.name}" in Google Drive`);
        setSuccess(`Successfully updated "${fullFileName}"!`);
      } else {
        const newFile = await createDriveFile(token, formattedName, currentConfig);
        onLogEvent('SYSTEM', `Saved new custom level "${newFile.name}" to Google Drive`);
        setSuccess(`Saved level as "${newFile.name}"!`);
      }

      setNewFileName('');
      setOverwriteTarget(null);
      fetchFiles(token);
    } catch (err: any) {
      console.error(err);
      setError('Failed to save file to Google Drive.');
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (file: DriveFile) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const configData = await loadDriveFileContent(token, file.id);
      onConfigChange(configData);
      onLogEvent('SYSTEM', `Loaded level config "${file.name}" from Google Drive`);
      setSuccess(`Loaded level "${file.name}" successfully!`);
    } catch (err: any) {
      console.error(err);
      setError(`Failed to load "${file.name}".`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (file: DriveFile) => {
    if (!token) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${file.name}" from your Google Drive? This action is permanent and cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteDriveFile(token, file.id);
      onLogEvent('SYSTEM', `Deleted level "${file.name}" from Google Drive`);
      setSuccess(`Deleted "${file.name}" successfully.`);
      fetchFiles(token);
    } catch (err: any) {
      console.error(err);
      setError(`Failed to delete "${file.name}".`);
    } finally {
      setLoading(false);
    }
  };

  const extractFolderId = (urlOrId: string) => {
    const trimmed = urlOrId.trim();
    if (trimmed.includes('folders/')) {
      const match = trimmed.match(/folders\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : trimmed;
    }
    return trimmed;
  };

  const handleFolderImport = async () => {
    if (!token) return;
    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
      setError('Invalid Google Drive folder URL or ID.');
      return;
    }

    setImportingFolder(true);
    setError(null);
    setSuccess(null);
    setImportStatus('Initializing folder scan...');
    setImportProgress({ current: 0, total: 0 });

    try {
      onLogEvent('SYSTEM', `Scanning folder ${folderId}...`);
      
      const isPathIgnored = (pathStr: string) => {
        const parts = pathStr.toLowerCase().split(/[/\\]/);
        return parts.some(part => {
          const p = part.trim();
          return (
            p === 'node_modules' ||
            p === '.git' ||
            p === 'dist' ||
            p === '.next' ||
            p === 'build' ||
            p === 'out' ||
            p === '.cache' ||
            p === 'package-lock.json' ||
            p === '.ds_store' ||
            p === 'thumbs.db'
          );
        });
      };

      interface FileTask {
        id: string;
        name: string;
        mimeType: string;
        relativePath: string;
      }
      
      const allFiles: FileTask[] = [];
      
      const scan = async (fId: string, currentRelPath: string) => {
        setImportStatus(`Scanning subfolder: ${currentRelPath || 'root'}`);
        const q = encodeURIComponent(`'${fId}' in parents and trashed = false`);
        const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&pageSize=1000`;
        
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!res.ok) {
          throw new Error(`Failed to read folder: ${currentRelPath || 'root'}`);
        }
        
        const data = await res.json();
        const items = data.files || [];
        
        for (const item of items) {
          const nameTrimmed = item.name.trim();
          const itemPath = currentRelPath ? `${currentRelPath}/${nameTrimmed}` : nameTrimmed;
          
          if (isPathIgnored(item.name) || isPathIgnored(itemPath)) {
            continue;
          }

          if (item.mimeType === 'application/vnd.google-apps.folder') {
            await scan(item.id, itemPath);
          } else {
            allFiles.push({
              id: item.id,
              name: item.name,
              mimeType: item.mimeType,
              relativePath: itemPath
            });
          }
        }
      };

      await scan(folderId, '');
      
      if (allFiles.length === 0) {
        setError('No files found in this Google Drive folder.');
        setImportingFolder(false);
        return;
      }

      setImportProgress({ current: 0, total: allFiles.length });
      onLogEvent('SYSTEM', `Found ${allFiles.length} files to transfer.`);

      // Sequentially fetch content and write each file
      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];
        setImportStatus(`Fetching file [${i+1}/${allFiles.length}]: ${file.relativePath}`);
        
        const mediaUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
        const fileRes = await fetch(mediaUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!fileRes.ok) {
          throw new Error(`Failed to fetch content for ${file.relativePath}`);
        }

        const content = await fileRes.text();

        // Write to local disk using Express API
        const saveRes = await fetch('/api/save-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: file.relativePath,
            content: content
          })
        });

        if (!saveRes.ok) {
          const saveErr = await saveRes.json().catch(() => ({}));
          throw new Error(`Failed to write file ${file.relativePath} to project: ${saveErr.error || 'Server error'}`);
        }

        setImportProgress({ current: i + 1, total: allFiles.length });
      }

      setSuccess(`Successfully imported ${allFiles.length} files! The project files have been updated.`);
      onLogEvent('SYSTEM', `Project fully imported with ${allFiles.length} files from Drive.`);
      
    } catch (err: any) {
      console.error(err);
      setError(`Import error: ${err.message || err}`);
      onLogEvent('ERROR', `Drive Import failed: ${err.message}`);
    } finally {
      setImportingFolder(false);
      setImportStatus('');
    }
  };

  const cleanDisplayName = (name: string) => {
    return name
      .replace(/^level-devil-/, '')
      .replace(/\.json$/, '')
      .replace(/-/g, ' ');
  };

  return (
    <div className="border border-zinc-900 bg-zinc-900/20 rounded-xl p-4 space-y-4 select-text">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Cloud className="w-4 h-4 text-amber-500" />
          <span>Google Drive Cloud Sync</span>
        </h3>
        
        {!needsAuth && user && (
          <button
            onClick={handleLogout}
            className="text-[10px] text-zinc-500 hover:text-red-400 transition flex items-center gap-1 hover:bg-red-500/10 px-2 py-0.5 rounded border border-transparent hover:border-red-500/20 cursor-pointer"
            title="Sign out from Google Account"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign out</span>
          </button>
        )}
      </div>

      {/* ERROR MESSAGE DISPLAY */}
      {error && (
        <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* SUCCESS MESSAGE DISPLAY */}
      {success && (
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {needsAuth ? (
        <div className="py-4 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-500">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-300">Google Drive is disconnected</h4>
            <p className="text-[10px] text-zinc-500 mt-1 max-w-[260px] mx-auto leading-relaxed">
              Connect your Google account to cloud-save level presets or import all project files directly from your Drive folders.
            </p>
          </div>
          
          <button 
            onClick={handleLogin}
            className="flex items-center gap-3 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold px-4 py-2 rounded-lg text-xs transition active:scale-95 shadow-md border border-zinc-200 cursor-pointer"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* USER INFO DISPLAY */}
          {user && (
            <div className="flex items-center gap-2.5 bg-zinc-950/40 p-2 border border-zinc-900 rounded-lg text-xs">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-zinc-800" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20 flex items-center justify-center">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'G'}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-zinc-200 truncate">{user.displayName || 'Authorized User'}</p>
                <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
          )}

          {/* TAB SYSTEM */}
          <div className="flex border-b border-zinc-900 text-xs">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 pb-2 font-semibold text-center border-b-2 transition cursor-pointer ${
                activeTab === 'presets'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Level Presets
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 pb-2 font-semibold text-center border-b-2 transition cursor-pointer ${
                activeTab === 'import'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Full Project Importer
            </button>
          </div>

          {/* TAB 1: LEVEL PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="file-name-input" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Save Level Preset
                  </label>
                  <span className="text-[9px] text-zinc-500 font-mono">auto-prefixes: level-devil-</span>
                </div>
                
                <div className="flex gap-1.5">
                  <input
                    id="file-name-input"
                    type="text"
                    placeholder="e.g. death-valley, fun-run"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="flex-1 bg-black text-zinc-300 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 font-mono"
                  />
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving || !newFileName.trim()}
                    className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-zinc-900 text-zinc-950 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition active:scale-95 shrink-0 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              </div>

              {overwriteTarget && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
                  <p className="text-xs text-amber-500 font-medium">
                    File "level-devil-{cleanDisplayName(overwriteTarget.name)}.json" already exists on your Google Drive.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(true)}
                      className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-2.5 py-1 rounded text-[11px] font-bold transition active:scale-95 cursor-pointer"
                    >
                      Overwrite Existing File
                    </button>
                    <button
                      onClick={() => setOverwriteTarget(null)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Drive Levels ({files.length})
                  </span>
                  <button
                    onClick={() => token && fetchFiles(token)}
                    disabled={loading}
                    className="text-zinc-500 hover:text-zinc-300 transition p-1 hover:bg-zinc-900 rounded cursor-pointer"
                    title="Refresh Google Drive files"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loading && files.length === 0 ? (
                  <div className="text-center py-4 text-zinc-600 italic text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>Scanning Google Drive...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-5 border border-dashed border-zinc-900 bg-zinc-950/20 rounded-lg text-zinc-600 text-xs flex flex-col items-center gap-1">
                    <FolderOpen className="w-5 h-5 text-zinc-800" />
                    <span>No saved level presets found on Drive</span>
                    <span className="text-[10px] text-zinc-700">Save your first layout to sync to cloud</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between bg-zinc-950/50 hover:bg-zinc-950 border border-zinc-900 rounded-lg p-2 text-xs transition"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-semibold text-zinc-200 capitalize truncate">
                            {cleanDisplayName(file.name)}
                          </p>
                          <p className="text-[9px] text-zinc-600 font-mono mt-0.5">
                            Saved: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleLoad(file)}
                            className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-amber-500 hover:text-amber-400 px-2 py-1 rounded transition flex items-center gap-0.5 cursor-pointer"
                            title="Load level into playground"
                          >
                            <span>Load</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => handleDelete(file)}
                            className="text-zinc-600 hover:text-red-400 p-1 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded transition cursor-pointer"
                            title="Delete level from Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PROJECT IMPORTER */}
          {activeTab === 'import' && (
            <div className="space-y-4 animate-fade-in text-xs">
              <div className="space-y-2">
                <label htmlFor="folder-url-input" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Google Drive Folder URL / ID
                </label>
                <div className="space-y-2">
                  <input
                    id="folder-url-input"
                    type="text"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={folderUrl}
                    onChange={(e) => setFolderUrl(e.target.value)}
                    className="w-full bg-black text-zinc-300 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 font-mono"
                  />
                  
                  <button
                    onClick={handleFolderImport}
                    disabled={importingFolder || !folderUrl.trim()}
                    className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-zinc-900 text-zinc-950 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
                  >
                    <FolderDown className="w-4 h-4" />
                    <span>{importingFolder ? 'Importing Folder...' : 'Import All Folder Files'}</span>
                  </button>
                </div>
              </div>

              {/* PROGRESS STATUS BAR */}
              {importingFolder && (
                <div className="bg-zinc-950/40 border border-zinc-900 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span className="truncate">{importStatus}</span>
                    <span className="shrink-0">{importProgress.current} / {importProgress.total}</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-lg space-y-2 text-[11px] text-zinc-400 leading-relaxed">
                <p className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>How Folder Import Works:</span>
                </p>
                <ul className="list-disc pl-4 space-y-1 text-zinc-500 font-mono text-[10px]">
                  <li>Connects directly via your browser's Google OAuth session</li>
                  <li>Recursively scans the folder and all subfolders</li>
                  <li>Downloads all files (e.g. <span className="text-zinc-400">src/App.tsx</span>, etc.) and overwrites existing ones on your dev workspace</li>
                  <li>Automatically triggers an applet rebuild on completion</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-1.5 items-start mt-2 border-t border-zinc-900/60 pt-3">
            <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
            <p className="text-[9px] text-zinc-500 leading-normal">
              Level configurations and files are fetched directly via official Google Drive API endpoints securely.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
