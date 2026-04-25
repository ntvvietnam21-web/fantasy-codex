const DB_NAME = "CreatureCodexDB";
const DB_VERSION = 1;
const STORE_CREATURES = "creatures";
const STORE_IMAGES = "images";
let db;
let currentPage = 1;
const perPage = 12;
let editCreatureId = null;
// Khởi tạo Database
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_CREATURES)) {
                db.createObjectStore(STORE_CREATURES, { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains(STORE_IMAGES)) {
                db.createObjectStore(STORE_IMAGES, { keyPath: "id" });
            }
        };

        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };
        request.onerror = (e) => reject("Lỗi kết nối IndexedDB");
    });
};
async function getAllCreatures() {
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_CREATURES, "readonly");
        const store = tx.objectStore(STORE_CREATURES);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
    });
}
async function getCreatureImage(imgId) {
    if (!imgId) return "";
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_IMAGES, "readonly");
        const store = tx.objectStore(STORE_IMAGES);
        const req = store.get(imgId);
        req.onsuccess = () => {
            if (req.result && req.result.blob) {
                resolve(URL.createObjectURL(req.result.blob));
            }
            resolve("");
        };
        req.onerror = () => resolve("");
    });
}
async function showCreatures(page = 1) {
    currentPage = page;
    const creatureList = document.getElementById("creatureList");
    const searchVal = document.getElementById("creatureSearch")?.value.toLowerCase() || "";
    
    if (!creatureList) return;
    creatureList.innerHTML = `<div class="loading-spinner">Đang triệu hồi...</div>`;

    let all = await getAllCreatures();
    
    if (searchVal) {
        all = all.filter(c => 
            c.name.toLowerCase().includes(searchVal) || 
            (c.type && c.type.toLowerCase().includes(searchVal))
        );
    }

    const totalPages = Math.ceil(all.length / perPage);
    const start = (page - 1) * perPage;
    const items = all.slice(start, start + perPage);

    creatureList.innerHTML = "";

    for (const c of items) {
        const imgUrl = await getCreatureImage(c.imgId);
        const div = document.createElement("div");
        div.className = "creature-card glass-effect";
        div.innerHTML = `
            <div onclick="openCreatureDetail('${c.id}')" style="cursor:pointer;">
                <div class="card-img-container" style="position:relative; height:120px; overflow:hidden;">
                    <img src="${imgUrl || 'https://i.imgur.com/6X8FQyA.png'}" alt="${c.name}">
                    <div class="rank-badge">${c.rank || 'C'}</div>
                </div>
                <h4 class="cinzel-font" style="color:var(--gold);">${c.name}</h4>
                <p>${c.desc || '...'}</p>
            </div>
            <div class="card-actions">
                <button onclick="editCreature('${c.id}')" title="Sửa" class="btn-sm"><i class="fa fa-edit"></i></button>
                <button onclick="deleteCreature('${c.id}')" title="Xóa" class="btn-delete-card"><i class="fa fa-trash-alt"></i></button>
            </div>
        `;
        creatureList.appendChild(div);
    }
    renderPagination(totalPages);
}
function renderPagination(totalPages) {
    const pagination = document.getElementById("creaturePagination");
    if (!pagination) return;
    pagination.innerHTML = "";

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.innerText = i;
        btn.className = i === currentPage ? "pagination-btn active" : "pagination-btn";
        btn.onclick = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            showCreatures(i);
        };
        pagination.appendChild(btn);
    }
}
async function saveCreature() {
    const name = document.getElementById("creatureName").value;
    const type = document.getElementById("creatureType").value;
    const rank = document.getElementById("creatureRank").value;
    const desc = document.getElementById("creatureDesc").value;
    const fileInput = document.getElementById("creatureImg").files[0];

    const id = editCreatureId || Date.now().toString();
    let imgId = editCreatureId ? (await getCreatureData(editCreatureId))?.imgId : null;

    // Xử lý ảnh nếu có file mới
    if (fileInput) {
        imgId = "img_" + Date.now();
        const txImg = db.transaction(STORE_IMAGES, "readwrite");
        txImg.objectStore(STORE_IMAGES).put({ id: imgId, blob: fileInput });
    }

    const creatureData = { id, name, type, rank, desc, imgId, updatedAt: Date.now() };
    
    const tx = db.transaction(STORE_CREATURES, "readwrite");
    tx.objectStore(STORE_CREATURES).put(creatureData);

    tx.oncomplete = () => {
        showToast(editCreatureId ? "Đã cập nhật sinh vật!" : "Đã thêm sinh vật mới!");
        closeCreatureModal();
        showCreatures(currentPage);
    };
}
async function deleteCreature(id) {
    if (!confirm("Xóa sinh vật này khỏi sử sách?")) return;

    const data = await getCreatureData(id);
    const tx = db.transaction([STORE_CREATURES, STORE_IMAGES], "readwrite");
    
    tx.objectStore(STORE_CREATURES).delete(id);
    if (data.imgId) tx.objectStore(STORE_IMAGES).delete(data.imgId);

    tx.oncomplete = () => {
        showToast("Đã xóa sinh vật.");
        showCreatures(currentPage);
    };
}
async function editCreature(id) {
    const c = await getCreatureData(id);
    if (!c) return;

    editCreatureId = id;
    document.getElementById("creatureModal").style.display = "flex";
    document.getElementById("creatureName").value = c.name;
    document.getElementById("creatureType").value = c.type || "";
    document.getElementById("creatureRank").value = c.rank || "C";
    document.getElementById("creatureDesc").value = c.desc || "";
    
    const imgPreview = document.getElementById("creaturePreview");
    const currentImg = await getCreatureImage(c.imgId);
    if (currentImg) {
        imgPreview.src = currentImg;
        imgPreview.classList.remove("hidden");
    }
}
async function openCreatureDetail(id) {
    const c = await getCreatureData(id);
    if (!c) return;

    document.getElementById("detailCreatureName").innerText = c.name;
    document.getElementById("detailType").innerText = "Chủng loài: " + (c.type || "Chưa rõ");
    document.getElementById("detailRank").innerText = "RANK " + (c.rank || "C");
    document.getElementById("detailCreatureDesc").innerText = c.desc || "Không có dữ liệu mô tả về sinh vật này.";
    
    const header = document.getElementById("detailHeader");
    const imgUrl = await getCreatureImage(c.imgId);
    header.style.backgroundImage = `url('${imgUrl || 'https://i.imgur.com/6X8FQyA.png'}')`;

    document.getElementById("creatureDetailModal").style.display = "flex";
}
async function getCreatureData(id) {
    return new Promise(resolve => {
        const tx = db.transaction(STORE_CREATURES, "readonly");
        const req = tx.objectStore(STORE_CREATURES).get(id);
        req.onsuccess = () => resolve(req.result);
    });
}
function showToast(msg) {
    console.log("GM Codex:", msg);
}
window.addEventListener("DOMContentLoaded", async () => {
    await initDB();
    showCreatures();

    // Lắng nghe tìm kiếm
    document.getElementById("creatureSearch")?.addEventListener("input", () => {
        showCreatures(1);
    });
});
function openCreatureModal() { 
    editCreatureId = null; 
    document.getElementById("creatureForm").reset();
    document.getElementById("creaturePreview").classList.add("hidden");
    document.getElementById("creatureModal").style.display = "flex"; 
}
function closeCreatureModal() { document.getElementById("creatureModal").style.display = "none"; }
function closeCreatureDetailModal() { document.getElementById("creatureDetailModal").style.display = "none"; }
function previewCreatureImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            const img = document.getElementById("creaturePreview");
            img.src = e.target.result;
            img.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
    }
}
