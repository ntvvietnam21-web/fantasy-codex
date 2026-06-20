/* ============================================================
   FANTASY CODEX PRO — FEATURES.JS
   Nhóm 1: Character Card Export, Chronology, Family Tree
   Nhóm 4: Backstory Generator, World Dashboard
   ============================================================ */

// ============================================================
// NHÓM 1.1 — XUẤT THẺ NHÂN VẬT (CHARACTER CARD EXPORT)
// Dùng html2canvas để chụp thẻ nhân vật → tải về PNG
// ============================================================

/**
 * Tải html2canvas từ CDN theo kiểu lazy (chỉ khi cần dùng lần đầu)
 * Tránh làm chậm trang khi khởi động
 */
async function loadHtml2Canvas() {
    if (window.html2canvas) return window.html2canvas;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = () => resolve(window.html2canvas);
        script.onerror = () => reject(new Error('Không thể tải html2canvas'));
        document.head.appendChild(script);
    });
}

/**
 * Xây dựng HTML của thẻ nhân vật để render
 * @param {Object} char - Đối tượng nhân vật
 * @param {string} imgSrc - URL ảnh đã giải mã (base64 hoặc URL)
 * @returns {string} HTML string của thẻ export
 */
function buildExportCardHTML(char, imgSrc) {
    // Lấy các chỉ số quan trọng để hiển thị
    const stats = char.stats || {};
    const core = stats.core || {};
    const offense = stats.offense || {};
    const defense = stats.defense || {};

    return `
    <div class="export-card" id="exportCardInner" style="font-family:'Plus Jakarta Sans',sans-serif; width:400px;">
        <div class="ec-header" style="position:relative; height:140px; overflow:hidden; background:linear-gradient(135deg,#0f172a,#1e3a5f);">
            <img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;opacity:0.35;" crossorigin="anonymous">
            <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent,rgba(10,14,26,0.8));"></div>
            <img src="${imgSrc}" class="ec-avatar" style="position:absolute;bottom:-30px;left:20px;width:80px;height:80px;border-radius:12px;border:3px solid #d4af37;object-fit:cover;box-shadow:0 4px 20px rgba(0,0,0,0.5);" crossorigin="anonymous">
            <!-- Rank badge -->
            <div style="position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.6);border:1px solid rgba(212,175,55,0.5);border-radius:8px;padding:4px 10px;font-size:0.75rem;color:#d4af37;font-weight:bold;">
                ${char.rank || char.pl ? `PL: ${char.pl || '???'}` : 'Fantasy Codex'}
            </div>
        </div>
        <div class="ec-body" style="padding:44px 20px 16px;background:linear-gradient(145deg,#0a0e1a,#111827);">
            <div class="ec-name" style="font-family:'Cinzel',serif;font-size:1.4rem;color:#d4af37;margin-bottom:2px;">${char.name || 'Không tên'}</div>
            <div class="ec-sub" style="font-size:0.78rem;color:#94a3b8;margin-bottom:12px;">
                ${[char.race, char.job, char.faction].filter(Boolean).join(' · ')}
            </div>
            <!-- Chỉ số cốt lõi -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;">
                ${[
                    ['STR', core.str || 0],
                    ['AGI', core.agi || 0],
                    ['INT', core.int || 0],
                    ['VIT', core.vit || 0],
                    ['ATK', offense.atk || 0],
                    ['DEF', defense.def || 0],
                ].map(([k, v]) => `
                    <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:8px;text-align:center;border:1px solid rgba(255,255,255,0.07);">
                        <div style="font-size:1.05rem;font-weight:700;color:#f1f5f9;">${v}</div>
                        <div style="font-size:0.62rem;color:#64748b;text-transform:uppercase;margin-top:2px;">${k}</div>
                    </div>
                `).join('')}
            </div>
            <!-- Mô tả ngắn -->
            ${char.personality ? `<div style="margin-top:14px;font-size:0.78rem;color:#64748b;font-style:italic;line-height:1.5;border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;">"${char.personality.slice(0, 100)}${char.personality.length > 100 ? '...' : ''}"</div>` : ''}
        </div>
        <div class="ec-footer" style="background:rgba(212,175,55,0.06);border-top:1px solid rgba(212,175,55,0.15);padding:10px 20px;display:flex;justify-content:space-between;align-items:center;font-size:0.68rem;color:#475569;">
            <span><i>⚔</i> Fantasy Codex Pro</span>
            <span>${new Date().toLocaleDateString('vi-VN')}</span>
        </div>
    </div>`;
}

/**
 * Hàm chính: Xuất thẻ nhân vật ra file PNG
 * @param {string} charId - ID nhân vật cần xuất
 */
