# Stage 1: Node Build
FROM node:20 AS node-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Composer Dependencies
FROM composer:2 AS composer-builder
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --ignore-platform-reqs --no-scripts --prefer-dist
COPY . .
RUN composer dump-autoload --optimize

# Stage 3: PHP-FPM
FROM php:8.3-fpm-alpine
RUN apk add --no-cache \
    zip \
    libzip-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    icu-dev \
    oniguruma-dev \
    mysql-client \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_mysql zip exif pcntl bcmath gd intl \
    && rm -rf /var/cache/apk/*

WORKDIR /var/www/html

COPY --from=composer-builder /app /var/www/html
COPY --from=node-builder /app/public/build /var/www/html/public/build

RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

CMD ["php-fpm"]
