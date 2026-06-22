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
        html += this.buildNode(rootChar, characters, 1);
        html += '</ul></div></div>';
        
        container.innerHTML = html;
        
        // Re-bind pan/zoom
        this.treeWrapper = document.getElementById('familyTreeWrapper');
        this.updateTransform();

        // Load ảnh bất đồng bộ từ IndexedDB
        await this.loadImages();
        
        // Cập nhật Thống kê
        this.calculateStats(rootChar, characters);
        
        // Update lại CSS active cho tab
        document.querySelectorAll('.family-tab').forEach(el => el.classList.remove('active'));
        const activeTab = Array.from(document.querySelectorAll('.family-tab')).find(el => el.getAttribute('onclick').includes(famId));
        if (activeTab) activeTab.classList.add('active');

        // Tự động căn chỉnh kích thước (Auto-fit) sau khi DOM render
        setTimeout(() => {
            const treeEl = document.querySelector('#familyTreeWrapper .tree');
            if (treeEl && container) {
                const treeWidth = treeEl.offsetWidth;
                const treeHeight = treeEl.offsetHeight;
                const viewWidth = container.offsetWidth;
                const viewHeight = container.offsetHeight;

                // Tính toán tỷ lệ scale để vừa màn hình (padding 40px)
                const scaleX = (viewWidth - 80) / treeWidth;
                const scaleY = (viewHeight - 80) / treeHeight;
                let finalScale = Math.min(scaleX, scaleY);
                if (finalScale > 1) finalScale = 1; // Không phóng to nếu nhỏ hơn màn hình
                if (finalScale < 0.3) finalScale = 0.3; // Giới hạn thu nhỏ

                // Căn giữa
                const scaledWidth = treeWidth * finalScale;
                const scaledHeight = treeHeight * finalScale;
                const x = (viewWidth - scaledWidth) / 2;
                const y = (viewHeight - scaledHeight) / 2;

                this.transform = { x: x, y: y, scale: finalScale };
                this.updateTransform();
            }
        }, 100);
    },

    buildNode(char, allChars, depth = 1) {
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
        let spouseChars = [];
        
        // Ưu tiên spouseId
        if (char.spouseId) {
            let sp = allChars.find(c => String(c.id) === String(char.spouseId));
            if (sp) spouseChars.push(sp);
        } 
        
        // Tìm toàn bộ trong relations (hỗ trợ đa thê/đa phu)
        if (char.relations) {
            char.relations.forEach(r => {
                const typeLow = r.type.toLowerCase();
                if (typeLow.includes('vợ') || typeLow.includes('chồng') || typeLow.includes('phu nhân') || typeLow.includes('phu quân') || typeLow.includes('thê thiếp') || typeLow.includes('phi tần') || typeLow.includes('hoàng hậu')) {
                    let sp = allChars.find(c => String(c.id) === String(r.targetId));
                    if (sp && !spouseChars.find(c => String(c.id) === String(sp.id))) {
                        spouseChars.push(sp);
                    }
                }
            });
        }

        let powerClass = "";
        if (char.power >= 800 || (char.stats && char.stats.magic >= 90)) powerClass = "magenta-breathe";
        else if (char.power >= 300 || (char.stats && char.stats.magic >= 60)) powerClass = "gold-breathe";

        const mainNodeUI = `
            <div class="tree-node ${powerClass}" onclick="if(typeof openProfile === 'function') openProfile('${char.id}')">
                <div class="ft-generation-label" style="position:absolute; top:-8px; left:5px; font-size:10px; background:#d4af37; color:#000; padding:2px 5px; border-radius:3px; font-weight:bold;">Đời ${depth}</div>
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

        // Nếu có vợ/chồng, bọc node chính và các node phụ lại
        if (spouseChars.length > 0) {
            spouseHtml = spouseChars.map(sp => {
                let spImgSrc = sp.img || 'https://i.imgur.com/6X8FQyA.png';
                let spImgTag = spImgSrc.startsWith('http') || spImgSrc.startsWith('data:') 
                    ? `<img src="${spImgSrc}" class="ft-avatar" onerror="this.src='https://i.imgur.com/6X8FQyA.png'">`
                    : `<img src="https://i.imgur.com/6X8FQyA.png" class="ft-avatar" data-img-id="${spImgSrc}">`;

                let spPowerClass = "";
                if (sp.power >= 800 || (sp.stats && sp.stats.magic >= 90)) spPowerClass = "magenta-breathe";
                else if (sp.power >= 300 || (sp.stats && sp.stats.magic >= 60)) spPowerClass = "gold-breathe";

                return `
                    <div class="spouse-connector-inline"><i class="fa-solid fa-heart"></i></div>
                    <div class="tree-node spouse ${spPowerClass}" onclick="if(typeof openProfile === 'function') openProfile('${sp.id}')">
                        ${spImgTag}
                        <div class="ft-name">${sp.name}</div>
                    </div>
                `;
            }).join('');
            
            nodeHtml += `<div class="tree-node-wrapper spouse-wrapper">${mainNodeUI} ${spouseHtml}</div>`;
        } else {
            nodeHtml += `<div class="tree-node-wrapper">${mainNodeUI}</div>`;
        }

        // Tìm con cái (Những nhân vật có fatherId hoặc motherId là char.id)
        // Nếu có spouseChar, lấy luôn con của spouseChar cho chắc
        let children = allChars.filter(c => String(c.fatherId) === String(char.id) || String(c.motherId) === String(char.id));
        
        if (spouseChars.length > 0) {
            spouseChars.forEach(sp => {
                const spChildren = allChars.filter(c => String(c.fatherId) === String(sp.id) || String(c.motherId) === String(sp.id));
                spChildren.forEach(sc => {
                    if (!children.find(c => String(c.id) === String(sc.id))) children.push(sc);
                });
            });
        }
        
        // Sort children theo tuổi (age) nếu có
        children.sort((a, b) => (b.age || 0) - (a.age || 0));

        if (children.length > 0) {
            // Nút collapse nếu có con cái
            nodeHtml += `<div class="ft-collapse-btn" onclick="FamilyTree.toggleCollapse(this)"><i class="fa-solid fa-minus"></i></div>`;
            nodeHtml += `<ul>`;
            children.forEach(child => {
                nodeHtml += this.buildNode(child, allChars, depth + 1);
            });
            nodeHtml += `</ul>`;
        }
        
        nodeHtml += `</li>`;
        return nodeHtml;
    },

    // ── CRUD ACTIONS ──
    linkTargetId: null,
    linkType: null, // 'child' or 'spouse'

    addChild(parentId) {
        this.linkTargetId = parentId;
        this.linkType = 'child';
        
        const parent = window.characters.find(c => String(c.id) === String(parentId));
        document.getElementById('ftLinkTitle').innerText = "Thêm Con cái";
        document.getElementById('ftLinkDesc').innerText = `Chọn nhân vật có sẵn để làm con của ${parent ? parent.name : 'nhân vật này'}.`;
        
        // Populate select (chỉ chọn người chưa có cha/mẹ tương ứng)
        const select = document.getElementById('ftLinkSelect');
        let html = '<option value="">-- Chọn Nhân vật --</option>';
        window.characters.forEach(c => {
            if (c.id === parentId) return; // Không chọn chính mình
            // Tùy giới tính cha/mẹ mà kiểm tra xem đứa trẻ đã có cha/mẹ chưa
            if (parent && parent.gender === 'Nam' && c.fatherId) return;
            if (parent && parent.gender === 'Nữ' && c.motherId) return;
            
            html += `<option value="${c.id}">${c.name}</option>`;
        });
        select.innerHTML = html;
        
        document.getElementById('ftLinkCharModal').classList.add('active');
    },

    addSpouse(charId) {
        this.linkTargetId = charId;
        this.linkType = 'spouse';
        
        const char = window.characters.find(c => String(c.id) === String(charId));
        document.getElementById('ftLinkTitle').innerText = "Thêm Vợ/Chồng";
        document.getElementById('ftLinkDesc').innerText = `Chọn nhân vật có sẵn để kết hôn với ${char ? char.name : 'nhân vật này'}.`;
        
        // Populate select
        const select = document.getElementById('ftLinkSelect');
        let html = '<option value="">-- Chọn Nhân vật --</option>';
        window.characters.forEach(c => {
            if (c.id === charId) return;
            html += `<option value="${c.id}">${c.name}</option>`;
        });
        select.innerHTML = html;
        
        document.getElementById('ftLinkCharModal').classList.add('active');
    },

    closeLinkModal() {
        document.getElementById('ftLinkCharModal').classList.remove('active');
        this.linkTargetId = null;
        this.linkType = null;
    },

    createNewCharFromLink() {
        const parentId = this.linkTargetId;
        const type = this.linkType;
        this.closeLinkModal();

        if (typeof openModal === 'function') {
            editingId = null; // Reset form
            openModal(); // Mở bảng tạo nhân vật
            
            if (type === 'child') {
                const char = window.characters.find(c => String(c.id) === String(parentId));
                setTimeout(() => {
                    if (!char) return;
                    const fatherSel = document.getElementById('charFather');
                    const motherSel = document.getElementById('charMother');
                    if (char.gender === 'Nam') {
                        if (fatherSel) fatherSel.value = parentId;
                    } else if (char.gender === 'Nữ') {
                        if (motherSel) motherSel.value = parentId;
                    } else {
                        if (fatherSel) fatherSel.value = parentId;
                    }
                    if(typeof showToast === 'function') showToast("Đã điền sẵn cha/mẹ cho nhân vật mới!", "info");
                }, 300);
            } else if (type === 'spouse') {
                setTimeout(() => {
                    if(typeof showToast === 'function') showToast("Hãy thêm Liên kết Vợ/Chồng trong mục 'Liên kết xã hội'!", "info");
                }, 300);
            }
        }
    },

    async confirmLinkChar() {
        const targetId = document.getElementById('ftLinkSelect').value;
        if (!targetId) {
            if(typeof showToast === 'function') showToast("Vui lòng chọn nhân vật!", "warning");
            return;
        }

        const parentId = this.linkTargetId;
        const parent = window.characters.find(c => String(c.id) === String(parentId));
        const child = window.characters.find(c => String(c.id) === String(targetId));

        if (!parent || !child) return;

        if (this.linkType === 'child') {
            if (parent.gender === 'Nam') {
                child.fatherId = parentId;
            } else if (parent.gender === 'Nữ') {
                child.motherId = parentId;
            } else {
                child.fatherId = parentId;
            }
            if(typeof showToast === 'function') showToast("Đã liên kết con cái thành công!", "success");
        } 
        else if (this.linkType === 'spouse') {
            // Add relation to BOTH characters if possible
            if (!parent.relations) parent.relations = [];
            parent.relations.push({ targetId: targetId, type: "Vợ/Chồng", description: "Kết hôn" });
            
            if (!child.relations) child.relations = [];
            child.relations.push({ targetId: parentId, type: "Vợ/Chồng", description: "Kết hôn" });

            if(typeof showToast === 'function') showToast("Đã liên kết vợ/chồng thành công!", "success");
        }

        if(typeof dbSave === 'function') await dbSave("characters", window.characters);
        if(typeof saveAndRefresh === 'function') await saveAndRefresh(); // Usually not defined globally, but safe
        
        this.closeLinkModal();
        this.render(this.activeFamilyId);
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

        // -- Touch Events (Mobile/Tablet Pan & Zoom) --
        let initialPinchDistance = null;
        let initialScale = 1;

        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.startPan.x = e.touches[0].clientX - this.transform.x;
                this.startPan.y = e.touches[0].clientY - this.transform.y;
            } else if (e.touches.length === 2) {
                this.isDragging = false;
                initialPinchDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                initialScale = this.transform.scale;
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (this.isDragging && e.touches.length === 1) {
                this.transform.x = e.touches[0].clientX - this.startPan.x;
                this.transform.y = e.touches[0].clientY - this.startPan.y;
                this.updateTransform();
            } else if (e.touches.length === 2 && initialPinchDistance !== null) {
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                let newScale = initialScale * (currentDistance / initialPinchDistance);
                newScale = Math.min(Math.max(0.3, newScale), 3);
                
                // Calculate center point of pinch for better zoom focus
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const rect = container.getBoundingClientRect();
                const mouseX = centerX - rect.left;
                const mouseY = centerY - rect.top;
                
                const scaleRatio = newScale / this.transform.scale;
                this.transform.x = mouseX - (mouseX - this.transform.x) * scaleRatio;
                this.transform.y = mouseY - (mouseY - this.transform.y) * scaleRatio;

                this.transform.scale = newScale;
                this.updateTransform();
            }
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                initialPinchDistance = null;
            }
            if (e.touches.length === 0) {
                this.isDragging = false;
            }
        });
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
    },

    // ── TÍNH NĂNG MỚI ──
    
    searchNodes(text) {
        text = text.toLowerCase().trim();
        const nodes = document.querySelectorAll('#familyTreeWrapper .tree-node-wrapper');
        if (!text) {
            nodes.forEach(n => { n.classList.remove('ft-dimmed'); n.classList.remove('ft-highlight'); });
            return;
        }
        nodes.forEach(n => {
            const nameEl = n.querySelector('.ft-name');
            if (nameEl && nameEl.innerText.toLowerCase().includes(text)) {
                n.classList.remove('ft-dimmed');
                n.classList.add('ft-highlight');
            } else {
                n.classList.add('ft-dimmed');
                n.classList.remove('ft-highlight');
            }
        });
    },

    filterBloodline(type) {
        if (!this.activeFamilyId) return;
        const fam = window.families.find(f => f.id === this.activeFamilyId);
        if (!fam) return;
        const rootChar = window.characters.find(c => String(c.id) === String(fam.rootId));
        if (!rootChar && type === 'sameRace') return;

        const nodes = document.querySelectorAll('#familyTreeWrapper .tree-node-wrapper');
        if (!type) {
            nodes.forEach(n => { n.classList.remove('ft-dimmed'); n.classList.remove('ft-highlight'); });
            return;
        }

        nodes.forEach(n => {
            // Get character ID from onclick
            const nodeEl = n.querySelector('.tree-node');
            if (!nodeEl) return;
            const match = nodeEl.getAttribute('onclick').match(/'([^']+)'/);
            if (!match) return;
            const charId = match[1];
            const char = window.characters.find(c => String(c.id) === charId);
            
            let isMatch = false;
            if (char) {
                if (type === 'male' && char.gender === 'Nam') isMatch = true;
                if (type === 'female' && char.gender === 'Nữ') isMatch = true;
                if (type === 'sameRace' && rootChar && char.race === rootChar.race) isMatch = true;
            }

            if (isMatch) {
                n.classList.remove('ft-dimmed');
                n.classList.add('ft-highlight');
            } else {
                n.classList.add('ft-dimmed');
                n.classList.remove('ft-highlight');
            }
        });
    },

    toggleFullscreen() {
        document.body.classList.toggle('ft-fullscreen-active');
        if (document.body.classList.contains('ft-fullscreen-active')) {
            // Add exit button if not exists
            if (!document.getElementById('ftExitFsBtn')) {
                const btn = document.createElement('button');
                btn.id = 'ftExitFsBtn';
                btn.className = 'ft-exit-fs';
                btn.innerHTML = '<i class="fa-solid fa-compress"></i> Thoát Toàn màn hình';
                btn.onclick = () => this.toggleFullscreen();
                document.body.appendChild(btn);
            } else {
                document.getElementById('ftExitFsBtn').style.display = 'block';
            }
            if(typeof showToast === 'function') showToast("Đã vào chế độ Toàn màn hình Gia phả!", "info");
        } else {
            const btn = document.getElementById('ftExitFsBtn');
            if (btn) btn.style.display = 'none';
        }
        // Timeout to recalculate auto-fit
        setTimeout(() => {
            this.render(this.activeFamilyId);
        }, 300);
    },

    calculateStats(rootChar, allChars) {
        let totalMembers = 0;
        let totalPower = 0;
        let maxDepth = 1;

        const traverse = (charId, currentDepth) => {
            totalMembers++;
            const c = allChars.find(x => String(x.id) === String(charId));
            if (c) totalPower += Number(c.power || 0);
            if (currentDepth > maxDepth) maxDepth = currentDepth;

            // Find children
            const children = allChars.filter(x => String(x.fatherId) === String(charId) || String(x.motherId) === String(charId));
            
            // Also find spouses
            let spouses = [];
            if (c && c.spouseId) spouses.push(c.spouseId);
            if (c && c.relations) {
                c.relations.forEach(r => {
                    const typeLow = r.type.toLowerCase();
                    if (typeLow.includes('vợ') || typeLow.includes('chồng') || typeLow.includes('phu nhân') || typeLow.includes('phu quân') || typeLow.includes('thê thiếp') || typeLow.includes('phi tần') || typeLow.includes('hoàng hậu')) {
                        if (!spouses.includes(r.targetId)) spouses.push(r.targetId);
                    }
                });
            }

            // Include spouses in total members but don't traverse from them to avoid infinite loops, just sum their power
            spouses.forEach(spId => {
                const sp = allChars.find(x => String(x.id) === String(spId));
                if (sp) {
                    totalMembers++;
                    totalPower += Number(sp.power || 0);
                    // Find children of spouse not already in children array
                    const spChildren = allChars.filter(x => String(x.fatherId) === String(spId) || String(x.motherId) === String(spId));
                    spChildren.forEach(sc => {
                        if (!children.find(x => String(x.id) === String(sc.id))) children.push(sc);
                    });
                }
            });

            children.forEach(child => traverse(child.id, currentDepth + 1));
        };

        if (rootChar) traverse(rootChar.id, 1);

        document.getElementById('ftStatTotal').innerText = totalMembers;
        document.getElementById('ftStatGen').innerText = maxDepth;
        document.getElementById('ftStatPower').innerText = totalPower.toLocaleString();
        
        const widget = document.getElementById('ftStatsWidget');
        if (widget) widget.classList.remove('hidden');
    },

    toggleCollapse(btnElement) {
        const liElement = btnElement.closest('li');
        if (liElement) {
            liElement.classList.toggle('ft-branch-hidden');
            if (liElement.classList.contains('ft-branch-hidden')) {
                btnElement.innerHTML = '<i class="fa-solid fa-plus"></i>';
            } else {
                btnElement.innerHTML = '<i class="fa-solid fa-minus"></i>';
            }
            this.updateTransform(); // Re-trigger repaint if needed
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
