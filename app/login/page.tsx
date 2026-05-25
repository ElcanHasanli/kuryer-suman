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

  const getContainerStyle = () => ({
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: '100vh',
    background: isDarkMode
      ? 'linear-gradient(135deg, #1f2937, #111827)'
      : 'linear-gradient(135deg, #10b981, #059669)',
    overflow: 'hidden' as const,
    fontFamily: "'Inter', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif",
    color: 'white',
  });

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
    <div style={getContainerStyle()}>
      {/* Animated Background Elements */}
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: isDarkMode
            ? 'radial-gradient(circle at center, rgba(75, 85, 99, 0.3), transparent 70%)'
            : 'radial-gradient(circle at center, rgba(255, 255, 255, 0.1), transparent 70%)',
          borderRadius: '50%',
          top: '-50px',
          left: '-50px',
          filter: 'blur(70px)',
        }}
      ></div>
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: isDarkMode
            ? 'radial-gradient(circle at center, rgba(55, 65, 81, 0.4), transparent 70%)'
            : 'radial-gradient(circle at center, rgba(220, 253, 244, 0.3), transparent 70%)',
          borderRadius: '50%',
          bottom: '-60px',
          right: '-50px',
          filter: 'blur(50px)',
        }}
      ></div>

      {/* Dark Mode Toggle */}
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px',
          background: isDarkMode
            ? 'rgba(55, 65, 81, 0.8)'
            : 'rgba(255, 255, 255, 0.2)',
          border: isDarkMode
            ? '1px solid rgba(75, 85, 99, 0.5)'
            : '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '12px',
          color: 'white',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          zIndex: 1000,
        }}
      >
        {isDarkMode ? '☀️' : '🌙'}
      </button>

      {/* Main Container */}
      <div
        style={{
          position: 'relative',
          maxWidth: '420px',
          width: '90vw',
          margin: '50px auto',
          zIndex: 10,
        }}
      >
        {/* Brand Container */}
        <div
          style={{
            marginBottom: '30px',
            textAlign: 'center',
            background: isDarkMode
              ? 'rgba(55, 65, 81, 0.3)'
              : 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '30px 20px',
            backdropFilter: 'blur(10px)',
            border: isDarkMode
              ? '1px solid rgba(75, 85, 99, 0.3)'
              : '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ marginBottom: '15px', fontSize: '48px' }}>🚚</div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0' }}>
            SuMan
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.8)',
              margin: '8px 0 15px 0',
            }}
          >
            Kuryer Paneli
          </p>
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

        {/* Form Container */}
        <div
          style={{
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            background: isDarkMode
              ? 'rgba(55, 65, 81, 0.3)'
              : 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: isDarkMode
              ? '1px solid rgba(75, 85, 99, 0.3)'
              : '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              position: 'relative',
              padding: '30px 20px',
              zIndex: 2,
            }}
          >
            <h2
              style={{
                marginBottom: '24px',
                fontSize: '20px',
                fontWeight: '600',
                color: 'white',
                textAlign: 'center',
              }}
            >
              🔐 Hesaba daxil olun
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Lisenziya kodu (SUMAN-XXXX-XXXX)"
                  value={licenseCode}
                  onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    borderRadius: '8px',
                    border: isDarkMode
                      ? '1.5px solid rgba(75, 85, 99, 0.5)'
                      : '1.5px solid rgba(255, 255, 255, 0.2)',
                    background: isDarkMode
                      ? 'rgba(55, 65, 81, 0.4)'
                      : 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                    letterSpacing: '0.04em',
                  }}
                  required
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  🏢
                </span>
              </div>

              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <input
                  type="email"
                  placeholder="kuryer@suman.az"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    borderRadius: '8px',
                    border: isDarkMode
                      ? '1.5px solid rgba(75, 85, 99, 0.5)'
                      : '1.5px solid rgba(255, 255, 255, 0.2)',
                    background: isDarkMode
                      ? 'rgba(55, 65, 81, 0.4)'
                      : 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = isDarkMode
                      ? '0 0 0 2px rgba(156, 163, 175, 0.5)'
                      : '0 0 0 2px rgba(167, 243, 208, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  👤
                </span>
              </div>

              {/* Password Input */}
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Şifrə"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 40px',
                    borderRadius: '8px',
                    border: isDarkMode
                      ? '1.5px solid rgba(75, 85, 99, 0.5)'
                      : '1.5px solid rgba(255, 255, 255, 0.2)',
                    background: isDarkMode
                      ? 'rgba(55, 65, 81, 0.4)'
                      : 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = isDarkMode
                      ? '0 0 0 2px rgba(156, 163, 175, 0.5)'
                      : '0 0 0 2px rgba(167, 243, 208, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  🔒
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    fontSize: '18px',
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(220, 38, 38, 0.3)',
                  }}
                >
                  <p style={{ color: '#fca5a5', margin: 0 }}>{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || success}
                style={{
                  width: '100%',
                  padding: '14px',
                  marginTop: '24px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'white',
                  background: isDarkMode
                    ? 'linear-gradient(90deg, #374151 0%, #4b5563 100%)'
                    : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: loading || success ? 'not-allowed' : 'pointer',
                  opacity: loading || success ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => {
                  if (!loading && !success) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && !success) {
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                {loading ? '⏳ Gözləyin...' : success ? '✓ Uğurlu!' : 'Daxil ol'}
              </button>
            </form>

            <p
              style={{
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.9rem',
                marginTop: '16px',
              }}
            >
              Təhlükəsiz giriş sistemi
            </p>
          </div>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '0.75rem',
            marginTop: '30px',
          }}
        >
          Powered by KhamsaCraft | SuMan © 2025
        </p>
      </div>

      <style>{`
        input::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }
      `}</style>
    </div>
  );
};

export default LoginPage;