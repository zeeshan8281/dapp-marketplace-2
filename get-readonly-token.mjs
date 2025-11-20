// get-readonly-token.mjs - Get the readonly token for the new workspace
import { buildClient } from "@datocms/cma-client-node";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

async function getReadonlyToken() {
  try {
    console.log('🔍 Fetching readonly token for your workspace...\n');
    
    // Get the site info which contains the readonly token
    const site = await client.site.find();
    
    if (site.readonlyToken) {
      console.log('✅ Found readonly token!\n');
      console.log('📋 Add this to your .env.local file:');
      console.log(`DATOCMS_READONLY_TOKEN=${site.readonlyToken}\n`);
      console.log('💡 Or run this command:');
      console.log(`echo "DATOCMS_READONLY_TOKEN=${site.readonlyToken}" >> .env.local\n`);
      return site.readonlyToken;
    } else {
      console.log('⚠️  Readonly token not found in site info');
      console.log('💡 You can get it from: https://dashboard.datocms.com/settings/api-tokens');
      return null;
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.body) {
      console.error('Error details:', JSON.stringify(err.body, null, 2));
    }
    console.log('\n💡 Alternative: Get the readonly token from DatoCMS dashboard:');
    console.log('   1. Go to https://dashboard.datocms.com');
    console.log('   2. Select your workspace');
    console.log('   3. Go to Settings > API tokens');
    console.log('   4. Copy the "Read-only API token"');
    return null;
  }
}

if (!process.env.DATOCMS_API_TOKEN) {
  console.error('❌ DATOCMS_API_TOKEN environment variable is required');
  process.exit(1);
}

getReadonlyToken();

