// Teeko solver - computes complete game-theoretic solution
// Original algorithm by Guy L. Steele Jr. (1998-2000)
// Go port

package main

import (
	"encoding/binary"
	"flag"
	"fmt"
	"log"
	"math/bits"
	"os"
	"runtime"
	"sync"
	"sync/atomic"
	"time"
)

// Board constants
const (
	Edge = 5
	Size = Edge * Edge
)

// Score values
const (
	ScoreTie     int8 = 0
	ScoreBWin    int8 = -126
	ScoreAWin    int8 = 126
	ScoreNone    int8 = -127
	ScoreIllegal int8 = -128
	// Heuristic scores for drawn positions (range -80 to +80)
	// ±81 to ±126 are reserved for forced wins (up to 45 moves)
	ScoreHeuristicMax int8 = 80
)


// Precomputed values
var (
	choose    [32][32]int
	patterns  = [9]int{1, 1, 2, 3, 6, 10, 20, 35, 70}
	positions = [9]int{1, 25, 300, 2300, 12650, 53130, 177100, 480700, 1081575}
	configs   [9]int
)

// Precomputed neighbor masks for each position (same as NEIGHS_BY_POSITION in model.ts)
var neighs = [Size]uint32{
	98, 229, 458, 916, 776, 3139, 7335, 14670, 29340, 24856, 100448, 234720,
	469440, 938880, 795392, 3214336, 7511040, 15022080, 30044160, 25452544,
	2195456, 5472256, 10944512, 21889024, 9175040,
}

// Winning positions (same as WINNING_POSITIONS in model.ts)
var wins = map[uint32]bool{
	99: true, 198: true, 396: true, 792: true, 3168: true, 6336: true, 12672: true, 25344: true,
	101376: true, 202752: true, 405504: true, 811008: true, 3244032: true, 6488064: true,
	12976128: true, 25952256: true, 15: true, 30: true, 480: true, 960: true, 15360: true,
	30720: true, 491520: true, 983040: true, 15728640: true, 31457280: true, 33825: true,
	67650: true, 135300: true, 270600: true, 541200: true, 1082400: true, 2164800: true,
	4329600: true, 8659200: true, 17318400: true, 266305: true, 532610: true, 8521760: true,
	17043520: true, 34952: true, 69904: true, 1118464: true, 2236928: true,
}

// Winning patterns as slice for iteration
var winPatterns = []uint32{
	99, 198, 396, 792, 3168, 6336, 12672, 25344,
	101376, 202752, 405504, 811008, 3244032, 6488064,
	12976128, 25952256, 15, 30, 480, 960, 15360,
	30720, 491520, 983040, 15728640, 31457280, 33825,
	67650, 135300, 270600, 541200, 1082400, 2164800,
	4329600, 8659200, 17318400, 266305, 532610, 8521760,
	17043520, 34952, 69904, 1118464, 2236928,
}

// Square priority for move ordering (center = best)
// Stored as bitmasks for each priority level (4=best, 0=worst)
var priorityMasks = [5]uint32{
	0b1000100000000000000010001, // priority 0: corners
	0b0111010001100011000101110, // priority 1: edges
	0b0000001010000000101000000, // priority 2: inner ring corners
	0b0000000100010100010000000, // priority 3: inner ring edges
	0b0000000000001000000000000, // priority 4: center
}

// D4 symmetry transformation tables (8 symmetries of the square)
// symTables[sym][pos] = new position after applying symmetry
var symTables = [8][25]int{
	{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24},          // identity
	{20, 15, 10, 5, 0, 21, 16, 11, 6, 1, 22, 17, 12, 7, 2, 23, 18, 13, 8, 3, 24, 19, 14, 9, 4},          // rot90 CCW
	{24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0},          // rot180
	{4, 9, 14, 19, 24, 3, 8, 13, 18, 23, 2, 7, 12, 17, 22, 1, 6, 11, 16, 21, 0, 5, 10, 15, 20},          // rot270 CCW
	{4, 3, 2, 1, 0, 9, 8, 7, 6, 5, 14, 13, 12, 11, 10, 19, 18, 17, 16, 15, 24, 23, 22, 21, 20},          // flip H
	{20, 21, 22, 23, 24, 15, 16, 17, 18, 19, 10, 11, 12, 13, 14, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4},          // flip V
	{0, 5, 10, 15, 20, 1, 6, 11, 16, 21, 2, 7, 12, 17, 22, 3, 8, 13, 18, 23, 4, 9, 14, 19, 24},          // reflect main diagonal
	{24, 19, 14, 9, 4, 23, 18, 13, 8, 3, 22, 17, 12, 7, 2, 21, 16, 11, 6, 1, 20, 15, 10, 5, 0},          // reflect anti-diagonal
}

