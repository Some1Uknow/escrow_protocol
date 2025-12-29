# Freelance Escrow on Solana

A decentralized escrow platform built on the Solana blockchain to facilitate secure transactions between freelancers and clients. This project uses Anchor for the Solana program and Next.js for the frontend interface.

## Project Structure

- `frontend/`: Next.js application for the user interface
- `solana-program/`: Anchor-based Solana program

## EscrowProtocol Program

This repository contains the on-chain Escrow program (EscrowProtocol) written in Rust using Anchor. It provides trustless, PDA-backed escrows for freelance payments so clients and freelancers can transact with confidence.

### About EscrowProtocol

EscrowProtocol makes freelance payments easy by locking funds on-chain until the agreed work is approved. It reduces scams and disputes by providing transparent on-chain history, automated timeout refunds, and a clear approval workflow. Built for Solana with Anchor, the program is designed for low fees and fast confirmations.

### Overview

The program facilitates trustless transactions between clients and freelancers by holding funds in escrow until work is completed and approved. The system includes dispute resolution mechanisms and timeout protections for both parties.

### Program Information

- **Program ID**: `HWkW19PFehhdgfkGPHnTQTnfhcCQhMqokqGx3Vav7a3N`
- **Network**: Solana Devnet
- **Framework**: Anchor
- **Language**: Rust

### Features

#### Core Functionality
- **Escrow Creation**: Clients can create escrow accounts with specified amounts and freelancer addresses
- **Fund Deposit**: Secure deposit of SOL into the escrow account
- **Work Submission**: Freelancers can submit work links for client review
- **Approval System**: Clients can approve submitted work
- **Payment Release**: Approved payments are released to freelancers
- **Dispute Resolution**: Either party can initiate disputes
- **Refund Mechanism**: Automatic refunds for disputed or timed-out escrows

#### Security Features
- **PDA-based Escrow Accounts**: Deterministic addresses using client and freelancer public keys
- **Authorization Checks**: Only authorized parties can perform specific actions
- **Status Validation**: State machine prevents invalid transitions
- **Timeout Protection**: Automatic refunds after specified timeout periods
- **Input Validation**: Comprehensive validation of all inputs

### Escrow Workflow

1. **Initialize**: Client creates escrow with amount, freelancer address, and timeout period
2. **Fund**: Client deposits the agreed amount into the escrow
3. **Submit**: Freelancer submits completed work with a link
4. **Approve**: Client reviews and approves the submission
5. **Withdraw**: Freelancer withdraws the payment

#### Alternative Flows
- **Dispute**: Either party can initiate a dispute for manual resolution
- **Refund**: Client receives refund in case of disputes or timeouts

### Escrow States

- `Pending`: Escrow created, awaiting funding
- `Funded`: Funds deposited, awaiting work submission
- `Submitted`: Work submitted, awaiting client approval
- `Approved`: Work approved, awaiting payment withdrawal
- `Complete`: Payment withdrawn, escrow finished
- `Disputed`: Dispute initiated, requires resolution
- `Refunded`: Funds returned to client

### Account Structure

#### EscrowAccount
```rust
pub struct EscrowAccount {
    pub client: Pubkey,              // Client's public key
    pub freelancer: Pubkey,          // Freelancer's public key
    pub amount: u64,                 // Escrow amount in lamports
    pub status: EscrowStatus,        // Current escrow state
    pub work_link: String,           // Submitted work link
    pub bump: u8,                    // PDA bump seed
    pub created_at: i64,             // Creation timestamp
    pub funded_at: i64,             // Funding timestamp
    pub submitted_at: i64,           // Work submission timestamp
    pub approved_at: i64,            // Approval timestamp
    pub completed_at: i64,           // Completion timestamp
    pub disputed_at: i64,            // Dispute initiation timestamp
    pub refunded_at: i64,            // Refund timestamp
    pub dispute_timeout_days: u8,    // Timeout period in days
}
```

### Instructions

#### initialize_escrow
Creates a new escrow account.
- **Parameters**: `amount`, `freelancer`, `dispute_timeout_days`
- **Signer**: Client
- **Accounts**: Client, EscrowAccount (init), SystemProgram

#### deposit_funds
Deposits funds into the escrow.
- **Signer**: Client
- **Accounts**: Client, EscrowAccount, SystemProgram

#### submit_work
Submits completed work for review.
- **Parameters**: `work_link`
- **Signer**: Freelancer
- **Accounts**: Freelancer, EscrowAccount

#### approve_submission
Approves submitted work.
- **Signer**: Client
- **Accounts**: Client, EscrowAccount

#### withdraw_payment
Withdraws payment after approval.
- **Signer**: Freelancer
- **Accounts**: Freelancer, EscrowAccount, SystemProgram

#### initiate_dispute
Initiates a dispute.
- **Signer**: Client
- **Accounts**: Client, EscrowAccount

#### refund_client
Processes refund for disputed or timed-out escrows.
- **Signer**: Client
- **Accounts**: Client, EscrowAccount, SystemProgram

### Events

The program emits events for all major state changes:
- `EscrowInitialized`
- `FundsDeposited`
- `WorkSubmitted`
- `SubmissionApproved`
- `PaymentWithdrawn`
- `DisputeInitiated`
- `ClientRefunded`

### Development

#### Prerequisites
- Rust 1.70+
- Solana CLI 1.16+
- Anchor Framework 0.31+
- Node.js 16+

#### Building
```bash
anchor build
```

#### Testing
```bash
anchor test --skip-local-validator
```

#### Deployment
```bash
anchor deploy --provider.cluster devnet
```

### Project Structure

```
programs/capstone_freelance_escrow/src/
├── lib.rs                    # Main program entry point
├── state.rs                  # Account structures and enums
├── errors.rs                 # Custom error definitions
├── events.rs                 # Event definitions
└── instructions/             # Instruction handlers
    ├── mod.rs
    ├── initialize_escrow.rs
    ├── deposit_funds.rs
    ├── submit_work.rs
    ├── approve_submission.rs
    ├── withdraw_payment.rs
    ├── initiate_dispute.rs
    └── refund_client.rs
```

### Error Handling

The program includes comprehensive error handling for:
- Invalid status transitions
- Unauthorized access attempts
- Insufficient funds
- Invalid parameters
- Timeout violations

### Security Considerations

- All state transitions are validated
- Only authorized signers can perform actions
- PDA seeds ensure deterministic account addresses
- Input validation prevents malicious data
- Timeout mechanisms prevent indefinite locks

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