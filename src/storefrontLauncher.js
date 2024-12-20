const axios = require('axios');
const { spawn } = require('child_process');
const { setTimeout } = require('timers/promises');

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

const delay = (ms) => setTimeout(ms);

const fetchKey = async (url, validator, retries = 5) => {
  console.log(`Attempting to fetch key from: ${url}`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url);
      console.log(`Attempt ${attempt} - Response status: ${response.status}`);

      const data = response.data;
      console.log('Response:', data);

      const key = validator(data);
      if (!key) {
        throw new Error('Invalid key format received');
      }

      return key;
    } catch (error) {
      console.error(`Error fetching key (Attempt ${attempt}/${retries}): ${error.message}`);
      if (attempt < retries) {
        console.log(`Retrying in 3 seconds...`);
        await delay(3000);
      } else {
        console.error('All retry attempts exhausted. Unable to fetch key.');
        return null;
      }
    }
  }
};

const validatePublishableKey = (data) => {
  return data?.publishableApiKey;
};

const validateMeilisearchKey = (data) => {
  const searchKey = data?.results?.find(key => 
    Array.isArray(key.actions) && 
    key.actions.length === 1 && 
    key.actions[0] === 'search'
  );
  return searchKey?.key;
};

const launchStorefront = async (command, backendUrl, port) => {
  if (!command || !['start', 'build', 'dev'].includes(command)) {
    throw new Error('Please provide a valid command: "start", "build", or "dev".');
  }

  let publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
  let searchKey = process.env.NEXT_PUBLIC_SEARCH_API_KEY;

  console.log('Initial NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:', publishableKey);
  console.log('Initial NEXT_PUBLIC_SEARCH_API_KEY:', searchKey);

  if (!publishableKey) {
    console.log('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not defined. Attempting to fetch...');
    publishableKey = await fetchKey(`${backendUrl}/key-exchange`, validatePublishableKey);
    if (!publishableKey) {
      throw new Error('Failed to fetch API key after multiple attempts. Please ensure the backend is running and the key exchange endpoint is accessible.');
    }
    console.log('API key fetched successfully.');
  } else {
    console.log('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is already set.');
  }

  if (process.env.MEILISEARCH_API_KEY && process.env.NEXT_PUBLIC_SEARCH_ENDPOINT && !searchKey) {
    console.log('Meilisearch configuration detected. Attempting to fetch search key...');
    searchKey = await fetchKey(`${process.env.NEXT_PUBLIC_SEARCH_ENDPOINT}/keys`, validateMeilisearchKey);
    if (!searchKey) {
      throw new Error('Failed to fetch Meilisearch search key after multiple attempts.');
    }
    console.log('Meilisearch search key fetched successfully.');
  }

  let nextCommand;
  if (command === 'start') {
    nextCommand = `next start -p ${port || '3000'}`;
  } else if (command === 'build') {
    nextCommand = 'next build';
  } else { // command === 'dev'
    nextCommand = `next dev -p ${port || '8000'}`;
  }
  console.log(`Running command: ${nextCommand}`);

  try {
    const env = {
      NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: publishableKey
    };
    
    if (searchKey) {
      env.NEXT_PUBLIC_SEARCH_API_KEY = searchKey;
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
