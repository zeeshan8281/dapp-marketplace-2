// add-7-chains-as-dapps.mjs - Add the 7 GoldRush chains as dapps
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

// The 7 chains to add as dapps
const CHAINS_AS_DAPPS = [
  {
    name: 'StarkNet',
    description: 'StarkNet is a permissionless decentralized ZK-Rollup operating as an L2 network over Ethereum, enabling any dApp to achieve unlimited scale for its computation.',
    category: 'Layer 2 Blockchains',
    chains: ['StarkNet'],
    websiteUrl: 'https://starknet.io',
    twitterUrl: 'https://twitter.com/StarkNetEco',
    documentationUrl: 'https://docs.starknet.io'
  },
  {
    name: 'Cronos',
    description: 'Cronos is an open-source, public blockchain network that aims to massively scale the DeFi and decentralized application ecosystem.',
    category: 'Layer 1 Blockchains',
    chains: ['Cronos'],
    websiteUrl: 'https://cronos.org',
    twitterUrl: 'https://twitter.com/cronos_chain',
    documentationUrl: 'https://docs.cronos.org'
  },
  {
    name: 'Polygon zkEVM',
    description: 'Polygon zkEVM is a zero-knowledge scaling solution that provides EVM equivalence, enabling seamless deployment of Ethereum dApps with lower transaction costs.',
    category: 'Layer 2 Blockchains',
    chains: ['Polygon zkEVM'],
    websiteUrl: 'https://polygon.technology/polygon-zkevm',
    twitterUrl: 'https://twitter.com/0xPolygon',
    documentationUrl: 'https://docs.polygon.technology'
  },
  {
    name: 'Ethereum',
    description: 'Ethereum is a decentralized platform that runs smart contracts, enabling developers to build and deploy decentralized applications.',
    category: 'Layer 1 Blockchains',
    chains: ['Ethereum'],
    websiteUrl: 'https://ethereum.org',
    twitterUrl: 'https://twitter.com/ethereum',
    documentationUrl: 'https://ethereum.org/en/developers/docs'
  },
  {
    name: 'Solana',
    description: 'Solana is a high-performance blockchain supporting builders around the world creating crypto apps that scale today.',
    category: 'Layer 1 Blockchains',
    chains: ['Solana'],
    websiteUrl: 'https://solana.com',
    twitterUrl: 'https://twitter.com/solana',
    documentationUrl: 'https://docs.solana.com'
  },
  {
    name: 'OP Mainnet',
    description: 'OP Mainnet (formerly Optimism) is an Ethereum Layer 2 scaling solution that uses optimistic rollups to achieve lower fees and faster transactions.',
    category: 'Layer 2 Blockchains',
    chains: ['OP Mainnet', 'Optimism'],
    websiteUrl: 'https://optimism.io',
    twitterUrl: 'https://twitter.com/optimismFND',
    documentationUrl: 'https://docs.optimism.io'
  },
  {
    name: 'Arbitrum',
    description: 'Arbitrum is a Layer 2 scaling solution for Ethereum that uses optimistic rollups to enable faster and cheaper transactions.',
    category: 'Layer 2 Blockchains',
    chains: ['Arbitrum'],
    websiteUrl: 'https://arbitrum.io',
    twitterUrl: 'https://twitter.com/arbitrum',
    documentationUrl: 'https://docs.arbitrum.io'
  }
];

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

// Check if dapp already exists
async function dappExists(dappModelId, dappName) {
  const existingDapps = await client.items.list({
    filter: { 
      type: dappModelId,
      fields: {
        title: { eq: dappName }
      }
    }
  });
  return existingDapps.length > 0;
}

// Create dapp
async function createDapp(dappModelId, chainData) {
  try {
    // Prepare alchemyRecentActivity data
    const alchemyData = {
      name: chainData.name,
      slug: chainData.name.toLowerCase().replace(/\s+/g, '-'),
      description: chainData.description,
      chains: chainData.chains,
      categories: [chainData.category],
      websiteUrl: chainData.websiteUrl,
      twitterUrl: chainData.twitterUrl,
      documentationUrl: chainData.documentationUrl,
      source: 'goldrush_chain',
      isChain: true, // Mark as chain
      verified: true,
      featured: true
    };

    const payload = {
      item_type: { type: "item_type", id: dappModelId },
      title: chainData.name,
      short_description: chainData.description,
      category_defillama: chainData.category,
      alchemy_recent_activity: JSON.stringify(alchemyData),
    };

    const created = await client.items.create(payload);
    await client.items.publish(created.id);
    return created;
  } catch (err) {
    console.error(`[error creating ${chainData.name}]`, err.body?.data || err.message || err);
    throw err;
  }
}

// Main function
async function main() {
  if (!process.env.DATOCMS_API_TOKEN) {
    console.error('❌ DATOCMS_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🔍 Finding Dapp model...\n');
    const dappModelId = await findModelIdByApiKey('dapp');
    console.log(`✅ Found Dapp model (id: ${dappModelId})\n`);

    console.log(`📋 Adding ${CHAINS_AS_DAPPS.length} chains as dapps...\n`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const chainData of CHAINS_AS_DAPPS) {
      const exists = await dappExists(dappModelId, chainData.name);
      
      if (exists) {
        console.log(`⏭️  Skipping "${chainData.name}" - already exists as dapp`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`➕ Creating "${chainData.name}" as dapp...`);
        const created = await createDapp(dappModelId, chainData);
        console.log(`   ✅ Created (id: ${created.id})`);
        createdCount++;
      } catch (err) {
        console.error(`   ❌ Failed to create "${chainData.name}":`, err.message);
      }
    }

    console.log(`\n✅ Complete!`);
    console.log(`   Created: ${createdCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total: ${CHAINS_AS_DAPPS.length}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();

