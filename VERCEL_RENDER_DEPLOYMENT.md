# Vercel + Render Deployment - Basit Adımlar

## ✅ Hazır Olan Bilgiler:

- ✅ GitHub Repo: https://github.com/xezerselimzade2/Bitsleuth
- ✅ MongoDB URL: `mongodb+srv://xezerselimzade2_db_user:lwXFVIh3tT0Sbqbb@cluster0.u4yw6po.mongodb.net/bitsleuth_production`
- ✅ Vercel Token: Var
- ✅ Render Hesabı: Var

---

## 🚀 Deployment Planı (10 Dakika):

### 1. Vercel - Frontend (5 dakika)

**Vercel.com'da:**

1. **Dashboard'a gidin**
2. **"Add New..." → "Project"**
3. **"Import Git Repository"**
4. GitHub bağlantısı yoksa:
   - "Install Vercel for GitHub" tıklayın
   - GitHub'da Vercel App'i yükleyin
   - "Bitsleuth" repository'ye erişim verin
5. **"Bitsleuth" repository'yi seçin**

**Project Settings:**
```
Framework Preset: Create React App
Root Directory: frontend
Build Command: yarn install && yarn build
Output Directory: build
Install Command: yarn install
```

**Environment Variables:**
```
REACT_APP_BACKEND_URL=https://bitsleuth-backend.onrender.com
```
*(Backend URL'yi daha sonra güncelleyin)*

**"Deploy" basın!** (~3 dakika)

---

### 2. Render - Backend (5 dakika)

**Render.com'da:**

1. **"New +" → "Web Service"**
2. **GitHub bağlantısı yoksa:**
   - "Connect GitHub" tıklayın
   - "Bitsleuth" repo'ya erişim verin
3. **"Bitsleuth" repository seçin**

**Settings:**
```
Name: bitsleuth-backend
Region: Frankfurt
Branch: main
Root Directory: backend
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: uvicorn server:app --host 0.0.0.0 --port $PORT
Plan: Free
```

**Environment Variables:**
```
MONGO_URL=mongodb+srv://xezerselimzade2_db_user:lwXFVIh3tT0Sbqbb@cluster0.u4yw6po.mongodb.net/bitsleuth_production
DB_NAME=bitsleuth_production
JWT_SECRET=bitsleuth-jwt-secret-xezer-2024
WALLET_BTC_ADDRESS=TSmGGiUm7EC77qfa4E6CaSFtn9GT2G5du8
ADMIN_TELEGRAM_ID=6393075876
CORS_ORIGINS=*
BLOCKCHAIN_API_BASE=https://blockchain.info
REQUIRED_CONF=3
```

**"Create Web Service" basın!** (~5 dakika)

---

### 3. Backend URL Güncelleme

Backend deploy olduktan sonra:

1. **Render'da backend servisinin URL'sini kopyalayın**
   - Örnek: `https://bitsleuth-backend.onrender.com`

2. **Vercel'de frontend projesine gidin**
   - **Settings → Environment Variables**
   - **REACT_APP_BACKEND_URL'yi güncelleyin**
   - **Redeploy edin** (Deployments → ... → Redeploy)

---

### 4. Domain Bağlama (bit-sleuth.com)

**Vercel'de (Frontend için):**

1. **Project Settings → Domains**
2. **"Add Domain":** `bit-sleuth.com`
3. **DNS ayarları yapın:**
   - Domain sağlayıcınızda (GoDaddy/Namecheap)
   - A Record: @ → Vercel IP (76.76.21.21)
   - CNAME: www → cname.vercel-dns.com

**CORS Güncelleme (Backend'de):**

Backend deploy olduktan sonra:
- Render'da backend Environment Variables
- `CORS_ORIGINS=https://bit-sleuth.com,https://www.bit-sleuth.com`
- Redeploy

---

## 📋 Deployment Checklist

- [ ] Vercel'de GitHub App kuruldu
- [ ] Vercel'de frontend projesi oluşturuldu
- [ ] Frontend deploy başarılı
- [ ] Render'da backend servisi oluşturuldu
- [ ] Backend environment variables eklendi
- [ ] Backend deploy başarılı
- [ ] Frontend'de backend URL güncellendi
- [ ] Frontend redeploy edildi
- [ ] Site çalışıyor (test edin)
- [ ] Custom domain eklendi
- [ ] DNS ayarları yapıldı
- [ ] CORS güncellendi

---

## 🎯 Sonuç:

**Frontend:** Vercel (ücretsiz, çok hızlı)
**Backend:** Render (ücretsiz)
**Database:** MongoDB Atlas (ücretsiz)

**Toplam Maliyet:** $0/ay
**Toplam Süre:** 10-15 dakika

---

## 🆘 Yardım:

Hangi adımda takılırsanız söyleyin!

**Önemli:** Her iki platformda da GitHub App kurmanız gerekiyor (tek tık).
