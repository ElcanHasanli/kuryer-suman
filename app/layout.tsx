import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import CapacitorInit from '@/components/CapacitorInit';
import CourierPushNotifications from '@/components/CourierPushNotifications';
import './globals.css';

export const metadata: Metadata = {
  title: 'SuMan — Kuryer Paneli',
  description: 'Su çatdırılması kuryer paneli',
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
          <CourierPushNotifications />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}