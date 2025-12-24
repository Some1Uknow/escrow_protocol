"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useEscrowProgram } from "@/hooks/useEscrowProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { EscrowActions } from "@/components/EscrowActions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { PublicKey } from "@solana/web3.js";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Clock,
  User,
  Users,
  Coins,
  Calendar,
  CheckCircle,
  Circle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/utils/cn";
import { shortenAddress, formatSOL, formatDate, getStatusColor, getStatusLabel } from "@/utils/format";
import { getExplorerUrl } from "@/utils/constants";

interface EscrowAccountData {
  client: PublicKey;
  freelancer: PublicKey;
  amount: { toNumber: () => number };
  status: Record<string, object>;
  workLink: string;
  bump: number;
  createdAt: { toNumber: () => number };
  fundedAt: { toNumber: () => number };
  submittedAt: { toNumber: () => number };
  approvedAt: { toNumber: () => number };
  completedAt: { toNumber: () => number };
  disputedAt: { toNumber: () => number };
  refundedAt: { toNumber: () => number };
  disputeTimeoutDays: number;
}

const timelineSteps = [
  { status: "pending", label: "Created", icon: Circle },
  { status: "funded", label: "Funded", icon: Coins },
  { status: "submitted", label: "Work Submitted", icon: Clock },
  { status: "approved", label: "Approved", icon: CheckCircle },
  { status: "complete", label: "Complete", icon: CheckCircle },
];

