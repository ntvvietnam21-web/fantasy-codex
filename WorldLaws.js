const WorldLawModule = {
    DB_NAME: "WorldLawsDB",
    DB_VERSION: 2, // Tăng version để update thêm store mới
    STORE_NAME: "laws",
    STORE_CATEGORIES: "categories", // Store mới cho Tabs
    db: null,
    currentTab: "", 
    editingId: null
};

const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(WorldLawModule.DB_NAME, WorldLawModule.DB_VERSION);

        request.onupgradeneeded = (e) => {
            WorldLawModule.db = e.target.result;
            if (!WorldLawModule.db.objectStoreNames.contains(WorldLawModule.STORE_NAME)) {
                WorldLawModule.db.createObjectStore(WorldLawModule.STORE_NAME, { keyPath: "id", autoIncrement: true });
            }
            if (!WorldLawModule.db.objectStoreNames.contains(WorldLawModule.STORE_CATEGORIES)) {
                WorldLawModule.db.createObjectStore(WorldLawModule.STORE_CATEGORIES, { keyPath: "name" });
            }
        };

        request.onsuccess = async (e) => {
            WorldLawModule.db = e.target.result;
            // Kiểm tra và thiết lập tab hiện tại dựa trên dữ liệu thực tế
            const categories = await getAllCategories();
            if (categories.length > 0) {
                if (!WorldLawModule.currentTab) WorldLawModule.currentTab = categories[0].name;
            }
            resolve(WorldLawModule.db);
            renderWorldLaws();
        };

        request.onerror = (e) => reject("Lỗi mở Database: " + e.target.errorCode);
    });
};
async function checkDefaultCategories() {
    return;
}





async function getAllCategories() {
    return new Promise((resolve) => {
        const transaction = WorldLawModule.db.transaction([WorldLawModule.STORE_CATEGORIES], "readonly");
        const store = transaction.objectStore(WorldLawModule.STORE_CATEGORIES);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
    });
}
async function saveCategory(name) {
    return new Promise((resolve) => {
        const transaction = WorldLawModule.db.transaction([WorldLawModule.STORE_CATEGORIES], "readwrite");
        const store = transaction.objectStore(WorldLawModule.STORE_CATEGORIES);
        store.put({ name: name.trim() });
        transaction.oncomplete = () => resolve();
    });
}
async function addNewCategory() {
    const newName = prompt("Nhập tên Chương Luật mới (Ví dụ: Luật Thời Gian, Luật Hải Tặc...):");
    if (newName && newName.trim() !== "") {
        await saveCategory(newName);
        WorldLawModule.currentTab = newName.trim();
        renderWorldLaws();
    }
}
async function deleteCategory(name) {
    if (!confirm(`Bạn có chắc muốn xóa toàn bộ chương [${name}]? Các điều luật thuộc chương này sẽ bị mất danh mục.`)) return;

    const transaction = WorldLawModule.db.transaction([WorldLawModule.STORE_CATEGORIES], "readwrite");
    const store = transaction.objectStore(WorldLawModule.STORE_CATEGORIES);
    await store.delete(name);

    transaction.oncomplete = async () => {
        const categories = await getAllCategories();
        if (categories.length > 0) {
            WorldLawModule.currentTab = categories[0].name;
        } else {
            WorldLawModule.currentTab = "";
        }
        renderWorldLaws();
    };
}

