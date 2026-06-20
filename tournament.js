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

// ============================================================
// CHỌN NHÂN VẬT THAM GIA GIẢI ĐẤU
// ============================================================

window.tournamentSelectedChars = [];

window.openTournamentSetup = function() {
    let modal = document.getElementById('tournamentSetupModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'tournamentSetupModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);z-index:9000;display:flex;align-items:center;justify-content:center;';
        document.body.appendChild(modal);
    }

    const chars = window.characters || [];
    window.tournamentSelectedChars = [];

    // Tạo danh sách HTML tạm thời
    const charHtmls = chars.map(c => {
        let imgSrc = 'https://i.imgur.com/6X8FQyA.png';
        if (c.img) {
            imgSrc = (c.img.startsWith('http') || c.img.startsWith('data:')) ? c.img : imgSrc;
        }
        return `
            <div class="tournament-player-card" data-charid="${c.id}" onclick="toggleTournamentChar('${c.id}')">
                <img src="${imgSrc}" crossorigin="anonymous">
                <div class="tp-name">${c.name}</div>
                <div style="font-size:0.7rem;color:#64748b;">PL: ${c.pl || 0}</div>
            </div>
        `;
    }).join('');

    modal.innerHTML = `
        <div style="background:#111827;border:1px solid rgba(212,175,55,0.3);border-radius:16px;padding:24px;width:min(800px,90vw);height:80vh;display:flex;flex-direction:column;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="color:#d4af37;font-family:'Cinzel',serif;"><i class="fa-solid fa-users-rays"></i> Chọn Nhân Vật Tham Gia Giải</h3>
                <div style="color:#94a3b8;font-size:0.9rem;">Đã chọn: <span id="tsCount" style="color:#f1f5f9;font-weight:bold;">0</span></div>
            </div>
            
            <div style="display:flex;gap:10px;margin-bottom:16px;">
                <button onclick="selectAllTournamentChars()" style="padding:6px 12px;border-radius:6px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#cbd5e1;cursor:pointer;font-size:0.8rem;">Chọn Tất Cả</button>
                <button onclick="deselectAllTournamentChars()" style="padding:6px 12px;border-radius:6px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#cbd5e1;cursor:pointer;font-size:0.8rem;">Bỏ Chọn Tất Cả</button>
                <button onclick="autoFillTournamentChars()" style="padding:6px 12px;border-radius:6px;background:rgba(168, 85, 247, 0.15);border:1px solid rgba(168, 85, 247, 0.3);color:#c084fc;cursor:pointer;font-size:0.8rem;margin-left:auto;"><i class="fa-solid fa-wand-magic-sparkles"></i> Lấp Đầy Ngẫu Nhiên</button>
            </div>

            <div class="tournament-player-grid" style="overflow-y:auto;flex:1;padding-right:8px;align-content:start;" id="tsGrid">
                ${charHtmls}
            </div>
            
            <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
                <button onclick="document.getElementById('tournamentSetupModal').style.display='none'" style="padding:10px 20px;border-radius:8px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;cursor:pointer;">Hủy</button>
                <button onclick="startCustomTournament()" style="padding:10px 20px;border-radius:8px;background:#d4af37;border:none;color:#0f172a;font-weight:600;cursor:pointer;"><i class="fa-solid fa-play"></i> Khởi Tranh (<span id="tsBtnCount">0</span>)</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    
    // Tải ảnh xịn qua hệ thống IndexedDB (nếu cần thiết)
    setTimeout(async () => {
        const cards = modal.querySelectorAll('.tournament-player-card');
        for (const card of cards) {
            const charId = card.getAttribute('data-charid');
            const c = chars.find(x => String(x.id) === charId);
            if (c) {
                const imgEl = card.querySelector('img');
                const loadedImg = await getTournamentPlayerImage(c);
                imgEl.src = loadedImg;
            }
        }
    }, 100);
};

window.toggleTournamentChar = function(charId) {
    const card = document.querySelector(`.tournament-player-card[data-charid="${charId}"]`);
    if (!card) return;
    
    const idx = window.tournamentSelectedChars.indexOf(charId);
    if (idx === -1) {
        window.tournamentSelectedChars.push(charId);
        card.classList.add('selected');
    } else {
        window.tournamentSelectedChars.splice(idx, 1);
        card.classList.remove('selected');
    }
    
    document.getElementById('tsCount').innerText = window.tournamentSelectedChars.length;
    document.getElementById('tsBtnCount').innerText = window.tournamentSelectedChars.length;
};

window.selectAllTournamentChars = function() {
    window.tournamentSelectedChars = (window.characters || []).map(c => String(c.id));
    document.querySelectorAll('.tournament-player-card').forEach(c => c.classList.add('selected'));
    document.getElementById('tsCount').innerText = window.tournamentSelectedChars.length;
    document.getElementById('tsBtnCount').innerText = window.tournamentSelectedChars.length;
};

window.deselectAllTournamentChars = function() {
    window.tournamentSelectedChars = [];
    document.querySelectorAll('.tournament-player-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('tsCount').innerText = 0;
    document.getElementById('tsBtnCount').innerText = 0;
};

window.startCustomTournament = function() {
    if (window.tournamentSelectedChars.length < 2) {
        if(typeof showToast === 'function') showToast('⚠️ Cần chọn ít nhất 2 nhân vật!', 'warning');
        else alert('⚠️ Cần chọn ít nhất 2 nhân vật!');
        return;
    }
    
    // Lấy size giới hạn nếu người dùng đã chọn
    let limitSize = window.tournamentSelectedChars.length;
    const sizeSelect = document.getElementById('tourneySize');
    if (sizeSelect) {
        limitSize = parseInt(sizeSelect.value, 10);
        if (window.tournamentSelectedChars.length > limitSize) {
            if(typeof showToast === 'function') showToast(`⚠️ Bạn đã chọn dư. Sẽ lấy ngẫu nhiên ${limitSize} người từ danh sách đã chọn.`, 'warning');
        }
    }
    
    // Thuật toán Fisher-Yates để trộn các nhân vật được chọn
    let chosenIds = [...window.tournamentSelectedChars];
    for (let i = chosenIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chosenIds[i], chosenIds[j]] = [chosenIds[j], chosenIds[i]];
    }
    
    // Cắt mảng vừa đủ số lượng
    chosenIds = chosenIds.slice(0, limitSize);
    
    const participants = (window.characters || []).filter(c => chosenIds.includes(String(c.id)));
    document.getElementById('tournamentSetupModal').style.display = 'none';
    window.startTournament(participants);
};

// Hàm tự động lấp đầy (Auto-fill) các ô trống trong Manual Mode
window.autoFillTournamentChars = function() {
    let targetSize = 16;
    const sizeSelect = document.getElementById('tourneySize');
    if (sizeSelect) {
        targetSize = parseInt(sizeSelect.value, 10);
    }
    
    const chars = window.characters || [];
    let currentSelected = window.tournamentSelectedChars.length;
    
    if (currentSelected >= targetSize) {
        if(typeof showToast === 'function') showToast('✅ Đã đủ hoặc dư số lượng!', 'info');
        return;
    }
    
    let needed = targetSize - currentSelected;
    let availableIds = chars.map(c => String(c.id)).filter(id => !window.tournamentSelectedChars.includes(id));
    
    // Trộn ngẫu nhiên danh sách còn lại
    for (let i = availableIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableIds[i], availableIds[j]] = [availableIds[j], availableIds[i]];
    }
    
    let filled = availableIds.slice(0, needed);
    filled.forEach(id => {
        window.tournamentSelectedChars.push(id);
        const card = document.querySelector(`.tournament-player-card[data-charid="${id}"]`);
        if (card) card.classList.add('selected');
    });
    
    document.getElementById('tsCount').innerText = window.tournamentSelectedChars.length;
    document.getElementById('tsBtnCount').innerText = window.tournamentSelectedChars.length;
    if(typeof showToast === 'function') showToast(`🎲 Đã lấp đầy thêm ${filled.length} nhân vật ngẫu nhiên!`, 'success');
};

// ============================================================
// CHẾ ĐỘ GIẢI ĐẤU NGẪU NHIÊN TOÀN HỆ THỐNG
// ============================================================
window.startRandomTournament = function() {
    const chars = window.characters || [];
    if (chars.length < 2) {
        if(typeof showToast === 'function') showToast('⚠️ Không đủ nhân vật trong hệ thống!', 'warning');
        return;
    }
    
    let targetSize = 16;
    const sizeSelect = document.getElementById('tourneySize');
    if (sizeSelect) {
        targetSize = parseInt(sizeSelect.value, 10);
    }
    
    // Trộn ngẫu nhiên toàn bộ danh sách (Fisher-Yates)
    let shuffled = [...chars];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Lấy đúng số lượng
    const participants = shuffled.slice(0, targetSize);
    
    window.startTournament(participants);
    if(typeof showToast === 'function') showToast(`🎲 Đã tạo giải đấu ngẫu nhiên ${participants.length} người!`, 'success');
};
