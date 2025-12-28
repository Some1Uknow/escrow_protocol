# Freelance Escrow Frontend

This is the frontend for the Freelance Escrow Solana program.

## Getting Started

1.  Install dependencies:
    ```bash
    pnpm install
    ```

2.  Run the development server:
    ```bash
    pnpm dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## Configuration

-   **Program ID**: The program ID is configured in `utils/constants.ts`. Ensure it matches your deployed program ID.
-   **Network**: The wallet adapter is set to `devnet` in `components/WalletContextProvider.tsx`. Change it to `localhost` or `mainnet-beta` as needed.

# Freelance Escrow Frontend

Frontend for EscrowProtocol — a simple Next.js app that connects to the on-chain Escrow program to make freelance payments secure and transparent.

## About EscrowProtocol

Freelance payments are messy and there are a lot of scams. EscrowProtocol fixes that by holding funds in a secure on-chain escrow until agreed work is approved. Freelancers get paid when work is accepted; clients get quality or refunds. This project pairs a Next.js frontend with a Solana + Anchor program to provide milestone approvals, dispute initiation, and automatic/refund flows.

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Run the development server:

```bash
pnpm dev
```

3. Open http://localhost:3000 in your browser.

## Configuration

- **Program ID**: The program ID is configured in `utils/constants.ts`. Ensure it matches your deployed program ID.
- **Network**: The wallet adapter is set to `devnet` in `components/WalletContextProvider.tsx`. Change it to `localhost` or `mainnet-beta` as needed.

## Features

- **Connect Wallet**: Supports Phantom, Solflare, etc.
- **Create Escrow**: Initialize a new escrow with a freelancer address, amount, and timeout.
- **List Escrows**: View all created escrows.
- **Escrow Details**: View status and perform actions based on your role (Client/Freelancer).
  - **Client**: Deposit funds, approve submission, initiate dispute, request refund.
  - **Freelancer**: Submit work, withdraw payment when approved.

## Helpful Links

- Smart contract: [solana-program](../solana-program)
- IDL: `utils/idl.json`

## Development Notes

- The frontend uses `hooks/useEscrowProgram.ts` and `hooks/useEscrowHistory.ts` to interact with the Anchor program.
- UI components live in `components/` and `ui/`.
