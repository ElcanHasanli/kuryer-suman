'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { isAuthenticated, user, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace('/login/');
      return;
    }
    if ((user?.role || '').toString().toLowerCase() === 'courier') {
      router.replace('/dashboard/');
    } else {
      router.replace('/login/');
    }
  }, [isAuthenticated, isReady, user, router]);

  return (
    <div className="courier-loading-page">
      <p>Yönləndirilir...</p>
    </div>
  );
}

