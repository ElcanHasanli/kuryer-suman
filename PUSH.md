# Kuryer push bildirişləri — ümumi baxış

Admin kuryer təyin edəndə kuryer telefonunda bildiriş.

## Komanda üzrə təlimatlar

| Komanda | Sənəd |
|---------|--------|
| **Backend (API)** | [docs/PUSH-BACKEND.md](docs/PUSH-BACKEND.md) |
| **Admin panel** | [docs/PUSH-ADMIN.md](docs/PUSH-ADMIN.md) |
| **Kuryer mobil (APK)** | [docs/PUSH-KURYEER.md](docs/PUSH-KURYEER.md) |

## Qısa ardıcıllıq

1. **Backend** — migration + deploy + (istəyə görə) Firebase `.env`
2. **Admin** — assign edərkən `courier_id` ilə `PUT /api/orders/:id`
3. **Kuryer** — `npm run mobile:sync` + yeni APK + bildiriş icazəsi

## Texniki axın

```
Admin PUT courier_id → Backend notifications + FCM
                              ↓
                    Kuryer APK (poll / push) → ekran bildirişi
```
