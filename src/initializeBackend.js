require('dotenv').config({ quiet: true });
const axios = require('axios');
const { spawn } = require('child_process');
const { Client } = require('pg');
const { fetchMeilisearchKey, appendToEnvFile, redact } = require('./utils');

// npm and npx are batch files on Windows. Node refuses to spawn a .cmd without
// a shell, so Windows needs shell:true and hand-quoted arguments. Linux, which
// is what Railway runs, keeps shell:false and true argv separation.
const IS_WINDOWS = process.platform === 'win32';
const NPX = IS_WINDOWS ? 'npx.cmd' : 'npx';
const NPM = IS_WINDOWS ? 'npm.cmd' : 'npm';

const quoteForShell = (arg) => `"${String(arg).replace(/"/g, '""')}"`;

const prepareEnvironment = async () => {
  // Handle Meilisearch admin key
  if (!process.env.MEILISEARCH_ADMIN_KEY &&
      process.env.MEILISEARCH_MASTER_KEY &&
      process.env.MEILISEARCH_HOST) {
    const adminKey = await fetchMeilisearchKey(
      process.env.MEILISEARCH_HOST,
      process.env.MEILISEARCH_MASTER_KEY,
      'admin'
    );

    if (adminKey) {
      await appendToEnvFile('MEILISEARCH_ADMIN_KEY', adminKey);
      console.log('Successfully set MEILISEARCH_ADMIN_KEY');
    } else {
      throw new Error('Failed to fetch Meilisearch admin key');
    }
  }

  // Future environment preparation can be added here
};

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

const checkIfSeeded = async () => {
  try {
    await client.connect();
    await client.query('SELECT 1 FROM "user" LIMIT 1;');
    return true;
  } catch (error) {
    if (error.message.includes('relation "user" does not exist')) {
      return false;
    }
    console.error('Unexpected error checking if database is seeded:', redact(error.message));
    process.exit(1);
  } finally {
    await client.end();
  }
};

/**
 * Runs a command with its arguments passed as an array, never as a shell
 * string. This matters for the admin-user command: with a shell string the
 * password ends up inside the command line, and any failure puts that whole
 * string into the error message, which then gets logged.
 *
 * `label` is what appears in logs, so it can be written without the secret.
 */
const runCommand = (command, args = [], label = command) => {
  return new Promise((resolve, reject) => {
    const child = spawn(
      command,
      IS_WINDOWS ? args.map(quoteForShell) : args,
      { shell: IS_WINDOWS }
    );
    let stderr = '';

    child.stdout.on('data', (chunk) => process.stdout.write(redact(chunk.toString())));
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(redact(text));
    });

    child.on('error', (error) => {
      console.error(`Error executing "${label}": ${redact(error.message)}`);
      reject(new Error(`Failed to start "${label}"`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`"${label}" exited with code ${code}`);
        reject(new Error(`"${label}" failed with exit code ${code}${stderr ? `: ${redact(stderr.trim())}` : ''}`));
        return;
      }
      resolve();
    });
  });
};

const seedDatabase = async () => {
  try {
    console.log('Running migrations...');
    await runCommand(NPX, ['medusa', 'db:migrate'], 'medusa db:migrate');

    console.log('Running link sync...');
    await runCommand(NPX, ['medusa', 'db:sync-links'], 'medusa db:sync-links');

    console.log('Running seed script...');
    await runCommand(NPM, ['run', 'seed'], 'npm run seed');

    const adminEmail = process.env.MEDUSA_ADMIN_EMAIL;
    const adminPassword = process.env.MEDUSA_ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      console.log('Creating admin user...');
      // Password is passed as its own argv entry, so it is never part of a
      // shell command string and cannot surface in an error message.
      await runCommand(
        NPX,
        ['medusa', 'user', '-e', adminEmail, '-p', adminPassword],
        'medusa user'
      );
    }

    console.log('Database seeded and admin user created successfully.');
    return;

  } catch (error) {
    console.error('Failed to seed database or create admin user:', redact(error.message));
    process.exit(1);
  }
};

const seedOnce = async () => {
  // Skip seeding if running in worker mode
  if (process.env.MEDUSA_WORKER_MODE === 'worker') {
    console.log('Running in worker mode, skipping database seeding.');
    return;
  }

  const isSeeded = await checkIfSeeded();
  if (!isSeeded) {
    console.log('Database is not seeded. Seeding now...');
    await seedDatabase();
  } else {
    console.log('Database is already seeded. Skipping seeding.');
  }
};

const reportDeploy = async () => {
  const url = process.env.TEMPLATE_REPORTER_URL;
  if (!url) {
    return;
  }
  const payload = {
    projectId: process.env.RAILWAY_PROJECT_ID,
    templateId: 'medusa-2.0',
    publicUrl: process.env.PUBLIC_URL,
    storefrontPublishUrl: process.env.STOREFRONT_PUBLISH_URL
  };
  try {
    await axios.post(`${url}/api/projectDeployed`, payload);
  } catch (error) {
    console.error(`An error occurred: ${redact(error.message)}`);
  }
};

module.exports = {
  seedOnce,
  reportDeploy,
  prepareEnvironment
};