// Transform a bitmask using symmetry table
func transformMask(mask uint32, sym int) uint32 {
	var result uint32
	for p := mask; p != 0; {
		bit := p & -p
		p ^= bit
		result |= 1 << symTables[sym][bits.TrailingZeros32(bit)]
	}
	return result
}

// Find canonical form (minimum Goedel index among all 8 variants)
func canonical(a, b uint32, n int) int {
	minG := goedel(a, b, n)
	for s := 1; s < 8; s++ {
		if g := goedel(transformMask(a, s), transformMask(b, s), n); g < minG {
			minG = g
		}
	}
	return minG
}

// Check if a Goedel index is canonical
func isCanonical(g, n int) bool {
	a, b := degoedel(g, n)
	return canonical(a, b, n) == g
}

// Rank query: count canonical positions with Goedel index < canonG
func rankQuery(n, canonG int) int {
	blockIdx := canonG / BLOCK_SIZE
	rank := checkpoints[n][blockIdx]

	// Scan from block start to canonG, counting canonicals
	for g := blockIdx * BLOCK_SIZE; g < canonG; g++ {
		if isCanonical(g, n) {
			rank++
		}
	}
	return rank
}

// Lookup score for a position using canonical form
func lookupScore(a, b uint32, n int) int8 {
	canonG := canonical(a, b, n)
	return canonicalScores[n][rankQuery(n, canonG)]
}

// Store score for a position using canonical form
func storeScore(a, b uint32, n int, score int8) {
	canonG := canonical(a, b, n)
	canonicalScores[n][rankQuery(n, canonG)] = score
}

// Build checkpoints for piece count n
func buildCheckpoints(n int) {
	numBlocks := (configs[n] + BLOCK_SIZE - 1) / BLOCK_SIZE
	checkpoints[n] = make([]int, numBlocks+1)

	rank := 0
	for g := 0; g < configs[n]; g++ {
		if g%BLOCK_SIZE == 0 {
			checkpoints[n][g/BLOCK_SIZE] = rank
		}
		if isCanonical(g, n) {
			rank++
		}
	}
	checkpoints[n][numBlocks] = rank
	canonicalCounts[n] = rank
	canonicalScores[n] = make([]int8, rank)
}

// Compress full score table into canonical format
// Called after computation, before saving
func compressScores() {
	fmt.Println("Compressing to canonical format…")
	start := time.Now()

	// Need position cache for degoedel
	initPosCache()

	var totalFull, totalCanonical int
	for n := range 9 {
		totalFull += configs[n]
		buildCheckpoints(n)
		totalCanonical += canonicalCounts[n]

		// Copy scores from full table to canonical table
		rank := 0
		for g := 0; g < configs[n]; g++ {
			if isCanonical(g, n) {
				canonicalScores[n][rank] = scores[n][g]
				rank++
			}
		}
	}

	// Clear the full score tables to free memory
	for n := range 9 {
		scores[n] = nil
	}

	fmt.Printf("  Compressed %d -> %d positions (%.1fx)\n",
		totalFull, totalCanonical, float64(totalFull)/float64(totalCanonical))
	fmt.Printf("  Compression completed in %v\n", time.Since(start).Round(time.Millisecond))
}

