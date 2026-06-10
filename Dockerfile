FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx vite build && \
    node -e "require('esbuild').buildSync({entryPoints:['server/index.ts'],platform:'node',packages:'external',bundle:true,format:'esm',outdir:'dist'})"

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.js"]
