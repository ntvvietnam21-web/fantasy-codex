document.addEventListener("DOMContentLoaded", async () => {
    if (typeof reloadAllData === "function") {
        await reloadAllData();
    }
    renderLocations();
    updateLocationOptions();
});

window.renderLocations = async function() {
    const container = document.getElementById("locationList");
    if (!container) return;
    container.innerHTML = "";

    let filteredLocations = window.locations || [];
    const searchQuery = document.getElementById("locationSearch")?.value.toLowerCase() || "";
    
    if (searchQuery) {
        filteredLocations = filteredLocations.filter(loc =>
            (loc.name || "").toLowerCase().includes(searchQuery)
        );
    }

    const kingdoms = window.kingdoms || [];
    const factions = window.factions || []; // GM: Lấy thêm factions để hiển thị tên
    const grouped = {};

    // --- GM: Logic nhóm mới (Ưu tiên Empire, sau đó đến Faction) ---
    filteredLocations.forEach(loc => {
        let key = "unknown";
        if (loc.empire && loc.empire !== "") {
            key = loc.empire;
        } else if (loc.faction && loc.faction !== "") {
            key = "fact_" + loc.faction; // Dùng tiền tố để tránh trùng ID với vương quốc
        }
        
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(loc);
    });

    Object.keys(grouped).forEach(groupId => {
        // Xác định đối tượng hiển thị (Vương quốc hoặc Phe phái)
        let groupTitle = "Địa điểm tự do";
        let isFaction = groupId.startsWith("fact_");
        let realId = isFaction ? groupId.replace("fact_", "") : groupId;

        if (isFaction) {
            const fac = factions.find(f => String(f.id) === String(realId));
            groupTitle = fac ? `Phe: ${fac.name}` : "Phe phái ẩn danh";
        } else {
            const empire = kingdoms.find(k => String(k.id) === String(groupId));
            groupTitle = empire ? empire.name : "Địa điểm tự do";
        }

        const parent = document.createElement("div");
        parent.className = "parent-card";
        
        if (window.currentOpeningEmpireId === groupId) parent.classList.add("open");

        parent.innerHTML = `
            <div class="parent-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h3 onclick="toggleTab(this, '${groupId}')" style="flex:1; cursor:pointer;">
                    ${groupTitle} (${grouped[groupId].length})
                </h3>
                <div class="parent-actions" style="display:flex; gap:5px;">
                    <button onclick="openFormWithEmpire('${groupId}')" class="btn-mini" title="Thêm vào tab này">+</button>
                    ${groupId !== "unknown" ? `
                        <button onclick="editEmpire('${groupId}')" class="btn-mini" title="Sửa tên">✏️</button>
                    ` : ''}
                </div>
            </div>
            <div class="child-container ${window.currentOpeningEmpireId === groupId ? '' : 'hidden'}"></div>
        `;

        const childContainer = parent.querySelector(".child-container");
        grouped[groupId].forEach(loc => {
            const card = document.createElement("div");
            card.className = "small-card";
            card.innerHTML = `
                <img src="https://i.imgur.com/6X8FQyA.png" id="img-loc-${loc.id}">
                <h4>${loc.name}</h4>
                <div class="card-actions">
                    <button class="edit-btn">✏️</button>
                    <button class="delete-btn">🗑️</button>
                </div>
            `;
            card.onclick = () => showDetail(loc.id);
            card.querySelector(".edit-btn").onclick = (e) => { e.stopPropagation(); openForm(loc.id); };
            card.querySelector(".delete-btn").onclick = (e) => { e.stopPropagation(); deleteLocation(loc.id); };

            if (typeof getImage === "function") {
                getImage(loc.id).then(url => { if (url) {
                    const el = document.getElementById(`img-loc-${loc.id}`);
                    if(el) el.src = url;
                }});
            }
            childContainer.appendChild(card);
        });
        container.appendChild(parent);
    });
    
    const countEl = document.getElementById("locationCount");
    if (countEl) countEl.innerText = filteredLocations.length;
};

