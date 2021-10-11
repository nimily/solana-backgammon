use crate::{
    error::BackgammonError, instruction::BackgammonInstruction, state::Board, state::GameState,
};
use borsh::BorshDeserialize;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    system_instruction::create_account,
    sysvar::{rent::Rent, Sysvar},
};


pub struct Processor;
impl Processor {
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = BackgammonInstruction::try_from_slice(&instruction_data)?;

        match instruction {
            BackgammonInstruction::InitGame {  } => {
                Self::process_init_game(accounts, program_id)
            }
        }
    }

    fn process_init_game(
        accounts: &[AccountInfo],
        program_id: &Pubkey,
    ) -> ProgramResult {
        Ok(())
    }
}
