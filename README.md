# nft-status

A little proof-of-concept app for checking whether an NFT has been used on [Stake](https://stake.amplifyworld.ai). Chuck in a contract address and token ID and it'll tell you if it's been used and when.

This was built as a demo of what Claude Code's skill system can do — the whole thing was generated from a single skill file, then tidied up into something shareable.

## What it does

- You type in a contract address + token ID
- It hits the Stake API and tells you if the NFT has been used
- If it has, it shows you when
- Handles errors and rate limiting (120 requests/min) sensibly

## Stack

React + TypeScript, Vite, Tailwind CSS v4.

## Running it locally

You'll need Node 18+ and the API backend running somewhere.

```bash
npm install
```

Copy the env file and point it at your backend:

```bash
cp .env.example .env.local
```

```env
VITE_API_BASE_URL=http://localhost:8000
```

Then:

```bash
npm run dev
```

For a production build, run `npm run build` — output lands in `dist/` and can be hosted anywhere static.

## API

The app talks to one endpoint:

```
GET /api/nfts/status/:contractAddress/:tokenId
```

Returns `{ status: "used" | "unused", used_at?: string }`.

## How it was made

This was scaffolded entirely by Claude Code using a skill file — basically a prompt template that describes the whole app. If you're curious about the skill system, this repo is a real working example of what comes out of it.
