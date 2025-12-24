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

## Features

-   **Connect Wallet**: Supports Phantom, Solflare, etc.
-   **Create Escrow**: Initialize a new escrow with a freelancer address, amount, and timeout.
-   **List Escrows**: View all created escrows.
-   **Escrow Details**: View status and perform actions based on your role (Client/Freelancer).
    -   **Client**: Deposit Funds, Approve Submission, Initiate Dispute, Refund Client.
    -   **Freelancer**: Submit Work, Withdraw Payment.
