const axios = require('axios');
const { spawn } = require('child_process');
const { withRetry, fetchMeilisearchKey } = require('./utils');

const runCommand = (command, env) => {
  const [cmd, ...args] = command.split(' ');
  const childProcess = spawn(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env }
  });

  return new Promise((resolve, reject) => {
    childProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
        return;
      }
      resolve();
    });
  });
};

const fetchMedusaPublishableApiKey = async (backendUrl) => {
  console.log('Attempting to fetch Medusa publishable key...');
  const operation = async () => {
    const response = await axios.get(`${backendUrl}/key-exchange`);
    console.log('Medusa key response:', response.data);

    const key = response.data?.publishableApiKey;
    if (!key) {
      throw new Error('Invalid Medusa key format received');
    }
    return key;
  };

  return await withRetry(operation);
};


const launchStorefront = async (command, config) => {
  if (!command || !['start', 'build', 'dev'].includes(command)) {
    throw new Error('Please provide a valid command: "start", "build", or "dev".');
  }

  // Handle Medusa publishable key
  let publishableKey = config.publishableKey;
  console.log('Initial NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:', publishableKey);

  if (!publishableKey) {
    console.log('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not defined. Attempting to fetch...');
    publishableKey = await fetchMedusaPublishableApiKey(config.backendUrl);
    if (!publishableKey) {
      throw new Error('Failed to fetch Medusa publishable key. Please ensure the backend is running and accessible.');
    }
    console.log('Medusa publishable key fetched successfully.');
  } else {
    console.log('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is already set.');
  }

  // Handle Meilisearch search key
  let searchKey = config.searchConfig?.searchKey;
  const { apiKey: masterKey, endpoint } = config.searchConfig || {};
  console.log('Initial NEXT_PUBLIC_SEARCH_API_KEY:', searchKey);

  if (masterKey && endpoint && !searchKey) {
    console.log('Meilisearch configuration detected. Attempting to fetch search key...');
    searchKey = await fetchMeilisearchKey(endpoint, masterKey, 'search');
    if (!searchKey) {
      console.warn('Failed to fetch Meilisearch search key. Search functionality may be limited.');
    } else {
      console.log('Meilisearch search key fetched successfully.');
    }
  }

  let nextCommand;
  if (command === 'start') {
    nextCommand = `next start -p ${config.port || '3000'}`;
  } else if (command === 'build') {
    nextCommand = 'next build';
  } else { // command === 'dev'
    nextCommand = `next dev -p ${config.port || '8000'}`;
  }
  console.log(`Running command: ${nextCommand}`);

  try {
    const env = {
      NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: publishableKey,
      NEXT_PUBLIC_MEDUSA_BACKEND_URL: config.backendUrl
    };
    
    if (searchKey) {
      env.NEXT_PUBLIC_SEARCH_API_KEY = searchKey;
      env.NEXT_PUBLIC_SEARCH_ENDPOINT = endpoint;
    }

    await runCommand(nextCommand, env);
    console.log(`Command "${nextCommand}" completed successfully.`);
  } catch (error) {
    throw new Error(`Error running command: ${error.message}`);
  }
};

module.exports = {
  launchStorefront
};
