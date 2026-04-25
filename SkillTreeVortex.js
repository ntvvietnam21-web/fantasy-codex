/* SkillTreeVortex.js - FIXED & OPTIMIZED */
const SkillTreeVortex = {
    activeCharId: null,
    colors: ['#6366f1', '#ec4899', '#22c55e', '#eab308', '#a855f7', '#06b6d4', '#f97316'],
    
    scale: 1, posX: 0, posY: 0,
    isDragging: false,
    startX: 0, startY: 0,
    editingIndex: null,
    
    
        init() {
        if (document.getElementById('vortexOverlay')) return;
        const html = `
            <div id="vortexOverlay" class="vortex-overlay">
                <div class="vortex-nebula" onclick="SkillTreeVortex.hideCard()"></div>
                <div class="vortex-cosmic-dust" onclick="SkillTreeVortex.hideCard()"></div>
                
                <span class="vortex-close" onclick="event.stopPropagation(); SkillTreeVortex.close()">
                    <i class="fa-solid fa-xmark"></i>
                </span>
                <h2 id="vortexCharName"></h2>
                
                <div class="vortex-viewport" id="vortexViewport">
                    <div class="vortex-container" id="vortexContainer">
                        <div class="vortex-magic-ring-outer"></div>
                        <svg class="vortex-svg" id="vortexSvg"></svg>
                        <div class="vortex-static-wrapper" id="vortexWrapper"></div>
                        <div class="vortex-center" id="vortexCenterImg"></div>
                    </div>
                </div>

                <div id="vortexSkillCard" class="vortex-skill-card" onclick="event.stopPropagation()">
                    <div class="bottom-sheet-handle"></div>
                    <div id="cardColorBar" class="card-color-bar"></div>
                    
                    <div class="card-header-fantasy">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                        <h3 id="cardSkillName"></h3>
                    </div>
                    <div class="card-body">
                        <p id="cardSkillDesc"></p>
                    </div>
                    <div class="card-footer">
                        <button class="btn-card-edit" onclick="SkillTreeVortex.editFromCard()">
                            <i class="fa-solid fa-feather-pointed"></i> Sửa
                        </button>
                        <button class="btn-card-del" onclick="SkillTreeVortex.deleteFromCard()">
                            <i class="fa-solid fa-skull-crossbones"></i> Xóa
                        </button>
                    </div>
                </div>

                <button class="vortex-add-btn" onclick="event.stopPropagation(); SkillTreeVortex.showModal()">
                    <i class="fa-solid fa-plus"></i>
                    <span class="btn-text">Khai mở bí thuật</span>
                </button>

                <div id="vortexSkillModal" class="vortex-custom-modal" onclick="event.stopPropagation()">
                    <div class="vortex-modal-content fantasy-border">
                        <h3 id="vortexModalTitle">Phù Chú Kỹ Năng</h3>
                        <div class="vortex-input-group">
                            <input type="text" id="vortexInpName" placeholder="Tên bí thuật...">
                        </div>
                        <div class="vortex-input-group">
                            <textarea id="vortexInpDesc" placeholder="Mô tả uy lực..." rows="5"></textarea>
                        </div>
                        <div class="vortex-modal-btns">
                            <button class="btn-save" onclick="SkillTreeVortex.saveFromModal()">Ghi lại</button>
                            <button class="btn-cancel" onclick="SkillTreeVortex.hideModal()">Hủy</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        this.initZoomPan();
    },
    showCard(index, color) {
        const char = window.characters.find(c => String(c.id) === String(this.activeCharId));
        if (!char || !char.customSkills[index]) return;

        const skill = char.customSkills[index];
        this.editingIndex = index; // Lưu lại để biết đang làm việc với kỹ năng nào
        
        const card = document.getElementById('vortexSkillCard');
        const nameEl = document.getElementById('cardSkillName');
        const descEl = document.getElementById('cardSkillDesc');
        const barEl = document.getElementById('cardColorBar');

        // Hiển thị nội dung
        nameEl.innerText = skill.name;
        nameEl.style.color = color;
        descEl.innerText = skill.desc || "Bí thuật này ẩn chứa sức mạnh chưa được khai phá...";
        
        // Cập nhật thanh màu sắc
        barEl.style.background = `linear-gradient(90deg, transparent, ${color}, transparent)`;
        barEl.style.boxShadow = `0 0 15px ${color}`;
        
        // HIỂN THỊ CARD: Quan trọng nhất để các nút bên trong nó xuất hiện
        card.classList.add('active');
        card.style.display = 'block'; // Đảm bảo không bị display: none
    },

    
    hideCard() {
        const card = document.getElementById('vortexSkillCard');
        if (card) card.classList.remove('active');
    },
    
    editFromCard() {
        if (this.editingIndex === null) return;
        // Lấy index hiện tại ra trước khi ẩn card
        const idx = this.editingIndex;
        this.hideCard(); 
        // Delay một chút để hiệu ứng mượt hơn
        setTimeout(() => this.showModal(idx), 200);
    },
    
    async deleteFromCard() {
        if (this.editingIndex === null) return;
        
        if (confirm("Truyền thuyết này sẽ bị xóa vĩnh viễn khỏi tiềm thức. Bạn có chắc chắn?")) {
            // Đảm bảo lấy đúng nhân vật đang active
            const char = window.characters.find(c => String(c.id) === String(this.activeCharId));
            if (!char || !char.customSkills) return;

            // Xóa phần tử tại vị trí editingIndex
            char.customSkills.splice(this.editingIndex, 1);
            
            this.hideCard();
            this.editingIndex = null;
            
            try {
                // Gọi hàm lưu hệ thống của bạn
                if (typeof saveAndRefresh === "function") {
                    await saveAndRefresh();
                }
                
                // Vẽ lại vòng tròn kỹ năng ngay lập tức
                this.renderSkills();
                
                if (typeof showToast === "function") showToast("✅ Đã xóa bí thuật");
            } catch (e) {
                console.error("Vortex: Lỗi khi xóa", e);
                alert("Lỗi khi đồng bộ dữ liệu!");
            }
        }
    },
        showModal(index = null) {
        this.editingIndex = index;
        const modal = document.getElementById('vortexSkillModal');
        const nameInp = document.getElementById('vortexInpName');
        const descInp = document.getElementById('vortexInpDesc');
        const title = document.getElementById('vortexModalTitle');

        if (index !== null) {
            const char = window.characters.find(c => String(c.id) === String(this.activeCharId));
            const skill = char.customSkills[index];
            nameInp.value = skill.name;
            descInp.value = skill.desc || "";
            title.innerText = "Chỉnh sửa bí thuật";
        } else {
            nameInp.value = "";
            descInp.value = "";
            title.innerText = "Khai mở bí thuật mới";
        }
        
        modal.style.display = 'flex';
        // Ép Z-index để modal không bị các bubble đè lên
        modal.style.zIndex = "1000000"; 
    },

    
        async saveFromModal() {
        const name = document.getElementById('vortexInpName').value.trim();
        const desc = document.getElementById('vortexInpDesc').value.trim();
        
        if (!name) {
            alert("Bí thuật chưa có tên không thể khai mở!");
            return;
        }

        const char = window.characters.find(c => String(c.id) === String(this.activeCharId));
        if (!char) return;

        // Khởi tạo mảng nếu chưa tồn tại
        if (!char.customSkills) char.customSkills = [];

        const skillData = { name, desc };

        if (this.editingIndex !== null) {
            // Cập nhật kỹ năng cũ
            char.customSkills[this.editingIndex] = skillData;
        } else {
            // Thêm kỹ năng mới
            char.customSkills.push(skillData);
        }

        try {
            if (typeof saveAndRefresh === "function") {
                await saveAndRefresh();
            }
            
            this.hideModal();
            this.renderSkills(); // Cập nhật lại giao diện vòng tròn
            
            // Reset index để an toàn
            this.editingIndex = null;
            
        } catch (e) {
            console.error("Vortex Save Error:", e);
            alert("Không thể ghi lại bí thuật!");
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
        // Giảm bán kính trên Mobile để các Node không bị văng ra khỏi màn hình
        const isMobile = window.innerWidth < 768;
        const radius = isMobile ? 160 : 280; 

        skills.forEach((skill, i) => {
            const angle = (i * 2 * Math.PI) / skills.length;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const color = this.colors[i % this.colors.length];

            // Tạo Node Kỹ năng
            const bubble = document.createElement('div');
            bubble.className = 'skill-bubble fantasy-node';
            // SỬA LỖI: Dùng transform translate để căn giữa Node tại tọa độ (x,y) tuyệt đối
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
                <div class="skill-name">${skill.name}</div>
            `;
            
            bubble.onclick = (e) => {
                e.stopPropagation();
                this.showCard(i, color);
            };
            wrapper.appendChild(bubble);

            // Tạo đường nối SVG
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", "50%"); 
            line.setAttribute("y1", "50%");
            line.setAttribute("x2", `calc(50% + ${x}px)`); 
            line.setAttribute("y2", `calc(50% + ${y}px)`);
            line.setAttribute("stroke", color);
            line.setAttribute("class", "vortex-line-fantasy"); 
            line.style.setProperty('--skill-color', color);
            
            svg.appendChild(line);
        });
    },

    
    initZoomPan() {
        const viewport = document.getElementById('vortexViewport');
        if (!viewport) return;

        // Reset sự kiện để tránh lặp (Cực kỳ quan trọng)
        viewport.replaceWith(viewport.cloneNode(true));
        const newViewport = document.getElementById('vortexViewport');

        newViewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.85 : 1.15;
            this.scale = Math.min(Math.max(0.4, this.scale * delta), 2.5);
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
                this.scale = Math.min(Math.max(0.4, this.scale * delta), 2.5);
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
            // SỬA LỖI: Dùng translate3d để mượt hơn trên Mobile
            container.style.transform = `translate3d(${this.posX}px, ${this.posY}px, 0) scale(${this.scale})`;
        }
    },
    
        async open(charId) {
        if (!charId) return;
        
        // Khởi tạo nếu chưa có
        this.init();
        
        // Ép kiểu ID để tìm chính xác
        const char = window.characters.find(c => String(c.id) === String(charId));
        if (!char) return;

        this.activeCharId = String(charId);
        this.hideCard(); 
        this.editingIndex = null;
        
        // Reset vị trí
        this.scale = 1; 
        this.posX = 0; 
        this.posY = 0; 
        this.applyTransform();
        
        const overlay = document.getElementById('vortexOverlay');
        overlay.style.display = 'flex';
        document.getElementById('vortexCharName').innerText = char.name;

        // Xử lý ảnh tâm
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
