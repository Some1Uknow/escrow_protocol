import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import { useMemo } from "react";
import idl from "@/utils/idl.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EscrowProgram = Program<any>;

export const useEscrowProgram = (): EscrowProgram | null => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (!wallet) return null;
    
    const provider = new AnchorProvider(connection, wallet, {
      preflightCommitment: "processed",
    });
    setProvider(provider);
    
    // Create program with new Anchor 0.30+ API
    // The IDL from target/idl already has the address field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Program(idl as any, provider) as EscrowProgram;
  }, [connection, wallet]);

  return program;
};
