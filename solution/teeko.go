// Teeko solver - computes complete game-theoretic solution
// Original algorithm by Guy L. Steele Jr. (1998-2000)
// Go port with HTTP API

package main

import (
	"encoding/binary"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/bits"
	"net/http"
	"os"
	"syscall"
	"unsafe"
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
)

// Player constants
const (
	PlayerA = "a"
	PlayerB = "b"
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

// Score tables
var (
	scores [9][]int8
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

func bitToSquare(bit uint32) int {
	return bits.TrailingZeros32(bit)
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
		if s > 0 {
			s--
		} else if s < 0 {
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
	table := scores[8]

	// Initial scores
	illegal := 0
	for g := range configs[8] {
		a, b := degoedel(g, 8)
		aWin, bWin := isWin(a), isWin(b)
		switch {
		case aWin && bWin:
			table[g] = ScoreIllegal
			illegal++
		case bWin:
			table[g] = ScoreBWin
		case aWin:
			table[g] = ScoreAWin
		default:
			table[g] = ScoreTie
		}
	}
	fmt.Printf("  %d illegal positions\n", illegal)

	// Retrograde analysis
	fmt.Println("  Retrograde analysis…")
	snapshot := make([]int8, configs[8])
	for level := ScoreAWin; level > 0; level-- {
		copy(snapshot, table)
		changed := false

		for g := range configs[8] {
			if snapshot[g] == ScoreTie {
				continue
			}
			ps := -snapshot[g]
			a, b := degoedel(g, 8)

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
							changed = true
						}
					} else if ps == -level && snapshot[n] == ScoreTie {
						snapshot[n] = ScoreNone
					}
				}
			}
		}

		// Process marked positions
		for g := range configs[8] {
			if snapshot[g] == ScoreNone {
				a, b := degoedel(g, 8)
				var neighbors []int
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
					changed = true
				} else {
					table[g] = ScoreTie
				}
			}
		}

		if !changed {
			break
		}
		if level%10 == 0 {
			fmt.Printf("    Level %d\n", level)
		}
	}

	countStats("Play", table)
}

func computeDrop() {
	fmt.Println("Computing drop phase…")

	// 7 pieces - check for B wins, then propagate from play
	table7 := scores[7]
	for g := range configs[7] {
		_, b := degoedel(g, 7)
		if isWin(b) {
			table7[g] = ScoreBWin
		}
	}
	propagateDrop(7)

	// 6 to 0 pieces
	for n := 6; n >= 0; n-- {
		propagateDrop(n)
	}

	fmt.Printf("  Initial position score: %d\n", scores[0][0])
}

func propagateDrop(n int) {
	current, next := scores[n], scores[n+1]
	for g := range configs[n] {
		if current[g] != ScoreTie {
			continue // preserve wins detected earlier
		}
		a, b := degoedel(g, n)
		ab := a | b

		var neighbors []int
		for sq := uint32(1); sq < (1 << Size); sq <<= 1 {
			if sq&ab == 0 {
				neighbors = append(neighbors, goedel(b, a|sq, n+1))
			}
		}
		current[g] = bestScore(neighbors, next)
	}
	countStats(fmt.Sprintf("Drop %d", n), current)
}

func countStats(label string, table []int8) {
	ties, aWins, bWins := 0, 0, 0
	for _, s := range table {
		switch {
		case s == ScoreTie:
			ties++
		case s > ScoreTie && s <= ScoreAWin:
			aWins++
		case s < ScoreTie && s >= ScoreBWin:
			bWins++
		}
	}
	fmt.Printf("  %s: %d draws, %d A wins, %d B wins\n", label, ties, aWins, bWins)
}

// Database I/O
const dbMagic, dbVersion = "TEEK", uint32(1)

func saveDB(filename string) error {
	f, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer f.Close()

	f.Write([]byte(dbMagic))
	binary.Write(f, binary.LittleEndian, dbVersion)

	for n := range 9 {
		binary.Write(f, binary.LittleEndian, uint32(len(scores[n])))
		buf := make([]byte, len(scores[n]))
		for i, s := range scores[n] {
			buf[i] = byte(s)
		}
		f.Write(buf)
	}
	return nil
}

// Memory-mapped database for efficient serving
var mmapData []byte

func mmapDB(filename string) error {
	f, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer f.Close()

	fi, err := f.Stat()
	if err != nil {
		return err
	}

	mmapData, err = syscall.Mmap(int(f.Fd()), 0, int(fi.Size()),
		syscall.PROT_READ, syscall.MAP_SHARED)
	if err != nil {
		return fmt.Errorf("mmap failed: %w", err)
	}

	// Verify header
	if len(mmapData) < 8 || string(mmapData[:4]) != dbMagic {
		return fmt.Errorf("invalid database")
	}
	ver := binary.LittleEndian.Uint32(mmapData[4:8])
	if ver != dbVersion {
		return fmt.Errorf("unsupported version: %d", ver)
	}

	// Point score slices directly into mmap'd memory
	offset := 8
	for n := range 9 {
		if offset+4 > len(mmapData) {
			return fmt.Errorf("truncated database")
		}
		size := int(binary.LittleEndian.Uint32(mmapData[offset:]))
		offset += 4
		if size != configs[n] {
			return fmt.Errorf("size mismatch for %d pieces", n)
		}
		if offset+size > len(mmapData) {
			return fmt.Errorf("truncated database")
		}
		// Reinterpret []byte as []int8 (safe: same size, same representation)
		scores[n] = unsafe.Slice((*int8)(unsafe.Pointer(&mmapData[offset])), size)
		offset += size
	}
	return nil
}

