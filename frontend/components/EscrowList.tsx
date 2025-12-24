"use client";

import { useEffect, useState } from "react";
import { useEscrowProgram } from "@/hooks/useEscrowProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { ArrowRight, Wallet, Filter, RefreshCw, Inbox } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EscrowCardSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";
import { shortenAddress, formatSOL, getStatusColor, getStatusLabel, formatDate } from "@/utils/format";

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

export const EscrowList = () => {
  const program = useEscrowProgram();
  const { publicKey } = useWallet();
  const [escrows, setEscrows] = useState<EscrowAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchEscrows = async () => {
    if (!program) return;
    setLoading(true);
    try {
      // Access account namespace dynamically to avoid TypeScript strict checking
      // The IDL uses snake_case: escrow_account
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (program.account as any).escrowAccount.all();
      setEscrows(accounts as EscrowAccount[]);
    } catch (err) {
      console.error("Error fetching escrows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscrows();
  }, [program]);

  const filteredEscrows = escrows.filter((escrow) => {
    if (!publicKey) return true;
    if (filter === "client") return escrow.account.client.equals(publicKey);
    if (filter === "freelancer") return escrow.account.freelancer.equals(publicKey);
    return true;
  });

  if (!program) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#6a25f4]/10 flex items-center justify-center">
          <Wallet className="w-8 h-8 text-[#6a25f4]" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400 max-w-sm mx-auto">
          Connect your Solana wallet to view and manage escrow contracts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex items-center glass-panel rounded-lg p-1">
            {(["all", "client", "freelancer"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                  filter === f
                    ? "bg-[#6a25f4] text-white shadow-[0_0_10px_rgba(106,37,244,0.3)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {f === "all" ? "All" : f === "client" ? "As Client" : "As Freelancer"}
              </button>
            ))}
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchEscrows}
          loading={loading}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <EscrowCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredEscrows.length === 0 && (
        <div className="glass-panel p-12 text-center rounded-2xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <Inbox className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Escrows Found</h3>
          <p className="text-gray-400 max-w-sm mx-auto mb-6">
            {filter !== "all" 
              ? "No escrows found for this filter. Try selecting 'All' or create a new escrow."
              : "Get started by creating your first escrow contract."}
          </p>
          <Link href="/create">
            <Button>Create Your First Escrow</Button>
          </Link>
        </div>
      )}

      {/* Escrow Grid */}
      {!loading && filteredEscrows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEscrows.map((escrow) => {
            const status = Object.keys(escrow.account.status)[0];
            const isClient = publicKey?.equals(escrow.account.client);
            const isFreelancer = publicKey?.equals(escrow.account.freelancer);
            
            return (
              <Link
                href={`/escrow/${escrow.publicKey.toString()}`}
                key={escrow.publicKey.toString()}
                className="group"
              >
                <div className="h-full glass-panel rounded-2xl hover:border-[#6a25f4]/40 transition-all duration-300 overflow-hidden">
                  {/* Card Header */}
                  <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-400">
                        {shortenAddress(escrow.publicKey, 6)}
                      </span>
                      {(isClient || isFreelancer) && (
                        <Badge variant={isClient ? "info" : "success"}>
                          {isClient ? "You're Client" : "You're Freelancer"}
                        </Badge>
                      )}
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusColor(status))}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="px-6 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Amount</span>
                      <span className="text-xl font-bold text-white">
                        {formatSOL(escrow.account.amount.toNumber())} SOL
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Client</span>
                        <span className="font-mono text-gray-300">
                          {shortenAddress(escrow.account.client)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Freelancer</span>
                        <span className="font-mono text-gray-300">
                          {shortenAddress(escrow.account.freelancer)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created</span>
                        <span className="text-gray-300">
                          {formatDate(escrow.account.createdAt?.toNumber?.() || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-6 py-3 bg-white/[0.02] border-t border-white/5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#6a25f4] font-medium group-hover:text-[#8b5cf6]">
                        View Details
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#6a25f4] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
