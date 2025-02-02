const { setTimeout } = require('timers/promises');
const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');

const delay = (ms) => setTimeout(ms);

const appendToEnvFile = async (key, value) => {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create it
        await fs.writeFile(envPath, '', 'utf-8');
        console.log('Created new .env file');
      } else {
        throw error;
      }
    }
    
    // Check if key already exists in .env
    const keyRegex = new RegExp(`^${key}=.*$`, 'm');
    if (keyRegex.test(envContent)) {
      // Replace existing value
      const updatedContent = envContent.replace(keyRegex, `${key}=${value}`);
      await fs.writeFile(envPath, updatedContent, 'utf-8');
    } else {
      // Append new key-value pair
      await fs.appendFile(envPath, `\n${key}=${value}`);
    }
    console.log(`Successfully updated ${key} in .env file`);
  } catch (error) {
    console.error(`Failed to update .env file:`, error);
    throw error;
  }
};

const withRetry = async (operation, retries = 5) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Error (Attempt ${attempt}/${retries}): ${error.message}`);
      if (attempt < retries) {
        console.log(`Retrying in 3 seconds...`);
        await delay(3000);
      } else {
        console.error('All retry attempts exhausted.');
        return null;
      }
    }
  }
};

const fetchMeilisearchKey = async (endpoint, masterKey, keyType = 'admin') => {
  console.log(`Attempting to fetch Meilisearch ${keyType} key...`);
  const operation = async () => {
    const response = await axios.get(`${endpoint}/keys`, {
      headers: { Authorization: `Bearer ${masterKey}` }
    });
    console.log('Meilisearch keys response:', response.data);

    let key;
    if (keyType === 'admin') {
      key = response.data?.results?.find(key => 
        Array.isArray(key.actions) && 
        key.actions.includes('*')
      );
    } else if (keyType === 'search') {
      key = response.data?.results?.find(key => 
        Array.isArray(key.actions) && 
        key.actions.length === 1 && 
        key.actions[0] === 'search'
      );
    }

    if (!key?.key) {
      throw new Error(`No valid ${keyType} key found in Meilisearch response`);
    }
    return key.key;
  };

  return await withRetry(operation);
};

module.exports = {
  delay,
  withRetry,
  appendToEnvFile,
  fetchMeilisearchKey
};
