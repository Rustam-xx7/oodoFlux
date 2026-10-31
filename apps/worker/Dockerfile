FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

RUN npm install
RUN npm run --workspace=@sms/shared build
RUN npm run --workspace=@sms/worker build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/package.json

CMD ["node", "apps/worker/dist/index.js"]
