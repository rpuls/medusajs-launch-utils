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

## Used by

This library is the piece that makes one-click e-commerce deploys work. It handles
the boot sequence that is otherwise manual: waiting for the backend, running
migrations, seeding once and never again, creating the first admin user, and
exchanging API keys between services so the storefront comes up already connected.

It powers these Railway templates:

- **[Medusa 2.0 + Next.js Storefront](https://railway.com/deploy/medusajs-2-0-storefront?referralCode=-Yg50p)** - the full stack: Medusa backend, admin, Next.js storefront, Postgres, Redis, MeiliSearch and S3-compatible storage. [Source](https://github.com/rpuls/medusajs-2.0-for-railway-boilerplate)
- **[Medusa 2.0 B2B](https://railway.com/deploy/medusajs-20-storefront-b2b?referralCode=-Yg50p)** - company accounts, spending limits, quotes and order approvals. [Source](https://github.com/rpuls/medusa-b2b-for-railway)
- **[MercurJS Marketplace](https://railway.com/deploy/mercurjs?referralCode=-Yg50p)** - many sellers on one storefront, each with a vendor dashboard. [Source](https://github.com/rpuls/mercurjs-for-railway-boilerplate)

All three are independent community projects by [FUNKYTON](https://funkyton.com/),
not affiliated with MedusaJS, Inc. Guides and video walkthroughs:
[funkyton.com](https://funkyton.com/medusajs-2-0-is-finally-here/)

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

## Logging and secrets

These utilities run during a Railway deploy, so everything they print lands in a
deploy log that anyone with project access can read. The package therefore never
logs credential values:

- API responses that carry keys (Meilisearch `/keys`, Medusa `/key-exchange`) are
  summarised, not dumped.
- Keys that are printed for diagnostics are masked, e.g. `pk_0…JK (17 chars)`.
- Child process output and error messages pass through a redactor that replaces
  any value found in `MEILISEARCH_MASTER_KEY`, `MEILISEARCH_ADMIN_KEY`,
  `MEILISEARCH_API_KEY`, `MEDUSA_ADMIN_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`,
  `COOKIE_SECRET`, `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`,
  `SENDGRID_API_KEY` or `S3_SECRET_ACCESS_KEY` with `[REDACTED]`.
- The admin user is created with the password passed as its own argv entry
  rather than inside a shell string, so a failure cannot put it into an error
  message.

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
