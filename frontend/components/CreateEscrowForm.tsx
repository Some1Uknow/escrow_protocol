"use client";

import { useState } from "react";
import { useEscrowProgram } from "@/hooks/useEscrowProgram";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Wallet, User, Coins, Clock, Info, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

export const CreateEscrowForm = () => {
  const program = useEscrowProgram();
  const { publicKey } = useWallet();
  const router = useRouter();
  const { showToast } = useToast();

  const [freelancer, setFreelancer] = useState("");
  const [amount, setAmount] = useState("");
  const [timeout, setTimeout] = useState("30");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!freelancer.trim()) {
      newErrors.freelancer = "Freelancer address is required";
    } else {
      try {
        new PublicKey(freelancer.trim());
      } catch {
        newErrors.freelancer = "Invalid Solana address";
      }
    }

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    } else if (parseFloat(amount) > 100) {
      newErrors.amount = "Maximum amount is 100 SOL";
    }

    const timeoutNum = parseInt(timeout);
    if (isNaN(timeoutNum) || timeoutNum < 1 || timeoutNum > 90) {
      newErrors.timeout = "Timeout must be between 1 and 90 days";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !publicKey) {
      showToast("Please connect your wallet", "error");
      return;
    }

    if (!validate()) return;

    try {
      setLoading(true);
      const freelancerPubkey = new PublicKey(freelancer.trim());
      const amountBN = new BN(parseFloat(amount) * 1_000_000_000);
      const timeoutNum = parseInt(timeout);

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), publicKey.toBuffer(), freelancerPubkey.toBuffer()],
        program.programId
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = await (program.methods as any)
        .initializeEscrow(amountBN, freelancerPubkey, timeoutNum)
        .accounts({
          client: publicKey,
          escrowAccount: escrowPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      showToast("Escrow created successfully!", "success", tx);
      router.push(`/escrow/${escrowPda.toString()}`);
    } catch (err) {
      console.error(err);
      const errorMessage = (err as Error).message;
      if (errorMessage.includes("already in use")) {
        showToast("An escrow with this freelancer already exists", "error");
      } else {
        showToast("Failed to create escrow: " + errorMessage.slice(0, 100), "error");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <div className="glass-panel text-center p-12 rounded-2xl">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#6a25f4]/10 flex items-center justify-center">
            <Wallet className="w-10 h-10 text-[#6a25f4]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
          <p className="text-gray-400 max-w-sm mx-auto">
            Please connect your Solana wallet to create a new escrow contract.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6a25f4]/30 to-[#6a25f4]/5 border border-[#6a25f4]/20 flex items-center justify-center shadow-[0_0_15px_rgba(106,37,244,0.15)]">
              <Coins className="w-6 h-6 text-[#6a25f4]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Create New Escrow</h1>
              <p className="text-gray-400 mt-1">Set up a secure payment contract with a freelancer</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-8 px-6">
            {/* Freelancer Address */}
            <Input
              label="Freelancer Wallet Address"
              placeholder="Enter the freelancer's Solana wallet address"
              value={freelancer}
              onChange={(e) => {
                setFreelancer(e.target.value);
                if (errors.freelancer) setErrors({ ...errors, freelancer: "" });
              }}
              error={errors.freelancer}
              leftIcon={<User className="w-4 h-4" />}
              hint="The freelancer who will complete the work and receive payment"
            />

            {/* Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Amount (SOL)"
                type="number"
                step="0.001"
                min="0.001"
                max="100"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors({ ...errors, amount: "" });
                }}
                error={errors.amount}
                leftIcon={<Coins className="w-4 h-4" />}
                hint="Amount in SOL to be held in escrow"
              />

              <Input
                label="Dispute Timeout (Days)"
                type="number"
                min="1"
                max="90"
                placeholder="30"
                value={timeout}
                onChange={(e) => {
                  setTimeout(e.target.value);
                  if (errors.timeout) setErrors({ ...errors, timeout: "" });
                }}
                error={errors.timeout}
                leftIcon={<Clock className="w-4 h-4" />}
                hint="Days before auto-refund if no work submitted"
              />
            </div>

            {/* Info Box */}
            <div className="flex gap-4 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
              <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-cyan-300">
                <p className="font-medium mb-1">How it works:</p>
                <ol className="list-decimal list-inside space-y-1 text-cyan-400/80">
                  <li>Create the escrow with the freelancer's address and amount</li>
                  <li>Deposit funds to activate the contract</li>
                  <li>Freelancer submits their work with a link</li>
                  <li>Review and approve to release payment</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 px-6 py-6 border-t border-white/10 bg-white/[0.02]">
            <Button
              type="submit"
              loading={loading}
              className="flex-1 sm:flex-none"
              size="lg"
            >
              <CheckCircle className="w-4 h-4" />
              Create Escrow
            </Button>
            <Link href="/" className="flex-1 sm:flex-none">
              <Button type="button" variant="secondary" size="lg" className="w-full">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
