// Development-only audit. No package dependencies; not loaded by the webpage.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'puzzles.js'), 'utf8'), context);

// Independent constraint search, unrelated to sudoku.js's propagation solver.
// MRV chooses the empty cell with the fewest candidates; stop at two solutions.
function countSolutions(board) {
  if (typeof board !== 'string' || !/^[1-9.]{81}$/.test(board)) return 0;
  const cells = [...board].map(value => value === '.' ? 0 : Number(value));
  const rows = Array(9).fill(0), columns = Array(9).fill(0), boxes = Array(9).fill(0);
  const boxAt = index => Math.floor(index / 27) * 3 + Math.floor(index % 9 / 3);
  for (let index = 0; index < 81; index++) {
    if (!cells[index]) continue;
    const bit = 1 << cells[index], row = Math.floor(index / 9), column = index % 9, box = boxAt(index);
    if ((rows[row] | columns[column] | boxes[box]) & bit) return 0;
    rows[row] |= bit; columns[column] |= bit; boxes[box] |= bit;
  }
  let count = 0;
  function search() {
    if (count >= 2) return;
    let chosen = -1, candidates = 0, least = 10;
    for (let index = 0; index < 81; index++) {
      if (cells[index]) continue;
      const mask = 1022 & ~(rows[Math.floor(index / 9)] | columns[index % 9] | boxes[boxAt(index)]);
      let size = 0;
      for (let bits = mask; bits; bits &= bits - 1) size++;
      if (size < least) { chosen = index; candidates = mask; least = size; if (least <= 1) break; }
    }
    if (chosen < 0) { count++; return; }
    if (!candidates) return;
    const row = Math.floor(chosen / 9), column = chosen % 9, box = boxAt(chosen);
    for (let digit = 1; digit <= 9 && count < 2; digit++) {
      const bit = 1 << digit;
      if (!(candidates & bit)) continue;
      cells[chosen] = digit; rows[row] |= bit; columns[column] |= bit; boxes[box] |= bit;
      search();
      cells[chosen] = 0; rows[row] &= ~bit; columns[column] &= ~bit; boxes[box] &= ~bit;
    }
  }
  search();
  return count;
}

assert.equal(countSolutions('11' + '.'.repeat(79)), 0);
assert.equal(countSolutions('1' + '.'.repeat(80)), 2);
const puzzles = context.window.DysonSudokuBank.puzzles;
assert.equal(puzzles.length, 30);
const expected = { easy: 62, normal: 53, hard: 44 };
const levels = { easy: 0, normal: 0, hard: 0 };
const ids = new Set();
for (const puzzle of puzzles) {
  assert.ok(Object.hasOwn(expected, puzzle.level));
  assert.equal(puzzle.givens, expected[puzzle.level]);
  assert.equal([...puzzle.puzzle].filter(value => value !== '.').length, puzzle.givens);
  assert.ok(!ids.has(puzzle.id)); ids.add(puzzle.id); levels[puzzle.level]++;
  assert.equal(countSolutions(puzzle.puzzle), 1, puzzle.id + ' must have exactly one solution');
  assert.equal(countSolutions(puzzle.solution), 1, puzzle.id + ' answer must satisfy every group');
  assert.ok([...puzzle.puzzle].every((value, index) => value === '.' || value === puzzle.solution[index]));
}
assert.deepEqual(levels, { easy: 10, normal: 10, hard: 10 });
console.log('Verified 30 unique-solution puzzles: easy 10/62 givens, normal 10/53, hard 10/44.');
