// analyze-dapps.mjs
// Script to analyze all dapps and identify issues with GoldRush detection and links

import { buildClient } from "@datocms/cma-client-node";
import fetch from 'node-fetch';

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

// GoldRush chains list (same as in the frontend)
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
  // Common variations/aliases
  'op mainnet', 'arbitrum', 'starknet', 'polygon zk evm', 'polygon zk-evm',
  'zk sync era', 'zksync', 'bsc', 'binance smart chain', 'bnb', 'matic',
  'avalanche', 'avax', 'avalanche cchain', 'avalanche c chain'
];

function normalizeChainName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.toLowerCase().trim();
}

function isGoldRushChain(chainName) {
  if (!chainName || typeof chainName !== 'string') return false;
  const normalized = normalizeChainName(chainName);
  
  const cleaned = normalized
    .replace(/\s+(mainnet|testnet|network|chain)$/i, '')
    .replace(/^(the\s+)/i, '')
    .trim();
  
  // Exact match
  for (const goldRushChain of GOLDRUSH_CHAINS) {
    const goldRushNormalized = normalizeChainName(goldRushChain);
    const goldRushCleaned = goldRushNormalized
      .replace(/\s+(mainnet|testnet|network|chain)$/i, '')
      .replace(/^(the\s+)/i, '')
      .trim();
    
    if (normalized === goldRushNormalized || cleaned === goldRushCleaned) {
      return true;
    }
  }
  
  // Fuzzy match
  for (const goldRushChain of GOLDRUSH_CHAINS) {
    const goldRushNormalized = normalizeChainName(goldRushChain);
    const goldRushCleaned = goldRushNormalized
      .replace(/\s+(mainnet|testnet|network|chain)$/i, '')
      .replace(/^(the\s+)/i, '')
      .trim();
    
    if (normalized.includes(goldRushNormalized) || goldRushNormalized.includes(normalized) ||
        cleaned.includes(goldRushCleaned) || goldRushCleaned.includes(cleaned)) {
      return true;
    }
  }
  
  return false;
}

async function analyzeDapps() {
  try {
    console.log('🔍 Analyzing all dapps...\n');

    const dappModelId = await findModelIdByApiKey('dapp');
    const allDapps = await client.items.list({ 
      filter: { type: dappModelId }
    });

    console.log(`📊 Total dapps: ${allDapps.length}\n`);

    const issues = {
      noGoldRush: [],
      noLinks: [],
      missingData: []
    };

    for (const dapp of allDapps) {
      const title = dapp.attributes?.title || dapp.title || 'Unknown';
      const id = dapp.id;
      
      // Check GoldRush - get chains from relationship field
      let chainNames = [];
      if (dapp.relationships?.chains?.data && Array.isArray(dapp.relationships.chains.data)) {
        // Need to fetch chain details
        for (const chainRef of dapp.relationships.chains.data) {
          try {
            const chain = await client.items.find(chainRef.id);
            const chainName = chain.attributes?.name || chain.name;
            if (chainName) chainNames.push(chainName);
          } catch (e) {
            // Skip if chain not found
          }
        }
      }
      const alchemyData = dapp.attributes?.alchemyRecentActivity 
        ? (typeof dapp.attributes.alchemyRecentActivity === 'string' 
            ? JSON.parse(dapp.attributes.alchemyRecentActivity) 
            : dapp.attributes.alchemyRecentActivity)
        : null;
      
      const unifiedChains = alchemyData?.chains || [];
      const allChainNames = [...new Set([...chainNames, ...unifiedChains])];
      
      const isDappTitleGoldRush = isGoldRushChain(title);
      const isOnGoldRushChain = isDappTitleGoldRush || allChainNames.some(chainName => isGoldRushChain(chainName));
      
      if (!isOnGoldRushChain && (isGoldRushChain(title) || allChainNames.some(c => isGoldRushChain(c)))) {
        // Should be GoldRush but detection failed
        issues.noGoldRush.push({
          id,
          title,
          chains: allChainNames,
          reason: 'Detection logic issue'
        });
      }
      
      // Check links
      const websiteUrl = alchemyData?.websiteUrl || alchemyData?.website;
      const twitterUrl = alchemyData?.twitterUrl || (alchemyData?.twitter && alchemyData.twitter.startsWith('http') ? alchemyData.twitter : null);
      const githubUrl = alchemyData?.githubUrl;
      const discordUrl = alchemyData?.discordUrl;
      const documentationUrl = alchemyData?.documentationUrl;
      const defillamaUrl = dapp.attributes?.defillamaUrl || dapp.defillamaUrl;
      const alchemyUrl = alchemyData?.slug ? `https://dapp-store.alchemy.com/dapps/${alchemyData.slug}` : null;
      
      const hasAnyLink = websiteUrl || twitterUrl || githubUrl || discordUrl || documentationUrl || defillamaUrl || alchemyUrl;
      
      if (!hasAnyLink) {
        issues.noLinks.push({
          id,
          title,
          alchemyData: !!alchemyData
        });
      }
      
      // Check missing data
      if (!alchemyData && !dapp.attributes?.defillamaUrl) {
        issues.missingData.push({
          id,
          title,
          hasAlchemy: !!alchemyData,
          hasDefiLlama: !!dapp.attributes?.defillamaUrl
        });
      }
    }

    // Report
    console.log('📋 ANALYSIS RESULTS:\n');
    
    if (issues.noGoldRush.length > 0) {
      console.log(`⚠️  Dapps that should show GoldRush section (${issues.noGoldRush.length}):`);
      issues.noGoldRush.slice(0, 10).forEach(issue => {
        console.log(`   - ${issue.title} (${issue.id})`);
        console.log(`     Chains: ${issue.chains.join(', ') || 'none'}`);
      });
      if (issues.noGoldRush.length > 10) {
        console.log(`   ... and ${issues.noGoldRush.length - 10} more`);
      }
      console.log('');
    }
    
    if (issues.noLinks.length > 0) {
      console.log(`🔗 Dapps with no links (${issues.noLinks.length}):`);
      issues.noLinks.slice(0, 10).forEach(issue => {
        console.log(`   - ${issue.title} (${issue.id})`);
        console.log(`     Has Alchemy data: ${issue.alchemyData}`);
      });
      if (issues.noLinks.length > 10) {
        console.log(`   ... and ${issues.noLinks.length - 10} more`);
      }
      console.log('');
    }
    
    if (issues.missingData.length > 0) {
      console.log(`📊 Dapps with missing data (${issues.missingData.length}):`);
      issues.missingData.slice(0, 10).forEach(issue => {
        console.log(`   - ${issue.title} (${issue.id})`);
      });
      if (issues.missingData.length > 10) {
        console.log(`   ... and ${issues.missingData.length - 10} more`);
      }
      console.log('');
    }
    
    console.log(`✅ Analysis complete!`);
    console.log(`   Total dapps: ${allDapps.length}`);
    console.log(`   Should show GoldRush: ${issues.noGoldRush.length}`);
    console.log(`   Missing links: ${issues.noLinks.length}`);
    console.log(`   Missing data: ${issues.missingData.length}`);

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
  console.error('❌ DATOCMS_API_TOKEN environment variable is required');
  process.exit(1);
}

analyzeDapps();

