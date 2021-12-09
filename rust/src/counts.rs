pub const PIECES: u8 = 8;
pub const BOARD_EDGE: u8 = 5;
pub const BOARD_LOCATIONS: u8 = BOARD_EDGE * BOARD_EDGE;

pub const DROP0_PATTERNS: u32 = 1;
pub const DROP1_PATTERNS: u32 = DROP0_PATTERNS;
pub const DROP2_PATTERNS: u32 = DROP1_PATTERNS * 2;
pub const DROP3_PATTERNS: u32 = (DROP2_PATTERNS * 3) / 2;
pub const DROP4_PATTERNS: u32 = (DROP3_PATTERNS * 4) / 2;
pub const DROP5_PATTERNS: u32 = (DROP4_PATTERNS * 5) / 3;
pub const DROP6_PATTERNS: u32 = (DROP5_PATTERNS * 6) / 3;
pub const DROP7_PATTERNS: u32 = (DROP6_PATTERNS * 7) / 4;
pub const PLAY_PATTERNS: u32 = (DROP7_PATTERNS * 8) / 4;

const PATTERNS: &'static [u32] = &[
    DROP0_PATTERNS,
    DROP1_PATTERNS,
    DROP2_PATTERNS,
    DROP3_PATTERNS,
    DROP4_PATTERNS,
    DROP5_PATTERNS,
    DROP6_PATTERNS,
    DROP7_PATTERNS,
    PLAY_PATTERNS,
];

pub const DROP0_POSITIONS: u32 = 1;
pub const DROP1_POSITIONS: u32 = DROP0_POSITIONS * (BOARD_LOCATIONS as u32);
pub const DROP2_POSITIONS: u32 = (DROP1_POSITIONS * (BOARD_LOCATIONS as u32 - 1)) / 2;
pub const DROP3_POSITIONS: u32 = (DROP2_POSITIONS * (BOARD_LOCATIONS as u32 - 2)) / 3;
pub const DROP4_POSITIONS: u32 = (DROP3_POSITIONS * (BOARD_LOCATIONS as u32 - 3)) / 4;
pub const DROP5_POSITIONS: u32 = (DROP4_POSITIONS * (BOARD_LOCATIONS as u32 - 4)) / 5;
pub const DROP6_POSITIONS: u32 = (DROP5_POSITIONS * (BOARD_LOCATIONS as u32 - 5)) / 6;
pub const DROP7_POSITIONS: u32 = (DROP6_POSITIONS * (BOARD_LOCATIONS as u32 - 6)) / 7;
pub const PLAY_POSITIONS: u32 = (DROP7_POSITIONS * (BOARD_LOCATIONS as u32 - 7)) / 8;

const POSITIONS: &'static [u32] = &[
    DROP0_POSITIONS,
    DROP1_POSITIONS,
    DROP2_POSITIONS,
    DROP3_POSITIONS,
    DROP4_POSITIONS,
    DROP5_POSITIONS,
    DROP6_POSITIONS,
    DROP7_POSITIONS,
    PLAY_POSITIONS,
];

pub const CONFIGURATIONS: &'static [u32] = &[
    DROP0_PATTERNS * DROP0_POSITIONS,
    DROP1_PATTERNS * DROP1_POSITIONS,
    DROP2_PATTERNS * DROP2_POSITIONS,
    DROP3_PATTERNS * DROP3_POSITIONS,
    DROP4_PATTERNS * DROP4_POSITIONS,
    DROP5_PATTERNS * DROP5_POSITIONS,
    DROP6_PATTERNS * DROP6_POSITIONS,
    DROP7_PATTERNS * DROP7_POSITIONS,
    PLAY_PATTERNS * PLAY_POSITIONS,
];