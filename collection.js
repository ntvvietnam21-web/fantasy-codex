/* ==========================================================
   GM CODEX - COLLECTION SYSTEM (FINAL OPTIMIZED)
   ========================================================== */

let dbData = {
    weapons: [],
    skills: [],
    items: []
};

// Quản lý trạng thái làm việc (Sửa/Thêm)
let editingContext = {
    type: 'weapons', 
    id: null         
};

let currentTab = 'weapons'; 

// 1. KHỞI ĐỘNG HỆ THỐNG
window.addEventListener("load", async () => {
    try {
        if (typeof initImageDB === "function") {
            await initImageDB();
        }
        await loadAllDataFromDB();
        console.log("🚀 GM: Hệ thống Codex đã sẵn sàng!");
    } catch (err) {
        console.error("❌ Lỗi khởi động:", err);
    }
});

// 2. TẢI DỮ LIỆU
async function loadAllDataFromDB() {
    dbData.weapons = await dbGetCustom("weapons_data") || [];
    dbData.skills = await dbGetCustom("skills_data") || [];
    dbData.items = await dbGetCustom("items_data") || [];
    renderAll();
}

// 3. LƯU DỮ LIỆU (ADD & EDIT) - FIX TRIỆT ĐỂ LỖI TẠO MỚI
async function saveDataEntry() {
    const nameInput = document.getElementById("inpName");
    const extraInput = document.getElementById("inpExtra");
    const descInput = document.getElementById("inpDesc");
    const fileInput = document.getElementById("inpFile");

    const name = nameInput.value.trim();
    const extra = extraInput.value.trim();
    const desc = descInput.value.trim();
    const file = fileInput.files[0];

    if (!name) {
        alert("⚠️ GM: Tên gọi không được để trống!");
        return;
    }

    // XÁC ĐỊNH LOẠI VÀ ID
    const isEdit = (editingContext.id !== null);
    const type = editingContext.type || currentTab;
    
    // Tạo ID dạng String có Prefix để tránh lỗi trùng lặp và dễ quản lý
    const id = isEdit ? editingContext.id : `${type.toUpperCase()}_${Date.now()}`;
    
    let imgId = null;

    // Tìm item cũ để giữ lại ảnh nếu không chọn file mới
    const oldItem = dbData[type].find(i => i.id === id);
    if (oldItem) imgId = oldItem.image;

    // Xử lý upload ảnh mới
    if (file) {
        const newImgId = `IMG_${id}`;
        try {
            await saveImage(newImgId, file);
            imgId = newImgId; 
        } catch (e) {
            console.error("❌ Lỗi lưu ảnh:", e);
        }
    }

    const newItem = {
        id: id,
        name: name,
        desc: desc,
        image: imgId,
        power: extra,
        updatedAt: Date.now()
    };

    // Cập nhật dữ liệu cục bộ
    if (isEdit) {
        const index = dbData[type].findIndex(i => i.id === id);
        if (index !== -1) dbData[type][index] = newItem;
    } else {
        dbData[type].push(newItem);
    }

    // Đồng bộ vào DB
    await syncDatabase();
    closeModal();
    
    // Ép buộc render lại đúng Tab vừa thao tác
    const containerId = type === 'weapons' ? 'weaponList' : (type === 'skills' ? 'skillList' : 'itemList');
    renderList(type, containerId);
    
    console.log(`✅ GM: Đã ${isEdit ? "cập nhật" : "tạo mới"} [${type}] thành công!`);
}

// 4. HIỂN THỊ DANH SÁCH
function renderList(type, containerId) {
    const list = document.getElementById(containerId);
    if (!list) return;
    list.innerHTML = "";

    dbData[type].forEach((item) => {
        const card = document.createElement("div");
        card.className = "card";
        const domImgId = `img-render-${item.id}`;
        
        card.innerHTML = `
            <img id="${domImgId}" src="https://via.placeholder.com/200?text=Loading..." 
                 onclick="showDetail('${type}', '${item.id}')" style="cursor:pointer">
            <div class="card-info" style="padding: 10px;">
                <h3 style="margin:0; font-size:14px; color:#ffd700;">${item.name}</h3>
                ${item.power ? `<p style="margin:5px 0 0; font-size:11px; opacity:0.7;">⚔️ ${item.power}</p>` : ''}
            </div>
            <div class="card-actions" style="display:flex; gap:5px; padding:0 10px 10px;">
                <button onclick="event.stopPropagation(); prepareEdit('${type}', '${item.id}')" style="flex:1; cursor:pointer;">✏️ Sửa</button>
                <button onclick="event.stopPropagation(); deleteEntry('${type}', '${item.id}')" style="flex:1; cursor:pointer;">🗑️ Xóa</button>
            </div>
        `;
        list.appendChild(card);

        // Load ảnh từ DB
        if (item.image) {
            getImage(item.image).then(src => {
                const imgEl = document.getElementById(domImgId);
                if (imgEl) imgEl.src = src || "https://via.placeholder.com/200?text=No+Image";
            });
        } else {
            const imgEl = document.getElementById(domImgId);
            if (imgEl) imgEl.src = "https://via.placeholder.com/200?text=No+Image";
        }
    });
}

function renderAll() {
    renderList('weapons', 'weaponList');
    renderList('skills', 'skillList');
    renderList('items', 'itemList');
}

