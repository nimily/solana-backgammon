use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use crate::state::Move;

#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub enum BackgammonInstruction {
    /// Initializes the game object
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` white
    /// 1. `[]` black
    /// 2. `[writable]` game
    /// 3. `[]` system_program
    /// 4. `[]` sysvar_rent_program
    InitGame { game_id: u64 },

    ///
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` player
    /// 1. `[writable]` game
    Roll {},

    ///
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` player
    /// 1. `[writable]` game
    RequestDouble {},

    ///
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` player
    /// 1. `[writable]` game
    RespondToDouble { accept: bool },

    ///
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` player
    /// 1. `[writable]` game
    ApplyMoves { moves: [Move; 4] },
}