export default function EscrowDetailPage() {
  const { address } = useParams();
  const program = useEscrowProgram();
  const { publicKey } = useWallet();
  const { showToast } = useToast();
  const [escrowAccount, setEscrowAccount] = useState<EscrowAccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);

  const fetchEscrow = useCallback(async () => {
    if (!program || !address) return;
    setLoading(true);
    setError(null);
    setIsClosed(false);
    try {
      // Access account namespace dynamically to avoid TypeScript strict checking
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (program.account as any).escrowAccount.fetch(new PublicKey(address as string));
      setEscrowAccount(account as EscrowAccountData);
    } catch (err) {
      console.error("Error fetching escrow:", err);
      const errorMsg = (err as Error).message || "";
      // Check if account doesn't exist (closed after completion/refund)
      if (errorMsg.includes("Account does not exist") || errorMsg.includes("could not find")) {
        setIsClosed(true);
        setError("This escrow has been completed and the account is closed.");
      } else {
        setError("Failed to load escrow. It may not exist or the address is invalid.");
      }
    } finally {
      setLoading(false);
    }
  }, [program, address]);

  useEffect(() => {
    fetchEscrow();
  }, [fetchEscrow]);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    showToast("Address copied to clipboard", "success");
  };

  const status = escrowAccount ? Object.keys(escrowAccount.status)[0] : "";
  const isClient = publicKey && escrowAccount?.client.equals(publicKey);
  const isFreelancer = publicKey && escrowAccount?.freelancer.equals(publicKey);
  const isDisputed = status === "disputed";
  const isRefunded = status === "refunded";

  const getTimelineIndex = () => {
    if (isDisputed || isRefunded) return -1;
    return timelineSteps.findIndex((s) => s.status === status);
  };

  const currentStep = getTimelineIndex();

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050510] text-white overflow-x-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div 
            className="orb orb-primary animate-float-slow"
            style={{ width: '400px', height: '400px', top: '-50px', right: '-50px' }}
          />
          <div 
            className="orb orb-cyan animate-float-medium"
            style={{ width: '300px', height: '300px', bottom: '20%', left: '-50px' }}
          />
        </div>
        <div className="relative z-10 flex min-h-screen flex-col">
          <Navbar />
          <div className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32 w-full">
            <Skeleton className="h-8 w-32 mb-6" />
            <div className="glass-panel rounded-2xl p-6">
              <Skeleton className="h-8 w-64 mb-6" />
              <div className="space-y-6">
                <div className="flex gap-6">
                  <Skeleton className="h-24 flex-1" />
                  <Skeleton className="h-24 flex-1" />
                </div>
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </main>
    );
  }

  if (error || !escrowAccount) {
    return (
      <main className="min-h-screen bg-[#050510] text-white overflow-x-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div 
            className="orb orb-primary animate-float-slow"
            style={{ width: '400px', height: '400px', top: '-50px', right: '-50px' }}
          />
        </div>
        <div className="relative z-10 flex min-h-screen flex-col">
          <Navbar />
          <div className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32 w-full">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <div className="glass-panel p-12 text-center rounded-2xl">
              {isClosed ? (
                <>
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-white mb-2">Escrow Completed</h2>
                  <p className="text-gray-400 mb-4">
                    This escrow contract has been successfully completed and closed.
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    The funds have been transferred and the account has been closed to recover rent.
                  </p>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-white mb-2">Escrow Not Found</h2>
                  <p className="text-gray-400 mb-6">{error || "This escrow contract does not exist."}</p>
                </>
              )}
              <Link href="/">
                <Button>Return to Dashboard</Button>
              </Link>
            </div>
          </div>
          <Footer />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050510] text-white overflow-x-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="orb orb-primary animate-float-slow"
          style={{ width: '400px', height: '400px', top: '-50px', right: '-50px' }}
        />
        <div 
          className="orb orb-cyan animate-float-medium"
          style={{ width: '300px', height: '300px', bottom: '20%', left: '-50px' }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32 w-full">
          {/* Back Button */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <Button variant="secondary" size="sm" onClick={fetchEscrow}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Main Card */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#6a25f4] to-indigo-600 px-6 py-8 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold">Escrow Contract</h1>
                    {(isClient || isFreelancer) && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur">
                        {isClient ? "You're the Client" : "You're the Freelancer"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-violet-200">
                    <span className="font-mono text-sm">{shortenAddress(address as string, 8)}</span>
                    <button onClick={() => copyAddress(address as string)} className="p-1 hover:bg-white/10 rounded" title="Copy address" aria-label="Copy address">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={getExplorerUrl("address", address as string)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-white/10 rounded"
                      title="View on Solana Explorer"
                      aria-label="View on Solana Explorer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-violet-200 text-sm mb-1">Contract Value</p>
                  <p className="text-3xl font-bold">{formatSOL(escrowAccount.amount.toNumber())} SOL</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">Current Status:</span>
                  <span className={cn("px-3 py-1.5 rounded-full text-sm font-medium border", getStatusColor(status))}>
                    {getStatusLabel(status)}
                  </span>
                </div>
                {escrowAccount.disputeTimeoutDays > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    {escrowAccount.disputeTimeoutDays} day timeout
                  </div>
                )}
              </div>

              {/* Timeline (only show for normal flow) */}
              {!isDisputed && !isRefunded && (
                <div className="py-4">
                  <div className="flex items-center justify-between relative">
                    {/* Progress Line */}
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-white/10" />
                    <div
                      className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-[#6a25f4] to-indigo-500 transition-all duration-500"
                      style={{ width: `${Math.max(0, (currentStep / (timelineSteps.length - 1)) * 100)}%` }}
                    />

                    {timelineSteps.map((step, index) => {
                      const Icon = step.icon;
                      const isActive = index <= currentStep;
                      const isCurrent = index === currentStep;

                      return (
                        <div key={step.status} className="relative flex flex-col items-center z-10">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                              isActive
                                ? "bg-gradient-to-br from-[#6a25f4] to-indigo-600 text-white shadow-[0_0_15px_rgba(106,37,244,0.4)]"
                                : "bg-white/10 text-gray-500",
                              isCurrent && "ring-4 ring-[#6a25f4]/20 animate-pulse-glow"
                            )}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <span
                            className={cn(
                              "mt-2 text-xs font-medium text-center",
                              isActive ? "text-white" : "text-gray-500"
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Disputed/Refunded Banner */}
              {(isDisputed || isRefunded) && (
                <div className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border",
                  isDisputed ? "bg-red-500/10 border-red-500/20" : "bg-white/5 border-white/10"
                )}>
                  <AlertTriangle className={cn("w-6 h-6", isDisputed ? "text-red-400" : "text-gray-400")} />
                  <div>
                    <p className={cn("font-medium", isDisputed ? "text-red-300" : "text-gray-300")}>
                      {isDisputed ? "This escrow is under dispute" : "This escrow has been refunded"}
                    </p>
                    <p className={cn("text-sm", isDisputed ? "text-red-400/80" : "text-gray-400")}>
                      {isDisputed
                        ? "The client has initiated a dispute. Funds are locked until resolution."
                        : "Funds have been returned to the client."}
                    </p>
                  </div>
                </div>
              )}

              {/* Parties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Client</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-white">{shortenAddress(escrowAccount.client, 6)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyAddress(escrowAccount.client.toString())}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title="Copy client address"
                        aria-label="Copy client address"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                      <a
                        href={getExplorerUrl("address", escrowAccount.client.toString())}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title="View client on Solana Explorer"
                        aria-label="View client on Solana Explorer"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">Freelancer</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-white">{shortenAddress(escrowAccount.freelancer, 6)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyAddress(escrowAccount.freelancer.toString())}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title="Copy freelancer address"
                        aria-label="Copy freelancer address"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                      <a
                        href={getExplorerUrl("address", escrowAccount.freelancer.toString())}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title="View freelancer on Solana Explorer"
                        aria-label="View freelancer on Solana Explorer"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Link */}
              {escrowAccount.workLink && (
                <div className="p-4 bg-[#6a25f4]/10 rounded-xl border border-[#6a25f4]/20">
                  <div className="flex items-center gap-2 text-[#6a25f4] mb-2">
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm font-medium">Submitted Work</span>
                  </div>
                  <a
                    href={escrowAccount.workLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#8b5cf6] hover:text-[#a78bfa] underline break-all"
                  >
                    {escrowAccount.workLink}
                  </a>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Created</p>
                  <p className="text-white font-medium">{formatDate(escrowAccount.createdAt.toNumber())}</p>
                </div>
                {escrowAccount.fundedAt.toNumber() > 0 && (
                  <div>
                    <p className="text-gray-500 mb-1">Funded</p>
                    <p className="text-white font-medium">{formatDate(escrowAccount.fundedAt.toNumber())}</p>
                  </div>
                )}
                {escrowAccount.submittedAt.toNumber() > 0 && (
                  <div>
                    <p className="text-gray-500 mb-1">Submitted</p>
                    <p className="text-white font-medium">{formatDate(escrowAccount.submittedAt.toNumber())}</p>
                  </div>
                )}
                {escrowAccount.completedAt.toNumber() > 0 && (
                  <div>
                    <p className="text-gray-500 mb-1">Completed</p>
                    <p className="text-white font-medium">{formatDate(escrowAccount.completedAt.toNumber())}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <EscrowActions
                escrowAddress={new PublicKey(address as string)}
                escrowAccount={escrowAccount}
                onUpdate={fetchEscrow}
              />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </main>
  );
}
