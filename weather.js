/* ============================================================
   FANTASY CODEX PRO — WEATHER.JS
   Nhóm 3.3: Hệ thống Thời tiết & Mùa vụ Động
   Mỗi khu vực có thời tiết ngẫu nhiên, ảnh hưởng buff/debuff khi chiến đấu
   ============================================================ */

// ============================================================
// DỮ LIỆU THỜI TIẾT — Định nghĩa tất cả loại thời tiết và hiệu ứng
// ============================================================

/**
 * Bảng tra cứu toàn bộ loại thời tiết
 * Mỗi loại gồm: tên, icon, mô tả, buff/debuff cho các chỉ số
 */
const WEATHER_TYPES = {
    // Thời tiết thuận lợi (buff)
    sunny: {
        name: 'Nắng rực rỡ',
        icon: '☀️',
        rarity: 'common',
        color: '#f59e0b',
        description: 'Ánh nắng chan hòa tiếp thêm sinh lực cho chiến binh.',
        buffs: { atk: 10, agi: 8, stamina: 15 },
        debuffs: {}
    },
    dawn: {
        name: 'Bình minh huyền bí',
        icon: '🌅',
        rarity: 'uncommon',
        color: '#f97316',
        description: 'Luồng linh khí buổi sáng giúp tăng cường ma pháp.',
        buffs: { matk: 15, spi: 12, mp: 20 },
        debuffs: {}
    },
    magic_wind: {
        name: 'Gió Ma Thuật',
        icon: '🌀',
        rarity: 'rare',
        color: '#8b5cf6',
        description: 'Cơn gió mang theo linh khí cổ đại, khuếch đại sức mạnh tiềm ẩn.',
        buffs: { matk: 20, spi: 15, evasion: 10 },
        debuffs: { def: -5 }
    },
    sacred_rain: {
        name: 'Mưa Thánh Linh',
        icon: '✨',
        rarity: 'rare',
        color: '#06b6d4',
        description: 'Những giọt mưa thánh khôi phục sinh lực và thanh tẩy tổn thương.',
        buffs: { hp: 30, mp: 25, mdef: 15 },
        debuffs: { atk: -8 }
    },
    full_moon: {
        name: 'Trăng Huyết Rằm',
        icon: '🌕',
        rarity: 'epic',
        color: '#c4b5fd',
        description: 'Ánh trăng đỏ thắm khơi dậy bản năng sát thương nguyên thủy.',
        buffs: { atk: 25, critRate: 20, critDmg: 30 },
        debuffs: { mdef: -10 }
    },

    // Thời tiết bất lợi (debuff)
    rain: {
        name: 'Mưa tầm tã',
        icon: '🌧️',
        rarity: 'common',
        color: '#64748b',
        description: 'Mưa dày làm giảm tầm nhìn và làm ướt áo giáp.',
        buffs: {},
        debuffs: { atk: -8, agi: -10, atkSpeed: -10 }
    },
    blizzard: {
        name: 'Bão Tuyết Tàn Khốc',
        icon: '🌨️',
        rarity: 'uncommon',
        color: '#93c5fd',
        description: 'Bão tuyết gào thét từng cơn, đóng băng chân tay chiến binh.',
        buffs: {},
        debuffs: { agi: -20, atkSpeed: -15, evasion: -15, stamina: -20 }
    },
    scorching: {
        name: 'Nắng Gắt Sa Mạc',
        icon: '🔥',
        rarity: 'uncommon',
        color: '#ef4444',
        description: 'Sức nóng thiêu đốt hút cạn sức lực và tiêu hao tập trung.',
        buffs: { atk: 5 },
        debuffs: { hp: -20, stamina: -25, mp: -15 }
    },
    fog: {
        name: 'Sương Mù Ảo Giác',
        icon: '🌫️',
        rarity: 'uncommon',
        color: '#94a3b8',
        description: 'Màn sương huyền hoặc làm lẫn lộn các giác quan và giảm chính xác.',
        buffs: { evasion: 15 },
        debuffs: { atk: -15, critRate: -20, pen: -10 }
    },
    storm: {
        name: 'Cuồng Phong Sấm Sét',
        icon: '⛈️',
        rarity: 'rare',
        color: '#7c3aed',
        description: 'Sét đánh liên hồi, năng lượng điện làm tê liệt cơ thể.',
        buffs: { matk: 10 },
        debuffs: { agi: -25, block: -20, stamina: -30 }
    },
    curse_mist: {
        name: 'Sương Nguyền Rủa Cổ Đại',
        icon: '☠️',
        rarity: 'epic',
        color: '#10b981',
        description: 'Sương độc từ vùng đất chết, làm suy yếu mọi khả năng sinh lực.',
        buffs: {},
        debuffs: { hp: -40, mp: -30, vit: -20, spi: -15 }
    }
};

