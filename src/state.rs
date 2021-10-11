use solana_program::{
    borsh::try_from_slice_unchecked,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};

use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct Game {
    // 140 bytes
    pub game_id: u64,
    pub state: GameState,
    pub white_pubkey: Pubkey,
    pub black_pubkey: Pubkey,
    pub turn: Color,
    pub winner: Color,
    pub dice: [u8; 2],
    pub multiplier: u8,
    pub last_moves: [Move; 4],
    pub board: Board,
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
    pub points: [Point; 24],
    pub completed: [Point; 2],
    pub out: Point,
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
    const LEN: usize = 140; // FIXME
    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let result = try_from_slice_unchecked::<Game>(src)?;
        Ok(result)
    }

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let mut writer = dst;
        self.serialize(&mut &mut writer).unwrap();
    }
}