async function getAllLaws() {
    return new Promise((resolve) => {
        const transaction = WorldLawModule.db.transaction([WorldLawModule.STORE_NAME], "readonly");
        const store = transaction.objectStore(WorldLawModule.STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
    });
}
async function saveLaw(lawData) {
    return new Promise((resolve, reject) => {
        const transaction = WorldLawModule.db.transaction([WorldLawModule.STORE_NAME], "readwrite");
        const store = transaction.objectStore(WorldLawModule.STORE_NAME);
        
        let request;
        if (WorldLawModule.editingId) {
            // Dùng WorldLawModule.editingId
            request = store.put({ ...lawData, id: Number(WorldLawModule.editingId) });
        } else {
            request = store.add(lawData);
        }

        request.onsuccess = () => resolve();
        request.onerror = (e) => {
            console.error("Lỗi khi lưu luật:", e.target.error);
            reject(e.target.error);
        };
    });
}
async function deleteLaw(id) {
    if (!confirm("Bạn có chắc muốn xóa điều luật cổ xưa này khỏi dòng thời gian?")) return;
    
    const transaction = WorldLawModule.db.transaction([WorldLawModule.STORE_NAME], "readwrite");
    const store = transaction.objectStore(WorldLawModule.STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => renderWorldLaws();
}


async function renderWorldLaws() {
    const grid = document.getElementById('lawsGrid');
    const tabsContainer = document.getElementById('lawTabs');
    const lawCategorySelect = document.getElementById('lawCategory');

    if (!grid || !tabsContainer) return;

    const categories = await getAllCategories();
    
    // 1. Render Tabs (Chỉ Render những gì người dùng đã tạo)
    tabsContainer.innerHTML = categories.map(cat => `
        <div class="law-tab ${WorldLawModule.currentTab === cat.name ? 'active' : ''}" style="position:relative;">
            <span onclick="switchLawTab('${cat.name}')">${cat.name}</span>
            <i class="fa-solid fa-xmark" onclick="deleteCategory('${cat.name}')" 
               style="margin-left:8px; font-size:0.7rem; cursor:pointer; opacity:0.5; hover:opacity:1;"></i>
        </div>
    `).join('') + `
        <div class="law-tab add-tab-btn" onclick="addNewCategory()" title="Khai mở chương luật mới">
            <i class="fa-solid fa-plus"></i>
        </div>
    `;

    // 2. Cập nhật danh sách chọn trong Modal
    if (lawCategorySelect) {
        lawCategorySelect.innerHTML = categories.length > 0 
            ? categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('')
            : `<option value="">-- Chưa có chương luật --</option>`;
    }

    // 3. Nếu chưa có tab nào, hiển thị hướng dẫn
    if (categories.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center; grid-column: 1/-1; padding: 50px; opacity: 0.6;">
                <i class="fa-solid fa-scroll" style="font-size: 3rem; margin-bottom: 20px;"></i>
                <p>Thư viện trống rỗng. Hãy nhấn dấu (+) phía trên để khai mở chương luật đầu tiên.</p>
            </div>`;
        return;
    }

    // 4. Render danh sách điều luật
    const allLaws = await getAllLaws();
    const filteredLaws = allLaws.filter(l => l.category === WorldLawModule.currentTab);
    
    grid.style.opacity = "0";
    setTimeout(() => {
        if (filteredLaws.length === 0) {
            grid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; opacity: 0.5; padding: 30px;">
                Chương [${WorldLawModule.currentTab}] chưa được ghi chép điều luật nào.</p>`;
        } else {
            grid.innerHTML = filteredLaws.map(law => `
                <div class="law-card ${law.important ? 'important' : ''}" style="animation: summonCard 0.4s ease-out forwards">
                    <div class="law-actions" style="position:absolute; right:15px; top:15px; display:flex; gap:12px;">
                        <i class="fa-solid fa-pen-fancy" onclick="prepareEditLaw(${law.id})" style="color:var(--ancient-gold); cursor:pointer;"></i>
                        <i class="fa-solid fa-eraser" onclick="deleteLaw(${law.id})" style="color:#ff6b6b; cursor:pointer;"></i>
                    </div>
                    <h3>${law.title}</h3>
                    <div class="law-content-text">${law.content}</div>
                    ${law.important ? '<div class="seal">✦ ĐIỀU LUẬT TỐI CAO</div>' : ''}
                </div>
            `).join('');
        }
        grid.style.opacity = "1";
    }, 150);
}




function switchLawTab(cat) {
    WorldLawModule.currentTab = cat; // Cập nhật vào module
    renderWorldLaws();
}
function openLawModal() {
    WorldLawModule.editingId = null; // Reset ID trong module
    const form = document.getElementById('lawForm');
    if (form) form.reset();
    
    document.getElementById('modalTitle').innerText = "Triệu Hồi Điều Luật";
    document.getElementById('lawCategory').value = WorldLawModule.currentTab;
    document.getElementById('lawImportant').checked = false;
    document.getElementById('lawModal').style.display = 'flex';
}
function closeLawModal() {
    document.getElementById('lawModal').style.display = 'none';
}
async function prepareEditLaw(id) {
    const allLaws = await getAllLaws();
    const law = allLaws.find(l => Number(l.id) === Number(id));
    
    if (law) {
        WorldLawModule.editingId = law.id; // Gán vào module
        document.getElementById('modalTitle').innerText = "Chỉnh Sửa Bí Thuật";
        document.getElementById('lawTitle').value = law.title;
        document.getElementById('lawCategory').value = law.category;
        document.getElementById('lawContent').value = law.content;
        document.getElementById('lawImportant').checked = law.important;
        document.getElementById('lawModal').style.display = 'flex';
    } else {
        console.error("Không tìm thấy điều luật có ID:", id);
    }
}

async function handleLawSubmit(event) {
    event.preventDefault();
    try {
        const lawData = {
            title: document.getElementById('lawTitle').value.trim(),
            category: document.getElementById('lawCategory').value, // Lấy từ select
            content: document.getElementById('lawContent').value.trim(),
            important: document.getElementById('lawImportant').checked,
            updatedAt: new Date().getTime()
        };

        await saveLaw(lawData);
        WorldLawModule.currentTab = lawData.category; // Chuyển đến tab của luật vừa lưu
        closeLawModal();
        WorldLawModule.editingId = null; 
        await renderWorldLaws();
        
        if (typeof showToast === "function") showToast("✨ Pháp tắc đã được ghi chép!");
    } catch (error) {
        console.error("Lỗi:", error);
    }
}




document.addEventListener('DOMContentLoaded', initDB);
window.openLawModal = openLawModal;
window.closeLawModal = closeLawModal;
window.handleLawSubmit = handleLawSubmit;
window.switchLawTab = switchLawTab;
window.prepareEditLaw = prepareEditLaw;
window.deleteLaw = deleteLaw;
window.deleteCategory = deleteCategory;
window.addNewCategory = addNewCategory;

