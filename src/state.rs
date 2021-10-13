// use std::fmt::Result;
use solana_program::{
    borsh::try_from_slice_unchecked,
    msg,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};
use std::fmt;

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

    pub fn can_double(&mut self, player: Color) -> bool {
        if self.state != GameState::DoubleOrRoll {
            msg!("State is not DoubleOrRoll (state = {})", self.state);
            return false;
        }
        if self.turn != player {
            msg!("It's not {}'s turn", player.to_string());
            return false;
        }
        if self.last_doubled == player {
            msg!("{} doubled last and cannot double", player.to_string());
            return false;
        }
        if self.multiplier == 64 {
            msg!("Maximum multiplier 64 has reached");
            return false;
        }
        true
    }

    pub fn skip_double(
        &mut self,
        player: Color,
        rdc: &mut dyn RandomDice,
    ) -> Result<(), ProgramError> {
        if self.state != GameState::Started && self.state != GameState::DoubleOrRoll {
            msg!(
                "Rolling is only possible when Started or DoubleOrRoll (state = {})",
                self.state
            );
            return Err(BackgammonError::InvalidState.into());
        }

        self.roll_dice(player, rdc)
    }

    pub fn request_double(&mut self, player: Color) -> Result<(), ProgramError> {
        if self.can_double(player) == false {
            return Err(BackgammonError::InvalidState.into());
        }

        self.state = GameState::Doubled;
        Ok(())
    }

    pub fn respond_to_double(
        &mut self,
        player: Color,
        accept: bool,
        rdc: &mut dyn RandomDice,
    ) -> Result<(), ProgramError> {
        if self.state != GameState::Doubled {
            msg!("The opponent has not responded to the double yet.");
            return Err(BackgammonError::InvalidState.into());
        }

        if player != self.turn.opponent()? {
            return Err(BackgammonError::UnauthorizedAction.into());
        }

        if accept {
            self.multiplier *= 2;
            self.last_doubled = self.turn;
            self.roll_dice(player, rdc)?;
        } else {
            self.winner = self.turn;
            self.state = GameState::Finished;
        }
        Ok(())
    }

    pub fn apply_moves(
        &mut self,
        player: Color,
        moves: [Move; 4],
        rdc: &mut dyn RandomDice,
    ) -> Result<(), ProgramError> {
        if self.state != GameState::Rolled {
            msg!("The dice are not rolled yet");
            return Err(BackgammonError::InvalidState.into());
        }

        if player != self.turn {
            msg!("It's not {}'s turn", player.to_string());
            return Err(BackgammonError::UnauthorizedAction.into());
        }

        let mut values = vec![self.dice[0], self.dice[1]];
        if self.dice[0] == self.dice[1] {
            values.push(self.dice[0]);
            values.push(self.dice[0]);
        }
        for i in 0..4 {
            msg!(
                "applying move {} for {} steps",
                moves[i].start,
                moves[i].steps
            );
            if moves[i].steps == 0 {
                // TODO check if this is desired.
                msg!("Only {} moves were available", i);
                break;
            }
            if values.contains(&moves[i].steps) == false {
                msg!("You can not move a checker for {} steps", moves[i].steps);
                return Err(BackgammonError::InvalidMove.into());
            }

            self.board.apply_move(self.turn, moves[i])?;

            let index = values.iter().position(|x| *x == moves[i].steps).unwrap();
            values.remove(index);
        }
        msg!("Moves applied, updating the state...");
        self.last_moves = moves;
        self.turn = self.turn.opponent()?;
        if self.last_doubled == self.turn || self.multiplier == 64 {
            self.roll_dice(self.turn, rdc)
        } else {
            self.dice[0] = 0;
            self.dice[1] = 0;
            self.state = GameState::DoubleOrRoll;
            Ok(())
        }
    }

    pub fn roll_dice(
        &mut self,
        player: Color,
        rdc: &mut dyn RandomDice,
    ) -> Result<(), ProgramError> {
        if self.state == GameState::Started {
            let idx = player.index()?;
            if self.dice[idx] != 0 {
                return Err(BackgammonError::InvalidState.into());
            }
            self.dice[idx] = rdc.generate();
            if self.dice[0] != 0 && self.dice[1] != 0 {
                if self.dice[0] != self.dice[1] {
                    self.state = GameState::Rolled;
                    if self.dice[0] > self.dice[1] {
                        self.turn = Color::White;
                    } else {
                        self.turn = Color::Black;
                    }
                } else {
                    self.dice[0] = 0;
                    self.dice[1] = 0;
                }
            }
        } else {
            if player != self.turn {
                return Err(BackgammonError::UnauthorizedAction.into());
            }
            self.dice[0] = rdc.generate();
            self.dice[1] = rdc.generate();
            self.state = GameState::Rolled;
            self.calc_max_moves();
        }
        Ok(())
    }

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

