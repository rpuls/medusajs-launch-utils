#!/usr/bin/env node

const { checkBackend } = require('../src/awaitBackendReady');

const backendUrl = (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000') + '/key-exchange';

checkBackend(backendUrl)
  .then(() => console.log('Backend is ready'))
  .catch((error) => {
    console.error('Error waiting for backend:', error);
    process.exit(1);
  });