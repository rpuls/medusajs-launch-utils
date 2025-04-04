#!/usr/bin/env node

const { prepareEnvironment, seedOnce, reportDeploy,  } = require('../src/initializeBackend');

async function initialize() {
  try {
    await prepareEnvironment();
    await seedOnce();
    await reportDeploy();
    console.log('Backend initialized successfully');
  } catch (error) {
    console.error('Error initializing backend:', error);
    process.exit(1);
  }
}

initialize();
