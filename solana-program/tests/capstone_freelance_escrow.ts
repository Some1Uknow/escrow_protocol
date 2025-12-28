import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CapstoneFreelanceEscrow } from "../target/types/capstone_freelance_escrow";
import { assert, expect } from "chai";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";

describe("capstone_freelance_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CapstoneFreelanceEscrow as Program<CapstoneFreelanceEscrow>;

  // Helper function to airdrop SOL
  async function airdropSol(publicKey: PublicKey, amount: number = 2 * LAMPORTS_PER_SOL) {
    const airdropTx = await provider.connection.requestAirdrop(publicKey, amount);
    const blockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: airdropTx,
      ...blockhash,
    });
  }

  // Helper function to get escrow PDA
  function getEscrowPda(client: PublicKey, freelancer: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), client.toBuffer(), freelancer.toBuffer()],
      program.programId
    );
  }

  // Helper to get account balance
  async function getBalance(publicKey: PublicKey): Promise<number> {
    return provider.connection.getBalance(publicKey);
  }

  // ============================================
  // HAPPY PATH TESTS
  // ============================================
  describe("Happy Path - Full Escrow Flow", () => {
    const client = Keypair.generate();
    const freelancer = Keypair.generate();
    const escrowAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);
    const disputeTimeoutDays = 30;
    let escrowPda: PublicKey;

    before(async () => {
      await airdropSol(client.publicKey);
      [escrowPda] = getEscrowPda(client.publicKey, freelancer.publicKey);
    });

    it("1. Initializes the escrow with correct parameters", async () => {
      await program.methods
        .initializeEscrow(escrowAmount, freelancer.publicKey, disputeTimeoutDays)
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      const escrow = await program.account.escrowAccount.fetch(escrowPda);
      
      // Verify all fields
      assert.ok(escrow.client.equals(client.publicKey), "Client mismatch");
      assert.ok(escrow.freelancer.equals(freelancer.publicKey), "Freelancer mismatch");
      assert.ok(escrow.amount.eq(escrowAmount), "Amount mismatch");
      assert.deepEqual(escrow.status, { pending: {} }, "Status should be Pending");
      assert.equal(escrow.workLink, "", "Work link should be empty");
      assert.equal(escrow.disputeTimeoutDays, disputeTimeoutDays, "Timeout mismatch");
      assert.ok(escrow.createdAt.toNumber() > 0, "Created timestamp should be set");
      assert.equal(escrow.fundedAt.toNumber(), 0, "Funded timestamp should be 0");
    });

    it("2. Deposits funds into the escrow", async () => {
      const escrowBalanceBefore = await getBalance(escrowPda);
      
      await program.methods
        .depositFunds()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      const escrow = await program.account.escrowAccount.fetch(escrowPda);
      assert.deepEqual(escrow.status, { funded: {} }, "Status should be Funded");
      assert.ok(escrow.fundedAt.toNumber() > 0, "Funded timestamp should be set");

      const escrowBalanceAfter = await getBalance(escrowPda);
      assert.isAtLeast(
        escrowBalanceAfter - escrowBalanceBefore,
        escrowAmount.toNumber(),
        "Escrow balance should increase by amount"
      );
    });

    it("3. Freelancer submits work", async () => {
      const workLink = "https://github.com/example/project";

      await program.methods
        .submitWork(workLink)
        .accountsPartial({
          escrowAccount: escrowPda,
          freelancer: freelancer.publicKey,
        })
        .signers([freelancer])
        .rpc();

      const escrow = await program.account.escrowAccount.fetch(escrowPda);
      assert.deepEqual(escrow.status, { submitted: {} }, "Status should be Submitted");
      assert.equal(escrow.workLink, workLink, "Work link should be set");
      assert.ok(escrow.submittedAt.toNumber() > 0, "Submitted timestamp should be set");
    });

    it("4. Client approves the submission", async () => {
      await program.methods
        .approveSubmission()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
        })
        .signers([client])
        .rpc();

      const escrow = await program.account.escrowAccount.fetch(escrowPda);
      assert.deepEqual(escrow.status, { approved: {} }, "Status should be Approved");
      assert.ok(escrow.approvedAt.toNumber() > 0, "Approved timestamp should be set");
    });

    it("5. Freelancer withdraws payment", async () => {
      const freelancerBalanceBefore = await getBalance(freelancer.publicKey);
      const escrowBalanceBefore = await getBalance(escrowPda);

      await program.methods
        .withdrawPayment()
        .accountsPartial({
          escrowAccount: escrowPda,
          freelancer: freelancer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([freelancer])
        .rpc();

      // Account is closed after withdrawal, so we can't fetch it
      // Instead, verify the account no longer exists
      const escrowAccountInfo = await provider.connection.getAccountInfo(escrowPda);
      assert.isNull(escrowAccountInfo, "Escrow account should be closed after withdrawal");

      const freelancerBalanceAfter = await getBalance(freelancer.publicKey);
      // Freelancer should receive the escrow amount + rent (minus small tx fee)
      assert.isAbove(
        freelancerBalanceAfter,
        freelancerBalanceBefore + escrowAmount.toNumber() - 10000,
        "Freelancer should receive payment plus rent refund"
      );
    });
  });

  // ============================================
  // DISPUTE AND REFUND PATH
  // ============================================
  describe("Dispute and Refund Flow", () => {
    const client = Keypair.generate();
    const freelancer = Keypair.generate();
    const escrowAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
    let escrowPda: PublicKey;

    before(async () => {
      await airdropSol(client.publicKey);
      [escrowPda] = getEscrowPda(client.publicKey, freelancer.publicKey);

      // Initialize and fund escrow
      await program.methods
        .initializeEscrow(escrowAmount, freelancer.publicKey, 1)
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      await program.methods
        .depositFunds()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();
    });

    it("1. Client initiates a dispute", async () => {
      await program.methods
        .initiateDispute()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
        })
        .signers([client])
        .rpc();

      const escrow = await program.account.escrowAccount.fetch(escrowPda);
      assert.deepEqual(escrow.status, { disputed: {} }, "Status should be Disputed");
      assert.ok(escrow.disputedAt.toNumber() > 0, "Disputed timestamp should be set");
    });

    it("2. Client gets refund after dispute", async () => {
      const clientBalanceBefore = await getBalance(client.publicKey);
      const escrowBalanceBefore = await getBalance(escrowPda);

      await program.methods
        .refundClient()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      // Account is closed after refund, so we can't fetch it
      // Instead, verify the account no longer exists
      const escrowAccountInfo = await provider.connection.getAccountInfo(escrowPda);
      assert.isNull(escrowAccountInfo, "Escrow account should be closed after refund");

      const clientBalanceAfter = await getBalance(client.publicKey);
      // Client should get refund + rent (minus tx fees)
      assert.isAbove(
        clientBalanceAfter,
        clientBalanceBefore + escrowAmount.toNumber() - 10000,
        "Client should receive refund plus rent"
      );
    });
  });

  // ============================================
  // DISPUTE AFTER SUBMISSION
  // ============================================
  describe("Dispute After Work Submission", () => {
    const client = Keypair.generate();
    const freelancer = Keypair.generate();
    const escrowAmount = new anchor.BN(0.3 * LAMPORTS_PER_SOL);
    let escrowPda: PublicKey;

    before(async () => {
      await airdropSol(client.publicKey);
      [escrowPda] = getEscrowPda(client.publicKey, freelancer.publicKey);

      // Initialize, fund, and submit work
      await program.methods
        .initializeEscrow(escrowAmount, freelancer.publicKey, 7)
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      await program.methods
        .depositFunds()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      await program.methods
        .submitWork("https://github.com/test/repo")
        .accountsPartial({
          escrowAccount: escrowPda,
          freelancer: freelancer.publicKey,
        })
        .signers([freelancer])
        .rpc();
    });

    it("Client can dispute after work is submitted", async () => {
      await program.methods
        .initiateDispute()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
        })
        .signers([client])
        .rpc();

      const escrow = await program.account.escrowAccount.fetch(escrowPda);
      assert.deepEqual(escrow.status, { disputed: {} });
    });
  });

  // ============================================
  // ERROR CASES - AUTHORIZATION
  // ============================================
  describe("Error Cases - Authorization", () => {
    const client = Keypair.generate();
    const freelancer = Keypair.generate();
    const unauthorized = Keypair.generate();
    const escrowAmount = new anchor.BN(0.2 * LAMPORTS_PER_SOL);
    let escrowPda: PublicKey;

    before(async () => {
      await airdropSol(client.publicKey);
      await airdropSol(unauthorized.publicKey);
      [escrowPda] = getEscrowPda(client.publicKey, freelancer.publicKey);

      await program.methods
        .initializeEscrow(escrowAmount, freelancer.publicKey, 7)
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      await program.methods
        .depositFunds()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();
    });

    it("Unauthorized user cannot submit work", async () => {
      try {
        await program.methods
          .submitWork("https://fake.com")
          .accountsPartial({
            escrowAccount: escrowPda,
            freelancer: unauthorized.publicKey,
          })
          .signers([unauthorized])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("Unauthorized");
      }
    });

    it("Freelancer cannot approve submission", async () => {
      // First, have the real freelancer submit work
      await program.methods
        .submitWork("https://github.com/real/work")
        .accountsPartial({
          escrowAccount: escrowPda,
          freelancer: freelancer.publicKey,
        })
        .signers([freelancer])
        .rpc();

      // Freelancer tries to approve
      try {
        await program.methods
          .approveSubmission()
          .accountsPartial({
            escrowAccount: escrowPda,
            client: freelancer.publicKey,
          })
          .signers([freelancer])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err: any) {
        // Should fail due to constraint
        expect(err).to.exist;
      }
    });

    it("Client cannot withdraw payment", async () => {
      // First approve
      await program.methods
        .approveSubmission()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
        })
        .signers([client])
        .rpc();

      // Client tries to withdraw
      try {
        await program.methods
          .withdrawPayment()
          .accountsPartial({
            escrowAccount: escrowPda,
            freelancer: client.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([client])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err: any) {
        expect(err).to.exist;
      }
    });
  });

  // ============================================
  // ERROR CASES - INVALID STATUS TRANSITIONS
  // ============================================
  describe("Error Cases - Invalid Status Transitions", () => {
    const client = Keypair.generate();
    const freelancer = Keypair.generate();
    const escrowAmount = new anchor.BN(0.2 * LAMPORTS_PER_SOL);
    let escrowPda: PublicKey;

    before(async () => {
      await airdropSol(client.publicKey);
      [escrowPda] = getEscrowPda(client.publicKey, freelancer.publicKey);

      await program.methods
        .initializeEscrow(escrowAmount, freelancer.publicKey, 7)
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();
    });

    it("Cannot submit work before funds are deposited", async () => {
      try {
        await program.methods
          .submitWork("https://github.com/test")
          .accountsPartial({
            escrowAccount: escrowPda,
            freelancer: freelancer.publicKey,
          })
          .signers([freelancer])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidStatus");
      }
    });

    it("Cannot approve before work is submitted", async () => {
      // Fund the escrow first
      await program.methods
        .depositFunds()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      try {
        await program.methods
          .approveSubmission()
          .accountsPartial({
            escrowAccount: escrowPda,
            client: client.publicKey,
          })
          .signers([client])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidStatus");
      }
    });

    it("Cannot withdraw before approval", async () => {
      // Submit work
      await program.methods
        .submitWork("https://github.com/test")
        .accountsPartial({
          escrowAccount: escrowPda,
          freelancer: freelancer.publicKey,
        })
        .signers([freelancer])
        .rpc();

      try {
        await program.methods
          .withdrawPayment()
          .accountsPartial({
            escrowAccount: escrowPda,
            freelancer: freelancer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([freelancer])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidStatus");
      }
    });

    it("Cannot deposit funds twice", async () => {
      try {
        await program.methods
          .depositFunds()
          .accountsPartial({
            escrowAccount: escrowPda,
            client: client.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([client])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidStatus");
      }
    });
  });

  // ============================================
  // ERROR CASES - INVALID INPUTS
  // ============================================
  describe("Error Cases - Invalid Inputs", () => {
    const client = Keypair.generate();
    const freelancer = Keypair.generate();

    before(async () => {
      await airdropSol(client.publicKey);
    });

    it("Cannot create escrow with zero amount", async () => {
      const [escrowPda] = getEscrowPda(client.publicKey, freelancer.publicKey);

      try {
        await program.methods
          .initializeEscrow(new anchor.BN(0), freelancer.publicKey, 7)
          .accountsPartial({
            escrowAccount: escrowPda,
            client: client.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([client])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidAmount");
      }
    });

    it("Cannot create escrow with invalid timeout (0 days)", async () => {
      const freelancer2 = Keypair.generate();
      const [escrowPda] = getEscrowPda(client.publicKey, freelancer2.publicKey);

      try {
        await program.methods
          .initializeEscrow(new anchor.BN(1000000), freelancer2.publicKey, 0)
          .accountsPartial({
            escrowAccount: escrowPda,
            client: client.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([client])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidTimeout");
      }
    });

    it("Cannot create escrow with timeout > 90 days", async () => {
      const freelancer3 = Keypair.generate();
      const [escrowPda] = getEscrowPda(client.publicKey, freelancer3.publicKey);

      try {
        await program.methods
          .initializeEscrow(new anchor.BN(1000000), freelancer3.publicKey, 91)
          .accountsPartial({
            escrowAccount: escrowPda,
            client: client.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([client])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidTimeout");
      }
    });

    it("Cannot submit empty work link", async () => {
      const freelancer4 = Keypair.generate();
      const [escrowPda] = getEscrowPda(client.publicKey, freelancer4.publicKey);

      // Setup escrow
      await program.methods
        .initializeEscrow(new anchor.BN(100000), freelancer4.publicKey, 7)
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      await program.methods
        .depositFunds()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      try {
        await program.methods
          .submitWork("")
          .accountsPartial({
            escrowAccount: escrowPda,
            freelancer: freelancer4.publicKey,
          })
          .signers([freelancer4])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidWorkLink");
      }
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe("Edge Cases", () => {
    it("Cannot refund when not disputed (funded state)", async () => {
      const client = Keypair.generate();
      const freelancer = Keypair.generate();
      await airdropSol(client.publicKey);

      const [escrowPda] = getEscrowPda(client.publicKey, freelancer.publicKey);

      await program.methods
        .initializeEscrow(new anchor.BN(100000), freelancer.publicKey, 7)
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      await program.methods
        .depositFunds()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      try {
        await program.methods
          .refundClient()
          .accountsPartial({
            escrowAccount: escrowPda,
            client: client.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([client])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidStatus");
      }
    });

    it("Cannot dispute when in pending state", async () => {
      const client = Keypair.generate();
      const freelancer = Keypair.generate();
      await airdropSol(client.publicKey);

      const [escrowPda] = getEscrowPda(client.publicKey, freelancer.publicKey);

      await program.methods
        .initializeEscrow(new anchor.BN(100000), freelancer.publicKey, 7)
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      try {
        await program.methods
          .initiateDispute()
          .accountsPartial({
            escrowAccount: escrowPda,
            client: client.publicKey,
          })
          .signers([client])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidStatus");
      }
    });

    it("Cannot take actions on completed escrow (account is closed)", async () => {
      const client = Keypair.generate();
      const freelancer = Keypair.generate();
      await airdropSol(client.publicKey);

      const [escrowPda] = getEscrowPda(client.publicKey, freelancer.publicKey);

      // Complete the full flow
      await program.methods
        .initializeEscrow(new anchor.BN(100000), freelancer.publicKey, 7)
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      await program.methods
        .depositFunds()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      await program.methods
        .submitWork("https://github.com/test")
        .accountsPartial({
          escrowAccount: escrowPda,
          freelancer: freelancer.publicKey,
        })
        .signers([freelancer])
        .rpc();

      await program.methods
        .approveSubmission()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
        })
        .signers([client])
        .rpc();

      await program.methods
        .withdrawPayment()
        .accountsPartial({
          escrowAccount: escrowPda,
          freelancer: freelancer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([freelancer])
        .rpc();

      // Verify account is closed
      const escrowAccountInfo = await provider.connection.getAccountInfo(escrowPda);
      assert.isNull(escrowAccountInfo, "Escrow account should be closed after withdrawal");

      // Try to dispute completed escrow - should fail because account doesn't exist
      try {
        await program.methods
          .initiateDispute()
          .accountsPartial({
            escrowAccount: escrowPda,
            client: client.publicKey,
          })
          .signers([client])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err: any) {
        // Account doesn't exist error (or AccountNotInitialized)
        assert.ok(err.message || err.error, "Should throw error when account doesn't exist");
      }
    });
  });

  // ============================================
  // TIMESTAMP VERIFICATION
  // ============================================
  describe("Timestamp Verification", () => {
    it("All timestamps are set correctly throughout the flow (until approval)", async () => {
      const client = Keypair.generate();
      const freelancer = Keypair.generate();
      await airdropSol(client.publicKey);

      const [escrowPda] = getEscrowPda(client.publicKey, freelancer.publicKey);

      // Initialize
      await program.methods
        .initializeEscrow(new anchor.BN(100000), freelancer.publicKey, 7)
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      let escrow = await program.account.escrowAccount.fetch(escrowPda);
      const createdAt = escrow.createdAt.toNumber();
      assert.ok(createdAt > 0, "createdAt should be set");
      assert.equal(escrow.fundedAt.toNumber(), 0);
      assert.equal(escrow.submittedAt.toNumber(), 0);
      assert.equal(escrow.approvedAt.toNumber(), 0);
      assert.equal(escrow.completedAt.toNumber(), 0);

      // Fund
      await program.methods
        .depositFunds()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc();

      escrow = await program.account.escrowAccount.fetch(escrowPda);
      assert.ok(escrow.fundedAt.toNumber() >= createdAt, "fundedAt should be >= createdAt");

      // Submit
      await program.methods
        .submitWork("https://test.com")
        .accountsPartial({
          escrowAccount: escrowPda,
          freelancer: freelancer.publicKey,
        })
        .signers([freelancer])
        .rpc();

      escrow = await program.account.escrowAccount.fetch(escrowPda);
      assert.ok(escrow.submittedAt.toNumber() >= escrow.fundedAt.toNumber());

      // Approve
      await program.methods
        .approveSubmission()
        .accountsPartial({
          escrowAccount: escrowPda,
          client: client.publicKey,
        })
        .signers([client])
        .rpc();

      escrow = await program.account.escrowAccount.fetch(escrowPda);
      assert.ok(escrow.approvedAt.toNumber() >= escrow.submittedAt.toNumber());
      const approvedAt = escrow.approvedAt.toNumber();

      // Withdraw - account will be closed after this
      const freelancerBalanceBefore = await getBalance(freelancer.publicKey);

      await program.methods
        .withdrawPayment()
        .accountsPartial({
          escrowAccount: escrowPda,
          freelancer: freelancer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([freelancer])
        .rpc();

      // Account is closed after withdrawal
      const escrowAccountInfo = await provider.connection.getAccountInfo(escrowPda);
      assert.isNull(escrowAccountInfo, "Escrow account should be closed after withdrawal");

      // Verify freelancer received funds
      const freelancerBalanceAfter = await getBalance(freelancer.publicKey);
      assert.isAbove(freelancerBalanceAfter, freelancerBalanceBefore);
    });
  });
});
