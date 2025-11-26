// update-chain-logos.mjs - Update chain dapp logos from goldrush-docs
import { buildClient } from "@datocms/cma-client-node";
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const DATOCMS_API_TOKEN = process.env.DATOCMS_API_TOKEN;
const CHAINS_JSON_PATH = "/Users/zeeshan/Downloads/goldrush-docs-main/data/dato-chains.json";

if (!DATOCMS_API_TOKEN) {
  console.error('❌ DATOCMS_API_TOKEN environment variable is required');
  process.exit(1);
}

const client = buildClient({ apiToken: DATOCMS_API_TOKEN });

// Normalize chain name for matching
function normalizeChainName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
}

async function main() {
  try {
    console.log('🚀 Updating chain logos from goldrush-docs...\n');
    
    // Load chains data
    const chainsData = JSON.parse(fs.readFileSync(CHAINS_JSON_PATH, 'utf8'));
    const allChains = chainsData.data.allBlockchains
      .filter(c => !c.testnet && c.displayname && !c.displayname.toLowerCase().includes('testnet'))
      .map(c => ({
        name: c.displayname,
        // Get logo URL - prioritize: imgsvg > imgwhite > imgblack
        logoUrl: c.imgsvg?.url || c.imgwhite?.url || c.imgblack?.url || null,
        support: c.support // foundational, frontier, community, archived
      }))
      .filter(c => c.logoUrl) // Only chains with logos
      .filter((c, idx, arr) => arr.findIndex(x => x.name === c.name) === idx); // Remove duplicates
    
    console.log(`📋 Found ${allChains.length} chains with logos in goldrush-docs\n`);
    
    // Create lookup map
    const chainMap = new Map();
    allChains.forEach(chain => {
      const normalized = normalizeChainName(chain.name);
      chainMap.set(normalized, chain);
      // Also store by exact name (case-insensitive)
      chainMap.set(chain.name.toLowerCase().trim(), chain);
    });
    
    // Find Dapp model
    const itemTypes = await client.itemTypes.list();
    const dappModel = itemTypes.find(t => {
      const apiKey = t.attributes?.api_key || t.api_key;
      return apiKey === 'dapp';
    });
    
    if (!dappModel) {
      console.error('❌ Dapp model not found');
      process.exit(1);
    }
    
    // Find screenshots field
    const fields = await client.fields.list(dappModel.id);
    const screenshotsField = fields.find(f => {
      const apiKey = f.attributes?.api_key || f.api_key;
      return apiKey === 'screenshots';
    });
    
    if (!screenshotsField) {
      console.error('❌ Screenshots field not found on Dapp model');
      process.exit(1);
    }
    
    // Fetch all dapps (paginated)
    const allDapps = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    
    while (hasMore) {
      const dapps = await client.items.list({
        filter: { type: dappModel.id },
        page: { offset, limit }
      });
      allDapps.push(...dapps);
      if (dapps.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }
    
    console.log(`📦 Found ${allDapps.length} dapps in DatoCMS\n`);
    
    // Filter for foundational and frontier chains only
    const targetSupports = ['foundational', 'frontier'];
    const targetChains = allChains.filter(c => targetSupports.includes(c.support));
    const targetChainMap = new Map();
    targetChains.forEach(chain => {
      const normalized = normalizeChainName(chain.name);
      targetChainMap.set(normalized, chain);
      targetChainMap.set(chain.name.toLowerCase().trim(), chain);
    });
    
    console.log(`🎯 Targeting ${targetChains.length} foundational and frontier chains\n`);
    
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    
    // Process each dapp
    for (const dapp of allDapps) {
      const dappTitle = dapp.title || '';
      const normalizedTitle = normalizeChainName(dappTitle);
      
      // Check if this dapp matches a target chain
      const chainData = targetChainMap.get(normalizedTitle) || targetChainMap.get(dappTitle.toLowerCase().trim());
      
      if (!chainData) {
        skipped++;
        continue;
      }
      
      if (!chainData.logoUrl) {
        console.log(`⚠️  ${dappTitle}: No logo URL found in chain data (matched to: ${chainData.name})`);
        skipped++;
        continue;
      }
      
      // Debug: Log what we're trying to match
      if (dappTitle === 'Ethereum' || dappTitle === 'Solana' || dappTitle === 'Base') {
        console.log(`🔍 Debug: ${dappTitle} -> normalized: "${normalizedTitle}" -> chainData:`, chainData ? {name: chainData.name, logoUrl: chainData.logoUrl} : 'NOT FOUND');
      }
      
      // Check if dapp already has screenshots
      const existingScreenshots = dapp.screenshots || [];
      const hasLogo = existingScreenshots.length > 0 && existingScreenshots[0]?.url;
      
      // Skip if logo already exists and matches
      if (hasLogo && existingScreenshots[0].url === chainData.logoUrl) {
        console.log(`⏭️  ${dappTitle}: Logo already set (${chainData.logoUrl})`);
        skipped++;
        continue;
      }
      
      try {
        // Since logos are already on DatoCMS (datocms-assets.com),
        // we'll store the logo URL in alchemyRecentActivity JSON
        // The frontend already checks alchemyRecentActivity.logoUrl for logos
        
        let alchemyData = {};
        try {
          if (dapp.alchemy_recent_activity) {
            alchemyData = typeof dapp.alchemy_recent_activity === 'string' 
              ? JSON.parse(dapp.alchemy_recent_activity) 
              : dapp.alchemy_recent_activity;
          }
        } catch (e) {
          // Ignore parse errors, start fresh
        }
        
        // Update logo URL in alchemy_recent_activity
        alchemyData.logoUrl = chainData.logoUrl;
        alchemyData.logoCdnUrl = chainData.logoUrl; // Also set CDN URL
        
        // Update dapp with logo URL in alchemy_recent_activity
        const payload = {
          alchemy_recent_activity: JSON.stringify(alchemyData)
        };
        
        await client.items.update(dapp.id, payload);
        
        console.log(`✅ ${dappTitle}: Updated logo URL in alchemyRecentActivity: ${chainData.logoUrl}`);
        updated++;
      } catch (error) {
        console.error(`❌ ${dappTitle}: Failed to update logo - ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`\n✨ Done!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

