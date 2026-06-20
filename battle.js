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
        window.characters = characters; // Export for SkillTreeVortex
        
        // Hỗ trợ lưu dữ liệu từ SkillTreeVortex khi mở ở Battle
        window.saveAndRefresh = async () => {
            if (typeof dbSave === "function") {
                await dbSave("characters", window.characters);
            }
        };
        
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

    // --- LOGIC KHẮC CHẾ VÀ ĐỊA HÌNH ---
    // 3. Khắc chế Địa hình (Terrain Buff/Nerf)
    const terrainEl = document.getElementById("battleTerrain");
    const terrain = terrainEl ? terrainEl.value : "none";
    let terrainBuff = 1.0;
    
    if (terrain === "volcano") {
        if (char.element === "Fire") terrainBuff = 1.2;
        else if (char.element === "Grass" || char.element === "Water") terrainBuff = 0.85; // Nước bay hơi, Cỏ cháy
    } else if (terrain === "ocean") {
        if (char.element === "Water") terrainBuff = 1.25;
        else if (char.element === "Fire") terrainBuff = 0.7;
    } else if (terrain === "forest") {
        if (char.element === "Grass") terrainBuff = 1.2;
        else if (char.element === "Earth") terrainBuff = 0.9;
    } else if (terrain === "holy") {
        if (char.element === "Light") terrainBuff = 1.3;
        else if (char.element === "Dark") terrainBuff = 0.8;
    } else if (terrain === "abyss") {
        if (char.element === "Dark") terrainBuff = 1.3;
        else if (char.element === "Light") terrainBuff = 0.8;
    }

    power *= terrainBuff;

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
    wrapper.className = "slot card-battle";

    const topDiv = document.createElement("div");
    topDiv.className = "card-top";

    const avatar = document.createElement("img");
    avatar.className = "slot-avatar";
    avatar.src = "https://i.imgur.com/6X8FQyA.png";
    avatar.style.cursor = "pointer";
    avatar.title = "Nhấn để xem Bí Thuật";
    avatar.onclick = () => {
        if (select.value && typeof SkillTreeVortex !== "undefined") {
            SkillTreeVortex.open(select.value);
        }
    };

    const select = document.createElement("select");
    select.className = "select-battle select";
    select.innerHTML = `<option value="">-- Chọn Anh Hùng --</option>`;
    
    characters.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `[${c.race || '?'}] ${c.name}`;
        select.appendChild(opt);
    });

    topDiv.append(avatar, select);

    const bottomDiv = document.createElement("div");
    bottomDiv.className = "card-bottom";

    const elemTag = document.createElement("span");
    elemTag.className = "element-tag";
    elemTag.innerText = "Hệ: ---";
    elemTag.style.background = "rgba(255,255,255,0.1)";

    const powerText = document.createElement("div");
    powerText.className = "power-tag";
    powerText.innerText = "0 PL";

    const skillBtn = document.createElement("button");
    skillBtn.innerHTML = '<i class="fa-solid fa-book-journal-whills"></i> Bí Thuật';
    skillBtn.className = "btn-view-skill";
    skillBtn.style.display = "none";
    skillBtn.onclick = () => {
        if (select.value && typeof SkillTreeVortex !== "undefined") {
            SkillTreeVortex.open(select.value);
        }
    };

    bottomDiv.append(elemTag, powerText, skillBtn);

    // Cập nhật thông tin khi chọn
    select.onchange = async () => {
        const char = findChar(select.value);
        if (char) {
            powerText.innerText = Math.floor(calcPower(char)) + " PL";
            skillBtn.style.display = "block";
            
            // Xử lý màu sắc hệ
            const elColors = {
                "Fire": "#ef4444", "Water": "#3b82f6", "Grass": "#10b981",
                "Earth": "#d97706", "Light": "#fbbf24", "Dark": "#8b5cf6"
            };
            const col = elColors[char.element] || "#fff";
            elemTag.innerText = `Hệ: ${char.element || "Vô Hệ"}`;
            elemTag.style.background = col;
            elemTag.style.color = "#fff";

            // Load ảnh
            if (char.img && typeof getImage === "function") {
                const url = (char.img.startsWith("http") || char.img.startsWith("data:")) 
                            ? char.img : await getImage(char.img);
                avatar.src = url || "https://i.imgur.com/6X8FQyA.png";
            }
        } else {
            powerText.innerText = "0 PL";
            elemTag.innerText = "Hệ: ---";
            elemTag.style.background = "rgba(255,255,255,0.1)";
            avatar.src = "https://i.imgur.com/6X8FQyA.png";
            skillBtn.style.display = "none";
        }
        updateTotalPowerDisplay();
    };

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-remove-slot";
    removeBtn.innerHTML = "&times;";
    removeBtn.onclick = () => { wrapper.remove(); updateTotalPowerDisplay(); };

    wrapper.append(removeBtn, topDiv, bottomDiv);
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

    // Chạy Log Turn-based Battle (Truyền danh sách chars thay vì chỉ tên)
    await playBattleReplay(teamA.chars, teamB.chars, simA.power, simB.power, isAWin, weatherData);

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
            battleHistory.push(historyEntry);
            await dbSave("battle_history", battleHistory);
        } catch (e) {
            battleHistory.pop(); // Rollback push on error
            console.warn("⚠️ Không thể lưu lịch sử chiến đấu:", e);
        }
    }
}

