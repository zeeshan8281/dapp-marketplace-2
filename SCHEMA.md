# DatoCMS Schema Documentation

This document describes the Dapp model schema in DatoCMS.

## Dapp Model

The Dapp model (`api_key: "dapp"`) contains the following fields:

### Core Fields

- **`title`** (Single-line string, required)
  - The name of the dapp/protocol

- **`short_description`** (Text, optional)
  - Brief description of the dapp

- **`screenshots`** (Image, multiple, optional)
  - Screenshots/logos of the dapp

### DeFiLlama Fields

- **`protocol_id`** (Single-line string, optional)
  - DeFiLlama protocol slug (e.g., "uniswap-v3")

- **`tvl_usd`** (Float, optional)
  - Total Value Locked in USD (must be a number, not an array)

- **`category_defillama`** (Single-line string, optional)
  - DeFiLlama category (e.g., "Dexes", "Lending", "Bridge")

- **`chain_tvl`** (Text, optional)
  - JSON string containing chain-specific TVL breakdown
  - Format: `[{"chain": "Ethereum", "tvl": 1000000}, ...]`

- **`defillama_url`** (Single-line string, optional)
  - URL to the protocol on DeFiLlama

### Alchemy Fields

- **`alchemy_recent_activity`** (Text, optional)
  - JSON string containing **properly structured** Alchemy dapp store data
  - Format:
    ```json
    {
      "name": "DApp Name",
      "slug": "dapp-slug",
      "recordId": "...",
      "description": "Description",
      "shortDescription": "Short description",
      "longDescription": "Full detailed description",
      "logoUrl": "https://...",
      "logoCdnUrl": "https://...",
      "chains": [...],
      "categories": [...],
      "vipChildCategory": [...],
      "eyebrowText": "...",
      "websiteUrl": "https://...",
      "website": "https://...",
      "twitterUrl": "https://...",
      "twitter": "@handle",
      "discordUrl": "https://...",
      "githubUrl": "https://...",
      "documentationUrl": "https://...",
      "featured": false,
      "verified": false,
      "createdAt": "...",
      "updatedAt": "...",
      "source": "alchemy_dapp_store",
      "rawListData": { ... }
    }
    ```

### Token Fields

- **`token_price_usd`** (Float, optional)
  - Token price in USD

- **`token_logo_url`** (Single-line string, optional)
  - URL to token logo

### Sync Fields

- **`last_synced_at`** (DateTime, optional)
  - Timestamp of last successful sync

- **`last_sync_status`** (Single-line string, optional)
  - Status of last sync (e.g., "ok", "error")

### Relationship Fields

- **`chains`** (Links, multiple, optional)
  - Links to Chain records

- **`categories`** (Links, multiple, optional)
  - Links to Category records

- **`tags`** (Links, multiple, optional)
  - Links to Tag records

## Related Models

### Chain Model
- **`name`** (Single-line string) - Chain name (e.g., "Ethereum", "Arbitrum")

### Category Model
- **`name`** (Single-line string) - Category name

### Tag Model
- **`tag`** (Single-line string) - Tag name

## Notes

- The `tvl_usd` field must be a number, not an array. Some DeFiLlama protocols return historical TVL data as arrays, which should be filtered out.
- The `alchemy_recent_activity` field stores JSON as a string to preserve all Alchemy data.
- Logo URLs are prioritized in this order:
  1. Screenshots (DatoCMS)
  2. Token logo URL
  3. Alchemy logo URL
  4. DeFiLlama icon URL

