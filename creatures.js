let currentPage = 1;
const perPage = 12;
let editCreatureId = null;
let allCreaturesList = []; // Để dùng cho dropdown Tiến hóa

async function migrateOldCreatures() {
    return new Promise((resolve) => {
        const req = indexedDB.open("CreatureCodexDB", 1);
        req.onsuccess = async (e) => {
            const oldDb = e.target.result;
            if (!oldDb.objectStoreNames.contains("creatures")) {
                return resolve(true);
            }
            const storeNames = ["creatures"];
            if (oldDb.objectStoreNames.contains("images")) storeNames.push("images");
            const tx = oldDb.transaction(storeNames, "readonly");
            const creaturesReq = tx.objectStore("creatures").getAll();
            const imagesReq = storeNames.includes("images") ? tx.objectStore("images").getAll() : null;
            
            creaturesReq.onsuccess = async () => {
                const oldCreatures = creaturesReq.result || [];
                if (oldCreatures.length === 0) return resolve(true);
                
                const oldImages = (imagesReq && imagesReq.result) || [];
                const imgMap = {};
                oldImages.forEach(img => imgMap[img.id] = img.blob);
                
                console.log("Di tản", oldCreatures.length, "quái vật cũ...");
                
                for (let c of oldCreatures) {
                    // Cứu ảnh cũ
                    if (c.imgId && imgMap[c.imgId]) {
                        const file = new File([imgMap[c.imgId]], "old_img.png", {type: imgMap[c.imgId].type});
                        await saveImage(c.imgId, file);
                    }
                    // Cấp phát stats ngẫu nhiên nếu chưa có
                    c.hp = c.hp || 100; c.atk = c.atk || 50; c.def = c.def || 50; c.spd = c.spd || 50;
                    c.skill = c.skill || "";
                    c.tameable = c.tameable || "false";
                    c.evolution = c.evolution || "";
                }
                
                try {
                    await dbSave("creatures", oldCreatures);
                    console.log("Di tản thành công", oldCreatures.length, "quái vật.");
                    indexedDB.deleteDatabase("CreatureCodexDB");
                } catch (e) {
                    console.error("Lỗi khi di tản quái vật:", e);
                }
                resolve(true);
            };
        };
        req.onerror = () => resolve(true);
    });
}

async function getAllCreatures() {
    return await dbGetAll("creatures") || [];
}

