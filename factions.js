window.factions = window.factions || []; 
let editingFaction = -1;
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
    
    let iconKey = isEdit ? window.factions[editingFaction].icon : "";
    let bannerKey = isEdit ? window.factions[editingFaction].banner : "";

    const iconFile = document.getElementById("factionIcon")?.files[0];
    if (iconFile) {
        iconKey = factionId + "_icon_" + Date.now();
        await saveImage(iconKey, iconFile);
    }

    const bannerFile = document.getElementById("factionBanner")?.files[0];
    if (bannerFile) {
        bannerKey = factionId + "_banner_" + Date.now();
        await saveImage(bannerKey, bannerFile);
    }

    // Lấy dữ liệu ngoại giao từ UI (Hàm từ diplomacy.js)
    const diplomacy = typeof getDiplomacyDataFromUI === "function" ? 
                        getDiplomacyDataFromUI('factionDiplomacyList') : [];

    const obj = {
        id: factionId,
        name: name,
        leader: val("factionLeader"),
        hq: val("factionHQ"),
        founded: val("factionFounded"),
        scale: val("factionScale"),
        power: val("factionPower"),
        goal: val("factionGoal"),
        desc: val("factionDesc"),
        diplomacy: diplomacy, // Lưu mảng quan hệ mới
        icon: iconKey,
        banner: bannerKey,
        updatedAt: Date.now()
    };

    if (isEdit) {
        window.factions[editingFaction] = obj;
    } else {
        window.factions.push(obj);
    }

    if (typeof saveAndRefresh === "function") {
        await saveAndRefresh();
    } else {
        await dbSave("factions", window.factions);
        await renderFactions();
    }
    
    if (typeof updateFactionOptions === "function") updateFactionOptions();

    // Cập nhật lại sơ đồ ngoại giao phe phái nếu đang hiển thị
    if (typeof renderDiplomacyNetwork === "function") {
        renderDiplomacyNetwork('faction', 'factionNetworkCanvas');
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
    setVal("factionDesc", f.desc);

    // Xử lý nạp danh sách ngoại giao vào Modal
    const dipContainer = document.getElementById('factionDiplomacyList');
    if (dipContainer) {
        dipContainer.innerHTML = "";
        if (f.diplomacy && Array.isArray(f.diplomacy)) {
            f.diplomacy.forEach(rel => {
                if (typeof addRelationRow === "function") {
                    addRelationRow('factionDiplomacyList', rel);
                }
            });
        }
    }

    const modal = document.getElementById("factionModal");
    if (modal) {
        modal.style.display = "flex";
    }
}
async function loadFactionCharacters(f) {
    let list = document.getElementById("factionCharacters");
    if (!list) return;
    list.innerHTML = "";
    let members = (window.characters || []).filter(c => String(c.faction) === String(f.id));

    if (members.length === 0) {
        list.innerHTML = "<p style='color:var(--text-dim); font-size:0.8rem; padding: 10px;'>Chưa có thành viên nào gia nhập.</p>";
        return;
    }

    for (const c of members) {
        let div = document.createElement("div");
        div.className = "character-mini-card"; // Dùng class chung của hệ thống
        div.style = "cursor:pointer; text-align:center; background:var(--card-bg); border-radius:8px; padding:8px; border:1px solid var(--border);";

        div.innerHTML = `
            <img id="f-char-img-${c.id}" src="https://i.imgur.com/6X8FQyA.png" style="width:100%; height:80px; object-fit:cover; border-radius:4px; margin-bottom:5px;">
            <p style="font-size:0.75rem; margin:0; font-weight:bold; color:var(--gold);">${c.name}</p>
        `;

        list.appendChild(div);

        // Load ảnh nhân vật từ DB
        if (c.img) {
            const imgEl = document.getElementById(`f-char-img-${c.id}`);
            const src = (c.img.startsWith("http") || c.img.startsWith("data:")) 
                        ? c.img 
                        : (typeof getImage === "function" ? await getImage(c.img) : "");
            if (imgEl && src) imgEl.src = src;
        }

        div.onclick = () => {
            if (typeof openProfile === "function") {
                openProfile(c.id);
                showPage("characterPage");
            }
        };
    }
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
        "factionScale", "factionPower", "factionGoal", "factionDesc"
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    // Xóa danh sách hàng ngoại giao cũ trong Modal
    const dipContainer = document.getElementById('factionDiplomacyList');
    if (dipContainer) dipContainer.innerHTML = "";

    if (document.getElementById("factionIcon")) document.getElementById("factionIcon").value = "";
    if (document.getElementById("factionBanner")) document.getElementById("factionBanner").value = "";
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
    setText("factionPagePower", f.power);

    // Hiển thị ngoại giao dưới dạng Tags (Gọi từ diplomacy.js)
    const relContainer = document.getElementById("factionPageRelations");
    if (relContainer && typeof renderDiplomacyTags === "function") {
        renderDiplomacyTags("factionPageRelations", f.diplomacy || []);
    }

    const scaleEl = document.getElementById("factionPageScaleBadge") || document.getElementById("factionPageScale");
    if (scaleEl) {
        scaleEl.textContent = f.scale || "N/A";
        scaleEl.className = "badge " + (f.scale === "Toàn lục địa" ? "danger" : "info");
    }

    const powerFill = document.getElementById("powerFill") || document.getElementById("factionPagePowerBar");
    if (powerFill) {
        const powerVal = parseInt(f.power) || 0;
        const percent = Math.min((powerVal / 1000) * 100, 100); 
        powerFill.style.width = percent + "%";
    }

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

    if (typeof loadFactionCharacters === "function") {
        loadFactionCharacters(f);
    }
}
function openFactionForm() {
    openFactionModal();
}
function closeFactionModal() {
    const modal = document.getElementById("factionModal");
    if (modal) modal.style.display = "none";
    editingFaction = -1;
}
function openFactionModal() {
    editingFaction = -1;
    resetFactionForm();
    const modal = document.getElementById("factionModal");
    if (modal) {
        modal.style.display = "flex";
    } else {
        console.error("❌ GM: Không tìm thấy ID 'factionModal' trong index.html");
    }
}


