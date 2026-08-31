#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const { checkBackend } = require('../src/awaitBackendReady');
const { redact } = require('../src/utils');

// Load environment variables from .env.local if it exists
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });
// Load environment variables from .env if it exists
dotenv.config({ quiet: true });

const backendUrl = (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000') + '/key-exchange';

checkBackend(backendUrl)
  .then(() => console.log('Backend is ready'))
  .catch((error) => {
    console.error('Error waiting for backend:', redact(error.message));
    process.exit(1);
  });