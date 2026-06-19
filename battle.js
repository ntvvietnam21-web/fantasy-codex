// Battle.js - Nâng cấp bởi GM (Codex)

let characters = [];
let battleHistory = [];

// --- CONFIGURATION ---
const eqBonusMap = {
    weapon: { "Excalibur": 200, "Dark Blade": 150 },
    armor: { "Dragon Armor": 120 },
    accessory: { "Ring of Luck": 80 }
};

// GM: Hệ thống khắc chế hệ nguyên tố (Element)
const elementCounter = {
    "Fire": "Grass",
    "Grass": "Water",
    "Water": "Fire",
    "Light": "Dark",
    "Dark": "Light"
};
const findChar = id => characters.find(c => c.id === id);
// --- INITIALIZATION ---
async function initBattleData() {
    try {
        // 1. Khởi tạo DB nếu chưa có
        if (typeof initImageDB === "function") await initImageDB();

        // 2. Nạp nhân vật từ IndexedDB
        characters = await dbGetAll("characters") || [];
        
        // 3. Nạp lịch sử đấu từ IndexedDB (có xử lý lỗi nếu store chưa tồn tại)
        try {
            battleHistory = await dbGetAll("battle_history") || [];
        } catch (e) {
            console.warn("⚠️ Battle history store chưa sẵn sàng, sử dụng mảng trống.");
            battleHistory = [];
        }
        
        console.log(`⚔️ GM: Hệ thống sẵn sàng. Nhân vật: ${characters.length}, Lịch sử: ${battleHistory.length}`);

        document.getElementById("teamA").innerHTML = "";
        document.getElementById("teamB").innerHTML = "";
        createSlots("teamA", 3);
        createSlots("teamB", 3);
        
    } catch (err) {
        console.error("❌ GM Error:", err);
    }
}
// --- LOGIC TÍNH POWER NÂNG CAO ---
function calcPower(char, enemyTeamIds = []) {
    if (!char) return 0;
    
    const pl = +char.pl || 0;
    const s = char.stats || {};
    const eq = char.equipment || {};
    const g = (group, key) => s?.[group]?.[key] ?? 0;
    const h = key => s?.hidden?.[key] ?? 0;

    let eqBonus = 0;
    for (const [type, items] of Object.entries(eqBonusMap)) {
        if (eq[type] && items[eq[type]]) eqBonus += items[eq[type]];
    }

    // Công thức tính Power (GM: Đã cân bằng lại các chỉ số)
    let power =
        pl * 3 +
        (g("core","str") * 2.5) + (g("core","agi") * 2) + (g("core","int") * 2.5) +
        (g("offense","atk") * 2) + (g("offense","matk") * 2) +
        (g("defense","dmgReduce") * 5) +
        (h("talent") * 10) + (h("potential") * 5);

    // --- LOGIC KHẮC CHẾ MỞ RỘNG ---
    if (enemyTeamIds.length > 0) {
        const enemies = enemyTeamIds.map(id => findChar(id)).filter(e => e);
        
        enemies.forEach(enemy => {
            // 1. Khắc chế Tộc (Race)
            if (char.race === "Demon" && enemy.race === "Angel") power *= 0.85;
            if (char.race === "Slayer" && enemy.race === "Dragon") power *= 1.25;

            // 2. Khắc chế Hệ (Element) - GM New Update
            if (elementCounter[char.element] === enemy.element) {
                power *= 1.15; // Tăng 15% nếu khắc hệ đối phương
            }
        });
    }

    return Math.max(0, power);
}
// --- UI & INTERACTION ---
function createSelect(teamId) {
    const wrapper = document.createElement("div");
    wrapper.className = "slot card-battle"; // Thêm class mới để làm hiệu ứng card

    const avatar = document.createElement("img");
    avatar.className = "slot-avatar";
    avatar.src = "https://i.imgur.com/6X8FQyA.png";

    const select = document.createElement("select");
    select.className = "select-battle";
    select.innerHTML = `<option value="">-- Chọn Anh Hùng --</option>`;
    
    characters.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `[${c.race || '?'}] ${c.name}`;
        select.appendChild(opt);
    });

    const powerText = document.createElement("div");
    powerText.className = "power-tag";
    powerText.innerText = "0 PL";

    select.onchange = async () => {
        const char = findChar(select.value);
        if (char) {
            powerText.innerText = Math.floor(calcPower(char)) + " PL";
            // Load ảnh từ DB hoặc URL
            if (char.img && typeof getImage === "function") {
                const url = (char.img.startsWith("http") || char.img.startsWith("data:")) 
                            ? char.img : await getImage(char.img);
                avatar.src = url || "https://i.imgur.com/6X8FQyA.png";
            }
        } else {
            powerText.innerText = "0 PL";
            avatar.src = "https://i.imgur.com/6X8FQyA.png";
        }
        updateTotalPowerDisplay();
    };

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-remove-slot";
    removeBtn.innerHTML = "&times;";
    removeBtn.onclick = () => { wrapper.remove(); updateTotalPowerDisplay(); };

    wrapper.append(removeBtn, avatar, select, powerText);
    document.getElementById(teamId).appendChild(wrapper);
}

