// Adapted from LittleJSArcade connect4.html at ea73cf7357854c913798390603045fdcb1f472e7. MIT; see LICENSE and SOURCE.md.
(() => {
'use strict';
const ROWS = 6, COLS = 7, DISC_EMPTY = 0, DISC_RED = 1, DISC_YELLOW = 2;
const COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6];
function getOpponent(player)
{
    return player === DISC_RED ? DISC_YELLOW : DISC_RED;
}

function getLowestEmptyRowForState(b, col)
{
    for (let row = 0; row < ROWS; row++)
    {
        if (b[row][col] === DISC_EMPTY)
            return row;
    }
    return -1; // column full
}

function countActiveThreats(board, player)
{
    // An "active threat" is a 4-window where `player` has 3 stones and the
    // remaining empty cell is the next playable cell in its column. If the
    // player has ≥2 active threats, the opponent can only block one.
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    let threats = 0;
    for (let row = 0; row < ROWS; row++)
    {
        for (let col = 0; col < COLS; col++)
        {
            for (const [dr, dc] of directions)
            {
                let mine = 0, theirs = 0, emptyR = -1, emptyC = -1;
                let inBounds = true;
                for (let i = 0; i < 4; i++)
                {
                    const r = row + dr * i;
                    const c = col + dc * i;
                    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) { inBounds = false; break; }
                    if (board[r][c] === player) mine++;
                    else if (board[r][c] === DISC_EMPTY) { emptyR = r; emptyC = c; }
                    else theirs++;
                }
                if (!inBounds) continue;
                if (mine !== 3 || theirs !== 0) continue;
                // Window has exactly 3 player + 1 empty. Is the empty cell playable now?
                if (emptyR === 0 || board[emptyR - 1][emptyC] !== DISC_EMPTY)
                    threats++;
            }
        }
    }
    return threats;
}

function checkWinForState(b, row, col, player)
{
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (const [dr, dc] of directions)
    {
        const cells = [{row, col}];

        // Check positive direction
        for (let i = 1; i < 4; i++)
        {
            const r = row + dr * i;
            const c = col + dc * i;
            if (r < 0 || r >= ROWS || c < 0 || c >= COLS || b[r][c] !== player)
                break;
            cells.push({row: r, col: c});
        }

        // Check negative direction
        for (let i = 1; i < 4; i++)
        {
            const r = row - dr * i;
            const c = col - dc * i;
            if (r < 0 || r >= ROWS || c < 0 || c >= COLS || b[r][c] !== player)
                break;
            cells.push({row: r, col: c});
        }

        if (cells.length >= 4)
            return cells;
    }

    return null;
}

const connect4Game = {
    getOpponent: (player) => player === DISC_RED ? DISC_YELLOW : DISC_RED,
    getCurrentPlayer: (state) => state.currentPlayer,
    isTerminal: (state) => state.gameOver,

    getLegalMoves(state, player)
    {
        // Center-first ordering baked in via COLUMN_ORDER for better pruning
        const moves = [];
        for (const col of COLUMN_ORDER)
        {
            if (getLowestEmptyRowForState(state.board, col) >= 0)
                moves.push({col});
        }
        return moves;
    },

    applyMove(state, move, player)
    {
        const newBoard = state.board.map(r => [...r]);
        const row = getLowestEmptyRowForState(newBoard, move.col);
        newBoard[row][move.col] = player;

        let nextGameOver = false;
        if (checkWinForState(newBoard, row, move.col, player))
        {
            nextGameOver = true;
        }
        else
        {
            // Check draw: any DISC_EMPTY in top row means board is not full
            let full = true;
            for (let c = 0; c < COLS; c++)
            {
                if (newBoard[ROWS - 1][c] === DISC_EMPTY) { full = false; break; }
            }
            if (full) nextGameOver = true;
        }

        const opponent = player === DISC_RED ? DISC_YELLOW : DISC_RED;
        return {board: newBoard, currentPlayer: opponent, gameOver: nextGameOver};
    },

    evaluate(state, player)
    {
        const b = state.board;
        const opponent = player === DISC_RED ? DISC_YELLOW : DISC_RED;
        let score = 0;

        // Evaluate all windows of 4
        for (let row = 0; row < ROWS; row++)
        {
            for (let col = 0; col < COLS; col++)
            {
                const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

                for (const [dr, dc] of directions)
                {
                    let mine = 0, theirs = 0, empty = 0;

                    for (let i = 0; i < 4; i++)
                    {
                        const r = row + dr * i;
                        const c = col + dc * i;
                        if (r < 0 || r >= ROWS || c < 0 || c >= COLS)
                        {
                            mine = -1;
                            break;
                        }
                        if (b[r][c] === player) mine++;
                        else if (b[r][c] === opponent) theirs++;
                        else empty++;
                    }

                    if (mine < 0) continue;

                    if (mine === 4) score += 1000;
                    else if (mine === 3 && empty === 1) score += 50;
                    else if (mine === 2 && empty === 2) score += 10;
                    if (theirs === 3 && empty === 1) score -= 80;
                    if (theirs === 4) score -= 1000;
                }
            }
        }

        // Center column preference
        for (let row = 0; row < ROWS; row++)
        {
            if (b[row][3] === player) score += 6;
            if (b[row][3] === opponent) score -= 6;
        }

        // Double-threat bonus — two simultaneous immediately-playable winning
        // threats can't both be blocked.
        const playerThreats = countActiveThreats(b, player);
        const opponentThreats = countActiveThreats(b, opponent);
        if (playerThreats >= 2) score += 500;
        if (opponentThreats >= 2) score -= 500;

        return score;
    },
};


window.Connect4Rules = Object.freeze({ ROWS, COLS, DISC_EMPTY, DISC_RED, DISC_YELLOW, getOpponent, getLowestEmptyRowForState, checkWinForState, countActiveThreats, connect4Game });
})();
