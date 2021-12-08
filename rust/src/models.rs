use crate::{down, right, slot};

pub type BoardMask = u32;
pub type BoardPattern = u8;

pub type PositionNumber = u32;
pub type PatternNumber = u8;

pub type Pattern = u8;

pub struct GodelPosition {
    pub position: PositionNumber,
    pub pattern: PatternNumber,
}

pub struct ABBoard {
    pub a: BoardMask,
    pub b: BoardMask,
}

pub const fn position_in_mask(mut mask: BoardMask) -> u8 {
    assert!(mask != 0 && ((mask as i32 & -(mask as i32)) == mask as i32), "not exactly 1 position in the mask");
    let mut result = 1;
    while mask & 1 == 0 {
        mask >>= 1;
        result += 1;
    }
    result
}

pub const fn pieces_in_mask(mut mask: BoardMask) -> u8 {
    let mut result = 0;
    while mask != 0 {
        if mask & 1 != 0 {
            result += 1;
        }
        mask >>= 1;
    }
    result
}

enum Direction {
    N,
    NE,
    E,
    SE,
    S,
    SW,
    W,
    NW,
}

pub const WINNING_MASKS: &'static [BoardMask] = &[
    // Little squares
    slot(1) + slot(2) + slot(6) + slot(7),
    right(slot(1) + slot(2) + slot(6) + slot(7)),
    right(right(slot(1) + slot(2) + slot(6) + slot(7))),
    right(right(right(slot(1) + slot(2) + slot(6) + slot(7)))),
    down(slot(1) + slot(2) + slot(6) + slot(7)),
    down(right(slot(1) + slot(2) + slot(6) + slot(7))),
    down(right(right(slot(1) + slot(2) + slot(6) + slot(7)))),
    down(right(right(right(slot(1) + slot(2) + slot(6) + slot(7))))),
    down(down(slot(1) + slot(2) + slot(6) + slot(7))),
    down(down(right(slot(1) + slot(2) + slot(6) + slot(7)))),
    down(down(right(right(slot(1) + slot(2) + slot(6) + slot(7))))),
    down(down(right(right(right(slot(1) + slot(2) + slot(6) + slot(7)))))),
    down(down(down(slot(1) + slot(2) + slot(6) + slot(7)))),
    down(down(down(right(slot(1) + slot(2) + slot(6) + slot(7))))),
    down(down(down(right(right(slot(1) + slot(2) + slot(6) + slot(7)))))),
    down(down(down(right(right(right(slot(1) + slot(2) + slot(6) + slot(7))))))),
    // Horizontal
    slot(1) + slot(2) + slot(3) + slot(4),
    right(slot(1) + slot(2) + slot(3) + slot(4)),
    down(slot(1) + slot(2) + slot(3) + slot(4)),
    down(right(slot(1) + slot(2) + slot(3) + slot(4))),
    down(down(slot(1) + slot(2) + slot(3) + slot(4))),
    down(down(right(slot(1) + slot(2) + slot(3) + slot(4)))),
    down(down(down(slot(1) + slot(2) + slot(3) + slot(4)))),
    down(down(down(right(slot(1) + slot(2) + slot(3) + slot(4))))),
    down(down(down(down(slot(1) + slot(2) + slot(3) + slot(4))))),
    down(down(down(down(right(slot(1) + slot(2) + slot(3) + slot(4)))))),
    // Vertical
    slot(1) + slot(6) + slot(11) + slot(16),
    right(slot(1) + slot(6) + slot(11) + slot(16)),
    right(right(slot(1) + slot(6) + slot(11) + slot(16))),
    right(right(right(slot(1) + slot(6) + slot(11) + slot(16)))),
    right(right(right(right(slot(1) + slot(6) + slot(11) + slot(16))))),
    down(slot(1) + slot(6) + slot(11) + slot(16)),
    down(right(slot(1) + slot(6) + slot(11) + slot(16))),
    down(right(right(slot(1) + slot(6) + slot(11) + slot(16)))),
    down(right(right(right(slot(1) + slot(6) + slot(11) + slot(16))))),
    down(right(right(right(right(slot(1) + slot(6) + slot(11) + slot(16)))))),
    // Diagonal (\)
    slot(1) + slot(7) + slot(13) + slot(19),
    right(slot(1) + slot(7) + slot(13) + slot(19)),
    down(slot(1) + slot(7) + slot(13) + slot(19)),
    down(right(slot(1) + slot(7) + slot(13) + slot(19))),
    // Diagonal (/)
    slot(4) + slot(8) + slot(12) + slot(16),
    right(slot(4) + slot(8) + slot(12) + slot(16)),
    down(slot(4) + slot(8) + slot(12) + slot(16)),
    down(right(slot(4) + slot(8) + slot(12) + slot(16))),
];
