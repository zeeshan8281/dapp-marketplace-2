// test-chains-relationship.mjs - Test if chain relationships work properly
import { datoFetch } from './lib/datocms.js';

const TEST_QUERY = `
  query TestDappChains {
    allDapps(first: 10) {
      id
      title
      chains {
        ... on ChainRecord {
          id
          name
        }
      }
    }
  }
`;

async function main() {
  try {
    console.log('🔍 Testing chain relationships on dapps...\n');
    
    const data = await datoFetch(TEST_QUERY);
    
    if (data.allDapps && data.allDapps.length > 0) {
      console.log(`✅ Successfully fetched ${data.allDapps.length} dapps with chain relationships!\n`);
      
      let dappsWithChains = 0;
      let totalChains = 0;
      
      data.allDapps.forEach((dapp, idx) => {
        const chainCount = dapp.chains?.length || 0;
        const chains = dapp.chains?.map(c => c.name).join(', ') || 'none';
        
        if (chainCount > 0) {
          dappsWithChains++;
          totalChains += chainCount;
          console.log(`   ${idx + 1}. "${dapp.title}": ${chainCount} chain(s) - [${chains}]`);
        } else {
          console.log(`   ${idx + 1}. "${dapp.title}": no chains linked`);
        }
      });
      
      console.log(`\n📊 Summary:`);
      console.log(`   Dapps with chains: ${dappsWithChains}/${data.allDapps.length}`);
      console.log(`   Total chain relationships: ${totalChains}`);
      
      if (dappsWithChains === 0) {
        console.log(`\n⚠️  No dapps have chains linked via relationships`);
        console.log(`   Chains are currently being extracted from alchemyRecentActivity JSON`);
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
    
    // Try alternative query syntax
    console.log('\n🔄 Trying alternative query syntax...\n');
    
    const ALT_QUERY = `
      query TestDappChainsAlt {
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
      const altData = await datoFetch(ALT_QUERY);
      console.log('✅ Alternative query worked!');
      console.log(JSON.stringify(altData, null, 2));
    } catch (altErr) {
      console.error('❌ Alternative query also failed:', altErr.message);
    }
  }
}

main();


