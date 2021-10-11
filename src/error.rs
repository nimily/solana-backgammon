use thiserror::Error;

use solana_program::program_error::ProgramError;

#[derive(Error, Debug, Copy, Clone)]
pub enum BackgammonError {
    #[error("Invalid Instruction")]
    InvalidInstruction,
}

impl From<BackgammonError> for ProgramError {
    fn from(e: BackgammonError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
