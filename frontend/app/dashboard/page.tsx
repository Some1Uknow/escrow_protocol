"use client";

import { useEffect, useState } from "react";
import { useEscrowProgram } from "@/hooks/useEscrowProgram";
import { useEscrowHistory, HistoricalEscrow } from "@/hooks/useEscrowHistory";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";
import { shortenAddress, formatSOL, getStatusColor } from "@/utils/format";
import {
  Wallet,
  Plus,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Handshake,
  CheckCircle,
  ArrowRight,
  Eye,
  Gavel,
  History,
  Inbox,
  Archive,
} from "lucide-react";

interface EscrowAccount {
  publicKey: PublicKey;
  account: {
    client: PublicKey;
    freelancer: PublicKey;
    amount: { toNumber: () => number };
    status: Record<string, object>;
    workLink: string;
    createdAt: { toNumber: () => number };
    fundedAt: { toNumber: () => number };
    disputeTimeoutDays: number;
  };
}

type FilterType = "all" | "client" | "freelancer";
type ViewType = "active" | "history";

export default function DashboardPage() {
  const program = useEscrowProgram();
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const [escrows, setEscrows] = useState<EscrowAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewType, setViewType] = useState<ViewType>("active");
  const [searchQuery, setSearchQuery] = useState("");

  // Get escrow history hook
  const { 
    history, 
    loading: historyLoading, 
    error: historyError,
    fetchOnChainHistory,
    saveToHistory, 
    getCompletedEscrows 
  } = useEscrowHistory(
    publicKey?.toBase58() || null
  );

  // Redirect to home if not connected
  useEffect(() => {
    if (!connected && !loading) {
      router.push("/");
    }
  }, [connected, loading, router]);

  const fetchEscrows = async () => {
    if (!program || !publicKey) return;
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (program.account as any).escrowAccount.all();
      const fetchedEscrows = accounts as EscrowAccount[];
      setEscrows(fetchedEscrows);

      // Save each escrow to history for future reference
      fetchedEscrows.forEach((escrow) => {
        const isClient = escrow.account.client.equals(publicKey);
        const isFreelancer = escrow.account.freelancer.equals(publicKey);
        
        // Only save escrows related to the current user
        if (isClient || isFreelancer) {
          saveToHistory({
            address: escrow.publicKey.toString(),
            client: escrow.account.client.toString(),
            freelancer: escrow.account.freelancer.toString(),
            amount: escrow.account.amount.toNumber(),
            status: Object.keys(escrow.account.status)[0],
            workLink: escrow.account.workLink || "",
            createdAt: escrow.account.createdAt.toNumber() * 1000,
            fundedAt: escrow.account.fundedAt.toNumber() * 1000,
            disputeTimeoutDays: escrow.account.disputeTimeoutDays,
          });
        }
      });
    } catch (err) {
      console.error("Error fetching escrows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (program) {
      fetchEscrows();
    }
  }, [program]);

  // Get completed escrows from history (those no longer on-chain)
  const onChainAddresses = escrows.map((e) => e.publicKey.toString());
  const completedFromHistory = getCompletedEscrows(onChainAddresses);

  // Filter completed history based on role
  const filteredHistory = completedFromHistory.filter((h) => {
    if (!publicKey) return false;
    const walletAddr = publicKey.toBase58();
    const isClient = h.client === walletAddr;
    const isFreelancer = h.freelancer === walletAddr;

    if (filter === "client" && !isClient) return false;
    if (filter === "freelancer" && !isFreelancer) return false;
    if (filter === "all" && !isClient && !isFreelancer) return false;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesAddress = h.address.toLowerCase().includes(query);
      const matchesClient = h.client.toLowerCase().includes(query);
      const matchesFreelancer = h.freelancer.toLowerCase().includes(query);
      return matchesAddress || matchesClient || matchesFreelancer;
    }

    return true;
  });

  const filteredEscrows = escrows.filter((escrow) => {
    if (!publicKey) return false;
    
    // Filter by role
    const isClient = escrow.account.client.equals(publicKey);
    const isFreelancer = escrow.account.freelancer.equals(publicKey);
    
    if (filter === "client" && !isClient) return false;
    if (filter === "freelancer" && !isFreelancer) return false;
    if (filter === "all" && !isClient && !isFreelancer) return false;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesAddress = escrow.publicKey.toString().toLowerCase().includes(query);
      const matchesClient = escrow.account.client.toString().toLowerCase().includes(query);
      const matchesFreelancer = escrow.account.freelancer.toString().toLowerCase().includes(query);
      return matchesAddress || matchesClient || matchesFreelancer;
    }

    return true;
  });

  // Calculate stats
  const totalValueLocked = filteredEscrows.reduce((sum, e) => {
    const status = Object.keys(e.account.status)[0];
    if (status === "funded" || status === "submitted" || status === "approved" || status === "disputed") {
      return sum + e.account.amount.toNumber();
    }
    return sum;
  }, 0);

  const activeDeals = filteredEscrows.filter((e) => {
    const status = Object.keys(e.account.status)[0];
    return status === "funded" || status === "submitted" || status === "approved";
  }).length;

  // Count completed deals from on-chain (complete status) + history (closed accounts)
  const completedOnChain = filteredEscrows.filter((e) => {
    const status = Object.keys(e.account.status)[0];
    return status === "complete";
  }).length;
  const completedDeals = completedOnChain + filteredHistory.length;

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; bgColor: string; borderColor: string; ping?: boolean }> = {
      pending: { color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20" },
      funded: { color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20", ping: true },
      submitted: { color: "text-cyan-400", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/20", ping: true },
      approved: { color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20", ping: true },
      complete: { color: "text-gray-400", bgColor: "bg-gray-500/10", borderColor: "border-gray-600/30" },
      disputed: { color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/20", ping: true },
      refunded: { color: "text-gray-400", bgColor: "bg-gray-500/10", borderColor: "border-gray-600/30" },
    };
    return configs[status] || configs.pending;
  };

  if (!connected) {
    return (
      <main className="min-h-screen bg-[#0f0b15] text-white overflow-x-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb-primary animate-float-slow" style={{ width: '500px', height: '500px', top: '-100px', left: '10%' }} />
        </div>
        <div className="relative z-10 flex min-h-screen flex-col">
          <Navbar />
          <div className="flex-grow flex items-center justify-center pt-32 pb-20 px-4">
            <div className="glass-panel p-12 text-center rounded-2xl max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#6a25f4]/10 flex items-center justify-center">
                <Wallet className="w-10 h-10 text-[#6a25f4]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-6">
                Connect your Solana wallet to access your dashboard and manage escrow contracts.
              </p>
              <Link href="/">
                <Button size="lg">Go to Home</Button>
              </Link>
            </div>
          </div>
          <Footer />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0b15] text-white overflow-x-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="orb orb-primary animate-float-slow"
          style={{ width: '500px', height: '500px', top: '-100px', left: '10%' }}
        />
        <div 
          className="orb orb-cyan animate-float-medium"
          style={{ width: '400px', height: '400px', bottom: '-50px', right: '5%' }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />

        <div className="flex-grow w-full max-w-7xl mx-auto px-6 py-8 pt-32 flex flex-col gap-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Dashboard</h2>
              <p className="text-[#a490cb] text-lg max-w-2xl">
                Monitor your secure transactions and manage escrow funds in real-time.
              </p>
            </div>
            <Link href="/create">
              <Button size="lg" className="shadow-[0_4px_20px_rgba(106,37,244,0.4)]">
                <Plus className="w-5 h-5" />
                New Escrow Deal
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stat Card 1 - TVL */}
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-[#6a25f4]/10 rounded-full blur-xl group-hover:bg-[#6a25f4]/20 transition-colors" />
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-[#2f2249] rounded-lg">
                  <Wallet className="w-5 h-5 text-[#6a25f4]" />
                </div>
                <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Active
                </span>
              </div>
              <p className="text-gray-400 text-sm font-medium mb-1">Total Value Locked</p>
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {loading ? (
                  <Skeleton className="h-9 w-32" />
                ) : (
                  <>
                    {formatSOL(totalValueLocked)} <span className="text-[#6a25f4] text-xl">SOL</span>
                  </>
                )}
              </h3>
            </div>

            {/* Stat Card 2 - Active Deals */}
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-colors" />
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-[#2f2249] rounded-lg">
                  <Handshake className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <p className="text-gray-400 text-sm font-medium mb-1">Active Deals</p>
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {loading ? <Skeleton className="h-9 w-16" /> : activeDeals}
              </h3>
            </div>

            {/* Stat Card 3 - Completed */}
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-colors" />
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-[#2f2249] rounded-lg">
                  <CheckCircle className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-xs font-bold bg-gray-500/10 text-gray-400 px-2 py-1 rounded-full">All Time</span>
              </div>
              <p className="text-gray-400 text-sm font-medium mb-1">Completed Transactions</p>
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {loading ? <Skeleton className="h-9 w-16" /> : completedDeals}
              </h3>
            </div>
          </div>

          {/* Filter & Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <div className="bg-[#1a1625] p-1 rounded-xl flex items-center border border-[#2f2249]">
              {(["all", "client", "freelancer"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                    filter === f
                      ? "bg-[#2f2249] text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  {f === "all" ? "All Deals" : f === "client" ? "As Client" : "As Freelancer"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Active/History toggle */}
              <div className="bg-[#1a1625] p-1 rounded-xl flex items-center border border-[#2f2249]">
                <button
                  onClick={() => setViewType("active")}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                    viewType === "active"
                      ? "bg-[#6a25f4] text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <Handshake className="w-4 h-4" />
                  Active
                </button>
                <button
                  onClick={() => setViewType("history")}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                    viewType === "history"
                      ? "bg-[#6a25f4] text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <Archive className="w-4 h-4" />
                  History
                  {filteredHistory.length > 0 && (
                    <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                      {filteredHistory.length}
                    </span>
                  )}
                </button>
              </div>
              <div className="relative w-full sm:w-64 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#6a25f4] transition-colors w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1a1625] border border-[#2f2249] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#6a25f4] transition-colors"
                  placeholder="Search by address..."
                />
              </div>
              <button
                onClick={() => viewType === "history" ? fetchOnChainHistory(true) : fetchEscrows()}
                aria-label="Refresh escrow list"
                className="p-2.5 bg-[#1a1625] border border-[#2f2249] rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-all"
              >
                <RefreshCw className={cn("w-5 h-5", (loading || historyLoading) && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Deals Grid */}
          {(loading || (viewType === "history" && historyLoading)) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[#1a1625] border border-[#2f2249] rounded-2xl p-5">
                  <div className="flex justify-between items-start mb-6">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <div className="space-y-4 mb-6">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : viewType === "history" ? (
            // History View - Show completed/closed escrows from on-chain data + cache
            historyError ? (
              <div className="glass-panel p-12 text-center rounded-2xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Archive className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Error Loading History</h3>
                <p className="text-gray-400 max-w-sm mx-auto mb-6">
                  {historyError}
                </p>
                <Button onClick={() => fetchOnChainHistory(true)} variant="secondary">
                  Try Again
                </Button>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-2xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <Archive className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No History Yet</h3>
                <p className="text-gray-400 max-w-sm mx-auto mb-6">
                  Completed escrows will appear here once they are withdrawn or refunded.
                  Data is fetched from on-chain transaction logs.
                </p>
                <Button onClick={() => setViewType("active")} variant="secondary">
                  View Active Deals
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {filteredHistory.map((historyItem) => {
                  const status = historyItem.status;
                  const statusConfig = getStatusBadge(status);
                  const isClient = publicKey?.toBase58() === historyItem.client;
                  const isCompleted = status === "complete" || status === "refunded";

                  return (
                    <div
                      key={historyItem.address}
                      className="relative bg-[#1a1625] border border-[#2f2249] rounded-2xl p-5 opacity-75"
                    >
                      {/* Completed Badge */}
                      <div className="absolute -top-2 -right-2 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-xs font-bold border border-emerald-500/30">
                        {status === "refunded" ? "Refunded" : "Completed"}
                      </div>

                      {/* Header */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500 font-mono mb-1">
                            #{shortenAddress(historyItem.address, 4)}
                          </span>
                          <h4 className="text-white font-bold text-lg leading-tight">
                            {isClient ? "Client Deal" : "Freelancer Deal"}
                          </h4>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
                          statusConfig.bgColor,
                          statusConfig.borderColor
                        )}>
                          <CheckCircle className="w-3 h-3 text-gray-400" />
                          <span className={cn("text-xs font-bold uppercase tracking-wide", statusConfig.color)}>
                            {status === "refunded" ? "Refunded" : "Done"}
                          </span>
                        </div>
                      </div>

                      {/* Parties */}
                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                            <span className="text-gray-300">{shortenAddress(historyItem.client, 4)}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-600" />
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300">{shortenAddress(historyItem.freelancer, 4)}</span>
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-600" />
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="p-4 rounded-xl bg-[#0f0b15] border border-[#2f2249] flex flex-col items-center justify-center">
                          <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">
                            Settled Amount
                          </span>
                          <span className="text-3xl font-bold text-gray-400">
                            {formatSOL(historyItem.amount)} SOL
                          </span>
                        </div>

                        {/* Work Link */}
                        {historyItem.workLink && (
                          <a
                            href={historyItem.workLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 rounded-xl bg-[#0f0b15] border border-[#2f2249] hover:border-purple-500/50 transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                  <Eye className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 block">Submitted Work</span>
                                  <span className="text-sm text-purple-400 group-hover:text-purple-300 truncate max-w-[180px] block">
                                    {historyItem.workLink.length > 35 
                                      ? historyItem.workLink.substring(0, 35) + "..." 
                                      : historyItem.workLink}
                                  </span>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 transition-colors" />
                            </div>
                          </a>
                        )}
                      </div>

                      {/* Date Info */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-gray-500">
                        <span>
                          Created: {new Date(historyItem.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <History className="w-3 h-3" />
                          {historyItem.source === "onchain" ? "From blockchain" : "Cached"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : filteredEscrows.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <Inbox className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Active Escrows</h3>
              <p className="text-gray-400 max-w-sm mx-auto mb-6">
                {filter !== "all"
                  ? "No escrows found for this filter. Try selecting 'All Deals' or create a new escrow."
                  : "Get started by creating your first escrow contract."}
              </p>
              <div className="flex items-center gap-3 justify-center">
                <Link href="/create">
                  <Button>Create Your First Escrow</Button>
                </Link>
                {filteredHistory.length > 0 && (
                  <Button variant="secondary" onClick={() => setViewType("history")}>
                    View History ({filteredHistory.length})
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {filteredEscrows.map((escrow) => {
                const status = Object.keys(escrow.account.status)[0];
                const statusConfig = getStatusBadge(status);
                const isClient = publicKey?.equals(escrow.account.client);
                const isDisputed = status === "disputed";
                const isCompleted = status === "complete" || status === "refunded";

                return (
                  <Link
                    key={escrow.publicKey.toString()}
                    href={`/escrow/${escrow.publicKey.toString()}`}
                    className="group"
                  >
                    <div
                      className={cn(
                        "relative bg-[#1a1625] border rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1",
                        isDisputed
                          ? "border-[#2f2249] hover:border-red-500/50 hover:shadow-[0_0_30px_rgba(255,77,77,0.15)]"
                          : isCompleted
                          ? "border-[#2f2249] hover:border-gray-500/50 opacity-75 hover:opacity-100"
                          : "border-[#2f2249] hover:border-[#6a25f4]/50 hover:shadow-[0_0_30px_rgba(106,37,244,0.15)]"
                      )}
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500 font-mono mb-1">
                            #{shortenAddress(escrow.publicKey, 4)}
                          </span>
                          <h4 className={cn(
                            "text-white font-bold text-lg leading-tight transition-colors",
                            isDisputed ? "group-hover:text-red-400" : "group-hover:text-[#6a25f4]"
                          )}>
                            {isClient ? "Client Deal" : "Freelancer Deal"}
                          </h4>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
                          statusConfig.bgColor,
                          statusConfig.borderColor
                        )}>
                          {statusConfig.ping && (
                            <span className="relative flex h-2 w-2">
                              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", statusConfig.color.replace("text-", "bg-"))} />
                              <span className={cn("relative inline-flex rounded-full h-2 w-2", statusConfig.color.replace("text-", "bg-"))} />
                            </span>
                          )}
                          {!statusConfig.ping && status === "complete" && (
                            <CheckCircle className="w-3 h-3 text-gray-400" />
                          )}
                          <span className={cn("text-xs font-bold uppercase tracking-wide", statusConfig.color)}>
                            {status === "complete" ? "Done" : status}
                          </span>
                        </div>
                      </div>

                      {/* Parties */}
                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                            <span className="text-gray-300">{shortenAddress(escrow.account.client, 4)}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-600" />
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300">{shortenAddress(escrow.account.freelancer, 4)}</span>
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-600" />
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="p-4 rounded-xl bg-[#0f0b15] border border-[#2f2249] flex flex-col items-center justify-center">
                          <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">
                            {isCompleted ? "Settled Amount" : status === "disputed" ? "Locked Amount" : "Escrow Amount"}
                          </span>
                          <span className={cn(
                            "text-3xl font-bold",
                            isCompleted ? "text-gray-400" : "text-gradient"
                          )}>
                            {formatSOL(escrow.account.amount.toNumber())} SOL
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                        <span className="flex-1 bg-white/5 group-hover:bg-white/10 text-white text-sm font-medium py-2 rounded-lg transition-colors text-center">
                          {isDisputed ? "View Dispute" : isCompleted ? "Receipt" : "View Details"}
                        </span>
                        <span className="bg-[#6a25f4]/20 group-hover:bg-[#6a25f4]/30 text-[#6a25f4] p-2 rounded-lg transition-colors">
                          {isDisputed ? (
                            <Gavel className="w-4 h-4" />
                          ) : isCompleted ? (
                            <History className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <Footer />
      </div>
    </main>
  );
}
