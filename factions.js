window.factions = window.factions || []; 
let editingFaction = -1;
window.currentFactionStructure = []; 
function getCharacters(){
    return window.characters || [];
}
function getFactionMembers(f){
let chars = getCharacters();
return chars.filter(c =>
c.faction === f.id
);
}
async function renderFactions() {
    const list = document.getElementById("factionList");
    if (!list) return;
    list.innerHTML = "";
    const allFactions = window.factions || [];
    const allChars = window.characters || [];
    const countEl = document.getElementById("factionCount");
    if (countEl) countEl.innerText = allFactions.length;

    allFactions.forEach((f, i) => {
        const membersCount = allChars.filter(c => String(c.faction) === String(f.id)).length;

        const card = document.createElement("div");
        card.className = "card faction-card";
        
        // GM: Cấu trúc lại để phần nội dung chiếm trọn vùng click, trừ cụm nút Sửa/Xóa
        card.innerHTML = `
            <div class="faction-card-inner" style="cursor:pointer; display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <img id="f-icon-${f.id}" src="https://i.imgur.com/6X8FQyA.png" style="width:50px; height:50px; object-fit:cover; border-radius:10px; border:1px solid var(--border);">
                    <div>
                        <h3 style="margin:0; color:var(--gold);">${f.name}</h3>
                        <p style="margin:0; font-size:0.8rem; color:var(--text-dim);">Thủ lĩnh: ${f.leader || "Ẩn danh"}</p>
                    </div>
                </div>
                <div style="font-size:0.85rem;">
                    <b>Thành viên:</b> <span class="accent">${membersCount}</span>
                </div>
            </div>
            <div class="race-buttons" style="margin-top:10px; display:flex; gap:5px;">
                <button onclick="event.stopPropagation(); editFaction(${i})" style="flex:1;">Sửa</button>
                <button onclick="event.stopPropagation(); deleteFaction(${i})" style="flex:1; background:rgba(248,113,113,0.1); color:#f87171;">Xóa</button>
            </div>
        `;
        
        // GM: Gán sự kiện click vào phần 'inner' để mở trang chi tiết
        const innerCard = card.querySelector(".faction-card-inner");
        innerCard.onclick = () => {
            console.log("🚀 GM: Đang mở phe phái:", f.name);
            openFactionPage(i);
        };
        
        list.appendChild(card);

        // Nạp ảnh icon từ IndexedDB (Bất đồng bộ)
        if (f.icon) {
            const imgElement = document.getElementById(`f-icon-${f.id}`);
            if (imgElement) {
                // Nếu là URL thì gán luôn, nếu là key thì lấy từ Store
                if (f.icon.startsWith("http") || f.icon.startsWith("data:")) {
                    imgElement.src = f.icon;
                } else if (typeof getImage === "function") {
                    getImage(f.icon).then(src => { 
                        if(src) imgElement.src = src; 
                    });
                }
            }
        }
    });
}
async function saveFaction() {
    const val = (id) => document.getElementById(id)?.value.trim() || "";
    const name = val("factionName");

    if (!name) { 
        if (typeof showToast === "function") showToast("⚠️ Tên phe phái là bắt buộc!", "error"); 
        return; 
    }
    
    let isEdit = editingFaction >= 0;
    let factionId = isEdit ? window.factions[editingFaction].id : "f_" + Date.now();
    
    // 1. Xử lý lưu trữ hình ảnh
    let iconKey = isEdit ? window.factions[editingFaction].icon : "";
    let bannerKey = isEdit ? window.factions[editingFaction].banner : "";

    const iconFile = document.getElementById("factionIcon")?.files[0];
    if (iconFile) {
        iconKey = factionId + "_icon_" + Date.now();
        if (typeof saveImage === "function") await saveImage(iconKey, iconFile);
    }

    const bannerFile = document.getElementById("factionBanner")?.files[0];
    if (bannerFile) {
        bannerKey = factionId + "_banner_" + Date.now();
        if (typeof saveImage === "function") await saveImage(bannerKey, bannerFile);
    }

    // 2. Thu thập dữ liệu ngoại giao
    const diplomacy = typeof getDiplomacyDataFromUI === "function" ? 
                        getDiplomacyDataFromUI('factionDiplomacyList') : [];

    // 3. QUAN TRỌNG: Thu thập cấu trúc chức vụ từ bộ nhớ tạm
    // Đảm bảo clone sâu để tránh lỗi tham chiếu
    const structure = JSON.parse(JSON.stringify(window.currentFactionStructure || []));

    const obj = {
        id: factionId,
        name: name,
        leader: val("factionLeader"),
        hq: val("factionHQ"),
        founded: val("factionFounded"),
        scale: val("factionScale"),
        power: val("factionPower"),
        goal: val("factionGoal"),
        ideology: val("factionIdeology"), 
        desc: val("factionDesc"),
        diplomacy: diplomacy,
        structure: structure, 
        icon: iconKey,
        banner: bannerKey,
        updatedAt: Date.now()
    };

    // 4. Cập nhật vào mảng dữ liệu toàn cục
    if (isEdit) {
        window.factions[editingFaction] = obj;
    } else {
        window.factions.push(obj);
    }

    // 5. Lưu vào Database (IndexedDB)
    if (typeof saveAndRefresh === "function") {
        await saveAndRefresh();
    } else {
        if (typeof dbSave === "function") await dbSave("factions", window.factions);
        if (typeof renderFactions === "function") await renderFactions();
    }
    
    // 6. Cập nhật các thành phần liên quan khác
    if (typeof updateFactionOptions === "function") updateFactionOptions();
    if (typeof renderDiplomacyNetwork === "function") renderDiplomacyNetwork('faction', 'factionNetworkCanvas');
    
    // 7. KIỂM TRA HIỂN THỊ CHI TIẾT
    // Nếu trang chi tiết đang mở, gọi hàm vẽ lại cây chức vụ ngay lập tức
    const factionPage = document.getElementById("factionPage");
    if (factionPage && !factionPage.classList.contains("hidden")) {
        if (typeof renderFactionTreeDisplay === "function") {
            console.log("🚀 GM: Đang vẽ lại cấu trúc chức vụ cho:", obj.name);
            renderFactionTreeDisplay(obj);
        }
    }
    
    closeFactionModal();
    if (typeof showToast === "function") showToast("✅ Đã cập nhật biên niên sử phe phái!");
}

