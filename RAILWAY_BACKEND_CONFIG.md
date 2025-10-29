# Railway Backend Service - Ayarlar

## Settings Tab

**Service Name:** backend

**Root Directory:** backend

**Start Command:**
```
uvicorn server:app --host 0.0.0.0 --port $PORT
```

**Build Command:** (boş bırakın, otomatik algılanacak)

---

## Variables Tab

Aşağıdaki environment variables'ı ekleyin:

```
MONGO_URL=${{MongoDB.MONGODB_URL}}
DB_NAME=bitsleuth_production
JWT_SECRET=bitsleuth-super-secret-key-2024-xezer
WALLET_BTC_ADDRESS=TSmGGiUm7EC77qfa4E6CaSFtn9GT2G5du8
ADMIN_TELEGRAM_ID=6393075876
BLOCKCHAIN_API_BASE=https://blockchain.info
REQUIRED_CONF=3
CORS_ORIGINS=*
TELEGRAM_BOT_TOKEN=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@bit-sleuth.com
```

**NOT:** MongoDB.MONGODB_URL yazmak yerine, dropdown'dan MongoDB servisinizi seçin.

---

## Deploy

Settings ve Variables ekledikten sonra otomatik deploy başlayacak.

Logs'u izleyin, başarılı olursa "✓ Build successful" göreceksiniz.