window.closeForm = function() {
    const modal = document.getElementById("locationFormModal");
    if (modal) modal.style.display = "none";
};
window.saveLocation = async function() {
    const getVal = id => document.getElementById(id)?.value.trim() || "";
    if (!getVal("locationName")) return alert("Tên địa điểm không được để trống!");

    const id = editingId || "l_" + Date.now();
    const empire = getVal("locationEmpire");
    const faction = getVal("locationFaction");

    const locObj = {
        id: id,
        name: getVal("locationName"),
        type: getVal("locationType"),
        location: getVal("locationAddress"),
        empire: empire,
        faction: faction,
        era: getVal("locationEra"),
        description: getVal("locationDescription"),
        condition: getVal("locationCondition"),
        features: getVal("locationFeatures")
    };
    if (empire) {
        window.currentOpeningEmpireId = empire;
    } else if (faction) {
        window.currentOpeningEmpireId = "fact_" + faction;
    } else {
        window.currentOpeningEmpireId = "unknown";
    }

    const fileInput = document.getElementById("locationImage");
    if (fileInput?.files[0] && typeof saveImage === "function") {
        await saveImage(id, fileInput.files[0]);
    }

    if (editingId) {
        const idx = window.locations.findIndex(l => l.id === editingId);
        if (idx >= 0) window.locations[idx] = locObj;
    } else {
        window.locations.push(locObj);
    }

    if (typeof dbSave === "function") await dbSave("locations", window.locations);

    editingId = null;
    closeForm();
    renderLocations();
};
window.deleteLocation = async function(id) {
    if (!confirm("Bạn có chắc muốn xoá địa điểm này?")) return;
    window.locations = window.locations.filter(l => l.id !== id);
    if (typeof dbSave === "function") await dbSave("locations", window.locations);
    if (typeof deleteImage === "function") await deleteImage(id);
    renderLocations();
};
window.updateLocationOptions = function() {
    const empireSel = document.getElementById("locationEmpire");
    const factionSel = document.getElementById("locationFaction");
    if (!empireSel || !factionSel) return;
    
    empireSel.innerHTML = '<option value="">--Chọn đế chế--</option>';
    factionSel.innerHTML = '<option value="">--Chọn phe phái--</option>';

    (window.kingdoms || []).forEach(k => {
        const opt = document.createElement("option");
        opt.value = k.id; opt.textContent = k.name;
        empireSel.appendChild(opt);
    });
    (window.factions || []).forEach(f => {
        const opt = document.createElement("option");
        opt.value = f.id; opt.textContent = f.name;
        factionSel.appendChild(opt);
    });
};
window.searchLocations = function() {
    renderLocations();
};



