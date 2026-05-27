'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAuth } from '@/context/AuthContext';
import { getNotifications, registerPushDeviceToken } from '@/lib/api';
import { asArray } from '@/lib/safeData';
import type { Notification } from '@/lib/types';

const CHANNEL_ID = 'courier_orders';
const POLL_MS = 25_000;
const ANDROID_PUSH_DELAY_MS = 5000;

async function ensureAndroidChannel() {
  if (Capacitor.getPlatform() !== 'android') return;
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Yeni sifarişlər',
    description: 'Admin tərəfindən təyin olunan sifarişlər',
    importance: 5,
    visibility: 1,
    sound: 'default',
    vibration: true,
  });
}

async function showBanner(title: string, body: string, orderId?: number) {
  const notification: LocalNotificationSchema = {
    id: Math.floor(Date.now() % 200000) + 1,
    title,
    body,
    channelId: CHANNEL_ID,
    largeBody: body,
    summaryText: 'SuMan Kuryer',
    extra: orderId ? { orderId: String(orderId) } : undefined,
  };

  if (Capacitor.getPlatform() === 'android') {
    notification.channelId = CHANNEL_ID;
  }

  await LocalNotifications.schedule({ notifications: [notification] });
}

export default function CourierPushNotifications() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const knownIds = useRef(new Set<number>());
  const bootstrapped = useRef(false);

  useEffect(() => {
    const role = (user?.role || '').toString().toLowerCase();
    if (!isAuthenticated || role !== 'courier') return;

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let appListener: { remove: () => void } | undefined;
    let delayTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const pollNotifications = async () => {
      try {
        const list = asArray<Notification>(await getNotifications());

        if (!bootstrapped.current) {
          list.forEach((n) => knownIds.current.add(n.id));
          bootstrapped.current = true;
          return;
        }

        for (const n of list) {
          if (n.read || knownIds.current.has(n.id)) continue;
          knownIds.current.add(n.id);

          const isAssign =
            n.type === 'order_assigned' || n.order_id != null;
          if (!isAssign) continue;

          await showBanner('📦 Yeni sifariş təyin edildi', n.message, n.order_id);
        }
      } catch {
        // API hazır deyilsə səssiz keç
      }
    };

    const setup = async () => {
      try {
        await ensureAndroidChannel();

        const localPerm = await LocalNotifications.requestPermissions();
        if (localPerm.display !== 'granted' && Capacitor.isNativePlatform()) {
          return;
        }

        const isAndroid = Capacitor.getPlatform() === 'android';

        if (Capacitor.isNativePlatform() && !isAndroid) {
          await PushNotifications.addListener('registration', async (ev) => {
            if (!ev.value) return;
            try {
              await registerPushDeviceToken(ev.value, Capacitor.getPlatform());
            } catch {
              // server token endpoint yoxdursa polling işləyir
            }
          });

          await PushNotifications.addListener('registrationError', () => {
            // FCM: google-services.json və Firebase Android app lazımdır
          });

          await PushNotifications.addListener('pushNotificationReceived', (n) => {
            const title = n.title || '📦 Yeni sifariş təyin edildi';
            const body = n.body || '';
            const orderId = n.data?.orderId ? Number(n.data.orderId) : undefined;
            void showBanner(title, body, orderId);
          });

          await PushNotifications.addListener('pushNotificationActionPerformed', () => {
            router.push('/dashboard/');
          });

          const pushPerm = await PushNotifications.requestPermissions();
          if (pushPerm.receive === 'granted') {
            await PushNotifications.register();
          }
        }

        await pollNotifications();
        intervalId = setInterval(pollNotifications, POLL_MS);

        appListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) void pollNotifications();
        });
      } catch (err) {
        console.error('Push init failed', err);
      }
    };

    const delay = Capacitor.getPlatform() === 'android' ? ANDROID_PUSH_DELAY_MS : 0;
    delayTimer = setTimeout(() => {
      if (!cancelled) void setup();
    }, delay);

    return () => {
      cancelled = true;
      if (delayTimer) clearTimeout(delayTimer);
      if (intervalId) clearInterval(intervalId);
      appListener?.remove();
      void PushNotifications.removeAllListeners();
    };
  }, [isAuthenticated, user?.role, router]);

  return null;
}
