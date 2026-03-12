import { MIRROR_NODE_BASE_URL, NFT_CONTRACTS } from "./config";

export async function resolveEvmToAccountId(evmAddress: string): Promise<string> {
  const res = await fetch(`${MIRROR_NODE_BASE_URL}/api/v1/accounts/${evmAddress}`);
  if (!res.ok) throw new Error("Could not resolve wallet address to a Hedera account");
  const body = await res.json();
  return body.account as string; // e.g. "0.0.12345"
}

export interface OwnedNft {
  tokenId: string;
  serialNumber: number;
  contractName: string;
  metadataUri?: string;
}

const IPFS_GATEWAY = (import.meta.env.VITE_IPFS_GATEWAY as string | undefined)?.replace(/\/$/, "") ?? "https://ipfs.io";

function resolveUri(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return `${IPFS_GATEWAY}/ipfs/${uri.slice(7)}`;
  }
  return uri;
}

export async function fetchNftMetadata(metadataUri: string): Promise<{ imageUrl?: string; isModel: boolean }> {
  const res = await fetch(resolveUri(metadataUri));
  if (!res.ok) throw new Error("Failed to fetch metadata");
  const meta = await res.json();
  if (!meta.image) return { isModel: false };
  const imageUrl = resolveUri(meta.image);
  const urlPath = imageUrl.toLowerCase().split("?")[0];
  const isModel = urlPath.endsWith(".glb") || meta.type === "glb" || meta.type === "model/gltf-binary";
  return { imageUrl, isModel };
}

export interface NftStatusResult {
  status: "used" | "unused";
  usedAt?: string;
}

export async function fetchOwnedNfts(accountId: string): Promise<OwnedNft[]> {
  const results: OwnedNft[] = [];

  await Promise.all(
    NFT_CONTRACTS.map(async (contract) => {
      let url: string | null =
        `${MIRROR_NODE_BASE_URL}/api/v1/accounts/${encodeURIComponent(accountId)}/nfts` +
        `?token.id=${contract.tokenId}&limit=100`;

      while (url) {
        const res = await fetch(url);
        if (res.status === 404) break;
        if (!res.ok) throw new Error(`Mirror Node error (${res.status})`);

        const body = await res.json();
        for (const nft of body.nfts ?? []) {
          if (!nft.deleted) {
            results.push({
              tokenId: nft.token_id,
              serialNumber: nft.serial_number,
              contractName: contract.symbol ?? contract.name,
              metadataUri: contract.metadataCid ? `ipfs://${contract.metadataCid}` : (nft.metadata ? atob(nft.metadata).trim() : undefined),
            });
          }
        }

        url = body.links?.next
          ? `${MIRROR_NODE_BASE_URL}${body.links.next}`
          : null;
      }
    })
  );

  return results;
}

export async function fetchSingleNftMetadataUri(tokenId: string, serialNumber: number): Promise<string | undefined> {
  const res = await fetch(`${MIRROR_NODE_BASE_URL}/api/v1/tokens/${encodeURIComponent(tokenId)}/nfts/${serialNumber}`);
  if (!res.ok) return undefined;
  const body = await res.json();
  return body.metadata ? atob(body.metadata).trim() : undefined;
}

export async function checkNftStatus(
  tokenId: string,
  serialNumber: number
): Promise<NftStatusResult> {
  const base =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    "http://localhost:8000";
  const res = await fetch(
    `${base}/api/nfts/status/${tokenId}/${serialNumber}`
  );

  if (res.status === 404) throw new Error("Contract not recognized by API");
  if (res.status === 429) throw new Error("Rate limit exceeded — try again shortly");
  if (!res.ok) throw new Error(`Status API error (${res.status})`);

  const body = await res.json();
  return { status: body.status, usedAt: body.used_at };
}
