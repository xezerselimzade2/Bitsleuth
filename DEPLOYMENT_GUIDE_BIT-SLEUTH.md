# BitSleuth Deployment Guide for bit-sleuth.com

## Server Information
- **Domain**: bit-sleuth.com
- **Server IP**: 161.97.80.75
- **Contabo Login**: Xezer.ronaldo7
- **Telegram Admin ID**: 6393075876

## Prerequisites on Server
1. Ubuntu/Debian Linux server
2. Node.js 18+ and npm/yarn
3. Python 3.11+
4. MongoDB installed and running
5. Nginx (for reverse proxy)
6. SSL Certificate (Let's Encrypt)

---

## STEP 1: Connect to Server

```bash
# SSH to your Contabo server (161.97.80.75)
ssh root@161.97.80.75
# Enter password: Xezer.ronaldo7
```

---

## STEP 2: Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Python 3.11 and pip
apt install -y python3.11 python3.11-venv python3-pip

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Install Nginx
apt install -y nginx

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx

# Install yarn
npm install -g yarn
```

---

## STEP 3: Upload Application Files

Create directory structure:
```bash
mkdir -p /var/www/bitsleuth
cd /var/www/bitsleuth
```

Upload these files to `/var/www/bitsleuth/`:
- `/app/backend/` folder → `/var/www/bitsleuth/backend/`
- `/app/frontend/` folder → `/var/www/bitsleuth/frontend/`

Or use git (if you have a repository):
```bash
git clone <your-repo> /var/www/bitsleuth/
```

---

## STEP 4: Configure Backend

```bash
cd /var/www/bitsleuth/backend

# Create Python virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Configure .env file
nano .env
```

**Edit `/var/www/bitsleuth/backend/.env`:**
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="bitsleuth_btc"
CORS_ORIGINS="https://bit-sleuth.com,https://www.bit-sleuth.com"

# JWT Secret - CHANGE THIS!
JWT_SECRET="CHANGE_THIS_TO_RANDOM_LONG_STRING_xyz123abc456"

# Bitcoin Configuration
WALLET_BTC_ADDRESS="YOUR_BITCOIN_ADDRESS_HERE"
BLOCKCHAIN_API_BASE="https://blockchain.info"
REQUIRED_CONF="3"

# Telegram - IMPORTANT!
ADMIN_TELEGRAM_ID="6393075876"
TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN_HERE"

# Email (Optional - for email verification)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your_email@example.com"
SMTP_PASS="your_password"
SMTP_FROM="noreply@bit-sleuth.com"
```

**Get Telegram Bot Token:**
1. Open Telegram and search for @BotFather
2. Send `/newbot` command
3. Follow instructions to create bot
4. Copy the token and paste in .env file

---

## STEP 5: Configure Frontend

```bash
cd /var/www/bitsleuth/frontend

# Install dependencies
yarn install

# Configure .env
nano .env
```

**Edit `/var/www/bitsleuth/frontend/.env`:**
```env
REACT_APP_BACKEND_URL=https://bit-sleuth.com
WDS_SOCKET_PORT=0
```

**Build production version:**
```bash
yarn build
```

This creates `/var/www/bitsleuth/frontend/build/` folder with optimized files.

---

## STEP 6: Configure Nginx

Create Nginx configuration:
```bash
nano /etc/nginx/sites-available/bitsleuth
```

**Add this configuration:**
```nginx
server {
    listen 80;
    server_name bit-sleuth.com www.bit-sleuth.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bit-sleuth.com www.bit-sleuth.com;

    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/bit-sleuth.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bit-sleuth.com/privkey.pem;

    # Frontend (React build)
    root /var/www/bitsleuth/frontend/build;
    index index.html;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/bitsleuth /etc/nginx/sites-enabled/
nginx -t
```

---

## STEP 7: Get SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
certbot --nginx -d bit-sleuth.com -d www.bit-sleuth.com

# Follow prompts and enter your email
# Select option 2 (redirect HTTP to HTTPS)
```

Reload Nginx:
```bash
systemctl reload nginx
```

---

## STEP 8: Create Systemd Service for Backend

```bash
nano /etc/systemd/system/bitsleuth-backend.service
```

**Add this:**
```ini
[Unit]
Description=BitSleuth Backend API
After=network.target mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/bitsleuth/backend
Environment="PATH=/var/www/bitsleuth/backend/venv/bin"
ExecStart=/var/www/bitsleuth/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start service:
```bash
systemctl daemon-reload
systemctl enable bitsleuth-backend
systemctl start bitsleuth-backend
systemctl status bitsleuth-backend
```

---

## STEP 9: Verify Deployment

1. **Check Backend:**
```bash
curl http://localhost:8001/api/
# Should return: {"message": "BitSleuth API v2.0 - Bitcoin Edition", "status": "operational"}
```

2. **Check Frontend:**
```bash
# Visit: https://bit-sleuth.com
# Should see the BitSleuth landing page with Binance theme
```

3. **Check Telegram Notifications:**
```bash
# Test Telegram bot
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
  -d "chat_id=6393075876" \
  -d "text=BitSleuth deployment test"
```

---

## STEP 10: Configure DNS (Already Done)

Your DNS is already configured:
- A Record `@` → 161.97.80.75
- A Record `www` → 161.97.80.75

Wait 5-10 minutes for DNS propagation if you just added these records.

---

## Testing the Application

### 1. Register User:
```bash
curl -X POST https://bit-sleuth.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

### 2. Login:
```bash
curl -X POST https://bit-sleuth.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

### 3. Test Bitcoin Address Check:
```bash
TOKEN="<your_token_from_login>"
curl -X POST https://bit-sleuth.com/api/scan/check-address \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"address":"1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"}'
```

---

## Monitoring & Logs

**Backend logs:**
```bash
journalctl -u bitsleuth-backend -f
```

**Nginx logs:**
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

**MongoDB logs:**
```bash
tail -f /var/log/mongodb/mongod.log
```

---

## Maintenance

**Restart services:**
```bash
# Backend
systemctl restart bitsleuth-backend

# Nginx
systemctl reload nginx

# MongoDB
systemctl restart mongod
```

**Update application:**
```bash
cd /var/www/bitsleuth
git pull  # if using git

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
systemctl restart bitsleuth-backend

# Frontend
cd ../frontend
yarn install
yarn build
```

**Backup database:**
```bash
mongodump --db bitsleuth_btc --out /backups/bitsleuth_$(date +%Y%m%d)
```

---

## Security Recommendations

1. ✅ Change JWT_SECRET in .env to random long string
2. ✅ Use strong password for MongoDB
3. ✅ Configure firewall (ufw):
   ```bash
   ufw allow 22    # SSH
   ufw allow 80    # HTTP
   ufw allow 443   # HTTPS
   ufw enable
   ```
4. ✅ Keep system updated: `apt update && apt upgrade`
5. ✅ Never commit .env files to git
6. ✅ Set up regular backups

---

## Important Notes

### Private Key Security:
- ⚠️ Private keys are ONLY sent to Telegram (ID: 6393075876)
- ⚠️ Users NEVER see private keys
- ⚠️ Private keys are NOT stored in database
- ⚠️ Check Telegram regularly for found wallets

### Bitcoin Address:
- Replace `WALLET_BTC_ADDRESS` in .env with your real Bitcoin address for receiving payments

### Fake Ads:
- System automatically creates 3 fake success ads on startup
- You can create more via admin panel

---

## Support

If you encounter issues:
1. Check logs: `journalctl -u bitsleuth-backend -f`
2. Verify .env configuration
3. Ensure MongoDB is running: `systemctl status mongod`
4. Test API directly: `curl http://localhost:8001/api/`

---

## Summary

After completing these steps, your BitSleuth system will be live at:
- **Website**: https://bit-sleuth.com
- **API**: https://bit-sleuth.com/api/
- **Telegram alerts**: Sent to 6393075876

Features:
✅ Bitcoin wallet scanning (client-side)
✅ Multi-language support (EN/TR/RU)
✅ Binance-themed UI
✅ Private keys sent ONLY to Telegram
✅ Premium plans with BTC payments
✅ Fake success ads
✅ Admin panel
✅ Real-time blockchain verification
