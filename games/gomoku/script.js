// script.js - 五子棋 Ultra 终极压制版 v18.5 (逻辑强化: 双杀构造 + 反杀预判)
document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    const status = document.getElementById('status');
    const winMessage = document.getElementById('winMessage');
    const winnerDisplay = document.getElementById('winnerDisplay');
    const eggMessage = document.getElementById('eggMessage');
    const restartBtn = document.getElementById('restartBtn');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const viewBoardBtn = document.getElementById('viewBoardBtn');
    const undoBtn = document.getElementById('undoBtn');
    const aiModeBtn = document.getElementById('aiMode');
    const pvpModeBtn = document.getElementById('pvpMode');
    const modelBtns = document.querySelectorAll('.model-btn');
    const aiDifficultyPanel = document.getElementById('aiDifficultyPanel');
    const playerScore = document.getElementById('playerScore');
    const aiScore = document.getElementById('aiScore');
    const moveCount = document.getElementById('moveCount');
    const depthCount = document.getElementById('depthCount');
    const winChance = document.getElementById('winChance');
    const soundToggle = document.getElementById('soundToggle');
    const playerBlack = document.getElementById('playerBlack');
    const playerRed = document.getElementById('playerRed');
    const placeSound = document.getElementById('placeSound');
    const winSound = document.getElementById('winSound');
    const clickSound = document.getElementById('clickSound');
    const turnIndicator = document.getElementById('turnIndicator');
    const undoCountSpan = document.getElementById('undoCountValue');
    const gameStatusDisplay = document.getElementById('gameStatusDisplay');
    const gameStatusText = document.getElementById('gameStatusText');

    let soundEnabled = true;
    let gameState = {
        board: Array(15).fill().map(() => Array(15).fill(0)),
        currentPlayer: 1,
        gameOver: false,
        moves: [],
        mode: 'ai',
        difficulty: 'ultimatehell',
        model: 'normal',
        stats: { playerWins: 0, aiWins: 0, moves: 0, maxDepth: 0 }
    };

    let undoCount = 0;
    function updateUndoDisplay() { if(undoCountSpan) undoCountSpan.innerText = undoCount; }
    function resetUndoCount() { undoCount = 0; updateUndoDisplay(); }
    function incrementUndoCount() { undoCount++; updateUndoDisplay(); }

    function updateGameStatus(state) {
        if (!gameStatusText) return;
        switch(state) {
            case 'idle': gameStatusText.textContent = '未开始'; break;
            case 'player': gameStatusText.textContent = '玩家下棋中'; break;
            case 'ai': gameStatusText.textContent = 'AI 正在思考'; break;
            case 'pvp': gameStatusText.textContent = '双人对战'; break;
            case 'over': gameStatusText.textContent = '游戏结束'; break;
        }
    }

    function initGame() {
        initBoard();
        updateStatus();
        aiModeBtn.classList.add('active');
        pvpModeBtn.classList.remove('active');
        resetUndoCount();
        updateGameStatus('idle');
    }

    function initBoard() {
        board.innerHTML = '';
        const pts = [{r:3,c:3},{r:3,c:11},{r:7,c:7},{r:11,c:3},{r:11,c:11}];
        for(let r=0; r<15; r++) for(let c=0; c<15; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', () => makeMove(r, c));
            board.appendChild(cell);
            if(pts.some(p => p.r===r && p.c===c)) {
                const pt = document.createElement('div');
                pt.className = 'board-point';
                pt.style.top = `${r*30+15}px`;
                pt.style.left = `${c*30+15}px`;
                board.appendChild(pt);
            }
        }
    }

    function playSound(s) { if(!soundEnabled) return; s.currentTime=0; s.play().catch(()=>{}); }

    function drawStones() {
        document.querySelectorAll('.stone').forEach(s => s.remove());
        for(let r=0; r<15; r++) for(let c=0; c<15; c++) if(gameState.board[r][c] !== 0) {
            const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
            const stone = document.createElement('div');
            stone.className = `stone ${gameState.board[r][c] === 1 ? 'black' : 'red'}`;
            if(gameState.moves.length) {
                const last = gameState.moves[gameState.moves.length-1];
                if(last.row === r && last.col === c) stone.classList.add('last-move');
            }
            cell.appendChild(stone);
        }
    }

    const DIRS = [[1,0],[0,1],[1,1],[1,-1]];
    function checkWin(row, col) {
        const p = gameState.board[row][col];
        for(let [dx,dy] of DIRS) {
            let cnt = 1;
            for(let i=1; i<5; i++) { let nr=row+i*dx, nc=col+i*dy; if(nr<0||nr>=15||nc<0||nc>=15||gameState.board[nr][nc]!==p) break; cnt++; }
            for(let i=1; i<5; i++) { let nr=row-i*dx, nc=col-i*dy; if(nr<0||nr>=15||nc<0||nc>=15||gameState.board[nr][nc]!==p) break; cnt++; }
            if(cnt >= 5) return true;
        }
        return false;
    }

    function makeMove(row, col) {
        if(gameState.gameOver || gameState.board[row][col] !== 0) return;
        playSound(placeSound);
        const prev = JSON.parse(JSON.stringify(gameState.board));
        gameState.board[row][col] = gameState.currentPlayer;
        gameState.moves.push({row, col, player: gameState.currentPlayer, prevBoard: prev});
        gameState.stats.moves++;
        moveCount.textContent = gameState.stats.moves;
        drawStones();
        if(checkWin(row, col)) {
            gameState.gameOver = true;
            playSound(winSound);
            showWinner(gameState.currentPlayer);
            return;
        }
        gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        updateStatus();
        playerBlack.classList.toggle('active', gameState.currentPlayer === 1);
        playerRed.classList.toggle('active', gameState.currentPlayer === 2);
        turnIndicator.textContent = gameState.currentPlayer === 1 ? '黑方回合' : (gameState.mode === 'ai' ? 'AI (红) 回合' : '红方回合');
        turnIndicator.style.backgroundColor = gameState.currentPlayer === 1 ? '#333' : '#cc0000';
        if(gameState.mode === 'ai' && gameState.currentPlayer === 2 && !gameState.gameOver) {
            updateGameStatus('ai');
            setTimeout(makeAIMove, 100);
        } else {
            updateGameStatus(gameState.mode === 'ai' ? 'player' : 'pvp');
        }
    }

    function findWinningMove(player) {
        for(let r=0; r<15; r++) for(let c=0; c<15; c++) if(gameState.board[r][c]===0) {
            gameState.board[r][c] = player;
            if(checkWin(r, c)) { gameState.board[r][c] = 0; return {row: r, col: c}; }
            gameState.board[r][c] = 0;
        }
        return null;
    }

    // ---- 新增辅助函数：检测某个玩家在某个空位落子后，是否能形成双活三或四三（不直接赢，但下一手必胜）----
    function willCreateDoubleThreat(row, col, player) {
        if(gameState.board[row][col] !== 0) return false;
        gameState.board[row][col] = player;
        let threats = 0;
        for(let [dx,dy] of DIRS) {
            let info = lineInfoFull(row, col, dx, dy, player);
            let c = info.count;
            let o = info.openEnds;
            // 活三（一端开放也算活三的变种，这里简化：count===3且openEnds>=1）
            if(c === 3 && o >= 1) threats++;
            // 冲四（count===4且openEnds===1）
            if(c === 4 && o === 1) threats += 2;
            // 活四直接必胜
            if(c === 4 && o >= 2) { gameState.board[row][col] = 0; return true; }
        }
        gameState.board[row][col] = 0;
        return threats >= 2;
    }

    function lineInfoFull(row, col, dx, dy, player) {
        let count = 1;
        let openBefore = 0, openAfter = 0;
        for(let i=1; i<5; i++) {
            let r = row + i*dx, c = col + i*dy;
            if(r<0||r>=15||c<0||c>=15) break;
            if(gameState.board[r][c] === player) count++;
            else if(gameState.board[r][c] === 0) { openAfter = 1; break; }
            else break;
        }
        for(let i=1; i<5; i++) {
            let r = row - i*dx, c = col - i*dy;
            if(r<0||r>=15||c<0||c>=15) break;
            if(gameState.board[r][c] === player) count++;
            else if(gameState.board[r][c] === 0) { openBefore = 1; break; }
            else break;
        }
        let openEnds = openBefore + openAfter;
        return { count, openEnds };
    }

    function makeAIMove() {
        if(gameState.gameOver) {
            updateGameStatus('over');
            return;
        }
        updateGameStatus('ai');
        status.innerHTML = '<i class="fas fa-robot"></i> AI思考中 <span class="thinking"><span>.</span><span>.</span><span>.</span></span>';
        setTimeout(() => {
            // 1. 直接胜利
            let winMove = findWinningMove(2);
            if(winMove) { makeMove(winMove.row, winMove.col); return; }
            // 2. 阻挡玩家直接胜利
            let playerWin = findWinningMove(1);
            if(playerWin) { makeMove(playerWin.row, playerWin.col); return; }
            
            // 3. 新增：寻找AI自己可以构造双杀的点（双活三/四三）
            let doubleThreatMove = null;
            for(let r=0; r<15; r++) for(let c=0; c<15; c++) {
                if(gameState.board[r][c]===0 && willCreateDoubleThreat(r,c,2)) {
                    doubleThreatMove = {row:r, col:c};
                    break;
                }
            }
            if(doubleThreatMove) { makeMove(doubleThreatMove.row, doubleThreatMove.col); return; }
            
            // 4. 预判玩家可能的双杀点，优先阻挡
            let playerDoubleMove = null;
            for(let r=0; r<15; r++) for(let c=0; c<15; c++) {
                if(gameState.board[r][c]===0 && willCreateDoubleThreat(r,c,1)) {
                    playerDoubleMove = {row:r, col:c};
                    break;
                }
            }
            if(playerDoubleMove) { makeMove(playerDoubleMove.row, playerDoubleMove.col); return; }
            
            // 5. 常规深度搜索
            let move = getUltimateHellAIMove();
            if(move) makeMove(move.row, move.col);
        }, 30);
    }

    // ========== 终极评估核心 (保留原有强度 + 动态聚焦) ==========
    function lineInfo(row, col, dx, dy, player) {
        let count = 1;
        let openBefore = 0, openAfter = 0;
        for(let i=1; i<5; i++) {
            let r = row + i*dx, c = col + i*dy;
            if(r<0||r>=15||c<0||c>=15) break;
            if(gameState.board[r][c] === player) count++;
            else if(gameState.board[r][c] === 0) { openAfter = 1; break; }
            else break;
        }
        for(let i=1; i<5; i++) {
            let r = row - i*dx, c = col - i*dy;
            if(r<0||r>=15||c<0||c>=15) break;
            if(gameState.board[r][c] === player) count++;
            else if(gameState.board[r][c] === 0) { openBefore = 1; break; }
            else break;
        }
        let openEnds = openBefore + openAfter;
        return { count, openEnds, openBefore, openAfter };
    }

    function positionValue(row, col, player) {
        let score = 0;
        let flex3Count = 0;
        let block4Count = 0;
        for(let [dx,dy] of DIRS) {
            let info = lineInfo(row, col, dx, dy, player);
            let c = info.count;
            let o = info.openEnds;
            if(c >= 5) score += 10000000;
            else if(c === 4 && o >= 1) score += 500000;
            else if(c === 4 && o === 0) { score += 8000; block4Count++; }
            else if(c === 3 && o === 2) { score += 5000; flex3Count++; }
            else if(c === 3 && o === 1) score += 1200;
            else if(c === 2 && o === 2) score += 400;
            else if(c === 2 && o === 1) score += 80;
            else if(c === 1 && o >= 1) score += 10;
        }
        if(flex3Count >= 2) score += 300000;
        if(block4Count >= 1 && flex3Count >= 1) score += 250000;
        if(block4Count >= 2) score += 200000;
        return score;
    }

    function evaluateBoard() {
        let aiScore = 0, playerScore = 0;
        for(let r=0; r<15; r++) for(let c=0; c<15; c++) {
            if(gameState.board[r][c] === 2) aiScore += positionValue(r, c, 2);
            else if(gameState.board[r][c] === 1) playerScore += positionValue(r, c, 1);
        }
        for(let r=3; r<=11; r++) for(let c=3; c<=11; c++) {
            if(gameState.board[r][c] === 2) aiScore += 30;
            else if(gameState.board[r][c] === 1) playerScore += 15;
        }
        return aiScore - playerScore * 15.0;
    }

    function hasNeighbor(r,c,d=2) {
        for(let i=Math.max(0,r-d); i<=Math.min(14,r+d); i++) for(let j=Math.max(0,c-d); j<=Math.min(14,c+d); j++) if(gameState.board[i][j]!==0) return true;
        return false;
    }

    function genMoves() {
        let cand = [];
        for(let r=0; r<15; r++) for(let c=0; c<15; c++) {
            if(gameState.board[r][c] !== 0 || !hasNeighbor(r,c,2)) continue;
            gameState.board[r][c] = 2;
            let aiScore = positionValue(r, c, 2);
            gameState.board[r][c] = 0;

            gameState.board[r][c] = 1;
            let playerScore = positionValue(r, c, 1);
            gameState.board[r][c] = 0;

            let total = aiScore + playerScore * 10.0;
            total += 14 - (Math.abs(r-7) + Math.abs(c-7));
            cand.push({row: r, col: c, score: total});
        }
        cand.sort((a,b) => b.score - a.score);
        return cand.slice(0, 15);
    }

    function getUltimateHellAIMove() {
        let start = Date.now();
        let maxDepth = gameState.model === 'fullpower' ? 14 : 12;
        let timeLimit = gameState.model === 'fullpower' ? 3500 : 2500;
        let moves = genMoves();
        if(!moves.length) return null;

        let bestMove = null;
        let bestScore = -Infinity;
        let winMove = findWinningMove(2);
        if(winMove) return winMove;

        for(let d=2; d<=maxDepth; d++) {
            if(Date.now() - start > timeLimit) break;
            let curBest = null, curScore = -Infinity;
            for(let mv of moves) {
                if(Date.now() - start > timeLimit) break;
                gameState.board[mv.row][mv.col] = 2;
                if(checkWin(mv.row, mv.col)) {
                    gameState.board[mv.row][mv.col] = 0;
                    depthCount.textContent = d;
                    winChance.textContent = '0.00%';
                    return mv;
                }
                let sc = minimax(d-1, -Infinity, Infinity, false, start, timeLimit);
                gameState.board[mv.row][mv.col] = 0;
                if(sc > curScore) { curScore = sc; curBest = mv; }
            }
            if(curBest) { bestMove = curBest; bestScore = curScore; gameState.stats.maxDepth = d; }
            // 动态聚焦：如果当前最优分数极高（比如已经接近必胜），则提前结束迭代
            if(bestScore > 90000000) break;
        }
        depthCount.textContent = gameState.stats.maxDepth;
        winChance.textContent = '0.00%';
        return bestMove || moves[0];
    }

    function minimax(depth, alpha, beta, isMax, start, limit) {
        if(Date.now() - start > limit) return evaluateBoard();
        let w = 0;
        for(let r=0;r<15;r++) for(let c=0;c<15;c++) if(gameState.board[r][c]!==0 && checkWin(r,c)) { w = gameState.board[r][c]; break; }
        if(w !== 0) return w === 2 ? 100000000 : -100000000;
        if(depth === 0) return evaluateBoard();

        let moves = genMoves();
        if(!moves.length) return 0;

        if(isMax) {
            let maxEval = -Infinity;
            for(let mv of moves) {
                gameState.board[mv.row][mv.col] = 2;
                if(checkWin(mv.row, mv.col)) { gameState.board[mv.row][mv.col] = 0; return 100000000; }
                let ev = minimax(depth-1, alpha, beta, false, start, limit);
                gameState.board[mv.row][mv.col] = 0;
                maxEval = Math.max(maxEval, ev);
                alpha = Math.max(alpha, ev);
                if(beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for(let mv of moves) {
                gameState.board[mv.row][mv.col] = 1;
                if(checkWin(mv.row, mv.col)) { gameState.board[mv.row][mv.col] = 0; return -100000000; }
                let ev = minimax(depth-1, alpha, beta, true, start, limit);
                gameState.board[mv.row][mv.col] = 0;
                minEval = Math.min(minEval, ev);
                beta = Math.min(beta, ev);
                if(beta <= alpha) break;
            }
            return minEval;
        }
    }

    function updateStatus() {
        if(gameState.gameOver) {
            updateGameStatus('over');
            return;
        }
        if(gameState.mode==='ai') {
            if(gameState.currentPlayer === 1) {
                status.innerHTML = '<i class="fas fa-chess"></i> 你的回合 (黑棋)';
                updateGameStatus('player');
            } else {
                status.innerHTML = '<i class="fas fa-robot"></i> AI思考中...';
            }
        } else {
            status.innerHTML = `<i class="fas fa-user"></i> ${gameState.currentPlayer===1?'黑方':'红方'}回合`;
            updateGameStatus('pvp');
        }
    }

    function showWinner(player) {
        winMessage.classList.add('show');
        let name, egg;
        if(player === 1) {
            name = gameState.mode === 'ai' ? '你赢了! (不可能吧?)' : '黑方胜利!';
            egg = gameState.mode === 'ai' ? '这怎么可能…这可是我的自研AI' : '精彩的对局！';
            gameState.stats.playerWins++;
            playerScore.textContent = gameState.stats.playerWins;
        } else {
            name = gameState.mode === 'ai' ? 'AI赢了!' : '红方胜利!';
            egg = gameState.mode === 'ai' ? '速战速决，直接攻破！' : '红方技高一筹！';
            gameState.stats.aiWins++;
            aiScore.textContent = gameState.stats.aiWins;
        }
        winnerDisplay.innerHTML = `<div class="player-icon ${player===1?'black-icon':'red-icon'}">●</div><div>${name}</div>`;
        eggMessage.textContent = egg;
        updateGameStatus('over');
    }

    function restartGame() {
        gameState.board = Array(15).fill().map(() => Array(15).fill(0));
        gameState.currentPlayer=1; gameState.gameOver=false; gameState.moves=[]; gameState.stats.moves=0;
        moveCount.textContent='0'; depthCount.textContent='0'; winChance.textContent='0%';
        playerBlack.classList.add('active'); playerRed.classList.remove('active');
        turnIndicator.textContent='黑方回合'; turnIndicator.style.backgroundColor='#333';
        winMessage.classList.remove('show'); drawStones(); updateStatus(); resetUndoCount();
        updateGameStatus('idle');
    }

    function undoMove() {
        if(gameState.moves.length===0||gameState.gameOver) return;
        playSound(clickSound);
        const last=gameState.moves.pop();
        gameState.board=last.prevBoard; gameState.currentPlayer=last.player; gameState.gameOver=false;
        gameState.stats.moves--; moveCount.textContent=gameState.stats.moves;
        playerBlack.classList.toggle('active', gameState.currentPlayer===1);
        playerRed.classList.toggle('active', gameState.currentPlayer===2);
        turnIndicator.textContent = gameState.currentPlayer===1?'黑方回合':(gameState.mode==='ai'?'AI (红) 回合':'红方回合');
        turnIndicator.style.backgroundColor = gameState.currentPlayer===1?'#333':'#cc0000';
        drawStones(); updateStatus(); incrementUndoCount();
    }

    function setModel(m) { playSound(clickSound); gameState.model=m; modelBtns.forEach(b=>b.classList.toggle('active', b.dataset.model===m)); winChance.textContent='0.00%'; }

    function setMode(mode) {
        playSound(clickSound);
        gameState.mode = mode;
        aiModeBtn.classList.toggle('active', mode === 'ai');
        pvpModeBtn.classList.toggle('active', mode === 'pvp');
        if(mode === 'pvp') {
            aiDifficultyPanel.style.display = 'none';
        } else {
            aiDifficultyPanel.style.display = 'block';
        }
        if(mode === 'ai' && gameState.currentPlayer === 2 && !gameState.gameOver) {
            updateGameStatus('ai');
            setTimeout(makeAIMove, 100);
        } else {
            updateGameStatus(mode === 'ai' ? 'player' : 'pvp');
        }
        updateStatus();
        turnIndicator.textContent = gameState.currentPlayer === 1 ? '黑方回合' : (mode === 'ai' ? 'AI (红) 回合' : '红方回合');
    }

    restartBtn.addEventListener('click', restartGame);
    playAgainBtn.addEventListener('click', () => { playSound(clickSound); winMessage.classList.remove('show'); restartGame(); });
    viewBoardBtn.addEventListener('click', () => { playSound(clickSound); winMessage.classList.remove('show'); });
    undoBtn.addEventListener('click', undoMove);
    modelBtns.forEach(b=>b.addEventListener('click', ()=>setModel(b.dataset.model)));
    aiModeBtn.addEventListener('click', ()=>setMode('ai'));
    pvpModeBtn.addEventListener('click', ()=>setMode('pvp'));
    soundToggle.addEventListener('click', ()=>{ soundEnabled=!soundEnabled; soundToggle.innerHTML = soundEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>'; playSound(clickSound); });

    initGame();
});