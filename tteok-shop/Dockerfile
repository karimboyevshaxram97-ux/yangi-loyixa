FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
# npm ci talab qiladigan qat'iy lock-fayl mosligi Windows'da generatsiya
# qilingan lock bilan Linux konteyner o'rtasida platformaga xos optional
# bog'liqliklar tufayli buziladi — npm install shu holatda joriy platforma
# uchun to'g'ri qaror qabul qiladi.
RUN npm install

FROM deps AS build

WORKDIR /app

COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src

RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN mkdir -p /app/uploads

EXPOSE 4004

CMD ["node", "dist/server.js"]
