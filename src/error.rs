use thiserror::Error;

use solana_program::program_error::ProgramError;

#[derive(Error, Debug, Copy, Clone)]
pub enum BackgammonError {
    #[error("Invalid Instruction")]
    InvalidInstruction,

    #[error("Invalid State")]
    InvalidState,

    #[error("Unauthorized Action")]
    UnauthorizedAction,

    #[error("Invalid Move")]
    InvalidMove,

    #[error("Invalid Color")]
    InvalidColor,

    #[error("Invalid Point")]
    InvalidPoint,
}

impl From<BackgammonError> for ProgramError {
    fn from(e: BackgammonError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
