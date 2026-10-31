FROM node:20-alpine AS builder

WORKDIR /app

# Copy root manifests and workspace configs
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY prisma/ ./prisma/

# Install dependencies and build
RUN npm install
RUN npm run --workspace=@sms/shared build
RUN npx prisma generate
RUN npm run --workspace=@sms/api build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
