/* ============================================================
   FANTASY CODEX PRO — TOURNAMENT.JS
   Nhóm 2.2 & 2.3: Chế độ Giải đấu (Tournament Mode) & Bảng Xếp Hạng (Leaderboard)
   ============================================================ */

/**
 * Khởi tạo Giải đấu với mảng các nhân vật tham gia
 * @param {Array} participants - Mảng đối tượng nhân vật (thường là 8 hoặc 16)
 */
window.startTournament = function(participants) {
    if (!participants || participants.length < 2) {
        showToast('⚠️ Cần ít nhất 2 người để tổ chức giải đấu!', 'warning');
        return;
    }

    // Đảm bảo số lượng là lũy thừa của 2 (2, 4, 8, 16...)
    const validSizes = [2, 4, 8, 16, 32];
    let size = validSizes.find(s => s >= participants.length);
    if (!size) size = 16; // tối đa 16 cho giao diện vừa vặn

    let players = [...participants].slice(0, size);
    
    // Nếu thiếu người, thêm NPC hoặc "BYE" (Bỏ trống)
    while (players.length < size) {
        players.push({
            id: 'bye_' + players.length,
            name: 'BYE (Trống)',
            img: 'https://i.imgur.com/6X8FQyA.png',
            stats: {},
            pl: 0
        });
    }

    // Xáo trộn ngẫu nhiên danh sách
    players = players.sort(() => Math.random() - 0.5);

    // Tạo bracket
    window.currentTournament = {
        rounds: [players],
        currentRound: 0,
        completed: false,
        champion: null
    };

    renderTournamentBracket();
};

/**
 * Lấy ảnh nhân vật an toàn
 */
async function getTournamentPlayerImage(p) {
    if (!p.img || p.id.startsWith('bye_')) return 'https://i.imgur.com/6X8FQyA.png';
    if (p.img.startsWith('http') || p.img.startsWith('data:')) return p.img;
    if (typeof getImage === 'function') {
        const stored = await getImage(p.img).catch(() => null);
        if (stored) return stored;
    }
    return 'https://i.imgur.com/6X8FQyA.png';
}

/**
 * Render giao diện Sơ đồ nhánh giải đấu (Bracket)
 */
window.renderTournamentBracket = async function() {
    const container = document.getElementById('tournamentBracket');
    if (!container) return;

    const t = window.currentTournament;
    if (!t || !t.rounds || t.rounds.length === 0) {
        container.innerHTML = '<p style="color:#64748b;font-style:italic;">Chưa có giải đấu nào đang diễn ra.</p>';
        return;
    }

    let html = '<div class="tournament-bracket">';

    for (let rIndex = 0; rIndex < t.rounds.length; rIndex++) {
        const roundPlayers = t.rounds[rIndex];
        const numMatches = roundPlayers.length / 2;
        
        let roundName = `Vòng ${rIndex + 1}`;
        if (numMatches === 4) roundName = 'Tứ Kết';
        if (numMatches === 2) roundName = 'Bán Kết';
        if (numMatches === 1) roundName = 'Chung Kết';
        if (numMatches === 0.5) roundName = 'Nhà Vô Địch';

        html += `<div class="bracket-round">`;
        html += `<div class="bracket-round-title">${roundName}</div>`;

        if (numMatches >= 1) {
            for (let i = 0; i < numMatches; i++) {
                const p1 = roundPlayers[i * 2];
                const p2 = roundPlayers[i * 2 + 1];
                
                const p1Img = await getTournamentPlayerImage(p1);
                const p2Img = await getTournamentPlayerImage(p2);

                const hasWinner = t.rounds[rIndex + 1] !== undefined;
                let p1WinnerClass = '';
                let p2WinnerClass = '';
                
                if (hasWinner) {
                    const winner = t.rounds[rIndex + 1][i];
                    if (winner && p1 && winner.id === p1.id) p1WinnerClass = 'winner';
                    if (winner && p2 && winner.id === p2.id) p2WinnerClass = 'winner';
                }

                html += `
                    <div class="bracket-match">
                        <div class="bracket-fighter ${p1WinnerClass}">
                            <img src="${p1Img}" alt="${p1.name}" crossorigin="anonymous">
                            <span class="bf-name">${p1.name}</span>
                        </div>
                        <div class="bracket-vs">VS</div>
                        <div class="bracket-fighter ${p2WinnerClass}">
                            <img src="${p2Img}" alt="${p2.name}" crossorigin="anonymous">
                            <span class="bf-name">${p2.name}</span>
                        </div>
                    </div>
                `;
            }
        } else if (t.champion) {
            // Render Champion
            html += `
                <div class="champion-reveal">
                    <div class="champion-icon">👑</div>
                    <div class="champion-name">${t.champion.name}</div>
                    <div style="color:#94a3b8;font-size:0.8rem;margin-top:10px;">VÔ ĐỊCH GIẢI ĐẤU</div>
                </div>
            `;
        }

        html += `</div>`;
    }

    html += '</div>';

    // Điều khiển tiến độ
    if (!t.completed) {
        html += `
            <div style="margin-top:20px;text-align:center;">
                <button class="btn-primary" onclick="simulateNextTournamentRound()">
                    <i class="fa-solid fa-play"></i> Mô phỏng vòng tiếp theo
                </button>
                <button class="btn-secondary" onclick="simulateTournamentToEnd()" style="margin-left:10px;">
                    <i class="fa-solid fa-forward-fast"></i> Bỏ qua đến kết quả
                </button>
            </div>
        `;
    } else {
        html += `
            <div style="margin-top:20px;text-align:center;">
                <button class="btn-secondary" onclick="window.currentTournament=null; renderTournamentBracket();">
                    <i class="fa-solid fa-rotate-right"></i> Giải đấu mới
                </button>
            </div>
        `;
    }

    container.innerHTML = html;
};

