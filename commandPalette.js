/* ============================================================
   FANTASY CODEX PRO — COMMAND PALETTE (CTRL+K)
   Nhóm 5.2: Thanh lệnh tổng hợp overlay
   ============================================================ */

/**
 * Khởi tạo DOM cho Command Palette nếu chưa có
 */
function initCommandPaletteDOM() {
    if (document.getElementById('commandPaletteOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'commandPaletteOverlay';
    
    // Đóng khi click ngoài box
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeCommandPalette();
    });

    overlay.innerHTML = `
        <div class="command-palette-box">
            <div class="cp-input-wrapper">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="cpInput" placeholder="Tìm tên nhân vật, gõ lệnh /battle, /home, /gallery..." autocomplete="off">
                <span class="cp-shortcut">ESC</span>
            </div>
            <div class="cp-results" id="cpResults">
                <!-- Results will be injected here -->
            </div>
            <div class="cp-footer">
                <span><kbd style="font-family:inherit;font-weight:bold;">↑</kbd> <kbd style="font-family:inherit;font-weight:bold;">↓</kbd> để di chuyển</span>
                <span><kbd style="font-family:inherit;font-weight:bold;">Enter</kbd> để chọn</span>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const cpInput = document.getElementById('cpInput');
    cpInput.addEventListener('input', handleCPInput);
    cpInput.addEventListener('keydown', handleCPKeydown);
}

// Trạng thái tìm kiếm
let cpSelectedIndex = 0;
let cpCurrentResults = [];

/**
 * Mở Command Palette
 */
window.openCommandPalette = function() {
    initCommandPaletteDOM();
    const overlay = document.getElementById('commandPaletteOverlay');
    const input = document.getElementById('cpInput');
    
    overlay.classList.add('active');
    input.value = '';
    cpSelectedIndex = 0;
    
    // Render default suggestions
    handleCPInput();
    
    // Focus input
    setTimeout(() => input.focus(), 50);
};

/**
 * Đóng Command Palette
 */
window.closeCommandPalette = function() {
    const overlay = document.getElementById('commandPaletteOverlay');
    if (overlay) overlay.classList.remove('active');
};

/**
 * Lắng nghe phím tắt hệ thống (Ctrl+K hoặc Cmd+K)
 */
document.addEventListener('keydown', (e) => {
    // Nhấn Ctrl+K hoặc Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); // Chặn default của browser
        
        const overlay = document.getElementById('commandPaletteOverlay');
        if (overlay && overlay.classList.contains('active')) {
            closeCommandPalette();
        } else {
            openCommandPalette();
        }
    }
    
    // Nhấn ESC để đóng
    if (e.key === 'Escape') {
        closeCommandPalette();
    }
});

/**
 * Xử lý khi gõ vào input của Command Palette
 */
function handleCPInput() {
    const query = document.getElementById('cpInput').value.toLowerCase().trim();
    
    cpCurrentResults = [];
    cpSelectedIndex = 0;

    // 1. Phân tích nếu là lệnh hệ thống (Slash commands)
    const systemCommands = [
        { id: 'cmd_home', name: 'Trang chủ', desc: 'Quay về trang chính', icon: 'fa-home', action: () => showPage('home') },
        { id: 'cmd_chars', name: 'Nhân vật', desc: 'Mở thư viện nhân vật', icon: 'fa-users', action: () => showPage('characters') },
        { id: 'cmd_battle', name: 'Chiến đấu', desc: 'Mở đấu trường mô phỏng', icon: 'fa-crosshairs', action: () => showPage('battle') },
        { id: 'cmd_tournament', name: 'Giải đấu', desc: 'Tổ chức giải đấu', icon: 'fa-trophy', action: () => showPage('tournament') },
        { id: 'cmd_dash', name: 'Dashboard', desc: 'Xem thống kê toàn lục địa', icon: 'fa-chart-pie', action: () => showPage('dashboardPage') },
        { id: 'cmd_gallery', name: 'Chế độ Gallery', desc: 'Bật/tắt thư viện ảnh lớn', icon: 'fa-image', action: () => toggleGalleryMode() }
    ];

    if (query.startsWith('/')) {
        const cmdQuery = query.substring(1);
        systemCommands.forEach(cmd => {
            if (cmd.name.toLowerCase().includes(cmdQuery) || cmd.id.toLowerCase().includes(cmdQuery)) {
                cpCurrentResults.push({ type: 'command', ...cmd });
            }
        });
    } else {
        // Nếu không có query, hiện gợi ý lệnh
        if (query === '') {
            systemCommands.slice(0, 4).forEach(cmd => {
                cpCurrentResults.push({ type: 'command', ...cmd });
            });
        }
        // Lọc nhân vật (tìm tối đa 6 người khớp nhất)
        if (query !== '' && window.characters) {
            let matches = window.characters.filter(c => 
                (c.name || '').toLowerCase().includes(query) || 
                (c.race || '').toLowerCase().includes(query) ||
                (c.faction || '').toLowerCase().includes(query)
            );
            
            // Ưu tiên khớp tên từ đầu
            matches.sort((a, b) => {
                const aIdx = (a.name || '').toLowerCase().indexOf(query);
                const bIdx = (b.name || '').toLowerCase().indexOf(query);
                if (aIdx === 0 && bIdx !== 0) return -1;
                if (bIdx === 0 && aIdx !== 0) return 1;
                return 0;
            });

            matches.slice(0, 6).forEach(c => {
                cpCurrentResults.push({ type: 'character', char: c });
            });
        }
        
        // Nếu vẫn còn chỗ và có tìm kiếm, hiện thêm 1-2 lệnh khớp
        if (query !== '' && cpCurrentResults.length < 8) {
            systemCommands.forEach(cmd => {
                if (cmd.name.toLowerCase().includes(query)) {
                    cpCurrentResults.push({ type: 'command', ...cmd });
                }
            });
        }
    }

    renderCPResults();
}

/**
 * Cập nhật DOM hiển thị kết quả
 */
async function renderCPResults() {
    const container = document.getElementById('cpResults');
    if (!container) return;

    if (cpCurrentResults.length === 0) {
        container.innerHTML = `<div style="padding:20px;text-align:center;color:#64748b;font-size:0.85rem;">Không tìm thấy kết quả nào cho "${document.getElementById('cpInput').value}"</div>`;
        return;
    }

    let html = '';
    
    // Group kết quả theo type
    let lastType = '';
    
    for (let i = 0; i < cpCurrentResults.length; i++) {
        const item = cpCurrentResults[i];
        const isActive = i === cpSelectedIndex ? 'cp-active' : '';
        
        if (item.type !== lastType) {
            if (item.type === 'command') html += `<div class="cp-section-title">Lệnh hệ thống</div>`;
            if (item.type === 'character') html += `<div class="cp-section-title">Nhân vật</div>`;
            lastType = item.type;
        }

        if (item.type === 'command') {
            html += `
                <div class="cp-result-item ${isActive}" data-index="${i}" onclick="executeCPAction(${i})">
                    <div class="cp-icon"><i class="fa-solid ${item.icon}"></i></div>
                    <div class="cp-result-info">
                        <div class="cp-result-name">${item.name}</div>
                        <div class="cp-result-sub">${item.desc}</div>
                    </div>
                    <div class="cp-badge">Lệnh</div>
                </div>
            `;
        } else if (item.type === 'character') {
            const c = item.char;
            let imgSrc = 'https://i.imgur.com/6X8FQyA.png';
            if (c.img) {
                if (c.img.startsWith('http') || c.img.startsWith('data:')) imgSrc = c.img;
                else if (typeof getImage === 'function') {
                    // Cố gắng lấy ảnh (có thể bị chậm nhịp do async trong loop, nhưng vì có 6 item nên render đủ nhanh)
                    // Ở đây để an toàn và nhanh, nếu đã cache objectURL thì tốt
                    // Dùng trick: render placeholder trước, lazyload sau.
                }
            }

            html += `
                <div class="cp-result-item ${isActive}" data-index="${i}" onclick="executeCPAction(${i})">
                    <img src="${imgSrc}" class="lazy-cp-img" data-charid="${c.id}" crossorigin="anonymous">
                    <div class="cp-result-info">
                        <div class="cp-result-name">${c.name}</div>
                        <div class="cp-result-sub">${c.race || 'Chưa rõ'} · ${c.faction || ''}</div>
                    </div>
                    ${c.pl ? `<div class="cp-badge">PL: ${c.pl}</div>` : ''}
                </div>
            `;
        }
    }

    container.innerHTML = html;
    
    // Scroll item đang chọn vào view
    const activeEl = container.querySelector('.cp-active');
    if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
    }
}

/**
 * Xử lý phím lên xuống và Enter
 */
function handleCPKeydown(e) {
    if (cpCurrentResults.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        cpSelectedIndex = (cpSelectedIndex + 1) % cpCurrentResults.length;
        renderCPResults();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        cpSelectedIndex = (cpSelectedIndex - 1 + cpCurrentResults.length) % cpCurrentResults.length;
        renderCPResults();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        executeCPAction(cpSelectedIndex);
    }
}

/**
 * Thực thi lệnh hoặc mở trang nhân vật
 */
window.executeCPAction = function(index) {
    const item = cpCurrentResults[index];
    if (!item) return;

    closeCommandPalette();

    if (item.type === 'command') {
        if (typeof item.action === 'function') item.action();
    } else if (item.type === 'character') {
        if (typeof openProfile === 'function') {
            openProfile(item.char.id);
            if (typeof showPage === 'function') showPage('characterPage');
        }
    }
};

/**
 * Hàm toggle Gallery Mode (phục vụ cho command palette)
 */
window.toggleGalleryMode = function() {
    const list = document.getElementById('characterList');
    if (!list) return;
    
    const isGallery = list.classList.toggle('gallery-mode');
    
    // Update nút nếu có
    const btn = document.getElementById('galleryToggleBtn');
    if (btn) {
        if (isGallery) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fa-solid fa-list"></i> Chế độ Danh sách';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fa-solid fa-image"></i> Chế độ Thư viện';
        }
    }
    
    showToast(isGallery ? 'Đã bật Chế độ Thư viện ảnh' : 'Đã về chế độ Danh sách mặc định', 'info');
};

console.log('⚡ commandPalette.js: Ctrl+K đã sẵn sàng');
