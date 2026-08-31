const { setTimeout } = require('timers/promises');
const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');

const delay = (ms) => setTimeout(ms);

// Values that must never reach a deploy log. Collected from the environment at
// call time, so a secret set later in the boot sequence is still covered.
const SECRET_ENV_KEYS = [
  'MEILISEARCH_MASTER_KEY',
  'MEILISEARCH_ADMIN_KEY',
  'MEILISEARCH_API_KEY',
  'MEDUSA_ADMIN_PASSWORD',
  'DATABASE_URL',
  'JWT_SECRET',
  'COOKIE_SECRET',
  'STRIPE_API_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'SENDGRID_API_KEY',
  'S3_SECRET_ACCESS_KEY'
];

// Replaces any known secret value found in `text` with [REDACTED]. Used on
// anything derived from a child process or an HTTP error before logging it.
const redact = (text) => {
  if (text === undefined || text === null) return text;
  let out = String(text);
  for (const key of SECRET_ENV_KEYS) {
    const value = process.env[key];
    if (value && value.length >= 4) {
      out = out.split(value).join('[REDACTED]');
    }
  }
  return out;
};

// Shows enough of a key to tell two apart in a log without disclosing it.
const maskKey = (value) => {
  if (!value) return '(not set)';
  const str = String(value);
  if (str.length <= 8) return '(set)';
  return `${str.slice(0, 4)}…${str.slice(-2)} (${str.length} chars)`;
};

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
        console.error(`Failed to update .env file at ${envPath}:`, redact(error.message));
        throw error;
      }
    } catch (error) {
      console.error(`Error processing ${envPath}:`, redact(error.message));
      // Continue to next file even if this one fails
    }
  }
};

const withRetry = async (operation, retries = 5) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Error (Attempt ${attempt}/${retries}): ${redact(error.message)}`);
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
    // Never log response.data here: it is the full key list, master and admin
    // keys included, and this output goes straight into the deploy log.
    const results = response.data?.results;
    console.log(`Meilisearch returned ${Array.isArray(results) ? results.length : 0} key(s).`);

    let key;
    if (keyType === 'admin') {
      key = results?.find(entry =>
        Array.isArray(entry.actions) &&
        entry.actions.includes('*')
      );
    } else if (keyType === 'search') {
      key = results?.find(entry =>
        Array.isArray(entry.actions) &&
        entry.actions.length === 1 &&
        entry.actions[0] === 'search'
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
  fetchMeilisearchKey,
  redact,
  maskKey
};
