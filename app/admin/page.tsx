'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Cookie {
  id: string;
  filename: string;
  uploadedAt: string;
  lastChecked: string | null;
  status: 'active' | 'blocked' | 'expired' | 'error' | 'untested';
  failureCount: number;
  successCount: number;
  lastError: string | null;
  priority: number;
}

interface CookieListData {
  cookies: Cookie[];
  stats: {
    total: number;
    active: number;
    blocked: number;
    expired: number;
    untested: number;
    error: number;
  };
  currentCookieId: string | null;
  lastRotation: string | null;
  lastHealthCheck: string | null;
  chromiumUsageCount: number;
  chromiumFallbackEnabled: boolean;
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Cookie management state
  const [cookieData, setCookieData] = useState<CookieListData | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [expandedCookie, setExpandedCookie] = useState<string | null>(null);
  const [testingCookie, setTestingCookie] = useState<string | null>(null);
  const [runningHealthCheck, setRunningHealthCheck] = useState(false);

  // Fetch cookie list
  const fetchCookieList = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('/api/admin/cookies-list', {
        headers: {
          Authorization: `Bearer ${password}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCookieData(data);
      } else {
        console.error('Failed to fetch cookie list');
      }
    } catch (error) {
      console.error('Error fetching cookie list:', error);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Try to fetch cookie list to verify password
      const response = await fetch('/api/admin/cookies-list', {
        headers: {
          Authorization: `Bearer ${password}`,
        },
      });

      if (response.ok) {
        setIsAuthenticated(true);
        const data = await response.json();
        setCookieData(data);
      } else {
        setError('Invalid password');
      }
    } catch (error) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Upload cookies
  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setUploadMessage('Please select at least one cookie file');
      return;
    }

    setUploading(true);
    setUploadMessage('');

    try {
      const formData = new FormData();

      // Add all selected files
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('cookies', selectedFiles[i]);
      }

      const response = await fetch('/api/admin/upload-cookies-v2', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${password}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadMessage(
          `✓ Successfully uploaded ${data.uploaded} cookie(s)` +
            (data.failed > 0 ? `. ${data.failed} failed.` : '')
        );
        setSelectedFiles(null);
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        // Refresh cookie list
        fetchCookieList();
      } else {
        setUploadMessage(`Error: ${data.error}`);
      }
    } catch (error: any) {
      setUploadMessage(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Delete cookie
  const handleDelete = async (cookieId: string) => {
    if (!confirm('Are you sure you want to delete this cookie?')) return;

    try {
      const response = await fetch('/api/admin/delete-cookie', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cookieId }),
      });

      if (response.ok) {
        fetchCookieList();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // Test cookie
  const handleTestCookie = async (cookieId: string) => {
    setTestingCookie(cookieId);

    try {
      const response = await fetch('/api/admin/test-cookie', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cookieId }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Cookie test result: ${data.status.toUpperCase()}`);
        fetchCookieList();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setTestingCookie(null);
    }
  };

  // Run health check on all cookies
  const handleHealthCheck = async () => {
    if (!confirm('This will test all cookies and may take a while. Continue?')) return;

    setRunningHealthCheck(true);

    try {
      const response = await fetch('/api/admin/health-check', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${password}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          `Health check completed!\n\n` +
            `Active: ${data.active}\n` +
            `Blocked: ${data.blocked}\n` +
            `Expired: ${data.expired}\n` +
            `Errors: ${data.errors}`
        );
        fetchCookieList();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setRunningHealthCheck(false);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: Cookie['status'] }) => {
    const styles = {
      active: 'bg-green-500/20 text-green-400 border-green-500/50',
      blocked: 'bg-red-500/20 text-red-400 border-red-500/50',
      expired: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
      error: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      untested: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    };

    const icons = {
      active: <CheckCircle size={14} />,
      blocked: <XCircle size={14} />,
      expired: <Clock size={14} />,
      error: <AlertCircle size={14} />,
      untested: <Activity size={14} />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
      >
        {icons[status]}
        {status.toUpperCase()}
      </span>
    );
  };

