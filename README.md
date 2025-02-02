# medusajs-launch-utils

Launch utilities for Medusajs monorepo projects. These utilities streamline the setup and launch process for Medusa.js 2.0 projects by automating backend initialization, health checks, and storefront deployment with proper configuration.

## Features

- **Backend Initialization** (`init-backend`)
  - Environment preparation
    - Automatic Meilisearch admin key fetching using master key
    - Environment variable management
    - Persists fetched keys to .env file
  - Running database migrations 
  - One-time database seeding
  - One-time admin user creation 

- **Backend Ready Check** (`await-backend`)
  - Used to stall Storefront build until backend is ready
  - Progress reporting with elapsed time

- **Storefront Launch** (`launch-storefront`)
  - Supports `start`, `build`, and `dev` commands
  - Automatic Medusa publishable API key fetching
  - Optional Meilisearch integration with key management
  - Configurable port settings
  - Environment variable handling
  - Retry mechanism for API operations

## Installation

```bash
npm install medusajs-launch-utils
```

## Usage

In your storefront/package.json scripts:

```json
{
  "scripts": {
    "wait": "await-backend",
    "launcher": "launch-storefront",
    "dev": "npm run wait && npm run launcher dev",
    "build": "npm run wait && npm run launcher build",
    "start": "npm run launcher start",
  }
}
```

In your backend/package.json scripts:

```json
{
  "scripts": {
    "build": "init-backend && medusa build",
    "dev": "init-backend && medusa develop",
    "start": "init-backend && medusa start",
  }
}
```

### Meilisearch Configuration

The backend initialization process includes automatic Meilisearch admin key management:

```env
# Required if not providing admin key directly
MEILISEARCH_HOST=your-meilisearch-host
MEILISEARCH_MASTER_KEY=your-master-key

# Optional - if not set, will be fetched using master key
MEILISEARCH_ADMIN_KEY=your-admin-key
```

During initialization, if MEILISEARCH_ADMIN_KEY is not provided:
1. The master key will be used to fetch the admin key from Meilisearch
2. The admin key will be saved to your .env file
3. The environment will be prepared before database operations begin

## Shared Utilities

The package includes shared utility functions used across different tools:

- **Retry Mechanism**
  - Automatic retry for API operations
  - Configurable retry attempts and delays
  - Used by both storefront and backend utilities

These utilities are particularly useful when working with Medusa.js 2.0 monorepo setups. For a comprehensive guide on Medusa.js 2.0 features and deployment strategies, check out this [detailed overview of Medusa.js 2.0](https://funkyton.com/medusajs-2-0-is-finally-here/).

## Documentation

For more detailed usage instructions, please refer to:
- [Official Medusa.js documentation](https://docs.medusajs.com/)
- [Medusa.js 2.0 deployment guides and tutorials](https://funkyton.com/)

---
Developed by [https://funkyton.com/](https://funkyton.com/) | Making open-source effortless for everyone
