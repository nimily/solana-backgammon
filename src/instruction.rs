use crate::state::Move;
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
    /// 2. `[writable]` game
    /// 3. `[]` system_program
    /// 4. `[]` sysvar_rent_program
    InitGame {
        #[allow(dead_code)]
        game_id: u64,
    },

    ///
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` player
    /// 1. `[writable]` game
    SkipDouble {},

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
    RespondToDouble {
        #[allow(dead_code)]
        accept: bool,
    },

    ///
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` player
    /// 1. `[writable]` game
    ApplyMoves {
        #[allow(dead_code)]
        moves: [Move; 4],
    },
}