// HTTP API
type Request struct {
	A    []int  `json:"a"`
	B    []int  `json:"b"`
	Turn string `json:"turn,omitempty"`
}

type Move struct {
	From     int    `json:"from,omitempty"`
	To       int    `json:"to"`
	Score    int    `json:"score"`
	Outcome  string `json:"outcome"`
	Distance int    `json:"distance,omitempty"`
}

type Response struct {
	A        []int  `json:"a"`
	B        []int  `json:"b"`
	Turn     string `json:"turn"`
	Phase    string `json:"phase"`
	Pieces   int    `json:"pieces"`
	Score    int    `json:"score"`
	Outcome  string `json:"outcome"`
	Distance int    `json:"distance,omitempty"`
	Moves    []Move `json:"moves"`
	Error    string `json:"error,omitempty"`
}

func outcome(s int8) (string, int) {
	switch {
	case s == ScoreTie:
		return "draw", 0
	case s > ScoreTie:
		return PlayerA, int(ScoreAWin - s)
	case s >= ScoreBWin:
		return PlayerB, int(s - ScoreBWin)
	case s == ScoreIllegal:
		return "illegal", 0
	}
	return "unknown", 0
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

func handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	respond := func(resp Response) { json.NewEncoder(w).Encode(resp) }
	fail := func(msg string) { respond(Response{Error: msg}) }

	if r.Method != http.MethodPost {
		fail("POST required")
		return
	}

	var req Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fail("invalid JSON")
		return
	}

	var a, b uint32
	for _, sq := range req.A {
		if sq < 0 || sq > 24 {
			fail(fmt.Sprintf("invalid square: %d", sq))
			return
		}
		a |= 1 << sq
	}
	for _, sq := range req.B {
		if sq < 0 || sq > 24 {
			fail(fmt.Sprintf("invalid square: %d", sq))
			return
		}
		b |= 1 << sq
	}

	if a&b != 0 {
		fail("overlapping pieces")
		return
	}
	aCount, bCount := bits.OnesCount32(a), bits.OnesCount32(b)
	if aCount > 4 || bCount > 4 {
		fail("too many pieces")
		return
	}
	if aCount < bCount || aCount-bCount > 1 {
		fail(fmt.Sprintf("invalid counts: A=%d, B=%d", aCount, bCount))
		return
	}

	n := aCount + bCount
	phase := "play"
	if n < 8 {
		phase = "drop"
	}

	// Determine turn
	aTurn := n%2 == 0
	if n == 8 {
		aTurn = req.Turn != PlayerB
	}

	// Get score
	var g int
	if aTurn {
		g = goedel(a, b, n)
	} else {
		g = goedel(b, a, n)
	}
	score := scores[n][g]
	out, dist := outcome(score)

	// Generate moves
	var moves []Move
	var mover, other uint32
	if aTurn {
		mover, other = a, b
	} else {
		mover, other = b, a
	}
	ab := a | b

	if n == 8 {
		// Play phase moves
		for p := mover; p != 0; {
			piece := p & -p
			p ^= piece
			from := bitToSquare(piece)
			newMover := mover ^ piece
			for dests := neighs[from] &^ ab; dests != 0; {
				dest := dests & -dests
				dests ^= dest
				ng := goedel(other, newMover|dest, 8)
				ms := -scores[8][ng]
				mo, md := outcome(ms)
				moves = append(moves, Move{from, bitToSquare(dest), int(ms), mo, md})
			}
		}
	} else {
		// Drop phase moves
		next := scores[n+1]
		for sq := uint32(1); sq < (1 << Size); sq <<= 1 {
			if sq&ab == 0 {
				ng := goedel(other, mover|sq, n+1)
				ms := -next[ng]
				mo, md := outcome(ms)
				moves = append(moves, Move{To: bitToSquare(sq), Score: int(ms), Outcome: mo, Distance: md})
			}
		}
	}

	turn := PlayerA
	if !aTurn {
		turn = PlayerB
	}

	respond(Response{
		A: maskToSquares(a), B: maskToSquares(b),
		Turn: turn, Phase: phase, Pieces: n,
		Score: int(score), Outcome: out, Distance: dist,
		Moves: moves,
	})
}

func main() {
	dbFile := flag.String("db", "teeko.db", "database file")
	compute := flag.Bool("compute", false, "compute database")
	serve := flag.Bool("serve", false, "start server")
	addr := flag.String("addr", ":8080", "server address")
	flag.Parse()

	switch {
	case *compute:
		computePlay()
		computeDrop()
		fmt.Printf("Saving %s…\n", *dbFile)
		if err := saveDB(*dbFile); err != nil {
			log.Fatal(err)
		}
	case *serve:
		fmt.Printf("Mmapping %s…\n", *dbFile)
		if err := mmapDB(*dbFile); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("Listening on %s\n", *addr)
		http.HandleFunc("/query", handler)
		log.Fatal(http.ListenAndServe(*addr, nil))
	default:
		fmt.Println(`Teeko Solver

Usage:
  teeko -compute [-db FILE]   Compute and save database
  teeko -serve [-db FILE]     Start HTTP server

API:
  POST /query
  Body: {"a": [squares], "b": [squares], "turn": "a"|"b"}

  Squares are 0-24. Turn is auto-detected during drop phase.

Examples:
  {"a": [], "b": []}                              Empty board
  {"a": [0], "b": []}                             After a's first drop
  {"a": [0,1,2,3], "b": [4,5,6,7], "turn": "a"}   Play phase`)
	}
}
