export interface NftContractConfig {
  name: string;
  symbol?: string;      // Shown instead of name when multiple contracts share the same name
  tokenId: string;      // Hedera format: 0.0.XXXXX
  metadataCid?: string; // Override metadata CID — resolved via VITE_IPFS_GATEWAY instead of reading from chain
}

// Add or remove contracts here as needed
export const NFT_CONTRACTS: NftContractConfig[] = [
  {
    name: "AmplifyWorld Founders NFT",
    tokenId: "0.0.9275348",
    metadataCid: "bafkreibiougjw7ti765qjj6k7tkmuhxkec2ryofevdn2sgr2eyqm3b6o4q",
  },
  {
    name: "Amplify Genesis NFT Collection",
    symbol: "Genesis AAA Artist Pass",
    tokenId: "0.0.4153037",
    metadataCid: "bafkreiavhblonfzvxhp3jr7vlasydn2imebjqvh6sa2l6p326megs2oeiq",
  },
  {
    name: "Amplify Genesis NFT Collection",
    symbol: "Genesis AAA Fan Pass",
    tokenId: "0.0.4153040",
    metadataCid: "bafkreicqs6jtupd3qcsejlcb7mfuykd66iaq4aedqsut6vl6ezpf3amrhm",
  },
];

export const MIRROR_NODE_BASE_URL =
  "https://mainnet-public.mirrornode.hedera.com";
