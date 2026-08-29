# 16 — Home Server Deployment Guide (Non-Docker, Tailscale & CI/CD)

## Overview
Panduan ini menjelaskan cara men-deploy **NasLabs Drive** di **Home Server** secara mandiri (tanpa Docker) menggunakan **SQLite**, **Nginx**, **PM2**, **Tailscale**, dan **GitHub Actions CI/CD**.

---

## 🏗️ 1. Persiapan Home Server (Prerequisites)

Install dependensi berikut di Home Server (Ubuntu / Debian / Arch):

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PHP 8.3 & SQLite Extensions
sudo apt install -y php8.3-fpm php8.3-sqlite3 php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip composer

# Install Node.js 20 & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# Install Nginx & Tailscale
sudo apt install -y nginx tailscale
sudo tailscale up
```

---

## 📁 2. Setup Folder Aplikasi di Home Server

```bash
# Clone repository di /var/www
sudo mkdir -p /var/www/naslabs-drive
sudo chown -R $USER:$USER /var/www/naslabs-drive
git clone https://github.com/rifkinasss/Naslabs-Drive.git /var/www/naslabs-drive

# Setup Backend SQLite Database
cd /var/www/naslabs-drive/backend
cp .env.example .env
mkdir -p database storage
touch database/database.sqlite
chmod -R 775 storage database bootstrap/cache

# Generate App Key & Migrate
php artisan key:generate
php artisan migrate --seed
```

---

## ⚡ 3. Running Next.js Frontend dengan PM2

```bash
cd /var/www/naslabs-drive/frontend
npm install
npm run build

# Jalankan dengan PM2 (Auto-restart)
pm2 start npm --name "naslabs-drive-fe" -- start
pm2 save
pm2 startup
```

---

## 🌐 4. Konfigurasi Nginx di Home Server (`/etc/nginx/sites-available/naslabs-drive`)

```nginx
server {
    listen 80;
    server_name drive.local 100.x.y.z; # IP Tailscale Anda

    client_max_body_size 512M;

    # Frontend Next.js Proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Backend Laravel API Proxy
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Jalankan Laravel Artisan Serve sebagai daemon (atau via PHP-FPM):
```bash
cd /var/www/naslabs-drive/backend
pm2 start "php artisan serve --port=8000" --name "naslabs-drive-be"
```

---

## 🔄 5. Setup CI/CD Otomatis via GitHub Actions

Workflow CI/CD telah disediakan di berkas **`.github/workflows/deploy.yml`**.

Setiap kali Anda melakukan `git push origin main`, GitHub Actions akan otomatis:
1. Terhubung ke Home Server Anda secara aman melalui **Tailscale OAuth**.
2. Melakukan `git pull` kode terbaru.
3. Jalankan `composer install` & `php artisan migrate` di Backend.
4. Build Next.js & melakukan `pm2 restart` di Frontend.

### GitHub Secrets yang Perlu Dikonfigurasi di Repository:
Buka **GitHub Repository > Settings > Secrets and variables > Actions**:
- `TS_OAUTH_CLIENT_ID`: Tailscale OAuth Client ID (dari Tailscale Admin Console).
- `TS_OAUTH_SECRET`: Tailscale OAuth Client Secret.
- `HOMESERVER_TAILSCALE_IP`: IP Tailscale Home Server Anda (misal `100.x.y.z`).
- `HOMESERVER_USER`: Username SSH Home Server Anda.
- `HOMESERVER_SSH_KEY`: SSH Private Key untuk login ke Home Server.
