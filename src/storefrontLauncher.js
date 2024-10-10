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

const fetchApiKey = async (url, retries = 5) => {
  console.log(`Attempting to fetch API key from: ${url}`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url);
      console.log(`Attempt ${attempt} - Response status: ${response.status}`);

      const apiKey = response.data;
      console.log('API key response:', apiKey);

      if (!apiKey || !apiKey.publishableApiKey) {
        throw new Error('Invalid API key format received');
      }

      return apiKey.publishableApiKey;
    } catch (error) {
      console.error(`Error fetching API key (Attempt ${attempt}/${retries}): ${error.message}`);
      if (attempt < retries) {
        console.log(`Retrying in 3 seconds...`);
        await delay(3000);
      } else {
        console.error('All retry attempts exhausted. Unable to fetch API key.');
        return null;
      }
    }
  }
};

const launchStorefront = async (command, backendUrl, port) => {
  if (!command || !['start', 'build', 'dev'].includes(command)) {
    throw new Error('Please provide a valid command: "start", "build", or "dev".');
  }

  let publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

  console.log('Initial NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:', publishableKey);

  if (!publishableKey) {
    console.log('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not defined. Attempting to fetch...');
    publishableKey = await fetchApiKey(`${backendUrl}/key-exchange`);
    if (!publishableKey) {
      throw new Error('Failed to fetch API key after multiple attempts. Please ensure the backend is running and the key exchange endpoint is accessible.');
    }
    console.log('API key fetched successfully.');
  } else {
    console.log('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is already set.');
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
    await runCommand(nextCommand, { NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: publishableKey });
    console.log(`Command "${nextCommand}" completed successfully.`);
  } catch (error) {
    throw new Error(`Error running command: ${error.message}`);
  }
};

module.exports = {
  launchStorefront
};