// Trọng số xác suất xuất hiện theo độ hiếm
const WEATHER_RARITY_WEIGHTS = {
    common: 40,
    uncommon: 30,
    rare: 20,
    epic: 10
};

// Trạng thái thời tiết hiện tại theo locationId
const _weatherState = {};

// ============================================================
// CORE FUNCTIONS — Tạo và quản lý thời tiết
// ============================================================

/**
 * Tạo thời tiết ngẫu nhiên có trọng số cho một khu vực
 * Khu vực đã có thời tiết sẽ giữ nguyên đến khi reset
 * @param {string} locationId - ID khu vực địa điểm
 * @param {boolean} forceNew - Bắt buộc tạo thời tiết mới
 * @returns {Object} Đối tượng thời tiết
 */
window.generateWeather = function(locationId = 'default', forceNew = false) {
    // Nếu đã có thời tiết và không cần reset → trả về cái cũ
    if (_weatherState[locationId] && !forceNew) {
        return _weatherState[locationId];
    }

    // Tạo pool xác suất có trọng số
    const pool = [];
    Object.entries(WEATHER_TYPES).forEach(([key, weather]) => {
        const weight = WEATHER_RARITY_WEIGHTS[weather.rarity] || 10;
        for (let i = 0; i < weight; i++) pool.push(key);
    });

    // Chọn ngẫu nhiên từ pool
    const selectedKey = pool[Math.floor(Math.random() * pool.length)];
    const weather = { ...WEATHER_TYPES[selectedKey], id: selectedKey, locationId, generatedAt: Date.now() };

    _weatherState[locationId] = weather;
    return weather;
};

/**
 * Lấy thời tiết hiện tại của khu vực (tạo mới nếu chưa có)
 * @param {string} locationId - ID khu vực
 * @returns {Object} Đối tượng thời tiết
 */
window.getCurrentWeather = function(locationId = 'default') {
    return _weatherState[locationId] || window.generateWeather(locationId);
};

/**
 * Áp dụng buff/debuff thời tiết vào stats nhân vật
 * Trả về stats đã được điều chỉnh (KHÔNG thay đổi object gốc)
 * @param {string} weatherId - ID loại thời tiết
 * @param {Object} baseStats - Chỉ số gốc của nhân vật {atk, def, ...}
 * @returns {Object} {adjustedStats, buffsApplied, debuffsApplied}
 */
window.getWeatherBuffs = function(weatherId, baseStats = {}) {
    const weather = WEATHER_TYPES[weatherId];
    if (!weather) return { adjustedStats: { ...baseStats }, buffsApplied: [], debuffsApplied: [] };

    const adjustedStats = { ...baseStats };
    const buffsApplied = [];
    const debuffsApplied = [];

    // Áp dụng buffs (tăng chỉ số)
    Object.entries(weather.buffs).forEach(([stat, value]) => {
        if (adjustedStats[stat] !== undefined) {
            adjustedStats[stat] = Math.max(0, (adjustedStats[stat] || 0) + value);
            buffsApplied.push(`+${value} ${stat.toUpperCase()}`);
        } else {
            adjustedStats[stat] = value;
            buffsApplied.push(`+${value} ${stat.toUpperCase()}`);
        }
    });

    // Áp dụng debuffs (giảm chỉ số)
    Object.entries(weather.debuffs).forEach(([stat, value]) => {
        // value là số âm
        const change = Math.abs(value);
        adjustedStats[stat] = Math.max(0, (adjustedStats[stat] || 0) + value);
        debuffsApplied.push(`${value} ${stat.toUpperCase()}`);
    });

    return { adjustedStats, buffsApplied, debuffsApplied };
};

/**
 * Làm phẳng stats nhân vật thành một object key:value đơn giản
 * Để dễ áp dụng weather buff/debuff
 * @param {Object} char - Object nhân vật đầy đủ
 * @returns {Object} Flat stats object
 */
window.flattenCharStats = function(char) {
    const s = char.stats || {};
    return {
        str: s.core?.str || 0,
        agi: s.core?.agi || 0,
        int: s.core?.int || 0,
        vit: s.core?.vit || 0,
        spi: s.core?.spi || 0,
        luk: s.core?.luk || 0,
        hp: s.vital?.hp || 100,
        mp: s.vital?.mp || 50,
        stamina: s.vital?.stamina || 100,
        shield: s.vital?.shield || 0,
        atk: s.offense?.atk || 0,
        matk: s.offense?.matk || 0,
        critRate: s.offense?.critRate || 5,
        critDmg: s.offense?.critDmg || 150,
        pen: s.offense?.pen || 0,
        atkSpeed: s.offense?.atkSpeed || 100,
        castSpeed: s.offense?.castSpeed || 100,
        def: s.defense?.def || 0,
        mdef: s.defense?.mdef || 0,
        evasion: s.defense?.evasion || 0,
        block: s.defense?.block || 0,
        dmgReduce: s.defense?.dmgReduce || 0,
        resist: s.defense?.resist || 0,
    };
};

