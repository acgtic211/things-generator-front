# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps --frozen-lockfile
COPY . .

RUN npm run build --legacy-peer-deps

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package.json .
COPY --from=builder /app/public ./public

ENV HOSTNAME "0.0.0.0"
ENTRYPOINT ["node", "server.js"]

# Next.js por defecto en el start levanta en 3000
EXPOSE 3000
CMD ["npm", "run", "start"]
