use crate::{
    error::BackgammonError, instruction::BackgammonInstruction, state::Game, state::GameState,
};
use borsh::BorshDeserialize;
use solana_program::program_pack::IsInitialized;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
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
            BackgammonInstruction::InitGame { game_id } => {
                Self::process_init_game(accounts, game_id, program_id)
            }
            BackgammonInstruction::Roll {} => Self::process_roll(accounts, program_id),

            _ => Ok(()),
        }
    }

    fn process_init_game(
        accounts: &[AccountInfo],
        game_id: u64,
        program_id: &Pubkey,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();
        let white_info = next_account_info(account_iter)?;
        let black_info = next_account_info(account_iter)?;
        let game_info = next_account_info(account_iter)?;
        let sys_program_info = next_account_info(account_iter)?;
        let rent_program_info = next_account_info(account_iter)?;

        let rent = &Rent::from_account_info(rent_program_info)?;

        // creating game account
        if game_info.data_len() == 0 {
            msg!("Creating a board account");
            let game_id_bytes = &game_id.to_le_bytes();
            let mut seeds = vec![
                white_info.key.as_ref(),
                black_info.key.as_ref(),
                game_id_bytes,
            ];

            let (game_address, bump_seed) = Pubkey::find_program_address(&seeds[..], program_id);
            if game_address != *game_info.key {
                return Err(ProgramError::InvalidArgument);
            }

            let required_lamports = rent
                .minimum_balance(Game::LEN)
                .max(1)
                .saturating_sub(game_info.lamports());

            let bump = &[bump_seed];
            seeds.push(bump);

            msg!("Making a CPI to create the account");
            solana_program::program::invoke_signed(
                &create_account(
                    white_info.key,    //from_pubkey
                    game_info.key,     //to_pubkey
                    required_lamports, //lamports
                    Game::LEN as u64,  //space
                    program_id,        //owner
                ),
                &[
                    white_info.clone(),
                    game_info.clone(),
                    sys_program_info.clone(),
                ],
                &[&seeds[..]],
            )?;
        }

        msg!("Unpacking the data");
        let mut game = Game::unpack_unchecked(&game_info.data.borrow())?;
        if game.is_initialized() {
            msg!("Account is already initialized");
            return Err(BackgammonError::InvalidState.into());
        }
        game.state = GameState::Started;
        game.white_pubkey = *white_info.key;
        game.black_pubkey = *black_info.key;
        game.game_id = game_id;
        msg!("Serializing game");
        Game::pack(game, &mut &mut game_info.data.borrow_mut()[..])?;

        Ok(())
    }

    fn process_roll(accounts: &[AccountInfo], _program_id: &Pubkey) -> ProgramResult {
        let account_iter = &mut accounts.iter();
        let player_info = next_account_info(account_iter)?;
        let game_info = next_account_info(account_iter)?;
        let clock_program_info = next_account_info(account_iter)?;
        let clock = &Clock::from_account_info(&clock_program_info)?;

        msg!("Unpacking game account");
        let mut game = Game::unpack_unchecked(&game_info.data.borrow())?;
        if game.state != GameState::Started && game.state != GameState::DoubleOrRoll {
            return Err(BackgammonError::InvalidState.into());
        }

        if player_info.is_signer == false {
            return Err(BackgammonError::UnauthorizedAction.into());
        }
        let player_color = game.get_color(player_info.key);
        if game.state == GameState::Started {
            let player_index = player_color.index();
            if game.dice[player_index] != 0 {
                return Err(BackgammonError::InvalidState.into());
            }
            game.dice[player_index] = roll_die(clock);
            if game.dice[0] != 0 && game.dice[1] != 0 {
                game.state = GameState::Rolled;
            }
        } else {
            if player_color != game.turn {
                return Err(BackgammonError::UnauthorizedAction.into());
            }
            game.dice[0] = roll_die(clock);
            game.dice[1] = roll_die(clock);
            game.state = GameState::Rolled;
        }
        Game::pack(game, &mut &mut game_info.data.borrow_mut()[..])?;
        Ok(())
    }
}

fn roll_die(clock: &Clock) -> u8 {
    1
}
