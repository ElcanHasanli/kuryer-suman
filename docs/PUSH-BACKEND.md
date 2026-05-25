# Backend komandası — Kuryer push bildirişləri

Bu sənəd **API server** (`damacana-backend-api` və ya production deploy) üçün addımları izah edir.

---

## Məqsəd

Admin sifarişə **kuryer təyin edəndə** (`courier_id` dəyişəndə):

1. `notifications` cədvəlinə qeyd yazılsın.
2. Kuryerin telefonuna push getsin (Firebase quraşdırılıbsa).

Kuryer paneli və admin paneli əlavə kod yazmadan mövcud API ilə işləyir — **məntiq backend-dədir**.

---

## 1. Kodu deploy edin

Repo: `damacana-backend-api`

Yeni / yenilənmiş fayllar:

| Fayl | Vəzifə |
|------|--------|
| `scripts/db-migrate-notifications.js` | DB cədvəlləri |
| `routes/notifications.js` | Bildirişlər + device token |
| `lib/notifyCourier.js` | Assign zamanı bildiriş yaratmaq |
| `lib/pushFcm.js` | Firebase push (opsional) |
| `routes/orders.js` | Assign → bildiriş trigger |
| `server.js` | `/api/notifications` route |

```bash
git pull
npm install
npm run db:migrate:notifications
pm2 restart api   # və ya sizin restart üsulunuz
```

---

## 2. Verilənlər bazası

Migration avtomatik yaradır:

- **`notifications`** — `user_id`, `message`, `read`, `order_id`, `type` (`order_assigned`)
- **`push_device_tokens`** — `user_id`, `platform`, `token`

Əl ilə yoxlama:

```sql
SELECT * FROM notifications ORDER BY id DESC LIMIT 5;
SELECT * FROM push_device_tokens;
```

---

## 3. API endpoint-ləri (kuryer paneli üçün)

| Method | URL | Kim |
|--------|-----|-----|
| GET | `/api/notifications` | Kuryer (JWT) |
| PATCH | `/api/notifications/:id/read` | Kuryer |
| PATCH | `/api/notifications/read-all` | Kuryer |
| POST | `/api/notifications/device-token` | Kuryer — body: `{ "token", "platform": "android" \| "ios" }` |

---

## 4. Assign trigger (vacib)

Bildiriş **avtomatik** yaranır:

- **POST** `/api/orders` — body-də `courier_id` göndərilərsə.
- **PUT** `/api/orders/:id` — `courier_id` yeni təyin / dəyişdirilərsə.

Məntiq (`lib/notifyCourier.js`):

- Kuryer ilk dəfə təyin olunanda və ya başqa kuryerə keçəndə bildiriş yaradılır.
- Eyni kuryerə təkrar PUT göndərilmirsə, təkrar bildiriş getmir.

Sifariş **pending** → **assigned** keçidini PUT-də `courier_id` ilə edin (admin panel bunu göndərməlidir).

---

## 5. CORS (mobil WebView / Capacitor)

`.env` və ya default siyahıda olmalıdır:

```env
CORS_ORIGIN=http://localhost:3000,https://localhost,capacitor://localhost,ionic://localhost
```

---

## 6. Firebase (telefon kilidlidir — tam push)

**Polling olmadan** kilidli ekranda bildiriş üçün:

1. Firebase layihəsi yaradın / mövcud layihəni istifadə edin.
2. Service Account JSON endirin.
3. Server `.env`:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...",...}
```

> Bütün JSON **bir sətirdə**, düzgün escape ilə.

FCM yoxdursa: kuryer tətbiqi **açıq/arxa fonda** polling ilə yenə bildiriş alır; kilidli ekranda yalnız FCM işləyir.

---

## 7. Test (backend)

```bash
# Token ilə (kuryer JWT)
curl -H "Authorization: Bearer KURYER_TOKEN" \
  https://api.suman.khamsacraft.az/api/notifications

# Admin token ilə assign
curl -X PUT https://api.suman.khamsacraft.az/api/orders/123 \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courier_id": 2}'
```

Sonra kuryer `GET /api/notifications`-da yeni sətir görünməlidir.

---

## Problemlər

| Simptom | Həll |
|---------|------|
| 404 `/api/notifications` | Route deploy olunmayıb / restart |
| Bildiriş yoxdur | Migration işləyib? `courier_id` PUT body-də gedir? |
| Push yox, DB-də var | `FIREBASE_SERVICE_ACCOUNT_JSON` yox / token qeydiyyətsiz |
| CORS xətası | `CORS_ORIGIN`-ə `capacitor://localhost` əlavə |

---

**Əlaqə:** Kuryer APK — `docs/PUSH-KURYEER.md` · Admin — `docs/PUSH-ADMIN.md`
