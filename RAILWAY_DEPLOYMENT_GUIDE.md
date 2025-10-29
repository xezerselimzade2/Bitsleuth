# Railway.app Deployment Guide - BitSleuth

## 🎯 Railway.app ile Ücretsiz Deployment (Adım Adım)

### 1. Railway Hesabı Oluşturun

1. **Railway.app'e gidin:** https://railway.app
2. **"Start a New Project" butonuna tıklayın**
3. **GitHub ile giriş yapın** (önerilir) veya Email ile kayıt olun
4. Hesabınız oluşturulacak - **ÜCRETSİZ 500 saat/ay**

---

### 2. Proje Oluşturma

Railway dashboard'da:

1. **"New Project" butonuna tıklayın**
2. **"Empty Project" seçin**
3. Proje adı: `bitsleuth` (veya istediğiniz isim)

---

### 3. GitHub Repository Bağlama

İki seçenek var:

#### Seçenek A: GitHub Repo Oluştur (Önerilir)

1. **GitHub.com'a gidin**
2. **Yeni repository oluşturun:**
   - İsim: `bitsleuth`
   - Public
   - README eklemeyin
3. **Emergent'tan kodu GitHub'a yükleyin:**
   - Emergent chat input'unun yanında "Save to GitHub" butonu kullanın
   - Veya manuel git push yapın

4. **Railway'de:**
   - "New Service" → "GitHub Repo"
   - Repository'nizi seçin
   - Deploy otomatik başlayacak

#### Seçenek B: Direkt Dosya Yükleme

1. **BitSleuth kodunu ZIP olarak indirin**
2. **Railway'de:**
   - "Deploy from ZIP" seçeneğini kullanın (varsa)
   - Veya GitHub repo oluşturmak zorunlu

---

### 4. MongoDB Ekleme

Railway projenizde:

1. **"New" butonuna tıklayın**
2. **"Database" → "Add MongoDB" seçin**
3. MongoDB otomatik oluşturulacak
4. MongoDB connection string otomatik environment variable olarak eklenecek: `MONGODB_URL`

---

### 5. Backend Service Ayarları

Backend servisiniz için:

1. **Settings** sekmesine gidin
2. **Root Directory:** `/backend` olarak ayarlayın
3. **Start Command:** 
   ```
   uvicorn server:app --host 0.0.0.0 --port $PORT
   ```
4. **Environment Variables** ekleyin:
   ```
   MONGO_URL=${{MongoDB.MONGODB_URL}}
   DB_NAME=bitsleuth_production
   JWT_SECRET=your-super-secret-random-string-here-change-this
   WALLET_BTC_ADDRESS=TSmGGiUm7EC77qfa4E6CaSFtn9GT2G5du8
   ADMIN_TELEGRAM_ID=6393075876
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   BLOCKCHAIN_API_BASE=https://blockchain.info
   REQUIRED_CONF=3
   CORS_ORIGINS=*
   ```

5. **Deploy** butonuna basın

---

### 6. Frontend Service Ayarları

Frontend servisiniz için:

1. **"New Service" → "GitHub Repo"** (aynı repo, farklı servis)
2. **Settings** sekmesinde:
   - **Root Directory:** `/frontend`
   - **Build Command:** 
     ```
     yarn install && yarn build
     ```
   - **Start Command:** 
     ```
     yarn global add serve && serve -s build -l $PORT
     ```
3. **Environment Variables:**
   ```
   REACT_APP_BACKEND_URL=${{Backend.RAILWAY_PUBLIC_DOMAIN}}
   ```
4. **Deploy** butonuna basın

---

### 7. Custom Domain (bit-sleuth.com) Bağlama

#### A. Railway'de Domain Ayarları:

1. **Frontend servisinizin Settings'ine gidin**
2. **"Domains" sekmesine tıklayın**
3. **"Custom Domain" butonuna tıklayın**
4. **Domain girin:** `bit-sleuth.com` veya `www.bit-sleuth.com`
5. Railway size DNS kayıtlarını gösterecek

#### B. Domain Sağlayıcınızda (GoDaddy/Namecheap vb.):

Railway'in gösterdiği DNS kayıtlarını ekleyin:

**CNAME Record için:**
```
Type: CNAME
Name: www (veya @)
Value: [Railway tarafından verilen value]
TTL: Auto
```

**Veya A Record için:**
```
Type: A
Name: @
Value: [Railway tarafından verilen IP]
TTL: Auto
```

#### C. SSL Certificate:

