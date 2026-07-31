# 떡방 (Tteok Shop) — Mobile REST API v1

Base URL: `https://<host>/api/v1`

Mobil ilovalar (iOS/Android/React Native/Flutter) uchun mo'ljallangan stateless REST API.
Web saytdan farqli o'laroq cookie/sessiya ishlatilmaydi — autentifikatsiya faqat
`Authorization: Bearer <accessToken>` header orqali.

---

## 1. Javob formati (envelope)

Barcha endpointlar bitta konvertda javob qaytaradi:

```jsonc
// Muvaffaqiyat
{ "success": true, "data": { ... } }

// Xatolik
{ "success": false, "error": { "status": 401, "message": "Access token has expired, please refresh!" } }
```

Ro'yxat endpointlari pagination metadata bilan keladi:

```jsonc
{
  "success": true,
  "data": {
    "list": [ ... ],
    "pagination": { "page": 1, "limit": 20, "total": 57, "totalPages": 3, "hasNext": true }
  }
}
```

## 2. Autentifikatsiya oqimi

1. `POST /auth/signup` yoki `POST /auth/login` → `{ member, accessToken, refreshToken }`
2. Har bir himoyalangan so'rovga header qo'shiladi: `Authorization: Bearer <accessToken>`
3. Access token muddati tugasa (`401` + `"Access token has expired..."`):
   `POST /auth/refresh` `{ refreshToken }` → yangi `{ accessToken, refreshToken }`
   **Diqqat:** refresh token bir martalik (rotation) — javobdagi YANGI refreshToken ni saqlang.
4. `POST /auth/logout` `{ refreshToken }` → token bekor qilinadi.

- Access token TTL: **1 soat** (env: `MOBILE_ACCESS_TTL`)
- Refresh token TTL: **30 kun** (env: `MOBILE_REFRESH_DAYS`)
- Bekor qilingan refresh token qayta ishlatilsa, xavfsizlik uchun shu a'zoning **barcha** sessiyalari bekor qilinadi.
- Tokenlarni qurilmaning xavfsiz omborida saqlang (iOS Keychain / Android Keystore).

## 3. Endpointlar

| Metod | Yo'l | Auth | Tavsif |
|---|---|---|---|
| GET | `/health` | — | Server holati (uptime, DB ulanishi) |
| POST | `/auth/signup` | — | Ro'yxatdan o'tish (multipart: `memberImage` ixtiyoriy) |
| POST | `/auth/login` | — | Kirish |
| POST | `/auth/refresh` | — | Token yangilash (rotation) |
| POST | `/auth/logout` | — | Refresh tokenni bekor qilish |
| GET | `/auth/me` | Bearer | Joriy a'zo profili |
| PATCH | `/members/me` | Bearer | Profil yangilash (multipart: `memberImage` ixtiyoriy) |
| GET | `/members/top` | — | Eng ko'p ballli 4 foydalanuvchi |
| GET | `/shop` | — | Do'kon ma'lumotlari |
| GET | `/products` | — | Mahsulotlar (query: `page,limit,order,productCollection,search`) |
| GET | `/products/:id` | ixtiyoriy | Mahsulot detali (token bo'lsa view hisoblanadi) |
| POST | `/products/:id/like` | Bearer | Like (1 foydalanuvchi = 1 like, idempotent) |
| POST | `/orders` | Bearer | Buyurtma yaratish |
| GET | `/orders` | Bearer | Buyurtmalarim (query: `page,limit,orderStatus`) |
| PATCH | `/orders/:id/cancel` | Bearer | Bekor qilish (faqat `PAUSE` — to'lanmagan) |
| POST | `/payments/kakao/ready` | Bearer | KakaoPay boshlash |
| POST | `/payments/samsung/ready` | Bearer | Samsung Pay boshlash |
| POST | `/payments/apple/ready` | Bearer | Apple Pay boshlash |
| POST | `/payments/credit/ready` | Bearer | Karta to'lovi boshlash |
| POST | `/payments/confirm` | Bearer | To'lovni tasdiqlash |
| POST | `/payments/refund` | Bearer | To'lovni qaytarish (faqat `PROCESS` order) |
| POST | `/inquiries` | — | Murojaat yuborish (rate-limit: 5 ta/soat) |

## 4. So'rov namunalari

### Signup
```
POST /api/v1/auth/signup
Content-Type: application/json

{ "memberNick": "ali", "memberPhone": "01012345678", "memberPassword": "secret123" }
```

### Buyurtma yaratish
```
POST /api/v1/orders
Authorization: Bearer <accessToken>

{ "items": [ { "productId": "665f...", "itemQuantity": 2 } ] }
```
(`items` o'rniga to'g'ridan-to'g'ri massiv yuborish ham mumkin.)

Javob: `orderTotal` (KRW, yetkazib berish bilan), `orderDelivery`
(30 000 ₩ dan yuqori buyurtmalarga bepul, aks holda 3 000 ₩), `orderStatus: "PAUSE"`.

### KakaoPay to'lov oqimi (mobil)
1. `POST /payments/kakao/ready` `{ "orderId": "...", "amount": <orderTotal> }`
   → `{ nextRedirectMobileUrl, tid }`
2. Ilova `nextRedirectMobileUrl` ni WebView da ochadi, foydalanuvchi to'laydi.
3. Kakao redirect URL idan `pg_token` ni oling (WebView URL kuzatuvi orqali).
4. `POST /payments/confirm` `{ "transactionId": "<tid>", "pgToken": "<pg_token>" }`
   → to'lov `SUCCESS`, order `PROCESS`, foydalanuvchiga 1 ball.

### Rasm yo'llari
API javoblaridagi `memberImage` / `productImages` nisbiy yo'l (`uploads/...`).
To'liq URL: `https://<host>/` + yo'l.

## 5. Xato kodlari

| Status | Ma'nosi |
|---|---|
| 400 | Validatsiya/biznes xatosi (xabar `error.message` da) |
| 401 | Token yo'q / yaroqsiz / muddati tugagan (`TOKEN_EXPIRED` bo'lsa refresh qiling) |
| 403 | Bloklangan foydalanuvchi |
| 404 | Topilmadi (noma'lum endpoint ham JSON 404 qaytaradi) |
| 429 | Juda ko'p so'rov (`Retry-After` headeriga qarang) |
| 500 | Ichki xato (batafsil ma'lumot berilmaydi) |

## 6. Muhit o'zgaruvchilari

| Env | Default | Tavsif |
|---|---|---|
| `MOBILE_ACCESS_TTL` | `1h` | Access token muddati (jwt formatida: `15m`, `1h`, `24h`) |
| `MOBILE_REFRESH_DAYS` | `30` | Refresh token muddati (kun) |
| `ENABLE_PAYMENTS` | — | `true` bo'lmasa barcha payment endpointlari 400 qaytaradi |
