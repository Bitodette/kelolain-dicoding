import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../utils/api';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        username,
        password,
        rememberMe,
      });

      const authData = response.data;
      if (onLogin) onLogin(authData);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err.response?.data?.error || 'Login gagal. Cek kembali username dan password.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FB] px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#23262F]">Login</h1>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-[#4B5563]">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#111827] outline-none transition-shadow focus:border-[#2936C4] focus:shadow-sm"
              placeholder="username"
              autoComplete="username"
              spellCheck="false"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#4B5563]">Password</span>
            <div className="relative mt-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-[#111827] outline-none transition-shadow focus:border-[#2936C4] focus:shadow-sm"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B95A7] hover:text-[#23262F]"
              >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </label>

          <label className="flex items-center gap-2 text-sm text-[#4B5563]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#2936C4] focus:ring-[#2936C4]"
            />
            Ingat saya di perangkat ini
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#2936C4] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#232EA8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Masuk...' : 'Masuk'}
          </button>
        </form>

        <div className="mt-6 text-sm text-[#6B7280] text-center">
          Belum punya akun?{' '}
          <Link to="/register" className="font-semibold text-[#2936C4] hover:text-[#1f2aa0]">
            Daftar sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