#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct Board {
    // 54 bytes
    pub points: [Point; 26],
    pub borne: [u8; 2],
}

impl Board {
    pub fn is_closed(&self, player: Color, idx: u8) -> Result<bool, ProgramError> {
        let idx = idx as usize;
        if idx < 1 || idx > 24 {
            return Err(BackgammonError::InvalidPoint.into());
        }
        Ok(self.points[idx].color == player.opponent()? && self.points[idx].n_pieces >= 2)
    }

    pub fn get_bar_index(&self, player: Color) -> Result<usize, ProgramError> {
        match player {
            Color::White => Ok(0),
            Color::Black => Ok(25),
            Color::None => Err(BackgammonError::InvalidColor.into()),
        }
    }

    pub fn has_checker_on_bar(&self, player: Color) -> Result<bool, ProgramError> {
        let bar_index = self.get_bar_index(player)?;
        Ok(self.points[bar_index].n_pieces > 0)
    }

    pub fn is_valid_move(&self, player: Color, move_: Move) -> Result<(), ProgramError> {
        if self.points[move_.start as usize].color != player {
            msg!("{} cannot move the opponent's checkers", player.to_string());
            return Err(BackgammonError::InvalidMove.into());
        }

        let distance = self.distance(player, move_.start)?;
        if self.is_bear_off(player, move_)? {
            let farthest = self.farthest(player)?;

            if farthest > 6 {
                // not all pieces are in home
                msg!(
                    "{} can not bear off as has pieces in the outer board",
                    player.to_string()
                );
                return Err(BackgammonError::InvalidMove.into());
            }

            if distance != farthest && distance != move_.steps {
                msg!("You cannot bear off a piece that is neither the farthest nor at n_steps away from the end");
                return Err(BackgammonError::InvalidMove.into());
            }
        } else {
            let end = self.from_distance(player, distance - move_.steps)?;
            if self.is_closed(player, end)? {
                msg!("Point {} is closed for {}", end, player.to_string());
                return Err(BackgammonError::InvalidMove.into());
            }
        }
        Ok(())
    }

    pub fn apply_move(&mut self, player: Color, move_: Move) -> Result<bool, ProgramError> {
        self.is_valid_move(player, move_)?;

        let point = &mut self.points[move_.start as usize];
        point.n_pieces -= 1;
        if point.n_pieces == 0 {
            point.color = Color::None;
        }

        if self.is_bear_off(player, move_)? {
            self.borne[player.index()?] += 1;
        } else {
            let distance = self.distance(player, move_.start)?;
            let end = self.from_distance(player, distance - move_.steps)?;
            if self.points[end as usize].color == player.opponent()? {
                self.hit(end)?;
            }
            self.points[end as usize].n_pieces += 1;
            self.points[end as usize].color = player;
        }
        Ok(true)
    }

    pub fn hit(&mut self, idx: u8) -> Result<(), ProgramError> {
        let idx = idx as usize;
        let color = self.points[idx].color;
        self.points[self.get_bar_index(color)?].n_pieces += 1; // move the checker to the bar
        self.points[self.get_bar_index(color)?].color = color;
        self.points[idx].n_pieces = 0;
        self.points[idx].color = Color::None;
        Ok(())
    }

    pub fn is_bear_off(&self, player: Color, move_: Move) -> Result<bool, ProgramError> {
        Ok(self.distance(player, move_.start)? <= move_.steps)
    }

    pub fn farthest(&self, player: Color) -> Result<u8, ProgramError> {
        match player {
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

    pub fn distance(&self, player: Color, idx: u8) -> Result<u8, ProgramError> {
        match player {
            Color::White => Ok(25 - idx),
            Color::Black => Ok(idx),
            Color::None => Err(BackgammonError::InvalidColor.into()),
        }
    }

    pub fn from_distance(&self, player: Color, distance: u8) -> Result<u8, ProgramError> {
        match player {
            Color::White => Ok(25 - distance),
            Color::Black => Ok(distance),
            Color::None => Err(BackgammonError::InvalidColor.into()),
        }
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

pub trait RandomDice {
    fn generate(&mut self) -> u8;
}
