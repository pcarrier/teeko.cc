use crate::{BoardMask, counts, models};

pub const fn down(j: BoardMask) -> BoardMask { j << counts::BOARD_EDGE }

pub const fn right(j: BoardMask) -> BoardMask { j << 1 }

pub const fn flip_up_down(x: BoardMask) -> BoardMask {
    ((x & ((1 << 5) - 1)) << 20)
        | ((x & (((1 << 5) - 1) << 5)) << 10)
        | (x & (((1 << 5) - 1) << 10))
        | ((x >> 10) & (((1 << 5) - 1) << 5))
        | ((x >> 20) & ((1 << 5) - 1))
}

pub const fn transpose(mut x: BoardMask) -> BoardMask {
    let mut temp = ((x >> 12) ^ x) & 0x0000318;
    x = x ^ temp ^ (temp << 12);
    temp = ((x >> 8) ^ x) & 0x0004004;
    x = x ^ temp ^ (temp << 8);
    temp = ((x >> 4) ^ x) & 0x0092092;
    x ^ temp ^ (temp << 4)
}

pub const fn slot(j: models::BoardMask) -> models::BoardMask { 1 << (j - 1) }
