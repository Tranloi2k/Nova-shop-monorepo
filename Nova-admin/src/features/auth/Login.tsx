import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const handlePrefill = (role: 'admin' | 'staff') => {
    setError(null);
    if (role === 'admin') {
      setEmail('admin@novashop.com');
      setPassword('admin123');
    } else {
      setEmail('staff@novashop.com');
      setPassword('staff123');
    }
  };

  return (
    <div className="dark relative flex min-h-screen w-screen items-center justify-center bg-[#0c1016] px-4 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[80px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-blue-400/5 blur-[80px] animate-pulse delay-700"></div>

      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-blue-400 flex items-center justify-center font-display font-extrabold text-2xl text-white shadow-[0_0_30px_rgba(59,130,246,0.35)] mb-3">
            N
          </div>
          <h2 className="font-display text-3xl font-extrabold text-white tracking-tight">Welcome Back</h2>
          <p className="text-sm text-neutral-400 mt-1">Nova Shop Admin Management</p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {error && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 placeholder-neutral-500 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                  placeholder="admin@novashop.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 placeholder-neutral-500 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 mt-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-[0_4px_15px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Logging in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Quick Demo Login Helpers */}
          <div className="mt-8 border-t border-white/5 pt-6 text-center">
            <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-3">
              Developer Demo Accounts
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => handlePrefill('admin')}
                className="flex-1 py-2 px-3 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 text-xs font-semibold transition-all"
              >
                Prefill Admin
              </button>
              <button
                type="button"
                onClick={() => handlePrefill('staff')}
                className="flex-1 py-2 px-3 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 text-xs font-semibold transition-all"
              >
                Prefill Staff
              </button>
            </div>
            <p className="text-[10px] text-neutral-500 mt-3 italic leading-normal">
              * Note: Please seed the database first if accounts do not exist!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
