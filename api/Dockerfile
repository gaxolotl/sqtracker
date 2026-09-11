FROM oven/bun:1
ENV NODE_ENV=production
ENV SENTRY_DSN="https://9b9761216607428180ea3b32bd1c8e58@o140996.ingest.sentry.io/4504645996576768"
LABEL org.opencontainers.image.source=https://github.com/tdjsnelling/sqtracker
WORKDIR /sqtracker
COPY package.json bun.lock ./
COPY api/package.json ./api/package.json
COPY client/package.json ./client/package.json
COPY packages/plugin-sdk/package.json ./packages/plugin-sdk/package.json
COPY plugins/reseed-radar/package.json ./plugins/reseed-radar/package.json
RUN bun install --frozen-lockfile --production
COPY . .
WORKDIR /sqtracker/api
EXPOSE 3001
CMD ["bun", "src/index.js"]
