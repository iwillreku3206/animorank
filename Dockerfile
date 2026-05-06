# we use trixie version (debian) since it's based on glibc which has better performance (at the cost of being slightly bigger)

# For caching the dependencies
FROM node:24-trixie AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npx svelte-kit sync
RUN npm run build
RUN npm prune --production

# For building the final image
FROM node:24-trixie
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "build"]
