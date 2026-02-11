# ---- Builder ----
FROM node:20-alpine AS builder

# OpenSSL va bash qo'shamiz (Prisma uchun)
RUN apk add --no-cache bash openssl

WORKDIR /app

# Package.json va tsconfigni ko'chiramiz
COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./ 
COPY src ./src

RUN npm run build

# ---- Production ----
FROM node:20-alpine

# OpenSSL va bash (Prisma uchun)
RUN apk add --no-cache bash openssl

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Builder dan build va prisma fayllarni olib kelamiz
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

EXPOSE ${PORT}

CMD ["node", "dist/server.js"]
