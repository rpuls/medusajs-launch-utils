#!/usr/bin/env node

const { prepareEnvironment, initializeDatabase, reportDeploy } = require('../src/initializeBackend');
const { redact } = require('../src/utils');

async function initialize() {
  try {
    await prepareEnvironment();
    await initializeDatabase();
    await reportDeploy();
    console.log('Backend initialized successfully');
  } catch (error) {
    console.error('Error initializing backend:', redact(error.message));
    process.exit(1);
  }
}

initialize();
