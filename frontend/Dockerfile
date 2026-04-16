FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache certbot openssl

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.d/10-https-defaults.envsh /docker-entrypoint.d/10-https-defaults.envsh
COPY docker-entrypoint.d/30-certbot.sh /docker-entrypoint.d/30-certbot.sh
COPY --from=build /app/dist /usr/share/nginx/html

RUN chmod +x \
  /docker-entrypoint.d/10-https-defaults.envsh \
  /docker-entrypoint.d/30-certbot.sh

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
