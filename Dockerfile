# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

RUN npm run build --legacy-peer-deps

# Next.js por defecto en el start levanta en 3000
EXPOSE 3000
CMD ["npm", "run", "start"]
