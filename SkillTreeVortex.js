/* SkillTreeVortex.js - PREMIUM DARK FANTASY EDITION */
const SkillTreeVortex = {
    activeCharId: null,
    colors: ['#d4af37', '#a855f7', '#06b6d4', '#ec4899', '#22c55e', '#ef4444', '#f97316'],
    
    scale: 1, posX: 0, posY: 0,
    isDragging: false,
    startX: 0, startY: 0,
    editingIndex: null,
    
    init() {
        if (document.getElementById('vortexOverlay')) return;
        const html = `
            <div id="vortexOverlay" class="vortex-overlay">
                <!-- Nền kính mờ & Hiệu ứng hạt -->
                <div class="vortex-nebula" onclick="SkillTreeVortex.hideCard()"></div>
                <div class="vortex-particles"></div>
                
                <span class="vortex-close" onclick="event.stopPropagation(); SkillTreeVortex.close()">
                    <i class="fa-solid fa-xmark"></i>
                </span>
                <h2 id="vortexCharName" class="shine-text"></h2>
                
                <!-- Khu vực Canvas Kỹ năng -->
                <div class="vortex-viewport" id="vortexViewport">
                    <div class="vortex-container" id="vortexContainer">
                        <div class="vortex-magic-ring-outer"></div>
                        <div class="vortex-magic-ring-inner"></div>
                        <svg class="vortex-svg" id="vortexSvg"></svg>
                        <div class="vortex-static-wrapper" id="vortexWrapper"></div>
                        <div class="vortex-center" id="vortexCenterImg"></div>
                    </div>
                </div>

                <!-- Thẻ Bài Hiển Thị Kỹ Năng -->
                <div id="vortexSkillCard" class="vortex-skill-card card-glass" onclick="event.stopPropagation()">
                    <span class="vortex-card-close" onclick="SkillTreeVortex.hideCard()"><i class="fa-solid fa-xmark"></i></span>
                    <div class="bottom-sheet-handle"></div>
                    <div id="cardColorBar" class="card-color-bar"></div>
                    
                    <div class="card-header-fantasy">
                        <div class="card-icon-glow">
                            <i id="cardSkillIcon" class="fa-solid fa-khanda"></i>
                        </div>
                        <div class="card-title-group">
                            <h3 id="cardSkillName" class="metallic-text"></h3>
                            <span id="cardSkillTier" class="tier-badge"></span>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <p id="cardSkillDesc"></p>
                    </div>
                    
                    <div class="card-footer">
                        <button class="btn-card-edit" onclick="SkillTreeVortex.editFromCard()">
                            <i class="fa-solid fa-pen-nib"></i> TU TUYẾN
                        </button>
                        <button class="btn-card-del" onclick="SkillTreeVortex.deleteFromCard()">
                            <i class="fa-solid fa-ban"></i> PHẾ BỎ
                        </button>
                    </div>
                </div>

                <button class="vortex-add-btn" onclick="event.stopPropagation(); SkillTreeVortex.showModal()">
                    <i class="fa-solid fa-plus"></i>
                    <span class="btn-text">Khai mở</span>
                </button>

                <!-- Modal Thêm/Sửa Kỹ Năng -->
                <div id="vortexSkillModal" class="vortex-custom-modal" onclick="event.stopPropagation()">
                    <div class="vortex-modal-content card-glass">
                        <h3 id="vortexModalTitle" class="metallic-text"><i class="fa-solid fa-scroll"></i> Phù Chú Kỹ Năng</h3>
                        
                        <div class="vortex-input-group">
                            <label>Tên Bí Thuật</label>
                            <input type="text" id="vortexInpName" placeholder="VD: Hỏa Long Hống...">
                        </div>
                        
                        <div class="vortex-input-group">
                            <label>Cảnh Giới (Tier)</label>
                            <select id="vortexInpTier">
                                <option value="1">Sơ Cấp (Quỹ Đạo Trong)</option>
                                <option value="2">Trung Cấp (Quỹ Đạo Giữa)</option>
                                <option value="3">Tối Thượng (Quỹ Đạo Ngoài)</option>
                            </select>
                        </div>

                        <div class="vortex-input-group">
                            <label>Uy Lực & Hiệu Ứng</label>
                            <textarea id="vortexInpDesc" placeholder="Mô tả sức mạnh..." rows="4"></textarea>
                        </div>
                        
                        <div class="vortex-modal-btns">
                            <button class="btn-cancel" onclick="SkillTreeVortex.hideModal()">Hủy</button>
                            <button class="btn-save" onclick="SkillTreeVortex.saveFromModal()">Ghi Lại</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        this.initZoomPan();
        this.createParticles();
    },

    createParticles() {
        const container = document.querySelector('.vortex-particles');
        if (!container) return;
        for (let i = 0; i < 30; i++) {
            let p = document.createElement('div');
            p.className = 'vortex-dust';
            p.style.left = Math.random() * 100 + '%';
            p.style.top = Math.random() * 100 + '%';
            p.style.animationDuration = (Math.random() * 5 + 5) + 's';
            p.style.animationDelay = (Math.random() * 5) + 's';
            container.appendChild(p);
        }
    },

    showCard(index, color, tier) {
        const char = window.characters.find(c => String(c.id) === String(this.activeCharId));
        if (!char || !char.customSkills[index]) return;

        const skill = char.customSkills[index];
        this.editingIndex = index; 
        
        const card = document.getElementById('vortexSkillCard');
        const nameEl = document.getElementById('cardSkillName');
        const descEl = document.getElementById('cardSkillDesc');
        const barEl = document.getElementById('cardColorBar');
        const tierEl = document.getElementById('cardSkillTier');
        const iconEl = document.getElementById('cardSkillIcon');

        // Gán dữ liệu
        nameEl.innerText = skill.name || "Bí Thuật Vô Danh";
        descEl.innerText = skill.desc || "Sức mạnh ẩn sâu chưa được kích phát...";
        
        // Thiết lập Tier
        const tierName = tier == 3 ? "Tối Thượng" : (tier == 2 ? "Trung Cấp" : "Sơ Cấp");
        tierEl.innerText = `Cảnh giới: ${tierName}`;
        tierEl.className = `tier-badge tier-${tier}`;
        
        // Đổi icon theo tier
        iconEl.className = tier == 3 ? "fa-solid fa-dragon" : (tier == 2 ? "fa-solid fa-bolt" : "fa-solid fa-khanda");
        iconEl.style.color = color;

        // Cập nhật thanh bar và glow
        barEl.style.background = `linear-gradient(90deg, transparent, ${color}, transparent)`;
        barEl.style.boxShadow = `0 0 20px ${color}`;
        document.querySelector('.card-icon-glow').style.boxShadow = `0 0 30px ${color}40`;
        
        // Hiển thị Card mượt mà
        card.classList.add('active');
        card.style.display = 'block'; 
    },

    hideCard() {
        const card = document.getElementById('vortexSkillCard');
        if (card) card.classList.remove('active');
    },
    
    editFromCard() {
        if (this.editingIndex === null) return;
        const idx = this.editingIndex;
        this.hideCard(); 
        setTimeout(() => this.showModal(idx), 300);
    },
    
    async deleteFromCard() {
        if (this.editingIndex === null) return;
        
        if (confirm("Ký ức về bí thuật này sẽ vĩnh viễn tan biến. Xác nhận?")) {
            const char = window.characters.find(c => String(c.id) === String(this.activeCharId));
            if (!char || !char.customSkills) return;

            char.customSkills.splice(this.editingIndex, 1);
            
            this.hideCard();
            this.editingIndex = null;
            
            try {
                if (typeof saveAndRefresh === "function") await saveAndRefresh();
                this.renderSkills();
                if (typeof showToast === "function") showToast("✅ Đã phế bỏ bí thuật", "success");
            } catch (e) {
                console.error("Vortex: Error deleting", e);
                alert("Lỗi khi đồng bộ dữ liệu!");
            }
        }
    },

    showModal(index = null) {
        this.editingIndex = index;
        const modal = document.getElementById('vortexSkillModal');
        const nameInp = document.getElementById('vortexInpName');
        const descInp = document.getElementById('vortexInpDesc');
        const tierInp = document.getElementById('vortexInpTier');
        const title = document.getElementById('vortexModalTitle');

        if (index !== null) {
            const char = window.characters.find(c => String(c.id) === String(this.activeCharId));
            const skill = char.customSkills[index];
            nameInp.value = skill.name || "";
            descInp.value = skill.desc || "";
            tierInp.value = skill.tier || 1;
            title.innerHTML = '<i class="fa-solid fa-pen-nib"></i> Tu Tuyến Bí Thuật';
        } else {
            nameInp.value = "";
            descInp.value = "";
            tierInp.value = 1;
            title.innerHTML = '<i class="fa-solid fa-scroll"></i> Khai Mở Bí Thuật';
        }
        
        modal.style.display = 'flex';
        modal.style.zIndex = "1000000"; 
    },

    async saveFromModal() {
        const name = document.getElementById('vortexInpName').value.trim();
        const desc = document.getElementById('vortexInpDesc').value.trim();
        const tier = parseInt(document.getElementById('vortexInpTier').value) || 1;
        
        if (!name) {
            if (typeof showToast === "function") showToast("⚠️ Tên bí thuật không được bỏ trống!", "warning");
            else alert("Tên bí thuật không được bỏ trống!");
            return;
        }

        const char = window.characters.find(c => String(c.id) === String(this.activeCharId));
        if (!char) return;

        if (!char.customSkills) char.customSkills = [];
        const skillData = { name, desc, tier };

        if (this.editingIndex !== null) {
            char.customSkills[this.editingIndex] = skillData;
        } else {
            char.customSkills.push(skillData);
        }

        try {
            if (typeof saveAndRefresh === "function") await saveAndRefresh();
            this.hideModal();
            this.renderSkills(); 
            this.editingIndex = null;
            if (typeof showToast === "function") showToast("✅ Đã ghi danh bí thuật", "success");
        } catch (e) {
            console.error("Vortex Save Error:", e);
            alert("Lỗi không thể lưu bí thuật!");
        }
    },
    
    hideModal() { 
        document.getElementById('vortexSkillModal').style.display = 'none'; 
    },
    
    renderSkills() {
        const char = window.characters.find(c => String(c.id) === String(this.activeCharId));
        const wrapper = document.getElementById('vortexWrapper');
        const svg = document.getElementById('vortexSvg');
        if (!char || !wrapper || !svg) return;
        
        wrapper.innerHTML = ""; 
        svg.innerHTML = "";
        
        const skills = char.customSkills || [];
        const isMobile = window.innerWidth < 768;
        
        // Phân nhóm theo Tier để tính góc
        let tiers = { 1: [], 2: [], 3: [] };
        skills.forEach((s, i) => {
            let t = s.tier || 1;
            tiers[t].push({ skill: s, index: i });
        });

        // Bán kính quỹ đạo
        const radii = {
            1: isMobile ? 130 : 200,
            2: isMobile ? 190 : 300,
            3: isMobile ? 250 : 420
        };

        for (let t = 1; t <= 3; t++) {
            const group = tiers[t];
            if (group.length === 0) continue;

            group.forEach((item, idx) => {
                const angle = (idx * 2 * Math.PI) / group.length + (t * 0.5); // Lệch góc một chút cho tự nhiên
                const r = radii[t];
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                
                // Color theo độ hiếm / index
                const color = this.colors[item.index % this.colors.length];
                const isUltimate = t == 3;

                // Tạo SVG Line
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", "50%"); 
                line.setAttribute("y1", "50%");
                line.setAttribute("x2", `calc(50% + ${x}px)`); 
                line.setAttribute("y2", `calc(50% + ${y}px)`);
                line.setAttribute("stroke", color);
                line.setAttribute("class", isUltimate ? "vortex-line-ultimate" : "vortex-line-fantasy"); 
                line.style.setProperty('--skill-color', color);
                svg.appendChild(line);

                // Tạo Node HTML
                const bubble = document.createElement('div');
                bubble.className = `skill-bubble fantasy-node tier-${t}`;
                if (isUltimate) bubble.classList.add('glow-ultimate');
                
                bubble.style.cssText = `
                    --skill-color: ${color};
                    --x: ${x}px;
                    --y: ${y}px;
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(calc(-50% + ${x}px), calc(-50% + ${y}px));
                `;
                
                bubble.innerHTML = `
                    <div class="node-pulse" style="background: ${color}"></div>
                    <div class="skill-name">${item.skill.name}</div>
                `;
                
                bubble.onclick = (e) => {
                    e.stopPropagation();
                    this.showCard(item.index, color, t);
                };
                wrapper.appendChild(bubble);
            });
        }
    },

    initZoomPan() {
        const viewport = document.getElementById('vortexViewport');
        if (!viewport) return;

        viewport.replaceWith(viewport.cloneNode(true));
        const newViewport = document.getElementById('vortexViewport');

        newViewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.85 : 1.15;
            this.scale = Math.min(Math.max(0.3, this.scale * delta), 2.5);
            this.applyTransform();
        }, { passive: false });

        let lastDist = 0;
        newViewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                lastDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            } else if (e.touches.length === 1) {
                this.isDragging = true;
                this.startX = e.touches[0].clientX - this.posX;
                this.startY = e.touches[0].clientY - this.posY;
            }
        }, { passive: true });

        newViewport.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
                const delta = dist / lastDist;
                this.scale = Math.min(Math.max(0.3, this.scale * delta), 2.5);
                lastDist = dist;
                this.applyTransform();
            } else if (e.touches.length === 1 && this.isDragging) {
                this.posX = e.touches[0].clientX - this.startX;
                this.posY = e.touches[0].clientY - this.startY;
                this.applyTransform();
            }
        }, { passive: false });

        newViewport.addEventListener('touchend', () => { this.isDragging = false; });
    },

    applyTransform() {
        const container = document.getElementById('vortexContainer');
        if (container) {
            container.style.transform = `translate3d(${this.posX}px, ${this.posY}px, 0) scale(${this.scale})`;
        }
    },
    
    async open(charId) {
        if (!charId) return;
        this.init();
        
        const char = window.characters.find(c => String(c.id) === String(charId));
        if (!char) return;

        this.activeCharId = String(charId);
        this.hideCard(); 
        this.editingIndex = null;
        
        // Reset scale cho phù hợp Mobile
        this.scale = window.innerWidth < 768 ? 0.7 : 1; 
        this.posX = 0; 
        this.posY = 0; 
        this.applyTransform();
        
        const overlay = document.getElementById('vortexOverlay');
        overlay.style.display = 'flex';
        document.getElementById('vortexCharName').innerText = char.name;

        const centerImg = document.getElementById('vortexCenterImg');
        centerImg.style.backgroundImage = "url('https://i.imgur.com/6X8FQyA.png')";
        
        if (char.img) {
            try {
                const imgUrl = (char.img.startsWith('http') || char.img.startsWith('data:')) 
                    ? char.img : await getImage(char.img);
                centerImg.style.backgroundImage = `url('${imgUrl}')`;
            } catch (e) {
                console.warn("Vortex: Image load failed", e);
            }
        }
        this.renderSkills();
    },
    close() { 
        this.hideCard();
        const overlay = document.getElementById('vortexOverlay');
        if (overlay) overlay.style.display = 'none'; 
    }
};