/**
 * Phân tích mô tả kỹ năng (AI Parser)
 */
function parseSkillType(desc) {
    if (!desc) return "nuke";
    desc = desc.toLowerCase();
    
    if (desc.match(/(hồi máu|trị liệu|chữa lành|hồi phục|heal|khôi phục)/)) return "heal";
    if (desc.match(/(bảo vệ|khiên|giáp|tăng phòng thủ|giảm sát thương|shield)/)) return "shield";
    if (desc.match(/(toàn bộ|tất cả|diện rộng|mọi kẻ địch|càn quét|nổ tung)/)) return "aoe";
    return "nuke"; // Sát thương đơn mục tiêu
}

const flavorTexts = {
    nuke: ["lao đến vung vũ khí chém mạnh vào", "bất ngờ áp sát đâm một nhát chí mạng vào", "đọc chú ngữ cổ đại phóng luồng năng lượng vào", "bắn ra tia chớp xé toạc không gian trúng"],
    heal: ["niệm chú ánh sáng phục hồi", "truyền sinh khí thánh khiết vào", "sử dụng thảo dược linh thiêng chữa lành cho"],
    shield: ["tạo ra một bức tường ánh sáng bảo vệ", "dựng lên lớp phép thuật kiên cố quanh", "truyền năng lượng phòng ngự cho"],
    death: ["gục ngã trong vũng máu", "tan biến thành những đốm sáng li ti", "nhắm mắt trút hơi thở cuối cùng", "bị thổi bay khỏi đấu trường"],
    dodge: ["nhanh nhẹn lộn nhào né tránh", "tạo ra ảo ảnh lừa gạt đòn tấn công", "lướt đi như một cơn gió vô hình"]
};

