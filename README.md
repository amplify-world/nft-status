# nft-status

A web app for checking the status of AmplifyWorld NFTs on [Stake](https://stake.amplifyworld.ai). Connect your wallet or enter a Hedera account ID to scan all your NFTs at once, or look up a specific one by serial number.

## What it does

- **My Wallet** — connect a wallet (EIP-6963 multi-provider: MetaMask, HashPack, etc.) or enter a Hedera account ID manually; scans all NFTs across configured contracts and shows used/unused status with artwork
- **Check an NFT** — pick a contract from a dropdown and enter a serial number to check a single NFT directly
- Displays NFT artwork from IPFS; 3D GLB models are rendered with an interactive model viewer
- Resolves EVM wallet addresses to Hedera account IDs automatically via Mirror Node

## Stack

React 19 + TypeScript, Vite, Tailwind CSS v4, `@google/model-viewer`.

## Running it locally

Requires Node 18+ and the NFT status API backend running somewhere.

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000

# Optional: Pinata or other dedicated IPFS gateway (no trailing slash)
VITE_IPFS_GATEWAY=https://your-subdomain.mypinata.cloud
```

Then:

```bash
npm run dev
```

For a production build: `npm run build` — output lands in `dist/`.

## Configuration

NFT contracts are configured in `src/config.ts`. Each entry supports:

- `name` — display name
- `symbol` — shown instead of name when multiple contracts share the same name
- `tokenId` — Hedera format (`0.0.XXXXX`)
- `metadataCid` — optional IPFS CID override; bypasses on-chain metadata and resolves via `VITE_IPFS_GATEWAY`

## API

The app calls one status endpoint:

```
GET /api/nfts/status/{tokenId}/{serialNumber}
```

Returns `{ status: "used" | "unused", used_at?: string }`.

NFT ownership data comes from the [Hedera Mirror Node](https://mainnet-public.mirrornode.hedera.com) public API — no API key required.