// --- CHIẾN ĐẤU & KẾT QUẢ ---
async function startBattle() {
    const teamA = getTeamPower("teamA", "teamB");
    const teamB = getTeamPower("teamB", "teamA");

    if (teamA.total === 0 || teamB.total === 0) {
        return typeof showToast === "function" ? showToast("⚠️ Đội hình chưa sẵn sàng!") : alert("Lỗi đội hình");
    }

    // Lấy thời tiết từ features.js nếu có
    let weatherData = null;
    if (typeof window.getCurrentWeather === 'function') {
        weatherData = window.getCurrentWeather('battle');
    }

    // Mô phỏng Crit/Dodge cơ bản (giữ nguyên logic gốc cho Win Rate)
    const simA = applyCombatEffects(teamA.total);
    const simB = applyCombatEffects(teamB.total);

    const winRateA = getWinRate(simA.power, simB.power);
    const roll = Math.random();
    const isAWin = roll < winRateA;
    const winnerText = isAWin ? "🔥 ĐỘI A CHIẾN THẮNG" : "💀 ĐỘI B CHIẾN THẮNG";

    // Xóa kết quả cũ và hiển thị Layout
    renderResult(teamA, teamB, simA, simB, winRateA, winnerText);

    // Chạy Log Turn-based Battle
    await playBattleReplay(teamA.detail, teamB.detail, simA.power, simB.power, isAWin, weatherData);

    // Lưu lịch sử
    const historyEntry = {
        id: "battle_" + Date.now(),
        date: new Date().toLocaleString(),
        winner: winnerText,
        scoreA: simA.power.toFixed(0),
        scoreB: simB.power.toFixed(0),
        teamANames: teamA.detail,
        teamBNames: teamB.detail
    };

    if (typeof dbSave === "function") {
        try {
            await dbSave("battle_history", historyEntry);
            battleHistory.push(historyEntry);
        } catch (e) {
            console.warn("⚠️ Không thể lưu lịch sử chiến đấu:", e);
        }
    }
}

/**
 * Hàm sinh log mô phỏng turn-based và in ra kiểu typewriter
 */
async function playBattleReplay(namesA, namesB, powerA, powerB, isAWin, weatherData) {
    const logContainer = document.getElementById("battleLogContainer");
    if (!logContainer) return;
    
    logContainer.innerHTML = '';
    
    const logs = [];
    logs.push(`<div class="battle-log-line log-system">Hệ thống mô phỏng chiến đấu khởi động...</div>`);
    if (weatherData) {
        logs.push(`<div class="battle-log-line log-system" style="color:${weatherData.color}">Trạng thái thời tiết: ${weatherData.name} - ${weatherData.description}</div>`);
    }

    const tA = namesA.join(", ") || "Đội A";
    const tB = namesB.join(", ") || "Đội B";
    
    logs.push(`<div class="battle-log-line"><span style="color:#3b82f6;">[${tA}]</span> VS <span style="color:#ef4444;">[${tB}]</span></div>`);
    
    let hpA = powerA * 10;
    let hpB = powerB * 10;
    let turn = 1;

    // Sinh ngẫu nhiên 4-6 lượt
    const totalTurns = 4 + Math.floor(Math.random() * 3);
    for (let i = 1; i <= totalTurns; i++) {
        const attacker = i % 2 !== 0 ? (isAWin ? tA : tB) : (isAWin ? tB : tA);
        const defender = i % 2 !== 0 ? (isAWin ? tB : tA) : (isAWin ? tA : tB);
        
        let dmg = Math.floor((Math.random() * 0.4 + 0.8) * (isAWin ? powerA : powerB) * 2);
        let isCrit = Math.random() < 0.2;
        if (isCrit) dmg = Math.floor(dmg * 1.5);

        let actionLog = `<div class="battle-log-line">Lượt ${i}: <span style="color:#d4af37">${attacker}</span> tung đòn tấn công vào <span style="color:#94a3b8">${defender}</span>, `;
        actionLog += `gây <span class="log-dmg">${dmg} sát thương</span>${isCrit ? ' 💥(Chí mạng)' : ''}!</div>`;
        logs.push(actionLog);

        if (i % 3 === 0) {
            let heal = Math.floor(dmg * 0.5);
            logs.push(`<div class="battle-log-line log-heal">✨ ${attacker} sử dụng kỹ năng phục hồi, lấy lại ${heal} HP.</div>`);
        }
    }

    logs.push(`<div class="battle-log-line">...Trận đấu kết thúc...</div>`);
    logs.push(`<div class="battle-log-line log-winner">🏆 KẾT QUẢ: ${isAWin ? tA : tB} GIÀNH CHIẾN THẮNG!</div>`);

    // In theo kiểu Typewriter
    for (let i = 0; i < logs.length; i++) {
        logContainer.insertAdjacentHTML('beforeend', logs[i]);
        logContainer.scrollTop = logContainer.scrollHeight;
        await new Promise(r => setTimeout(r, 600)); // Nghỉ 0.6s giữa các dòng
    }
}

