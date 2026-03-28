import React, { useState } from 'react';
import { authAPI } from '../services/api';
import { Shield, Activity } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(username, password);
      onLogin(response.access_token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#020617]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />

      <div className="w-full max-w-md relative z-10 fade-in">
        <div className="glass-card !bg-gray-900/60 !border-white/5 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)]">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-2xl shadow-2xl shadow-blue-600/40 mb-6 scale-110">
              <Activity className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight mb-2">Welcome Back</h2>
            <p className="text-gray-400 font-medium">Access your infrastructure dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-semibold flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field !bg-white/5 !border-white/10 text-white placeholder:text-gray-600 focus:!border-blue-500"
                placeholder="Enter administrator ID"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field !bg-white/5 !border-white/10 text-white placeholder:text-gray-600 focus:!border-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary !h-14 !text-lg !font-black !rounded-2xl transition-all duration-300 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AUTHENTICATING...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    INITIALIZE SESSION
                </div>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">
              ServerGuard Protocol v2.4.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 