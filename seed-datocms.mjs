// seed-datocms.js
import { buildClient } from "@datocms/cma-client-node";

/*
  USAGE:
  - set env var DATOCMS_API_TOKEN to a full-access Dato CMS token (CMA)
  - set CHAIN_MODEL_API_KEY and CATEGORY_MODEL_API_KEY to the model api keys you created in Schema (e.g. "chain", "category")
  - run: DATOCMS_API_TOKEN=xxxxx node seed-datocms.js
*/

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

const CHAIN_MODEL_API_KEY = process.env.CHAIN_MODEL_API_KEY || "chain";       // replace if different
const CATEGORY_MODEL_API_KEY = process.env.CATEGORY_MODEL_API_KEY || "category"; // replace if different

// helper: find the model ID by API key
async function findModelIdByApiKey(apiKey) {
  // client.itemTypes.list() returns models; each has attributes.api_key and id
  const itemTypes = await client.itemTypes.list();
  const match = itemTypes.find((t) => t.attributes.api_key === apiKey);
  if (!match) throw new Error(`Model with api_key="${apiKey}" not found. Check Schema > model > Settings for correct api_key.`);
  return match.id;
}

async function createIfMissing(modelApiKey, entries) {
  const modelId = await findModelIdByApiKey(modelApiKey);

  // list existing to avoid duplicates based on slug
  const existing = await client.items.list({ filter: { item_type: modelId } });
  const existingSlugs = new Set(existing.map(it => it.attributes.slug));

  for (const e of entries) {
    if (existingSlugs.has(e.slug)) {
      console.log(`[skip] ${modelApiKey} "${e.name}" (slug ${e.slug}) already exists`);
      continue;
    }

    // creation payload: set item_type as object with type item_type and id the model id
    const payload = {
      item_type: { type: "item_type", id: modelId },
      // set fields — adjust keys if your fields use different API keys
      name: e.name,
      slug: e.slug,
      short_description: e.short_description,
      order: e.order || 0
    };

    try {
      const created = await client.items.create(payload);
      // publish immediately (optional) — comment out if you want drafts
      await client.items.publish({ items: [{ type: "item", id: created.id }] });
      console.log(`[created] ${modelApiKey} "${e.name}" id=${created.id}`);
    } catch (err) {
      console.error(`[error creating ${e.name}]`, err.response || err);
    }
  }
}

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error("Please set DATOCMS_API_TOKEN environment variable (full-access CMA token).");
    process.exit(1);
  }

  // 3 Chains
  const chains = [
    { name: "Solana", slug: "solana", short_description: "Lightning-fast, low-cost blockchain for scalable dapps.", order: 1 },
    { name: "Ethereum", slug: "ethereum", short_description: "The leading smart contract platform powering DeFi and NFTs.", order: 2 },
    { name: "Polygon", slug: "polygon", short_description: "Layer 2 network bringing scalability to Ethereum.", order: 3 },
  ];

  // 3 Categories
  const categories = [
    { name: "DeFi", slug: "defi", short_description: "Decentralized finance — swaps, lending, yield.", order: 1 },
    { name: "NFTs", slug: "nft", short_description: "Marketplaces, minting tools, and NFT analytics.", order: 2 },
    { name: "Gaming", slug: "gaming", short_description: "Blockchain games, on-chain collectibles, and P2E.", order: 3 },
  ];

  try {
    console.log("Seeding Chains...");
    await createIfMissing(CHAIN_MODEL_API_KEY, chains);

    console.log("Seeding Categories...");
    await createIfMissing(CATEGORY_MODEL_API_KEY, categories);

    console.log("Done.");
  } catch (err) {
    console.error("Fatal error", err);
  }
}

main();