// Negamax with alpha-beta pruning for heuristic evaluation
// mover = pieces of player to move, other = opponent pieces
// Returns score from mover's perspective
func negamax(mover, other uint32, depth, alpha, beta int) int {
	if depth == 0 {
		return evalPosition(mover, other) - evalPosition(other, mover)
	}

	occupied := mover | other
	// Try moves in priority order (best destinations first)
	for pri := 4; pri >= 0; pri-- {
		destMask := priorityMasks[pri] &^ occupied
		for p := mover; p != 0; {
			piece := p & -p
			p ^= piece
			pos := bits.TrailingZeros32(piece)
			newMover := mover ^ piece
			for dests := neighs[pos] & destMask; dests != 0; {
				dest := dests & -dests
				dests ^= dest
				score := -negamax(other, newMover|dest, depth-1, -beta, -alpha)
				if score > alpha {
					alpha = score
				}
				if alpha >= beta {
					return alpha
				}
			}
		}
	}
	return alpha
}

// Heuristic evaluation for drawn positions with 4-ply alpha-beta search
// Returns a score from -80 to +80 based on positional advantage
func heuristic(a, b uint32) int8 {
	score := negamax(a, b, 4, -1000, 1000)
	if score > int(ScoreHeuristicMax) {
		return ScoreHeuristicMax
	}
	if score < -int(ScoreHeuristicMax) {
		return -ScoreHeuristicMax
	}
	return int8(score)
}

// Precomputed: for each square, which patterns include it
var squarePatterns [25][]uint32

// Precomputed: central squares bitmask
const centralSquares = uint32(0b0000001110011100111000000)

func init() {
	for sq := 0; sq < 25; sq++ {
		bit := uint32(1) << sq
		for _, pattern := range winPatterns {
			if pattern&bit != 0 {
				squarePatterns[sq] = append(squarePatterns[sq], pattern)
			}
		}
	}
}

// Evaluate how good a position is for the player with pieces 'mine'
func evalPosition(mine, theirs uint32) int {
	score := 0
	occupied := mine | theirs

	// Track which patterns we've already scored
	var scored uint64

	// Only check patterns that include at least one of my pieces
	for m := mine; m != 0; {
		sq := bits.TrailingZeros32(m)
		m &= m - 1
		for i, pattern := range squarePatterns[sq] {
			idx := uint64(sq*16 + i) // Unique index for this (square, pattern) pair
			if scored&(1<<idx) != 0 {
				continue
			}
			scored |= 1 << idx

			// Skip patterns blocked by opponent
			if pattern&theirs != 0 {
				continue
			}
			myPieces := bits.OnesCount32(pattern & mine)
			switch myPieces {
			case 4:
				score += 100
			case 3:
				if bits.OnesCount32(pattern&^occupied) == 1 {
					score += 20
				} else {
					score += 8
				}
			case 2:
				score += 2
			case 1:
				score += 1
			}
		}
	}

	score += bits.OnesCount32(mine&centralSquares) * 2
	return score
}

// Score tables (v1: full, v2: canonical only)
var (
	scores [9][]int8
)

// Symmetry reduction constants
const BLOCK_SIZE = 1024

// Canonical position data (for v2 format)
var (
	checkpoints     [9][]int   // checkpoints[n][i] = rank at i*BLOCK_SIZE
	canonicalScores [9][]int8  // dense array of canonical scores only
	canonicalCounts [9]int     // count of canonical positions per piece count
)

// Precomputed positions (a, b pairs) for each piece count
var (
	posCache      [9][]uint64 // packed as (a << 32) | b
	posCacheReady bool
)

func init() {
	// Pascal's triangle
	for n := range 32 {
		choose[n][0], choose[n][n] = 1, 1
		for k := 1; k < n; k++ {
			choose[n][k] = choose[n-1][k-1] + choose[n-1][k]
		}
	}

	for i := range 9 {
		configs[i] = patterns[i] * positions[i]
	}

	// Allocate score tables
	for i := range 9 {
		scores[i] = make([]int8, configs[i])
	}
}

// Goedel numbering - bijection between positions and integers
func goedel(a, b uint32, n int) int {
	if n == 0 {
		return 0
	}
	ab := a | b
	posNum, patNum := 0, 0
	pat := uint32(0)
	patBit := uint32(1 << (n - 1))
	nRed := (n + 1) / 2

	for j := range Size {
		remaining := bits.OnesCount32(ab >> j)
		if ab&(1<<j) != 0 {
			remaining--
			if b&(1<<j) != 0 {
				pat |= patBit
			}
			patBit >>= 1
			posNum += choose[Size-j-1][remaining+1]
		}
	}

	for j := range n {
		if pat&(1<<j) != 0 {
			nRed--
			patNum += choose[n-j-1][nRed+1]
		}
	}

	return posNum + positions[n]*patNum
}

