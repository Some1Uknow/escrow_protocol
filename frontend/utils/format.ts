import { PublicKey } from "@solana/web3.js";

export function shortenAddress(address: string | PublicKey, chars = 4): string {
  const str = typeof address === "string" ? address : address.toString();
  return `${str.slice(0, chars)}...${str.slice(-chars)}`;
}

export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

export function formatSOL(lamports: number, decimals = 4): string {
  return lamportsToSol(lamports).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

export function formatDate(timestamp: number): string {
  if (timestamp === 0) return "—";
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    funded: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    submitted: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    complete: "bg-green-500/10 text-green-400 border-green-500/20",
    disputed: "bg-red-500/10 text-red-400 border-red-500/20",
    refunded: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };
  return colors[status.toLowerCase()] || "bg-white/5 text-gray-400 border-white/10";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "⏳ Pending Deposit",
    funded: "💰 Funded",
    submitted: "📝 Work Submitted",
    approved: "✅ Approved",
    complete: "🎉 Complete",
    disputed: "⚠️ Disputed",
    refunded: "↩️ Refunded",
  };
  return labels[status.toLowerCase()] || status;
}
