// test-goldrush-detection.mjs - Test GoldRush chain detection
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

const GOLDRUSH_CHAINS = [
  'ethereum', 'base', 'gnosis', 'bnb smart chain', 'optimism', 'polygon',
  'berachain', 'axie/ronin', 'hyperevm', 'lens', 'linea', 'mantle', 'monad testnet',
  'oasis sapphire', 'palm', 'sei', 'zksync era', 'bitcoin', 'solana', 'unichain',
  'apechain', 'avalanche c-chain', 'boba bnb', 'gunzilla testnet', 'ink', 'scroll',
  'taiko', 'viction', 'world chain', 'zora', 'aurora', 'cronos', 'oasis', 'fantom',
  'moonbeam', 'moonriver', 'zetachain', 'beam', 'opbnb', 'dexalot', 'meldchain',
  'mirai testnet', 'numbers protocol', 'shrapnel', 'step network', 'uptn', 'xana chain',
  'blast', 'canto', 'celo', 'defi kingdoms', 'fraxtal', 'horizen eon', 'manta pacific',
  'merlin', 'metis', 'movement mevm', 'polygon zkevm',
  'op mainnet', 'arbitrum', 'starknet', 'polygon zk evm', 'polygon zk-evm',
  'zk sync era', 'zksync', 'bsc', 'binance smart chain', 'bnb', 'matic',
  'avalanche', 'avax', 'avalanche cchain', 'avalanche c chain',
  'bnb chain'
];

function normalizeChainName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^a-z0-9\s]/g, '').replace(/\s+(mainnet|testnet|network|chain)$/i, '').trim();
}

function isGoldRushChain(chainName) {
  if (!chainName || typeof chainName !== 'string') return false;
  const normalized = normalizeChainName(chainName);
  
  const cleaned = normalized.replace(/\s+(mainnet|testnet|network|chain)$/i, '').replace(/^(the\s+)/i, '').trim();
  
  for (const goldRushChain of GOLDRUSH_CHAINS) {
    const goldRushNormalized = normalizeChainName(goldRushChain);
    const goldRushCleaned = goldRushNormalized.replace(/\s+(mainnet|testnet|network|chain)$/i, '').replace(/^(the\s+)/i, '').trim();
    
    if (normalized === goldRushNormalized || cleaned === goldRushCleaned) {
      return true;
    }
    
    if (normalized.includes(goldRushNormalized) || goldRushNormalized.includes(normalized) ||
        cleaned.includes(goldRushCleaned) || goldRushCleaned.includes(cleaned)) {
      return true;
    }
  }
  
  return false;
}

async function testGoldRushDetection() {
  try {
    const dappModelId = await findModelIdByApiKey('dapp');
    const dapps = await client.items.list({ filter: { type: dappModelId } });
    
    console.log(`\n🔍 Testing GoldRush detection for ${dapps.length} dapps...\n`);
    
    let goldRushCount = 0;
    let noGoldRushCount = 0;
    
    for (const dapp of dapps) {
      const title = dapp.title;
      
      // Extract chains
      let chains = [];
      if (dapp.alchemy_recent_activity) {
        try {
          const data = JSON.parse(dapp.alchemy_recent_activity);
          chains = (data.chains || [])
            .filter(c => {
              const name = typeof c === 'string' ? c : c.name || c;
              return !(typeof name === 'string' && name.startsWith('rec') && name.length > 10);
            })
            .map(c => typeof c === 'string' ? c : c.name || c);
        } catch (e) {}
      }
      
      // Check if dapp is on GoldRush chain
      const isDappTitleGoldRush = isGoldRushChain(title);
      const hasGoldRushChain = chains.some(chain => isGoldRushChain(chain));
      const isOnGoldRush = isDappTitleGoldRush || hasGoldRushChain;
      
      if (isOnGoldRush) {
        goldRushCount++;
        const goldRushChains = chains.filter(c => isGoldRushChain(c));
        console.log(`✅ ${title}`);
        if (goldRushChains.length > 0) {
          console.log(`   GoldRush chains: ${goldRushChains.join(', ')}`);
        }
        if (isDappTitleGoldRush) {
          console.log(`   Title matches: ${title}`);
        }
      } else {
        noGoldRushCount++;
        console.log(`❌ ${title} - No GoldRush chains found`);
        if (chains.length > 0) {
          console.log(`   Chains: ${chains.join(', ')}`);
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Should show GoldRush section: ${goldRushCount}`);
    console.log(`   ❌ Should NOT show GoldRush section: ${noGoldRushCount}`);
    console.log(`   Total: ${dapps.length}`);
    
    if (goldRushCount === 0) {
      console.log(`\n⚠️  WARNING: No dapps detected as GoldRush! This might indicate a problem with chain matching.`);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

async function findModelIdByApiKey(apiKey) {
  const itemTypes = await client.itemTypes.list();
  const match = itemTypes.find((t) => {
    const modelApiKey = t.attributes?.api_key || t.api_key;
    return modelApiKey === apiKey;
  });
  if (!match) throw new Error(`Model with api_key="${apiKey}" not found.`);
  return match.id;
}

if (!process.env.DATOCMS_API_TOKEN) {
  console.error('❌ DATOCMS_API_TOKEN required');
  process.exit(1);
}

testGoldRushDetection();