func degoedel(idx, n int) (a, b uint32) {
	if n == 0 {
		return 0, 0
	}
	patNum := idx / positions[n]
	posNum := idx % positions[n]

	// Decode pattern
	patWalk := patterns[n]
	pat := uint32(0)
	nRed := (n + 1) / 2
	for j := range n {
		pcs := n - j
		temp := (patWalk * (pcs - nRed)) / pcs
		if patNum >= temp {
			patNum -= temp
			patWalk = (patWalk * nRed) / pcs
			nRed--
			pat |= 1 << j
		} else {
			patWalk = temp
		}
	}

	// Decode position
	posWalk := positions[n]
	pcs := n
	patBit := uint32(1 << (n - 1))
	for j := range Size {
		locs := Size - j
		temp := (posWalk * (locs - pcs)) / locs
		if posNum >= temp {
			posNum -= temp
			posWalk = (posWalk * pcs) / locs
			pcs--
			if pat&patBit != 0 {
				b |= 1 << j
			} else {
				a |= 1 << j
			}
			patBit >>= 1
		} else {
			posWalk = temp
		}
	}
	return
}

func isWin(mask uint32) bool {
	return wins[mask]
}

// Pack/unpack position pairs
func packPos(a, b uint32) uint64 {
	return (uint64(a) << 32) | uint64(b)
}

func unpackPos(packed uint64) (a, b uint32) {
	return uint32(packed >> 32), uint32(packed)
}

// Initialize position cache for faster lookups
func initPosCache() {
	if posCacheReady {
		return
	}
	fmt.Println("Precomputing position cache…")
	start := time.Now()

	numWorkers := runtime.NumCPU()
	var wg sync.WaitGroup

	for n := range 9 {
		posCache[n] = make([]uint64, configs[n])
		chunkSize := (configs[n] + numWorkers - 1) / numWorkers

		for w := 0; w < numWorkers; w++ {
			wg.Add(1)
			start := w * chunkSize
			end := min(start+chunkSize, configs[n])
			go func(n, start, end int) {
				defer wg.Done()
				for g := start; g < end; g++ {
					a, b := degoedel(g, n)
					posCache[n][g] = packPos(a, b)
				}
			}(n, start, end)
		}
		wg.Wait()
	}

	posCacheReady = true
	fmt.Printf("  Position cache ready in %v\n", time.Since(start).Round(time.Millisecond))
}

// Fast position lookup from cache
func getPos(g, n int) (a, b uint32) {
	return unpackPos(posCache[n][g])
}

// Score combination for minimax
func bestScore(neighbors []int, table []int8) int8 {
	result := ScoreNone
	for _, n := range neighbors {
		s := table[n]
		if s == ScoreNone {
			s = ScoreTie
		} else if s < ScoreBWin || s > ScoreAWin {
			continue
		}
		s = -s // opponent's perspective
		// Only decay win/loss scores, not heuristics
		if s > ScoreHeuristicMax {
			s--
		} else if s < -ScoreHeuristicMax {
			s++
		}
		if result == ScoreNone || s > result {
			result = s
		}
	}
	if result == ScoreNone {
		return ScoreTie
	}
	return result
}

