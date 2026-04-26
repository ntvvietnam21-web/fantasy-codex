window.characters = window.characters || [];
window.races = window.races || [];
window.kingdoms = window.kingdoms || [];
window.factions = window.factions || [];
window.locations = window.locations || [];
let editingId = null;
let editingRace = -1;
let refreshTimeout;
function renderMarkdown(text) {
    if (!text) return "<i>Chưa có thông tin...</i>";
    let html = text
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[\[(.*?)\]\]/g, (match, name) => {
            return `<span class="char-link-wiki" onclick="openCharacterByName('${name.trim()}')">${name}</span>`;
        });
    html = html.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, (match) => `<ul>${match}</ul>`);

    return html.replace(/\n/g, '<br>');
}
async function openCharacterByName(name) {
    const char = window.characters.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (char) {
        openProfile(char.id);
    } else {
        showToast(`❌ Không tìm thấy nhân vật: ${name}`);
    }
}
async function saveAndRefresh() {
    try {
        if (typeof initImageDB === "function") await initImageDB();
        const saveTasks = [
            dbSave("characters", window.characters),
            dbSave("races", window.races),
            dbSave("kingdoms", window.kingdoms),
            dbSave("factions", window.factions),
            dbSave("locations", window.locations)
        ];
        await Promise.all(saveTasks);
        if (typeof sortAll === "function") {
            const sortMode = localStorage.getItem("sortMode") || "asc";
            sortAll(sortMode);
        }
        requestAnimationFrame(() => {
            if (typeof render === "function") render();
            if (typeof renderKingdoms === "function") renderKingdoms();
            if (typeof renderFactions === "function") renderFactions();
            if (typeof renderRaces === "function") renderRaces();
            if (typeof updateRaceOptions === "function") updateRaceOptions();
            if (typeof updateKingdomOptions === "function") updateKingdomOptions();
            if (typeof renderJSONView === "function") renderJSONView();
            if (typeof loadCompareSelect === "function") loadCompareSelect();
        });

        console.log("💾 GM: Hệ thống đã lưu và đồng bộ thành công.");
    } catch (err) {
        console.error("❌ Lỗi trong saveAndRefresh:", err);
        showToast("⚠️ Lỗi lưu dữ liệu!");
    }
}
async function reloadAllData() {
    const stores = ["characters", "races", "kingdoms", "factions", "locations"];
    try {
        if (typeof initImageDB === "function") {
            await initImageDB().catch(e => console.warn("🎨 GM: DB Init Warning:", e));
        }
        const results = await Promise.all(
            stores.map(s => dbGetAll(s).catch(err => {
                console.error(`❌ Lỗi nạp store ${s}:`, err);
                return [];
            }))
        );
        [window.characters, window.races, window.kingdoms, window.factions, window.locations] = 
            results.map(data => Array.isArray(data) ? data : []);

        console.log("✅ GM: Hệ thống dữ liệu đã sẵn sàng.");
        const uiTasks = [];
        
        if (typeof updateRaceOptions === "function") uiTasks.push(updateRaceOptions());
        if (typeof updateKingdomOptions === "function") uiTasks.push(updateKingdomOptions());
        if (typeof renderRaces === "function") uiTasks.push(renderRaces());
        if (typeof renderKingdoms === "function") uiTasks.push(renderKingdoms());
        if (typeof renderFactions === "function") uiTasks.push(renderFactions());

        await Promise.all(uiTasks);
        if (typeof render === "function") {
            render();
            if (typeof initLazyLoading === "function") {
                setTimeout(() => initLazyLoading(), 0);
            }
        }
        
    } catch (err) {
        console.error("❌ reloadAllData Critical Error:", err);
        window.characters = window.characters || [];
        window.races = window.races || [];
        if (typeof showToast === "function") showToast("❌ Lỗi nạp dữ liệu hệ thống!");
    }
}
function toggleSidebar(e) {
    if (e && e.stopPropagation) e.stopPropagation();

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    if (sidebar && overlay) {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("active");
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById("sidebarOverlay");
    if (overlay) {
        overlay.addEventListener('click', () => {
            const sidebar = document.getElementById("sidebar");
            if (sidebar.classList.contains('open')) {
                toggleSidebar();
            }
        });
    }
});
function showPage(pageId) {
    const page = document.getElementById(pageId);
    if (!page) {
        console.error(`❌ GM: Không tìm thấy Section với ID: ${pageId}`);
        return;
    }
    window.currentPage = pageId;
    localStorage.setItem("currentPage", pageId);
    document.querySelectorAll(".page").forEach(p => {
        p.classList.add("hidden");
        p.style.display = "none"; 
        p.style.opacity = "0";
    });
    page.classList.remove("hidden");
    page.style.display = "block"; 
    setTimeout(() => {
        page.style.transition = "opacity 0.3s ease";
        page.style.opacity = "1";
    }, 50);
    switch (pageId) {
        case 'relationshipPage':
            setTimeout(() => { drawNetwork(); }, 350);
            break;
        case 'factions':
            if (typeof renderFactions === "function") renderFactions();
            break;
        case 'kingdoms':
            if (typeof renderKingdoms === "function") renderKingdoms();
            break;
    }
    const iframe = page.querySelector("iframe");
    if (iframe && !iframe.dataset.loaded) {
        iframe.src = iframe.src;
        iframe.dataset.loaded = "true";
    }
    document.querySelectorAll(".sidebar a, .nav-item").forEach(link => {
        link.classList.remove("active");
        const onClickAttr = link.getAttribute("onclick") || "";
        if (onClickAttr.includes(`'${pageId}'`) || onClickAttr.includes(`"${pageId}"`)) {
            link.classList.add("active");
        }
    });
    const sidebar = document.getElementById("sidebar");
    if (sidebar && sidebar.classList.contains("active") && typeof toggleSidebar === "function") {
        toggleSidebar();
    }
}
function openModal() {
    if (typeof updateRaceOptions === "function") updateRaceOptions();
    if (typeof updateKingdomOptions === "function") updateKingdomOptions();
    if (typeof updateCharacterLocationOptions === "function") updateCharacterLocationOptions();
    if (typeof updateFactionOptions === "function") updateFactionOptions();

    const modal = document.getElementById("characterModal");
    if (modal) {
        modal.classList.add("active");

        if (!editingId) {
            // --- TRƯỜNG HỢP 1: TẠO MỚI ---
            // Reset các con số hiển thị
            ['valTalent', 'valPotential', 'valFate'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerText = "0";
            });
            // Reset thanh kéo (slider) về 0
            ['statTalent', 'statPotential', 'statFate'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = 0;
            });

            const preview = document.getElementById("previewImg");
            if (preview) {
                preview.src = "https://i.imgur.com/6X8FQyA.png";
                preview.classList.add("hidden");
            }
        } else {
            // --- TRƯỜNG HỢP 2: CHỈNH SỬA (SỬA LỖI RESET TẠI ĐÂY) ---
            // Tìm dữ liệu nhân vật đang sửa trong mảng toàn cục
            const char = window.characters.find(c => String(c.id) === String(editingId));
            if (char && char.stats && char.stats.hidden) {
                const h = char.stats.hidden;

                // Đổ dữ liệu cũ vào thanh kéo (slider)
                if (document.getElementById('statTalent')) document.getElementById('statTalent').value = h.talent || 0;
                if (document.getElementById('statPotential')) document.getElementById('statPotential').value = h.potential || 0;
                if (document.getElementById('statFate')) document.getElementById('statFate').value = h.fate || 0;

                // Cập nhật con số hiển thị bên cạnh cho khớp
                if (document.getElementById('valTalent')) document.getElementById('valTalent').innerText = h.talent || 0;
                if (document.getElementById('valPotential')) document.getElementById('valPotential').innerText = h.potential || 0;
                if (document.getElementById('valFate')) document.getElementById('valFate').innerText = h.fate || 0;
            }
        }

        const modalContent = modal.querySelector(".modal-content");
        if (modalContent) modalContent.scrollTop = 0;
    }
}
function closeCharacterModal(){
    document.getElementById("characterModal").classList.remove("active");
    document.getElementById("charForm").reset();
    const preview = document.getElementById("previewImg");
    preview.src="";
    preview.classList.add("hidden");
    editingId=null;
    document.getElementById("modalTitle").innerText="Thiết lập nhân vật";
    document.getElementById("relationContainer").innerHTML = "";
}
function convertBase64(file){
    return new Promise(resolve=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.readAsDataURL(file);
    });
}
function previewCharacterImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById("previewImg");
    
    if (!preview) return;
    if (!file) {
        if (preview.src.startsWith('blob:')) {
            URL.revokeObjectURL(preview.src);
        }
        preview.src = "";
        preview.classList.add("hidden");
        return;
    }
    if (!file.type.startsWith('image/')) {
        showToast("⚠️ Vui lòng chỉ chọn file hình ảnh!");
        return;
    }
    if (preview.src.startsWith('blob:')) {
        URL.revokeObjectURL(preview.src);
    }
    const objectUrl = URL.createObjectURL(file);
    preview.src = objectUrl;
    preview.classList.remove("hidden");
    preview.onload = () => {
        if (preview.src.startsWith('blob:')) {
            URL.revokeObjectURL(preview.src);
        }
    };
}
async function saveCharacter() {
    try {
        if (typeof initImageDB === "function") await initImageDB();
        
        const nameInput = document.getElementById("charName");
        const name = nameInput?.value.trim();
        if (!name) {
            return typeof showToast === "function" 
                ? showToast("⚠️ Vui lòng nhập tên nhân vật!", "warning") 
                : alert("Vui lòng nhập tên nhân vật!");
        }

        const isNew = !editingId;
        const id = editingId || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : "char_" + Date.now());
        
        // Tìm nhân vật cũ để bảo toàn dữ liệu stats
        const oldChar = window.characters.find(c => String(c.id) === String(id));
        
        // Xử lý ảnh
        let img = oldChar?.img || "";
        const fileInput = document.getElementById("charImg");
        if (fileInput?.files && fileInput.files[0]) {
            try {
                if (typeof saveImage === "function") {
                    await saveImage(id, fileInput.files[0]);
                    img = id; 
                }
            } catch (imgErr) {
                console.error("❌ Lỗi lưu ảnh nhân vật:", imgErr);
                if (typeof showToast === "function") showToast("⚠️ Không thể lưu ảnh...", "warning");
            }
        }

        const getVal = (id, def = "") => document.getElementById(id)?.value.trim() || def;
        const getNum = (id) => {
            const v = parseFloat(document.getElementById(id)?.value);
            return isNaN(v) ? 0 : v;
        };

        // --- GM: QUAN TRỌNG - BẢO TOÀN CHỈ SỐ HỆ THỐNG ---
        const defaultStats = {
            core: { str: 0, agi: 0, int: 0, vit: 0, spi: 0, luk: 0 },
            vital: { hp: 0, mp: 0, stamina: 0, shield: 0 },
            offense: { atk: 0, matk: 0, critRate: 0, critDmg: 0, pen: 0, atkSpeed: 0, castSpeed: 0 },
            defense: { def: 0, mdef: 0, evasion: 0, block: 0, dmgReduce: 0, resist: 0 }
        };

        // Kết hợp chỉ số cũ và chỉ số ẩn mới từ slider
        const stats = {
            ...(oldChar?.stats || defaultStats), 
            hidden: {
                talent: getNum("statTalent"),
                potential: getNum("statPotential"),
                fate: getNum("statFate")
            }
        };

        let powerLevel = getNum("charPL");
        if (powerLevel === 0 && typeof calculatePL === "function") {
            powerLevel = calculatePL({ stats });
        }

        const characterObj = {
            id, name, img,
            race: getVal("charRace"),
            kingdom: getVal("charKingdom"),
            faction: getVal("charFaction"),
            location: getVal("charLocation"),
            gender: getVal("charGender"),
            age: getNum("charAge"),
            birth: getVal("charBirth"),
            job: getVal("charJob"),
            status: getVal("charStatus"),
            pl: powerLevel,
            appearance: getVal("charAppearance"), 
            personality: getVal("charPersonality"), 
            desc: getVal("charDesc"),
            weapon: getVal("equipWeapon", "Chưa trang bị"),
            armor: getVal("equipArmor", "Chưa trang bị"),
            accessory: getVal("equipAccessory", "Chưa trang bị"),
            
            relations: [...document.querySelectorAll(".relation-item")].map(el => ({
                targetId: el.querySelector(".rel-character")?.value,
                type: el.querySelector(".rel-type")?.value.trim()
            })).filter(r => r.targetId && r.type),
            
            forms: [...document.querySelectorAll(".form-item")].map(f => ({
                id: f.dataset.id || "form_" + Date.now() + Math.random(),
                name: f.querySelector(".formName")?.value.trim(),
                desc: f.querySelector(".formDesc")?.value.trim(),
                img: f.querySelector(".formImgPreview")?.dataset.imgId || ""
            })).filter(f => f.name),
            
            favorite: oldChar?.favorite || false,
            activeForm: oldChar?.activeForm || "",
            stats, // Ghi đè stats nhưng đã được "merge" ở trên
            updatedAt: Date.now()
        };

        if (!isNew) {
            const index = window.characters.findIndex(c => String(c.id) === String(id));
            if (index !== -1) window.characters[index] = characterObj;
        } else {
            window.characters.unshift(characterObj);
        }

        if (typeof saveAndRefresh === "function") {
            await saveAndRefresh();
        } else if (typeof dbSave === "function") {
            await dbSave("characters", window.characters);
        }

        if (typeof closeCharacterModal === "function") closeCharacterModal();
        
        if (window.currentPage === "characterPage") {
            if (typeof openProfile === "function") await openProfile(id);
        } else {
            if (typeof showPage === "function") showPage("characters");
            if (typeof render === "function") render();
        }

        if (typeof showToast === "function") {
            showToast(`✅ ${isNew ? 'Khởi tạo' : 'Cập nhật'} thành công!`, "success");
        }

        editingId = null;
    } catch (err) {
        console.error("❌ Lỗi saveCharacter:", err);
    }
}
async function editCharacter(id) {
    const c = window.characters.find(x => String(x.id) === String(id));
    if (!c) return showToast("❌ Không tìm thấy dữ liệu nhân vật!");

    editingId = id;
    if (typeof openModal === "function") openModal();
    
    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) modalTitle.innerText = `Chỉnh sửa: ${c.name}`;

    const fields = {
        charName: 'name', 
        charRace: 'race',
        charKingdom: 'kingdom',
        charFaction: 'faction', 
        charLocation: 'location', 
        charGender: 'gender',
        charAge: 'age', 
        charBirth: 'birth', 
        charJob: 'job',
        charStatus: 'status', 
        charPL: 'pl', 
        charAppearance: 'appearance', 
        charPersonality: 'personality', 
        charDesc: 'desc', 
        equipWeapon: 'weapon', 
        equipArmor: 'armor', 
        equipAccessory: 'accessory'
    };

    // 1. Đưa dữ liệu cơ bản vào Form
    Object.entries(fields).forEach(([htmlId, charKey]) => {
        const el = document.getElementById(htmlId);
        if (el) {
            let val = c[charKey];
            el.value = (val === undefined || val === null) ? 
                       (htmlId.includes('PL') || htmlId.includes('Age') ? 0 : "") : val;
        }
    });

    // 2. CHUẨN HÓA & ĐỒNG BỘ CHỈ SỐ ẨN (Hidden Stats)
    // Ưu tiên lấy từ c.stats.hidden (của stats.js), fallback về c.hidden (dữ liệu cũ)
    const hiddenData = c.stats?.hidden || c.hidden || { talent: 0, potential: 0, fate: 0 };
    
    const hMap = { statTalent: 'talent', statPotential: 'potential', statFate: 'fate' };
    const lMap = { statTalent: 'valTalent', statPotential: 'valPotential', statFate: 'valFate' };

    Object.keys(hMap).forEach(key => {
        const inputEl = document.getElementById(key);
        const labelEl = document.getElementById(lMap[key]);
        const val = hiddenData[hMap[key]] || 0;
        
        if (inputEl) inputEl.value = val;
        if (labelEl) labelEl.innerText = val;
    });

    // 3. Mối quan hệ
    const relContainer = document.getElementById("relationContainer");
    if (relContainer) {
        relContainer.innerHTML = "";
        if (Array.isArray(c.relations)) {
            c.relations.forEach(r => { 
                if (typeof addRelationField === "function") addRelationField(r); 
            });
        }
    }

    // 4. Các dạng biến hình (Forms)
    const formsContainer = document.getElementById("formsContainer");
    if (formsContainer) {
        formsContainer.innerHTML = "";
        if (Array.isArray(c.forms)) {
            for (const f of c.forms) { 
                if (typeof addFormField === "function") await addFormField(f); 
            }
        }
    }

    // 5. Ảnh đại diện
    const preview = document.getElementById("previewImg");
    if (preview) {
        if (c.img) {
            const isExt = c.img.startsWith("http") || c.img.startsWith("data:");
            if (isExt) {
                preview.src = c.img;
            } else if (typeof getImage === "function") {
                try {
                    preview.src = await getImage(c.img) || "https://i.imgur.com/6X8FQyA.png";
                } catch (e) {
                    preview.src = "https://i.imgur.com/6X8FQyA.png";
                }
            }
            preview.classList.remove("hidden");
        } else {
            preview.src = "https://i.imgur.com/6X8FQyA.png";
            preview.classList.add("hidden");
        }
    }
}
async function deleteCharacter(id) {
    if (!confirm("⚠️ Xóa nhân vật này? Hệ thống sẽ gỡ toàn bộ ảnh và liên kết liên quan.")) return;

    try {
        const charToDelete = window.characters.find(x => String(x.id) === String(id));
        if (!charToDelete) return;
        if (charToDelete.img && !charToDelete.img.startsWith("http") && !charToDelete.img.startsWith("data:")) {
            await deleteImage(charToDelete.img).catch(e => console.warn("Lỗi xóa ảnh chính:", e));
        }
        if (charToDelete.forms) {
            for (const f of charToDelete.forms) {
                if (f.img && !f.img.startsWith("http")) {
                    await deleteImage(f.img).catch(() => {});
                }
            }
        }
        window.characters.forEach(c => {
            if (c.relations) {
                c.relations = c.relations.filter(rel => String(rel.targetId) !== String(id));
            }
        });
        window.characters = window.characters.filter(c => String(c.id) !== String(id));
        await saveAndRefresh();
        if (window.currentPage === "characterPage") {
            showPage("characters");
        }
        showToast("✅ Đã xóa nhân vật và làm sạch dữ liệu!");
    } catch (err) {
        console.error("❌ Lỗi deleteCharacter:", err);
        showToast("Lỗi khi xóa dữ liệu!");
    }
}
async function toggleFavorite(id) {
    const c = window.characters.find(x => String(x.id) === String(id));
    if (!c) return;
    c.favorite = !c.favorite;
    await saveAndRefresh();
    showToast(c.favorite ? "❤️ Đã thêm vào yêu thích" : "💔 Đã bỏ yêu thích");
}

