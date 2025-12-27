"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import {
  Wallet,
  Copy,
  ExternalLink,
  Send,
  Download,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { getExplorerUrl } from "@/utils/constants";

// Simple QR Code generator component
const QRCodeDisplay = ({ address }: { address: string }) => {
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Generate QR code with dark background and purple/white pattern for dark theme
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}&bgcolor=0f0b15&color=a78bfa&format=png`;
    setQrImageUrl(qrUrl);
  }, [address]);

  if (!qrImageUrl) {
    return (
      <div className="w-48 h-48 mx-auto bg-white/5 rounded-lg flex items-center justify-center animate-pulse">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-48 h-48 mx-auto bg-[#0f0b15] p-3 rounded-lg border border-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrImageUrl}
        alt="Wallet QR Code"
        className="w-full h-full rounded"
      />
    </div>
  );
};

interface WalletSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabType = "overview" | "send" | "receive";

export const WalletSheet = ({ open, onOpenChange }: WalletSheetProps) => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { showToast } = useToast();

  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Send state
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;
    setLoadingBalance(true);
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Error fetching balance:", error);
      showToast("Failed to fetch balance", "error");
    } finally {
      setLoadingBalance(false);
    }
  }, [publicKey, connection, showToast]);

  useEffect(() => {
    if (open && publicKey) {
      fetchBalance();
    }
  }, [open, publicKey, fetchBalance]);

  const copyAddress = async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey.toBase58());
    showToast("Address copied to clipboard!", "success");
  };

  const handleSend = async () => {
    if (!publicKey || !signTransaction) {
      showToast("Wallet not connected", "error");
      return;
    }

    if (!recipient || !amount) {
      showToast("Please fill in all fields", "error");
      return;
    }

    try {
      setSending(true);
      const recipientPubkey = new PublicKey(recipient);
      const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      showToast("Transaction successful!", "success");
      setRecipient("");
      setAmount("");
      fetchBalance();
      setActiveTab("overview");
    } catch (error) {
      console.error("Error sending SOL:", error);
      showToast("Failed to send transaction", "error");
    } finally {
      setSending(false);
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (!publicKey) return null;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Wallet"
      description="Manage your Solana wallet"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === "overview"
                ? "bg-[#6a25f4] text-white shadow-lg shadow-[#6a25f4]/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Wallet className="w-4 h-4 inline-block mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("send")}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === "send"
                ? "bg-[#6a25f4] text-white shadow-lg shadow-[#6a25f4]/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Send className="w-4 h-4 inline-block mr-2" />
            Send
          </button>
          <button
            onClick={() => setActiveTab("receive")}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === "receive"
                ? "bg-[#6a25f4] text-white shadow-lg shadow-[#6a25f4]/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Download className="w-4 h-4 inline-block mr-2" />
            Receive
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Balance Card */}
            <Card className="p-6 bg-linear-to-br from-[#6a25f4]/10 to-transparent border-[#6a25f4]/20">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-400">Total Balance</span>
                <button
                  onClick={fetchBalance}
                  disabled={loadingBalance}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg disabled:opacity-50"
                  aria-label="Refresh balance"
                >
                  <RefreshCw className={cn("w-4 h-4", loadingBalance && "animate-spin")} />
                </button>
              </div>
              <div className="mb-6">
                {loadingBalance ? (
                  <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">
                      {balance?.toFixed(4) || "0.0000"}
                    </span>
                    <span className="text-xl text-gray-400">SOL</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setActiveTab("send")}
                  variant="primary"
                  size="sm"
                  className="flex-1"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Send
                </Button>
                <Button
                  onClick={() => setActiveTab("receive")}
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                >
                  <ArrowDownLeft className="w-4 h-4 mr-2" />
                  Receive
                </Button>
              </div>
            </Card>

            {/* Address Card */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-400">Wallet Address</span>
                <a
                  href={getExplorerUrl("address", publicKey.toBase58())}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6a25f4] hover:text-[#7c3aff] transition-colors"
                  aria-label="View address on Solana Explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-sm text-white font-mono bg-white/5 px-3 py-2 rounded-lg overflow-x-auto">
                  {publicKey.toBase58()}
                </code>
                <button
                  onClick={copyAddress}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg shrink-0"
                  aria-label="Copy wallet address"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={getExplorerUrl("address", publicKey.toBase58())}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
              >
                <div className="p-2 bg-[#6a25f4]/20 rounded-lg group-hover:bg-[#6a25f4]/30 transition-colors">
                  <TrendingUp className="w-5 h-5 text-[#6a25f4]" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-white">Activity</div>
                  <div className="text-xs text-gray-400">View on explorer</div>
                </div>
              </a>
              <button
                onClick={() => setActiveTab("receive")}
                className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
              >
                <div className="p-2 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/30 transition-colors">
                  <QrCode className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-white">QR Code</div>
                  <div className="text-xs text-gray-400">Show address</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Send Tab */}
        {activeTab === "send" && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-[#6a25f4]" />
                Send SOL
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Recipient Address
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter Solana address..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount (SOL)
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <button
                      onClick={() => balance && setAmount(balance.toString())}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6a25f4] hover:text-[#7c3aff] font-medium"
                    >
                      MAX
                    </button>
                  </div>
                  {balance !== null && (
                    <p className="text-xs text-gray-400 mt-1">
                      Available: {balance.toFixed(4)} SOL
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleSend}
                  disabled={sending || !recipient || !amount}
                  variant="primary"
                  className="w-full"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Transaction
                    </>
                  )}
                </Button>
              </div>
            </Card>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-sm text-amber-200/90">
                <strong>Note:</strong> Double-check the recipient address before sending. Transactions on Solana are irreversible.
              </p>
            </div>
          </div>
        )}

        {/* Receive Tab */}
        {activeTab === "receive" && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-500" />
                Receive SOL
              </h3>

              <div className="space-y-6">
                {/* QR Code */}
                <div className="flex items-center justify-center p-6 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-center">
                    <QRCodeDisplay address={publicKey.toBase58()} />
                    <p className="text-sm text-gray-400 mt-4">
                      Scan QR code to receive SOL
                    </p>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Wallet Address
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3">
                      <code className="text-sm text-white font-mono break-all">
                        {publicKey.toBase58()}
                      </code>
                    </div>
                    <button
                      onClick={copyAddress}
                      className="p-3 bg-[#6a25f4] hover:bg-[#7c3aff] text-white rounded-lg transition-colors shrink-0"
                      aria-label="Copy wallet address"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    copyAddress();
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Address
                </Button>
              </div>
            </Card>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-sm text-blue-200/90">
                <strong>Info:</strong> Share this address to receive SOL from others. Only send Solana (SOL) to this address.
              </p>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
};
