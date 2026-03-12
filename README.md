# nft-status

A proof-of-concept React app that lets you check whether an NFT has been used on [Stake](https://stake.com). Enter a contract address and token ID, and the app queries a backend API to return the NFT's current status.

This repo was built as an example of how to use the Claude Code API skill — the entire app was scaffolded from a single skill file. It's intended to be a useful reference for anyone learning how to build with the skill system.

## What it does

- Accepts an ERC-721 contract address and a token ID
- Queries a REST API endpoint: `GET /api/nfts/status/:contractAddress/:tokenId`
- Displays whether the NFT has been used, and if so, when
- Handles 404 (unknown contract), 429 (rate limit), and network errors gracefully
- Rate limited to 120 requests per minute (enforced server-side)

## Tech stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev) for bundling and dev server
- [Tailwind CSS v4](https://tailwindcss.com) for styling

## Getting started

### Prerequisites

- Node.js 18+
- A running instance of the NFT status API backend

### Install dependencies

```bash
npm install
```

### Configure the API URL

Copy the example env file and set your backend URL:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Vite exposes `VITE_*` variables to the client via `import.meta.env`. The app falls back to `http://localhost:8000` if the variable is not set, which is useful for local development without any config.

### Run in development

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

The output goes to `dist/`. Serve it with any static file host (Nginx, Cloudflare Pages, Vercel, etc.) — just make sure your backend URL is set correctly in the environment at build time.

## API

The app expects the backend to expose:

```
GET /api/nfts/status/:contractAddress/:tokenId
```

**Success response (200):**

```json
{
  "status": "used" | "unused",
  "used_at": "2024-01-15T10:30:00Z"  // only present when status is "used"
}
```

**Error responses:**

| Status | Meaning |
|--------|---------|
| 404 | Contract address not found |
| 429 | Rate limit exceeded |

## How this was built

This project was created using a Claude Code skill file — a prompt template that instructs Claude Code to scaffold a complete working app. The skill defined the UI design, component structure, API integration pattern, and error handling all in one shot.

If you're exploring Claude Code's skill system, this repo is a concrete example of what a generated app looks like and how to take it from scaffold to production-ready (e.g. replacing hardcoded config with environment variables).
