FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Generating the client never connects, but prisma.config.ts insists on a URL.
# It is generated twice: for the build, then again after dev deps are pruned.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npx prisma generate && npm run build && npm prune --omit=dev && npx prisma generate

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/prisma.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
# Migrations are idempotent: every start brings the schema up to date first.
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/main.js"]
