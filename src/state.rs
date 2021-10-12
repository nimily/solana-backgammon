// use std::fmt::Result;
use std::fmt;
use solana_program::{
    borsh::try_from_slice_unchecked,
    msg,
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

    pub fn has_checker_in_middle(&self, color: Color) -> bool {
        let index = Color::middle_point_index(color);
        self.board.points[index].n_pieces > 0
    }
}

#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct Board {
    // 54 bytes
    pub points: [Point; 26],
    pub borne: [u8; 2],
}

impl Board {
    pub fn is_closed(&self, color: Color, idx: u8) -> Result<bool, ProgramError> {
        let idx = idx as usize;
        if idx < 1 || idx > 24 {
            return Err(BackgammonError::InvalidPoint.into());
        }
        Ok(self.points[idx].color == color.opponent()? && self.points[idx].n_pieces >= 2)
    }

    pub fn get_bar_index(&self, color: Color) -> Result<usize, ProgramError> {
        match color {
            Color::White => Ok(0),
            Color::Black => Ok(25),
            Color::None => Err(BackgammonError::InvalidColor.into()),
        }
    }

    pub fn has_checker_on_bar(&self, color: Color) -> Result<bool, ProgramError> {
        let bar_index = self.get_bar_index(color)?;
        Ok(self.points[bar_index].n_pieces > 0)
    }

    pub fn is_valid_move(&self, color: Color, move_: Move) -> Result<bool, ProgramError> {
        if self.points[move_.start as usize].color != color {
            msg!("{} cannot move the opponent's checkers", color.to_string());
            return Err(BackgammonError::InvalidMove.into());
        }

        let distance = self.distance(color, move_.start)?;
        if self.is_bear_off(color, move_)? {
            let farthest = self.farthest(color)?;

            if farthest > 6 {
                // not all pieces are in home
                msg!("{} can not bear off as has pieces in the outer board", color.to_string());
                return Err(BackgammonError::InvalidMove.into());
            }

            if distance != farthest && distance != move_.steps {
                msg!("You cannot bear off a piece that is neither the farthest nor at n_steps away from the end");
                return Err(BackgammonError::InvalidMove.into());
            }
        } else {
            let end = self.from_distance(color, distance - move_.steps)?;
            if self.is_closed(color, end)? {
                msg!("Point {} is closed for {}", end, color.to_string());
                return Err(BackgammonError::InvalidMove.into());
            }
        }
        Ok(true)
    }

    pub fn apply_move(&mut self, color: Color, move_: Move) -> Result<bool, ProgramError> {
        self.is_valid_move(color, move_)?;

        let point = &mut self.points[move_.start as usize];
        point.n_pieces -= 1;
        if point.n_pieces == 0 {
            point.color = Color::None;
        }

        if self.is_bear_off(color, move_)? {
            self.borne[color.index()?] += 1;
        } else {
            let distance = self.distance(color, move_.start)?;
            let end = self.from_distance(color, distance - move_.steps)?;
            if self.points[end as usize].color == color.opponent()? {
                self.hit(end)?;
            }
            self.points[end as usize].n_pieces += 1;
            self.points[end as usize].color = color;
        }
        Ok(true)
    }

    pub fn hit(&mut self, idx: u8) -> Result<(), ProgramError> {
        let idx = idx as usize;
        let color = self.points[idx].color;
        self.points[self.get_bar_index(color)?].n_pieces += 1; // move the checker to the bar
        self.points[idx].n_pieces = 0;
        self.points[idx].color = Color::None;
        Ok(())
    }

    pub fn is_bear_off(&self, color: Color, move_: Move) -> Result<bool, ProgramError> {
        Ok(self.distance(color, move_.start)? <= move_.steps)
    }

    pub fn farthest(&self, color: Color) -> Result<u8, ProgramError> {
        match color {
            Color::White => {
                for i in (0..25).rev() {
                    if self.points[24 - i].color == Color::White {
                        return Ok(i as u8);
                    }
                }
                return Ok(0);
            }
            Color::Black => {
                for i in (0..25).rev() {
                    if self.points[i + 1].color == Color::Black {
                        return Ok(i as u8);
                    }
                }
                return Ok(0);
            }
            Color::None => Err(BackgammonError::InvalidColor.into()),
        }
    }

    pub fn distance(&self, color: Color, idx: u8) -> Result<u8, ProgramError> {
        match color {
            Color::White => Ok(25 - idx),
            Color::Black => Ok(idx),
            Color::None => Err(BackgammonError::InvalidColor.into()),
        }
    }

    pub fn from_distance(&self, color: Color, distance: u8) -> Result<u8, ProgramError> {
        match color {
            Color::White => Ok(25 - distance),
            Color::Black => Ok(distance),
            Color::None => Err(BackgammonError::InvalidColor.into()),
        }
    }
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

impl fmt::Display for GameState {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{:?}", self)
    }
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
    pub fn index(&self) -> Result<usize, ProgramError> {
        match self {
            Color::None => return Err(BackgammonError::InvalidColor.into()),
            Color::White => return Ok(0),
            Color::Black => return Ok(1),
        }
    }

    pub fn opponent(&self) -> Result<Color, ProgramError> {
        match self {
            Color::None => return Err(BackgammonError::InvalidColor.into()),
            Color::White => return Ok(Color::Black),
            Color::Black => return Ok(Color::White),
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