/**
 * Mô phỏng kết quả của 1 trận đấu (Tự động tính dựa trên stats nếu có hàm simulateTurnBattle)
 * Trả về người chiến thắng
 */
window.runTournamentMatch = function(p1, p2) {
    if (p1.id.startsWith('bye_')) return p2;
    if (p2.id.startsWith('bye_')) return p1;

    // Nếu có hàm simulateTurnBattle (nhóm 2.2) thì dùng nó
    if (typeof simulateTurnBattle === 'function') {
        const battleLog = simulateTurnBattle(p1, p2); // Trả về mảng log, dòng cuối thường chứa kết quả
        // Đếm sát thương hoặc xem ai chết trước trong log (giả định battle.js xử lý)
        // Dưới đây là dự phòng nếu battle.js chưa cung cấp người thắng rõ ràng:
        let p1Score = (p1.pl || 0) + Math.random() * 20;
        let p2Score = (p2.pl || 0) + Math.random() * 20;
        return p1Score >= p2Score ? p1 : p2;
    } else {
        // Dự phòng: so sánh power level có thêm yếu tố ngẫu nhiên
        let p1Score = parseFloat(p1.pl || 0) + Math.random() * 50;
        let p2Score = parseFloat(p2.pl || 0) + Math.random() * 50;
        
        // Thêm log vào bảng leaderboard
        if (p1Score >= p2Score) {
            updateLeaderboardStats(p1.id, true);
            updateLeaderboardStats(p2.id, false);
            return p1;
        } else {
            updateLeaderboardStats(p2.id, true);
            updateLeaderboardStats(p1.id, false);
            return p2;
        }
    }
};

/**
 * Tiến hành mô phỏng 1 vòng đấu tiếp theo
 */
window.simulateNextTournamentRound = function() {
    const t = window.currentTournament;
    if (!t || t.completed) return;

    const currentPlayers = t.rounds[t.currentRound];
    const numMatches = currentPlayers.length / 2;
    
    if (numMatches < 1) {
        t.completed = true;
        t.champion = currentPlayers[0];
        renderTournamentBracket();
        return;
    }

    const nextRoundPlayers = [];
    for (let i = 0; i < numMatches; i++) {
        const p1 = currentPlayers[i * 2];
        const p2 = currentPlayers[i * 2 + 1];
        const winner = runTournamentMatch(p1, p2);
        nextRoundPlayers.push(winner);
    }

    t.rounds.push(nextRoundPlayers);
    t.currentRound++;

    if (nextRoundPlayers.length === 1) {
        t.completed = true;
        t.champion = nextRoundPlayers[0];
    }

    renderTournamentBracket();
};

