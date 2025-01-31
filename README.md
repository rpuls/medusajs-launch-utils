# medusajs-launch-utils

Launch utilities for Medusajs monorepo projects. These utilities streamline the setup and launch process for Medusa.js 2.0 projects by automating backend initialization, health checks, and storefront deployment with proper configuration.

## Features

- **Backend Initialization** (`init-backend`)
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

In your package.json scripts:

```json
{
  "scripts": {
    "init": "init-backend",
    "wait": "await-backend",
    "launch": "launch-storefront"
  }
}
```

These utilities are particularly useful when working with Medusa.js 2.0 monorepo setups. For a comprehensive guide on Medusa.js 2.0 features and deployment strategies, check out this [detailed overview of Medusa.js 2.0](https://funkyton.com/medusajs-2-0-is-finally-here/).

## Documentation

For more detailed usage instructions, please refer to:
- [Official Medusa.js documentation](https://docs.medusajs.com/)
- [Medusa.js 2.0 deployment guides and tutorials](https://funkyton.com/)

---
Developed by [https://funkyton.com/](https://funkyton.com/) | Making open-source effortless for everyone
