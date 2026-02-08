FROM node:22-alpine

WORKDIR /app

RUN addgroup -S portfolio && adduser -S portfolio -G portfolio

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY public/ ./public/
COPY posts/ ./posts/
RUN mkdir -p /app/data

RUN chown -R portfolio:portfolio /app
USER portfolio

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
