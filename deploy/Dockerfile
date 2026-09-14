FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY control-plane ./control-plane
COPY glt-specpack ./glt-specpack

RUN pnpm install --frozen-lockfile \
 && pnpm gen \
 && chown -R node:node /app

USER node

ENV HOST=0.0.0.0
ENV PORT=4174

EXPOSE 4174

CMD ["pnpm", "api"]
