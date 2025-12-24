"use client";

import { useState } from "react";
import { useEscrowProgram } from "@/hooks/useEscrowProgram";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  Wallet,
  Upload,
  CheckCircle,
  Download,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Info,
} from "lucide-react";

interface EscrowActionsProps {
  escrowAddress: PublicKey;
  escrowAccount: {
    client: PublicKey;
    freelancer: PublicKey;
    amount: { toNumber: () => number };
    status: Record<string, object>;
    workLink: string;
    disputeTimeoutDays: number;
  };
  onUpdate: () => void;
}

export const EscrowActions = ({ escrowAddress, escrowAccount, onUpdate }: EscrowActionsProps) => {
  const program = useEscrowProgram();
  const { publicKey } = useWallet();
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [workLink, setWorkLink] = useState("");

  if (!program || !publicKey) {
    return (
      <div className="p-6 text-center bg-white/5 border border-white/10 border-dashed rounded-xl">
        <Wallet className="w-8 h-8 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">Connect your wallet to perform actions</p>
      </div>
    );
  }

  const isClient = publicKey.equals(escrowAccount.client);
  const isFreelancer = publicKey.equals(escrowAccount.freelancer);
  const status = Object.keys(escrowAccount.status)[0];

  if (!isClient && !isFreelancer) {
    return (
      <div className="p-6 bg-white/5 border border-white/10 border-dashed rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-300">View Only</p>
            <p className="text-sm text-gray-500 mt-1">
              You are not a party to this escrow contract. Only the client or freelancer can perform actions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleAction = async (
    actionName: string,
    displayName: string,
    args: unknown[] = [],
    accounts: Record<string, PublicKey | typeof SystemProgram.programId> = {}
  ) => {
    try {
      setLoading(actionName);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const methods = program.methods as any;
      const method = methods[actionName];
      if (typeof method !== "function") {
        throw new Error(`Method ${actionName} not found`);
      }
      
      const tx = await method(...args)
        .accounts({
          escrowAccount: escrowAddress,
          ...accounts,
        })
        .rpc();

      showToast(`${displayName} successful!`, "success", tx);
      onUpdate();
    } catch (err) {
      console.error(err);
      const errorMessage = (err as Error).message;
      showToast(`Failed: ${errorMessage.slice(0, 100)}`, "error");
    } finally {
      setLoading(null);
    }
  };

  const renderClientActions = () => {
    const actions = [];

    // Deposit Funds
    if (status === "pending") {
      actions.push(
        <div key="deposit" className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Wallet className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-emerald-300">Ready to Deposit</p>
              <p className="text-sm text-emerald-400/80 mt-1">
                Deposit {(escrowAccount.amount.toNumber() / 1_000_000_000).toFixed(4)} SOL to activate this escrow.
              </p>
            </div>
          </div>
          <Button
            onClick={() =>
              handleAction("depositFunds", "Deposit", [], {
                client: publicKey,
                systemProgram: SystemProgram.programId,
              })
            }
            loading={loading === "depositFunds"}
            variant="success"
            size="lg"
            className="w-full"
          >
            <Wallet className="w-4 h-4" />
            Deposit {(escrowAccount.amount.toNumber() / 1_000_000_000).toFixed(4)} SOL
          </Button>
        </div>
      );
    }

    // Approve Submission
    if (status === "submitted") {
      actions.push(
        <div key="approve" className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-[#6a25f4]/10 rounded-xl border border-[#6a25f4]/20">
            <ExternalLink className="w-5 h-5 text-[#6a25f4] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-[#8b5cf6]">Work Submitted for Review</p>
              <a
                href={escrowAccount.workLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#8b5cf6] underline hover:text-[#a78bfa] break-all"
              >
                {escrowAccount.workLink}
              </a>
            </div>
          </div>
          <Button
            onClick={() =>
              handleAction("approveSubmission", "Approval", [], {
                client: publicKey,
              })
            }
            loading={loading === "approveSubmission"}
            variant="success"
            size="lg"
            className="w-full"
          >
            <CheckCircle className="w-4 h-4" />
            Approve & Release Payment
          </Button>
        </div>
      );
    }

    // Initiate Dispute
    if (status === "funded" || status === "submitted") {
      actions.push(
        <div key="dispute" className="pt-4 border-t border-white/10">
          <Button
            onClick={() =>
              handleAction("initiateDispute", "Dispute", [], {
                client: publicKey,
              })
            }
            loading={loading === "initiateDispute"}
            variant="danger"
            className="w-full"
          >
            <AlertTriangle className="w-4 h-4" />
            Initiate Dispute
          </Button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Only use if there's a genuine issue with the work
          </p>
        </div>
      );
    }

    // Refund Client
    if (status === "disputed" || status === "funded") {
      const canRefund = status === "disputed";
      actions.push(
        <div key="refund" className="space-y-3">
          {status === "disputed" && (
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-300">Dispute Active</p>
                <p className="text-sm text-amber-400/80 mt-1">
                  You can now request a refund of your deposited funds.
                </p>
              </div>
            </div>
          )}
          <Button
            onClick={() =>
              handleAction("refundClient", "Refund", [], {
                client: publicKey,
                systemProgram: SystemProgram.programId,
              })
            }
            loading={loading === "refundClient"}
            variant="secondary"
            className="w-full"
            disabled={!canRefund && status === "funded"}
          >
            <RotateCcw className="w-4 h-4" />
            Request Refund
          </Button>
          {status === "funded" && (
            <p className="text-xs text-gray-500 text-center">
              Refund available after {escrowAccount.disputeTimeoutDays} days if no work is submitted
            </p>
          )}
        </div>
      );
    }

    return actions;
  };

  const renderFreelancerActions = () => {
    const actions = [];

    // Submit Work
    if (status === "funded") {
      actions.push(
        <div key="submit" className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            <Upload className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-cyan-300">Funds Received</p>
              <p className="text-sm text-cyan-400/80 mt-1">
                The client has deposited funds. Submit your completed work to proceed.
              </p>
            </div>
          </div>
          <Input
            label="Work Submission Link"
            placeholder="https://github.com/... or https://drive.google.com/..."
            value={workLink}
            onChange={(e) => setWorkLink(e.target.value)}
            leftIcon={<ExternalLink className="w-4 h-4" />}
            hint="Provide a link to your completed work (GitHub, Google Drive, etc.)"
          />
          <Button
            onClick={() =>
              handleAction("submitWork", "Work submission", [workLink], {
                freelancer: publicKey,
              })
            }
            loading={loading === "submitWork"}
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!workLink.trim()}
          >
            <Upload className="w-4 h-4" />
            Submit Work
          </Button>
        </div>
      );
    }

    // Waiting for approval
    if (status === "submitted") {
      actions.push(
        <div key="waiting" className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
          <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-300">Awaiting Client Approval</p>
            <p className="text-sm text-amber-400/80 mt-1">
              Your work has been submitted. Waiting for the client to review and approve.
            </p>
          </div>
        </div>
      );
    }

    // Withdraw Payment
    if (status === "approved") {
      actions.push(
        <div key="withdraw" className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-emerald-300">Work Approved! 🎉</p>
              <p className="text-sm text-emerald-400/80 mt-1">
                The client has approved your work. Withdraw your payment now.
              </p>
            </div>
          </div>
          <Button
            onClick={() =>
              handleAction("withdrawPayment", "Withdrawal", [], {
                freelancer: publicKey,
                systemProgram: SystemProgram.programId,
              })
            }
            loading={loading === "withdrawPayment"}
            variant="success"
            size="lg"
            className="w-full"
          >
            <Download className="w-4 h-4" />
            Withdraw {(escrowAccount.amount.toNumber() / 1_000_000_000).toFixed(4)} SOL
          </Button>
        </div>
      );
    }

    return actions;
  };

  // Complete or Refunded state
  if (status === "complete" || status === "refunded") {
    return (
      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center justify-center gap-3">
          <CheckCircle className={`w-6 h-6 ${status === "complete" ? "text-emerald-400" : "text-gray-400"}`} />
          <p className="text-lg font-medium text-gray-300">
            {status === "complete" ? "Escrow completed successfully" : "Escrow has been refunded"}
          </p>
        </div>
      </div>
    );
  }

  const clientActions = isClient ? renderClientActions() : [];
  const freelancerActions = isFreelancer ? renderFreelancerActions() : [];
  const allActions = [...clientActions, ...freelancerActions];

  if (allActions.length === 0) {
    return (
      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center justify-center gap-3">
          <Info className="w-5 h-5 text-gray-500" />
          <p className="text-gray-400">No actions available at this stage</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6 border-t border-white/10">
      <h3 className="text-lg font-semibold text-white">Available Actions</h3>
      <div className="space-y-4">{allActions}</div>
    </div>
  );
};
