mod choose;
mod counts;
mod scores;
mod transform;
mod models;

use models::BoardMask;
use crate::counts::CONFIGURATIONS;
use crate::models::WINNING_MASKS;
use crate::transform::{down, right, slot};

fn main() {
    let configs: u32 = CONFIGURATIONS.iter().sum();
    println!("Configurations: {}", configs);
    println!("Winning: {:?}", WINNING_MASKS);
}
