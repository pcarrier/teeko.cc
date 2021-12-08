const fn compute_choose_table() -> [[u32; 32]; 32] {
    let mut result: [[u32; 32]; 32] = [[0; 32]; 32];
    let mut n = 0;
    let mut k;
    while n < 32 {
        result[n][0] = 1;
        result[n][n] = 1;
        k = 1;
        while k < n {
            result[n][k] = result[n - 1][k - 1] + result[n - 1][k];
            k += 1;
        }
        n += 1;
    }
    result
}

pub static CHOOSE: [[u32; 32]; 32] = compute_choose_table();
