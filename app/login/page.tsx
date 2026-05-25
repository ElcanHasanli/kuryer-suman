'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, login } from '@/lib/api';
import { getLicenseCode, setLicenseCode } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();
  const { login: authLogin, isAuthenticated, user } = useAuth();

  useEffect(() => {
    setLicenseCode(getLicenseCode());
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'courier') {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!licenseCode.trim()) {
        setError('Lisenziya kodu tələb olunur');
        setLoading(false);
        return;
      }
      const data = await login(email, password, licenseCode);
      if (data.user.role !== 'courier') {
        setError('Bu panel yalnız kuryerlər üçündür. Admin panelindən daxil olun.');
        setLoading(false);
        return;
      }
      setLicenseCode(licenseCode.trim());
      authLogin(data.user, data.token);
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Giriş uğursuz oldu'
      );
      setLoading(false);
    }
  };

  return (
    <div className={`login-page ${isDarkMode ? 'login-page--dark' : ''}`}>
      <div className="login-page__blob login-page__blob--tl" aria-hidden />
      <div className="login-page__blob login-page__blob--br" aria-hidden />

      <button
        type="button"
        className="login-theme-toggle"
        onClick={() => setIsDarkMode(!isDarkMode)}
        aria-label="Tema dəyiş"
      >
        {isDarkMode ? '☀️' : '🌙'}
      </button>

      <div className="login-inner">
        <div className="login-brand">
          <div style={{ marginBottom: '15px', fontSize: 'clamp(2rem, 10vw, 3rem)' }}>🚚</div>
          <h1 className="login-brand__title">SuMan</h1>
          <p className="login-brand__subtitle">Kuryer Paneli</p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'linear-gradient(45deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2))',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '20px',
              fontSize: '12px',
              color: '#fbbf24',
              fontWeight: '600',
            }}
          >
            ⭐ Sürətli Çatdırılma
          </div>
        </div>

        <div className="login-form-wrap">
          <h2 className="login-form__title">🔐 Hesaba daxil olun</h2>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <input
                type="text"
                className="login-input"
                placeholder="Lisenziya kodu"
                value={licenseCode}
                onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
                autoComplete="off"
                style={{ letterSpacing: '0.04em' }}
                required
              />
              <span className="login-field__icon">🏢</span>
            </div>

            <div className="login-field">
              <input
                type="email"
                className="login-input"
                placeholder="kuryer@suman.az"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="login-field__icon">👤</span>
            </div>

            <div className="login-field">
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Şifrə"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="login-field__icon">🔒</span>
              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-submit" disabled={loading || success}>
              {loading ? '⏳ Gözləyin...' : success ? '✓ Uğurlu!' : 'Daxil ol'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginTop: '16px' }}>
            Təhlükəsiz giriş sistemi
          </p>
        </div>

        <p className="login-footer">Powered by KhamsaCraft | SuMan © 2025</p>
      </div>
    </div>
  );
};

export default LoginPage;