window.exportCharacterCard = async function(charId) {
    const char = window.characters?.find(c => String(c.id) === String(charId));
    if (!char) return showToast('⚠️ Không tìm thấy nhân vật!', 'error');

    showToast('⏳ Đang tạo thẻ nhân vật...', 'info');

    try {
        // 1. Tải html2canvas nếu chưa có
        await loadHtml2Canvas();

        // 2. Lấy ảnh nhân vật (hỗ trợ IndexedDB blob và URL)
        let imgSrc = 'https://i.imgur.com/6X8FQyA.png';
        if (char.img) {
            if (char.img.startsWith('http') || char.img.startsWith('data:')) {
                imgSrc = char.img;
            } else if (typeof getImage === 'function') {
                const stored = await getImage(char.img).catch(() => null);
                if (stored) imgSrc = stored;
            }
        }

        // 3. Tạo container ẩn để render thẻ
        let wrapper = document.getElementById('exportCardCanvas');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'exportCardCanvas';
            // Đặt ngoài màn hình nhưng vẫn visible để html2canvas chụp được
            wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
            document.body.appendChild(wrapper);
        }
        wrapper.innerHTML = buildExportCardHTML(char, imgSrc);

        const cardEl = document.getElementById('exportCardInner');

        // 4. Chụp bằng html2canvas với scale:2 (Retina) và useCORS:true
        const canvas = await window.html2canvas(cardEl, {
            scale: 2,           // Chất lượng cao gấp đôi (Retina/mobile)
            useCORS: true,      // Cho phép ảnh từ Imgur không bị lỗi CORS
            backgroundColor: null,
            logging: false,
            allowTaint: false,
        });

        // 5. Tải file PNG về máy
        const link = document.createElement('a');
        link.download = `${char.name || 'character'}_card.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        showToast(`✅ Đã xuất thẻ: ${char.name}`, 'success');
        wrapper.innerHTML = '';

    } catch (err) {
        console.error('❌ Lỗi xuất thẻ:', err);
        showToast('❌ Không thể xuất thẻ nhân vật!', 'error');
    }
};

// ============================================================
// NHÓM 1.2 — NHẬT KÝ NHÂN VẬT (CHRONICLE TIMELINE)
// Mảng `chronology` trong object nhân vật: [{date, event, type}]
// ============================================================

/**
 * Render dòng thời gian cuộc đời nhân vật
 * @param {string} charId - ID nhân vật
 * @param {string} containerId - ID element sẽ render vào
 */
window.renderChronologyTimeline = function(charId, containerId) {
    const char = window.characters?.find(c => String(c.id) === String(charId));
    const container = document.getElementById(containerId);
    if (!char || !container) return;

    // Khởi tạo mảng nếu nhân vật cũ chưa có (backward compatible)
    if (!Array.isArray(char.chronology)) char.chronology = [];

    const entries = char.chronology;

    // Biểu tượng theo loại sự kiện
    const typeIcons = {
        birth: '🌅',
        join: '⚔️',
        battle: '🔥',
        levelup: '⬆️',
        death: '💀',
        love: '❤️',
        discovery: '🔮',
        other: '📜'
    };

    // Màu sắc theo loại sự kiện
    const typeColors = {
        birth: '#10b981',
        join: '#6366f1',
        battle: '#ef4444',
        levelup: '#f59e0b',
        death: '#475569',
        love: '#ec4899',
        discovery: '#8b5cf6',
        other: '#94a3b8'
    };

    container.innerHTML = `
        <div class="chronicle-timeline">
            ${entries.length === 0
                ? `<p style="color:#475569;font-style:italic;padding:10px 0;">Chưa có sự kiện nào được ghi chép.</p>`
                : entries.map((e, idx) => `
                    <div class="chronicle-entry" style="animation-delay:${idx * 0.08}s">
                        <div class="entry-date">${typeIcons[e.type] || '📜'} ${e.date || 'Không rõ năm'}</div>
                        <div class="entry-content" style="border-left: 3px solid ${typeColors[e.type] || '#94a3b8'};">
                            ${e.event}
                        </div>
                    </div>
                `).join('')}
            <button class="chronicle-add-btn" onclick="openAddChronicleModal('${charId}')">
                <i class="fa-solid fa-plus"></i> Thêm sự kiện
            </button>
        </div>
    `;
};

/**
 * Mở modal thêm sự kiện nhật ký
 * @param {string} charId - ID nhân vật
 */
window.openAddChronicleModal = function(charId) {
    // Tạo modal động nếu chưa có
    let modal = document.getElementById('chronicleModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'chronicleModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:9000;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div style="background:#111827;border:1px solid rgba(212,175,55,0.3);border-radius:16px;padding:24px;width:min(480px,90vw);max-height:90vh;overflow-y:auto;">
                <h3 style="color:#d4af37;font-family:'Cinzel',serif;margin-bottom:16px;"><i class="fa-solid fa-scroll"></i> Ghi Chép Sự Kiện</h3>
                <div style="display:flex;flex-direction:column;gap:12px;">
                    <input id="chrDate" placeholder="Năm/Thời kỳ (VD: Năm 305, Kỷ Bóng Tối)" style="padding:10px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#f1f5f9;font-size:0.9rem;">
                    <select id="chrType" style="padding:10px;border-radius:8px;background:#0f172a;border:1px solid rgba(255,255,255,0.1);color:#f1f5f9;font-size:0.9rem;">
                        <option value="other">📜 Khác</option>
                        <option value="birth">🌅 Chào đời</option>
                        <option value="join">⚔️ Gia nhập tổ chức</option>
                        <option value="battle">🔥 Tham chiến</option>
                        <option value="levelup">⬆️ Thăng cấp / Đột phá</option>
                        <option value="death">💀 Qua đời</option>
                        <option value="love">❤️ Tình duyên</option>
                        <option value="discovery">🔮 Khám phá / Sự kiện bí ẩn</option>
                    </select>
                    <textarea id="chrEvent" rows="3" placeholder="Mô tả sự kiện..." style="padding:10px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#f1f5f9;font-size:0.9rem;resize:vertical;"></textarea>
                </div>
                <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
                    <button onclick="document.getElementById('chronicleModal').remove()" style="padding:9px 18px;border-radius:8px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;cursor:pointer;">Hủy</button>
                    <button id="chrSaveBtn" style="padding:9px 18px;border-radius:8px;background:#d4af37;border:none;color:#0f172a;font-weight:600;cursor:pointer;"><i class="fa-solid fa-save"></i> Lưu</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    modal.style.display = 'flex';

    // Xử lý lưu
    document.getElementById('chrSaveBtn').onclick = async () => {
        const date = document.getElementById('chrDate').value.trim();
        const type = document.getElementById('chrType').value;
        const event = document.getElementById('chrEvent').value.trim();

        if (!event) return showToast('⚠️ Vui lòng nhập nội dung sự kiện!', 'error');

        const char = window.characters?.find(c => String(c.id) === String(charId));
        if (!char) return;

        if (!Array.isArray(char.chronology)) char.chronology = [];
        char.chronology.push({ date, type, event, createdAt: Date.now() });

        // Lưu vào IndexedDB
        if (typeof dbSave === 'function' && typeof dbGetAll === 'function') {
            const allChars = await dbGetAll('characters') || [];
            const idx = allChars.findIndex(c => String(c.id) === String(charId));
            if (idx >= 0) allChars[idx] = char;
            else allChars.push(char);
            await dbSave('characters', allChars);
        }

        modal.remove();
        showToast('📜 Đã ghi chép sự kiện!', 'success');

        // Render lại nếu container đang hiển thị
        const containers = ['profileChronicle', 'charChronicle'];
        containers.forEach(id => {
            if (document.getElementById(id)) {
                renderChronologyTimeline(charId, id);
            }
        });
    };
};

// ============================================================
// NHÓM 1.3 — CÂY GIA PHẢ (FAMILY TREE)
// Render sơ đồ cha/mẹ → nhân vật → con cái bằng CSS thuần
// ============================================================

/**
 * Render cây gia phả cho nhân vật
 * @param {string} charId - ID nhân vật trung tâm
 * @param {string} containerId - Container để render vào
 */
window.renderFamilyTree = async function(charId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const chars = window.characters || [];
    const char = chars.find(c => String(c.id) === String(charId));
    if (!char) return;

    // Hàm lấy ảnh nhanh (với fallback)
    const getImgSrc = async (c) => {
        if (!c.img) return 'https://i.imgur.com/6X8FQyA.png';
        if (c.img.startsWith('http') || c.img.startsWith('data:')) return c.img;
        if (typeof getImage === 'function') {
            return (await getImage(c.img).catch(() => null)) || 'https://i.imgur.com/6X8FQyA.png';
        }
        return 'https://i.imgur.com/6X8FQyA.png';
    };

    // Hàm tạo node HTML của một nhân vật trong cây
    const buildNode = async (c, label = '') => {
        const imgSrc = await getImgSrc(c);
        return `
            <div class="ft-node" onclick="if(typeof openProfile==='function') openProfile('${c.id}')" title="${c.name}">
                ${label ? `<div style="font-size:0.65rem;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${label}</div>` : ''}
                <img src="${imgSrc}" alt="${c.name}" crossorigin="anonymous">
                <div class="ft-name">${c.name}</div>
                <div style="font-size:0.65rem;color:#64748b;">${c.race || ''}</div>
            </div>
        `;
    };

    container.innerHTML = '<div style="color:#64748b;text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang dựng cây gia phả...</div>';

    // Lấy cha/mẹ (từ field relations với type chứa "cha" hoặc "mẹ")
    const parents = [];
    if (Array.isArray(char.relations)) {
        for (const rel of char.relations) {
            const relType = (rel.type || '').toLowerCase();
            if (relType.includes('cha') || relType.includes('mẹ') || relType.includes('ba') || relType.includes('mother') || relType.includes('father')) {
                const parent = chars.find(c => c.id === rel.targetId);
                if (parent) parents.push({ char: parent, label: rel.type });
            }
        }
    }

    // Lấy anh/chị/em (siblings)
    const siblings = [];
    if (Array.isArray(char.relations)) {
        for (const rel of char.relations) {
            const relType = (rel.type || '').toLowerCase();
            if (relType.includes('anh') || relType.includes('chị') || relType.includes('em') || relType.includes('sibling')) {
                const sibling = chars.find(c => c.id === rel.targetId);
                if (sibling) siblings.push({ char: sibling, label: rel.type });
            }
        }
    }

    // Lấy con cái (tìm các nhân vật có quan hệ "cha/mẹ" trỏ ngược về nhân vật hiện tại)
    const children = [];
    for (const other of chars) {
        if (other.id === char.id) continue;
        if (Array.isArray(other.relations)) {
            for (const rel of other.relations) {
                if (rel.targetId === char.id) {
                    const relType = (rel.type || '').toLowerCase();
                    if (relType.includes('cha') || relType.includes('mẹ') || relType.includes('ba') || relType.includes('mother') || relType.includes('father')) {
                        children.push({ char: other, label: 'Con' });
                        break;
                    }
                }
            }
        }
    }

    // Build HTML
    let html = '<div class="family-tree-container"><div class="family-tree">';

    // Hàng cha mẹ
    if (parents.length > 0) {
        html += '<div class="ft-generation">';
        for (const p of parents) {
            html += await buildNode(p.char, p.label);
        }
        html += '</div>';
        // Đường kết nối dọc
        html += '<div style="width:2px;height:30px;background:linear-gradient(to bottom,rgba(212,175,55,0.5),rgba(212,175,55,0.2));margin:0 auto;"></div>';
    }

    // Nhân vật trung tâm + anh/chị/em
    html += '<div class="ft-generation">';
    if (siblings.length > 0) {
        for (const s of siblings.slice(0, 2)) {
            html += await buildNode(s.char, s.label);
        }
        // Đường ngang kết nối
        html += '<div style="display:flex;align-items:center;margin:0 10px;"><div style="height:2px;width:30px;background:rgba(212,175,55,0.3);"></div></div>';
    }
    html += await buildNode(char, '✦ Nhân vật chính');
    html += '</div>';

    // Hàng con cái
    if (children.length > 0) {
        html += '<div style="width:2px;height:30px;background:linear-gradient(to bottom,rgba(212,175,55,0.2),rgba(212,175,55,0.5));margin:0 auto;"></div>';
        html += '<div class="ft-generation">';
        for (const child of children.slice(0, 5)) {
            html += await buildNode(child.char, child.label);
        }
        html += '</div>';
    }

    // Thông báo nếu không có dữ liệu
    if (parents.length === 0 && children.length === 0 && siblings.length === 0) {
        html += `
            <div style="text-align:center;padding:20px;color:#475569;">
                <i class="fa-solid fa-tree" style="font-size:2rem;margin-bottom:10px;opacity:0.3;"></i>
                <p>Chưa có mối quan hệ gia đình nào.<br><small>Hãy thêm quan hệ "Cha/Mẹ/Con/Anh/Chị/Em" trong phần chỉnh sửa nhân vật.</small></p>
            </div>
        `;
    }

    html += '</div></div>';
    container.innerHTML = html;
};

// ============================================================
// NHÓM 4.1 — TRÌNH TẠO TIỂU SỬ NGẪU NHIÊN (BACKSTORY GENERATOR)
// Ghép template văn bản thành tiểu sử sử thi hoàn chỉnh
// ============================================================

// Các mảng dữ liệu ngẫu nhiên cho từng phần của tiểu sử
const _backstoryData = {
    birthPlaces: [
        'vùng hoang mạc cháy bỏng phía Nam', 'rừng già Thiên Niên Kỷ', 'thành phố nổi trên mây',
        'hang động sâu thẳm lòng núi', 'làng chài ven biển Tây Dương', 'tháp pháp sư bí ẩn',
        'thảo nguyên bất tận', 'di tích của nền văn minh đã mất', 'bờ sông thiêng liêng Eranthis',
        'cung điện dưới đáy biển', 'khu rừng ma thuật Silvanus', 'chiến trường cũ đầy tro tàn'
    ],
    parentJobs: [
        'chiến binh sa trường lừng danh', 'pháp sư ẩn dật sống ngoài thế tục',
        'lái buôn đường trường khắp các lục địa', 'thợ rèn vũ khí huyền thoại',
        'tu sĩ phụng sự thần linh ánh sáng', 'kẻ trộm bóng đêm có tay nghề cao',
        'nhà giả kim tìm kiếm bất tử', 'thuyền trưởng hải tặc kiêu hùng',
        'linh mục đại thần điện', 'người gác rừng cuối cùng của cánh rừng cổ'
    ],
    childhoods: [
        'Tuổi thơ trôi qua trong cô độc và những bài tập kiếm thuật không ngừng nghỉ.',
        'Lớn lên bên những câu chuyện huyền thoại do ông nội kể mỗi đêm.',
        'Từ nhỏ đã học được rằng sức mạnh không phải tự nhiên mà có — nó được rèn giũa bằng máu và mồ hôi.',
        'Mất đi người thân từ rất sớm, trở nên chai lì và lạnh lùng trước thế giới tàn khốc.',
        'Được nuôi dưỡng bởi một hội kín bí ẩn với những phương pháp đào tạo đặc biệt.',
        'Tuổi thơ trong sáng bên những người bạn vô ưu — điều đó đã thay đổi mãi mãi sau một đêm định mệnh.',
        'Tự học mọi thứ từ sách cổ và trải nghiệm thực tế đắng cay.',
        'Trải qua những năm tháng nô lệ trước khi tự giải phóng bản thân.'
    ],
    motivations: [
        'tìm kiếm sự thật về nguồn gốc của bản thân',
        'trả thù cho người thân đã ngã xuống',
        'thu thập đủ bảy mảnh bản đồ dẫn đến kho báu thần thánh',
        'chứng minh rằng kẻ yếu nhất cũng có thể đứng ở đỉnh cao',
        'phá vỡ lời nguyền đang dần ăn mòn linh hồn mình',
        'bảo vệ những người vô tội khỏi bóng tối đang trỗi dậy',
        'tìm kiếm sức mạnh đủ lớn để đối đầu với vị thần bóng tối',
        'hoàn thành di nguyện cuối cùng của người thầy đã khuất'
    ],
    traits: [
        'mang trong mình một vết thương tâm hồn không bao giờ lành hẳn',
        'có đôi mắt nhìn thấu tim người nhưng lại không đọc được lòng mình',
        'luôn cười trước mặt mọi người dù trong lòng nặng trĩu',
        'không bao giờ rút kiếm trước — nhưng một khi đã rút, sẽ không cắm vào vỏ khi chưa xong việc',
        'mang theo một bí mật mà nếu lộ ra, sẽ thay đổi mọi thứ',
        'không tin vào may mắn, chỉ tin vào chuẩn bị kỹ lưỡng'
    ],
    endings: [
        'Và hành trình đó vẫn chưa kết thúc...',
        'Câu chuyện của họ chỉ mới bắt đầu.',
        'Số phận đã chọn họ, dù họ có muốn hay không.',
        'Dù thế giới có quay lưng, họ vẫn tiếp tục bước về phía trước.',
        'Chỉ có thời gian mới biết liệu con đường này sẽ dẫn đến vinh quang hay diệt vong.'
    ]
};

/**
 * Lấy phần tử ngẫu nhiên từ mảng
 * @param {Array} arr - Mảng dữ liệu
 * @returns {*} Phần tử ngẫu nhiên
 */
function _randPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Sinh tiểu sử ngẫu nhiên cho nhân vật
 * @param {Object} char - Đối tượng nhân vật
 * @returns {string} HTML của tiểu sử
 */
window.generateBackstory = function(char) {
    if (!char) return '';

    const name = char.name || 'Kẻ vô danh';
    const race = char.race || _randPick(['nhân loại', 'tiên tộc', 'quỷ tộc', 'dị tộc']);
    const job = char.job || 'chiến binh';
    const birthPlace = _randPick(_backstoryData.birthPlaces);
    const parentJob = _randPick(_backstoryData.parentJobs);
    const childhood = _randPick(_backstoryData.childhoods);
    const motivation = _randPick(_backstoryData.motivations);
    const trait = _randPick(_backstoryData.traits);
    const ending = _randPick(_backstoryData.endings);

    // Dùng địa điểm của nhân vật nếu có
    const location = char.location || birthPlace;

    return `
        <span class="highlight">${name}</span> sinh ra ở <span class="highlight">${birthPlace}</span>,
        mang trong mình dòng máu <span class="highlight">${race}</span>,
        là con của một <span class="highlight">${parentJob}</span>.
        ${childhood}
        Theo đuổi con đường <span class="highlight">${job}</span>,
        ${name} dấn thân vào hành trình <span class="highlight">${motivation}</span>.
        Người ta nói rằng họ <span class="highlight">${trait}</span>.
        <em>${ending}</em>
    `;
};

/**
 * Hiển thị tiểu sử ngẫu nhiên trong một container
 * @param {string} charId - ID nhân vật
 * @param {string} containerId - ID element chứa output
 */
window.renderBackstory = function(charId, containerId) {
    const char = window.characters?.find(c => String(c.id) === String(charId));
    const container = document.getElementById(containerId);
    if (!char || !container) return;

    container.style.opacity = '0';
    setTimeout(() => {
        container.innerHTML = window.generateBackstory(char);
        container.style.opacity = '1';
    }, 200);
};

// ============================================================
// NHÓM 4.3 — DASHBOARD THỐNG KÊ THẾ GIỚI
// Hiển thị tổng quan: entities, donut chart chủng tộc, top kingdom, recent battles
// ============================================================

/**
 * Tạo Donut Chart bằng SVG thuần (không cần thư viện)
 * @param {Array} data - [{label, value, color}]
 * @param {number} size - Kích thước (px)
 * @returns {string} SVG HTML string
 */
function buildDonutChart(data, size = 140) {
    if (!data || data.length === 0) return '<p style="color:#475569;">Chưa có dữ liệu</p>';

    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return '<p style="color:#475569;">Chưa có dữ liệu</p>';

    const radius = 54;
    const cx = size / 2;
    const cy = size / 2;
    const strokeWidth = 20;

    let paths = '';
    let currentAngle = -90; // Bắt đầu từ trên cùng

    data.forEach(item => {
        const percentage = item.value / total;
        const angle = percentage * 360;
        const startRad = (currentAngle * Math.PI) / 180;
        const endRad = ((currentAngle + angle) * Math.PI) / 180;

        const x1 = cx + radius * Math.cos(startRad);
        const y1 = cy + radius * Math.sin(startRad);
        const x2 = cx + radius * Math.cos(endRad);
        const y2 = cy + radius * Math.sin(endRad);

        const largeArc = angle > 180 ? 1 : 0;
        const pathD = [
            `M ${cx} ${cy}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
            'Z'
        ].join(' ');

        paths += `
            <path d="${pathD}" fill="${item.color}" opacity="0.85" style="transition:opacity 0.2s;">
                <title>${item.label}: ${item.value} (${(percentage * 100).toFixed(1)}%)</title>
            </path>
        `;
        currentAngle += angle;
    });

    // Vòng tròn trung tâm (tạo hiệu ứng donut)
    paths += `<circle cx="${cx}" cy="${cy}" r="${radius - strokeWidth}" fill="#0f172a"/>`;

    // Text ở giữa
    paths += `
        <text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="#d4af37" font-size="20" font-weight="bold" font-family="Cinzel">${total}</text>
        <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="#64748b" font-size="9">nhân vật</text>
    `;

    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>`;
}

// Bảng màu cho các chủng tộc (tự động xoay vòng)
const RACE_COLORS = [
    '#d4af37', '#6366f1', '#10b981', '#ef4444', '#8b5cf6',
    '#f59e0b', '#06b6d4', '#ec4899', '#14b8a6', '#f97316'
];

/**
 * Render toàn bộ Dashboard Thế giới
 * @param {string} containerId - ID container
 */
window.renderWorldDashboard = async function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (typeof dbGetAll === 'function') {
        window.characters = await dbGetAll('characters') || [];
        window.kingdoms = await dbGetAll('kingdoms') || [];
        window.factions = await dbGetAll('factions') || [];
        window.races = await dbGetAll('races') || [];
        
        if (typeof showToast === 'function') {
            showToast('✅ Đã cập nhật dữ liệu mới nhất!', 'success');
        }
    }

    const chars = window.characters || [];
    const kingdoms = window.kingdoms || [];
    const factions = window.factions || [];
    const races = window.races || [];

    // ── Thống kê cơ bản ──
    const totalChars = chars.length;
    const totalKingdoms = kingdoms.length;
    const totalFactions = factions.length;
    const aliveChars = chars.filter(c => c.status === 'Còn sống').length;

    // ── Phân bố chủng tộc cho Donut Chart ──
    const raceCounts = {};
    chars.forEach(c => {
        const r = c.race || 'Không rõ';
        raceCounts[r] = (raceCounts[r] || 0) + 1;
    });

    // Sắp xếp và lấy top 8 chủng tộc
    const raceData = Object.entries(raceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, value], i) => ({ label, value, color: RACE_COLORS[i % RACE_COLORS.length] }));

    // ── Vương quốc mạnh nhất (tính theo số nhân vật thành viên) ──
    let topKingdom = null;
    let topKingdomCount = 0;
    kingdoms.forEach(k => {
        const count = chars.filter(c =>
            (c.kingdom || '').toLowerCase() === (k.name || '').toLowerCase()
        ).length;
        if (count > topKingdomCount) {
            topKingdomCount = count;
            topKingdom = k;
        }
    });

    // ── Lịch sử trận đấu gần đây ──
    let recentBattles = [];
    if (typeof dbGetAll === 'function') {
        try {
            recentBattles = (await dbGetAll('battle_history') || [])
                .sort((a, b) => (b.id || '').localeCompare(a.id || ''))
                .slice(0, 5);
        } catch (e) {
            recentBattles = [];
        }
    }

    // ── Render HTML ──
    container.innerHTML = `
        <div class="dashboard-grid">
            <!-- Thống kê nhanh -->
            <div class="dash-card">
                <div class="dash-card-title"><i class="fa-solid fa-users"></i> Tổng thực thể</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div>
                        <div class="dash-stat-big">${totalChars}</div>
                        <div class="dash-stat-label">Nhân vật</div>
                    </div>
                    <div>
                        <div class="dash-stat-big" style="color:#10b981;">${aliveChars}</div>
                        <div class="dash-stat-label">Còn sống</div>
                    </div>
                    <div>
                        <div class="dash-stat-big" style="color:#6366f1;">${totalKingdoms}</div>
                        <div class="dash-stat-label">Đế chế</div>
                    </div>
                    <div>
                        <div class="dash-stat-big" style="color:#f59e0b;">${totalFactions}</div>
                        <div class="dash-stat-label">Phe phái</div>
                    </div>
                </div>
            </div>

            <!-- Donut Chart phân bố chủng tộc -->
            <div class="dash-card">
                <div class="dash-card-title"><i class="fa-solid fa-dna"></i> Phân bố chủng tộc</div>
                <div class="donut-chart-wrapper">
                    ${buildDonutChart(raceData, 130)}
                    <div class="donut-legend">
                        ${raceData.map(r => `
                            <div class="donut-legend-item">
                                <div class="donut-legend-dot" style="background:${r.color};"></div>
                                <span>${r.label} <span style="color:#64748b;">(${r.value})</span></span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Đế chế mạnh nhất -->
            <div class="dash-card">
                <div class="dash-card-title"><i class="fa-solid fa-crown"></i> Đế chế thống trị</div>
                ${topKingdom ? `
                    <div style="display:flex;align-items:center;gap:14px;">
                        <div style="width:52px;height:52px;border-radius:10px;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.3);display:flex;align-items:center;justify-content:center;font-size:1.6rem;">👑</div>
                        <div>
                            <div style="font-family:'Cinzel',serif;font-size:1.15rem;color:#d4af37;">${topKingdom.name}</div>
                            <div style="font-size:0.8rem;color:#64748b;margin-top:3px;">${topKingdomCount} thành viên · ${topKingdom.leader || 'Chưa có lãnh đạo'}</div>
                        </div>
                    </div>
                    <div style="margin-top:14px;font-size:0.8rem;color:#64748b;line-height:1.5;font-style:italic;">${(topKingdom.lore || topKingdom.desc || '').slice(0, 100) || 'Đế chế hùng mạnh nhất thế giới.'}</div>
                ` : `<p style="color:#475569;font-style:italic;">Chưa có đế chế nào.</p>`}
            </div>

            <!-- Lịch sử trận đấu gần đây -->
            <div class="dash-card" style="grid-column: 1 / -1;">
                <div class="dash-card-title"><i class="fa-solid fa-fire"></i> Lịch sử chiến đấu gần đây</div>
                ${recentBattles.length > 0 ? `
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${recentBattles.map(b => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:0.85rem;">
                                <span style="color:#e2e8f0;">${b.winner || 'Không xác định'} thắng</span>
                                <span style="color:#64748b;">${b.date || ''}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : `<p style="color:#475569;font-style:italic;">Chưa có trận đấu nào được ghi lại.</p>`}
            </div>
        </div>
    `;
};

// ============================================================
// WIKI HYPERLINKS [[ ]] — Nhận diện và tạo link nội bộ
// Được gọi bởi renderMarkdown trong app.js
// ============================================================

/**
 * Xử lý cú pháp [[Tên Nhân Vật]] trong text
 * Nếu tên khớp với nhân vật trong hệ thống → tạo hyperlink nội bộ
 * @param {string} text - Văn bản gốc
 * @returns {string} HTML với wiki links
 */
window.processWikiLinks = function(text) {
    if (!text || !window.characters) return text;

    return text.replace(/\[\[([^\]]+)\]\]/g, (match, name) => {
        const trimmedName = name.trim();
        // Tìm nhân vật khớp tên (không phân biệt hoa/thường)
        const foundChar = window.characters.find(c =>
            (c.name || '').toLowerCase() === trimmedName.toLowerCase()
        );

        if (foundChar) {
            // Tạo hyperlink nội bộ → click mở profile nhân vật
            return `<a href="javascript:void(0)" class="wiki-link" onclick="if(typeof openProfile==='function') openProfile('${foundChar.id}'); if(typeof showPage==='function') showPage('characterPage');" title="Nhân vật: ${foundChar.name}" style="color:#d4af37;text-decoration:none;border-bottom:1px dotted rgba(212,175,55,0.5);transition:border-color 0.2s;" onmouseover="this.style.borderBottomStyle='solid'" onmouseout="this.style.borderBottomStyle='dotted'">${foundChar.name}</a>`;
        }

        // Nếu không tìm thấy → giữ nguyên text nhưng đánh dấu màu khác
        return `<span class="wiki-link-unknown" title="Nhân vật chưa được tạo" style="color:#94a3b8;border-bottom:1px dashed rgba(148,163,184,0.4);">${trimmedName}</span>`;
    });
};

// ============================================================
// 3D TILT EFFECT — Khởi tạo hiệu ứng nghiêng 3D cho card
// Gắn vào tất cả element có class .card-3d-tilt
// ============================================================

/**
 * Khởi tạo hiệu ứng nghiêng 3D theo con trỏ chuột
 * Phải gọi lại sau mỗi lần render card mới
 */
window.initTiltEffect = function() {
    const tiltCards = document.querySelectorAll('.card-3d-tilt:not([data-tilt-init])');
    tiltCards.forEach(card => {
        card.dataset.tiltInit = 'true';

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            // Tọa độ chuột tương đối so với card (0→1)
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;

            // Góc nghiêng tối đa ±8 độ
            const tiltX = (y - 0.5) * -8;
            const tiltY = (x - 0.5) * 8;

            // CSS custom properties cho shine effect
            card.style.setProperty('--mouse-x', `${x * 100}%`);
            card.style.setProperty('--mouse-y', `${y * 100}%`);
            card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translate3d(0,0,0)`;
        });

        card.addEventListener('mouseleave', () => {
            // Reset về trạng thái ban đầu với transition mượt
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0)';
        });
    });
};

