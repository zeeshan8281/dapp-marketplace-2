# API Documentation

This document describes the scripts and APIs used in this project.

## Scripts

### `seed-goldrush-chains.mjs`

Seeds chains from GoldRush-supported blockchain networks with priority levels.

**Usage:**
```bash
DATOCMS_API_TOKEN=xxxxx node seed-goldrush-chains.mjs
```

**What it does:**
1. Seeds all 48 GoldRush-supported chains into DatoCMS Chain model
2. Marks chains with priority levels:
   - **Priority 1 (Foundational)**: Ethereum, Polygon, BSC, Optimism, Base, Gnosis
   - **Priority 2 (Frontier)**: Bitcoin, Avalanche, Arbitrum, etc.
   - **Priority 3 (Community)**: Blast, Fantom, Linea, etc.
   - **Priority 4 (Archived)**: Harmony, Lisk, Loot Chain
3. These chains are prioritized when seeding dapps

**Reference:** [GoldRush Supported Chains](https://goldrush.dev/docs/chains/overview)

### `seed-alchemy-dapps.mjs`

Seeds dapps from Alchemy's public dapp store API.

**Usage:**
```bash
DATOCMS_API_TOKEN=xxxxx node seed-alchemy-dapps.mjs
```

**What it does:**
1. Fetches **ALL available dapps** from Alchemy's public dapp store API (no limit)
2. **Prioritizes dapps on GoldRush-supported chains** (Foundational > Frontier > Community > Archived)
3. For each dapp, fetches detailed data from the detail endpoint for complete information
4. Attempts to find matching DeFiLlama protocol data
5. Creates dapp records in DatoCMS with combined data from both sources
6. Stores **properly structured** Alchemy-specific data in the `alchemy_recent_activity` field
7. Shows priority breakdown and statistics

**Priority Order:**
- 🌟 Foundational chains (Ethereum, Polygon, BSC, Optimism, Base, Gnosis)
- ⚡ Frontier chains (Bitcoin, Avalanche, Arbitrum, etc.)
- 👥 Community chains (Blast, Fantom, Linea, etc.)
- 📦 Archived chains (Harmony, Lisk, Loot Chain)
- ⚠️ Other chains (non-GoldRush)

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

### `generate-unified-metadata.mjs`

Generates unified metadata for all dapps, combining data from Alchemy and DeFiLlama.

**Usage:**
```bash
DATOCMS_API_TOKEN=xxxxx node generate-unified-metadata.mjs
```

**What it does:**
1. Fetches all dapps from DatoCMS
2. Generates unified_metadata from Alchemy and DeFiLlama data
3. Updates each dapp with the unified metadata
4. Ensures all fields have proper fallbacks (no empty values)

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

## Recommended Workflow

1. **Seed GoldRush chains first** (highest priority):
   ```bash
   DATOCMS_API_TOKEN=xxxxx node seed-goldrush-chains.mjs
   ```

2. **Seed dapps** (will prioritize GoldRush chains):
   ```bash
   DATOCMS_API_TOKEN=xxxxx node seed-alchemy-dapps.mjs [LIMIT]
   ```

3. **Publish all items**:
   ```bash
   DATOCMS_API_TOKEN=xxxxx node check-and-publish-dapps.mjs
   ```

4. **Sync DeFiLlama data**:
   ```bash
   DATOCMS_API_TOKEN=xxxxx node sync-dapps.mjs
   ```

## Notes

- All scripts include rate limiting to avoid hitting API limits
- TVL values are validated to ensure they're numbers (not arrays) before saving
- Items are created but not automatically published - use `check-and-publish-dapps.mjs` to publish them
- The `alchemy_recent_activity` field stores JSON data from Alchemy's API
- **GoldRush chains are prioritized** - dapps on Foundational chains are processed first
- Use `MAX_CREATE` limit to stay within DatoCMS plan quotas

