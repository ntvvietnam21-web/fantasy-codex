// stats.js - Phiên bản GM (IndexedDB)

let windowCharacters = [];
let char = null;
const charId = new URLSearchParams(window.location.search).get("id");

// ===== KHỞI TẠO DỮ LIỆU =====
async function initStatsPage() {
    try {
        // Nạp toàn bộ nhân vật từ IndexedDB (giống reloadAllData trong app.js)
        if (typeof dbGetAll === "function") {
            windowCharacters = await dbGetAll("characters") || [];
        } else {
            // Fallback nếu chưa nạp imageDB.js
            windowCharacters = JSON.parse(localStorage.getItem("characters")) || [];
        }

        char = windowCharacters.find(c => String(c.id) === String(charId));

        if (!char) {
            document.body.innerHTML = `
                <div style="text-align:center; padding-top: 50px;">
                    <h2 style="color: #ef4444;">❌ Không tìm thấy nhân vật</h2>
                    <button onclick="goBack()" style="padding:10px 20px; cursor:pointer;">Quay lại</button>
                </div>`;
            return;
        }

        // Hiển thị tên nhân vật
        document.getElementById("charName").innerText = "Chỉ số: " + char.name;

        // Nạp chỉ số vào Form
        loadStats();

    } catch (err) {
        console.error("GM Error - initStatsPage:", err);
    }
}

// ===== MẶC ĐỊNH =====
function getDefaultStats() {
    return {
        core: { str: 0, agi: 0, int: 0, vit: 0, spi: 0, luk: 0 },
        vital: { hp: 0, mp: 0, stamina: 0, shield: 0 },
        offense: { atk: 0, matk: 0, critRate: 0, critDmg: 0, pen: 0, atkSpeed: 0, castSpeed: 0 },
        defense: { def: 0, mdef: 0, evasion: 0, block: 0, dmgReduce: 0, resist: 0 }
    };
}
function loadStats() {
    if (!char.stats) {
        char.stats = getDefaultStats();
    }

    const s = char.stats;
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || 0;
    };
    if (s.hidden) {
        setVal("statTalent", s.hidden.talent);
        setVal("statPotential", s.hidden.potential);
        setVal("statFate", s.hidden.fate);
    }

    // CORE
    setVal("str", s.core?.str);
    setVal("agi", s.core?.agi);
    setVal("int", s.core?.int);
    setVal("vit", s.core?.vit);
    setVal("spi", s.core?.spi);
    setVal("luk", s.core?.luk);

    // VITAL
    setVal("hp", s.vital?.hp);
    setVal("mp", s.vital?.mp);
    setVal("stamina", s.vital?.stamina);
    setVal("shield", s.vital?.shield);

    // OFFENSE
    setVal("atk", s.offense?.atk);
    setVal("matk", s.offense?.matk);
    setVal("critRate", s.offense?.critRate);
    setVal("critDmg", s.offense?.critDmg);
    setVal("pen", s.offense?.pen);
    setVal("atkSpeed", s.offense?.atkSpeed);
    setVal("castSpeed", s.offense?.castSpeed);

    // DEFENSE
    setVal("def", s.defense?.def);
    setVal("mdef", s.defense?.mdef);
    setVal("evasion", s.defense?.evasion);
    setVal("block", s.defense?.block);
    setVal("dmgReduce", s.defense?.dmgReduce);
    setVal("resist", s.defense?.resist);
}

// ===== LƯU DỮ LIỆU (INDEXED DB) =====
async function saveStats() {
    const getNum = (id) => {
        const el = document.getElementById(id);
        // Nếu không tìm thấy element (do trang stats.html chưa thêm input), 
        // ta giữ nguyên giá trị cũ của nhân vật thay vì gán bằng 0.
        if (!el) {
            if (id === "statTalent") return char.stats?.hidden?.talent || 0;
            if (id === "statPotential") return char.stats?.hidden?.potential || 0;
            if (id === "statFate") return char.stats?.hidden?.fate || 0;
            return 0;
        }
        return Number(el.value) || 0;
    };

    char.stats = {
        // --- GM: THÊM LƯU NHÓM THIÊN PHÚ ---
        hidden: {
            talent: getNum("statTalent"),
            potential: getNum("statPotential"),
            fate: getNum("statFate")
        },
        core: {
            str: getNum("str"), agi: getNum("agi"), int: getNum("int"),
            vit: getNum("vit"), spi: getNum("spi"), luk: getNum("luk")
        },
        vital: {
            hp: getNum("hp"), mp: getNum("mp"),
            stamina: getNum("stamina"), shield: getNum("shield")
        },
        offense: {
            atk: getNum("atk"), matk: getNum("matk"),
            critRate: getNum("critRate"), critDmg: getNum("critDmg"),
            pen: getNum("pen"), atkSpeed: getNum("atkSpeed"), castSpeed: getNum("castSpeed")
        },
        defense: {
            def: getNum("def"), mdef: getNum("mdef"),
            evasion: getNum("evasion"), block: getNum("block"),
            dmgReduce: getNum("dmgReduce"), resist: getNum("resist")
        }
    };

    try {
        const index = windowCharacters.findIndex(c => String(c.id) === String(charId));
        if (index !== -1) windowCharacters[index] = char;

        if (typeof dbSave === "function") {
            await dbSave("characters", windowCharacters);
            localStorage.setItem("forceRefresh", Date.now()); 
            showToast("💾 GM: Đã cập nhật chỉ số hệ thống!");
        } else {
            localStorage.setItem("characters", JSON.stringify(windowCharacters));
            showToast("✅ Đã lưu (Fallback)");
        }
    } catch (err) {
        console.error("Lỗi lưu Stats:", err);
        alert("Không thể lưu dữ liệu!");
    }
}



// ===== RESET =====
async function resetStats() {
    if (!confirm("GM: Reset toàn bộ chỉ số về 0?")) return;

    char.stats = getDefaultStats();
    loadStats();
    await saveStats();
}

// ===== ĐIỀU HƯỚNG =====
function goBack() {
    // Quay lại trang trước đó, hoặc về index nếu không có lịch sử
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = "index.html";
    }
}

// Chạy khởi tạo khi trang load
document.addEventListener("DOMContentLoaded", initStatsPage);
