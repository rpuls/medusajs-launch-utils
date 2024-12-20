#!/usr/bin/env node

const { launchStorefront } = require('../src/storefrontLauncher');

const command = process.argv[2];

const config = {
  backendUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000',
  port: process.env.PORT || '8000',
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  searchConfig: {
    apiKey: process.env.MEILISEARCH_API_KEY,
    endpoint: process.env.NEXT_PUBLIC_SEARCH_ENDPOINT,
    searchKey: process.env.NEXT_PUBLIC_SEARCH_API_KEY
  }
};

launchStorefront(command, config)
  .then(() => console.log('Storefront launched successfully'))
  .catch((error) => {
    console.error('Error launching storefront:', error);
    process.exit(1);
  });
