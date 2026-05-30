# Environment Setup Guide for NHRMS

## Current Status
**Your Supabase environment variables are ALREADY SET UP** through the v0 integration. The app is running with the connected Supabase project.

## How It Works

### In v0 (Where You Are Now)
- Environment variables are automatically injected by v0
- You don't need to create a `.env` file manually
- The app can access Supabase seamlessly
- The dev server is already running at `http://localhost:3000`

### When Deploying to Vercel
1. Push your code to GitHub
2. Connect the GitHub repo to your Vercel project
3. Vercel automatically pulls the env vars from v0 project settings
4. Your app deploys with all configs ready

## Getting the API Keys (For Reference)

If you need to see the actual values, go to your **Supabase Dashboard**:

1. **Log in to Supabase** → https://app.supabase.com
2. Select your NHRMS project
3. Go to **Settings** → **API**
4. You'll find:
   - **Project URL** = `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon (Public) key** = `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Key** = `SUPABASE_SERVICE_ROLE_KEY` (SECRET - don't share!)

## What Each Variable Does

| Variable | Type | Used For | Secret? |
|----------|------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase connection endpoint | ❌ Safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Client-side authentication | ❌ Safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Private | Server-side operations only | ✅ KEEP SECRET |
| `SUPABASE_JWT_SECRET` | Private | JWT token validation | ✅ KEEP SECRET |
| `POSTGRES_URL` | Private | Database connection (pooled) | ✅ KEEP SECRET |

## Local Development (After Downloading)

If you download this project and want to run it locally:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the values from your Supabase project

3. Run the dev server:
   ```bash
   pnpm dev
   ```

## Production Deployment

When deploying to Vercel:

1. The environment variables from v0 are automatically transferred
2. No manual `.env` file needed
3. All secrets are encrypted and secure

**NOTE:** Never commit `.env.local` to Git - it's already in `.gitignore`
