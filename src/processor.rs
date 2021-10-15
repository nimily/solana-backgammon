use crate::state::RandomDice;
use crate::{
    error::BackgammonError,
    instruction::BackgammonInstruction,
    state::{Color, Die, Game, GameState, Move},
};
use borsh::BorshDeserialize;
use solana_program::program_pack::IsInitialized;
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
            BackgammonInstruction::InitGame { game_id } => {
                Self::process_init_game(accounts, game_id, program_id)
            }
            BackgammonInstruction::SkipDouble {} => Self::process_skip_double(accounts, program_id),
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
        Game::incr_and_pack(game, &mut &mut game_info.data.borrow_mut()[..])?;

        Ok(())
    }

    fn process_skip_double(accounts: &[AccountInfo], program_id: &Pubkey) -> ProgramResult {
        let account_iter = &mut accounts.iter();
        let player_info = next_account_info(account_iter)?;
        let game_info = next_account_info(account_iter)?;

        if player_info.is_signer == false {
            return Err(BackgammonError::UnauthorizedAction.into());
        }

        msg!("Unpacking game account");
        let mut game = Game::unpack_unchecked(&game_info.data.borrow())?;
        let color = game.get_color(player_info.key);
        let rdc = &mut PdaRandomDice::new(program_id, &game);
        game.skip_double(color, rdc)?;
        Game::incr_and_pack(game, &mut &mut game_info.data.borrow_mut()[..])
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
        let color = game.get_color(player_info.key);

        game.request_double(color)?;

        Game::incr_and_pack(game, &mut &mut game_info.data.borrow_mut()[..])
    }

    fn process_respond_to_double(
        accounts: &[AccountInfo],
        accept: bool,
        program_id: &Pubkey,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();
        let player_info = next_account_info(account_iter)?;
        let game_info = next_account_info(account_iter)?;

        if player_info.is_signer == false {
            return Err(BackgammonError::UnauthorizedAction.into());
        }

        msg!("Unpacking game account");
        let mut game = Game::unpack_unchecked(&game_info.data.borrow())?;
        let rdc = &mut PdaRandomDice::new(program_id, &game);

        let player = game.get_color(player_info.key);
        msg!("player = {}", player.to_string());
        game.respond_to_double(player, accept, rdc)?;

        Game::incr_and_pack(game, &mut &mut game_info.data.borrow_mut()[..])
    }

    fn process_apply_moves(
        accounts: &[AccountInfo],
        moves: [Move; 4],
        program_id: &Pubkey,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();
        let player_info = next_account_info(account_iter)?;
        let game_info = next_account_info(account_iter)?;

        for i in 0..4 {
            msg!("move {} for {} steps", moves[i].start, moves[i].steps);
        }

        if player_info.is_signer == false {
            return Err(BackgammonError::UnauthorizedAction.into());
        }

        msg!("Unpacking game account");
        let mut game = Game::unpack_unchecked(&game_info.data.borrow())?;
        let color = game.get_color(player_info.key);
        let rdc = &mut PdaRandomDice::new(program_id, &game);

        game.apply_moves(color, moves, rdc)?;

        msg!("Saving the game...");
        Game::incr_and_pack(game, &mut &mut game_info.data.borrow_mut()[..])?;
        Ok(())
    }
}

pub struct PdaRandomDice {
    program_id: Pubkey,
    white_pubkey: Pubkey,
    black_pubkey: Pubkey,
    game_id: u64,
    counter: u32,
    seed: u32,
}

impl PdaRandomDice {
    pub fn new(program_id: &Pubkey, game: &Game) -> PdaRandomDice {
        PdaRandomDice {
            program_id: *program_id,
            white_pubkey: game.white_pubkey,
            black_pubkey: game.black_pubkey,
            game_id: game.game_id,
            counter: game.counter,
            seed: 0,
        }
    }
}

impl RandomDice for PdaRandomDice {
    fn generate(&mut self) -> Die {
        let seeds = &[
            self.white_pubkey.as_ref(),
            self.black_pubkey.as_ref(),
            &self.game_id.to_le_bytes(),
            &self.counter.to_le_bytes(),
            &self.seed.to_le_bytes(),
        ];
        self.seed += 1;

        let (address, _) = Pubkey::find_program_address(seeds, &self.program_id);
        let address_bytes = address.as_ref();
        let mut total: u16 = 0;
        for i in 0..30 {
            total += address_bytes[i] as u16;
        }
        ((total % 6) + 1) as Die
    }
}
