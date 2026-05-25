# Admin panel komandası — Kuryer push bildirişləri

Bu sənəd **admin panel** (`damacana-admin-panel/admin-suman`) üçün. Push **admin tərəfində kod yazılmır** — admin yalnız API-yə düzgün sorğu göndərməlidir; bildirişi backend yaradır.

---

## Məqsəd

Admin sifarişə kuryer seçəndə kuryerin telefonunda **「📦 Yeni sifariş təyin edildi」** bildirişi çıxsın.

---

## Admin panel nə etməlidir?

### Minimum tələb (API)

Sifarişə kuryer təyin edərkən backend-ə **mütləq** göndərin:

```http
PUT /api/orders/{sifarişId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "courier_id": 5
}
```

- `courier_id` — kuryer istifadəçisinin `users.id` (rol: `courier`).
- İlk təyin zamanı backend avtomatik `status: assigned` edə bilər (backend koduna görə).

**Yeni sifariş yaradarkən** kuryer dərhal bilinsin:

```http
POST /api/orders
{
  "customer_id": 12,
  "courier_id": 5,
  "bidons_count": 2,
  "address": "...",
  "price": 10
}
```

---

## UI tövsiyələri (əgər hələ yoxdursa)

Admin dashboard-da sifariş sətirində və ya detalda:

1. **Kuryer seçimi** — dropdown (GET `/api/couriers` və ya `/api/users?role=courier`).
2. **「Kuryer təyin et」** düyməsi → yuxarıdakı `PUT` çağırışı.
3. Uğurlu cavabdan sonra siyahını yeniləyin.
4. (Opsional) Toast: «Kuryerə bildiriş göndərildi».

Push / Firebase admin paneldə **konfiqurasiya olunmur**.

---

## Nə etməməlisiniz?

- Firebase açarı, `google-services.json` — **kuryer mobil** komandasının işidir.
- `notifications` cədvəli — **backend** migration edir.
- Kuryer APK build — **kuryer** komandası.

---

## Backend hazır olmalıdır

Admin assign etməzdən əvvəl backend komandası:

1. `npm run db:migrate:notifications`
2. API restart
3. (İstəyə görə) Firebase server `.env`

Əks halda `PUT` işləyər, amma kuryer bildiriş **almaz**.

Tam siyahı: `docs/PUSH-BACKEND.md`

---

## Test ssenarisi

1. Backend deploy + migration tamamlanıb.
2. Kuryer telefonda **yeni APK** ilə login, bildiriş icazəsi verilib.
3. Admin paneldən Test Kuryerə sifariş assign edin (`courier_id` ilə PUT).
4. ~30 saniyə ərzində kuryer telefonunda bildiriş (tətbiq açıq/arxa fonda).
5. Kuryer panelində **🔔 Bildirişlər** tabında eyni mesaj görünməlidir.

---

## API xətaları

| Cavab | Səbəb |
|-------|--------|
| 404 PUT | Yanlış order id |
| 403 | Admin token / rol |
| 200 amma bildiriş yox | Backend deploy/migration yoxdur və ya `courier_id` body-də yoxdur |

---

**Əlaqə:** Backend — `docs/PUSH-BACKEND.md` · Kuryer APK — `docs/PUSH-KURYEER.md`
