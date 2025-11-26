// check-graphql-schema.mjs - Check the actual GraphQL schema
import { datoFetch } from './lib/datocms.js';

const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      types {
        name
        kind
        fields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  }
`;

const SIMPLE_QUERY = `
  query {
    __type(name: "DappRecord") {
      name
      fields {
        name
        type {
          name
          kind
          ofType {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  }
`;

async function main() {
  try {
    console.log('🔍 Checking GraphQL schema for Dapp model...\n');
    
    const data = await datoFetch(SIMPLE_QUERY);
    
    if (data.__type) {
      console.log(`✅ Found DappRecord type\n`);
      console.log(`📋 Fields on DappRecord:\n`);
      
      const chainsField = data.__type.fields.find(f => f.name === 'chains');
      
      data.__type.fields.forEach((field) => {
        const typeName = field.type.name || 
                        field.type.ofType?.name || 
                        field.type.ofType?.ofType?.name || 
                        'Unknown';
        const kind = field.type.kind || 
                    field.type.ofType?.kind || 
                    field.type.ofType?.ofType?.kind || 
                    'Unknown';
        
        const marker = field.name === 'chains' ? ' 🔗' : '';
        console.log(`   ${field.name}${marker}: ${typeName} (${kind})`);
        
        if (field.name === 'chains') {
          console.log(`      ⚠️  This field is exposed as: ${typeName}`);
          if (typeName === 'String') {
            console.log(`      ❌ Problem: Should be a relationship, but GraphQL sees it as String`);
            console.log(`      💡 Solution: The GraphQL schema may need to refresh, or the field`);
            console.log(`         needs to be recreated as a proper links field`);
          }
        }
      });
      
      if (chainsField) {
        console.log(`\n🔍 Detailed chains field info:`);
        console.log(JSON.stringify(chainsField, null, 2));
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.body) {
      console.error('   Details:', JSON.stringify(err.body, null, 2));
    }
  }
}

main();