function renderResult(teamA, teamB, simA, simB, winRateA, winner) {
    const resultContainer = document.getElementById("result");
    resultContainer.innerHTML = `
        <div class="result-box animated fadeIn">
            <h2 class="winner-title">${winner}</h2>
            <div class="battle-stats">
                <div class="stat-side">
                    <h4>TEAM A</h4>
                    <p class="power-val">${simA.power.toFixed(0)}</p>
                    <small>${simA.crit ? "💥 CHÍ MẠNG!" : ""}</small>
                </div>
                <div class="vs-circle">VS</div>
                <div class="stat-side">
                    <h4>TEAM B</h4>
                    <p class="power-val">${simB.power.toFixed(0)}</p>
                    <small>${simB.crit ? "💥 CHÍ MẠNG!" : ""}</small>
                </div>
            </div>
            <div class="win-rate-bar">
                <div class="rate-fill" style="width: ${winRateA * 100}%"></div>
            </div>
            <p>Tỉ lệ thắng Đội A dự đoán: ${(winRateA * 100).toFixed(1)}%</p>
            
            <!-- Typewriter Battle Log -->
            <div id="battleLogContainer" class="battle-log-container" style="margin-top:20px; text-align:left;"></div>
        </div>
    `;
}

// --- TRUY XUẤT DỮ LIỆU ĐỘI ---
function getTeamPower(teamId, enemyTeamId) {
    const selects = document.querySelectorAll(`#${teamId} select`);
    const enemySelects = document.querySelectorAll(`#${enemyTeamId} select`);
    const enemyIds = Array.from(enemySelects).map(s => s.value).filter(v => v !== "");
    
    let total = 0, detail = [];
    selects.forEach(s => {
        const char = findChar(s.value);
        if (char) {
            const p = calcPower(char, enemyIds);
            total += p;
            detail.push(char.name);
        }
    });
    return { total, detail };
}
function applyCombatEffects(power) {
    // GM: Tăng tỉ lệ may mắn
    const crit = Math.random() < 0.20; // 20% chí mạng
    const dodge = Math.random() < 0.15; // 15% né tránh
    
    let final = power;
    if (crit) final *= 1.4;  // Crit tăng 40% sức mạnh
    if (dodge) final *= 1.2; // Dodge cộng thêm 20% lợi thế phòng thủ
    
    return { power: final, crit, dodge };
}
function getWinRate(pA, pB) {
    if (pA <= 0 && pB <= 0) return 0.5;
    if (pA <= 0) return 0.01;
    if (pB <= 0) return 0.99;
    const ratio = pA / pB;
    let winRate = 1 / (1 + Math.pow(Math.E, -3 * (ratio - 1)));
    const noise = (Math.random() * 0.02) - 0.01;
    winRate += noise;

    return Math.max(0.01, Math.min(0.99, winRate));
}
function updateTotalPowerDisplay() {
    const a = getTeamPower("teamA", "teamB");
    const b = getTeamPower("teamB", "teamA");
    if (document.getElementById("powerA")) document.getElementById("powerA").innerText = Math.floor(a.total);
    if (document.getElementById("powerB")) document.getElementById("powerB").innerText = Math.floor(b.total);

    // 2. Cập nhật Thanh dự đoán (Prediction Bar) trên HTML
    const rateA = getWinRate(a.total, b.total);
    const percentA = (rateA * 100).toFixed(1);
    
    // Cập nhật biến CSS --pA trong style inline của HTML
    document.documentElement.style.setProperty('--pA', percentA + '%');

    // 3. Cập nhật nhãn trạng thái
    const label = document.getElementById("rateLabel");
    if (label) {
        if (percentA > 70) label.innerText = "Team A Áp Đảo";
        else if (percentA > 55) label.innerText = "Team A Ưu Thế";
        else if (percentA < 30) label.innerText = "Team B Áp Đảo";
        else if (percentA < 45) label.innerText = "Team B Ưu Thế";
        else label.innerText = "Thế Trận Cân Bằng";
    }
}
function createSlots(id, n) { for(let i=0; i<n; i++) createSelect(id); }
function addSlot(id) { createSelect(id); }

document.addEventListener("DOMContentLoaded", initBattleData);