function editFaction(i) {
    const f = window.factions[i];
    if (!f) return;
    
    editingFaction = i;
    
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || "";
    };

    setVal("factionName", f.name);
    setVal("factionLeader", f.leader);
    setVal("factionHQ", f.hq);
    setVal("factionFounded", f.founded);
    setVal("factionScale", f.scale);
    setVal("factionPower", f.power);
    setVal("factionGoal", f.goal);
    setVal("factionIdeology", f.ideology);
    setVal("factionDesc", f.desc);

    // GM: Nạp cấu trúc Tab & Chức vụ từ IndexedDB data vào biến tạm
    window.currentFactionStructure = f.structure ? JSON.parse(JSON.stringify(f.structure)) : [];
    if (typeof renderFactionStructureAdmin === "function") renderFactionStructureAdmin();

    const dipContainer = document.getElementById('factionDiplomacyList');
    if (dipContainer) {
        dipContainer.innerHTML = "";
        if (f.diplomacy && Array.isArray(f.diplomacy)) {
            f.diplomacy.forEach(rel => {
                if (typeof addRelationRow === "function") addRelationRow('factionDiplomacyList', rel);
            });
        }
    }

    const modal = document.getElementById("factionModal");
    if (modal) modal.style.display = "flex";
}
async function deleteFaction(index) {
    if (!confirm("Bạn có chắc chắn muốn xóa phe phái này?")) return;
    const faction = window.factions[index];
    if (faction.icon) await deleteImage(faction.icon);
    if (faction.banner) await deleteImage(faction.banner);

    window.factions.splice(index, 1);
    await dbSave("factions", window.factions);
    renderFactions();
}
function resetFactionForm() {
    const fields = [
        "factionName", "factionLeader", "factionHQ", "factionFounded", 
        "factionScale", "factionPower", "factionGoal", "factionIdeology", "factionDesc"
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    // GM: Reset biến cấu trúc tạm thời
    window.currentFactionStructure = [];
    if (typeof renderFactionStructureAdmin === "function") renderFactionStructureAdmin();

    const dipContainer = document.getElementById('factionDiplomacyList');
    if (dipContainer) dipContainer.innerHTML = "";

    if (document.getElementById("factionIcon")) document.getElementById("factionIcon").value = "";
    if (document.getElementById("factionBanner")) document.getElementById("factionBanner").value = "";
    
    // Reset ảnh preview
    if(document.getElementById("prevIcon")) document.getElementById("prevIcon").src = "https://i.imgur.com/6X8FQyA.png";
    if(document.getElementById("prevBanner")) document.getElementById("prevBanner").src = "https://i.imgur.com/eE6C6Wv.png";
}
async function updateFactionOptions() {
    let select = document.getElementById("charFaction");
    if (!select) return;

    select.innerHTML = '<option value="">-- Chọn phe phái --</option>';
    const data = window.factions || [];
    data.forEach((f) => {
        let option = document.createElement("option");
        option.value = f.id;
        option.textContent = f.name;
        select.appendChild(option);
    });
}
document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (typeof reloadAllData === "function") {
            await reloadAllData();
            console.log("✅ GM: Dữ liệu đã nạp xong từ IndexedDB.");
        }
        window.factions = window.factions || [];
        window.characters = window.characters || [];
        if (typeof renderFactions === "function") await renderFactions();
        if (typeof updateFactionOptions === "function") updateFactionOptions();
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("editFaction")) {
            if (typeof loadEditFaction === "function") loadEditFaction();
        } else {
            if (typeof loadFactionPage === "function") loadFactionPage();
        }
    } catch (error) {
        console.error("❌ GM: Lỗi trong quá trình khởi tạo Factions:", error);
    }
});
async function openFactionPage(i) {
    let f;
    if (typeof i === 'string' && i.startsWith('f_')) {
        f = window.factions.find(item => item.id === i);
    } else {
        f = window.factions[i];
    }
    
    if (!f) return;

    if (typeof showPage === "function") {
        showPage("factionPage");
    } else {
        document.querySelectorAll('section.page').forEach(p => p.style.display = 'none');
        document.getElementById("factionPage").style.display = 'block';
    }

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || "Chưa rõ";
    };

    setText("factionPageName", f.name);
    setText("factionPageLeader", f.leader);
    setText("factionPageHQ", f.hq);
    setText("factionPageGoal", f.goal);
    setText("factionPageIdeology", f.ideology);
    setText("factionPageFounded", f.founded);
    setText("factionPageDesc", f.desc);
    setText("factionPagePower", `${f.power || 0}/1000`);

    // Render sơ đồ chức vụ
    if (typeof renderFactionTreeDisplay === "function") {
        renderFactionTreeDisplay(f);
    }

    // Render Diplomacy Tags
    const relContainer = document.getElementById("factionPageRelations");
    if (relContainer) {
        relContainer.innerHTML = "";
        if (typeof renderDiplomacyTags === "function") {
            renderDiplomacyTags("factionPageRelations", f.diplomacy || []);
        }
    }

    // Badge quy mô
    const scaleEl = document.getElementById("factionPageScaleBadge");
    if (scaleEl) {
        scaleEl.textContent = f.scale || "N/A";
        scaleEl.className = "badge " + (f.scale === "Toàn lục địa" ? "danger" : "info");
    }

    // Thanh sức mạnh (Animate Fill)
    const powerFill = document.getElementById("powerFill");
    if (powerFill) {
        const powerVal = parseInt(f.power) || 0;
        const percent = Math.min((powerVal / 1000) * 100, 100); 
        setTimeout(() => { powerFill.style.width = percent + "%"; }, 100);
    }

    // Xử lý ảnh Banner và Icon
    const handleImage = async (imgId, imgData) => {
        const el = document.getElementById(imgId);
        if (!el) return;
        const placeholder = imgId.includes("Banner") ? "https://i.imgur.com/eE6C6Wv.png" : "https://i.imgur.com/6X8FQyA.png";
        el.src = placeholder;
        if (imgData) {
            if (imgData.startsWith("http") || imgData.startsWith("data:")) {
                el.src = imgData;
            } else if (typeof getImage === "function") {
                const storedImg = await getImage(imgData);
                if (storedImg) el.src = storedImg;
            }
        }
    };

    await handleImage("factionPageBanner", f.banner);
    await handleImage("factionPageIcon", f.icon);
}
async function loadFactionCharacters(f) {
    let list = document.getElementById("factionCharacters");
    if (!list) return;
    list.innerHTML = "";
    let members = (window.characters || []).filter(c => String(c.faction) === String(f.id));

    if (members.length === 0) {
        list.innerHTML = "<p style='color:var(--text-dim); text-align:center; width:100%; padding:20px;'>Chưa có thành viên nào gia nhập.</p>";
        return;
    }

    const grid = document.createElement("div");
    grid.className = "character-grid"; 
    grid.style = "display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;";

    for (const c of members) {
        let div = document.createElement("div");
        div.className = "char-mini-card";
        div.style = "cursor:pointer; text-align:center; background:rgba(255,255,255,0.05); border-radius:8px; padding:10px; border:1px solid var(--border); transition: 0.3s;";

        div.innerHTML = `
            <img id="f-char-img-${c.id}" src="https://i.imgur.com/6X8FQyA.png" style="width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:50%; margin-bottom:8px; border:2px solid var(--gold);">
            <p style="font-size:0.8rem; margin:0; font-weight:bold; color:var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.name}</p>
        `;

        div.onclick = () => {
            if (typeof openProfile === "function") {
                openProfile(c.id);
                showPage("characterPage");
            }
        };
        grid.appendChild(div);

        if (c.img) {
            const imgEl = div.querySelector('img');
            const src = (c.img.startsWith("http") || c.img.startsWith("data:")) 
                        ? c.img 
                        : (typeof getImage === "function" ? await getImage(c.img) : "");
            if (imgEl && src) imgEl.src = src;
        }
    }
    list.appendChild(grid);
}

