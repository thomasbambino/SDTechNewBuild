FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx vite build && \
    node -e "require('esbuild').buildSync({entryPoints:['server/index.ts'],platform:'node',packages:'external',bundle:true,format:'esm',outdir:'dist'})"

FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/init-db.js ./init-db.js

EXPOSE 5000

CMD ["sh", "-c", "node init-db.js && node dist/index.js"]
