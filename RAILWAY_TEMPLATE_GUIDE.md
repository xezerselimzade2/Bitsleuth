# Railway Template Deployment - Tek Tık ile Kurulum

## ✅ Railway Config Dosyaları GitHub'a Yüklendi!

Railway artık otomatik olarak proje yapınızı anlayacak.

---

## 🚀 Railway'de Deployment (ÇOK BASIT)

### Adım 1: Backend Servisi Oluştur

Railway'de:

1. **"+ New" butonuna tıklayın**
2. **"GitHub Repo" seçin**
3. **"xezerselimzade2/Bitsleuth" seçin**
4. Railway otomatik olarak `backend/railway.toml` dosyasını bulacak

**Service oluşturulduktan sonra:**

**Settings sekmesine gidin:**
- **Service Name:** `backend` yazın
- **Root Directory:** `backend` yazın (manuel yazın)

**Variables sekmesine gidin ve ekleyin:**
```
MONGO_URL=${{MongoDB.MONGODB_URL}}
DB_NAME=bitsleuth_production
JWT_SECRET=bitsleuth-secret-key-2024-xezer
WALLET_BTC_ADDRESS=TSmGGiUm7EC77qfa4E6CaSFtn9GT2G5du8
ADMIN_TELEGRAM_ID=6393075876
CORS_ORIGINS=*
BLOCKCHAIN_API_BASE=https://blockchain.info
REQUIRED_CONF=3
```

**ÖNEMLİ:** MONGO_URL için dropdown'dan MongoDB servisinizi seçin!

**Deploy otomatik başlayacak!** ✅

---

### Adım 2: Frontend Servisi Oluştur

Backend deploy olurken:

1. **"+ New" → "GitHub Repo"**
2. **Yine "xezerselimzade2/Bitsleuth" seçin** (yeni servis oluşur)
3. Railway `frontend/railway.toml` dosyasını bulacak

**Service oluşturulduktan sonra:**

**Settings sekmesine gidin:**
- **Service Name:** `frontend` yazın
- **Root Directory:** `frontend` yazın (manuel yazın)

**Variables sekmesine gidin:**
```
REACT_APP_BACKEND_URL=${{backend.RAILWAY_PUBLIC_DOMAIN}}
```

**NOT:** Dropdown'dan backend servisinizi seçin, sonra RAILWAY_PUBLIC_DOMAIN seçin

**Deploy otomatik başlayacak!** ✅

---

### Adım 3: Deployment Durumunu İzle

Her iki servis için:

1. **Deployments sekmesine gidin**
2. **Logs'u izleyin**
3. **"✓ Build successful" mesajını bekleyin**

**Backend için:**
- Python dependencies install olacak (~2 dakika)
- "Application startup complete" yazısını göreceksiniz

**Frontend için:**
- Yarn install (~1 dakika)
- Build (~2 dakika)
- "Accepting connections" yazısını göreceksiniz

---

### Adım 4: Test Et

**Backend testi:**
1. Backend servisinin **Settings → Domains** kısmına gidin
2. Railway Public URL'yi kopyalayın
3. Tarayıcıda açın: `https://your-backend-url.railway.app/docs`
4. FastAPI docs sayfası açılmalı ✅

**Frontend testi:**
1. Frontend servisinin **Settings → Domains** kısmına gidin
2. Railway Public URL'yi açın
3. BitSleuth ana sayfası açılmalı ✅

---

### Adım 5: Custom Domain Bağla (bit-sleuth.com)

Frontend başarıyla çalıştıktan sonra:

1. **Frontend servisinin Settings → Domains**
2. **"Custom Domain" butonuna tıklayın**
3. **Domain girin:** `bit-sleuth.com`
4. **Railway size DNS ayarlarını gösterecek:**

**CNAME Record (Önerilen):**
```
Type: CNAME
Name: www
Value: [Railway'in verdiği değer]
TTL: Auto
```

**A Record (Alternatif):**
```
Type: A
Name: @
Value: [Railway'in verdiği IP]
TTL: Auto
```

5. **Domain sağlayıcınızda (GoDaddy/Namecheap) bu ayarları yapın**
6. **10-30 dakika bekleyin** (DNS propagation)
7. **SSL otomatik aktif olacak** (Let's Encrypt)

---

### Adım 6: CORS Güncelle

Domain bağlandıktan sonra:

1. **Backend Variables'a gidin**
2. **CORS_ORIGINS'i güncelleyin:**
   ```
   CORS_ORIGINS=https://bit-sleuth.com,https://www.bit-sleuth.com
   ```
3. **Save edin** (otomatik redeploy olur)

---

## ✅ Tamamlandı Checklist

Deploy sırası:

- [ ] MongoDB servisi mevcut
- [ ] Backend servisi oluşturuldu
- [ ] Backend Settings: Service Name, Root Directory
- [ ] Backend Variables: MONGO_URL, JWT_SECRET, vb.
- [ ] Backend deploy başarılı (logs kontrol)
- [ ] Frontend servisi oluşturuldu
- [ ] Frontend Settings: Service Name, Root Directory
- [ ] Frontend Variables: REACT_APP_BACKEND_URL
- [ ] Frontend deploy başarılı (logs kontrol)
- [ ] Frontend URL'de site açılıyor
- [ ] Custom domain eklendi (bit-sleuth.com)
- [ ] DNS ayarları yapıldı
- [ ] SSL aktif
- [ ] CORS güncellendi
- [ ] Site bit-sleuth.com'da açılıyor
- [ ] Login/Register test edildi
- [ ] Mining test edildi

---

## 🎯 Hızlı Özet

**Railway'de yapılacaklar:**

1. **Backend:** New → GitHub Repo → Settings (name, root) → Variables → Deploy
2. **Frontend:** New → GitHub Repo → Settings (name, root) → Variables → Deploy
3. **Domain:** Frontend → Domains → Custom Domain → DNS ayarları
4. **CORS:** Backend Variables → CORS_ORIGINS güncelle

**Toplam süre:** 10-15 dakika
**Maliyet:** ÜCRETSİZ (500 saat/ay)

---

## 🆘 Sorun mu var?

**Build hatası:**
- Logs'u kontrol edin
- Root Directory doğru mu?
- Variables eklenmiş mi?

**Frontend backend'e bağlanamıyor:**
- REACT_APP_BACKEND_URL doğru mu?
- Backend çalışıyor mu?
- CORS ayarları doğru mu?

**Domain çalışmıyor:**
- DNS propagation bekleyin (30 dakika)
- DNS ayarları doğru mu?
- SSL için 10-15 dakika bekleyin

---

## 🎉 Başarı!

Her şey çalışırsa:

✅ https://bit-sleuth.com açılacak
✅ Gerçek Bitcoin mining çalışacak
✅ Live BTC price güncellenecek
✅ Admin panel açılacak (admin@bitsleuth.com)
✅ Tüm özellikler aktif

**İyi kazançlar! 🚀💰**