function renderFactionNodeEditor(node, allChars) {
    return `
        <div class="node-editor-item" style="margin-left:12px; border-left:1px dashed var(--gold); padding-left:8px; margin-top:8px;">
            <div style="display:flex; flex-wrap:wrap; gap:5px; align-items:center; background:rgba(0,0,0,0.2); padding:5px; border-radius:4px;">
                <input type="text" value="${node.title}" 
                    oninput="updateFactionNode('${node.id}', 'title', this.value)" 
                    placeholder="Chức vụ" 
                    style="flex:1; min-width:120px; font-size:0.8rem; padding:5px;">
                
                <select onchange="updateFactionNode('${node.id}', 'memberId', this.value)" 
                    style="flex:1; min-width:120px; font-size:0.8rem; padding:5px;">
                    <option value="">-- Nhân sự --</option>
                    ${allChars.map(c => `<option value="${c.id}" ${node.memberId == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
                
                <div style="display:flex; gap:2px;">
                    <button type="button" onclick="addFactionRole('${node.id}')" class="btn-mini" style="background:var(--primary); color:white; width:28px;">+</button>
                    <button type="button" onclick="removeFactionRole('${node.id}')" class="btn-mini" style="background:#ef4444; color:white; width:28px;">&times;</button>
                </div>
            </div>
            <div class="child-nodes">${node.children.map(c => renderFactionNodeEditor(c, allChars)).join('')}</div>
        </div>
    `;
}
function openFactionForm() {
    openFactionModal();
}

function closeFactionModal() {
    const modal = document.getElementById("factionModal");
    if (modal) {
        modal.style.display = "none";
    }
    
    // Reset trạng thái index đang chỉnh sửa
    editingFaction = -1;
    
    // Xóa dữ liệu cấu trúc tạm thời trong bộ nhớ để tránh rò rỉ dữ liệu sang lần mở sau
    window.currentFactionStructure = [];
    
    // Làm trống giao diện quản lý chức vụ (nếu có)
    const container = document.getElementById('factionStructureAdmin');
    if (container) container.innerHTML = "";
    
    console.log("🚀 GM: Đã đóng Modal Phe phái và giải phóng bộ nhớ tạm.");
}
function openFactionModal() {
    // Đưa trạng thái về tạo mới (-1)
    editingFaction = -1;
    
    // Gọi hàm reset các input text, date, textarea, image và diplomacy
    if (typeof resetFactionForm === "function") {
        resetFactionForm();
    }
    
    // Khởi tạo mảng cấu trúc chức vụ mới (dùng cho Unlimited Tabs & Tree)
    window.currentFactionStructure = [];
    
    // Render lại vùng quản lý chức vụ (lúc này sẽ trống)
    if (typeof renderFactionStructureAdmin === "function") {
        renderFactionStructureAdmin();
    }

    const modal = document.getElementById("factionModal");
    if (modal) {
        modal.style.display = "flex";
        console.log("🚀 GM: Đã mở Modal tạo Phe phái mới.");
    } else {
        // Thông báo lỗi nếu thiếu element trong index.html hoặc faction.html
        console.error("❌ GM: Không tìm thấy ID 'factionModal'. Hãy kiểm tra lại file HTML.");
        if (typeof showToast === "function") showToast("Lỗi hệ thống: Không tìm thấy khung giao diện!", "error");
    }
}

// --- LOGIC QUẢN LÝ CƠ CẤU (ADMIN) ---

function addFactionTab() {
    const name = prompt("Nhập tên Tab chức vụ (VD: Hội Đồng Tối Cao, Đội Đặc Nhiệm):");
    if (!name) return;
    window.currentFactionStructure.push({
        id: "ftab_" + Date.now(),
        name: name,
        treeNodes: []
    });
    renderFactionStructureAdmin();
}
function addFactionRole(parentId) {
    const newNode = { id: "frole_" + Date.now(), title: "Chức vụ mới", memberId: "", children: [] };
    
    const findAndAdd = (nodes) => {
        for (let n of nodes) {
            if (n.id === parentId) { n.children.push(newNode); return true; }
            if (n.children && findAndAdd(n.children)) return true;
        }
        return false;
    };

    window.currentFactionStructure.forEach(tab => {
        if (tab.id === parentId) tab.treeNodes.push(newNode);
        else findAndAdd(tab.treeNodes);
    });
    renderFactionStructureAdmin();
}
function removeFactionRole(id) {
    if(!confirm("Xóa chức vụ này và tất cả cấp dưới?")) return;
    const findAndRemove = (nodes) => {
        const idx = nodes.findIndex(n => n.id === id);
        if (idx !== -1) { nodes.splice(idx, 1); return true; }
        for (let n of nodes) { if (n.children && findAndRemove(n.children)) return true; }
        return false;
    };
    window.currentFactionStructure = window.currentFactionStructure.filter(t => t.id !== id);
    window.currentFactionStructure.forEach(tab => findAndRemove(tab.treeNodes));
    renderFactionStructureAdmin();
}
function updateFactionNode(id, field, value) {
    const findAndUpdate = (nodes) => {
        for (let n of nodes) {
            if (n.id === id) { n[field] = value; return true; }
            if (n.children && findAndUpdate(n.children)) return true;
        }
        return false;
    };
    window.currentFactionStructure.forEach(tab => findAndUpdate(tab.treeNodes));
}

function renderFactionStructureAdmin() {
    const container = document.getElementById('factionStructureAdmin');
    if (!container) return;

    // Xác định ID của phe phái đang chỉnh sửa
    let currentFactionId = null;
    if (editingFaction >= 0 && window.factions[editingFaction]) {
        currentFactionId = window.factions[editingFaction].id;
    }

    // Lọc danh sách nhân vật: Chỉ hiện nhân vật thuộc phe này
    // Nếu là tạo mới (currentFactionId chưa có), danh sách sẽ trống để tránh nhầm lẫn
    const filteredChars = (window.characters || []).filter(c => 
        currentFactionId && String(c.faction) === String(currentFactionId)
    );

    container.innerHTML = window.currentFactionStructure.map(tab => `
        <div class="admin-tab-group" style="border:1px solid var(--border); padding:10px; margin-bottom:10px; border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <b style="color:var(--gold)">${tab.name}</b>
                <button type="button" onclick="addFactionRole('${tab.id}')" class="btn-mini">+ Thêm chức vụ gốc</button>
            </div>
            <div class="tree-editor">
                ${tab.treeNodes.map(node => renderFactionNodeEditor(node, filteredChars)).join('')}
            </div>
            <button type="button" onclick="removeFactionRole('${tab.id}')" style="color:red; background:none; border:none; font-size:0.7rem; cursor:pointer;">Xóa Tab này</button>
        </div>
    `).join('');
}

function renderFactionTreeDisplay(f) {
    const container = document.getElementById("factionCharacters");
    if (!container) return;
    if (!f.structure || f.structure.length === 0) {
        if (typeof loadFactionCharacters === "function") {
            loadFactionCharacters(f);
        }
        return;
    }

    let html = `<div class="faction-structure-view" style="width:100%; height:100%; display:flex; flex-direction:column;">`;
    
    // 1. Tab (Bộ phận) - Giữ nguyên nhưng tối ưu padding
    html += `<div class="structure-tabs" style="display:flex; gap:5px; margin-bottom:10px; overflow-x:auto; padding-bottom:5px; flex-shrink:0;">`;
    f.structure.forEach((tab, idx) => {
        html += `
            <button class="tab-btn ${idx === 0 ? 'active' : ''}" 
                onclick="switchFactionTab(this, '${tab.id}')"
                style="padding:5px 10px; background:var(--glass); border:1px solid var(--gold); color:var(--gold); border-radius:4px; cursor:pointer; white-space:nowrap; font-size:0.7rem;">
                ${tab.name}
            </button>`;
    });
    html += `</div>`;

    // 2. Nội dung các Tab - Ép cố định khung hình
    f.structure.forEach((tab, idx) => {
        // Cố định chiều cao và cấm cuộn tuyệt đối (overflow: hidden)
        html += `
            <div id="content-${tab.id}" class="tab-content faction-tree-container" 
                 style="display: ${idx === 0 ? 'flex' : 'none'}; 
                        width: 100%; 
                        height: 60vh; 
                        overflow: hidden; 
                        position: relative; 
                        justify-content: center; 
                        align-items: flex-start;
                        background: rgba(0,0,0,0.1);
                        border-radius: 8px;">
                
                <div class="tree-root" id="tree-root-${tab.id}" 
                     style="display:flex; flex-direction:column; align-items:center; transform-origin: top center; transition: transform 0.3s ease;">
                    ${tab.treeNodes.map(node => renderNodeRecursive(node)).join('')}
                </div>
            </div>`;
    });

    html += `</div>`;
    
    container.innerHTML = html;

    // 3. Logic tự động thu nhỏ để vừa màn hình Android (Auto-Fit)
    setTimeout(() => {
        f.structure.forEach(tab => {
            const root = document.getElementById(`tree-root-${tab.id}`);
            const wrapper = document.getElementById(`content-${tab.id}`);
            if (root && wrapper) {
                // Tính toán tỷ lệ co giãn dựa trên chiều rộng thực tế của hàng trăm node
                const scaleX = (wrapper.offsetWidth - 20) / root.scrollWidth;
                const scaleY = (wrapper.offsetHeight - 20) / root.scrollHeight;
                
                // Chọn tỷ lệ nhỏ nhất để không bị mất hình
                let finalScale = Math.min(scaleX, scaleY);
                
                // Nếu cây nhỏ hơn màn hình thì không phóng to, chỉ thu nhỏ khi cần
                if (finalScale > 1) finalScale = 1;

                root.style.transform = `scale(${finalScale})`;
            }
        });
    }, 100);

    // 4. Load ảnh
    if (typeof loadFactionNodeImages === "function") {
        loadFactionNodeImages();
    }
}


function switchFactionTab(btn, tabId) {
    const parent = btn.closest('.faction-structure-view');
    // Active button
    parent.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = "var(--glass)";
        b.style.color = "var(--gold)";
    });
    btn.classList.add('active');
    btn.style.background = "var(--gold)";
    btn.style.color = "black";

    // Show content
    parent.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    const target = document.getElementById(`content-${tabId}`);
    if (target) target.style.display = 'block';
}



function renderNodeRecursive(node) {
    const char = (window.characters || []).find(c => String(c.id) === String(node.memberId));
    const imgElementId = `node-img-${node.id}`;
    const placeholder = "https://i.imgur.com/6X8FQyA.png";
    
    const clickAction = char 
        ? `onclick="if(typeof openProfile === 'function'){ openProfile('${char.id}'); showPage('characterPage'); }"` 
        : "";

    const imgKeyAttr = (char && char.img) ? `data-img-key="${char.img}"` : "";

    const childrenHtml = (node.children && node.children.length > 0) 
        ? node.children.map(child => renderNodeRecursive(child)).join('') 
        : "";

    // Giữ nguyên cấu trúc ngang nhưng dùng các đơn vị cực nhỏ và flex-shrink
    return `
        <div class="tree-branch" style="display: flex; flex-direction: column; align-items: center; position: relative; flex: 0 0 auto;">
            
            <div class="node-card-wrapper" style="padding: 0 2px; position: relative; display: flex; flex-direction: column; align-items: center;">
                <div class="node-card ${char ? 'has-member' : 'empty-member'}" 
                     ${clickAction}
                     style="text-align:center; background:var(--glass); border:1px solid var(--gold); padding:4px; border-radius:4px; width:60px; cursor:${char ? 'pointer' : 'default'}; position:relative; z-index: 2; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                    
                    <div style="font-size:0.4rem; color:var(--gold); text-transform:uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height:1;">
                        ${node.title || "CV"}
                    </div>
                    
                    <div style="width:20px; height:20px; margin: 2px auto; position:relative;">
                        <img id="${imgElementId}" 
                             src="${placeholder}" 
                             ${imgKeyAttr} 
                             class="faction-node-img"
                             style="width:100%; height:100%; border-radius:50%; object-fit:cover; border:0.5px solid var(--gold);">
                    </div>

                    <div style="font-weight:600; font-size:0.45rem; color:var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${char ? char.name : "..."}
                    </div>
                </div>

                ${childrenHtml ? `<div class="line-down" style="width:1px; height:10px; background:var(--gold); opacity:0.3;"></div>` : ''}
            </div>

            ${childrenHtml ? `
                <div class="node-children-container" style="display: flex; position: relative;">
                    <div class="line-horizontal" style="position: absolute; top: 0; left: 0; right: 0; height: 1px; background: var(--gold); opacity: 0.2; width: calc(100% - 60px); margin: 0 auto;"></div>
                    <div class="node-children-list" style="display: flex; gap: 4px; justify-content: center;">
                        ${childrenHtml}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}
async function loadFactionNodeImages() {
    const nodeImages = document.querySelectorAll('.faction-node-img[data-img-key]');
    for (const imgEl of nodeImages) {
        const imgKey = imgEl.getAttribute('data-img-key');
        if (!imgKey) continue;

        if (imgKey.startsWith("http") || imgKey.startsWith("data:")) {
            imgEl.src = imgKey;
        } else if (typeof getImage === "function") {
            try {
                const blobUrl = await getImage(imgKey);
                if (blobUrl) imgEl.src = blobUrl;
            } catch (err) {
                console.warn("❌ Lỗi nạp ảnh từ DB:", err);
            }
        }
    }
}
function switchFactionTab(btn, tabId) {
    const parent = btn.parentElement.parentElement;
    parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    parent.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.getElementById('content-' + tabId).style.display = 'block';
}
