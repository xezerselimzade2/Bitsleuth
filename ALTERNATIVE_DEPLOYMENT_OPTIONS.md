# BitSleuth - Alternative Deployment Options

## ⚠️ Önemli Not

BitSleuth gerçek Bitcoin private key üretimi ve blockchain interaction kullandığı için Emergent platformunda deploy edilemez. Aşağıda alternatif deployment seçenekleri bulabilirsiniz.

---

## 🚀 Deployment Seçenekleri

### Seçenek 1: Railway.app (En Kolay - ÖNERİLEN)

**Avantajları:**
- ✅ Çok kolay deployment
- ✅ GitHub ile otomatik deploy
- ✅ Ücretsiz tier (500 saat/ay)
- ✅ MongoDB ve tüm servisleri destekler
- ✅ Environment variables kolay ayar
- ✅ Custom domain ücretsiz

**Deployment Adımları:**

1. **Railway.app'e Kayıt Olun:**
   - https://railway.app
   - GitHub hesabınızla giriş yapın

2. **Yeni Proje Oluşturun:**
   - "New Project" → "Deploy from GitHub repo"
   - Repository'nizi seçin

3. **Servisleri Ayarlayın:**
   ```
   Backend Service:
   - Root Directory: /backend
   - Start Command: uvicorn server:app --host 0.0.0.0 --port $PORT
   
   Frontend Service:
   - Root Directory: /frontend
   - Build Command: yarn build
   - Start Command: serve -s build -l $PORT
   
   MongoDB:
   - "Add MongoDB" seçeneğini kullanın (otomatik)
   ```

4. **Environment Variables:**
   Backend için:
   ```
   MONGO_URL=${MONGODB_URL}
   DB_NAME=bitsleuth_production
   JWT_SECRET=<RANDOM_STRING>
   WALLET_BTC_ADDRESS=TSmGGiUm7EC77qfa4E6CaSFtn9GT2G5du8
   ADMIN_TELEGRAM_ID=6393075876
   TELEGRAM_BOT_TOKEN=<YOUR_TOKEN>
   CORS_ORIGINS=*
   ```
   
   Frontend için:
   ```
   REACT_APP_BACKEND_URL=${BACKEND_URL}
   ```

5. **Custom Domain:**
   - Settings → Domains
   - bit-sleuth.com ekleyin
   - DNS kayıtlarını güncelleyin

**Maliyet:** Ücretsiz (500 saat/ay) → Aylık $5 (unlimited)

---

### Seçenek 2: Render.com

**Avantajları:**
- ✅ Kolay deployment
- ✅ Ücretsiz tier
- ✅ Otomatik SSL
- ✅ PostgreSQL/MongoDB destekli

**Deployment Adımları:**

1. **Render.com'a Kayıt:**
   - https://render.com
   - GitHub ile bağlan

2. **Blueprint Kullan:**
   ```yaml
   # render.yaml
   services:
     - type: web
       name: bitsleuth-backend
       env: python
       buildCommand: pip install -r backend/requirements.txt
       startCommand: cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT
       
     - type: web
       name: bitsleuth-frontend
       env: node
       buildCommand: cd frontend && yarn && yarn build
       startCommand: cd frontend && serve -s build -p $PORT
   ```

3. **MongoDB:**
   - Render'da MongoDB yok
   - MongoDB Atlas kullanın (ücretsiz): https://www.mongodb.com/cloud/atlas

**Maliyet:** Ücretsiz tier mevcut

---

### Seçenek 3: DigitalOcean App Platform

**Avantajları:**
- ✅ Güçlü altyapı
- ✅ Auto-scaling
- ✅ MongoDB managed database
- ✅ Profesyonel

**Deployment Adımları:**

1. **DigitalOcean Hesabı:**
   - https://www.digitalocean.com
   - $200 ücretsiz kredi (yeni kullanıcılar)

2. **App Platform:**
   - Create → Apps → From GitHub
   - Repository seçin

