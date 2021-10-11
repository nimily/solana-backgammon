use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub enum BackgammonInstruction {
    /// Starts the trade by creating and populating an escrow account and transferring ownership of the given temp token account to the PDA
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` alice
    /// 1. `[]` bob
    /// 2. `[]` mint_x
    /// 3. `[]` mint_y
    /// 4. `[writable]` escrow
    /// 5. `[writable]` escrow's mint_x vault
    /// 6. `[writable]` escrow's minit_y vault
    /// 7. `[]` auth
    /// 8. `[]` system_program
    /// 9. `[]` sysvar_rent_program
    /// 10. `[]` token_program
    InitGame {
    },
}
