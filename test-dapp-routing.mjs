// test-dapp-routing.mjs - Test if foundational chains can be queried
import { datoFetch } from './lib/datocms.js';

const foundationalChains = [
  { name: 'Ethereum', id: 'bK4tvNH9Q4i8hm6Lo83TlA' },
  { name: 'Polygon zkEVM', id: 'U0GkrJ7gTviSQvmbhRuHaQ' },
  { name: 'Base', id: 'WLt5ET-_QlOVmWCLx6XoTQ' },
  { name: 'StarkNet', id: 'LvMNW5JjSoC69fyjfiiOhA' },
  { name: 'OP Mainnet', id: 'UuX9KjEyS8avV8KPWLQusw' }
];

const QUERY = `
  query DappById($id: ItemId!) {
    dapp(filter: { id: { eq: $id } }) {
      id
      title
      shortDescription
    }
  }
`;

async function main() {
  console.log('🧪 Testing foundational chain routing...\n');
  
  for (const chain of foundationalChains) {
    try {
      const result = await datoFetch(QUERY, { id: chain.id });
      
      if (result.dapp) {
        console.log(`✅ ${chain.name}: FOUND`);
        console.log(`   ID: ${result.dapp.id}`);
        console.log(`   Title: ${result.dapp.title}`);
        console.log(`   URL would be: /dapps/${chain.id}\n`);
      } else {
        console.log(`❌ ${chain.name}: NOT FOUND in GraphQL result\n`);
      }
    } catch (error) {
      console.log(`❌ ${chain.name}: ERROR - ${error.message}\n`);
    }
  }
}

main().catch(console.error);