// Database computation
func computePlay() {
	fmt.Println("Computing play phase…")
	start := time.Now()

	// Precompute positions first
	initPosCache()

	table := scores[8]
	numWorkers := runtime.NumCPU()
	fmt.Printf("  Using %d workers\n", numWorkers)

	// Initial scores (parallel)
	fmt.Printf("  Initializing %d positions…\n", configs[8])
	var illegal, aWins, bWins atomic.Int64
	var wg sync.WaitGroup
	chunkSize := (configs[8] + numWorkers - 1) / numWorkers

	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		startIdx := w * chunkSize
		endIdx := min(startIdx+chunkSize, configs[8])
		go func(startIdx, endIdx int) {
			defer wg.Done()
			localIllegal, localAWins, localBWins := int64(0), int64(0), int64(0)
			for g := startIdx; g < endIdx; g++ {
				a, b := getPos(g, 8)
				aWin, bWin := isWin(a), isWin(b)
				switch {
				case aWin && bWin:
					table[g] = ScoreIllegal
					localIllegal++
				case bWin:
					table[g] = ScoreBWin
					localBWins++
				case aWin:
					table[g] = ScoreAWin
					localAWins++
				default:
					table[g] = ScoreTie
				}
			}
			illegal.Add(localIllegal)
			aWins.Add(localAWins)
			bWins.Add(localBWins)
		}(startIdx, endIdx)
	}
	wg.Wait()
	fmt.Printf("  Initial: %d illegal, %d A wins, %d B wins\n", illegal.Load(), aWins.Load(), bWins.Load())

	// Retrograde analysis
	fmt.Println("  Retrograde analysis…")
	snapshot := make([]int8, configs[8])
	maxLevel := 0

	for level := ScoreAWin; level > 0; level-- {
		copy(snapshot, table)
		var changed atomic.Bool

		// Phase 1: Generate unmoves (parallel)
		for w := 0; w < numWorkers; w++ {
			wg.Add(1)
			startIdx := w * chunkSize
			endIdx := min(startIdx+chunkSize, configs[8])
			go func(startIdx, endIdx int) {
				defer wg.Done()
				for g := startIdx; g < endIdx; g++ {
					if snapshot[g] == ScoreTie {
						continue
					}
					ps := -snapshot[g]
					a, b := getPos(g, 8)

					// Generate unmoves (predecessor positions)
					ab := a | b
					for p := b; p != 0; {
						piece := p & -p
						p ^= piece
						pos := bits.TrailingZeros32(piece)
						for dests := neighs[pos] &^ ab; dests != 0; {
							dest := dests & -dests
							dests ^= dest
							n := goedel((b^piece)|dest, a, 8)
							if ps == level {
								newscore := ps - 1
								if psn := snapshot[n]; (psn < newscore && psn > ScoreBWin) || psn == ScoreNone {
									table[n] = newscore
									changed.Store(true)
								}
							} else if ps == -level && snapshot[n] == ScoreTie {
								snapshot[n] = ScoreNone
							}
						}
					}
				}
			}(startIdx, endIdx)
		}
		wg.Wait()

		// Phase 2: Process marked positions (parallel)
		for w := 0; w < numWorkers; w++ {
			wg.Add(1)
			startIdx := w * chunkSize
			endIdx := min(startIdx+chunkSize, configs[8])
			go func(startIdx, endIdx int) {
				defer wg.Done()
				neighbors := make([]int, 0, 32) // pre-allocated per worker
				for g := startIdx; g < endIdx; g++ {
					if snapshot[g] == ScoreNone {
						a, b := getPos(g, 8)
						neighbors = neighbors[:0] // reset without allocation
						ab := a | b
						for p := a; p != 0; {
							piece := p & -p
							p ^= piece
							pos := bits.TrailingZeros32(piece)
							for dests := neighs[pos] &^ ab; dests != 0; {
								dest := dests & -dests
								dests ^= dest
								neighbors = append(neighbors, goedel(b, (a^piece)|dest, 8))
							}
						}
						if ns := bestScore(neighbors, snapshot); ns != ScoreTie && ns != ScoreNone {
							table[g] = ns
							changed.Store(true)
						} else {
							table[g] = ScoreTie
						}
					}
				}
			}(startIdx, endIdx)
		}
		wg.Wait()

		if !changed.Load() {
			maxLevel = int(ScoreAWin - level)
			fmt.Printf("  Converged at depth %d\n", maxLevel)
			break
		}
		if level%10 == 0 {
			fmt.Printf("    Level %d…\n", level)
		}
	}

	// Compute heuristics for drawn positions (parallel)
	fmt.Println("  Computing heuristics for draws…")
	var draws, progress atomic.Int64
	// Count total draws first
	var totalDraws int64
	for g := 0; g < configs[8]; g++ {
		if table[g] == ScoreTie {
			totalDraws++
		}
	}
	fmt.Printf("    0%% (0/%d)\r", totalDraws)
	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		startIdx := w * chunkSize
		endIdx := min(startIdx+chunkSize, configs[8])
		go func(startIdx, endIdx int) {
			defer wg.Done()
			localDraws := int64(0)
			for g := startIdx; g < endIdx; g++ {
				if table[g] == ScoreTie {
					a, b := getPos(g, 8)
					table[g] = heuristic(a, b)
					localDraws++
					if localDraws%1000 == 0 {
						cur := progress.Add(1000)
						pct := cur * 100 / totalDraws
						fmt.Printf("    %d%% (%d/%d)\r", pct, cur, totalDraws)
					}
				}
			}
			draws.Add(localDraws)
			progress.Add(localDraws % 1000)
		}(startIdx, endIdx)
	}
	wg.Wait()
	fmt.Printf("    100%% (%d/%d)\n", draws.Load(), totalDraws)

	countStats("Play", table)
	fmt.Printf("  Play phase completed in %v\n", time.Since(start).Round(time.Millisecond))
}

