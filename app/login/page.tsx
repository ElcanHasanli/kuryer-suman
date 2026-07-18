'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react';
import { ApiError, login as apiLogin } from '@/lib/api';
import { getLicenseCode, setLicenseCode as persistLicenseCode } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';

const SUPPORT_PHONE = '+994 50 555 62 32';
const SUPPORT_PHONE_TEL = 'tel:+994505556232';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login: authLogin, isAuthenticated, user, isReady } = useAuth();

  useEffect(() => {
    setLicenseCode(getLicenseCode());
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (
      isAuthenticated &&
      (user?.role || '').toString().toLowerCase() === 'courier'
    ) {
      router.replace('/dashboard/');
    }
  }, [isAuthenticated, isReady, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!licenseCode.trim()) {
      setError('Lisenziya kodu tələb olunur');
      return;
    }

    setLoading(true);
    try {
      const { user: loggedInUser, token } = await apiLogin(
        email.trim(),
        password,
        licenseCode
      );
      if (loggedInUser.role !== 'courier') {
        setError('Bu panel yalnız kuryer üçündür');
        return;
      }
      persistLicenseCode(licenseCode.trim());
      authLogin(loggedInUser, token);
      router.push('/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Giriş uğursuz oldu'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-600 via-sky-700 to-cyan-800 p-4">
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 bg-white p-5 shadow-2xl sm:p-8">
        <div className="mb-5 text-center sm:mb-6">
          <div className="mx-auto flex justify-center rounded-xl bg-white px-3 py-2">
            <Image
              src="/su-courier.png"
              alt="SuMan Kuryer"
              width={420}
              height={142}
              priority
              className="h-28 w-auto object-contain object-center sm:h-32"
              style={{ backgroundColor: '#ffffff' }}
            />
          </div>
          <div className="mt-1.5">
            <div className="mx-auto flex max-w-[280px] items-center gap-3">
              <span
                className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/70 to-amber-600/90"
                aria-hidden
              />
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700 sm:text-[11px]">
                <span className="text-amber-500" aria-hidden>
                  ◆
                </span>
                Premium həll
                <span className="text-amber-500" aria-hidden>
                  ◆
                </span>
              </span>
              <span
                className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-500/70 to-amber-600/90"
                aria-hidden
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-[38px] z-10 text-slate-400">
              <Mail size={18} />
            </span>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              placeholder="kuryer@firma.az"
              required
            />
          </div>

          <div className="relative">
            <span className="absolute left-3 top-[38px] z-10 text-slate-400">
              <Lock size={18} />
            </span>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] z-10 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Şifrə</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              required
            />
          </div>

          <div className="relative">
            <span className="absolute left-3 top-[38px] z-10 text-slate-400">
              <KeyRound size={18} />
            </span>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Lisenziya kodu
            </label>
            <input
              type="text"
              value={licenseCode}
              onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 font-mono text-sm uppercase tracking-wide text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              placeholder="SUMAN-XXXX-XXXX"
              required
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Gözləyin...' : 'Daxil ol'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Lisenziya kodu şirkətinizə platform sahibi tərəfindən verilir
        </p>

        <div className="mt-6 flex flex-col items-center gap-2 border-t border-slate-100 pt-5">
          <a
            href="https://khamsacraft.az"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-80 transition hover:opacity-100"
          >
            <Image
              src="/khamsa-logo.svg"
              alt="KhamsaCraft"
              width={140}
              height={43}
              className="h-9 w-auto object-contain"
            />
          </a>
          <a
            href={SUPPORT_PHONE_TEL}
            className="mt-1 text-sm text-slate-500 transition hover:text-sky-600"
          >
            {SUPPORT_PHONE}
          </a>
          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} KhamsaCraft
          </p>
        </div>
      </div>
    </div>
  );
}