async function getCreatureImage(imgId) {
    if (!imgId) return "";
    return await getImage(imgId) || "";
}
async function showCreatures(page = 1) {
    currentPage = page;
    const creatureList = document.getElementById("creatureList");
    const searchVal = document.getElementById("creatureSearch")?.value.toLowerCase() || "";
    const filterRank = document.getElementById("creatureFilterRank")?.value || "";
    
    if (!creatureList) return;
    creatureList.innerHTML = `<div class="loading-spinner">Đang triệu hồi...</div>`;

    let all = await getAllCreatures();
    allCreaturesList = all; // Lưu vào cache
    
    // Cập nhật dropdown Tiến Hóa
    const evoSelect = document.getElementById("creatureEvolution");
    if (evoSelect) {
        let evoHtml = '<option value="">-- Không có --</option>';
        all.forEach(c => {
            evoHtml += `<option value="${c.id}">${c.name}</option>`;
        });
        evoSelect.innerHTML = evoHtml;
    }
    
    if (searchVal) {
        all = all.filter(c => 
            c.name.toLowerCase().includes(searchVal) || 
            (c.type && c.type.toLowerCase().includes(searchVal))
        );
    }
    
    if (filterRank) {
        all = all.filter(c => c.rank === filterRank);
    }

    if (all.length === 0) {
        creatureList.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px; font-style: italic;">Không tìm thấy sinh vật nào.</div>`;
        renderPagination(0);
        return;
    }

    const totalPages = Math.ceil(all.length / perPage);
    const start = (page - 1) * perPage;
    const items = all.slice(start, start + perPage);

    creatureList.innerHTML = "";

    for (const c of items) {
        const imgUrl = await getCreatureImage(c.imgId);
        const rankClass = c.rank ? `rank-${c.rank.toLowerCase()}` : "rank-c";
        
        const div = document.createElement("div");
        div.className = `creature-card glass-effect ${rankClass}`;
        div.innerHTML = `
            <div onclick="openCreatureDetail('${c.id}')" style="cursor:pointer; display:flex; flex-direction:column; flex:1;">
                <div class="card-img-container" style="position:relative; height:140px; overflow:hidden;">
                    <img src="${imgUrl || 'https://i.imgur.com/6X8FQyA.png'}" alt="${c.name}">
                    <div class="rank-badge">${c.rank || 'C'}</div>
                </div>
                <h4 class="cinzel-font">${c.name}</h4>
                <p>${c.desc || '...'}</p>
            </div>
            <div class="card-actions">
                <button onclick="editCreature('${c.id}')" title="Sửa" class="btn-sm"><i class="fa fa-edit"></i> Sửa</button>
                <button onclick="deleteCreature('${c.id}')" title="Xóa" class="btn-delete-card"><i class="fa fa-trash-alt"></i> Xóa</button>
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
    const habitat = document.getElementById("creatureHabitat") ? document.getElementById("creatureHabitat").value : "";
    const weakness = document.getElementById("creatureWeakness") ? document.getElementById("creatureWeakness").value : "";
    const drops = document.getElementById("creatureDrops") ? document.getElementById("creatureDrops").value : "";
    const hp = document.getElementById("statHP") ? parseInt(document.getElementById("statHP").value) : 100;
    const atk = document.getElementById("statATK") ? parseInt(document.getElementById("statATK").value) : 50;
    const def = document.getElementById("statDEF") ? parseInt(document.getElementById("statDEF").value) : 50;
    const spd = document.getElementById("statSPD") ? parseInt(document.getElementById("statSPD").value) : 50;
    const skill = document.getElementById("creatureSkill") ? document.getElementById("creatureSkill").value : "";
    const tameable = document.getElementById("creatureTameable") ? document.getElementById("creatureTameable").value : "false";
    const evolution = document.getElementById("creatureEvolution") ? document.getElementById("creatureEvolution").value : "";
    
    const fileInput = document.getElementById("creatureImg")?.files?.[0];

    const id = editCreatureId || "creature_" + Date.now();
    let imgId = editCreatureId ? (await getCreatureData(editCreatureId))?.imgId : null;

    if (fileInput) {
        imgId = "img_creature_" + Date.now();
        await saveImage(imgId, fileInput);
    }

    const creatureData = { id, name, type, rank, desc, habitat, weakness, drops, hp, atk, def, spd, skill, tameable, evolution, imgId, updatedAt: Date.now() };
    
    // Lấy DB hiện tại, add/update và lưu lại
    let all = await dbGetAll("creatures");
    let existingIndex = all.findIndex(c => c.id === id);
    if(existingIndex >= 0) all[existingIndex] = creatureData;
    else all.push(creatureData);
    
    await dbSave("creatures", all);

    showToast(editCreatureId ? "Đã cập nhật sinh vật!" : "Đã thêm sinh vật mới!");
    closeCreatureModal();
    showCreatures(currentPage);
}
async function deleteCreature(id) {
    if (!confirm("Xóa sinh vật này khỏi sử sách?")) return;

    const data = await getCreatureData(id);
    if (!data) return;
    
    let all = await dbGetAll("creatures");
    all = all.filter(c => c.id !== id);
    await dbSave("creatures", all);
    
    if (data.imgId) await deleteImage(data.imgId);

    showToast("Đã xóa sinh vật.");
    showCreatures(currentPage);
}
async function editCreature(id) {
    const c = await getCreatureData(id);
    if (!c) return;

    editCreatureId = id;
    resetFormTabs();
    document.getElementById("creatureModal").style.display = "flex";
    document.getElementById("creatureName").value = c.name;
    document.getElementById("creatureType").value = c.type || "";
    document.getElementById("creatureRank").value = c.rank || "C";
    document.getElementById("creatureDesc").value = c.desc || "";
    
    if (document.getElementById("creatureHabitat")) document.getElementById("creatureHabitat").value = c.habitat || "";
    if (document.getElementById("creatureWeakness")) document.getElementById("creatureWeakness").value = c.weakness || "";
    if (document.getElementById("creatureDrops")) document.getElementById("creatureDrops").value = c.drops || "";
    
    if (document.getElementById("statHP")) document.getElementById("statHP").value = c.hp || 100;
    if (document.getElementById("statATK")) document.getElementById("statATK").value = c.atk || 50;
    if (document.getElementById("statDEF")) document.getElementById("statDEF").value = c.def || 50;
    if (document.getElementById("statSPD")) document.getElementById("statSPD").value = c.spd || 50;
    if (document.getElementById("creatureSkill")) document.getElementById("creatureSkill").value = c.skill || "";
    if (document.getElementById("creatureTameable")) document.getElementById("creatureTameable").value = c.tameable || "false";
    if (document.getElementById("creatureEvolution")) document.getElementById("creatureEvolution").value = c.evolution || "";
    
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
    
    if (document.getElementById("detailHabitat")) document.getElementById("detailHabitat").innerText = c.habitat || "Không rõ";
    if (document.getElementById("detailWeakness")) document.getElementById("detailWeakness").innerText = c.weakness || "Không rõ";
    if (document.getElementById("detailDrops")) document.getElementById("detailDrops").innerText = c.drops || "Không có";
    
    const header = document.getElementById("detailHeader");
    const imgUrl = await getCreatureImage(c.imgId);
    header.style.backgroundImage = `url('${imgUrl || 'https://i.imgur.com/6X8FQyA.png'}')`;
    
    // Nạp Stats & Animations
    if (document.getElementById("dtHPVal")) {
        const hp = c.hp || 100, atk = c.atk || 50, def = c.def || 50, spd = c.spd || 50;
        document.getElementById("dtHPVal").innerText = hp;
        document.getElementById("dtATKVal").innerText = atk;
        document.getElementById("dtDEFVal").innerText = def;
        document.getElementById("dtSPDVal").innerText = spd;
        
        setTimeout(() => {
            document.getElementById("dtHPBar").style.width = Math.min((hp/500)*100, 100) + "%";
            document.getElementById("dtATKBar").style.width = Math.min((atk/300)*100, 100) + "%";
            document.getElementById("dtDEFBar").style.width = Math.min((def/300)*100, 100) + "%";
            document.getElementById("dtSPDBar").style.width = Math.min((spd/300)*100, 100) + "%";
        }, 100);
    }
    
    if (document.getElementById("detailSkill")) {
        document.getElementById("detailSkill").innerText = c.skill || "Không có";
    }
    
    if (document.getElementById("detailTameable")) {
        const t = document.getElementById("detailTameable");
        if(c.tameable === "true") {
            t.innerText = "Có thể thuần hóa (Tameable)";
            t.style.background = "rgba(16,185,129,0.2)";
            t.style.color = "#10b981";
        } else {
            t.innerText = "Không thể thuần hóa (Wild)";
            t.style.background = "rgba(239,68,68,0.2)";
            t.style.color = "#ef4444";
        }
    }
    
    if (document.getElementById("detailEvolution")) {
        const evoDiv = document.getElementById("detailEvolution");
        if (c.evolution && allCreaturesList.length > 0) {
            const evoObj = allCreaturesList.find(x => x.id === c.evolution);
            if (evoObj) {
                evoDiv.innerText = "Tiến hóa thành: " + evoObj.name;
                evoDiv.onclick = () => {
                    closeCreatureDetailModal();
                    setTimeout(() => openCreatureDetail(evoObj.id), 300);
                };
            } else {
                evoDiv.innerText = "Không có dạng kế tiếp";
                evoDiv.onclick = null;
            }
        } else {
            evoDiv.innerText = "Không có dạng kế tiếp";
            evoDiv.onclick = null;
        }
    }

    document.getElementById("creatureDetailModal").style.display = "flex";
}
async function getCreatureData(id) {
    const all = await dbGetAll("creatures");
    return all.find(c => c.id === id);
}
function showToast(msg) {
    console.log("GM Codex:", msg);
}
window.addEventListener("DOMContentLoaded", async () => {
    await initImageDB(); // Khởi tạo DB chung
    await migrateOldCreatures(); // Di tản quái vật cũ nếu có
    showCreatures();

    // Lắng nghe tìm kiếm
    document.getElementById("creatureSearch")?.addEventListener("input", () => {
        showCreatures(1);
    });
    
    document.getElementById("creatureFilterRank")?.addEventListener("change", () => {
        showCreatures(1);
    });
});

function switchCreatureTab(evt, tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.add('hidden'));

    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabName).classList.remove('hidden');
    evt.currentTarget.classList.add('active');
}

function resetFormTabs() {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.add('hidden'));

    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));

    document.getElementById('tabBasic').classList.remove('hidden');
    if(tabBtns.length > 0) tabBtns[0].classList.add('active');
}
function openCreatureModal() { 
    editCreatureId = null; 
    document.getElementById("creatureForm").reset();
    document.getElementById("creaturePreview").classList.add("hidden");
    resetFormTabs();
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
