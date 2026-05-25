# Kuryer mobil komandası — Push bildirişlər (APK)

Bu sənəd **kuryer paneli** (`courier-suman`) və APK qurulumu üçündür.

---

## Məqsəd

Admin sifariş assign edəndə kuryer telefonunda **böyük başlıq** ilə sistem bildirişi:

**📦 Yeni sifariş təyin edildi**  
`Müştəri adı — ünvan`

---

## Əvvəl backend hazır olmalıdır

Backend komandası bunları bitirməlidir:

- `npm run db:migrate:notifications`
- API restart, `/api/notifications` işlək
- Assign zamanı bildiriş yaradılır

Yoxlama: `docs/PUSH-BACKEND.md`

---

## 1. Kod artıq layihədədir

| Fayl | Vəzifə |
|------|--------|
| `components/CourierPushNotifications.tsx` | Polling + lokal/push bildiriş |
| `lib/api.ts` | `registerPushDeviceToken`, `getNotifications` |
| `android/.../AndroidManifest.xml` | `POST_NOTIFICATIONS` icazəsi |

`git pull` → `npm install`

---

## 2. Yeni APK qurun

```bash
cd courier-suman
npm run mobile:sync
npm run mobile:apk:debug
```

APK:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Telefonda **köhnə APK-nı silin** → yenisini quraşdırın.

---

## 3. İlk açılış (kuryer)

1. APK açın → login.
2. **Bildirişlərə icazə ver** (Android 13+ soruşacaq).
3. İnternet aktiv olsun (`https://api.suman.khamsacraft.az`).

---

## 4. İki rejim

| Rejim | Nə vaxt | Tələb |
|-------|---------|--------|
| **Polling + lokal bildiriş** | Tətbiq açıq və ya arxa fonda | Yalnız backend + yeni APK |
| **FCM (kilidli ekran)** | Telefon kilidlidir | Firebase + `google-services.json` |

### A) Polling (minimum)

Backend deploy kifayətdir. Tətbiq ~25 saniyədə bir yoxlayır; yeni assign → tray bildirişi.

### B) Tam push — FCM

1. Firebase Console → Android app: `az.khamsacraft.suman.courier`
2. `google-services.json` → `android/app/google-services.json`
3. Backend `.env` → `FIREBASE_SERVICE_ACCOUNT_JSON=...` (backend komandası)
4. `npm run mobile:sync` + yenidən APK

---

## 5. Test

1. Kuryer APK login.
2. Admin assign etsin (eyni kuryerə).
3. Bildiriş gəlməlidir; paneldə **🔔 Bildirişlər** tabında da görünür.
4. Bildirişə toxunanda dashboard açılır.

---

## Xcode (iOS)

```bash
npm run mobile:ios
```

Push üçün: Signing → **Push Notifications** + Firebase APNs (backend + Firebase komandası).

---

## Problemlər

| Simptom | Həll |
|---------|------|
| Bildiriş yox | Backend migration? Admin `courier_id` göndərir? |
| Load failed login | `npm run mobile:sync`, production API |
| İcazə vermədim | Parametrlər → Tətbiqlər → SuMan → Bildirişlər |
| Yalnız paneldə var, tray yox | Tətbiq arxa fonda deyil; FCM quraşdırın |

---

**Əlaqə:** Backend — `docs/PUSH-BACKEND.md` · Admin — `docs/PUSH-ADMIN.md` · Ümumi — `PUSH.md`
