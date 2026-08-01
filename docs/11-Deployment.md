# 11 — Deployment

## Overview
Sistem di-deploy menggunakan **Docker Compose** dengan tiga service utama: Laravel (PHP-FPM + Nginx), Next.js, dan PostgreSQL. Nginx bertindak sebagai reverse proxy untuk kedua aplikasi.

---

## Arsitektur Docker

```
┌─────────────────────────────────────────────────────────┐
│                   Docker Network: naslabs-net           │
│                                                         │
│  ┌────────────────┐   ┌──────────────┐   ┌──────────┐  │
│  │   nginx        │   │  laravel-app │   │ nextjs   │  │
│  │   :80 / :443  ├──►│  php-fpm:9000│   │  :3000   │  │
│  │               │   │              │   │          │  │
│  │  Proxy rules: │   │  volumes:    │   └──────────┘  │
│  │  api.* →      ├──►│  - storage/  │        ▲        │
│  │  drive.* →    │   │  - .env      │        │        │
│  │               │───────────────────────────┘        │
│  └────────────────┘   └──────┬───────┘                 │
│                              │                         │
│                     ┌────────▼───────┐                 │
│                     │   postgres     │                 │
│                     │   :5432        │                 │
│                     └────────────────┘                 │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │   redis (opsional — untuk cache & queue)         │   │
│  │   :6379                                          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## `docker-compose.yml`

```yaml
version: '3.9'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/conf.d:/etc/nginx/conf.d
      - ./docker/nginx/ssl:/etc/nginx/ssl
      - ./backend/public:/var/www/backend/public:ro
    depends_on:
      - laravel-app
      - nextjs
    networks:
      - naslabs-net

  laravel-app:
    build:
      context: ./backend
      dockerfile: Dockerfile
    volumes:
      - ./backend:/var/www/backend
      - ./backend/storage:/var/www/backend/storage  # persist storage
    environment:
      - APP_ENV=production
    env_file:
      - ./backend/.env
    depends_on:
      - postgres
    networks:
      - naslabs-net

  nextjs:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    env_file:
      - ./frontend/.env.local
    networks:
      - naslabs-net

  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: naslabs_cloud
      POSTGRES_USER: naslabs
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    networks:
      - naslabs-net

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - naslabs-net

volumes:
  postgres_data:
  redis_data:

networks:
  naslabs-net:
    driver: bridge
```

---

## Nginx Configuration

### `docker/nginx/conf.d/api.naslabs.id.conf`
```nginx
server {
    listen 80;
    server_name api.naslabs.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.naslabs.id;
    root /var/www/backend/public;
    index index.php;

    ssl_certificate     /etc/nginx/ssl/naslabs.crt;
    ssl_certificate_key /etc/nginx/ssl/naslabs.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Blokir akses ke storage private
    location ~* /storage/app/ {
        deny all;
        return 403;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass laravel-app:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Upload size limit
    client_max_body_size 110M;

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

### `docker/nginx/conf.d/drive.naslabs.id.conf`
```nginx
server {
    listen 80;
    server_name drive.naslabs.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name drive.naslabs.id;

    ssl_certificate     /etc/nginx/ssl/naslabs.crt;
    ssl_certificate_key /etc/nginx/ssl/naslabs.key;

    location / {
        proxy_pass http://nextjs:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Dockerfile — Laravel

```dockerfile
# backend/Dockerfile
FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    && docker-php-ext-install pdo pdo_pgsql zip pcntl

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/backend

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --optimize-autoloader

COPY . .

RUN chown -R www-data:www-data storage bootstrap/cache
RUN chmod -R 775 storage bootstrap/cache

CMD ["php-fpm"]
```

---

## Dockerfile — Next.js

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Environment Variables

### Backend `.env`
```env
APP_NAME="NasLabs Drive API"
APP_ENV=production
APP_KEY=base64:...
APP_DEBUG=false
APP_URL=https://api.naslabs.id

FRONTEND_URL=https://drive.naslabs.id
SANCTUM_STATEFUL_DOMAINS=drive.naslabs.id
SESSION_SECURE_COOKIE=true
SESSION_DOMAIN=.naslabs.id

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=naslabs_cloud
DB_USERNAME=naslabs
DB_PASSWORD=your_secure_password

FILESYSTEM_DISK=local

CACHE_STORE=redis
QUEUE_CONNECTION=redis
REDIS_HOST=redis
REDIS_PORT=6379

DRIVE_MAX_FILE_SIZE=102400
DRIVE_DEFAULT_QUOTA=5368709120
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_URL=https://api.naslabs.id
NEXT_PUBLIC_APP_NAME="NasLabs Drive"
```

---

## Deployment Steps

### First Deployment
```bash
# 1. Clone repo
git clone https://github.com/naslabs/cloud.git
cd cloud

# 2. Salin dan isi env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Build & start containers
docker compose up -d --build

# 4. Generate app key Laravel
docker compose exec laravel-app php artisan key:generate

# 5. Jalankan migrasi
docker compose exec laravel-app php artisan migrate --force

# 6. Buat storage symlink (jika perlu)
docker compose exec laravel-app php artisan storage:link

# 7. Optimize Laravel
docker compose exec laravel-app php artisan config:cache
docker compose exec laravel-app php artisan route:cache
docker compose exec laravel-app php artisan view:cache
```

### Update Deployment
```bash
git pull
docker compose up -d --build
docker compose exec laravel-app php artisan migrate --force
docker compose exec laravel-app php artisan config:cache
docker compose exec laravel-app php artisan route:cache
```

---

## Health Check

```bash
# Cek status container
docker compose ps

# Cek logs laravel
docker compose logs laravel-app

# Cek koneksi DB
docker compose exec laravel-app php artisan db:show

# Test API
curl -s https://api.naslabs.id/api/v1/auth/me | jq .
```

---

## Persistent Volumes

| Volume | Isi |
|--------|-----|
| `postgres_data` | Data PostgreSQL |
| `redis_data` | Data Redis (cache & queue) |
| `./backend/storage` | File upload user (bind mount) |

> **PENTING:** Backup `postgres_data` dan `backend/storage` secara berkala!
