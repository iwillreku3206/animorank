# AnimoRank

A web-based C programming education platform where teachers create problem sets with test cases and students solve them in-browser using an integrated code editor.

## Features

- **Problem Sets** — Teachers create and manage collections of C programming problems
- **In-Browser Code Editor** — Monaco editor with syntax highlighting and edit history
- **Automated Testing** — Student code is compiled and tested against teacher-defined test cases via a self-hosted [Judge0](https://judge0.com/) instance
- **Role-Based Access** — Google sign-in with automatic teacher/student role assignment
- **Session Persistence** — Code progress auto-saves locally and syncs to the database

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, TypeScript
- **Styling**: Tailwind CSS v4, DaisyUI
- **Database**: PostgreSQL, accessed through [Prisma](https://www.prisma.io/) + [ZenStack](https://zenstack.dev/) (ORM and access policies)
- **Auth**: [Auth.js](https://authjs.dev/) (`@auth/sveltekit`) — Google OAuth provider, Prisma adapter, database-backed sessions
- **Code Execution**: self-hosted [Judge0](https://judge0.com/)
- **Editors**: Monaco (code), Gravity UI Markdown editor (rich text)
- **Deployment**: Docker image built with the SvelteKit Node adapter

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+; the Docker image uses Node 24)
- A **PostgreSQL** database (self-hosted or managed). A second, empty database is needed as a [shadow database](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/shadow-database) for running migrations during development.
- A reachable **Judge0** instance ([self-hosting guide](https://github.com/judge0/judge0))
- A [Google Cloud](https://console.cloud.google.com/) project with OAuth2 credentials

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Google OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Credentials
2. Create an **OAuth 2.0 Client ID** (application type: Web application)
3. Add an **Authorized redirect URI** (Auth.js handles the callback at `/auth/callback/google`):
   - Local development: `http://localhost:5173/auth/callback/google`
   - Production: `https://yourdomain.com/auth/callback/google`
4. Note down the **Client ID** and **Client Secret**

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
# PostgreSQL
DATABASE_URL="postgresql://user:password@host:5432/animorank?schema=public"
# Empty database used by `zen migrate dev` to detect schema drift (dev only)
SHADOW_DATABASE_URL="postgresql://user:password@host:5432/animorank_shadow?schema=public"

# Auth.js — read automatically by @auth/sveltekit
AUTH_SECRET=your-auth-secret
AUTH_GOOGLE_ID=your-google-oauth-client-id
AUTH_GOOGLE_SECRET=your-google-oauth-client-secret

# Judge0 base URL (no trailing slash)
JUDGE0_BASE_URL=http://your-judge0-host:2358

# Use mkcert to serve the dev server over HTTPS (optional)
SSL_DEV_SERVER=true

# Production only: public origin used by the Node adapter for CSRF/redirects
# ORIGIN=https://yourdomain.com
```

Generate an `AUTH_SECRET`:

```bash
npx auth secret
# or: openssl rand -base64 33
```

### 4. Generate the client and apply migrations

The ZenStack/Prisma client is generated from [`src/zenstack/schema.zmodel`](src/zenstack/schema.zmodel) into `src/lib/zenstack`, and the schema lives as migrations under [`prisma/migrations`](prisma/migrations).

```bash
npx zen generate          # generate the ORM client from the .zmodel schema
npx zen migrate dev       # create/apply migrations against DATABASE_URL (uses the shadow DB)
```

In production, apply existing migrations without generating new ones:

```bash
npx zen migrate deploy
```

### 5. Add teachers

Insert email addresses into the `TeacherList` table (model `TeacherList { email }`). On first sign-in, a user whose email matches a row is assigned the **teacher** role; everyone else becomes a **student**.

## Development

```bash
npm run dev
```

The app is served at `http://localhost:5173` (or `https://localhost:5173` when `SSL_DEV_SERVER=true`).

## Docker

The repository ships a production [`Dockerfile`](Dockerfile) (SvelteKit Node adapter) and [`docker-entrypoint.sh`](docker-entrypoint.sh), which runs `zen migrate deploy` and then starts the server with `node build` on port `3000`.

```bash
docker build -t animorank .
docker run --env-file .env -p 3000:3000 animorank
```

Set `ORIGIN` to the public URL the app is served from so the Node adapter accepts form submissions and OAuth redirects.
