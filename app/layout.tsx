import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import CapacitorInit from '@/components/CapacitorInit';
import './globals.css';

export const metadata: Metadata = {
  title: 'SuMan — Kuryer Paneli',
  description: 'Su çatdırılması kuryer paneli',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png', sizes: '192x192' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/apple-icon.png', type: 'image/png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="az" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <CapacitorInit />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}