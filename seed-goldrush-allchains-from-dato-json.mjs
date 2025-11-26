// seed-goldrush-allchains-from-dato-json.mjs
// Seed all non-testnet GoldRush chains from dato-chains.json into DatoCMS
import { buildClient } from "@datocms/cma-client-node";
import fs from "fs";
import path from "path";

/*
  USAGE:
  - Ensure you have the goldrush-docs repo checked out locally.
    This script currently points to:
      /Users/zeeshan/Downloads/goldrush-docs-main/data/dato-chains.json
    Update JSON_PATH below if your path is different.
  - Run (from project root):
      DATOCMS_API_TOKEN=xxxxx node seed-goldrush-allchains-from-dato-json.mjs

  Behaviour:
  - Reads all chains from dato-chains.json
  - Filters out testnets (testnet === true)
  - For each remaining chain:
      - name       -> Chain.name
      - Optionally writes description into a text field on the Chain model
        if such a field exists (tries api_keys: 'description', 'overview').
  - Creates chains that don't exist yet, updates ones that do.
*/

const JSON_PATH =
  "/Users/zeeshan/Downloads/goldrush-docs-main/data/dato-chains.json";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

// Helper: Find model ID by API key
async function findModelIdByApiKey(apiKey) {
  const itemTypes = await client.itemTypes.list();
  const match = itemTypes.find((t) => {
    const modelApiKey = t.attributes?.api_key || t.api_key;
    return modelApiKey === apiKey;
  });
  if (!match) throw new Error(`Model with api_key="${apiKey}" not found.`);
  return match.id;
}

// Discover an optional description field on the Chain model
async function findDescriptionFieldApiKey(chainModelId) {
  try {
    const fields = await client.fields.list(chainModelId);
    const preferredApiKeys = ["description", "overview"];
    const hit = fields.find((f) =>
      preferredApiKeys.includes(
        (f.attributes?.api_key || f.api_key || "").toLowerCase()
      )
    );
    return hit ? hit.attributes?.api_key || hit.api_key : null;
  } catch (err) {
    console.warn(
      "[warn] Failed to inspect fields for Chain model; proceeding without description field.",
      err.message || err
    );
    return null;
  }
}

// Create or update a chain item
async function createOrUpdateChain(chainModelId, chain, descriptionFieldApiKey) {
  const name = chain.displayname;
  const description = chain.description || "";

  if (!name) {
    console.warn(
      `[skip] Chain record without displayname (chainname: ${chain.chainname})`
    );
    return null;
  }

  try {
    const existing = await client.items.list({
      filter: {
        type: chainModelId,
        fields: {
          name: { eq: name },
        },
      },
    });

    const payload = {
      item_type: { type: "item_type", id: chainModelId },
      name,
    };

    if (descriptionFieldApiKey && description && description !== "-") {
      payload[descriptionFieldApiKey] = description;
    }

    if (existing.length > 0) {
      const current = existing[0];
      const updated = await client.items.update(current.id, payload);
      console.log(
        `[updated] "${name}" (${chain.chainname})${
          descriptionFieldApiKey ? " with description" : ""
        }`
      );
      return { id: updated.id, isNew: false };
    } else {
      const created = await client.items.create(payload);
      // Try to publish; ignore publish errors so script can continue
      try {
        await client.items.publish(created.id);
      } catch (e) {
        console.warn(
          `[warn] Created but could not publish "${name}":`,
          e.body?.data || e.message || e
        );
      }
      console.log(
        `[created] "${name}" (${chain.chainname})${
          descriptionFieldApiKey ? " with description" : ""
        }`
      );
      return { id: created.id, isNew: true };
    }
  } catch (err) {
    console.error(
      `[error] Failed to create/update "${name}" (${chain.chainname}):`,
      err.body?.data || err.message || err
    );
    return null;
  }
}

async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error("❌ DATOCMS_API_TOKEN environment variable is required");
    process.exit(1);
  }

  const resolvedPath = path.resolve(JSON_PATH);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ dato-chains.json not found at: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`📄 Reading chains from: ${resolvedPath}\n`);
  const raw = fs.readFileSync(resolvedPath, "utf8");
  const parsed = JSON.parse(raw);
  const all = parsed?.data?.allBlockchains || [];

  if (!Array.isArray(all) || all.length === 0) {
    console.error("❌ No chains found in dato-chains.json");
    process.exit(1);
  }

  // Filter out testnets
  const mainnets = all.filter((c) => !c.testnet);
  console.log(
    `🔎 Total chains in JSON: ${all.length} (non-testnet: ${mainnets.length})\n`
  );

  try {
    const chainModelId = await findModelIdByApiKey("chain");
    console.log(`✅ Found Chain model (id: ${chainModelId})`);

    const descriptionFieldApiKey = await findDescriptionFieldApiKey(
      chainModelId
    );
    if (descriptionFieldApiKey) {
      console.log(
        `✏️  Will write descriptions to field: "${descriptionFieldApiKey}"\n`
      );
    } else {
      console.log(
        "ℹ️  No description/overview field found on Chain model; only names will be stored.\n"
      );
    }

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const chain of mainnets) {
      const result = await createOrUpdateChain(
        chainModelId,
        chain,
        descriptionFieldApiKey
      );
      if (result && result.id) {
        if (result.isNew) created++;
        else updated++;
      } else {
        failed++;
      }
      // Be gentle with API rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log("\n✅ GoldRush chain import complete!");
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Failed:  ${failed}`);
  } catch (err) {
    console.error("❌ Fatal error:", err.message || err);
    process.exit(1);
  }
}

main();



