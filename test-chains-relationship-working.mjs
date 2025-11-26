// test-chains-relationship-working.mjs - Test if chains relationship is now working
import { datoFetch } from './lib/datocms.js';

async function testChainsRelationship() {
  console.log('🔍 Testing chains relationship field...\n');
  
  // Test 1: Try to query chains with nested fields
  const QUERY_WITH_CHAINS = `
    query TestChainsRelationship {
      allDapps(first: 5) {
        id
        title
        chains {
          id
          name
        }
      }
    }
  `;
  
  try {
    console.log('📋 Test 1: Querying chains with nested fields...\n');
    const data = await datoFetch(QUERY_WITH_CHAINS);
    
    console.log('✅ Query succeeded! Chains relationship is working!\n');
    
    if (data.allDapps && data.allDapps.length > 0) {
      let dappsWithChains = 0;
      let totalChains = 0;
      
      data.allDapps.forEach((dapp, idx) => {
        const chainCount = dapp.chains?.length || 0;
        if (chainCount > 0) {
          dappsWithChains++;
          totalChains += chainCount;
          const chainNames = dapp.chains.map(c => c.name).join(', ');
          console.log(`   ${idx + 1}. "${dapp.title}": ${chainCount} chain(s) - [${chainNames}]`);
        } else {
          console.log(`   ${idx + 1}. "${dapp.title}": no chains linked`);
        }
      });
      
      console.log(`\n📊 Summary:`);
      console.log(`   Dapps checked: ${data.allDapps.length}`);
      console.log(`   Dapps with chains: ${dappsWithChains}`);
      console.log(`   Total chain relationships: ${totalChains}`);
      
      if (dappsWithChains === 0) {
        console.log(`\n⚠️  No dapps have chains linked via relationships yet`);
        console.log(`   The field works, but you need to link chains to dapps in DatoCMS`);
      } else {
        console.log(`\n✅ Chains relationship is working and populated!`);
      }
    }
    
    return true;
  } catch (err) {
    console.error('❌ Query failed:', err.message);
    if (err.body) {
      const errors = err.body.errors || [];
      errors.forEach(e => {
        console.error(`   - ${e.message}`);
      });
    }
    return false;
  }
}

async function testChainsList() {
  console.log('\n📋 Test 2: Verifying chains are available...\n');
  
  const CHAINS_QUERY = `
    query TestChainsList {
      allChains(first: 10) {
        id
        name
      }
    }
  `;
  
  try {
    const data = await datoFetch(CHAINS_QUERY);
    console.log(`✅ Found ${data.allChains.length} chains available for linking`);
    console.log(`   Sample chains: ${data.allChains.slice(0, 5).map(c => c.name).join(', ')}`);
    return true;
  } catch (err) {
    console.error('❌ Failed to fetch chains:', err.message);
    return false;
  }
}

async function main() {
  const chainsAvailable = await testChainsList();
  const relationshipWorks = await testChainsRelationship();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL STATUS:');
  console.log('='.repeat(50));
  console.log(`   Chains available: ${chainsAvailable ? '✅' : '❌'}`);
  console.log(`   Relationship field works: ${relationshipWorks ? '✅' : '❌'}`);
  
  if (relationshipWorks) {
    console.log('\n✅ GraphQL schema has refreshed! Chains relationship is working.');
    console.log('💡 You can now use chains { id name } in your queries.');
  } else {
    console.log('\n⚠️  GraphQL schema may still be refreshing, or there\'s a configuration issue.');
    console.log('💡 Current workaround: Extract chains from alchemyRecentActivity JSON (which is working).');
  }
}

main();


