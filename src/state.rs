use solana_program::{
    borsh::try_from_slice_unchecked,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};

use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use crate::error::BackgammonError;

#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct Game {
    // 146 bytes
    pub game_id: u64,
    pub state: GameState,
    pub white_pubkey: Pubkey,
    pub black_pubkey: Pubkey,
    pub turn: Color,
    pub winner: Color,
    pub dice: [u8; 2],
    pub multiplier: u8,
    pub last_moves: [Move; 4],
    pub last_doubled: Color,
    pub board: Board,
    pub counter: u32, // counts the number of times the state is saved (used in random generator)
    pub max_moves: u8,
}

impl Game {
    pub fn get_color(&self, pubkey: &Pubkey) -> Color {
        if self.white_pubkey == *pubkey {
            return Color::White;
        } else if self.black_pubkey == *pubkey {
            return Color::Black;
        } else {
            return Color::None;
        }
    }
}

#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct Board {
    // 54 bytes
    pub points: [Point; 26],
    pub completed: [u8; 2],
}

#[derive(Clone, Debug, Copy, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub enum GameState {
    // 1 byte
    Uninitialized,
    Started,
    DoubleOrRoll,
    Rolled,
    Doubled,
    Finished,
}

#[derive(Clone, Debug, Copy, Default, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct Move {
    // 2 bytes
    pub start: u8,
    pub steps: u8,
}

#[derive(Clone, Debug, Copy, Default, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct Point {
    // 2 bytes
    pub color: Color,
    pub n_pieces: u8,
}

#[derive(Clone, Debug, Copy, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub enum Color {
    // 1 byte
    None,
    White,
    Black,
}

impl Color {
    pub fn index(&self) -> usize {
        match self {
            Color::None => return 2,
            Color::White => return 0,
            Color::Black => return 1,
        }
    }

    pub fn toggle(color: Color) -> Color {
        match color {
            Color::None => return Color::None,
            Color::White => return Color::Black,
            Color::Black => return Color::White,
        }
    }

    pub fn sign(color: Color) -> i32 {
        match color {
            Color::None => return 0,
            Color::White => return 1,
            Color::Black => return -1,
        }
    }

    pub fn middle_point_index(color: Color) -> usize {
        match color {
            Color::None => return 13,
            Color::White => return 0,
            Color::Black => return 25,
        }
    }

    pub fn to_string(&self) -> &str {
        match self {
            Color::None => return "None",
            Color::White => return "White",
            Color::Black => return "Black",
        }
    }
}

impl Default for Color {
    fn default() -> Self {
        Color::None
    }
}

impl IsInitialized for Game {
    fn is_initialized(&self) -> bool {
        self.state != GameState::Uninitialized
    }
}

impl Sealed for Game {}

impl Pack for Game {
    const LEN: usize = 146; // FIXME
    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let result = try_from_slice_unchecked::<Game>(src)?;
        Ok(result)
    }

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let mut writer = dst;
        self.serialize(&mut &mut writer).unwrap();
    }
}

impl Game {
    pub fn incr_and_pack(mut self, dst: &mut [u8]) -> Result<(), ProgramError> {
        self.counter += 1;
        return Game::pack(self, dst);
    }

    pub fn calc_max_moves(&mut self) {
        if self.dice[0] == self.dice[1] {
            self.calc_max_moves_equal_dice();
        } else {
            self.calc_max_moves_unequal_dice();
        }
    }

    fn calc_max_moves_equal_dice(&mut self) {
        self.max_moves = 4;
        // let mut board = self.board.clone();
    }

    fn calc_max_moves_unequal_dice(&mut self) {
        self.max_moves = 2;
    }
}
