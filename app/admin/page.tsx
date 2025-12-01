'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CookieStatus {
  exists: boolean;
  valid: boolean | null;
  age: number | null;
  lastModified: string | null;
  size: number | null;
  tested: boolean;
  message: string;
  warning: string | null;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [status, setStatus] = useState<CookieStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchStatus = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/cookie-status', {
        headers: {
          'Authorization': `Bearer ${password}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch cookie status' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const testCookies = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setMessage({ type: 'success', text: 'Testing cookies... This may take 10 seconds' });

    try {
      const response = await fetch('/api/admin/cookie-status?test=true', {
        headers: {
          'Authorization': `Bearer ${password}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        if (data.valid) {
          setMessage({ type: 'success', text: 'Cookies are valid and working!' });
        } else {
          setMessage({ type: 'error', text: data.message || 'Cookies are invalid' });
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to test cookies' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const uploadCookies = async () => {
    if (!selectedFile || !isAuthenticated) return;

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('cookies', selectedFile);

    try {
      const response = await fetch('/api/admin/upload-cookies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Cookies uploaded successfully!' });
        setSelectedFile(null);
        fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Upload failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const deleteCookies = async () => {
    if (!isAuthenticated || !confirm('Are you sure you want to delete cookies?')) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/upload-cookies', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${password}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Cookies deleted successfully!' });
        fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Delete failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/cookie-status', {
        headers: {
          'Authorization': `Bearer ${password}`,
        },
      });

      if (response.ok) {
        setIsAuthenticated(true);
        const data = await response.json();
        setStatus(data);
        setMessage({ type: 'success', text: 'Logged in successfully' });
      } else {
        setMessage({ type: 'error', text: 'Invalid password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full"
        >
          <h1 className="text-3xl font-bold text-white mb-6 text-center">Admin Login</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin Password"
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          {message && (
            <p className={`mt-4 text-center ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
              {message.text}
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-gray-700"
        >
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Cookie Management</h1>
            <a href="/" className="text-purple-400 hover:text-purple-300 transition-colors">
              ← Back to Home
            </a>
          </div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
              }`}
            >
              {message.text}
            </motion.div>
          )}

          {/* Status Section */}
          <div className="mb-8 p-6 bg-gray-700/30 rounded-xl border border-gray-600">
            <h2 className="text-xl font-semibold text-white mb-4">Cookie Status</h2>
            {status ? (
              <div className="space-y-3 text-gray-300">
                <div className="flex justify-between">
                  <span>Cookies File:</span>
                  <span className={status.exists ? 'text-green-400' : 'text-red-400'}>
                    {status.exists ? '✓ Exists' : '✗ Not Found'}
                  </span>
                </div>
                {status.exists && (
                  <>
                    <div className="flex justify-between">
                      <span>Last Modified:</span>
                      <span>{new Date(status.lastModified!).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Age:</span>
                      <span className={status.age! > 30 ? 'text-yellow-400' : ''}>
                        {status.age} days old
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{Math.round(status.size! / 1024)} KB</span>
                    </div>
                    {status.tested && (
                      <div className="flex justify-between">
                        <span>Validation:</span>
                        <span className={status.valid ? 'text-green-400' : 'text-red-400'}>
                          {status.message}
                        </span>
                      </div>
                    )}
                    {status.warning && (
                      <div className="mt-2 p-3 bg-yellow-500/20 rounded-lg text-yellow-300 text-sm">
                        ⚠️ {status.warning}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-gray-400">Loading...</p>
            )}
            <div className="mt-4 flex gap-3">
              <button
                onClick={fetchStatus}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Refresh
              </button>
              <button
                onClick={testCookies}
                disabled={loading || !status?.exists}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Test Cookies
              </button>
            </div>
          </div>

          {/* Upload Section */}
          <div className="mb-8 p-6 bg-gray-700/30 rounded-xl border border-gray-600">
            <h2 className="text-xl font-semibold text-white mb-4">Upload Cookies</h2>
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  selectedFile ? 'border-purple-500 bg-purple-500/10' : 'border-gray-500 hover:border-gray-400'
                }`}
              >
                <input
                  type="file"
                  accept=".txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="cookie-file"
                />
                <label htmlFor="cookie-file" className="cursor-pointer">
                  <div className="text-gray-300">
                    {selectedFile ? (
                      <>
                        <p className="text-purple-400 font-semibold">✓ {selectedFile.name}</p>
                        <p className="text-sm mt-2">Click to change file</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold">Click to select cookies.txt</p>
                        <p className="text-sm mt-2">or drag and drop</p>
                      </>
                    )}
                  </div>
                </label>
              </div>
              <button
                onClick={uploadCookies}
                disabled={!selectedFile || loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Uploading...' : 'Upload Cookies'}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-8 p-6 bg-gray-700/30 rounded-xl border border-gray-600">
            <h2 className="text-xl font-semibold text-white mb-4">How to Export Cookies</h2>
            <ol className="space-y-2 text-gray-300 list-decimal list-inside">
              <li>Install the <a href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc" target="_blank" className="text-purple-400 hover:underline">Get cookies.txt LOCALLY</a> Chrome extension</li>
              <li>Log into YouTube in your browser</li>
              <li>Go to any YouTube page (e.g., youtube.com)</li>
              <li>Click the extension icon and export cookies</li>
              <li>Save the file and upload it here</li>
            </ol>
          </div>

          {/* Danger Zone */}
          {status?.exists && (
            <div className="p-6 bg-red-900/20 rounded-xl border border-red-700">
              <h2 className="text-xl font-semibold text-red-400 mb-4">Danger Zone</h2>
              <p className="text-gray-300 mb-4">Permanently delete the cookies file from the server.</p>
              <button
                onClick={deleteCookies}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Delete Cookies
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
