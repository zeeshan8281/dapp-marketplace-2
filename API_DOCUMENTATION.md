# API Documentation

This document describes the scripts and APIs used in this project.

## Scripts

### `seed-alchemy-dapps.mjs`

Seeds dapps from Alchemy's public dapp store API.

**Usage:**
```bash
DATOCMS_API_TOKEN=xxxxx node seed-alchemy-dapps.mjs
```

**What it does:**
1. Fetches up to 150 dapps from Alchemy's public dapp store API
2. For each dapp, attempts to find matching DeFiLlama protocol data
3. Creates dapp records in DatoCMS with combined data from both sources
4. Stores Alchemy-specific data in the `alchemy_recent_activity` field

**Data Sources:**
- **Alchemy Dapp Store API**: `https://dapp-store.alchemy.com/dapps`
- **DeFiLlama API**: `https://api.llama.fi`

### `sync-dapps.mjs`

Syncs data from DeFiLlama and Alchemy to existing DatoCMS dapps.

**Usage:**
```bash
DATOCMS_API_TOKEN=xxxxx node sync-dapps.mjs
```

**What it does:**
1. Fetches all dapps from DatoCMS
2. For each dapp with a `protocol_id`, fetches latest data from DeFiLlama
3. Updates TVL, category, chain TVL, and other fields
4. Attempts to fetch Alchemy data if not already present
5. Publishes updated items

### `check-and-publish-dapps.mjs`

Publishes all unpublished dapps in DatoCMS.

**Usage:**
```bash
DATOCMS_API_TOKEN=xxxxx node check-and-publish-dapps.mjs
```

**What it does:**
1. Finds all unpublished dapps
2. Publishes them in batches
3. Reports success/failure counts

### `seed-popular-dapps.mjs`

Seeds top DeFiLlama protocols as dapps.

**Usage:**
```bash
DATOCMS_API_TOKEN=xxxxx node seed-popular-dapps.mjs
```

**What it does:**
1. Fetches top 50 protocols from DeFiLlama (sorted by TVL)
2. Creates dapp records in DatoCMS
3. Includes TVL, category, and chain TVL data

## External APIs

### Alchemy Dapp Store API

**Base URL:** `https://dapp-store.alchemy.com`

**Endpoint:** `/dapps?page={page}`

**Response Format:**
```json
{
  "total": 2394,
  "records": [
    {
      "recordId": "...",
      "name": "DApp Name",
      "slug": "dapp-slug",
      "shortDescription": "Description",
      "chains": [...],
      "vipChildCategory": [...],
      "logoCdnUrl": "https://...",
      "eyebrowText": "..."
    }
  ]
}
```

### DeFiLlama API

**Base URL:** `https://api.llama.fi`

**Endpoints:**
- `/protocols` - List all protocols
- `/protocol/{slug}` - Get protocol details

**Response Format:**
```json
{
  "name": "Protocol Name",
  "slug": "protocol-slug",
  "tvl": 1234567890,
  "category": "Lending",
  "chainTvls": {
    "Ethereum": 1000000000,
    "Arbitrum": 234567890
  },
  "description": "Protocol description..."
}
```

## Environment Variables

- `DATOCMS_API_TOKEN` - Full-access CMA token for creating/updating items
- `DATOCMS_READONLY_TOKEN` - Read-only token for GraphQL queries (used in frontend)

## Notes

- All scripts include rate limiting to avoid hitting API limits
- TVL values are validated to ensure they're numbers (not arrays) before saving
- Items are created but not automatically published - use `check-and-publish-dapps.mjs` to publish them
- The `alchemy_recent_activity` field stores JSON data from Alchemy's API

