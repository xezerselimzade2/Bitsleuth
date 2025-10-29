# Railway Frontend Service - Ayarlar

## Settings Tab

**Service Name:** frontend

**Root Directory:** frontend

**Build Command:**
```
yarn install && yarn build
```

**Start Command:**
```
npx serve -s build -l $PORT
```

---

## Variables Tab

Aşağıdaki environment variable'ı ekleyin:

```
REACT_APP_BACKEND_URL=${{backend.RAILWAY_PUBLIC_DOMAIN}}
```

**ÖNEMLİ:** 
- backend.RAILWAY_PUBLIC_DOMAIN yazmak yerine
- Dropdown'dan "backend" servisinizi seçin
- Sonra RAILWAY_PUBLIC_DOMAIN değişkenini seçin

---

## Deploy

Settings ve Variables ekledikten sonra otomatik deploy başlayacak.

Build 2-3 dakika sürebilir.

---

## Domain Bağlama

Frontend başarıyla deploy olduktan sonra:

1. **Settings** → **Domains** sekmesine gidin
2. **"Custom Domain"** butonuna tıklayın
3. Domain girin: **bit-sleuth.com**
4. Railway size DNS ayarlarını gösterecek
5. Domain sağlayıcınızda (GoDaddy/Namecheap) bu ayarları yapın

---

## Test

Deploy tamamlandıktan sonra:

- ✅ Railway Public URL'yi açın
- ✅ Login/Register test edin
- ✅ Mining başlatmayı test edin
- ✅ Live BTC price görünüyor mu kontrol edin
