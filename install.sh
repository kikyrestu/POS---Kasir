#!/bin/bash

# BuildyPOS Auto-Installer for VPS
# Run this script using: bash install.sh

echo "=================================================="
echo "    🚀 WELCOME TO NEXAPOS / BUILDYPOS INSTALLER    "
echo "=================================================="
echo ""

# Ensure docker is installed
if ! command -v docker &> /dev/null
then
    echo "❌ Docker is not installed! Please install docker first."
    exit
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null
then
    echo "❌ Docker Compose is not installed! Please install docker compose first."
    exit
fi

echo "✅ Docker and Docker Compose are installed."
echo ""

# 1. Setup .env file
echo "⚙️  Setting up .env file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env from .env.example"
else
    echo "✅ .env file already exists."
fi

# Ask for domain
read -p "🌐 Enter your central domain (e.g., buildypos.store) [Default: buildypos.store]: " domain
domain=${domain:-buildypos.store}

# Update .env
sed -i "s/APP_URL=http:\/\/localhost/APP_URL=https:\/\/$domain/" .env
sed -i "s/APP_URL=http:\/\/nexapos.localhost/APP_URL=https:\/\/$domain/" .env
sed -i "s/APP_ENV=local/APP_ENV=production/" .env
sed -i "s/APP_DEBUG=true/APP_DEBUG=false/" .env
sed -i "s/CENTRAL_DOMAIN=nexapos.localhost/CENTRAL_DOMAIN=$domain/" .env
sed -i "s/DB_HOST=127.0.0.1/DB_HOST=mysql/" .env
sed -i "s/DB_PASSWORD=/DB_PASSWORD=secret/" .env
sed -i "s/DB_DATABASE=pos_db/DB_DATABASE=pos_kasir/" .env

# Generate APP_KEY locally if empty
if grep -q "^APP_KEY=$" .env; then
    NEW_KEY="base64:$(openssl rand -base64 32)"
    sed -i "s|^APP_KEY=$|APP_KEY=$NEW_KEY|" .env
    echo "🔑 Generated new APP_KEY"
fi

echo "✅ .env updated for domain $domain"
echo ""

# 2. Build and Start Docker
echo "🐳 Building and starting Docker containers..."
docker compose up -d --build

echo "⏳ Waiting for MySQL to initialize (15 seconds)..."
sleep 15

# 3. Setup Laravel Application
echo "📦 Installing PHP dependencies..."


# Application Key is already generated in .env

echo "📂 Creating storage link..."
docker compose exec app php artisan storage:link

docker compose exec app chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

echo "🛠️  Running database migrations and seeders..."
docker compose exec app php artisan migrate --force
docker compose exec app php artisan db:seed --force

echo "🧹 Optimizing Laravel cache..."
docker compose exec app php artisan optimize:clear
docker compose exec app php artisan config:cache
docker compose exec app php artisan route:cache
docker compose exec app php artisan view:cache

echo ""
echo "=================================================="
echo " 🎉 INSTALLATION COMPLETE! "
echo "=================================================="
echo "🌐 Your app is running on port 8890."
echo "🔗 Central Domain: $domain"
echo "👑 Admin URL: http://adminkita.$domain"
echo "📧 Default Admin: superadmin@example.com / password"
echo ""
echo "⚠️  Important Next Step:"
echo "Please configure your Nginx/Apache reverse proxy to point $domain and *.$domain to 127.0.0.1:8890"
echo "=================================================="
