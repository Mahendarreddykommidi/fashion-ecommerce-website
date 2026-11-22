import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { SeoHead } from '../components/common/SeoHead.tsx';

const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Valid email is required'),
  phone: z.string().trim().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export function Login() {
  const { login, loading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/account';
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setError(null);
    try {
      const user = await login(data.email, data.password);
      showToast(`Welcome back, ${user.full_name}`);
      navigate(user.role === 'admin' && redirectTo === '/account' ? '/admin' : redirectTo);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    }
  };

  return (
    <>
      <SeoHead title="Sign In" description="Sign in to your ATELIER customer account." />
      <div className="mx-auto max-w-md px-4 py-14 sm:py-20">
        <div className="rounded-3xl border border-[#E8E8E5] bg-white p-8 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Member Access</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#171717]">Sign In</h1>
          <p className="mt-2 text-sm text-[#777777]">
            Access your orders, saved addresses, and synced wishlist.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">Email</label>
              <input
                type="email"
                {...register('email')}
                className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#171717]">Password</label>
                <Link to="/forgot-password" className="text-xs text-[#777777] hover:text-[#171717] underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                {...register('password')}
                className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#171717] py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#2a2a2a] disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#777777]">
            New to ATELIER?{' '}
            <Link to="/register" className="font-semibold text-[#171717] underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export function Register() {
  const { register: registerUser, loading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    setError(null);
    try {
      await registerUser(data);
      showToast('Account created. Welcome to ATELIER!');
      navigate('/account');
    } catch (err: any) {
      setError(err.message || 'Could not create account');
    }
  };

  return (
    <>
      <SeoHead title="Create Account" description="Join ATELIER for faster checkout, order tracking, and saved wishlists." />
      <div className="mx-auto max-w-md px-4 py-14 sm:py-20">
        <div className="rounded-3xl border border-[#E8E8E5] bg-white p-8 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#777777]">Join ATELIER</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#171717]">Create Account</h1>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">Full Name</label>
              <input
                {...register('full_name')}
                className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
              />
              {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">Email</label>
              <input
                type="email"
                {...register('email')}
                className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">Mobile Number (Optional)</label>
              <input
                type="tel"
                {...register('phone')}
                className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">Password</label>
              <input
                type="password"
                {...register('password')}
                className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#171717] py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#2a2a2a] disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#777777]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#171717] underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ message: string; preview_reset_token?: string }>(
        '/api/auth/forgot-password',
        { method: 'POST', body: JSON.stringify({ email }) }
      );
      setMessage(res.message);
      if (res.preview_reset_token) {
        setResetToken(res.preview_reset_token);
        setStep('reset');
      }
    } catch (err: any) {
      showToast(err.message || 'Unable to process request', 'error');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      showToast('Password updated. Please sign in.');
      navigate('/login');
    } catch (err: any) {
      showToast(err.message || 'Reset failed', 'error');
    }
  };

  return (
    <>
      <SeoHead title="Reset Password" description="Recover access to your ATELIER account." />
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-3xl border border-[#E8E8E5] bg-white p-8">
          <h1 className="font-display text-2xl font-bold text-[#171717]">Reset Password</h1>
          {message && <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl">{message}</p>}

          {step === 'request' ? (
            <form onSubmit={handleRequest} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Account Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                />
              </div>
              <button type="submit" className="w-full rounded-full bg-[#171717] py-3 text-xs font-semibold text-white">
                Send Reset Link
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Reset Token</label>
                <input
                  type="text"
                  required
                  value={resetToken || ''}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">New Password (8+ characters)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] px-3.5 py-2.5 text-sm"
                />
              </div>
              <button type="submit" className="w-full rounded-full bg-[#171717] py-3 text-xs font-semibold text-white">
                Update Password
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