async function openProfile(id) {
    const c = window.characters.find(x => String(x.id) === String(id));
    if (!c) return showToast("❌ Không tìm thấy nhân vật!");

    window.currentPage = 'characterPage';
    let displayImg = "https://i.imgur.com/6X8FQyA.png";
    if (c.img) {
        if (c.img.startsWith("http") || c.img.startsWith("data:")) {
            displayImg = c.img;
        } else if (typeof getImage === "function") {
            try {
                displayImg = await getImage(c.img) || displayImg;
            } catch (e) { console.warn("Lỗi load ảnh:", e); }
        }
    }
    const kname = window.kingdoms?.find(k => String(k.id) === String(c.kingdom))?.name || "Tự do";
    const factionObj = window.factions?.find(f => String(f.id) === String(c.faction));
    const fname = factionObj ? factionObj.name : (c.faction || "Không");
    
    // --- KHỞI TẠO VÀ ĐỒNG BỘ CHỈ SỐ ---
    const s = c.stats || {};
    const getVal = (val) => Number(val) || 0;
    
    const core = s.core || {};
    const offense = s.offense || {};
    const defense = s.defense || {};
    const vital = s.vital || {};
    const hidden = s.hidden || c.hidden || {};
    // ----------------------------------

    const charPage = document.getElementById("characterPage");
    if (!charPage) return;
    charPage.innerHTML = `
        <style>
            .profile-wrapper { max-width: 1000px; margin: auto; padding: 10px; color: var(--text-main); font-family: 'Plus Jakarta Sans', sans-serif; }
            .profile-grid { display: flex; flex-direction: column; gap: 20px; }
            @media (min-width: 769px) {
                .profile-grid { flex-direction: row; align-items: flex-start; }
                .sidebar-col { width: 300px; position: sticky; top: 80px; }
                .main-col { flex: 1; }
            }
            .info-box { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 15px; margin-bottom: 15px; }
            .info-title { color: var(--gold); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
            .data-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.95rem; }
            .data-label { color: var(--text-dim); }
            .data-value { font-weight: 600; text-align: right; }
            .highlight-blue { color: #60a5fa; }
            .highlight-gold { color: var(--gold); }
            .mobile-image-card { width: 100%; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 1px solid var(--border); }
            
            .profile-controls { display: flex; gap: 8px; flex-wrap: wrap; }
            .btn-profile-ctrl { padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: 0.3s; border: 1px solid transparent; }
            .btn-edit-p { background: rgba(99, 102, 241, 0.1); color: var(--primary); border-color: var(--primary); }
            .btn-edit-p:hover { background: var(--primary); color: white; }
            .btn-stat-p { background: rgba(251, 191, 36, 0.1); color: var(--gold); border-color: var(--gold); }
            .btn-stat-p:hover { background: var(--gold); color: black; }
            .btn-del-p { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: #ef4444; }
            .btn-del-p:hover { background: #ef4444; color: white; }
            .btn-vortex-p { background: rgba(168, 85, 247, 0.1); color: #a855f7; border-color: #a855f7; }
            .btn-vortex-p:hover { background: #a855f7; color: white; box-shadow: 0 0 10px rgba(168, 85, 247, 0.5); }

            .stats-mini-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
            .stat-mini-item { background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
            .stat-mini-label { font-size: 0.7rem; color: var(--text-dim); display: block; }
            .stat-mini-val { font-size: 0.9rem; font-weight: bold; color: #fff; }
            .desc-area { font-size: 0.9rem; line-height: 1.6; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border: 1px solid var(--border); word-wrap: break-word; }
        </style>

        <div class="profile-wrapper animate-fade-in">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                <button class="btn-back-modern" onclick="showPage('characters')">
                    <i class="fa-solid fa-chevron-left"></i> Quay lại
                </button>
                <div class="profile-controls">
                    <button class="btn-profile-ctrl btn-vortex-p" onclick="SkillTreeVortex.open('${c.id}')">
                        <i class="fa-solid fa-hurricane"></i> Kỹ năng
                    </button>
                    <button class="btn-profile-ctrl btn-stat-p" onclick="window.location.href='stats.html?id=${c.id}'">
                        <i class="fa-solid fa-chart-simple"></i> Chỉ số
                    </button>
                    <button class="btn-profile-ctrl btn-edit-p" onclick="window.editCharacter('${c.id}')">
                        <i class="fa-solid fa-pen-to-square"></i> Sửa
                    </button>
                    <button class="btn-profile-ctrl btn-del-p" onclick="window.deleteCharacter('${c.id}')">
                        <i class="fa-solid fa-trash"></i> Xoá
                    </button>
                </div>
            </div>

            <div class="profile-grid">
                <div class="sidebar-col">
                    <div class="mobile-image-card">
                        <img src="${displayImg}" style="width:100%; display:block; cursor:pointer;" onclick="if(typeof openImageViewer === 'function') openImageViewer('${displayImg}')">
                        <div style="padding:15px; background: linear-gradient(to top, var(--bg-main), transparent);">
                            <h2 style="font-family:'Cinzel'; margin:0; color:var(--gold);">${c.name}</h2>
                            <span style="font-size:0.8rem; background:var(--primary); padding:2px 8px; border-radius:4px;">${c.job || 'Chưa rõ'}</span>
                        </div>
                    </div>

                    <div class="info-box" style="margin-top:15px;">
                        <div class="data-row"><span class="data-label">Lực chiến</span><b class="highlight-gold">${getVal(c.pl).toLocaleString()}</b></div>
                        <div class="data-row"><span class="data-label">Trạng thái</span><b style="color:#10b981;">${c.status || 'Bình thường'}</b></div>
                        
                        <div class="stats-mini-grid">
                            <div class="stat-mini-item"><span class="stat-mini-label">STR</span><span class="stat-mini-val">${getVal(core.str)}</span></div>
                            <div class="stat-mini-item"><span class="stat-mini-label">AGI</span><span class="stat-mini-val">${getVal(core.agi)}</span></div>
                            <div class="stat-mini-item"><span class="stat-mini-label">INT</span><span class="stat-mini-val">${getVal(core.int)}</span></div>
                            <div class="stat-mini-item"><span class="stat-mini-label">VIT</span><span class="stat-mini-val">${getVal(core.vit)}</span></div>
                        </div>

                        <div style="margin-top:15px;">
                            <label style="font-size:0.75rem; color:var(--primary); font-weight:bold;">CHUYỂN DẠNG:</label>
                            <select id="activeForm" onchange="updateActiveForm('${c.id}')" style="width:100%; padding:8px; margin-top:5px; border-radius:6px; background:var(--bg-main); color:white; border:1px solid var(--border);">
                                <option value="">-- Bình thường --</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="main-col">
                    <div class="info-box">
                        <h3 class="info-title"><i class="fa-solid fa-id-card"></i> Thông tin cơ bản</h3>
                        <div class="data-row"><span class="data-label">Giới tính</span><span class="data-value">${c.gender || '-'}</span></div>
                        <div class="data-row"><span class="data-label">Chủng tộc</span><span class="data-value highlight-blue">${c.race || '-'}</span></div>
                        <div class="data-row"><span class="data-label">Tuổi / Ngày sinh</span><span class="data-value">${c.age || '0'} / ${c.birth || '-'}</span></div>
                        <div class="data-row"><span class="data-label">Đế chế</span><span class="data-value">${kname}</span></div>
                        <div class="data-row"><span class="data-label">Phe phái</span><span class="data-value" style="color:var(--accent)">${fname}</span></div>
                        <div class="data-row"><span class="data-label">Quê quán</span><span class="data-value">${c.location || '-'}</span></div>
                    </div>

                    <div class="info-box">
                        <h3 class="info-title"><i class="fa-solid fa-brain"></i> Đặc điểm & Tố chất</h3>
                        <div style="margin-bottom:12px;">
                            <span class="data-label" style="font-size:0.8rem;">NGOẠI HÌNH:</span>
                            <div class="desc-area" style="margin-top:5px;">
                                ${typeof renderMarkdown === 'function' ? renderMarkdown(c.appearance) : (c.appearance || 'Chưa có thông tin ngoại hình.').replace(/\\n/g, '<br>')}
                            </div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <span class="data-label" style="font-size:0.8rem;">TÍNH CÁCH:</span>
                            <div class="desc-area" style="margin-top:5px;">
                                ${typeof renderMarkdown === 'function' ? renderMarkdown(c.personality) : (c.personality || 'Chưa có thông tin tính cách.').replace(/\\n/g, '<br>')}
                            </div>
                        </div>
                        
                        <div style="display:flex; gap:10px; margin-top:10px;">
                            <div style="flex:1; background:rgba(0,0,0,0.2); padding:8px; border-radius:6px; text-align:center; border: 1px solid rgba(251, 191, 36, 0.2);">
                                <small style="display:block; font-size:0.6rem; color:var(--text-dim);">TÀI NĂNG</small>
                                <b class="highlight-gold">${getVal(hidden.talent)}</b>
                            </div>
                            <div style="flex:1; background:rgba(0,0,0,0.2); padding:8px; border-radius:6px; text-align:center; border: 1px solid rgba(251, 191, 36, 0.2);">
                                <small style="display:block; font-size:0.6rem; color:var(--text-dim);">TIỀM NĂNG</small>
                                <b class="highlight-gold">${getVal(hidden.potential)}</b>
                            </div>
                            <div style="flex:1; background:rgba(0,0,0,0.2); padding:8px; border-radius:6px; text-align:center; border: 1px solid rgba(251, 191, 36, 0.2);">
                                <small style="display:block; font-size:0.6rem; color:var(--text-dim);">SỐ MỆNH</small>
                                <b class="highlight-gold">${getVal(hidden.fate)}</b>
                            </div>
                        </div>
                    </div>

                    <div class="info-box">
                        <h3 class="info-title"><i class="fa-solid fa-swords"></i> Chỉ số chiến đấu</h3>
                        <div class="stats-mini-grid" style="grid-template-columns: repeat(3, 1fr);">
                            <div class="stat-mini-item"><span class="stat-mini-label">ATK</span><span class="stat-mini-val highlight-gold">${getVal(offense.atk)}</span></div>
                            <div class="stat-mini-item"><span class="stat-mini-label">DEF</span><span class="stat-mini-val" style="color:#60a5fa;">${getVal(defense.def)}</span></div>
                            <div class="stat-mini-item"><span class="stat-mini-label">HP</span><span class="stat-mini-val" style="color:#ef4444;">${getVal(vital.hp)}</span></div>
                        </div>
                        <div class="stats-mini-grid" style="grid-template-columns: repeat(3, 1fr); margin-top:10px;">
                             <div class="stat-mini-item"><span class="stat-mini-label">Bạo kích</span><span class="stat-mini-val">${getVal(offense.critRate)}%</span></div>
                            <div class="stat-mini-item"><span class="stat-mini-label">Né tránh</span><span class="stat-mini-val">${getVal(defense.evasion)}</span></div>
                            <div class="stat-mini-item"><span class="stat-mini-label">Tốc độ</span><span class="stat-mini-val">${getVal(offense.atkSpeed)}</span></div>
                        </div>
                    </div>

                    <div class="info-box">
                        <h3 class="info-title"><i class="fa-solid fa-shield-halved"></i> Trang bị hiện tại</h3>
                        <div class="data-row"><span class="data-label"><i class="fa-solid fa-khanda"></i> Vũ khí</span><span class="data-value">${c.weapon || 'Chưa trang bị'}</span></div>
                        <div class="data-row"><span class="data-label"><i class="fa-solid fa-shirt"></i> Giáp trụ</span><span class="data-value">${c.armor || 'Chưa trang bị'}</span></div>
                        <div class="data-row"><span class="data-label"><i class="fa-solid fa-gem"></i> Phụ kiện</span><span class="data-value">${c.accessory || 'Chưa trang bị'}</span></div>
                    </div>

                    <div class="info-box">
                        <h3 class="info-title"><i class="fa-solid fa-users"></i> Mối quan hệ</h3>
                        <div id="charPageRelations" style="display:flex; flex-wrap:wrap; gap:5px;">
                            ${typeof renderRelationsHTML === 'function' ? renderRelationsHTML(c) : '<span class="data-label">Chưa có dữ liệu...</span>'}
                        </div>
                    </div>

                    <div class="info-box">
                        <h3 class="info-title"><i class="fa-solid fa-dna"></i> Dạng biến hình</h3>
                        <div id="charPageForms" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap:10px;">
                            </div>
                    </div>

                    <div class="info-box" style="border-left: 3px solid var(--gold);">
                        <h3 class="info-title"><i class="fa-solid fa-feather-pointed"></i> Tiểu sử & Thông tin thêm</h3>
                        <div class="markdown-body desc-area">
                            ${typeof renderMarkdown === 'function' ? renderMarkdown(c.desc) : (c.desc || 'Chưa có tiểu sử.').replace(/\\n/g, '<br>')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    if (typeof renderFormsInProfile === 'function') await renderFormsInProfile(c);
    const select = document.getElementById("activeForm");
    if (select && c.forms) {
        c.forms.forEach(f => {
            const opt = document.createElement("option");
            opt.value = f.id || f.name;
            opt.innerText = f.name;
            if (c.activeForm === opt.value) opt.selected = true;
            select.appendChild(opt);
        });
    }

    showPage("characterPage");
}
function renderRelationsHTML(c) {
    const allChars = window.characters || [];
    if (!c.relations || c.relations.length === 0) {
        return `<i style="color: var(--text-dim); opacity: 0.6;">Chưa có dữ liệu quan hệ...</i>`;
    }
    return c.relations.map(rel => {
        const target = allChars.find(x => x.id === rel.targetId);
        if (!target) return "";
        return `
            <div class="rel-badge" 
                 onclick="openProfile('${target.id}')" 
                 title="Xem hồ sơ của ${target.name}"
                 style="display: inline-flex; align-items: center; gap: 5px; background: var(--bg-secondary); 
                        padding: 5px 12px; border-radius: 20px; border: 1px solid var(--border); 
                        cursor: pointer; font-size: 0.85rem; transition: all 0.2s ease;">
                <span style="color: var(--primary); font-weight: 500;">${rel.type}:</span> 
                <b style="color: var(--text-bright);">${target.name}</b>
            </div>
        `;
    }).join("");
}
async function renderFormsInProfile(c) {
    const container = document.getElementById("charPageForms");
    if (!container) return;
    container.innerHTML = "";
    if (!c.forms || c.forms.length === 0) {
        container.innerHTML = "<i>Nhân vật này không có biến hình...</i>";
        return;
    }

    for (const f of c.forms) {
        let fImg = "https://i.imgur.com/6X8FQyA.png";
        if (f.img) fImg = await getImage(f.img) || fImg;

        const div = document.createElement("div");
        div.className = "form-card-mini";
        div.style = "text-align: center; background: var(--bg-secondary); padding: 8px; border-radius: 8px; border: 1px solid var(--border); transition: transform 0.2s;";
        
        div.innerHTML = `
            <div style="width: 100%; aspect-ratio: 1; background: #000; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 5px;">
                <img src="${fImg}" 
                     style="max-width: 100%; max-height: 100%; object-fit: contain; cursor: zoom-in;" 
                     onclick="if(typeof openImageViewer === 'function') openImageViewer('${fImg}')"
                     title="Click để phóng to">
            </div>
            <div style="font-weight: bold; font-size: 0.75rem; color: var(--gold); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${f.name}</div>
            <button onclick="openFormModal('${f.name}', '${fImg}', '${f.desc}')" 
                    style="background: none; border: none; color: var(--primary); font-size: 10px; cursor: pointer; text-decoration: underline; margin-top: 2px;">
                Chi tiết
            </button>
        `;
        container.appendChild(div);
    }
}
function render(data = window.characters) {
    const countEl = document.getElementById("charCount");
    if (countEl) countEl.innerText = data.length;
    resetCharacterList(data);
}
function resetCharacterList(data) {
    const list = document.getElementById("characterList");
    if (!list) return;

    list.innerHTML = data.map(c => {
        const kname = window.kingdoms?.find(k => String(k.id) === String(c.kingdom))?.name || "Tự do";
        const pl = c.pl || 0;
        const plDisplay = pl.toLocaleString();

        let tierClass = "tier-common";
        if (pl >= 200000) tierClass = "tier-mythic";
        else if (pl >= 100000) tierClass = "tier-legendary";
        else if (pl >= 50000) tierClass = "tier-epic";
        else if (pl >= 10000) tierClass = "tier-rare";
        return `
        <div class="char-card animate-card ${tierClass}" id="card-${c.id}" onclick="openProfile('${c.id}')">
            <button class="fav-btn ${c.favorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${c.id}')">
                <i class="fa-${c.favorite ? 'solid' : 'regular'} fa-heart"></i>
            </button>

            <div class="card-image-container">
                <img id="img-${c.id}" 
                     class="card-img lazy-load-img" 
                     src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" 
                     data-id="${c.id}"
                     alt="${c.name}">
                <div class="card-overlay">
                    <div class="pl-badge"><i class="fa-solid fa-bolt"></i> ${plDisplay}</div>
                </div>
            </div>

            <div class="card-content">
                <div class="card-header">
                    <span class="card-race">${c.race || 'Chủng tộc'}</span>
                    <h3 class="card-name">${c.name}</h3>
                </div>
                <div class="card-info-row">
                    <span class="info-tag"><i class="fa-solid fa-crown"></i> ${kname}</span>
                </div>
                <div class="card-footer">
                    <span class="card-status status-${(c.status || 'unknown').toLowerCase()}">${c.status || 'Ngoại tuyến'}</span>
                    <i class="fa-solid fa-chevron-right arrow-icon"></i>
                </div>
            </div>
        </div>
        `;
    }).join("");
    initLazyLoading();
}
let globalCharObserver;
function initLazyLoading() {
    if (!globalCharObserver) {
        globalCharObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(async (entry) => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const charId = img.dataset.id;
                    if (img.dataset.loaded === "true") {
                        observer.unobserve(img);
                        return;
                    }

                    const char = window.characters.find(c => String(c.id) === String(charId));
                    let src = "https://i.imgur.com/6X8FQyA.png";

                    if (char && char.img) {
                        if (char.img.startsWith("http") || char.img.startsWith("data:")) {
                            src = char.img;
                        } else if (typeof getImage === "function") {
                            src = (await getImage(char.img).catch(() => null)) || src;
                        }
                    }
                    img.src = src;
                    img.onload = () => {
                        img.style.opacity = "1";
                        img.dataset.loaded = "true";
                    };
                    
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: "150px" });
    }
    document.querySelectorAll('.lazy-load-img:not([data-loaded="true"])').forEach(img => {
        globalCharObserver.observe(img);
    });
}
function applyFilters() {
    clearTimeout(window.filterTimeout);
    window.filterTimeout = setTimeout(() => {
        const term = (document.getElementById("codexSearch")?.value || "").toLowerCase().trim();
        const race = document.getElementById("raceFilter")?.value;
        const statusFilter = document.getElementById("filterStatus")?.value || "";

        const filtered = window.characters.filter(c => {
            const matchName = !term || 
                (c.name || "").toLowerCase().includes(term) || 
                (c.faction || "").toLowerCase().includes(term) ||
                (c.job || "").toLowerCase().includes(term);
            const matchRace = !race || c.race === race;
            const matchStatus = !statusFilter || c.status === statusFilter;
            return matchName && matchRace && matchStatus;
        });

        if (typeof render === "function") render(filtered);
    }, 200); 
}
function renderJSONView() {
    const box = document.getElementById("codexContent");
    if (!box) return;
    try {
        const jsonData = JSON.stringify(window.characters, null, 2);
        box.textContent = jsonData; 
    } catch (err) {
        box.innerText = "❌ Lỗi định dạng dữ liệu: " + err.message;
    }
}
async function copyJSON() {
    const key = document.getElementById("codexKeySelect")?.value;
    if (!key) return showToast("⚠️ Vui lòng chọn danh mục để copy!");

    let data = [];

    try {
        if (key === "creatures") {
            const dbRequest = indexedDB.open("CreatureCodexDB", 1);
            
            dbRequest.onsuccess = (e) => {
                const dbC = e.target.result;
                const tx = dbC.transaction("creatures", "readonly");
                const store = tx.objectStore("creatures");
                const req = store.getAll();

                req.onsuccess = async () => {
                    const creaturesData = req.result || [];
                    if (creaturesData.length === 0) return showToast("⚠️ Không có sinh vật nào để copy!");
                    
                    const json = JSON.stringify(creaturesData, null, 2);
                    await navigator.clipboard.writeText(json);
                    if (document.getElementById("codexContent")) {
                        document.getElementById("codexContent").innerText = json;
                    }
                    showToast("📋 Đã copy dữ liệu Sinh vật vào Clipboard!");
                };
            };
            return;
        }
        if (key.includes("_data")) {
            data = (typeof dbGetCustom === "function") ? await dbGetCustom(key) : (window[key] || []);
        } else {
            data = (typeof dbGetAll === "function") ? await dbGetAll(key) : (window[key] || []);
        }
        if (!data || (Array.isArray(data) && data.length === 0)) {
            return showToast(`⚠️ Danh mục [${key}] hiện đang trống!`);
        }
        const jsonData = JSON.stringify(data, null, 2);
        await navigator.clipboard.writeText(jsonData);
        if (document.getElementById("codexContent")) {
            document.getElementById("codexContent").innerText = jsonData;
        }
        
        showToast(`📋 Đã copy JSON của [${key}] thành công!`);

    } catch (err) {
        console.error("Lỗi copy JSON:", err);
        showToast("❌ Không thể copy. Vui lòng kiểm tra quyền Clipboard hoặc dữ liệu.");
    }
}
function loadCompareSelect() {
    const selectA = document.getElementById("compareA");
    const selectB = document.getElementById("compareB");
    if (!selectA || !selectB) return;

    const fragmentA = document.createDocumentFragment();
    const fragmentB = document.createDocumentFragment();
    const defaultOpt = () => {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "-- Chọn nhân vật --";
        return opt;
    };

    fragmentA.appendChild(defaultOpt());
    fragmentB.appendChild(defaultOpt());

    window.characters.forEach(char => {
        const opt = document.createElement("option");
        opt.value = char.id;
        opt.textContent = char.name;
        
        fragmentA.appendChild(opt);
        fragmentB.appendChild(opt.cloneNode(true)); 
    });
    selectA.innerHTML = "";
    selectB.innerHTML = "";
    selectA.appendChild(fragmentA);
    selectB.appendChild(fragmentB);
}
const calculatePL = (nv) => {
    if (!nv.stats) return 0;
    let total = 0;
    DANH_SACH_CHI_SO.forEach(nhom => {
        nhom.items.forEach(item => {
            const val = nv.stats?.[nhom.groupKey]?.[item.key] || 0;
            total += Number(val);
        });
    });
    return nv.pl || total; 
};

const DANH_SACH_CHI_SO = [
    {
        nhom: "⚡ Chỉ số cơ bản",
        moTa: "Nền tảng sức mạnh của nhân vật",
        items: [
            { key: "str", ten: "Sức mạnh (STR)", sub: "Tăng sát thương vật lý" },
            { key: "agi", ten: "Nhanh nhẹn (AGI)", sub: "Tăng tốc độ, né tránh" },
            { key: "int", ten: "Trí tuệ (INT)", sub: "Tăng sức mạnh phép thuật" },
            { key: "vit", ten: "Thể lực (VIT)", sub: "Tăng máu, chống chịu" },
            { key: "spi", ten: "Tinh thần (SPI)", sub: "Kháng phép, hồi mana" },
            { key: "luk", ten: "May mắn (LUK)", sub: "Chí mạng, rơi đồ" }
        ],
        groupKey: "core"
    },
    {
        nhom: "❤️ Chỉ số sinh tồn",
        moTa: "Khả năng duy trì chiến đấu",
        items: [
            { key: "hp", ten: "HP (Máu)", sub: "Lượng máu hiện có" },
            { key: "mp", ten: "MP (Mana)", sub: "Năng lượng kỹ năng" },
            { key: "stamina", ten: "Thể lực (Stamina)", sub: "Dùng để chạy, né" },
            { key: "shield", ten: "Khiên (Shield)", sub: "Bảo vệ tạm thời" }
        ],
        groupKey: "vital"
    },
    {
        nhom: "⚔️ Chỉ số tấn công",
        moTa: "Khả năng gây sát thương",
        items: [
            { key: "atk", ten: "Vật lý (ATK)", sub: "Sát thương tay" },
            { key: "matk", ten: "Phép (MATK)", sub: "Sát thương phép" },
            { key: "critRate", ten: "Tỷ lệ chí mạng", sub: "% cơ hội X2 dame" },
            { key: "critDmg", ten: "Sát thương chí mạng", sub: "Sức mạnh cú đánh" },
            { key: "pen", ten: "Xuyên giáp", sub: "Bỏ qua phòng ngự" },
            { key: "atkSpeed", ten: "Tốc độ đánh", sub: "Số đòn mỗi giây" }
        ],
        groupKey: "offense"
    },
    {
        nhom: "🛡️ Chỉ số phòng thủ",
        moTa: "Khả năng giảm chịu đựng",
        items: [
            { key: "def", ten: "Giáp (DEF)", sub: "Giảm ST vật lý" },
            { key: "mdef", ten: "Kháng phép (MDEF)", sub: "Giảm ST phép" },
            { key: "evasion", ten: "Né tránh", sub: "Tỷ lệ hụt đòn" },
            { key: "block", ten: "Đỡ đòn", sub: "Giảm ST khi đỡ" },
            { key: "resist", ten: "Kháng hiệu ứng", sub: "Giảm thời gian khống chế" }
        ],
        groupKey: "defense"
    }
];
async function compareCharacters() {
    const idA = document.getElementById("compareA")?.value;
    const idB = document.getElementById("compareB")?.value;
    if (!idA || !idB || String(idA) === String(idB)) {
        showToast("⚠️ Vui lòng chọn 2 nhân vật khác nhau!");
        return;
    }

    const nvA = window.characters.find(c => String(c.id) === String(idA));
    const nvB = window.characters.find(c => String(c.id) === String(idB));
    
    if (!nvA || !nvB) {
        showToast("❌ Không tìm thấy dữ liệu nhân vật!");
        return;
    }
    const getSumPL = (nv) => {
        let total = 0;
        DANH_SACH_CHI_SO.forEach(n => {
            n.items.forEach(i => {
                total += Number(nv.stats?.[n.groupKey]?.[i.key] || 0);
            });
        });
        return nv.pl || total;
    };

    const plA = getSumPL(nvA);
    const plB = getSumPL(nvB);

    let scoreA = 0;
    let scoreB = 0;
    const radarLabels = [];
    const radarDataA = [];
    const radarDataB = [];

    let html = `
        <div class="compare-summary">
            <div class="summary-card">
                <div class="sm-name">${nvA.name}</div>
                <div class="sm-pl">PL: ${plA.toLocaleString()}</div>
                <div class="sm-win"><span id="totalA">0</span> thắng</div>
            </div>
            <div class="summary-vs">VS</div>
            <div class="summary-card">
                <div class="sm-name">${nvB.name}</div>
                <div class="sm-pl">PL: ${plB.toLocaleString()}</div>
                <div class="sm-win"><span id="totalB">0</span> thắng</div>
            </div>
        </div>
        
        <div class="radar-container" style="position: relative; height:300px; width:100%">
            <canvas id="compareRadarChart"></canvas>
        </div>

        <table class="bang-so-sanh">
            <thead>
                <tr>
                    <th>Chỉ số</th>
                    <th>${nvA.name}</th>
                    <th>${nvB.name}</th>
                </tr>
            </thead>
            <tbody>
                <tr class="pl-row" style="background: rgba(251, 191, 36, 0.1);">
                    <td>⭐ Power Level (Tổng)</td>
                    <td class="${plA > plB ? 'winner' : 'loser'}"><b>${plA.toLocaleString()}</b></td>
                    <td class="${plB > plA ? 'winner' : 'loser'}"><b>${plB.toLocaleString()}</b></td>
                </tr>`;

    DANH_SACH_CHI_SO.forEach(nhom => {
        html += `<tr class="group-header"><td colspan="3">${nhom.nhom}</td></tr>`;

        nhom.items.forEach(item => {
            const valA = Number(nvA.stats?.[nhom.groupKey]?.[item.key] || 0);
            const valB = Number(nvB.stats?.[nhom.groupKey]?.[item.key] || 0);

            if (valA > valB) scoreA++;
            else if (valB > valA) scoreB++;
            if (nhom.groupKey === "core") {
                radarLabels.push(item.ten.split(' ')[0]);
                radarDataA.push(valA);
                radarDataB.push(valB);
            }

            const classA = valA > valB ? "winner" : (valA < valB ? "loser" : "");
            const classB = valB > valA ? "winner" : (valB < valA ? "loser" : "");

            html += `
                <tr>
                    <td class="stat-label">
                        <div class="stat-name">${item.ten}</div>
                    </td>
                    <td class="stat-value ${classA}">${valA.toLocaleString()}</td>
                    <td class="stat-value ${classB}">${valB.toLocaleString()}</td>
                </tr>`;
        });
    });

    html += `</tbody></table>`;
    
    const resultBox = document.getElementById("compareResult");
    if (resultBox) {
        resultBox.innerHTML = html;
        setTimeout(() => {
            document.getElementById("totalA").innerText = scoreA;
            document.getElementById("totalB").innerText = scoreB;
            if (typeof Chart !== 'undefined') {
                renderCompareChart(radarLabels, radarDataA, radarDataB, nvA.name, nvB.name);
            }
        }, 50);
        resultBox.classList.add("show");
    }
}
function renderCompareChart(labels, dataA, dataB, nameA, nameB) {
    const canvas = document.getElementById('compareRadarChart');
    if (!canvas) {
        console.error("❌ GM: Không tìm thấy thẻ canvas 'compareRadarChart'");
        return;
    }

    const ctx = canvas.getContext('2d');
    if (window.myRadarChart instanceof Chart) {
        window.myRadarChart.destroy();
    }

    window.myRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: nameA,
                    data: dataA,
                    backgroundColor: 'rgba(99, 102, 241, 0.2)', 
                    borderColor: '#6366f1',
                    pointBackgroundColor: '#6366f1',
                    borderWidth: 2
                },
                {
                    label: nameB,
                    data: dataB,
                    backgroundColor: 'rgba(244, 63, 94, 0.2)', 
                    borderColor: '#f43f5e',
                    pointBackgroundColor: '#f43f5e',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255,255,255,0.1)' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: { color: '#94a3b8', font: { size: 11 } },
                    ticks: { display: false },
                    suggestedMin: 0
                }
            },
            plugins: {
                legend: { labels: { color: '#f1f5f9', font: { size: 12 } } }
            }
        }
    });
}
async function renderRaces(data = window.races) {
    const container = document.getElementById("raceList");
    const countEl = document.getElementById("raceCount");
    if (!container) return;

    if (countEl) countEl.innerText = data.length;

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>Chưa có chủng tộc nào được khai phá...</p></div>`;
        return;
    }

    container.innerHTML = ""; 
    const fragment = document.createDocumentFragment();
    const totalChars = window.characters?.length || 0;

    data.forEach((race, index) => {
        const card = document.createElement("div");
        card.className = "race-card animate-fadeIn";
        card.style.animationDelay = `${index * 0.05}s`;

        const memberCount = countMembers(race.name);
        const populationPercent = totalChars > 0 ? ((memberCount / totalChars) * 100).toFixed(1) : 0;
        let traitsHTML = "";
        if (race.lifespan) {
            traitsHTML += `<span class="trait-tag"><i class="fa-solid fa-hourglass-half"></i> ${race.lifespan} năm</span>`;
        }
        if (race.kingdom) {
            traitsHTML += `<span class="trait-tag"><i class="fa-solid fa-crown"></i> ${race.kingdom}</span>`;
        }
        if (race.environment) {
            traitsHTML += `<span class="trait-tag"><i class="fa-solid fa-mountain-sun"></i> ${race.environment}</span>`;
        }

        card.innerHTML = `
            <i class="fa-solid fa-dna race-icon-bg"></i>
            <div class="race-card-header">
                <h3 class="race-name">${race.name || 'Vô danh'}</h3>
                <div class="race-actions">
                    <button class="icon-btn-sm edit-btn" title="Sửa"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="icon-btn-sm delete-btn" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            ${race.appearance ? `
                <p class="race-desc">
                    ${race.appearance.length > 85 ? race.appearance.substring(0, 85) + '...' : race.appearance}
                </p>
            ` : ''}
            <div class="race-traits">
                ${traitsHTML}
            </div>
            <div class="race-footer">
                <div class="pop-info">
                    <span class="pop-label">Dân số: ${memberCount}</span>
                    <div class="pop-bar"><div class="pop-fill" style="width: ${populationPercent}%"></div></div>
                </div>
                <button class="btn-text-gold detail-btn">Chi tiết <i class="fa-solid fa-chevron-right"></i></button>
            </div>
        `;

        card.onclick = () => openRacePage(index); 
        
        card.querySelector(".edit-btn").onclick = (e) => { 
            e.stopPropagation(); 
            editRace(index); 
        };
        
        card.querySelector(".delete-btn").onclick = (e) => { 
            e.stopPropagation(); 
            deleteRace(index); 
        };

        card.querySelector(".detail-btn").onclick = (e) => {
            e.stopPropagation();
            openRacePage(index);
        };

        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}
function editRace(i) {
    const r = window.races[i];
    if (!r) return;
    
    editingRace = i; 
    const fieldsMap = {
        raceName: 'name', 
        raceAppearance: 'appearance', 
        raceOrigin: 'origin',
        raceEnvironment: 'environment',
        raceLifespan: 'lifespan',
        raceIntelligence: 'intelligence',
        raceSkills: 'skills', 
        raceWeakness: 'weakness',
        raceSubTypes: 'subTypes',
        raceKingdom: 'kingdom', 
        raceRelations: 'relations'
    };

    Object.entries(fieldsMap).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.value = r[key] || "";
    });

    const modal = document.getElementById("raceModal");
    if (modal) {
        modal.style.display = "flex";
        setTimeout(() => modal.classList.add("active"), 10);
    }
    
    document.getElementById("raceName")?.focus();
}
async function deleteRace(i) {
    const r = window.races[i];
    if (!r) return;

    const raceName = r.name ? r.name.trim() : "";
    const isUsed = window.characters?.some(c => 
        String(c.race).trim().toLowerCase() === raceName.toLowerCase()
    );

    if (isUsed) {
        alert(`⚠️ Không thể xóa: Chủng tộc "${raceName}" đang có nhân vật sử dụng!`);
        return;
    }

    if (confirm(`❓ Bạn có chắc muốn xóa chủng tộc "${raceName}" khỏi sử sách?`)) {
        window.races.splice(i, 1);
        
        if (typeof dbSave === "function") {
            await dbSave("races", window.races);
        }
        
        if (typeof renderRaces === "function") renderRaces();
        if (typeof updateRaceOptions === "function") updateRaceOptions();
        
        showToast("🗑️ Đã xóa chủng tộc thành công.");
    }
}
async function saveRace() {
    const fields = [
        "raceName", "raceAppearance", "raceOrigin", "raceEnvironment", 
        "raceLifespan", "raceIntelligence", "raceSkills", "raceWeakness", 
        "raceSubTypes", "raceKingdom", "raceRelations"
    ];
    const values = {};
    
    fields.forEach(id => {
        const key = id.replace("race", "").charAt(0).toLowerCase() + id.replace("race", "").slice(1);
        const el = document.getElementById(id);
        values[key] = el ? el.value.trim() : "";
    });

    if (!values.name) {
        showToast("⚠️ Tên chủng tộc không được để trống!", "error");
        return;
    }

    try {
        if (editingRace === -1) {
            const isDuplicate = window.races.some(r => 
                String(r.name).trim().toLowerCase() === values.name.toLowerCase()
            );
            if (isDuplicate) {
                showToast("⚠️ Chủng tộc này đã tồn tại!", "info");
                return;
            }
            window.races.push(values);
        } else {
            const oldName = window.races[editingRace] ? window.races[editingRace].name : null;
            
            if (oldName && oldName !== values.name) {
                window.characters.forEach(c => {
                    if (String(c.race).trim().toLowerCase() === String(oldName).trim().toLowerCase()) {
                        c.race = values.name;
                    }
                });
                if (typeof dbSave === "function") await dbSave("characters", window.characters);
            }
            window.races[editingRace] = values;
        }

        if (typeof dbSave === "function") await dbSave("races", window.races);

        renderRaces();
        updateRaceOptions();
        closeRaceModal();
        
        showToast(`✅ Đã lưu chủng tộc: ${values.name}`, "success");
    } catch (err) {
        console.error(err);
        showToast("❌ Lỗi khi lưu dữ liệu!", "error");
    }
}
function updateRaceOptions() {
    const raceSelect = document.getElementById("charRace");
    if (!raceSelect) return;
    raceSelect.innerHTML = '<option value="">-- Chọn chủng tộc --</option>';
    if (window.races && window.races.length > 0) {
        window.races.forEach(race => {
            const option = document.createElement("option");
            option.value = race.name;
            option.textContent = race.name; 
            raceSelect.appendChild(option);
        });
    }
}
async function openRacePage(i) {
    const r = window.races[i];
    if (!r) return;
    
    const fields = [
        "Name", "Appearance", "Origin", "Environment", 
        "Lifespan", "Intelligence", "Skills", "Weakness", 
        "SubTypes", "Kingdom", "Relations"
    ];

    fields.forEach(f => {
        const key = f.charAt(0).toLowerCase() + f.slice(1);
        const el = document.getElementById(`racePage${f}`);
        const container = el?.closest('.info-box') || el?.parentElement;
        
        if (el) {
            if (r[key] && r[key].trim() !== "") {
                el.textContent = r[key];
                if (container) container.style.display = "block"; 
            } else {
                if (container) container.style.display = "none"; 
            }
        }
    });

    const container = document.getElementById("raceCharacters");
    const statsEl = document.getElementById("racePopCount");
    
    const list = window.characters?.filter(c => 
        String(c.race).toLowerCase() === String(r.name).toLowerCase()
    ) || [];

    if (statsEl) statsEl.textContent = list.length;

    if (container) {
        container.innerHTML = "";
        if (list.length > 0) {
            for (const c of list) {
                const imgSrc = c.img ? (c.img.startsWith('http') ? c.img : await getImage(c.img)) : 'https://i.imgur.com/6X8FQyA.png';
                container.innerHTML += `
                    <div class="race-char-card" onclick="openProfile('${c.id}')">
                        <img src="${imgSrc}" class="char-mini-avatar">
                        <div class="char-mini-info">
                            <span class="char-name">${c.name}</span>
                            <small>${c.job || 'Tự do'}</small>
                        </div>
                    </div>`;
            }
        } else {
            container.innerHTML = `<p class="empty-state-mini">Chưa có thành viên nào.</p>`;
        }
    }

    showPage("racePage"); 
}
function resetRaceForm() {
    const fields = [
        "raceName", "raceAppearance", "raceOrigin", "raceEnvironment", 
        "raceLifespan", "raceIntelligence", "raceSkills", "raceWeakness", 
        "raceSubTypes", "raceKingdom", "raceRelations"
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}
function openRaceModal() {
    editingRace = -1;
    resetRaceForm();
    const modal = document.getElementById("raceModal");
    if (modal) {
        modal.style.display = "flex";
        setTimeout(() => modal.classList.add("active"), 10);
        document.getElementById("raceName")?.focus();
    }
}
function closeRaceModal() {
    const modal = document.getElementById("raceModal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => {
            modal.style.display = "none";
            editingRace = -1;
        }, 300);
    }
}
function countMembers(name) {
    return window.characters?.filter(c => String(c.race) === String(name)).length || 0;
}
async function showSuggestions() {
    const input = document.getElementById("homeSearch");
    const box = document.getElementById("searchSuggestions");
    if (!input || !box) return;

    const text = input.value.toLowerCase().trim();
    box.innerHTML = "";

    if (!text) {
        box.style.display = "none";
        return;
    }
    const results = window.characters.filter(c => 
        (c.name || "").toLowerCase().includes(text)
    ).slice(0, 5);

    if (results.length === 0) {
        box.style.display = "none";
        return;
    }

    const fragment = document.createDocumentFragment();
    for (const char of results) {
        const div = document.createElement("div");
        div.className = "suggestion-item animate-fade-in";
        let thumbSrc = "https://i.imgur.com/6X8FQyA.png";
        if (char.img && typeof getImage === "function") {
            const stored = await getImage(char.img).catch(() => null);
            if (stored) thumbSrc = stored;
        }

        div.innerHTML = `
            <img src="${thumbSrc}" class="suggestion-thumb">
            <div class="suggestion-info">
                <span class="suggestion-name">${char.name}</span>
                <small class="suggestion-race">${char.race || 'Chưa rõ'}</small>
            </div>
        `;

        div.onclick = () => {
            if (typeof openProfile === "function") openProfile(char.id);
            box.style.display = "none";
            input.value = "";
        };
        fragment.appendChild(div);
    }

    box.appendChild(fragment);
    box.style.display = "block";
}
function quickSearch() { 
    const homeInput = document.getElementById("homeSearch");
    const codexSearch = document.getElementById("codexSearch");
    
    if (!homeInput) return;
    const term = homeInput.value.trim();

    if (codexSearch) {
        codexSearch.value = term;
    }
    if (typeof applyFilters === "function") {
        applyFilters(); 
    }
    if (typeof showPage === "function") {
        showPage("characters");
    }
    const box = document.getElementById("searchSuggestions");
    if (box) box.style.display = "none";
}
document.getElementById("homeSearch")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") quickSearch();
});
async function addFormField(formData = {}) {
    const container = document.getElementById("formsContainer");
    if (!container) return;

    const uniqueId = `file_${crypto.randomUUID()}`;
    const div = document.createElement("div");
    div.className = "form-item card animate-fade-in";
    div.style = "background: var(--bg-secondary); padding: 12px; border-radius: 12px; margin-bottom: 15px; border: 1px solid var(--border);";
    
    div.innerHTML = `
        <div class="form-row" style="display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap;">
            <div class="form-img-preview-container" style="position: relative; width: 80px; height: 80px; flex-shrink: 0; margin: 0 auto;">
                <img class="formImgPreview" src="https://i.imgur.com/6X8FQyA.png" 
                     style="width: 100%; height: 100%; object-fit: contain; background: #000; border-radius: 8px; border: 1px solid var(--border);" 
                     data-img-id="${formData.img || ""}">
                <input type="file" class="formImgInput" accept="image/*" id="${uniqueId}" style="display:none;">
                <label for="${uniqueId}" class="btn-change-img" style="position: absolute; bottom: -4px; right: -4px; background: var(--primary); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                    <i class="fa fa-camera" style="font-size: 12px;"></i>
                </label>
            </div>

            <div class="form-inputs" style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 8px;">
                <div class="input-stack">
                    <label style="font-size: 11px; color: var(--primary); font-weight: bold; text-transform: uppercase;">Tên trạng thái</label>
                    <input class="formName" placeholder="VD: Super Saiyan..." value="${formData.name || ""}" style="width: 100%; padding: 8px; border-radius: 6px;">
                </div>
                <div class="input-stack">
                    <label style="font-size: 11px; color: var(--primary); font-weight: bold; text-transform: uppercase;">Mô tả sức mạnh</label>
                    <textarea class="formDesc" placeholder="Mô tả kỹ năng, đặc điểm..." rows="2" style="width: 100%; padding: 8px; border-radius: 6px; font-size: 0.9rem;">${formData.desc || ""}</textarea>
                </div>
            </div>

            <button type="button" class="btn-delete-form" onclick="this.closest('.form-item').remove()" 
                    style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; padding: 8px; border-radius: 8px; cursor: pointer; align-self: flex-start;">
                <i class="fa fa-trash"></i>
            </button>
        </div>
    `;

    const fileInput = div.querySelector(".formImgInput");
    const preview = div.querySelector(".formImgPreview");
    if (formData.img) {
        const isUrl = formData.img.startsWith("http") || formData.img.startsWith("data:");
        if (isUrl) {
            preview.src = formData.img;
        } else if (typeof getImage === "function") {
            try {
                const base64 = await getImage(formData.img);
                if (base64) preview.src = base64;
            } catch (e) { console.warn(e); }
        }
    }
    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return showToast("⚠️ Chỉ hỗ trợ tệp ảnh!");
        
        const newImgId = crypto.randomUUID();
        try {
            preview.style.opacity = "0.5";
            if (typeof saveImage === "function") {
                await saveImage(newImgId, file);
                const tempUrl = URL.createObjectURL(file);
                preview.src = tempUrl;
                preview.dataset.imgId = newImgId;
                preview.onload = () => URL.revokeObjectURL(tempUrl);
            }
            preview.style.opacity = "1";
        } catch (err) {
            showToast("❌ Lỗi lưu ảnh");
            preview.style.opacity = "1";
        }
    });

    container.appendChild(div);
    return div;
}
function addRelationField(rel = {}) {
    const container = document.getElementById("relationContainer");
    if (!container) return;

    const div = document.createElement("div");
    div.className = "relation-item animate-fade-in";
    div.style = "background: var(--bg-secondary); padding: 12px; border-radius: 10px; margin-bottom: 10px; border: 1px solid var(--border); position: relative;";
    
    const charOptions = window.characters.map(c => 
        `<option value="${c.id}" ${rel.targetId === c.id ? 'selected' : ''}>${c.name}</option>`
    ).join("");

    div.innerHTML = `
        <div class="rel-inputs" style="display: flex; flex-direction: column; gap: 8px;">
            <div class="input-group-mobile">
                <label style="font-size: 11px; color: var(--primary); font-weight: bold; display: block; margin-bottom: 4px;">ĐỐI TƯỢNG</label>
                <select class="rel-character" style="width: 100%; padding: 10px; border-radius: 6px; background: var(--bg-main); color: var(--text-bright); border: 1px solid var(--border);">
                    <option value="">-- Chọn nhân vật --</option>
                    ${charOptions}
                </select>
            </div>
            <div class="input-group-mobile">
                <label style="font-size: 11px; color: var(--primary); font-weight: bold; display: block; margin-bottom: 4px;">QUAN HỆ</label>
                <input type="text" 
                       class="rel-type" 
                       placeholder="VD: Anh trai, Đối thủ..." 
                       value="${rel.type || ""}" 
                       style="width: 100%; padding: 10px; border-radius: 6px; background: var(--bg-main); color: var(--text-bright); border: 1px solid var(--border);">
            </div>
        </div>
        <button class="btn-remove-rel" onclick="this.parentElement.remove()" 
                style="position: absolute; top: 8px; right: 8px; background: none; border: none; color: var(--text-dim); cursor: pointer; padding: 5px;">
            <i class="fa fa-times-circle" style="font-size: 18px;"></i>
        </button>
    `;
    
    container.appendChild(div);
}
function openStats(id) {
    if (!id || id === "null") {
        showToast("⚠️ Vui lòng lưu nhân vật trước khi xem bảng chỉ số chi tiết!");
        return;
    }
    window.open(`stats.html?id=${id}`, "_blank");
}
function val(id, fallback = "") {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const value = el.value !== undefined ? el.value.trim() : fallback;
    return value === "" ? fallback : value;
}
function getStats(group) {
    const fields = {
        core: ["str", "agi", "int", "vit", "spi", "luk"],
        vital: ["hp", "mp", "stamina", "shield"],
        offense: ["atk", "matk", "critRate", "critDmg", "pen", "atkSpeed", "castSpeed"],
        defense: ["def", "mdef", "evasion", "block", "dmgReduce", "resist"]
    };

    const stats = {};
    const targetKeys = fields[group] || [];

    targetKeys.forEach(key => {
        const el = document.getElementById(`stat_${key}`) || document.getElementById(`stat${key.charAt(0).toUpperCase() + key.slice(1)}`);
        
        if (el) {
            const val = parseFloat(el.value);
            stats[key] = isNaN(val) ? 0 : val;
        } else {
            stats[key] = 0;
        }
    });

    return stats;
}
function openFormModal(name, imgSrc, desc) {
    const modal = document.getElementById("formModal");
    if (!modal) return;

    const nameEl = document.getElementById("formModalName");
    const imgEl = document.getElementById("formModalImg");
    const descEl = document.getElementById("formModalDesc");

    if (nameEl) nameEl.innerText = name;
    if (imgEl) imgEl.src = imgSrc || "https://i.imgur.com/6X8FQyA.png";
    if (descEl) descEl.innerText = desc || "Không có mô tả cho trạng thái này.";

    modal.classList.add("active");
    modal.style.display = "flex";
}
function closeFormModal(){
    const modal = document.getElementById("formModal");
    modal.style.display = "none";
}
function updateCharacterLocationOptions() {
    const select = document.getElementById("charLocation");
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Chọn địa điểm hiện tại --</option>';
    
    const fragment = document.createDocumentFragment();
    const data = window.locations || [];
    
    data.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l.id;
        opt.textContent = l.name;
        if (l.id === currentValue) opt.selected = true;
        fragment.appendChild(opt);
    });

    select.appendChild(fragment);
}
async function drawNetwork() {
    const container = document.getElementById('relationshipPage');
    if (!container) return;
    let networkCanvas = document.getElementById('network-canvas');
    if (!networkCanvas) {
        networkCanvas = document.createElement('div');
        networkCanvas.id = 'network-canvas';
        networkCanvas.style.width = "100%";
        networkCanvas.style.height = "600px";
        container.innerHTML = '<h2 class="page-title">Sơ Đồ Quan Hệ Nhân Vật</h2>';
        container.appendChild(networkCanvas);
    }
    networkCanvas.innerHTML = `<div class="loading-network">Đang khởi tạo sơ đồ...</div>`;
    const nodeList = await Promise.all(window.characters.map(async (c) => {
        let imgUrl = "https://i.imgur.com/6X8FQyA.png";
        if (c.img) {
            if (c.img.startsWith("http") || c.img.startsWith("data:")) {
                imgUrl = c.img;
            } else if (typeof getImage === "function") {
                try {
                    const storedImg = await getImage(c.img);
                    if (storedImg) imgUrl = storedImg;
                } catch (e) { console.warn("Lỗi tải ảnh:", e); }
            }
        }
        return {
            id: c.id,
            label: `<b>${c.name}</b>\n<i>${c.job || ''}</i>`,
            shape: 'circularImage',
            image: imgUrl,
            size: 35,
            borderWidth: 3,
            color: {
                border: c.gender === 'Nữ' ? '#ec4899' : '#6366f1',
                background: '#1e293b',
                highlight: { border: '#fbbf24', background: '#1e293b' }
            },
            font: { 
                multi: 'html', 
                color: '#f1f5f9', 
                size: 14,
                face: 'Plus Jakarta Sans'
            }
        };
    }));
    const edges = [];
    window.characters.forEach(c => {
        if (c.relations && Array.isArray(c.relations)) {
            c.relations.forEach(rel => {
                const targetExists = window.characters.some(t => t.id === rel.targetId);
                if (targetExists) {
                    edges.push({
                        from: c.id,
                        to: rel.targetId,
                        label: rel.type,
                        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
                        color: { color: 'rgba(148, 163, 184, 0.6)', hover: '#fbbf24', highlight: '#fbbf24' },
                        font: { size: 11, color: '#cbd5e1', strokeWidth: 0, align: 'top' },
                        smooth: { type: 'curvedCW', roundness: 0.2 }
                    });
                }
            });
        }
    });
    const options = {
        physics: {
            enabled: true,
            barnesHut: {
                gravitationalConstant: -4000,
                springLength: 200,
                avoidOverlap: 1
            },
            stabilization: { iterations: 150 }
        },
        interaction: {
            hover: true,
            tooltipDelay: 200,
            hideEdgesOnDrag: true
        }
    };

    networkCanvas.innerHTML = "";
    if (typeof vis === "undefined") {
        networkCanvas.innerHTML = "<p style='color:red; padding:20px;'>Lỗi: Thư viện Vis.js chưa được tải. Vui lòng thêm script Vis.js vào index.html</p>";
        return;
    }
    const data = { nodes: new vis.DataSet(nodeList), edges: new vis.DataSet(edges) };
    const network = new vis.Network(networkCanvas, data, options);
    network.on("doubleClick", (params) => {
        if (params.nodes.length > 0) {
            const charId = params.nodes[0];
            if (typeof openProfile === "function") {
                openProfile(charId);
                showPage('characterPage');
            }
        }
    });
}
document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (typeof reloadAllData === "function") {
            await reloadAllData();
        } else {
            console.error("❌ GM: Không tìm thấy hàm reloadAllData!");
        }
        const safeRun = async (fn, ...args) => {
            if (typeof fn === "function") {
                return await fn(...args);
            } else {
                console.warn(`⚠️ GM: Hàm ${fn} chưa được định nghĩa. Kiểm tra lại file .js tương ứng.`);
            }
        };
        safeRun(render);
        safeRun(renderJSONView);
        safeRun(loadCompareSelect);
        safeRun(renderRaces);
        safeRun(updateRaceOptions);
        safeRun(initImageUpload);
        if (typeof renderKingdoms === "function") await renderKingdoms();
        if (typeof updateKingdomOptions === "function") updateKingdomOptions();
        if (typeof renderFactions === "function") await renderFactions();
        const openId = localStorage.getItem("openCharacterId");
        if (openId && openId !== "undefined") {
            localStorage.removeItem("openCharacterId");
            if (typeof openProfile === "function") {
                await openProfile(openId);
                showPage("characterPage");
            }
        } else {
            const lastPage = localStorage.getItem("currentPage") || "home";
            showPage(lastPage);
        }

        console.log("🚀 GM: Ứng dụng khởi động hoàn tất!");

    } catch (err) {
        console.error("❌ Lỗi khởi động ứng dụng (app.js):", err);
    }
});