"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { PROGRAM_ID } from "@/utils/constants";

// Event discriminators from the IDL (first 8 bytes of sha256 hash)
const EVENT_DISCRIMINATORS: Record<string, number[]> = {
  EscrowInitialized: [222, 186, 157, 47, 145, 142, 176, 248],
  FundsDeposited: [157, 209, 100, 95, 59, 100, 3, 68],
  WorkSubmitted: [136, 185, 210, 174, 216, 140, 64, 125],
  SubmissionApproved: [59, 102, 182, 29, 243, 202, 148, 164],
  PaymentWithdrawn: [200, 205, 112, 86, 86, 57, 176, 26],
  DisputeInitiated: [150, 109, 93, 252, 198, 4, 183, 153],
  ClientRefunded: [10, 208, 200, 224, 210, 248, 122, 241],
};

export interface HistoricalEscrow {
  address: string;
  client: string;
  freelancer: string;
  amount: number; // in lamports
  status: "complete" | "refunded" | string;
  workLink?: string;
  createdAt: number; // timestamp in ms
  fundedAt?: number;
  completedAt: number; // timestamp in ms
  disputeTimeoutDays?: number;
  txSignature?: string; // transaction that closed this escrow
  source: "onchain" | "cached"; // where this data came from
  savedAt?: number;
}

interface EscrowEventData {
  escrowKey: string;
  client?: string;
  freelancer?: string;
  amount?: number;
}

const CACHE_KEY = "escrow_history_v2";
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

interface CacheData {
  history: HistoricalEscrow[];
  lastFetch: number;
  lastSignature: string | null;
}

// Decode event data from buffer
function decodeEventData(
  eventName: string,
  data: Uint8Array
): Record<string, unknown> | null {
  try {
    let offset = 0;
    const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);

    const readPubkey = (): string => {
      const pubkeyBytes = data.slice(offset, offset + 32);
      const pubkey = new PublicKey(pubkeyBytes).toBase58();
      offset += 32;
      return pubkey;
    };

    const readU64 = (): number => {
      // Read as two 32-bit values (little endian)
      const low = dataView.getUint32(offset, true);
      const high = dataView.getUint32(offset + 4, true);
      offset += 8;
      return low + high * 0x100000000;
    };

    const readString = (): string => {
      const len = dataView.getUint32(offset, true);
      offset += 4;
      const strBytes = data.slice(offset, offset + len);
      const str = new TextDecoder().decode(strBytes);
      offset += len;
      return str;
    };

    switch (eventName) {
      case "EscrowInitialized":
        return {
          escrowKey: readPubkey(),
          client: readPubkey(),
          freelancer: readPubkey(),
          amount: readU64(),
        };

      case "FundsDeposited":
        return {
          escrowKey: readPubkey(),
          amount: readU64(),
        };

      case "WorkSubmitted":
        return {
          escrowKey: readPubkey(),
          freelancer: readPubkey(),
          workLink: readString(),
        };

      case "SubmissionApproved":
        return {
          escrowKey: readPubkey(),
          client: readPubkey(),
        };

      case "PaymentWithdrawn":
        return {
          escrowKey: readPubkey(),
          freelancer: readPubkey(),
          amount: readU64(),
        };

      case "DisputeInitiated":
        return {
          escrowKey: readPubkey(),
          initiator: readPubkey(),
        };

      case "ClientRefunded":
        return {
          escrowKey: readPubkey(),
          client: readPubkey(),
          amount: readU64(),
        };

      default:
        return null;
    }
  } catch (e) {
    console.error(`Error decoding ${eventName}:`, e);
    return null;
  }
}

