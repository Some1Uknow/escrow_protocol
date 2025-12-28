# Freelance Escrow on Solana

A decentralized escrow platform built on the Solana blockchain to facilitate secure transactions between freelancers and clients. This project uses Anchor for the Solana program and Next.js for the frontend interface.

## Project Structure

- `frontend/`: Next.js application for the user interface
- `solana-program/`: Anchor-based Solana smart contract

## Prerequisites

- Node.js (v18 or higher)
- pnpm
- Rust (latest stable)
- Solana CLI tools
- Anchor framework

## Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd freelance_escrow
```

### 2. Install Dependencies

#### Frontend
```bash
cd frontend
pnpm install
```

#### Solana Program
```bash
cd ../solana-program
pnpm install
```

### 3. Configure Solana

Ensure you have a Solana wallet and are connected to the desired network (devnet for testing).

```bash
solana config set --url https://api.devnet.solana.com
solana-keygen new  # if you don't have a wallet
```

### 4. Build and Deploy the Solana Program

```bash
cd solana-program
anchor build
anchor deploy
```

Note the program ID from the deployment output. Update the frontend configuration if necessary.

### 5. Configure Frontend

Update the program ID and other constants in `frontend/utils/constants.ts` if needed.

### 6. Run the Application

#### Frontend
```bash
cd frontend
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Usage

1. Connect your Solana wallet using the wallet interface.
2. Create an escrow by specifying the recipient, amount, and conditions.
3. The escrow holds funds until conditions are met.
4. Release or dispute funds as appropriate.

## Testing

### Solana Program Tests
```bash
cd solana-program
anchor test
```

### Frontend Tests
```bash
cd frontend
pnpm test
```

## Deployment

### Solana Program
```bash
anchor build --provider.cluster mainnet-beta
anchor deploy --provider.cluster mainnet-beta
```

### Frontend
Build and deploy the Next.js app to your preferred hosting service (Vercel, Netlify, etc.).

```bash
cd frontend
pnpm build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is licensed under the MIT License.