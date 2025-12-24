import { PublicKey } from "@solana/web3.js";

// Program ID for the Freelance Escrow program
// Update this when deploying to a different network
export const PROGRAM_ID = new PublicKey("HWkW19PFehhdgfkGPHnTQTnfhcCQhMqokqGx3Vav7a3N");

// Network configuration
export const NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as "devnet" | "mainnet-beta" | "localnet") || "devnet";

export const RPC_ENDPOINTS = {
  localnet: "http://localhost:8899",
  devnet: "https://api.devnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
} as const;

export const RPC_ENDPOINT = RPC_ENDPOINTS[NETWORK];

export function getExplorerUrl(type: "address" | "tx", value: string): string {
  const cluster = NETWORK === "mainnet-beta" ? "" : `?cluster=${NETWORK}`;
  return `https://explorer.solana.com/${type}/${value}${cluster}`;
}
