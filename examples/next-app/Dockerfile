FROM node:24-alpine AS build
WORKDIR /workspace
COPY serggrey1992-next-runtime-env-0.1.0.tgz ./
COPY examples/next-app ./examples/next-app
WORKDIR /workspace/examples/next-app
RUN npm install --no-audit --no-fund
RUN npx next-runtime-env generate --code-only
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /workspace/examples/next-app/.next/standalone ./
COPY --from=build --chown=node:node /workspace/examples/next-app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
