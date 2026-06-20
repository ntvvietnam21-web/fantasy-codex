/* familyTree.js - ROYAL FAMILY TREE V2 (Multi-Tabs, Pan/Zoom, CRUD) */

const FamilyTree = {
    activeFamilyId: null,
    
    // Khởi tạo các sự kiện Drag/Zoom
    init() {
        this.renderTabs();
        this.initPanZoom();
    },

    // ── TABS & GIA TỘC ──
    renderTabs() {
        const tabsContainer = document.getElementById('familyTabs');
        if (!tabsContainer) return;

        window.families = window.families || [];
        let html = '';

        window.families.forEach(fam => {
            const isActive = this.activeFamilyId === fam.id;
            html += `
                <div class="family-tab ${isActive ? 'active' : ''}" onclick="FamilyTree.render('${fam.id}')">
                    <i class="fa-solid fa-crown"></i> ${fam.name}
                    <i class="fa-solid fa-xmark btn-del-tab" title="Xóa Gia Phả" onclick="event.stopPropagation(); FamilyTree.deleteFamily('${fam.id}')"></i>
                </div>
            `;
        });

        tabsContainer.innerHTML = html;

        if (window.families.length > 0 && !this.activeFamilyId) {
            this.render(window.families[0].id);
        } else if (window.families.length === 0) {
            this.render(null);
        }
    },

    showAddFamilyModal() {
        document.getElementById('familyInpName').value = '';
        
        // Populate dropdown
        const rootSelect = document.getElementById('familyInpRoot');
        let html = '<option value="">-- Chọn Thủy Tổ --</option>';
        const sortedChars = [...(window.characters || [])].sort((a,b) => a.name.localeCompare(b.name));
        sortedChars.forEach(c => {
            html += `<option value="${c.id}">${c.name}</option>`;
        });
        rootSelect.innerHTML = html;

        document.getElementById('familyModal').classList.add('active');
    },

    closeFamilyModal() {
        document.getElementById('familyModal').classList.remove('active');
    },

    async saveFamily() {
        const name = document.getElementById('familyInpName').value.trim();
        const rootId = document.getElementById('familyInpRoot').value;

        if (!name || !rootId) {
            if(typeof showToast === 'function') showToast("Vui lòng nhập Tên và Chọn Thủy tổ!", "warning");
            else alert("Vui lòng nhập Tên và Chọn Thủy tổ!");
            return;
        }

        const newFam = {
            id: 'fam_' + Date.now(),
            name: name,
            rootId: rootId
        };

        window.families.push(newFam);
        if(typeof dbSave === 'function') await dbSave("families", window.families);

        this.closeFamilyModal();
        this.activeFamilyId = newFam.id;
        this.renderTabs();
        this.render(newFam.id);
        if(typeof showToast === 'function') showToast("✅ Tạo Gia Phả thành công!", "success");
    },

    async deleteFamily(famId) {
        if (!confirm("Bạn có chắc chắn muốn xóa Gia phả này? (Các nhân vật vẫn sẽ được giữ lại trong hệ thống)")) return;
        
        window.families = window.families.filter(f => f.id !== famId);
        if(typeof dbSave === 'function') await dbSave("families", window.families);

        if (this.activeFamilyId === famId) {
            this.activeFamilyId = null;
        }
        this.renderTabs();
    },

    // ── RENDER TREE ──
    async render(famId) {
        this.activeFamilyId = famId;
        const container = document.getElementById('familyTreeContainer');
        if (!container) return;

        // Reset Transform khi load cây mới
        this.transform = { x: 0, y: 0, scale: 1 };
        this.updateTransform();

        if (!famId) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-seedling"></i>
                    <p>Chưa có Gia Phả nào. Hãy tạo mới!</p>
                </div>`;
            return;
        }

        const fam = window.families.find(f => f.id === famId);
        if (!fam) return;

        const characters = window.characters || [];
        const rootChar = characters.find(c => String(c.id) === String(fam.rootId));
        
        if (!rootChar) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-ghost"></i>
                    <p>Thủy tổ của gia phả này không còn tồn tại!</p>
                </div>`;
            return;
        }

        let html = '<div class="tree-wrapper" id="familyTreeWrapper"><div class="tree"><ul>';
        html += this.buildNode(rootChar, characters);
        html += '</ul></div></div>';
        
        container.innerHTML = html;
        
        // Re-bind pan/zoom
        this.treeWrapper = document.getElementById('familyTreeWrapper');
        this.updateTransform();

        // Load ảnh bất đồng bộ từ IndexedDB
        await this.loadImages();
        
        // Update lại CSS active cho tab
        document.querySelectorAll('.family-tab').forEach(el => el.classList.remove('active'));
        const activeTab = Array.from(document.querySelectorAll('.family-tab')).find(el => el.getAttribute('onclick').includes(famId));
        if (activeTab) activeTab.classList.add('active');
    },

    buildNode(char, allChars) {
        let nodeHtml = `<li>`;
        
        let imgSrc = char.img || 'https://i.imgur.com/6X8FQyA.png';
        let imgTag = '';
        
        if (imgSrc.startsWith('http') || imgSrc.startsWith('data:')) {
            imgTag = `<img src="${imgSrc}" class="ft-avatar" onerror="this.src='https://i.imgur.com/6X8FQyA.png'">`;
        } else {
            imgTag = `<img src="https://i.imgur.com/6X8FQyA.png" class="ft-avatar" data-img-id="${imgSrc}">`;
        }

        // Tự động tìm Vợ/Chồng từ spouseId hoặc relations
        let spouseHtml = '';
        let spouseChar = null;
        
        // Ưu tiên spouseId
        if (char.spouseId) {
            spouseChar = allChars.find(c => String(c.id) === String(char.spouseId));
        } else if (char.relations) {
            // Hoặc tìm trong relations
            const spouseRel = char.relations.find(r => r.type.toLowerCase().includes('vợ') || r.type.toLowerCase().includes('chồng') || r.type.toLowerCase().includes('phu nhân') || r.type.toLowerCase().includes('phu quân'));
            if (spouseRel) {
                spouseChar = allChars.find(c => String(c.id) === String(spouseRel.targetId));
            }
        }

        const mainNodeUI = `
            <div class="tree-node" onclick="if(typeof openProfile === 'function') openProfile('${char.id}')">
                ${imgTag}
                <div class="ft-name">${char.name}</div>
            </div>
            
            <div class="ft-mini-menu" onclick="event.stopPropagation()">
                <button class="menu-item" title="Thêm Con Cái" onclick="FamilyTree.addChild('${char.id}')">
                    <i class="fa-solid fa-baby"></i>
                </button>
                <button class="menu-item spouse-btn" title="Thêm Vợ/Chồng" onclick="FamilyTree.addSpouse('${char.id}')">
                    <i class="fa-solid fa-heart"></i>
                </button>
                <button class="menu-item" title="Sửa Hồ Sơ" onclick="if(typeof editCharacter === 'function') editCharacter('${char.id}')">
                    <i class="fa-solid fa-pen-nib"></i>
                </button>
                <button class="menu-item delete" title="Xóa Khỏi Cây" onclick="FamilyTree.unlinkParent('${char.id}')">
                    <i class="fa-solid fa-link-slash"></i>
                </button>
            </div>
        `;

        // Nếu có vợ/chồng, bọc node chính và node phụ lại
        if (spouseChar) {
            let spImgSrc = spouseChar.img || 'https://i.imgur.com/6X8FQyA.png';
            let spImgTag = spImgSrc.startsWith('http') || spImgSrc.startsWith('data:') 
                ? `<img src="${spImgSrc}" class="ft-avatar" onerror="this.src='https://i.imgur.com/6X8FQyA.png'">`
                : `<img src="https://i.imgur.com/6X8FQyA.png" class="ft-avatar" data-img-id="${spImgSrc}">`;

            spouseHtml = `
                <div class="spouse-connector"><i class="fa-solid fa-heart"></i></div>
                <div class="tree-node spouse" onclick="if(typeof openProfile === 'function') openProfile('${spouseChar.id}')">
                    ${spImgTag}
                    <div class="ft-name">${spouseChar.name}</div>
                </div>
            `;
            
            nodeHtml += `<div class="tree-node-wrapper spouse-wrapper">${mainNodeUI} ${spouseHtml}</div>`;
        } else {
            nodeHtml += `<div class="tree-node-wrapper">${mainNodeUI}</div>`;
        }

        // Tìm con cái (Những nhân vật có fatherId hoặc motherId là char.id)
        // Nếu có spouseChar, lấy luôn con của spouseChar cho chắc
        let children = allChars.filter(c => String(c.fatherId) === String(char.id) || String(c.motherId) === String(char.id));
        
        if (spouseChar) {
            const spouseChildren = allChars.filter(c => String(c.fatherId) === String(spouseChar.id) || String(c.motherId) === String(spouseChar.id));
            // Gộp và loại bỏ trùng lặp
            spouseChildren.forEach(sc => {
                if (!children.find(c => c.id === sc.id)) children.push(sc);
            });
        }
        
        // Sort children theo tuổi (age) nếu có
        children.sort((a, b) => (b.age || 0) - (a.age || 0));

        if (children.length > 0) {
            nodeHtml += `<ul>`;
            children.forEach(child => {
                nodeHtml += this.buildNode(child, allChars);
            });
            nodeHtml += `</ul>`;
        }
        
        nodeHtml += `</li>`;
        return nodeHtml;
    },

    // ── CRUD ACTIONS ──
    addChild(parentId) {
        if (typeof openModal === 'function') {
            editingId = null; // Reset form
            openModal(); // Mở bảng tạo nhân vật
            
            // Tìm giới tính (để tự điền father hay mother)
            const char = window.characters.find(c => String(c.id) === String(parentId));
            setTimeout(() => {
                if (!char) return; // Guard: không tìm thấy nhân vật
                // Tùy theo logic mà gán cha hay mẹ
                const fatherSel = document.getElementById('charFather');
                if (fatherSel && char.gender !== 'Nữ') {
                    fatherSel.value = parentId;
                } else {
                    const motherSel = document.getElementById('charMother');
                    if (motherSel) motherSel.value = parentId;
                }
                if(typeof showToast === 'function') showToast("Đã chọn sẵn cha/mẹ cho nhân vật mới!", "info");
            }, 300);
        }
    },

    addSpouse(charId) {
        if (typeof openModal === 'function') {
            editingId = null;
            openModal();
            setTimeout(() => {
                if(typeof showToast === 'function') showToast("Vui lòng thêm Liên kết Vợ/Chồng trong mục 'Liên kết xã hội' sau khi lưu nhân vật!", "warning");
            }, 300);
        }
    },

    async unlinkParent(charId) {
        // Gỡ liên kết cha/mẹ của nhân vật này để tách khỏi cây
        if (!confirm("Trục xuất nhân vật này khỏi nhánh gia phả hiện tại? (Sẽ làm mất liên kết với cha/mẹ)")) return;
        
        const char = window.characters.find(c => String(c.id) === String(charId));
        if (char) {
            char.fatherId = "";
            char.motherId = "";
            if(typeof dbSave === 'function') await dbSave("characters", window.characters);
            if(typeof saveAndRefresh === 'function') await saveAndRefresh();
            this.render(this.activeFamilyId);
            if(typeof showToast === 'function') showToast("✅ Đã trục xuất khỏi nhánh gia phả", "success");
        }
    },

    // ── PAN & ZOOM LOGIC ──
    treeWrapper: null,
    transform: { x: 0, y: 0, scale: 1 },
    isDragging: false,
    startPan: { x: 0, y: 0 },

    initPanZoom() {
        const container = document.getElementById('familyTreeContainer');
        if (!container) return;
        // Guard: tránh gán listener nhiều lần khi init() được gọi lại
        if (container.dataset.panBound === "true") return;
        container.dataset.panBound = "true";

        container.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only left click
            this.isDragging = true;
            this.startPan.x = e.clientX - this.transform.x;
            this.startPan.y = e.clientY - this.transform.y;
            container.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.transform.x = e.clientX - this.startPan.x;
            this.transform.y = e.clientY - this.startPan.y;
            this.updateTransform();
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            container.style.cursor = 'grab';
        });

        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSensitivity = 0.001;
            const delta = e.deltaY * -zoomSensitivity;
            let newScale = this.transform.scale + delta;
            
            // Limit zoom
            newScale = Math.min(Math.max(0.3, newScale), 3);
            
            // Tính toán hướng zoom vào chuột (Pan under mouse)
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const scaleRatio = newScale / this.transform.scale;

            this.transform.x = mouseX - (mouseX - this.transform.x) * scaleRatio;
            this.transform.y = mouseY - (mouseY - this.transform.y) * scaleRatio;
            this.transform.scale = newScale;

            this.updateTransform();
        }, { passive: false });
    },

    updateTransform() {
        if (!this.treeWrapper) this.treeWrapper = document.getElementById('familyTreeWrapper');
        if (this.treeWrapper) {
            this.treeWrapper.style.transform = `translate(${this.transform.x}px, ${this.transform.y}px) scale(${this.transform.scale})`;
        }
    },

    async loadImages() {
        const avatars = document.querySelectorAll('.ft-avatar[data-img-id]');
        for(let img of avatars) {
            let imgId = img.getAttribute('data-img-id');
            if(imgId && typeof getImage === 'function') {
                try {
                    let url = await getImage(imgId);
                    if(url) img.src = url;
                } catch(e) {
                    console.warn("FamilyTree: Lỗi load ảnh", e);
                }
            }
        }
    }
};

// Gọi init khi chuyển sang tab FamilyTree
document.addEventListener('DOMContentLoaded', () => {
    // Đợi 1 chút để DOM sẵn sàng
    setTimeout(() => {
        if (window.families) FamilyTree.init();
    }, 500);
});
