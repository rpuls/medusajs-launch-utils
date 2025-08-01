const { setTimeout } = require('timers/promises');
const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');

const delay = (ms) => setTimeout(ms);

const getEnvPaths = () => {
  const currentDir = process.cwd();
  const isBuiltEnv = currentDir.includes('.medusa/server');
  
  if (isBuiltEnv) {
    // We're in the built environment
    return [path.resolve(currentDir, '.env')];
  } else {
    // We're in the source environment, update both source and built .env
    return [
      path.resolve(currentDir, '.env'),
      path.resolve(currentDir, '.medusa/server/.env')
    ];
  }
};

const appendToEnvFile = async (key, value) => {
  const envPaths = getEnvPaths();
  
  for (const envPath of envPaths) {
    try {
      let envContent = '';
      
      try {
        // Ensure directory exists
        await fs.mkdir(path.dirname(envPath), { recursive: true });
        
        try {
          envContent = await fs.readFile(envPath, 'utf-8');
        } catch (error) {
          if (error.code === 'ENOENT') {
            // File doesn't exist, create it
            await fs.writeFile(envPath, '', 'utf-8');
            console.log(`Created new .env file at ${envPath}`);
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
          const newLine = envContent.length > 0 && !envContent.endsWith('\n') ? '\n' : '';
          await fs.appendFile(envPath, `${newLine}${key}=${value}\n`);
        }
        console.log(`Successfully updated ${key} in ${envPath}`);
      } catch (error) {
        console.error(`Failed to update .env file at ${envPath}:`, error);
        throw error;
      }
    } catch (error) {
      console.error(`Error processing ${envPath}:`, error);
      // Continue to next file even if this one fails
    }
  }
};

const withRetry = async (operation, retries = 5) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Error (Attempt ${attempt}/${retries}): ${error.message}`);
      if (attempt < retries) {
        console.log(`Retrying in 10 seconds...`);
        await delay(10000);
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
