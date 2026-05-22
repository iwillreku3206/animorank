# AnimoRank

A web-based C programming education platform where teachers create problem sets with test cases and students solve them in-browser using an integrated code editor.

## Features

- **Problem Sets** — Teachers create and manage collections of C programming problems
- **In-Browser Code Editor** — Monaco editor with syntax highlighting and edit history
- **Automated Testing** — Student code is compiled and tested against teacher-defined test cases via the Piston API
- **Role-Based Access** — Google OAuth2 login with automatic teacher/student role assignment
- **Session Persistence** — Code progress auto-saves locally and syncs to the database

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, TypeScript
- **Styling**: Tailwind CSS, DaisyUI
- **Database**: Supabase (PostgreSQL)
- **Auth**: Google OAuth2 with JWT
- **Code Execution**: [Piston API](https://github.com/engineer-man/piston)
- **Editors**: Monaco (code), Tiptap (rich text)
- **Deployment**: Vercel

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A [Supabase](https://supabase.com/) project
- A [Google Cloud](https://console.cloud.google.com/) project with OAuth2 credentials

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Google OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Credentials
2. Create an **OAuth 2.0 Client ID** (application type: Web application)
3. Add an **Authorized redirect URI**:
   - Local development: `http://localhost:5173/oath`
   - Production: `https://yourdomain.com/oath`
4. Note down the **Client ID** and **Client Secret**

### 3. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com/)
2. Run the setup script in the Supabase SQL Editor (Dashboard > SQL Editor > New query):
   - Copy and paste the contents of [`supabase/setup.sql`](supabase/setup.sql) and run it
   - This creates all required tables with correct columns, primary keys, and foreign key relationships
3. Get your **Project URL** and **service_role key** from Settings > API

### 4. Set up environment variables

Create a `.env` file in the project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SERVICE_KEY=your-supabase-service-role-key
SECRET_CLIENT_ID=your-google-oauth-client-id
SECRET_CLIENT_SECRET=your-google-oauth-client-secret
APP_JWT_SECRET=your-jwt-secret
isPROD=false
```

Generate a JWT secret:

```bash
openssl rand -base64 32
```

### 5. Update OAuth redirect URL for local development

The OAuth redirect URL is hardcoded in two files. For local development, update them to `http://localhost:5173/oath`:

- `src/routes/oath/+server.js` (line 9)
- `src/routes/+page.server.js` (line 38)

### 6. Add teachers

Insert email addresses into the `Teacher_list` table in Supabase. Users who log in with a matching email will be assigned the teacher role; all others become students.

## Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.
