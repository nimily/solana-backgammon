use crate::{
    error::BackgammonError, instruction::BackgammonInstruction, state::Color, state::Game,
    state::GameState, state::Move,
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
            BackgammonInstruction::RequestDouble {} => {
                Self::process_request_double(accounts, program_id)
            }
            BackgammonInstruction::RespondToDouble { accept } => {
                Self::process_respond_to_double(accounts, accept, program_id)
            }
            BackgammonInstruction::ApplyMoves { moves } => {
                Self::process_apply_moves(accounts, moves, program_id)
            }
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

        if white_info.is_signer == false {
            return Err(BackgammonError::UnauthorizedAction.into());
        }

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
        game.multiplier = 1;
        game.white_pubkey = *white_info.key;
        game.black_pubkey = *black_info.key;
        game.game_id = game_id;

        let points = &mut game.board.points;
        let n_pieces: [u8; 4] = [2, 5, 3, 5];
        let indexes: [usize; 4] = [1, 12, 17, 19];
        for i in 0..4 {
            points[indexes[i]].color = Color::White;
            points[indexes[i]].n_pieces = n_pieces[i];

            points[25 - indexes[i]].color = Color::Black;
            points[25 - indexes[i]].n_pieces = n_pieces[i];
        }
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

        if player_info.is_signer == false {
            return Err(BackgammonError::UnauthorizedAction.into());
        }

        msg!("Unpacking game account");
        let mut game = Game::unpack_unchecked(&game_info.data.borrow())?;
        if game.state != GameState::Started && game.state != GameState::DoubleOrRoll {
            return Err(BackgammonError::InvalidState.into());
        }

        let player_color = game.get_color(player_info.key);
        if game.state == GameState::Started {
            let player_index = player_color.index();
            if game.dice[player_index] != 0 {
                return Err(BackgammonError::InvalidState.into());
            }
            game.dice[player_index] = roll_die(clock, 0);
            if game.dice[0] != 0 && game.dice[1] != 0 {
                game.state = GameState::Rolled;
                if game.dice[0] > game.dice[1] {
                    game.turn = Color::White;
                } else if game.dice[0] < game.dice[1] {
                    game.turn = Color::Black;
                } else {
                    game.dice[0] = 0;
                    game.dice[0] = 0;
                }
            }
        } else {
            if player_color != game.turn {
                return Err(BackgammonError::UnauthorizedAction.into());
            }
            game.dice[0] = roll_die(clock, 0);
            game.dice[1] = roll_die(clock, 1);
            game.state = GameState::Rolled;
            game.turn = Color::toggle(game.turn);
        }
        Game::pack(game, &mut &mut game_info.data.borrow_mut()[..])?;
        Ok(())
    }

    fn process_request_double(accounts: &[AccountInfo], _program_id: &Pubkey) -> ProgramResult {
        let account_iter = &mut accounts.iter();
        let player_info = next_account_info(account_iter)?;
        let game_info = next_account_info(account_iter)?;

        if player_info.is_signer == false {
            return Err(BackgammonError::UnauthorizedAction.into());
        }

        msg!("Unpacking game account");
        let mut game = Game::unpack_unchecked(&game_info.data.borrow())?;
        if game.state != GameState::DoubleOrRoll {
            return Err(BackgammonError::InvalidState.into());
        }

        let player_color = game.get_color(player_info.key);
        if player_color != game.turn {
            return Err(BackgammonError::UnauthorizedAction.into());
        }

        game.state = GameState::Doubled;
        Game::pack(game, &mut &mut game_info.data.borrow_mut()[..])?;
        Ok(())
    }

    fn process_respond_to_double(
        accounts: &[AccountInfo],
        accept: bool,
        _program_id: &Pubkey,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();
        let player_info = next_account_info(account_iter)?;
        let game_info = next_account_info(account_iter)?;
        let clock_program_info = next_account_info(account_iter)?;
        let clock = &Clock::from_account_info(&clock_program_info)?;

        if player_info.is_signer == false {
            return Err(BackgammonError::UnauthorizedAction.into());
        }

        msg!("Unpacking game account");
        let mut game = Game::unpack_unchecked(&game_info.data.borrow())?;
        if game.state != GameState::Doubled {
            return Err(BackgammonError::InvalidState.into());
        }

        let player_color = game.get_color(player_info.key);
        if player_color != Color::toggle(game.turn) {
            return Err(BackgammonError::UnauthorizedAction.into());
        }

        if accept {
            game.winner = game.turn;
            game.state = GameState::Finished;
        } else {
            game.multiplier *= 2;
            game.dice[0] = roll_die(clock, 0);
            game.dice[1] = roll_die(clock, 1);
            game.state = GameState::Rolled;
            game.turn = Color::toggle(game.turn);
        }
        Game::pack(game, &mut &mut game_info.data.borrow_mut()[..])?;
        Ok(())
    }

    fn process_apply_moves(
        accounts: &[AccountInfo],
        moves: [Move; 4],
        _program_id: &Pubkey,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();
        let player_info = next_account_info(account_iter)?;
        let game_info = next_account_info(account_iter)?;
        let clock_program_info = next_account_info(account_iter)?;
        let clock = &Clock::from_account_info(&clock_program_info)?;

        if player_info.is_signer == false {
            return Err(BackgammonError::UnauthorizedAction.into());
        }

        msg!("Unpacking game account");
        let mut game = Game::unpack_unchecked(&game_info.data.borrow())?;
        if game.state != GameState::Doubled {
            return Err(BackgammonError::InvalidState.into());
        }

        let player_color = game.get_color(player_info.key);
        if player_color != Color::toggle(game.turn) {
            return Err(BackgammonError::UnauthorizedAction.into());
        }

        let mut values = vec![game.dice[0], game.dice[1]];
        if game.dice[0] == game.dice[1] {
            values.push(game.dice[0]);
            values.push(game.dice[0]);
        }
        let direction = Color::sign(player_color);
        for i in 0..4 {
            if values.contains(&moves[i].steps) == false {
                return Err(BackgammonError::InvalidMove.into());
            }

            let steps = moves[i].steps as i32;
            let src = moves[i].start as i32;
            let dst = src + direction * steps;

            let mut points = &mut game.board.points;

            if points[src as usize].color != game.turn {
                return Err(BackgammonError::InvalidMove.into());
            }

            if (1 <= dst) && (dst <= 24) {
                if points[dst as usize].color == Color::toggle(player_color) {
                    if points[dst as usize].n_pieces > 1 {
                        return Err(BackgammonError::InvalidMove.into());
                    }
                    let middle = Color::middle_point_index(points[dst as usize].color);
                    points[middle].color = points[dst as usize].color;
                    points[middle].n_pieces += 1;
                    points[dst as usize].n_pieces = 0;
                }
                points[dst as usize].n_pieces += 1;
                points[dst as usize].color = player_color;
            } else {
                game.board.completed[Color::index(&game.turn)] += 1;
            }
            points[src as usize].n_pieces -= 1;
            if points[src as usize].n_pieces == 0 {
                points[src as usize].color = Color::None;
            }

            let index = values.iter().position(|x| *x == moves[i].steps).unwrap();
            values.remove(index);
        }
        game.last_moves = moves;
        game.dice[0] = 0;
        game.dice[1] = 0;
        game.turn = Color::toggle(game.turn);
        game.state = GameState::DoubleOrRoll;
        Game::pack(game, &mut &mut game_info.data.borrow_mut()[..])?;
        Ok(())
    }
}

fn roll_die(clock: &Clock, seed: u8) -> u8 {
    let divisor = 6_i64.pow(seed as u32);
    ((clock.unix_timestamp / divisor) % 6) as u8
}
