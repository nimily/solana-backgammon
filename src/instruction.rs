use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub enum BackgammonInstruction {
    /// Initializes the game object
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` white
    /// 1. `[]` black
    /// 2. `[writable]` board
    /// 3. `[]` system_program
    /// 4. `[]` sysvar_rent_program
    InitGame { game_id: u64 },

    ///
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` player
    /// 1. `[writable]` board
    /// 2. `[]` sysvar_clock_program
    Roll {},

    ///
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` player
    /// 1. `[writable]` board
    RequestDouble {},

    ///
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` player
    /// 1. `[writable]` board
    RespondDouble { accept: bool },

    ///
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` player
    /// 1. `[writable]` board
    ApplyMoves { moves: [[u8; 2]; 4] },
}
