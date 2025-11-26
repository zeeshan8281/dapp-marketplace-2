// test-chains-fetch.mjs - Test if chains are being fetched properly from DatoCMS
import { datoFetch } from './lib/datocms.js';

const TEST_QUERY = `
  query TestChains {
    allChains(first: 20, orderBy: name_ASC) {
      id
      name
    }
    _allChainsMeta {
      count
    }
  }
`;

async function main() {
  try {
    console.log('🔍 Testing chain fetching from DatoCMS...\n');
    
    const data = await datoFetch(TEST_QUERY);
    
    console.log(`✅ Successfully fetched chains!`);
    console.log(`📊 Total chains: ${data._allChainsMeta?.count || 0}\n`);
    
    if (data.allChains && data.allChains.length > 0) {
      console.log(`📋 First ${Math.min(20, data.allChains.length)} chains:\n`);
      data.allChains.forEach((chain, idx) => {
        console.log(`   ${idx + 1}. ${chain.name} (id: ${chain.id})`);
      });
    } else {
      console.log('⚠️  No chains found in DatoCMS');
    }
    
    // Also test if we can query chains via dapp relationships
    console.log('\n🔍 Testing chain relationships via dapps...\n');
    
    const DAPP_WITH_CHAINS_QUERY = `
      query TestDappChains {
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
    
    const dappData = await datoFetch(DAPP_WITH_CHAINS_QUERY);
    
    if (dappData.allDapps && dappData.allDapps.length > 0) {
      console.log(`📋 Checking ${dappData.allDapps.length} dapps for chain relationships:\n`);
      dappData.allDapps.forEach((dapp) => {
        const chainCount = dapp.chains?.length || 0;
        const chains = dapp.chains?.map(c => c.name).join(', ') || 'none';
        console.log(`   "${dapp.title}": ${chainCount} chain(s) - [${chains}]`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error fetching chains:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    console.error('\n💡 This might mean:');
    console.error('   1. The Chain model doesn\'t exist in DatoCMS');
    console.error('   2. The GraphQL schema hasn\'t refreshed yet');
    console.error('   3. There\'s a permissions issue with the API token');
  }
}

main();