func computeDrop() {
	fmt.Println("Computing drop phase…")
	start := time.Now()
	numWorkers := runtime.NumCPU()

	// 7 pieces - check for B wins, then propagate from play
	fmt.Printf("  Processing 7 pieces (%d positions)…\n", configs[7])
	table7 := scores[7]
	var bWins atomic.Int64
	var wg sync.WaitGroup
	chunkSize := (configs[7] + numWorkers - 1) / numWorkers

	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		startIdx := w * chunkSize
		endIdx := min(startIdx+chunkSize, configs[7])
		go func(startIdx, endIdx int) {
			defer wg.Done()
			localBWins := int64(0)
			for g := startIdx; g < endIdx; g++ {
				_, b := getPos(g, 7)
				if isWin(b) {
					table7[g] = ScoreBWin
					localBWins++
				}
			}
			bWins.Add(localBWins)
		}(startIdx, endIdx)
	}
	wg.Wait()
	fmt.Printf("    %d immediate B wins\n", bWins.Load())
	propagateDrop(7, numWorkers)

	// 6 to 0 pieces
	for n := 6; n >= 0; n-- {
		fmt.Printf("  Processing %d pieces (%d positions)…\n", n, configs[n])
		propagateDrop(n, numWorkers)
	}

	fmt.Printf("  Initial position score: %d\n", scores[0][0])
	fmt.Printf("  Drop phase completed in %v\n", time.Since(start).Round(time.Millisecond))
}

func propagateDrop(n, numWorkers int) {
	current, next := scores[n], scores[n+1]
	var wg sync.WaitGroup
	chunkSize := (configs[n] + numWorkers - 1) / numWorkers

	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		startIdx := w * chunkSize
		endIdx := min(startIdx+chunkSize, configs[n])
		go func(startIdx, endIdx int) {
			defer wg.Done()
			neighbors := make([]int, 0, Size) // pre-allocated per worker
			for g := startIdx; g < endIdx; g++ {
				if current[g] != ScoreTie {
					continue // preserve wins detected earlier
				}
				a, b := getPos(g, n)
				ab := a | b

				neighbors = neighbors[:0] // reset without allocation
				for sq := uint32(1); sq < (1 << Size); sq <<= 1 {
					if sq&ab == 0 {
						neighbors = append(neighbors, goedel(b, a|sq, n+1))
					}
				}
				current[g] = bestScore(neighbors, next)
			}
		}(startIdx, endIdx)
	}
	wg.Wait()
	countStats(fmt.Sprintf("Drop %d", n), current)
}

func countStats(label string, table []int8) {
	ties, aWins, bWins, aAdvantage, bAdvantage := 0, 0, 0, 0, 0
	for _, s := range table {
		switch {
		case s == ScoreTie:
			ties++
		case s > ScoreHeuristicMax:
			aWins++
		case s < -ScoreHeuristicMax:
			bWins++
		case s > 0:
			aAdvantage++
		case s < 0:
			bAdvantage++
		}
	}
	fmt.Printf("  %s: %d draws (%d A+, %d even, %d B+), %d A wins, %d B wins\n",
		label, aAdvantage+ties+bAdvantage, aAdvantage, ties, bAdvantage, aWins, bWins)
}

