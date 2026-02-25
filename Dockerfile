# Stage 1: build frontend
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: production
FROM node:20-alpine

WORKDIR /app

# Native deps for better-sqlite3 (if prebuild not available)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY --from=builder /app/dist ./dist

RUN mkdir -p server/data

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/index.js"]