function getRandomText(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Hàm sinh log mô phỏng turn-based như tiểu thuyết
 */
async function playBattleReplay(charsA, charsB, powerA, powerB, isAWin, weatherData) {
    const logContainer = document.getElementById("battleLogContainer");
    if (!logContainer) return;
    
    logContainer.innerHTML = '';
    const logs = [];
    
    logs.push(`<div class="battle-log-line log-system">Hệ thống Đấu trường Tối cao khởi động... Kích hoạt màn chắn ma thuật!</div>`);
    
    const terrainEl = document.getElementById("battleTerrain");
    if (terrainEl && terrainEl.value !== "none") {
        logs.push(`<div class="battle-log-line log-system" style="color:var(--gold)">🌍 Địa hình kích hoạt: ${terrainEl.options[terrainEl.selectedIndex].text}</div>`);
    }

    if (weatherData) {
        logs.push(`<div class="battle-log-line log-system" style="color:${weatherData.color}">Trạng thái thời tiết: ${weatherData.name} - ${weatherData.description}</div>`);
    }

    const tA_names = charsA.length > 0 ? charsA.map(c => c.name).join(", ") : "Đội Đỏ";
    const tB_names = charsB.length > 0 ? charsB.map(c => c.name).join(", ") : "Đội Lam";
    
    logs.push(`<div class="battle-log-line"><span style="color:#ef4444; font-weight:bold;">[${tA_names}]</span> tiến vào đấu trường đối đầu với <span style="color:#3b82f6; font-weight:bold;">[${tB_names}]</span>!</div>`);
    
    // Khởi tạo HP
    const initHP = (c) => Math.max(100, Math.floor(calcPower(c, []) * 8));
    let teamA = charsA.map(c => ({...c, team: 'A', maxHp: initHP(c), hp: initHP(c), isDead: false, shield: 0}));
    let teamB = charsB.map(c => ({...c, team: 'B', maxHp: initHP(c), hp: initHP(c), isDead: false, shield: 0}));

    const getAlive = (team) => team.filter(c => !c.isDead);

    // Tính toán số hiệp (Ép đội thua chết hết)
    // Nếu isAWin = true -> team B chết sạch, team A còn ít nhất 1 người
    let turn = 1;
    let battleEnd = false;

    // Tối đa 20 hiệp để tránh lặp vô hạn
    for (let i = 1; i <= 20; i++) {
        let aliveA = getAlive(teamA);
        let aliveB = getAlive(teamB);

        if (aliveA.length === 0 || aliveB.length === 0) {
            battleEnd = true;
            break;
        }

        // Xác định bên tấn công
        // Ưu tiên bên thắng tấn công nhiều hơn
        const isATurn = Math.random() < (isAWin ? 0.65 : 0.35);
        const attackerTeam = isATurn ? aliveA : aliveB;
        const defenderTeam = isATurn ? aliveB : aliveA;

        const attacker = attackerTeam[Math.floor(Math.random() * attackerTeam.length)];
        let attackerCol = isATurn ? "#ef4444" : "#3b82f6";
        let defenderCol = isATurn ? "#3b82f6" : "#ef4444";

        let actionLog = `<div class="battle-log-line">Hiệp ${i}: <span style="color:${attackerCol}; font-weight:bold;">${attacker.name}</span> `;

        // Lấy danh sách customSkills của attacker
        const attackerSkills = attacker.customSkills && attacker.customSkills.length > 0 ? attacker.customSkills : [];
        let isSkill = Math.random() < 0.4 && attackerSkills.length > 0; // 40% dùng skill xịn

        if (isSkill) {
            const skillObj = attackerSkills[Math.floor(Math.random() * attackerSkills.length)];
            let skillName = skillObj.name;
            let skillDesc = skillObj.desc || "";
            let skillType = parseSkillType(skillDesc);
            let tierBonus = skillObj.tier ? parseInt(skillObj.tier) : 1;

            actionLog += `thi triển bí thuật <span class="log-skill">✨ [${skillName}]</span>. `;

            if (skillType === "heal") {
                // Tìm đồng minh thấp máu nhất
                let injuredAlly = attackerTeam.reduce((min, c) => (c.hp / c.maxHp < min.hp / min.maxHp) ? c : min, attackerTeam[0]);
                let healAmt = Math.floor(attacker.maxHp * (0.2 + tierBonus * 0.1));
                injuredAlly.hp = Math.min(injuredAlly.maxHp, injuredAlly.hp + healAmt);
                actionLog += `${getRandomText(flavorTexts.heal)} <span style="color:${attackerCol}">${injuredAlly.name}</span>, <span class="log-heal">hồi phục ${healAmt} HP</span>!</div>`;
                logs.push(actionLog);
                continue;
            } 
            else if (skillType === "shield") {
                // Cấp khiên cho đồng minh
                let ally = attackerTeam[Math.floor(Math.random() * attackerTeam.length)];
                let shieldAmt = Math.floor(attacker.maxHp * (0.15 + tierBonus * 0.1));
                ally.shield += shieldAmt;
                actionLog += `${getRandomText(flavorTexts.shield)} <span style="color:${attackerCol}">${ally.name}</span>, tạo lớp <span style="color:#fbbf24">Khiên hấp thụ ${shieldAmt} ST</span>!</div>`;
                logs.push(actionLog);
                continue;
            }
            else if (skillType === "aoe") {
                actionLog += `Sức mạnh lan tỏa càn quét diện rộng! `;
                let totalDmg = 0;
                defenderTeam.forEach(def => {
                    let dmg = Math.floor((attacker.maxHp * 0.15) * (1 + tierBonus * 0.3));
                    if (def.shield > 0) {
                        if (def.shield >= dmg) { def.shield -= dmg; dmg = 0; }
                        else { dmg -= def.shield; def.shield = 0; }
                    }
                    def.hp -= dmg;
                    totalDmg += dmg;
                });
                actionLog += `Gây <span class="log-dmg">Tổng cộng ${totalDmg} sát thương</span> lên toàn bộ kẻ địch!</div>`;
                logs.push(actionLog);
                
                // Ký nhận tử vong
                defenderTeam.forEach(def => {
                    if (def.hp <= 0 && !def.isDead) {
                        def.isDead = true;
                        logs.push(`<div class="battle-log-line log-system">💀 <span style="color:${defenderCol}">${def.name}</span> ${getRandomText(flavorTexts.death)}!</div>`);
                    }
                });
                continue;
            }
            else {
                // Nuke
                let defender = defenderTeam[Math.floor(Math.random() * defenderTeam.length)];
                let dmg = Math.floor((attacker.maxHp * 0.3) * (1 + tierBonus * 0.4));
                let isCrit = Math.random() < 0.3;
                if (isCrit) dmg = Math.floor(dmg * 2);

                if (Math.random() < 0.1) {
                    actionLog += `Nhưng <span style="color:${defenderCol}">${defender.name}</span> đã <span class="log-dodge">${getRandomText(flavorTexts.dodge)}</span>!</div>`;
                } else {
                    if (defender.shield > 0) {
                        actionLog += `(Phá vỡ khiên ${defender.shield}) `;
                        if (defender.shield >= dmg) { defender.shield -= dmg; dmg = 0; }
                        else { dmg -= defender.shield; defender.shield = 0; }
                    }
                    defender.hp -= dmg;
                    actionLog += `${getRandomText(flavorTexts.nuke)} <span style="color:${defenderCol}">${defender.name}</span>, gây <span class="log-dmg">${dmg} sát thương</span>${isCrit ? ' <span class="log-crit">💥(BẠO KÍCH)</span>' : ''}!</div>`;
                }
                logs.push(actionLog);

                if (defender.hp <= 0 && !defender.isDead) {
                    defender.isDead = true;
                    logs.push(`<div class="battle-log-line log-system">💀 <span style="color:${defenderCol}">${defender.name}</span> ${getRandomText(flavorTexts.death)}!</div>`);
                }
                continue;
            }
        } 
        else {
            // Đánh thường
            let defender = defenderTeam[Math.floor(Math.random() * defenderTeam.length)];
            let dmg = Math.floor(attacker.maxHp * 0.2 * (Math.random() * 0.5 + 0.8));
            let isCrit = Math.random() < 0.15;
            if (isCrit) dmg = Math.floor(dmg * 1.5);

            actionLog += `${getRandomText(flavorTexts.nuke)} <span style="color:${defenderCol}">${defender.name}</span>. `;

            if (Math.random() < 0.15) {
                actionLog += `<span style="color:${defenderCol}">${defender.name}</span> <span class="log-dodge">${getRandomText(flavorTexts.dodge)}</span>!</div>`;
            } else {
                if (defender.shield > 0) {
                    if (defender.shield >= dmg) { defender.shield -= dmg; dmg = 0; }
                    else { dmg -= defender.shield; defender.shield = 0; }
                }
                defender.hp -= dmg;
                actionLog += `Gây <span class="log-dmg">${dmg} sát thương</span>${isCrit ? ' <span class="log-crit">💥(BẠO)</span>' : ''}!</div>`;
            }
            logs.push(actionLog);

            if (defender.hp <= 0 && !defender.isDead) {
                defender.isDead = true;
                logs.push(`<div class="battle-log-line log-system">💀 <span style="color:${defenderCol}">${defender.name}</span> ${getRandomText(flavorTexts.death)}!</div>`);
            }
        }
    }

    let endText = isAWin ? "QUÂN ĐOÀN ĐỎ" : "CHIẾN BINH LAM";
    // Đảm bảo team thua chết sạch nếu bị cắt ngang vòng lặp
    let aliveA = getAlive(teamA);
    let aliveB = getAlive(teamB);
    if (!battleEnd) {
        if (isAWin) {
            aliveB.forEach(d => logs.push(`<div class="battle-log-line log-system">💀 <span style="color:#3b82f6">${d.name}</span> kiệt sức và gục ngã!</div>`));
        } else {
            aliveA.forEach(d => logs.push(`<div class="battle-log-line log-system">💀 <span style="color:#ef4444">${d.name}</span> kiệt sức và gục ngã!</div>`));
        }
    }

    logs.push(`<div class="battle-log-line">...Bụi mù tan biến, trận chiến ngã ngũ...</div>`);
    logs.push(`<div class="battle-log-line log-winner">🏆 KẾT QUẢ TỐI CHUNG: ${endText} XƯNG BÁ ĐẤU TRƯỜNG!</div>`);

    // In theo kiểu Typewriter (cuộn dần)
    for (let i = 0; i < logs.length; i++) {
        logContainer.insertAdjacentHTML('beforeend', logs[i]);
        logContainer.scrollTop = logContainer.scrollHeight;
        await new Promise(r => setTimeout(r, 450)); // Nghỉ 0.45s giữa các dòng
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
    
    let total = 0, detail = [], chars = [];
    selects.forEach(s => {
        const char = findChar(s.value);
        if (char) {
            const p = calcPower(char, enemyIds);
            total += p;
            detail.push(char.name);
            chars.push(char); // Lấy object nhân vật thật để dùng customSkills
        }
    });
    return { total, detail, chars };
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
        if (+percentA > 70) label.innerText = "Team A Áp Đảo";
        else if (+percentA > 55) label.innerText = "Team A Ưu Thế";
        else if (+percentA < 30) label.innerText = "Team B Áp Đảo";
        else if (+percentA < 45) label.innerText = "Team B Ưu Thế";
        else label.innerText = "Thế Trận Cân Bằng";
    }
}
function createSlots(id, n) { for(let i=0; i<n; i++) createSelect(id); }
function addSlot(id) { createSelect(id); }

document.addEventListener("DOMContentLoaded", initBattleData);