func maskToSquares(m uint32) []int {
	var sq []int
	for i := range Size {
		if m&(1<<i) != 0 {
			sq = append(sq, i)
		}
	}
	return sq
}

func findLongestWins() {
	fmt.Println("Finding longest forced wins…")

	var longestAWin, longestBWin int8
	var longestAIdx, longestBIdx, longestAPieces, longestBPieces int

	longestAWin = ScoreAWin // Start at shortest (126), look for smallest positive
	longestBWin = ScoreBWin // Start at shortest (-126), look for largest negative

	for n := range 9 {
		table := scores[n]
		for g, s := range table {
			// A win: smaller score = longer win (96 is longest forced win)
			if s > ScoreHeuristicMax && s <= ScoreAWin && s < longestAWin {
				longestAWin = s
				longestAIdx = g
				longestAPieces = n
			}
			// B win: larger score (closer to 0) = longer win (-96 is longest)
			if s < -ScoreHeuristicMax && s >= ScoreBWin && s > longestBWin {
				longestBWin = s
				longestBIdx = g
				longestBPieces = n
			}
		}
	}

	if longestAWin <= ScoreAWin && longestAWin > ScoreHeuristicMax {
		a, b := degoedel(longestAIdx, longestAPieces)
		dist := int(ScoreAWin - longestAWin)
		fmt.Printf("\nLongest forced win for Blue (A):\n")
		fmt.Printf("  Distance: %d plies\n", dist)
		fmt.Printf("  Pieces: %d\n", longestAPieces)
		fmt.Printf("  A squares: %v\n", maskToSquares(a))
		fmt.Printf("  B squares: %v\n", maskToSquares(b))
		printBoard(a, b)
	}

	if longestBWin >= ScoreBWin && longestBWin < -ScoreHeuristicMax {
		a, b := degoedel(longestBIdx, longestBPieces)
		dist := int(longestBWin - ScoreBWin)
		fmt.Printf("\nLongest forced win for Red (B):\n")
		fmt.Printf("  Distance: %d plies\n", dist)
		fmt.Printf("  Pieces: %d\n", longestBPieces)
		fmt.Printf("  A squares: %v\n", maskToSquares(a))
		fmt.Printf("  B squares: %v\n", maskToSquares(b))
		printBoard(a, b)
	}
}

func printBoard(a, b uint32) {
	fmt.Println("  Board:")
	for row := 0; row < Edge; row++ {
		fmt.Print("    ")
		for col := 0; col < Edge; col++ {
			sq := uint32(1) << (row*Edge + col)
			switch {
			case a&sq != 0:
				fmt.Print("A ")
			case b&sq != 0:
				fmt.Print("B ")
			default:
				fmt.Print("· ")
			}
		}
		fmt.Println()
	}
}

// Database I/O
const dbMagic = "TEEK"
const dbVersionV1 = uint32(1)
const dbVersionV2 = uint32(2)

func saveDB(filename string) error {
	f, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer f.Close()

	f.Write([]byte(dbMagic))
	binary.Write(f, binary.LittleEndian, dbVersionV2)

	for n := range 9 {
		// Write canonical count
		binary.Write(f, binary.LittleEndian, uint32(canonicalCounts[n]))
		// Write number of checkpoints
		binary.Write(f, binary.LittleEndian, uint32(len(checkpoints[n])))
		// Write checkpoints
		for _, cp := range checkpoints[n] {
			binary.Write(f, binary.LittleEndian, uint32(cp))
		}
		// Write scores
		buf := make([]byte, len(canonicalScores[n]))
		for i, s := range canonicalScores[n] {
			buf[i] = byte(s)
		}
		f.Write(buf)
	}
	return nil
}
func main() {
	dbFile := flag.String("db", "teeko.db", "database file")
	flag.Parse()

	computePlay()
	computeDrop()
	findLongestWins()
	compressScores()
	fmt.Printf("Saving %s…\n", *dbFile)
	if err := saveDB(*dbFile); err != nil {
		log.Fatal(err)
	}
}