// Parse Anchor events from transaction logs
function parseEventsFromLogs(
  logs: string[],
  programId: string
): { name: string; data: Record<string, unknown> }[] {
  const events: { name: string; data: Record<string, unknown> }[] = [];
  const programPrefix = `Program ${programId}`;
  const dataPrefix = "Program data: ";

  let inProgram = false;

  for (const log of logs) {
    if (log.startsWith(programPrefix)) {
      inProgram = log.includes("invoke");
      if (log.includes("success")) inProgram = false;
    }

    if (inProgram && log.startsWith(dataPrefix)) {
      try {
        const base64Data = log.slice(dataPrefix.length);
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // First 8 bytes are the event discriminator
        const discriminator = Array.from(buffer.slice(0, 8));
        
        // Match discriminator to event type
        for (const [eventName, disc] of Object.entries(EVENT_DISCRIMINATORS)) {
          if (discriminator.every((v, i) => v === disc[i])) {
            const eventData = decodeEventData(eventName, buffer.slice(8));
            if (eventData) {
              events.push({ name: eventName, data: eventData });
            }
            break;
          }
        }
      } catch {
        // Skip unparseable logs
      }
    }
  }

  return events;
}

export const useEscrowHistory = (walletAddress: string | null) => {
  const { connection } = useConnection();
  const [history, setHistory] = useState<HistoricalEscrow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  // Load cached data on mount
  useEffect(() => {
    if (!walletAddress) {
      setHistory([]);
      return;
    }

    try {
      const cached = localStorage.getItem(`${CACHE_KEY}_${walletAddress}`);
      if (cached) {
        const cacheData: CacheData = JSON.parse(cached);
        setHistory(cacheData.history.map(h => ({ ...h, source: "cached" as const })));
      }
    } catch {
      console.error("Error loading cache");
    }
  }, [walletAddress]);

  // Fetch transaction history from blockchain
  const fetchOnChainHistory = useCallback(async (forceRefresh = false) => {
    if (!walletAddress || !connection || fetchingRef.current) return;

    // Check cache freshness
    const cacheKey = `${CACHE_KEY}_${walletAddress}`;
    let cachedData: CacheData | null = null;
    
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        cachedData = JSON.parse(cached);
        if (!forceRefresh && cachedData && Date.now() - cachedData.lastFetch < CACHE_EXPIRY) {
          return; // Cache is fresh
        }
      }
    } catch {
      // Ignore cache errors
    }

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const walletPubkey = new PublicKey(walletAddress);
      
      console.log("[History] Fetching transaction history for:", walletAddress);
      console.log("[History] Using RPC:", connection.rpcEndpoint);
      
      // Fetch signatures for transactions involving this wallet (limit to 30 to avoid rate limits)
      let signatures;
      try {
        signatures = await connection.getSignaturesForAddress(
          walletPubkey,
          { limit: 30 },
          "confirmed"
        );
      } catch (sigError) {
        // Check for 403 Forbidden early
        const sigErrorMsg = sigError instanceof Error ? sigError.message : String(sigError);
        if (sigErrorMsg.includes("403") || sigErrorMsg.includes("Forbidden")) {
          console.warn(
            "[History] RPC returned 403 Forbidden - using cached data only.",
            "\nUpdate RPC_ENDPOINT in constants.ts with a valid Helius API key or public RPC."
          );
          setLoading(false);
          fetchingRef.current = false;
          return;
        }
        throw sigError;
      }

      console.log("[History] Found", signatures.length, "transactions");

      if (signatures.length === 0) {
        console.log("[History] No transactions found");
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      // Build a map of escrow events
      const escrowsMap = new Map<string, {
        address: string;
        client?: string;
        freelancer?: string;
        amount?: number;
        status?: "complete" | "refunded";
        createdAt?: number;
        completedAt?: number;
        txSignature?: string;
      }>();

      // Helper to delay between requests
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // Fetch transaction details in small batches with delays
      const batchSize = 3; // Smaller batch size to avoid rate limits
      for (let i = 0; i < signatures.length; i += batchSize) {
        const batch = signatures.slice(i, i + batchSize);
        
        // Add delay between batches (except for first batch)
        if (i > 0) {
          await delay(500); // 500ms delay between batches
        }

        let txs;
        try {
          txs = await connection.getParsedTransactions(
            batch.map(s => s.signature),
            { maxSupportedTransactionVersion: 0 }
          );
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          
          // Check for 403 Forbidden - exit immediately
          if (errMsg.includes("403") || errMsg.includes("Forbidden")) {
            console.warn("[History] RPC returned 403 - using cached data only");
            setLoading(false);
            fetchingRef.current = false;
            return;
          }
          
          // If rate limited, wait longer and retry once
          console.warn("Rate limited, retrying after delay...");
          await delay(2000);
          try {
            txs = await connection.getParsedTransactions(
              batch.map(s => s.signature),
              { maxSupportedTransactionVersion: 0 }
            );
          } catch (retryErr) {
            const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
            if (retryMsg.includes("403") || retryMsg.includes("Forbidden")) {
              console.warn("[History] RPC returned 403 - using cached data only");
              setLoading(false);
              fetchingRef.current = false;
              return;
            }
            console.warn("Failed to fetch batch after retry, skipping");
            continue;
          }
        }

        if (!txs) continue;

        for (let j = 0; j < txs.length; j++) {
          const tx = txs[j];
          const sig = batch[j];
          
          if (!tx?.meta?.logMessages) continue;

          // Check if this transaction involves our program
          const invokesProgram = tx.meta.logMessages.some(
            log => log.includes(PROGRAM_ID.toBase58())
          );
          
          if (!invokesProgram) continue;

          console.log("[History] Found program transaction:", sig.signature);

          // Parse events from logs
          const events = parseEventsFromLogs(
            tx.meta.logMessages,
            PROGRAM_ID.toBase58()
          );

          console.log("[History] Parsed events:", events.map(e => e.name));

          for (const event of events) {
            const data = event.data as unknown as EscrowEventData;
            
            if (event.name === "EscrowInitialized") {
              if (data.client === walletAddress || data.freelancer === walletAddress) {
                const existing = escrowsMap.get(data.escrowKey) || { address: data.escrowKey };
                escrowsMap.set(data.escrowKey, {
                  ...existing,
                  client: data.client,
                  freelancer: data.freelancer,
                  amount: data.amount,
                  createdAt: (sig.blockTime || 0) * 1000,
                });
              }
            }

            if (event.name === "PaymentWithdrawn") {
              if (data.freelancer === walletAddress || escrowsMap.has(data.escrowKey)) {
                const existing = escrowsMap.get(data.escrowKey) || { address: data.escrowKey };
                escrowsMap.set(data.escrowKey, {
                  ...existing,
                  freelancer: data.freelancer,
                  amount: data.amount,
                  status: "complete",
                  completedAt: (sig.blockTime || 0) * 1000,
                  txSignature: sig.signature,
                });
              }
            }

            if (event.name === "ClientRefunded") {
              if (data.client === walletAddress || escrowsMap.has(data.escrowKey)) {
                const existing = escrowsMap.get(data.escrowKey) || { address: data.escrowKey };
                escrowsMap.set(data.escrowKey, {
                  ...existing,
                  client: data.client,
                  amount: data.amount,
                  status: "refunded",
                  completedAt: (sig.blockTime || 0) * 1000,
                  txSignature: sig.signature,
                });
              }
            }
          }
        }
      }

      // Convert map to array, only including completed/refunded escrows
      const completedEscrows: HistoricalEscrow[] = [];
      
      for (const [address, escrow] of escrowsMap) {
        if (escrow.status && (escrow.status === "complete" || escrow.status === "refunded")) {
          completedEscrows.push({
            address,
            client: escrow.client || "",
            freelancer: escrow.freelancer || "",
            amount: escrow.amount || 0,
            status: escrow.status,
            createdAt: escrow.createdAt || escrow.completedAt || 0,
            completedAt: escrow.completedAt || 0,
            txSignature: escrow.txSignature || "",
            source: "onchain",
          });
        }
      }

      // Merge with cached data (prefer on-chain data)
      const mergedHistory = [...completedEscrows];
      if (cachedData?.history) {
        for (const cached of cachedData.history) {
          if (!mergedHistory.some(h => h.address === cached.address)) {
            mergedHistory.push({ ...cached, source: "cached" });
          }
        }
      }

      // Sort by completedAt descending
      mergedHistory.sort((a, b) => b.completedAt - a.completedAt);

      setHistory(mergedHistory);
      
      const newCacheData: CacheData = {
        history: mergedHistory,
        lastFetch: Date.now(),
        lastSignature: signatures[0]?.signature || null,
      };
      
      try {
        localStorage.setItem(cacheKey, JSON.stringify(newCacheData));
      } catch {
        console.error("Error saving cache");
      }

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      
      // Check if it's a 403 Forbidden error (API key issue)
      if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
        console.warn(
          "[History] RPC returned 403 Forbidden - API key may be invalid or not authorized for devnet.",
          "\nFalling back to cached data only.",
          "\nTo fix: Update the RPC endpoint in constants.ts with a valid API key."
        );
        // Don't set error state for 403 - just use cached data silently
      } else {
        console.error("Error fetching on-chain history:", e);
        setError("Failed to fetch transaction history");
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [walletAddress, connection]);

  // Auto-fetch on mount and when wallet changes
  useEffect(() => {
    if (walletAddress) {
      fetchOnChainHistory();
    }
  }, [walletAddress, fetchOnChainHistory]);

  // Save an escrow to local cache (legacy compatibility + immediate feedback)
  const saveToHistory = useCallback(
    (escrow: {
      address: string;
      client: string;
      freelancer: string;
      amount: number;
      status: string;
      workLink?: string;
      createdAt: number;
      fundedAt?: number;
      completedAt?: number;
      disputeTimeoutDays?: number;
    }) => {
      if (!walletAddress) return;

      const historicalEscrow: HistoricalEscrow = {
        ...escrow,
        completedAt: escrow.completedAt || Date.now(),
        savedAt: Date.now(),
        source: "cached",
      };

      setHistory((prev) => {
        const exists = prev.some((h) => h.address === escrow.address);
        let newHistory: HistoricalEscrow[];

        if (exists) {
          newHistory = prev.map((h) =>
            h.address === escrow.address ? { ...h, ...historicalEscrow } : h
          );
        } else {
          newHistory = [historicalEscrow, ...prev];
        }

        newHistory = newHistory.slice(0, 50);

        try {
          const cacheKey = `${CACHE_KEY}_${walletAddress}`;
          const existingCache = localStorage.getItem(cacheKey);
          const cacheData: CacheData = existingCache
            ? JSON.parse(existingCache)
            : { history: [], lastFetch: 0, lastSignature: null };
          
          cacheData.history = newHistory;
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch {
          console.error("Error saving to cache");
        }

        return newHistory;
      });
    },
    [walletAddress]
  );

  // Get completed escrows that are not in the active on-chain list
  const getCompletedEscrows = useCallback(
    (onChainAddresses: string[]) => {
      return history.filter((h) => !onChainAddresses.includes(h.address));
    },
    [history]
  );

  // Remove from history (legacy compatibility)
  const removeFromHistory = useCallback(
    (address: string) => {
      if (!walletAddress) return;

      setHistory((prev) => {
        const newHistory = prev.filter((h) => h.address !== address);
        try {
          const cacheKey = `${CACHE_KEY}_${walletAddress}`;
          const existingCache = localStorage.getItem(cacheKey);
          const cacheData: CacheData = existingCache
            ? JSON.parse(existingCache)
            : { history: [], lastFetch: 0, lastSignature: null };
          
          cacheData.history = newHistory;
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch {
          console.error("Error saving to cache");
        }
        return newHistory;
      });
    },
    [walletAddress]
  );

  // Clear all history
  const clearHistory = useCallback(() => {
    if (!walletAddress) return;
    setHistory([]);
    try {
      localStorage.removeItem(`${CACHE_KEY}_${walletAddress}`);
    } catch {
      console.error("Error clearing cache");
    }
  }, [walletAddress]);

  return {
    history,
    loading,
    error,
    fetchOnChainHistory,
    saveToHistory,
    removeFromHistory,
    getCompletedEscrows,
    clearHistory,
  };
};