/**
 * Chạy thẳng đến cuối giải đấu
 */
window.simulateTournamentToEnd = function() {
    const t = window.currentTournament;
    if (!t || t.completed) return;

    while (!t.completed) {
        simulateNextTournamentRound();
    }
};

// ============================================================
// BẢNG XẾP HẠNG (LEADERBOARD)
// ============================================================

/**
 * Cập nhật số liệu thắng/thua vào Leaderboard (Lưu trong LocalStorage hoặc Object nhân vật)
 */
window.updateLeaderboardStats = function(charId, isWin) {
    if (charId.startsWith('bye_')) return;
    
    let lbData = JSON.parse(localStorage.getItem('codex_leaderboard') || '{}');
    if (!lbData[charId]) {
        lbData[charId] = { wins: 0, losses: 0, matches: 0 };
    }
    
    lbData[charId].matches += 1;
    if (isWin) lbData[charId].wins += 1;
    else lbData[charId].losses += 1;
    
    localStorage.setItem('codex_leaderboard', JSON.stringify(lbData));
};

/**
 * Render Bảng xếp hạng Top nhân vật
 */
window.renderLeaderboard = async function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const chars = window.characters || [];
    let lbData = JSON.parse(localStorage.getItem('codex_leaderboard') || '{}');

    // Kết hợp dữ liệu Leaderboard với dữ liệu nhân vật
    const lbArray = chars.map(c => {
        const stat = lbData[c.id] || { wins: 0, losses: 0, matches: 0 };
        const winRate = stat.matches > 0 ? (stat.wins / stat.matches) * 100 : 0;
        return {
            char: c,
            pl: parseFloat(c.pl || 0),
            wins: stat.wins,
            matches: stat.matches,
            winRate: winRate
        };
    });

    // Sắp xếp: Ưu tiên Tỷ lệ thắng (nếu có trận đánh), sau đó là PL
    lbArray.sort((a, b) => {
        if (a.matches >= 3 && b.matches < 3) return -1;
        if (b.matches >= 3 && a.matches < 3) return 1;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.pl - a.pl;
    });

    const top10 = lbArray.slice(0, 10);

    let html = `
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th width="50">Hạng</th>
                    <th>Nhân vật</th>
                    <th style="text-align:center;">Power Level</th>
                    <th style="text-align:right;">Tỷ lệ thắng</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (top10.length === 0) {
        html += `<tr><td colspan="4" style="text-align:center;color:#64748b;font-style:italic;">Chưa có dữ liệu</td></tr>`;
    } else {
        for (let i = 0; i < top10.length; i++) {
            const row = top10[i];
            const c = row.char;
            const imgSrc = await getTournamentPlayerImage(c);
            
            let rankClass = '';
            if (i === 0) rankClass = 'lb-rank-1';
            else if (i === 1) rankClass = 'lb-rank-2';
            else if (i === 2) rankClass = 'lb-rank-3';

            html += `
                <tr onclick="if(typeof openProfile==='function') openProfile('${c.id}')" style="cursor:pointer;">
                    <td class="lb-rank ${rankClass}">#${i + 1}</td>
                    <td>
                        <div style="display:flex;align-items:center;gap:12px;">
                            <img src="${imgSrc}" class="lb-avatar" crossorigin="anonymous">
                            <div>
                                <div style="font-weight:600;color:#f1f5f9;">${c.name}</div>
                                <div style="font-size:0.75rem;color:#64748b;">${c.race || 'Không rõ'}</div>
                            </div>
                        </div>
                    </td>
                    <td style="text-align:center;font-weight:600;color:#d4af37;">
                        ${row.pl.toLocaleString()}
                    </td>
                    <td style="text-align:right;">
                        <span style="font-weight:600;">${row.winRate.toFixed(1)}%</span>
                        <div style="font-size:0.7rem;color:#64748b;">${row.wins}W - ${row.matches - row.wins}L</div>
                        <div class="lb-win-rate">
                            <div class="lb-win-bar" style="width:${row.winRate}%"></div>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
};

console.log('🏆 tournament.js: Đã tải Tournament Bracket và Leaderboard');