  // Auto-refresh cookie list
  useEffect(() => {
    if (isAuthenticated) {
      fetchCookieList();
      const interval = setInterval(fetchCookieList, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
            <h1 className="text-3xl font-bold text-white mb-2 text-center">Admin Panel</h1>
            <p className="text-zinc-400 text-sm text-center mb-8">
              Cookie Management System
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Authenticating...' : 'Login'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main admin panel
  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Cookie Management</h1>
          <p className="text-zinc-400">
            Multi-cookie rotation with automatic fallback system
          </p>
        </div>

        {/* Stats Cards */}
        {cookieData && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <div className="text-zinc-400 text-sm mb-1">Total</div>
              <div className="text-3xl font-bold">{cookieData.stats.total}</div>
            </div>
            <div className="bg-zinc-950 border border-green-900/50 rounded-xl p-4">
              <div className="text-green-400 text-sm mb-1">Active</div>
              <div className="text-3xl font-bold text-green-400">
                {cookieData.stats.active}
              </div>
            </div>
            <div className="bg-zinc-950 border border-red-900/50 rounded-xl p-4">
              <div className="text-red-400 text-sm mb-1">Blocked</div>
              <div className="text-3xl font-bold text-red-400">
                {cookieData.stats.blocked}
              </div>
            </div>
            <div className="bg-zinc-950 border border-gray-900/50 rounded-xl p-4">
              <div className="text-gray-400 text-sm mb-1">Expired</div>
              <div className="text-3xl font-bold text-gray-400">
                {cookieData.stats.expired}
              </div>
            </div>
            <div className="bg-zinc-950 border border-blue-900/50 rounded-xl p-4">
              <div className="text-blue-400 text-sm mb-1">Untested</div>
              <div className="text-3xl font-bold text-blue-400">
                {cookieData.stats.untested}
              </div>
            </div>
            <div className="bg-zinc-950 border border-orange-900/50 rounded-xl p-4">
              <div className="text-orange-400 text-sm mb-1">Errors</div>
              <div className="text-3xl font-bold text-orange-400">
                {cookieData.stats.error}
              </div>
            </div>
            <div className="bg-zinc-950 border border-purple-900/50 rounded-xl p-4">
              <div className="text-purple-400 text-sm mb-1">Chromium</div>
              <div className="text-3xl font-bold text-purple-400">
                {cookieData.chromiumUsageCount}
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Upload size={24} />
            Upload Cookies
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Select Cookie Files (Netscape format)
              </label>
              <input
                type="file"
                accept=".txt"
                multiple
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
              />
              <p className="text-zinc-500 text-xs mt-2">
                You can select multiple cookie files at once
              </p>
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFiles}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Upload Cookies
                </>
              )}
            </button>

            {uploadMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`p-3 rounded-lg ${
                  uploadMessage.startsWith('✓')
                    ? 'bg-green-500/10 border border-green-500/50 text-green-400'
                    : 'bg-red-500/10 border border-red-500/50 text-red-400'
                }`}
              >
                {uploadMessage}
              </motion.div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={fetchCookieList}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Refresh
          </button>

          <button
            onClick={handleHealthCheck}
            disabled={runningHealthCheck}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
          >
            {runningHealthCheck ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Activity size={18} />
                Run Health Check
              </>
            )}
          </button>
        </div>

        {/* Cookie List */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">
            Cookies ({cookieData?.cookies.length || 0})
          </h2>

          {cookieData && cookieData.cookies.length === 0 && (
            <div className="text-center py-12 text-zinc-400">
              <Upload size={48} className="mx-auto mb-4 opacity-50" />
              <p>No cookies uploaded yet</p>
              <p className="text-sm">Upload cookie files to get started</p>
            </div>
          )}

          <div className="space-y-3">
            {cookieData?.cookies.map((cookie) => (
              <motion.div
                key={cookie.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`bg-zinc-900 border ${
                  cookie.id === cookieData.currentCookieId
                    ? 'border-blue-500/50 bg-blue-500/5'
                    : 'border-zinc-800'
                } rounded-xl p-4`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <StatusBadge status={cookie.status} />
                      {cookie.id === cookieData.currentCookieId && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/50">
                          CURRENT
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-zinc-400 space-y-1">
                      <div>
                        <span className="text-zinc-500">File:</span> {cookie.filename}
                      </div>
                      <div>
                        <span className="text-zinc-500">Uploaded:</span>{' '}
                        {new Date(cookie.uploadedAt).toLocaleString()}
                      </div>
                      <div className="flex gap-6">
                        <div>
                          <span className="text-green-400">✓ {cookie.successCount}</span>
                        </div>
                        <div>
                          <span className="text-red-400">✗ {cookie.failureCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {expandedCookie === cookie.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-3 pt-3 border-t border-zinc-800 text-sm text-zinc-400 space-y-1"
                        >
                          <div>
                            <span className="text-zinc-500">ID:</span> {cookie.id}
                          </div>
                          {cookie.lastChecked && (
                            <div>
                              <span className="text-zinc-500">Last Checked:</span>{' '}
                              {new Date(cookie.lastChecked).toLocaleString()}
                            </div>
                          )}
                          {cookie.lastError && (
                            <div>
                              <span className="text-zinc-500">Last Error:</span>{' '}
                              <span className="text-red-400">{cookie.lastError}</span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() =>
                        setExpandedCookie(expandedCookie === cookie.id ? null : cookie.id)
                      }
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      {expandedCookie === cookie.id ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </button>

                    <button
                      onClick={() => handleTestCookie(cookie.id)}
                      disabled={testingCookie === cookie.id}
                      className="p-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg transition-colors"
                      title="Test cookie"
                    >
                      {testingCookie === cookie.id ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Activity size={18} />
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(cookie.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      title="Delete cookie"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* System Info */}
        {cookieData && (
          <div className="mt-8 bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">System Information</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Last Rotation:</span>{' '}
                <span className="text-zinc-300">
                  {cookieData.lastRotation
                    ? new Date(cookieData.lastRotation).toLocaleString()
                    : 'Never'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Last Health Check:</span>{' '}
                <span className="text-zinc-300">
                  {cookieData.lastHealthCheck
                    ? new Date(cookieData.lastHealthCheck).toLocaleString()
                    : 'Never'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Chromium Fallback:</span>{' '}
                <span className="text-zinc-300">
                  {cookieData.chromiumFallbackEnabled ? 'Enabled ✓' : 'Disabled'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Chromium Usage Count:</span>{' '}
                <span className="text-zinc-300">{cookieData.chromiumUsageCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