window.showDetail = function(id) {
    const loc = window.locations.find(l => l.id === id);
    if (!loc) return;
    currentDetailId = id; // Lưu ID đang xem để phục vụ hàm Sửa/Xóa

    // 1. Chuyển đổi hiển thị trang
    document.getElementById("locationDetail").style.display = "block";
    document.getElementById("locationListPage").style.display = "none";

    // 2. Các hàm trợ giúp nạp dữ liệu
    // Dùng cho text thuần
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val || "Chưa có thông tin";
    };

    // Dùng cho nội dung Markdown (Mô tả, Đặc trưng, Tình trạng)
    const setHTML = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
            // Ưu tiên dùng renderMarkdown từ app.js để xử lý xuống dòng và link nhân vật
            el.innerHTML = typeof renderMarkdown === "function" 
                ? renderMarkdown(val) 
                : (val ? val.replace(/\n/g, '<br>') : "<i>Chưa có thông tin</i>");
        }
    };

    // 3. Cập nhật thông tin cơ bản
    setText("detailName", loc.name);
    setText("detailType", loc.type);
    setText("detailAddress", loc.location);
    setText("detailEra", loc.era);

    // 4. Cập nhật nội dung chi tiết (Markdown/Xuống dòng)
    setHTML("detailDescription", loc.description); // ID mới trong HTML div
    setHTML("detailFeatures", loc.features);
    setHTML("detailCondition", loc.condition);

    // 5. Xử lý hiển thị Tên Đế chế & Phe phái
    const empire = (window.kingdoms || []).find(k => String(k.id) === String(loc.empire));
    const faction = (window.factions || []).find(f => String(f.id) === String(loc.faction));
    
    setText("detailEmpire", empire ? empire.name : "Tự do");
    setText("detailFaction", faction ? faction.name : "Không có");

    // 6. Xử lý hình ảnh Banner
    const imgEl = document.getElementById("detailImage");
    if (imgEl) {
        // Reset về ảnh chờ trong khi nạp
        imgEl.src = "https://i.imgur.com/6X8FQyA.png"; 
        
        if (typeof getImage === "function") {
            getImage(loc.id).then(url => {
                if (url) {
                    imgEl.src = url;
                }
            }).catch(err => {
                console.error("Lỗi nạp ảnh địa điểm:", err);
            });
        }
    }

    // Cuộn lên đầu trang chi tiết
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.backToList = function() {
    document.getElementById("locationDetail").style.display = "none";
    document.getElementById("locationListPage").style.display = "block";
};
window.currentOpeningEmpireId = null; 
window.toggleTab = function(el, empireId) {
    const parent = el.closest(".parent-card");
    const container = parent.querySelector(".child-container");
    const isOpen = parent.classList.toggle("open");
    container.classList.toggle("hidden");
    window.currentOpeningEmpireId = isOpen ? empireId : null;
};
window.openFormWithEmpire = function(groupId) {
    window.currentOpeningEmpireId = groupId;
    openForm();
};
window.openForm = function(id = null) {
    editingId = null;
    const form = document.getElementById("locationForm");
    if (!form) return;
    form.reset();
    updateLocationOptions();

    document.getElementById("formTitle").innerText = id ? "Sửa địa điểm" : "Thêm địa điểm";

    if (id) {
        editingId = id;
        const loc = (window.locations || []).find(l => l.id === id);
        if (loc) {
            document.getElementById("locationName").value = loc.name || "";
            document.getElementById("locationType").value = loc.type || "";
            document.getElementById("locationAddress").value = loc.location || "";
            document.getElementById("locationEmpire").value = loc.empire || "";
            document.getElementById("locationFaction").value = loc.faction || "";
            document.getElementById("locationEra").value = loc.era || "";
            document.getElementById("locationDescription").value = loc.description || "";
            document.getElementById("locationCondition").value = loc.condition || "";
            document.getElementById("locationFeatures").value = loc.features || "";
        }
    } else if (window.currentOpeningEmpireId && window.currentOpeningEmpireId !== "unknown") {
        // GM: Tự động điền theo Tab đang mở
        if (window.currentOpeningEmpireId.startsWith("fact_")) {
            const facId = window.currentOpeningEmpireId.replace("fact_", "");
            document.getElementById("locationFaction").value = facId;
        } else {
            document.getElementById("locationEmpire").value = window.currentOpeningEmpireId;
        }
    }
    const modal = document.getElementById("locationFormModal");
    if (modal) modal.style.display = "flex";
};
window.editEmpire = function(id) {
    const empire = window.kingdoms.find(k => k.id === id);
    if (!empire) return;
    const newName = prompt("Đổi tên nhóm/đế chế này thành:", empire.name);
    if (newName && newName.trim() !== "") {
        empire.name = newName.trim();
        if (typeof dbSave === "function") {
            dbSave("kingdoms", window.kingdoms);
            renderLocations();
        }
    }
};
window.deleteEmpire = async function(id) {
    if (!confirm("GM: Xóa Tab này sẽ không xóa các địa điểm bên trong (chúng sẽ về mục tự do). Tiếp tục?")) return;
    window.kingdoms = window.kingdoms.filter(k => k.id !== id);
    window.locations.forEach(l => { if(l.empire === id) l.empire = ""; });
    if (typeof dbSave === "function") {
        await dbSave("kingdoms", window.kingdoms);
        await dbSave("locations", window.locations);
    }
    renderLocations();
};
