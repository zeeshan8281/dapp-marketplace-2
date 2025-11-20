# Unified Metadata Structure

## Overview

The `unified_metadata` field provides a normalized, source-agnostic view of dapp data from both Alchemy and DeFiLlama sources. All fields are **optional** to ensure no dapp is missing required data.

## Field Structure

```json
{
  // Core Identification
  "name": "string | null",
  "slug": "string | null",
  "description": "string | null",
  
  // Media
  "logoUrl": "string | null",
  "iconUrl": "string | null",
  
  // Financial Metrics
  "tvlUsd": "number | null",
  "chainTvl": { "Ethereum": 1000000, ... } | null,
  
  // Categorization
  "category": "string | null",
  "categories": ["string"] | null,
  "chains": ["string"] | null,
  
  // Links & Social
  "websiteUrl": "string | null",
  "twitterUrl": "string | null",
  "twitterHandle": "string | null",
  "discordUrl": "string | null",
  "githubUrl": "string | null",
  "documentationUrl": "string | null",
  
  // External References
  "defillamaUrl": "string | null",
  "alchemyUrl": "string | null",
  
  // Status Flags
  "featured": "boolean | false",
  "verified": "boolean | false",
  "isDefiProtocol": "boolean | false",
  
  // Source Tracking
  "sources": {
    "name": "alchemy" | "defillama" | "both",
    "description": "alchemy" | "defillama" | "both",
    ...
  },
  
  // Metadata
  "lastUpdated": "ISO8601 string | null",
  "dataQuality": {
    "hasAlchemyData": "boolean",
    "hasDefillamaData": "boolean",
    "completenessScore": "number (0-100)"
  }
}
```

## Field Priority Rules

1. **Name**: DeFiLlama name > Alchemy name > DatoCMS title
2. **Description**: Longest available (truncated to 3000 chars, or 500 in minimal mode)
3. **Logo**: Token logo > Alchemy CDN > Alchemy logo > DeFiLlama icon
4. **Website**: DeFiLlama URL > Alchemy websiteUrl
5. **Twitter**: DeFiLlama twitter (normalized) > Alchemy twitterUrl
6. **Category**: DeFiLlama category > Alchemy categories[0]
7. **Chains**: Merged and deduplicated from both sources

## UI Implementation

The UI components use unified metadata with comprehensive fallbacks:

- **Detail Page** (`pages/dapps/[slug].js`): Uses unified metadata, falls back to individual fields
- **Card Component** (`components/DappCard.jsx`): Uses unified metadata for description, category, TVL
- **All fields are conditionally rendered** - empty fields are never shown

## Size Management

- Maximum description length: 3000 chars (500 in minimal mode)
- Chain TVL limited to top 10 chains
- Automatic truncation if total size exceeds 250KB
- Minimal mode for dapps with large existing records

## Generation

Run the generation script to create/update unified metadata:

```bash
DATOCMS_API_TOKEN=xxxxx node generate-unified-metadata.mjs
```

This will:
1. Create the `unified_metadata` field if it doesn't exist
2. Generate unified metadata for all dapps
3. Handle size limits automatically
4. Show completeness scores for each dapp

## Benefits

✅ **Source-agnostic**: Frontend doesn't need to know data source  
✅ **All fields optional**: No missing data errors  
✅ **Comprehensive fallbacks**: Always shows best available data  
✅ **Quality metrics**: Tracks data completeness  
✅ **Size optimized**: Stays within DatoCMS limits  