// 5. MỞ MODAL & CHUYỂN TAB
function openCurrentModal() {
    // Luôn reset Context về trạng thái THÊM MỚI theo Tab đang đứng
    editingContext = { type: currentTab, id: null };
    resetMasterForm();
    
    const title = document.getElementById("modalTitle");
    const labelExtra = document.getElementById("labelExtra");
    const extraInp = document.getElementById("inpExtra");

    if (currentTab === 'weapons') {
        title.innerText = "Thêm Vũ Khí Mới";
        labelExtra.innerText = "Sức mạnh";
        extraInp.parentElement.style.display = "block";
    } else if (currentTab === 'skills') {
        title.innerText = "Thêm Kỹ Năng Mới";
        extraInp.parentElement.style.display = "none";
    } else {
        title.innerText = "Thêm Vật Phẩm Mới";
        labelExtra.innerText = "Số lượng/Loại";
        extraInp.parentElement.style.display = "block";
    }
    
    document.getElementById("masterModal").style.display = "flex";
}

function quickAdd(type) {
    const menuItems = document.querySelectorAll('.sidebar .menu-item');
    let targetIndex = (type === 'weapons') ? 0 : (type === 'skills' ? 1 : 2);
    showTab(type, menuItems[targetIndex]);
    openCurrentModal();
}

function prepareEdit(type, id) {
    const item = dbData[type].find(i => i.id === id);
    if (!item) return;

    editingContext = { type: type, id: id };
    currentTab = type; 

    document.getElementById("inpName").value = item.name;
    document.getElementById("inpDesc").value = item.desc;
    document.getElementById("inpExtra").value = item.power || "";
    
    document.getElementById("modalTitle").innerText = "Chỉnh sửa Codex";
    document.getElementById("inpExtra").parentElement.style.display = (type === 'skills') ? "none" : "block";
    document.getElementById("masterModal").style.display = "flex";
}

function showTab(tab, el) {
    currentTab = tab; 
    document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
    const activeTab = document.getElementById(tab);
    if (activeTab) activeTab.classList.remove("hidden");
    
    document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
    if (el) el.classList.add("active");

    const fab = document.getElementById("mainAddBtn");
    if (fab) {
        const colors = {
            'weapons': "linear-gradient(135deg, #ff4757, #ff6b81)",
            'skills': "linear-gradient(135deg, #00d4ff, #0084ff)",
            'items': "linear-gradient(135deg, #ffa502, #ff7f50)"
        };
        fab.style.background = colors[tab] || "#333";
    }
    
    document.getElementById("searchInput").value = "";
    handleSearch();
}

// 6. TÌM KIẾM, XÓA, CHI TIẾT
function handleSearch() {
    const query = document.getElementById("searchInput").value.toLowerCase().trim();
    const containerId = currentTab === 'weapons' ? 'weaponList' : (currentTab === 'skills' ? 'skillList' : 'itemList');
    const cards = document.querySelectorAll(`#${containerId} .card`);
    
    cards.forEach(card => {
        const name = card.querySelector("h3").innerText.toLowerCase();
        card.style.display = (query === "" || name.includes(query)) ? "" : "none";
    });
}

async function deleteEntry(type, id) {
    if (!confirm(`GM: Xóa mục này khỏi Codex?`)) return;
    const item = dbData[type].find(i => i.id === id);
    if (item && item.image) await deleteImage(item.image);

    dbData[type] = dbData[type].filter(i => i.id !== id);
    await syncDatabase();
    
    const containerId = type === 'weapons' ? 'weaponList' : (type === 'skills' ? 'skillList' : 'itemList');
    renderList(type, containerId);
}

async function showDetail(type, id) {
    const item = dbData[type].find(i => i.id === id);
    if (!item) return;
    
    const detailContent = document.getElementById("detailContent");
    let imgSrc = "https://via.placeholder.com/400?text=No+Image";
    if (item.image) {
        const src = await getImage(item.image);
        if (src) imgSrc = src;
    }

    detailContent.innerHTML = `
        <h2 style="color:#ffd700; margin-bottom:15px;">${item.name}</h2>
        <img src="${imgSrc}" style="width:100%; border-radius:8px; margin-bottom:15px; border: 1px solid #444;">
        ${item.power ? `<p><strong>Thông số:</strong> ${item.power}</p>` : ''}
        <p style="white-space:pre-wrap; color:#ccc; line-height:1.6;">${item.desc || "Không có mô tả."}</p>
    `;

    document.getElementById("detailModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("masterModal").style.display = "none";
    document.getElementById("detailModal").style.display = "none";
    editingContext = { type: currentTab, id: null };
}

function resetMasterForm() {
    document.getElementById("inpName").value = "";
    document.getElementById("inpExtra").value = "";
    document.getElementById("inpDesc").value = "";
    document.getElementById("inpFile").value = "";
}

// 7. DATABASE HELPERS
async function syncDatabase() {
    try {
        await dbSaveCustom("weapons_data", dbData.weapons);
        await dbSaveCustom("skills_data", dbData.skills);
        await dbSaveCustom("items_data", dbData.items);
        console.log("✅ GM: Dữ liệu đã đồng bộ.");
    } catch (err) {
        console.error("❌ GM: Lỗi đồng bộ:", err);
    }
}

function dbSaveCustom(key, data) {
    return new Promise((resolve, reject) => {
        if (!imageDB) return reject();
        const tx = imageDB.transaction("images", "readwrite");
        const store = tx.objectStore("images");
        store.put({ key, id: key, data: JSON.parse(JSON.stringify(data)), timestamp: Date.now() });
        tx.oncomplete = () => resolve(true);
    });
}

function dbGetCustom(key) {
    return new Promise((resolve) => {
        if (!imageDB) return resolve(null);
        const tx = imageDB.transaction("images", "readonly");
        const store = tx.objectStore("images");
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.data : null);
        request.onerror = () => resolve(null);
    });
}
