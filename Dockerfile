# Stage 1: build the React app
FROM node:22-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# API_BASE_URL must be passed at build time, e.g.:
# docker build --build-arg API_BASE_URL=https://api.yourdomain.com .
ARG API_BASE_URL
ENV API_BASE_URL=$API_BASE_URL

RUN npm run build

# Stage 2: serve with nginx
FROM nginx:stable-alpine
RUN apk upgrade --no-cache
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