// ============================================================
// PARTICLE BACKGROUND — Hạt bụi ma thuật lơ lửng
// Khởi tạo khi trang load, tự dọn dẹp và tái tạo
// ============================================================

/**
 * Tạo và chạy hệ thống hạt bụi magic trên nền trang
 * Dùng CSS animation thuần (GPU-accelerated) thay vì Canvas để hiệu suất tốt hơn
 */
window.initParticleBackground = function() {
    // Chỉ tạo nếu chưa có
    if (document.getElementById('particleBg')) return;

    const bg = document.createElement('div');
    bg.id = 'particleBg';
    bg.className = 'particle-bg';
    document.body.insertBefore(bg, document.body.firstChild);

    const PARTICLE_COUNT = 25;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = document.createElement('div');
        p.className = 'particle';

        // Kích thước ngẫu nhiên 2-6px
        const size = 2 + Math.random() * 4;
        // Vị trí ngang ngẫu nhiên
        const left = Math.random() * 100;
        // Thời gian animation ngẫu nhiên 8-20 giây
        const duration = 8 + Math.random() * 12;
        // Độ trễ ngẫu nhiên để không đồng loạt
        const delay = Math.random() * -15;
        // Drift ngang (bay nghiêng một chút)
        const driftX = (Math.random() - 0.5) * 100;

        p.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${left}%;
            bottom: 0;
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
            --drift-x: ${driftX}px;
            opacity: ${0.3 + Math.random() * 0.5};
        `;
        fragment.appendChild(p);
    }

    bg.appendChild(fragment);
};

console.log('✨ features.js: Đã tải xong Nhóm 1 & 4 (Export, Chronicle, Family Tree, Backstory, Dashboard, Wiki Links, Tilt, Particles)');
