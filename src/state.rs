use solana_program::{
    borsh::try_from_slice_unchecked,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};

use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};


#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct Board { // 132 bytes
    pub state: GameState,
    pub points: [Point; 24],
    pub completed: [Point; 2],
    pub out: Point,
}

#[derive(Clone, Debug, Copy, Default, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct GameState {  // 78 bytes
    pub is_initialized: bool,
    pub white_pubkey: Pubkey,
    pub black_pubkey: Pubkey,
    pub turn: Color,
    pub multiplier: u8,
    pub has_doubled: bool,
    pub dice: [u8; 2],
    pub last_moves: [Move; 4],
}

#[derive(Clone, Debug, Copy, Default, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct Move { // 2 bytes
    pub start: u8,
    pub steps: u8,
}

#[derive(Clone, Debug, Copy, Default, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct Point { // 2 bytes
    pub color: Color,
    pub n_pieces: u8,
}

#[derive(Clone, Debug, Copy, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub enum Color { // 1 byte
    None,
    White,
    Black,
}

impl Default for Color {
    fn default() -> Self { Color::None }
}


impl IsInitialized for Board {
    fn is_initialized(&self) -> bool {
        self.state.is_initialized
    }
}

impl Sealed for Board {}

impl Pack for Board {
    const LEN: usize = 0; // FIXME
    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let result = try_from_slice_unchecked::<Board>(src)?;
        Ok(result)
    }

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let mut writer = dst;
        self.serialize(&mut &mut writer).unwrap();
    }
}
