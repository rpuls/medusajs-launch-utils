#!/usr/bin/env node

const { launchStorefront } = require('../src/storefrontLauncher');

const command = process.argv[2];
const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
const port = process.env.PORT || '8000';

launchStorefront(command, backendUrl, port)
  .then(() => console.log('Storefront launched successfully'))
  .catch((error) => {
    console.error('Error launching storefront:', error);
    process.exit(1);
  });