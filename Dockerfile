# we use trixie version (debian) since it's based on glibc which has better performance (at the cost of being slightly bigger)

# For caching the dependencies
FROM node:24-trixie AS builder
RUN addgroup --system nonroot \
    && adduser --system --ingroup nonroot --home /home/nonroot nonroot
WORKDIR /app
# `WORKDIR` and `COPY` hand their files to root by default; the build user must
# own the tree it writes into (`.svelte-kit`, `build`, `node_modules`).
RUN chown nonroot:nonroot /app
USER nonroot
COPY --chown=nonroot:nonroot package*.json .
RUN npm ci
COPY --chown=nonroot:nonroot . .
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npx svelte-kit sync
RUN npm run build
RUN npm prune --production

# For building the final image
FROM node:24-trixie
RUN npm install -g @zenstackhq/cli
RUN addgroup --system nonroot \
    && adduser --system --ingroup nonroot --home /home/nonroot nonroot
WORKDIR /app
RUN chown nonroot:nonroot /app
USER nonroot
COPY --from=builder --chown=nonroot:nonroot /app/build build/
COPY --from=builder --chown=nonroot:nonroot /app/node_modules node_modules/
COPY --from=builder --chown=nonroot:nonroot /app/src/zenstack src/zenstack
COPY --from=builder --chown=nonroot:nonroot /app/prisma/migrations prisma/migrations
COPY --chown=nonroot:nonroot package.json .
COPY --chown=nonroot:nonroot prisma.config.ts .
COPY --chown=nonroot:nonroot docker-entrypoint.sh .
# RUN npx zenstack generate
EXPOSE 3000
ENV NODE_ENV=production
CMD ["bash", "./docker-entrypoint.sh"]