// ============================================================
// UI RENDERING — Hiển thị widget thời tiết
// ============================================================

/**
 * Render widget thời tiết vào một container
 * @param {string} locationId - ID khu vực
 * @param {string} containerId - ID DOM container
 * @param {boolean} showBuffs - Có hiển thị buff/debuff chi tiết không
 */
window.renderWeatherWidget = function(locationId, containerId, showBuffs = true) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const weather = window.getCurrentWeather(locationId);
    const hasBuff = Object.keys(weather.buffs).length > 0;
    const hasDebuff = Object.keys(weather.debuffs).length > 0;

    const buffText = Object.entries(weather.buffs)
        .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
        .join(', ');

    const debuffText = Object.entries(weather.debuffs)
        .map(([k, v]) => `${v} ${k.toUpperCase()}`)
        .join(', ');

    container.innerHTML = `
        <div class="weather-widget" style="border-color:${weather.color}20;background:${weather.color}08;">
            <span class="weather-icon">${weather.icon}</span>
            <div>
                <div style="font-weight:600;color:${weather.color};font-size:0.88rem;">${weather.name}</div>
                <div style="font-size:0.72rem;color:#64748b;margin-top:2px;">${weather.description}</div>
                ${showBuffs ? `
                    <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
                        ${hasBuff ? `<span class="weather-buff-badge weather-buff">▲ ${buffText}</span>` : ''}
                        ${hasDebuff ? `<span class="weather-buff-badge weather-debuff">▼ ${debuffText}</span>` : ''}
                    </div>
                ` : ''}
            </div>
            <button onclick="window.generateWeather('${locationId}', true); window.renderWeatherWidget('${locationId}', '${containerId}', ${showBuffs});"
                    style="background:none;border:none;color:#64748b;cursor:pointer;padding:4px 8px;border-radius:6px;font-size:0.75rem;"
                    title="Thay đổi thời tiết">🎲</button>
        </div>
    `;
};

/**
 * Render selector thời tiết thủ công (dùng trong battle setup)
 * @param {string} containerId - ID container
 * @param {string} locationId - ID khu vực mặc định
 */
window.renderWeatherSelector = function(containerId, locationId = 'battle') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Tạo thời tiết nếu chưa có
    window.getCurrentWeather(locationId);

    const current = _weatherState[locationId];

    container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <label style="font-size:0.78rem;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">🌦 Thời tiết chiến trường</label>
                <button onclick="window.generateWeather('${locationId}',true);window.renderWeatherSelector('${containerId}','${locationId}');"
                        style="font-size:0.72rem;padding:4px 10px;border-radius:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;cursor:pointer;">
                    🎲 Ngẫu nhiên
                </button>
            </div>
            <div class="weather-widget" style="border-color:${current.color}30;background:${current.color}08;">
                <span style="font-size:2rem;">${current.icon}</span>
                <div style="flex:1;">
                    <div style="font-weight:600;color:${current.color};">${current.name}</div>
                    <div style="font-size:0.72rem;color:#64748b;margin-top:2px;">${current.description}</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.75rem;">
                ${Object.entries(current.buffs).map(([k, v]) => `
                    <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:6px;padding:5px 8px;color:#10b981;">▲ +${v} ${k.toUpperCase()}</div>
                `).join('')}
                ${Object.entries(current.debuffs).map(([k, v]) => `
                    <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:5px 8px;color:#ef4444;">▼ ${v} ${k.toUpperCase()}</div>
                `).join('')}
            </div>
            <!-- Chọn thủ công -->
            <select onchange="window._weatherState['${locationId}']=WEATHER_TYPES[this.value]?{...WEATHER_TYPES[this.value],id:this.value}:window._weatherState['${locationId}'];window.renderWeatherSelector('${containerId}','${locationId}');"
                    style="padding:8px;border-radius:8px;background:#0f172a;border:1px solid rgba(255,255,255,0.1);color:#f1f5f9;font-size:0.85rem;">
                <option value="">-- Chọn thủ công --</option>
                ${Object.entries(WEATHER_TYPES).map(([key, w]) =>
                    `<option value="${key}" ${current.id === key ? 'selected' : ''}>${w.icon} ${w.name} (${w.rarity})</option>`
                ).join('')}
            </select>
        </div>
    `;
};

// Expose WEATHER_TYPES và _weatherState để battle.js dùng
window.WEATHER_TYPES = WEATHER_TYPES;
window._weatherState = _weatherState;

console.log('🌦 weather.js: Đã tải hệ thống Thời tiết & Mùa vụ Động');
