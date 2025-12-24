use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;
use crate::events::*;

pub fn withdraw_payment(ctx: Context<WithdrawPayment>) -> Result<()> {
    let current_status = ctx.accounts.escrow_account.status;
    require!(
        current_status == EscrowStatus::Approved,
        EscrowError::InvalidStatus
    );

    let amount = ctx.accounts.escrow_account.amount;
    let freelancer_key = ctx.accounts.escrow_account.freelancer;

    require!(
        ctx.accounts.freelancer.key() == freelancer_key,
        EscrowError::Unauthorized
    );

    // Update status before closing
    let escrow = &mut ctx.accounts.escrow_account;
    escrow.status = EscrowStatus::Complete;
    escrow.completed_at = Clock::get()?.unix_timestamp;

    emit!(PaymentWithdrawn {
        escrow_key: ctx.accounts.escrow_account.key(),
        freelancer: ctx.accounts.freelancer.key(),
        amount,
    });

    // Transfer ALL lamports (including rent) from escrow PDA to freelancer
    // This effectively closes the account by zeroing its balance
    let escrow_account_info = ctx.accounts.escrow_account.to_account_info();
    let freelancer_account_info = ctx.accounts.freelancer.to_account_info();
    
    let escrow_lamports = escrow_account_info.lamports();
    **escrow_account_info.try_borrow_mut_lamports()? = 0;
    **freelancer_account_info.try_borrow_mut_lamports()? += escrow_lamports;

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawPayment<'info> {
    #[account(mut)]
    pub freelancer: Signer<'info>,

    #[account(
        mut,
        has_one = freelancer @ EscrowError::Unauthorized,
        seeds = [b"escrow", escrow_account.client.as_ref(), escrow_account.freelancer.as_ref()],
        bump = escrow_account.bump,
        close = freelancer
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    pub system_program: Program<'info, System>,
}
