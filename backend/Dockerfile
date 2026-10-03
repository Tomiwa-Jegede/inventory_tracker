FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src
COPY uploads/.gitkeep ./uploads/.gitkeep
ENV PORT=4000
EXPOSE 4000
CMD ["sh", "-c", "node src/db/migrate.js && node src/index.js"]