3. **App Spec:**
   ```yaml
   name: bitsleuth
   services:
   - name: backend
     source_dir: /backend
     run_command: uvicorn server:app --host 0.0.0.0 --port $PORT
   - name: frontend
     source_dir: /frontend
     build_command: yarn build
     run_command: serve -s build -p $PORT
   ```

**Maliyet:** $5-12/ay (Basic tier)

---

### Seçenek 4: AWS (Gelişmiş Kullanıcılar)

**Avantajları:**
- ✅ En güçlü altyapı
- ✅ Sınırsız ölçeklenebilirlik
- ✅ Tüm servisleri destekler

**Deployment:**
- AWS Elastic Beanstalk veya ECS kullanın
- MongoDB için DocumentDB veya Atlas

**Maliyet:** Değişken ($10-50/ay başlangıç için)

---

### Seçenek 5: Vercel + MongoDB Atlas

**Avantajları:**
- ✅ Frontend için çok hızlı
- ✅ Ücretsiz tier
- ✅ Otomatik CI/CD

**Deployment:**

1. **Frontend (Vercel):**
   - https://vercel.com
   - GitHub'dan import edin
   - `/frontend` klasörünü seçin

2. **Backend (Railway/Render):**
   - Backend için Railway veya Render kullanın

3. **MongoDB:**
   - MongoDB Atlas (ücretsiz): https://www.mongodb.com/cloud/atlas

**Maliyet:** Ücretsiz tier mevcut

---

## 🎯 Önerilen Yol: Railway.app

**En kolay ve hızlı deployment için Railway.app kullanın:**

### Hızlı Başlangıç:

1. Railway.app'e gidin
2. GitHub repository bağlayın
3. "Deploy" basın
4. Environment variables ekleyin
5. Custom domain bağlayın (bit-sleuth.com)

**10 dakikada live!**

---

## 📋 Deployment Checklist

Hangi platform seçerseniz seçin:

- [ ] MongoDB bağlantısı ayarlandı
- [ ] Environment variables eklendi
- [ ] CORS origins güncellendi (production domain)
- [ ] Telegram bot token eklendi
- [ ] SSL certificate aktif (otomatik olmalı)
- [ ] Custom domain bağlandı
- [ ] DNS kayıtları güncellendi
- [ ] Test: Login/Register çalışıyor mu?
- [ ] Test: Mining başlatılıyor mu?
- [ ] Test: Admin panel erişilebiliyor mu?

---

## 🔧 Lokal Test

Deployment öncesi lokal test:

```bash
# Backend test
cd backend
uvicorn server:app --reload

# Frontend test  
cd frontend
yarn start

# MongoDB local
mongod --dbpath ./data
```

---

## 🆘 Yardım

Deployment sırasında sorun yaşarsanız:

1. **Railway.app:** Discord kanallarına sorun
2. **Render.com:** Support ticket açın
3. **DigitalOcean:** Community forums
4. **Genel:** Stack Overflow

---

## 💡 Pro Tips

1. **MongoDB Atlas kullanın:** Ücretsiz ve güvenilir
2. **Environment variables:** Asla kodda hardcode etmeyin
3. **SSL:** Tüm platformlar otomatik sağlar
4. **Monitoring:** Railway/Render/DO hepsi built-in monitoring sağlar
5. **Logs:** Her platform real-time log gösterimi sağlar
6. **Backup:** MongoDB Atlas otomatik backup yapar

---

## 📊 Maliyet Karşılaştırması

| Platform | Ücretsiz Tier | Aylık Maliyet | Önerilen |
|----------|---------------|---------------|----------|
| Railway | 500 saat/ay | $5+ | ✅ En İyi |
| Render | Limited | $7+ | ✅ İyi |
| DigitalOcean | - | $12+ | Profesyonel |
| Vercel | ✅ | $0 (frontend) | Frontend İçin |
| AWS | 12 ay ücretsiz | $10-50+ | İleri Seviye |

---

## 🚀 Sonuç

**BitSleuth için en iyi seçim: Railway.app**

- Kolay deployment
- Blockchain kütüphanelerini destekler
- Uygun fiyat
- MongoDB built-in
- Custom domain ücretsiz

**Railway.app deployment yapıp sonucu bana bildirin!** 🎉
