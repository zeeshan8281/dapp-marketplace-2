# Frontend Setup Guide

## Quick Setup Steps

### 1. Get Your Readonly Token

1. Go to [DatoCMS Dashboard](https://dashboard.datocms.com)
2. Select your workspace (the one with API token: `95a1e1ac66c822978ec1d79a48bcce`)
3. Navigate to **Settings** → **API tokens**
4. Copy the **"Read-only API token"** (it should start with something like `abc123...`)

### 2. Update .env.local

Open `.env.local` and replace `YOUR_READONLY_TOKEN_HERE` with your actual readonly token:

```bash
DATOCMS_READONLY_TOKEN=your_actual_readonly_token_here
DATOCMS_API_TOKEN=95a1e1ac66c822978ec1d79a48bcce
```

### 3. Start the Frontend

```bash
npm run dev
```

Then open [http://localhost:3000/dapps](http://localhost:3000/dapps) in your browser.

## What's Already Set Up

✅ **30 dapps** with complete data:
- All from GoldRush chains (prioritized)
- Full Alchemy data (descriptions, logos, chains, categories)
- Links (website, Twitter, GitHub, etc.)
- DeFiLlama data where available

✅ **34 GoldRush chains** seeded

✅ **Frontend code** ready to display:
- GoldRush section (shows for dapps on GoldRush chains)
- Links & Resources section
- All filtering and search features

## Troubleshooting

If you see errors:
1. Make sure `.env.local` has the correct `DATOCMS_READONLY_TOKEN`
2. Restart the dev server after updating `.env.local`
3. Check that the token has read permissions

