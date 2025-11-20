# dApp Marketplace

A Next.js application for browsing and discovering decentralized applications (dApps) with data from Alchemy and DeFiLlama.

## Features

- 🚀 Browse dApps with filtering and search
- 📊 TVL trends and token metrics
- 🔗 Related dApps suggestions
- 🌓 Dark/Light theme support
- 📱 Responsive design

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the project root:
```
DATOCMS_READONLY_TOKEN=your_readonly_token_here
DATOCMS_API_TOKEN=your_full_access_token_here
```

## Running

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data Seeding

### Initial Setup

1. **Setup DatoCMS Models:**
```bash
DATOCMS_API_TOKEN=xxxxx node setup-models.mjs
```

2. **Seed GoldRush Chains:**
```bash
DATOCMS_API_TOKEN=xxxxx node seed-goldrush-chains.mjs
```

3. **Add Slug Field (if needed):**
```bash
DATOCMS_API_TOKEN=xxxxx node add-slug-field.mjs
```

4. **Generate Slugs for Existing Dapps:**
```bash
DATOCMS_API_TOKEN=xxxxx node generate-slugs.mjs
```

5. **Seed dApps from Alchemy:**
```bash
DATOCMS_API_TOKEN=xxxxx node seed-alchemy-dapps.mjs
```

6. **Generate Unified Metadata:**
```bash
DATOCMS_API_TOKEN=xxxxx node generate-unified-metadata.mjs
```

### Ongoing Maintenance

**Sync existing dApps with latest data:**
```bash
DATOCMS_API_TOKEN=xxxxx node sync-dapps.mjs
```

## Project Structure

- `pages/dapps/` - dApp listing and detail pages
- `components/` - React components (DappCard, ThemeToggle, ErrorBoundary)
- `contexts/` - Theme context
- `lib/` - DatoCMS GraphQL utilities
- `*.mjs` - Data seeding and utility scripts

## Documentation

- `API_DOCUMENTATION.md` - Scripts and external APIs
- `SCHEMA.md` - DatoCMS schema documentation
- `UNIFIED_METADATA.md` - Unified metadata structure