- Railway otomatik SSL sertifikası sağlar (Let's Encrypt)
- 10-15 dakika içinde aktif olur
- HTTPS otomatik çalışır

---

### 8. CORS Güncelleme (Önemli!)

Domain bağlandıktan sonra:

1. **Backend environment variables'a gidin**
2. **CORS_ORIGINS'i güncelleyin:**
   ```
   CORS_ORIGINS=https://bit-sleuth.com,https://www.bit-sleuth.com
   ```
3. **Redeploy edin**

---

## 🎯 Hızlı Başlangıç Özeti

### Minimum Adımlar:

1. ✅ Railway.app'e kayıt ol (ücretsiz)
2. ✅ "New Project" oluştur
3. ✅ MongoDB ekle
4. ✅ GitHub repo bağla veya ZIP yükle
5. ✅ Backend service ayarla (/backend, environment variables)
6. ✅ Frontend service ayarla (/frontend, REACT_APP_BACKEND_URL)
7. ✅ Custom domain bağla (bit-sleuth.com)
8. ✅ DNS kayıtlarını güncelle

**Toplam Süre:** 15-20 dakika

---

## 💰 Maliyet

### Ücretsiz Tier:
- **500 saat/ay ücretsiz**
- **$5 başlangıç kredisi**
- BitSleuth için yeterli (küçük-orta trafik)

### Aylık Maliyet (Tahmin):
- Ücretsiz tier: **$0/ay** (500 saat yeterli)
- Eğer 500 saati geçerseniz: **~$5/ay**

---

## 🔧 Yararlı Railway Komutları

Eğer lokal Railway CLI kullanmak isterseniz:

```bash
# Login (browser açar)
railway login

# Proje bağla
railway link

# Environment variables göster
railway variables

# Logs izle
railway logs

# Deploy
railway up
```

---

## 🆘 Sorun Giderme

### Build Hatası:

1. **Backend build hatası:**
   - requirements.txt'nin doğru olduğundan emin olun
   - Python versiyonu: 3.9+ olmalı
   - Logs'u kontrol edin

2. **Frontend build hatası:**
   - package.json'ın doğru olduğundan emin olun
   - Node versiyonu: 18+ olmalı
   - `yarn.lock` dosyası mevcut mu?

### Domain Çalışmıyor:

1. **DNS propagation bekleyin:** 5-30 dakika
2. **DNS kontrol:** `nslookup bit-sleuth.com`
3. **CNAME vs A record:** Railway'in önerisine uyun
4. **SSL bekleyin:** 10-15 dakika

### CORS Hatası:

1. Backend environment variables'da `CORS_ORIGINS` güncelleyin
2. Redeploy edin
3. Cache temizleyin (Ctrl+Shift+R)

---

## 📞 Yardım

**Railway Support:**
- Discord: https://discord.gg/railway
- Docs: https://docs.railway.app
- Email: team@railway.app

**BitSleuth Deployment Yardımı:**
- Bu dosya: `/app/RAILWAY_DEPLOYMENT_GUIDE.md`
- Alternative options: `/app/ALTERNATIVE_DEPLOYMENT_OPTIONS.md`

---

## ✅ Deployment Checklist

Deploy öncesi kontrol:

- [ ] Railway hesabı oluşturuldu
- [ ] GitHub repo hazır (veya ZIP)
- [ ] MongoDB eklendi
- [ ] Backend environment variables ayarlandı
- [ ] Frontend REACT_APP_BACKEND_URL ayarlandı
- [ ] Her iki servis de deploy edildi
- [ ] Custom domain eklendi
- [ ] DNS kayıtları güncellendi
- [ ] SSL aktif
- [ ] Site açılıyor ve çalışıyor

**Deploy sonrası test:**

- [ ] Login/Register çalışıyor
- [ ] Mining başlatılabiliyor
- [ ] Admin panel erişilebiliyor (admin@bitsleuth.com)
- [ ] Live BTC price görünüyor
- [ ] Statistics doğru
- [ ] FAQ/Footer görünüyor

---

## 🚀 Başarılı Deployment Sonrası

Site live olduktan sonra:

1. **Google Search Console:**
   - https://search.google.com/search-console
   - Domain ekle: bit-sleuth.com
   - Sitemap gönder: https://bit-sleuth.com/sitemap.xml

2. **Monitoring:**
   - Railway otomatik monitoring sağlar
   - Logs'u düzenli kontrol edin

3. **Backup:**
   - MongoDB Atlas backup (önerilir)
   - Kod GitHub'da yedekli

4. **Updates:**
   - GitHub'a push yapınca otomatik deploy olur
   - Veya Railway dashboard'dan manuel deploy

---

## 🎉 Tebrikler!

BitSleuth artık **bit-sleuth.com** üzerinde canlı!

**Özellikler:**
- ✅ Gerçek Bitcoin mining
- ✅ Live BTC price
- ✅ Professional Binance-style design
- ✅ Admin panel
- ✅ Multi-language
- ✅ SEO optimized
- ✅ HTTPS secure
- ✅ Custom domain

**İyi kazançlar! 🚀💰**
