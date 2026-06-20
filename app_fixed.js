window.characters = window.characters || [];
window.races = window.races || [];
window.kingdoms = window.kingdoms || [];
window.factions = window.factions || [];
window.locations = window.locations || [];
let editingId = null;
let editingRace = -1;
let refreshTimeout;
if (!window.charPagination) {
    window.charPagination = {
        currentPage: 1,
        itemsPerPage: 30
    };
}
window.exportCharacterToTXT = async function(charId) {
    const char = window.characters.find(c => String(c.id) === String(charId));
    if (!char) {
        if (typeof showToast === "function") showToast("âŒ KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u nhÃ¢n váº­t!");
        return;
    }

    const race = window.races?.find(r => String(r.id) === String(char.race))?.name || char.race || "KhÃ´ng rÃµ";
    const kingdom = window.kingdoms?.find(k => String(k.id) === String(char.kingdom))?.name || "Tá»± do";
    const faction = window.factions?.find(f => String(f.id) === String(char.faction))?.name || "KhÃ´ng cÃ³";
    const location = window.locations?.find(l => String(l.id) === String(char.location))?.name || "ChÆ°a xÃ¡c Ä‘á»‹nh";

    let content = `==========================================\n`;
    content += `        Há»’ SÆ  NHÃ‚N Váº¬T: ${char.name.toUpperCase()}\n`;
    content += `==========================================\n\n`;

    content += `[THÃ”NG TIN CÆ  Báº¢N]\n`;
    content += `- Chá»§ng tá»™c: ${race}\n`;
    content += `- Äáº¿ cháº¿/VÆ°Æ¡ng quá»‘c: ${kingdom}\n`;
    content += `- Phe phÃ¡i: ${faction}\n`;
    content += `- QuÃª quÃ¡n: ${location}\n`;
    content += `- Giá»›i tÃ­nh: ${char.gender || "-"}\n`;
    content += `- Tuá»•i / NgÃ y sinh: ${char.age || "0"} / ${char.birth || "-"}\n`;
    content += `- Nghá» nghiá»‡p: ${char.job || "-"}\n`;
    content += `- Tráº¡ng thÃ¡i: ${char.status || "BÃ¬nh thÆ°á»ng"}\n\n`;

    content += `[Äáº¶C ÄIá»‚M & Tá» CHáº¤T]\n`;
    content += `- Ngoáº¡i hÃ¬nh: ${char.appearance?.replace(/<br>/g, '\n') || "ChÆ°a rÃµ"}\n`;
    content += `- TÃ­nh cÃ¡ch: ${char.personality?.replace(/<br>/g, '\n') || "ChÆ°a rÃµ"}\n`;
    if (char.stats?.hidden || char.hidden) {
        const hidden = char.stats?.hidden || char.hidden;
        content += `- TÃ i nÄƒng: ${hidden.talent || 0} | Tiá»m nÄƒng: ${hidden.potential || 0} | Sá»‘ má»‡nh: ${hidden.fate || 0}\n`;
    }
    content += `\n`;
    content += `[CHá»ˆ Sá» CHI TIáº¾T]\n`;
    content += `- Lá»±c chiáº¿n (Power Level): ${(char.pl || 0).toLocaleString()}\n\n`;

    if (char.stats) {
        const DANH_SACH_CHI_SO = [
            {
                nhom: "âš¡ CHá»ˆ Sá» CÆ  Báº¢N", moTa: "Ná»n táº£ng sá»©c máº¡nh cá»§a nhÃ¢n váº­t", groupKey: "core",
                items: [
                    { key: "str", ten: "Sá»©c máº¡nh (STR)" }, { key: "agi", ten: "Nhanh nháº¹n (AGI)" },
                    { key: "int", ten: "TrÃ­ tuá»‡ (INT)" }, { key: "vit", ten: "Thá»ƒ lá»±c (VIT)" },
                    { key: "spi", ten: "Tinh tháº§n (SPI)" }, { key: "luk", ten: "May máº¯n (LUK)" }
                ]
            },
            {
                nhom: "â¤ï¸ CHá»ˆ Sá» SINH Tá»’N", moTa: "Kháº£ nÄƒng duy trÃ¬ chiáº¿n Ä‘áº¥u", groupKey: "vital",
                items: [
                    { key: "hp", ten: "HP (MÃ¡u)" }, { key: "mp", ten: "MP (Mana)" },
                    { key: "stamina", ten: "Thá»ƒ lá»±c (Stamina)" }, { key: "shield", ten: "KhiÃªn (Shield)" }
                ]
            },
            {
                nhom: "âš”ï¸ CHá»ˆ Sá» Táº¤N CÃ”NG", moTa: "Kháº£ nÄƒng gÃ¢y sÃ¡t thÆ°Æ¡ng", groupKey: "offense",
                items: [
                    { key: "atk", ten: "Váº­t lÃ½ (ATK)" }, { key: "matk", ten: "PhÃ©p (MATK)" },
                    { key: "critRate", ten: "Tá»· lá»‡ chÃ­ máº¡ng (%)" }, { key: "critDmg", ten: "SÃ¡t thÆ°Æ¡ng chÃ­ máº¡ng" },
                    { key: "pen", ten: "XuyÃªn giÃ¡p" }, { key: "atkSpeed", ten: "Tá»‘c Ä‘á»™ Ä‘Ã¡nh" }
                ]
            },
            {
                nhom: "ðŸ›¡ï¸ CHá»ˆ Sá» PHÃ’NG THá»¦", moTa: "Kháº£ nÄƒng giáº£m chá»‹u Ä‘á»±ng", groupKey: "defense",
                items: [
                    { key: "def", ten: "GiÃ¡p (DEF)" }, { key: "mdef", ten: "KhÃ¡ng phÃ©p (MDEF)" },
                    { key: "evasion", ten: "NÃ© trÃ¡nh" }, { key: "block", ten: "Äá»¡ Ä‘Ã²n" },
                    { key: "resist", ten: "KhÃ¡ng hiá»‡u á»©ng" }
                ]
            }
        ];

        DANH_SACH_CHI_SO.forEach(group => {
            content += `${group.nhom} (${group.moTa}):\n`;
            const statsGroup = char.stats[group.groupKey] || {};
            group.items.forEach(item => {
                const val = statsGroup[item.key] || 0;
                content += `  + ${item.ten}: ${val}\n`;
            });
            content += `\n`;
        });
    } else {
        content += `- ChÆ°a cÃ³ dá»¯ liá»‡u chá»‰ sá»‘ chi tiáº¿t.\n\n`;
    }
    // --- Káº¾T THÃšC PHáº¦N CHá»ˆ Sá» ---

    content += `[TRANG Bá»Š]\n`;
    content += `- VÅ© khÃ­: ${char.weapon || "ChÆ°a trang bá»‹"}\n`;
    content += `- GiÃ¡p trá»¥: ${char.armor || "ChÆ°a trang bá»‹"}\n`;
    content += `- Phá»¥ kiá»‡n: ${char.accessory || "ChÆ°a trang bá»‹"}\n\n`;

    content += `[TIá»‚U Sá»¬ & THÃ”NG TIN THÃŠM]\n`;
    content += `${char.desc?.replace(/<br>/g, '\n') || "ChÆ°a cÃ³ tiá»ƒu sá»­."}\n\n`;

    content += `------------------------------------------\n`;
    content += `Xuáº¥t tá»«: Fantasy Codex Pro - ${new Date().toLocaleString()}\n`;

    // --- Sá»¬A Lá»–I FONT TIáº¾NG VIá»†T Táº I ÄÃ‚Y (ThÃªm '\ufeff') ---
    const blob = new Blob(['\ufeff', content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Profile_${char.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    if (typeof showToast === "function") showToast(`âœ¨ ÄÃ£ xuáº¥t TXT: ${char.name}!`, "success");
};
function renderMarkdown(text) {
    if (!text) return "<i>ChÆ°a cÃ³ thÃ´ng tin...</i>";
    let html = text
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
    if (typeof processWikiLinks === 'function') {
        html = processWikiLinks(html);
    } else {
        html = html.replace(/\[\[(.*?)\]\]/g, (match, name) => {
            return `<span class="char-link-wiki" onclick="openCharacterByName('${name.trim()}')">${name}</span>`;
        });
    }
    // Sá»­a: dÃ¹ng replace vá»›i callback thay vÃ¬ flag /s Ä‘á»ƒ tÆ°Æ¡ng thÃ­ch cross-browser
    const listItemsRegex = /^\s*-\s+(.*)$/gm;
    const liItems = [];
    html = html.replace(listItemsRegex, (match, content) => {
        liItems.push(content);
        return `<li>${content}</li>`;
    });
    if (liItems.length > 0) {
        html = html.replace(/(<li>.*?<\/li>)/g, (match) => {
            // Chá»‰ bao láº§n Ä‘áº§u tiÃªn Ä‘Æ°a vÃ o ul
            if (!html.includes('<ul>')) return `<ul>${match}</ul>`;
            return match;
        });
    }
    return html.replace(/\n/g, '<br>');
}
async function openCharacterByName(name) {
    const char = window.characters.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (char) {
        openProfile(char.id);
    } else {
        showToast(`âŒ KhÃ´ng tÃ¬m tháº¥y nhÃ¢n váº­t: ${name}`);
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

        console.log("ðŸ’¾ GM: Há»‡ thá»‘ng Ä‘Ã£ lÆ°u vÃ  Ä‘á»“ng bá»™ thÃ nh cÃ´ng.");
    } catch (err) {
        console.error("âŒ Lá»—i trong saveAndRefresh:", err);
        showToast("âš ï¸ Lá»—i lÆ°u dá»¯ liá»‡u!");
    }
}
async function reloadAllData() {
    const stores = ["characters", "races", "kingdoms", "factions", "locations"];
    try {
        if (typeof initImageDB === "function") {
            await initImageDB().catch(e => console.warn("ðŸŽ¨ GM: DB Init Warning:", e));
        }
        const results = await Promise.all(
            stores.map(s => dbGetAll(s).catch(err => {
                console.error(`âŒ Lá»—i náº¡p store ${s}:`, err);
                return [];
            }))
        );
        [window.characters, window.races, window.kingdoms, window.factions, window.locations] = 
            results.map(data => Array.isArray(data) ? data : []);

        console.log("âœ… GM: Há»‡ thá»‘ng dá»¯ liá»‡u Ä‘Ã£ sáºµn sÃ ng.");
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
        console.error("âŒ reloadAllData Critical Error:", err);
        window.characters = window.characters || [];
        window.races = window.races || [];
        if (typeof showToast === "function") showToast("âŒ Lá»—i náº¡p dá»¯ liá»‡u há»‡ thá»‘ng!");
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
        console.error(`âŒ GM: KhÃ´ng tÃ¬m tháº¥y Section vá»›i ID: ${pageId}`);
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
    if (typeof populateFamilyDropdowns === "function") populateFamilyDropdowns();
    if (typeof updateKingdomOptions === "function") updateKingdomOptions();
    if (typeof updateCharacterLocationOptions === "function") updateCharacterLocationOptions();
    if (typeof updateFactionOptions === "function") updateFactionOptions();

    const modal = document.getElementById("characterModal");
    if (modal) {
        modal.classList.add("active");

        if (!editingId) {
            // --- TRÆ¯á»œNG Há»¢P 1: Táº O Má»šI ---
            // Reset cÃ¡c con sá»‘ hiá»ƒn thá»‹
            ['valTalent', 'valPotential', 'valFate'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerText = "0";
            });
            // Reset thanh kÃ©o (slider) vá» 0
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
            // --- TRÆ¯á»œNG Há»¢P 2: CHá»ˆNH Sá»¬A (Sá»¬A Lá»–I RESET Táº I ÄÃ‚Y) ---
            // TÃ¬m dá»¯ liá»‡u nhÃ¢n váº­t Ä‘ang sá»­a trong máº£ng toÃ n cá»¥c
            const char = window.characters.find(c => String(c.id) === String(editingId));
            if (char && char.stats && char.stats.hidden) {
                const h = char.stats.hidden;

                // Äá»• dá»¯ liá»‡u cÅ© vÃ o thanh kÃ©o (slider)
                if (document.getElementById('statTalent')) document.getElementById('statTalent').value = h.talent || 0;
                if (document.getElementById('statPotential')) document.getElementById('statPotential').value = h.potential || 0;
                if (document.getElementById('statFate')) document.getElementById('statFate').value = h.fate || 0;

                // Cáº­p nháº­t con sá»‘ hiá»ƒn thá»‹ bÃªn cáº¡nh cho khá»›p
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
    const charForm = document.getElementById("charForm");
    if (charForm) charForm.reset();
    
    const modal = document.getElementById("characterModal");
    if (modal) modal.classList.remove("active");
    
    const preview = document.getElementById("previewImg");
    if (preview) {
        preview.src = "";
        preview.classList.add("hidden");
    }
    
    editingId = null;
    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) modalTitle.innerText = "Thiáº¿t láº­p nhÃ¢n váº­t";
    const relContainer = document.getElementById("relationContainer");
    if (relContainer) relContainer.innerHTML = "";
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
        // Revoke URL blob cÅ© náº¿u cÃ³ trÆ°á»›c khi xÃ³a
        if (preview.src.startsWith('blob:')) {
            URL.revokeObjectURL(preview.src);
        }
        preview.src = "";
        preview.classList.add("hidden");
        return;
    }
    if (!file.type.startsWith('image/')) {
        showToast("âš ï¸ Vui lÃ²ng chá»‰ chá»n file hÃ¬nh áº£nh!");
        return;
    }
    // Revoke URL blob cÅ© trÆ°á»›c khi táº¡o má»›i
    if (preview.src.startsWith('blob:')) {
        URL.revokeObjectURL(preview.src);
    }
    const objectUrl = URL.createObjectURL(file);
    preview.src = objectUrl;
    preview.classList.remove("hidden");
    // Revoke sau khi load xong (khÃ´ng revoke ngay trong onload)
    preview.onload = () => {
        setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
    };
}
async function saveCharacter() {
    try {
        if (typeof initImageDB === "function") await initImageDB();
        
        const nameInput = document.getElementById("charName");
        const name = nameInput?.value.trim();
        if (!name) {
            return typeof showToast === "function" 
                ? showToast("âš ï¸ Vui lÃ²ng nháº­p tÃªn nhÃ¢n váº­t!", "warning") 
                : alert("Vui lÃ²ng nháº­p tÃªn nhÃ¢n váº­t!");
        }

        const isNew = !editingId;
        const id = editingId || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : "char_" + Date.now());
        
        // TÃ¬m nhÃ¢n váº­t cÅ© Ä‘á»ƒ báº£o toÃ n dá»¯ liá»‡u stats
        const oldChar = window.characters.find(c => String(c.id) === String(id));
        
        // Xá»­ lÃ½ áº£nh
        let img = oldChar?.img || "";
        const fileInput = document.getElementById("charImg");
        if (fileInput?.files && fileInput.files[0]) {
            try {
                if (typeof saveImage === "function") {
                    await saveImage(id, fileInput.files[0]);
                    img = id; 
                }
            } catch (imgErr) {
                console.error("âŒ Lá»—i lÆ°u áº£nh nhÃ¢n váº­t:", imgErr);
                if (typeof showToast === "function") showToast("âš ï¸ KhÃ´ng thá»ƒ lÆ°u áº£nh...", "warning");
            }
        }

        const getVal = (id, def = "") => document.getElementById(id)?.value.trim() || def;
        const getNum = (id) => {
            const v = parseFloat(document.getElementById(id)?.value);
            return isNaN(v) ? 0 : v;
        };

        // --- GM: QUAN TRá»ŒNG - Báº¢O TOÃ€N CHá»ˆ Sá» Há»† THá»NG ---
        const defaultStats = {
            core: { str: 0, agi: 0, int: 0, vit: 0, spi: 0, luk: 0 },
            vital: { hp: 0, mp: 0, stamina: 0, shield: 0 },
            offense: { atk: 0, matk: 0, critRate: 0, critDmg: 0, pen: 0, atkSpeed: 0, castSpeed: 0 },
            defense: { def: 0, mdef: 0, evasion: 0, block: 0, dmgReduce: 0, resist: 0 }
        };

        // Káº¿t há»£p chá»‰ sá»‘ cÅ© vÃ  chá»‰ sá»‘ áº©n má»›i tá»« slider
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
            fatherId: getVal("charFather"),
            motherId: getVal("charMother"),
            weapon: getVal("equipWeapon", "ChÆ°a trang bá»‹"),
            armor: getVal("equipArmor", "ChÆ°a trang bá»‹"),
            accessory: getVal("equipAccessory", "ChÆ°a trang bá»‹"),
            
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
            stats, // Ghi Ä‘Ã¨ stats nhÆ°ng Ä‘Ã£ Ä‘Æ°á»£c "merge" á»Ÿ trÃªn
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
            showToast(`âœ… ${isNew ? 'Khá»Ÿi táº¡o' : 'Cáº­p nháº­t'} thÃ nh cÃ´ng!`, "success");
        }

        editingId = null;
    } catch (err) {
        console.error("âŒ Lá»—i saveCharacter:", err);
    }
}
async function editCharacter(id) {
    const c = window.characters.find(x => String(x.id) === String(id));
    if (!c) return showToast("âŒ KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u nhÃ¢n váº­t!");

    editingId = id;
    if (typeof openModal === "function") openModal();
    
    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) modalTitle.innerText = `Chá»‰nh sá»­a: ${c.name}`;

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
        charFather: 'fatherId',
        charMother: 'motherId',
        equipWeapon: 'weapon', 
        equipArmor: 'armor', 
        equipAccessory: 'accessory'
    };

    // 1. ÄÆ°a dá»¯ liá»‡u cÆ¡ báº£n vÃ o Form
    Object.entries(fields).forEach(([htmlId, charKey]) => {
        const el = document.getElementById(htmlId);
        if (el) {
            let val = c[charKey];
            el.value = (val === undefined || val === null) ? 
                       (htmlId.includes('PL') || htmlId.includes('Age') ? 0 : "") : val;
        }
    });

    // 2. CHUáº¨N HÃ“A & Äá»’NG Bá»˜ CHá»ˆ Sá» áº¨N (Hidden Stats)
    // Æ¯u tiÃªn láº¥y tá»« c.stats.hidden (cá»§a stats.js), fallback vá» c.hidden (dá»¯ liá»‡u cÅ©)
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

    // 3. Má»‘i quan há»‡
    const relContainer = document.getElementById("relationContainer");
    if (relContainer) {
        relContainer.innerHTML = "";
        if (Array.isArray(c.relations)) {
            c.relations.forEach(r => { 
                if (typeof addRelationField === "function") addRelationField(r); 
            });
        }
    }

    // 4. CÃ¡c dáº¡ng biáº¿n hÃ¬nh (Forms)
    const formsContainer = document.getElementById("formsContainer");
    if (formsContainer) {
        formsContainer.innerHTML = "";
        if (Array.isArray(c.forms)) {
            for (const f of c.forms) { 
                if (typeof addFormField === "function") await addFormField(f); 
            }
        }
    }

    // 5. áº¢nh Ä‘áº¡i diá»‡n
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
    if (!confirm("âš ï¸ XÃ³a nhÃ¢n váº­t nÃ y? Há»‡ thá»‘ng sáº½ gá»¡ toÃ n bá»™ áº£nh vÃ  liÃªn káº¿t liÃªn quan.")) return;

    try {
        const charToDelete = window.characters.find(x => String(x.id) === String(id));
        if (!charToDelete) return;
        if (charToDelete.img && !charToDelete.img.startsWith("http") && !charToDelete.img.startsWith("data:")) {
            await deleteImage(charToDelete.img).catch(e => console.warn("Lá»—i xÃ³a áº£nh chÃ­nh:", e));
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
        showToast("âœ… ÄÃ£ xÃ³a nhÃ¢n váº­t vÃ  lÃ m sáº¡ch dá»¯ liá»‡u!");
    } catch (err) {
        console.error("âŒ Lá»—i deleteCharacter:", err);
        showToast("Lá»—i khi xÃ³a dá»¯ liá»‡u!");
    }
}
async function toggleFavorite(id) {
    const c = window.characters.find(x => String(x.id) === String(id));
    if (!c) return;
    c.favorite = !c.favorite;
    await saveAndRefresh();
    showToast(c.favorite ? "â¤ï¸ ÄÃ£ thÃªm vÃ o yÃªu thÃ­ch" : "ðŸ’” ÄÃ£ bá» yÃªu thÃ­ch");
}
async function openProfile(id) {
    const c = window.characters.find(x => String(x.id) === String(id));
    if (!c) return showToast("âŒ KhÃ´ng tÃ¬m tháº¥y nhÃ¢n váº­t!");

    window.currentPage = 'characterPage';
    let displayImg = "https://i.imgur.com/6X8FQyA.png";
    if (c.img) {
        if (c.img.startsWith("http") || c.img.startsWith("data:")) {
            displayImg = c.img;
        } else if (typeof getImage === "function") {
            try {
                displayImg = await getImage(c.img) || displayImg;
            } catch (e) { console.warn("Lá»—i load áº£nh:", e); }
        }
    }

    // --- TÃŒM TÃŠN HIá»‚N THá»Š CHO CÃC LIÃŠN Káº¾T ID ---
    const kname = window.kingdoms?.find(k => String(k.id) === String(c.kingdom))?.name || "Tá»± do";
    const factionObj = window.factions?.find(f => String(f.id) === String(c.faction));
    const fname = factionObj ? factionObj.name : (c.faction || "KhÃ´ng");
    
    // TÃ¬m tÃªn Ä‘á»‹a Ä‘iá»ƒm tá»« ID
    const locationObj = window.locations?.find(l => String(l.id) === String(c.location));
    const lname = locationObj ? locationObj.name : (c.location || "-");
    
    // --- KHá»žI Táº O VÃ€ Äá»’NG Bá»˜ CHá»ˆ Sá» ---
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
            
            /* CSS NÃºt Export TXT */
            .btn-export-p { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: #10b981; }
            .btn-export-p:hover { background: #10b981; color: white; box-shadow: 0 0 10px rgba(16, 185, 129, 0.5); }

            .stats-mini-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
            .stat-mini-item { background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
            .stat-mini-label { font-size: 0.7rem; color: var(--text-dim); display: block; }
            .stat-mini-val { font-size: 0.9rem; font-weight: bold; color: #fff; }
            .desc-area { font-size: 0.9rem; line-height: 1.6; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border: 1px solid var(--border); word-wrap: break-word; }
        </style>

        <div class="profile-wrapper animate-fade-in">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                <button class="btn-back-modern" onclick="showPage('characters')">
                    <i class="fa-solid fa-chevron-left"></i> Quay láº¡i
                </button>
                <div class="profile-controls">
                    <button class="btn-profile-ctrl btn-export-p" onclick="window.exportCharacterToTXT('${c.id}')">
                        <i class="fa-solid fa-file-export"></i> TXT
                    </button>
                    <button class="btn-profile-ctrl btn-vortex-p" onclick="SkillTreeVortex.open('${c.id}')">
                        <i class="fa-solid fa-hurricane"></i> Ká»¹ nÄƒng
                    </button>
                    <button class="btn-profile-ctrl btn-stat-p" onclick="window.location.href='stats.html?id=${c.id}'">
                        <i class="fa-solid fa-chart-simple"></i> Chá»‰ sá»‘
                    </button>
                    <button class="btn-profile-ctrl btn-edit-p" onclick="window.editCharacter('${c.id}')">
                        <i class="fa-solid fa-pen-to-square"></i> Sá»­a
                    </button>
                    <button class="btn-profile-ctrl btn-del-p" onclick="window.deleteCharacter('${c.id}')">
                        <i class="fa-solid fa-trash"></i> XoÃ¡
                    </button>
                </div>
            </div>

            <div class="profile-grid">
                <div class="sidebar-col">
                    <div class="mobile-image-card">
                        <img src="${displayImg}" style="width:100%; display:block; cursor:pointer;" onclick="if(typeof openImageViewer === 'function') openImageViewer('${displayImg}')">
                        <div style="padding:15px; background: linear-gradient(to top, var(--bg-main), transparent);">
                            <h2 style="font-family:'Cinzel'; margin:0; color:var(--gold);">${c.name}</h2>
                            <span style="font-size:0.8rem; background:var(--primary); padding:2px 8px; border-radius:4px;">${c.job || 'ChÆ°a rÃµ'}</span>
                        </div>
                    </div>

                    <div class="info-box" style="margin-top:15px;">
                        <div class="data-row"><span class="data-label">Lá»±c chiáº¿n</span><b class="highlight-gold">${getVal(c.pl).toLocaleString()}</b></div>
                        <div class="data-row"><span class="data-label">Tráº¡ng thÃ¡i</span><b style="color:#10b981;">${c.status || 'BÃ¬nh thÆ°á»ng'}</b></div>
                        
                        <div class="stats-mini-grid">
                            <div class="stat-mini-item"><span class="stat-mini-label">STR</span><span class="stat-mini-val">${getVal(core.str)}</span></div>
                            <div class="stat-mini-item"><span class="stat-mini-label">AGI</span><span class="stat-mini-val">${getVal(core.agi)}</span></div>
                            <div class="stat-mini-item"><span class="stat-mini-label">INT</span><span class="stat-mini-val">${getVal(core.int)}</span></div>
                            <div class="stat-mini-item"><span class="stat-mini-label">VIT</span><span class="stat-mini-val">${getVal(core.vit)}</span></div>
                        </div>

                        <div style="margin-top:15px;">
                            <label style="font-size:0.75rem; color:var(--primary); font-weight:bold;">CHUYá»‚N Dáº NG:</label>
                            <select id="activeForm" onchange="updateActiveForm('${c.id}')" style="width:100%; padding:8px; margin-top:5px; border-radius:6px; background:var(--bg-main); color:white; border:1px solid var(--border);">
                                <option value="">-- BÃ¬nh thÆ°á»ng --</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="main-col">
                    <div class="info-box">
                        <h3 class="info-title"><i class="fa-solid fa-id-card"></i> ThÃ´ng tin cÆ¡ báº£n</h3>
                        <div class="data-row"><span class="data-label">Giá»›i tÃ­nh</span><span class="data-value">${c.gender || '-'}</span></div>
                        <div class="data-row"><span class="data-label">Chá»§ng tá»™c</span><span class="data-value highlight-blue">${c.race || '-'}</span></div>
                        <div class="data-row"><span class="data-label">Tuá»•i / NgÃ y sinh</span><span class="data-value">${c.age || '0'} / ${c.birth || '-'}</span></div>
                        <div class="data-row"><span class="data-label">Äáº¿ cháº¿</span><span class="data-value">${kname}</span></div>
                        <div class="data-row"><span class="data-label">Phe phÃ¡i</span><span class="data-value" style="color:var(--accent)">${fname}</span></div>
                        <div class="data-row"><span class="data-label">QuÃª quÃ¡n</span><span class="data-value">${lname}</span></div>
                    </div>

                    <div class="info-box">
                        <h3 class="info-title"><i class="fa-solid fa-brain"></i> Äáº·c Ä‘iá»ƒm & Tá»‘ cháº¥t</h3>
                        <div style="margin-bottom:12px;">
                            <span class="data-label" style="font-size:0.8rem;">NGOáº I HÃŒNH:</span>
                            <div class="desc-area" style="margin-top:5px;">
                                ${typeof renderMarkdown === 'function' ? renderMarkdown(c.appearance) : (c.appearance || 'ChÆ°a cÃ³ thÃ´ng tin ngoáº¡i hÃ¬nh.').replace(/\\n/g, '<br>')}
                            </div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <span class="data-label" style="font-size:0.8rem;">TÃNH CÃCH:</span>
                            <div class="desc-area" style="margin-top:5px;">
                                ${typeof renderMarkdown === 'function' ? renderMarkdown(c.personality) : (c.personality || 'ChÆ°a cÃ³ thÃ´ng tin tÃ­nh cÃ¡ch.').replace(/\\n/g, '<br>')}
                            </div>
                        </div>
                        
                        <div style="display:flex; gap:10px; margin-top:10px;">
                            <div style="flex:1; background:rgba(0,0,0,0.2); padding:8px; border-radius:6px; text-align:center; border: 1px solid rgba(251, 191, 36, 0.2);">
                                <small style="display:block; font-size:0.6rem; color:var(--text-dim);">TÃ€I NÄ‚NG</small>
                                <b class="highlight-gold">${getVal(hidden.talent)}</b>
                            </div>
                            <div style="flex:1; background:rgba(0,0,0,0.2); padding:8px; border-radius:6px; text-align:center; border: 1px solid rgba(251, 191, 36, 0.2);">
                                <small style="display:block; font-size:0.6rem; color:var(--text-dim);">TIá»€M NÄ‚NG</small>
                                <b class="highlight-gold">${getVal(hidden.potential)}</b>
                            </div>
                            <div style="flex:1; background:rgba(0,0,0,0.2); padding:8px; border-radius:6px; text-align:center; border: 1px solid rgba(251, 191, 36, 0.2);">
                                <small style="display:block; font-size:0.6rem; color:var(--text-dim);">Sá» Má»†NH</small>
                                <b class="highlight-gold">${getVal(hidden.fate)}</b>
                            </div>
                        </div>
                    </div>

                    <div class="info-box">
                        <h3 class="info-title"><i class="fa-solid fa-swords"></i> Chá»‰ sá»‘ chiáº¿n Ä‘áº¥u</h3>
                        <div class="stats-mini-grid" style="grid-template-columns: repeat(3, 1fr);">
                            <div class="stat-mini-item"><span class="stat-mini-label">ATK</span><span class="stat-mini-val highlight-gold">${getVal(offense.atk)}</span></div>
                            <div class="stat-mini-item"><span class="stat-mini-label">DEF</span><span class="stat-mini-val" style="color:#60a5fa;">${getVal(defense.def)}</span></div>
                            <div class="stat-mini-item"><span class="stat-mini-label">HP</span><span class="stat-mini-val" style="color:#ef4444;">${getVal(vital.hp)}</span></div>
                        </div>
                        <div class="stats-mini-grid" style="grid-template-columns: repeat(3, 1fr); margin-top:10px;">
                             <div class="stat-mini-item"><span class="stat-mini-label">Báº¡o kÃ­ch</span><span class="stat-mini-val">${getVal(offense.critRate)}%</span></div>
                            <div class="stat-mini-item"><span class="stat-mini-label">NÃ© trÃ¡nh</span><span class="stat-mini-val">${getVal(defense.evasion)}</span></div>
                            <div class="stat-mini-item"><span class="stat-mini-label">Tá»‘c Ä‘á»™</span><span class="stat-mini-val">${getVal(offense.atkSpeed)}</span></div>
                        </div>
                    </div>

                    <div class="info-box">
                        <h3 class="info-title"><i class="fa-solid fa-shield-halved"></i> Trang bá»‹ hiá»‡n táº¡i</h3>
                        <div class="data-row"><span class="data-label"><i class="fa-solid fa-khanda"></i> VÅ© khÃ­</span><span class="data-value">${c.weapon || 'ChÆ°a trang bá»‹'}</span></div>
                        <div class="data-row"><span class="data-label"><i class="fa-solid fa-shirt"></i> GiÃ¡p trá»¥</span><span class="data-value">${c.armor || 'ChÆ°a trang bá»‹'}</span></div>
                        <div class="data-row"><span class="data-label"><i class="fa-solid fa-gem"></i> Phá»¥ kiá»‡n</span><span class="data-value">${c.accessory || 'ChÆ°a trang bá»‹'}</span></div>
                    </div>

                    <div class="info-box">
                        <h3 class="info-title"><i class="fa-solid fa-users"></i> Má»‘i quan há»‡</h3>
                        <div id="charPageRelations" style="display:flex; flex-wrap:wrap; gap:5px;">
                            ${typeof renderRelationsHTML === 'function' ? renderRelationsHTML(c) : '<span class="data-label">ChÆ°a cÃ³ dá»¯ liá»‡u...</span>'}
                        </div>
                    </div>

                    <div class="info-box">
                        <h3 class="info-title"><i class="fa-solid fa-dna"></i> Dáº¡ng biáº¿n hÃ¬nh</h3>
                        <div id="charPageForms" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap:10px;">
                            </div>
                    </div>

                    <div class="info-box" style="border-left: 3px solid var(--gold);">
                        <h3 class="info-title"><i class="fa-solid fa-feather-pointed"></i> Tiá»ƒu sá»­ & ThÃ´ng tin thÃªm</h3>
                        <div class="markdown-body desc-area">
                            ${typeof renderMarkdown === 'function' ? renderMarkdown(c.desc) : (c.desc || 'ChÆ°a cÃ³ tiá»ƒu sá»­.').replace(/\\n/g, '<br>')}
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
        return `<i style="color: var(--text-dim); opacity: 0.6;">ChÆ°a cÃ³ dá»¯ liá»‡u quan há»‡...</i>`;
    }
    return c.relations.map(rel => {
        const target = allChars.find(x => x.id === rel.targetId);
        if (!target) return "";
        return `
            <div class="rel-badge" 
                 onclick="openProfile('${target.id}')" 
                 title="Xem há»“ sÆ¡ cá»§a ${target.name}"
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
        container.innerHTML = "<i>NhÃ¢n váº­t nÃ y khÃ´ng cÃ³ biáº¿n hÃ¬nh...</i>";
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
                     title="Click Ä‘á»ƒ phÃ³ng to">
            </div>
            <div style="font-weight: bold; font-size: 0.75rem; color: var(--gold); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${f.name}</div>
            <button onclick="openFormModal('${f.name}', '${fImg}', '${f.desc}')" 
                    style="background: none; border: none; color: var(--primary); font-size: 10px; cursor: pointer; text-decoration: underline; margin-top: 2px;">
                Chi tiáº¿t
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
    if (!data || data.length === 0) {
        list.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim); opacity: 0.6;">
            <i class="fa-solid fa-ghost" style="font-size: 3rem; margin-bottom: 15px; display: block; color: var(--gold);"></i>
            <p>KhÃ´ng tÃ¬m tháº¥y anh hÃ¹ng nÃ o khá»›p vá»›i bá»™ lá»c sá»­ thÆ°...</p>
        </div>`;
        const oldPagination = document.getElementById("characterPaginationBar");
        if (oldPagination) oldPagination.innerHTML = ""; 
        return;
    }
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / window.charPagination.itemsPerPage);
        if (window.charPagination.currentPage > totalPages) window.charPagination.currentPage = totalPages;
    if (window.charPagination.currentPage < 1) window.charPagination.currentPage = 1;
    const startIndex = (window.charPagination.currentPage - 1) * window.charPagination.itemsPerPage;
    const endIndex = startIndex + window.charPagination.itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);
    list.innerHTML = paginatedData.map(c => {
        const kname = window.kingdoms?.find(k => String(k.id) === String(c.kingdom))?.name || "Tá»± do";
        const pl = c.pl || 0;
        const plDisplay = pl.toLocaleString();

        let tierClass = "tier-common";
        if (pl >= 200000) tierClass = "tier-mythic";
        else if (pl >= 100000) tierClass = "tier-legendary";
        else if (pl >= 50000) tierClass = "tier-epic";
        else if (pl >= 10000) tierClass = "tier-rare";
        return `
        <div class="char-card animate-card card-3d-tilt ${tierClass}" id="card-${c.id}" onclick="openProfile('${c.id}')">
            
            <button class="fav-btn ${c.favorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${c.id}')">
                <i class="fa-${c.favorite ? 'solid' : 'regular'} fa-heart"></i>
            </button>

            <!-- NÃºt xuáº¥t TXT -->
            <button class="export-btn" onclick="event.stopPropagation(); window.exportCharacterToTXT('${c.id}')" 
                    style="position: absolute; top: 10px; left: 10px; z-index: 10; background: rgba(0,0,0,0.6); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 5px 8px; border-radius: 6px; cursor: pointer; backdrop-filter: blur(4px); transition: 0.3s;" title="Xuáº¥t file TXT">
                <i class="fa-solid fa-file-export"></i>
            </button>
            
            <!-- NÃºt xuáº¥t áº¢nh Tháº» (Character Card) -->
            <button class="export-card-btn" onclick="event.stopPropagation(); if(typeof exportCharacterCard === 'function') exportCharacterCard('${c.id}')" 
                    style="position: absolute; top: 10px; left: 45px; z-index: 10; background: rgba(0,0,0,0.6); color: #d4af37; border: 1px solid rgba(212, 175, 55, 0.3); padding: 5px 8px; border-radius: 6px; cursor: pointer; backdrop-filter: blur(4px); transition: 0.3s;" title="Xuáº¥t Tháº» áº¢nh (PNG)">
                <i class="fa-solid fa-image"></i>
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
                    <span class="card-race">${c.race || 'Chá»§ng tá»™c'}</span>
                    <h3 class="card-name">${c.name}</h3>
                </div>
                <div class="card-info-row">
                    <span class="info-tag"><i class="fa-solid fa-crown"></i> ${kname}</span>
                </div>
                <div class="card-footer">
                    <span class="card-status status-${(c.status || 'unknown').toLowerCase()}">${c.status || 'Ngoáº¡i tuyáº¿n'}</span>
                    <i class="fa-solid fa-chevron-right arrow-icon"></i>
                </div>
            </div>
        </div>
        `;
    }).join("");
    if (typeof initLazyLoading === "function") initLazyLoading();
    if (typeof initTiltEffect === "function") initTiltEffect(); // KÃ­ch hoáº¡t 3D Tilt
    if (typeof renderCharacterPagination === "function") {
        renderCharacterPagination(totalPages, data);
    }
}
let globalCharObserver;
function initLazyLoading() {
    // Disconnect observer cÅ© trÆ°á»›c khi táº¡o má»›i Ä‘á»ƒ trÃ¡nh memory leak
    if (globalCharObserver) {
        globalCharObserver.disconnect();
        globalCharObserver = null;
    }
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
        window.charPagination.currentPage = 1;

        if (typeof render === "function") {
            render(filtered);
        } else {
            resetCharacterList(filtered);
        }
    }, 200); 
}
function renderCharacterPagination(totalPages, originalData) {
    const listContainer = document.getElementById("characters");
    if (!listContainer) return;

    // LÆ°u data vÃ o cache Ä‘á»ƒ changeCharPage() dÃ¹ng â€” trÃ¡nh nhÃºng JSON vÃ o onclick
    window._paginationData = originalData;

    let paginationBar = document.getElementById("characterPaginationBar");
    if (!paginationBar) {
        paginationBar = document.createElement("div");
        paginationBar.id = "characterPaginationBar";
        const charListEl = document.getElementById("characterList");
        if (charListEl && charListEl.parentNode) {
            charListEl.parentNode.insertBefore(paginationBar, charListEl.nextSibling);
        }
    }

    if (totalPages <= 1) {
        paginationBar.innerHTML = "";
        return;
    }

    const current = window.charPagination.currentPage;
    let barHTML = `<div class="pagination-wrapper" style="display: flex; justify-content: center; align-items: center; gap: 8px; margin: 30px 0; padding: 10px;">`;
    barHTML += `
        <button class="pag-btn prev-btn" 
                ${current === 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''} 
                onclick="changeCharPage(${current - 1})">
            <i class="fa-solid fa-angle-left"></i> TrÆ°á»›c
        </button>
    `;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= current - 2 && i <= current + 2)) {
            const isActive = i === current;
            barHTML += `
                <button class="pag-btn num-btn ${isActive ? 'active' : ''}" 
                        onclick="changeCharPage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === current - 3 || i === current + 3) {
            barHTML += `<span style="color: var(--text-dim, #94a3b8); padding: 0 4px;">...</span>`;
        }
    }
    barHTML += `
        <button class="pag-btn next-btn" 
                ${current === totalPages ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''} 
                onclick="changeCharPage(${current + 1})">
            Tiáº¿p <i class="fa-solid fa-angle-right"></i>
        </button>
    `;

    barHTML += `</div>`;
    paginationBar.innerHTML = barHTML;
}

// LÆ°u cache data cho pagination Ä‘á»ƒ trÃ¡nh truyá»n qua onclick attribute
window._paginationData = null;
window.changeCharPage = function(pageNumber) {
    const data = window._paginationData;
    if (!data) return;
    window.charPagination.currentPage = pageNumber;
    resetCharacterList(data);
    const targetElement = document.querySelector(".page-header-v2") || document.getElementById("characterList");
    if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
};
function renderJSONView() {
    const box = document.getElementById("codexContent");
    if (!box) return;
    try {
        const jsonData = JSON.stringify(window.characters, null, 2);
        box.textContent = jsonData; 
    } catch (err) {
        box.innerText = "âŒ Lá»—i Ä‘á»‹nh dáº¡ng dá»¯ liá»‡u: " + err.message;
    }
}
async function copyJSON() {
    const key = document.getElementById("codexKeySelect")?.value;
    if (!key) return showToast("âš ï¸ Vui lÃ²ng chá»n danh má»¥c Ä‘á»ƒ copy!");

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
                    if (creaturesData.length === 0) return showToast("âš ï¸ KhÃ´ng cÃ³ sinh váº­t nÃ o Ä‘á»ƒ copy!");
                    
                    const json = JSON.stringify(creaturesData, null, 2);
                    await navigator.clipboard.writeText(json);
                    if (document.getElementById("codexContent")) {
                        document.getElementById("codexContent").innerText = json;
                    }
                    showToast("ðŸ“‹ ÄÃ£ copy dá»¯ liá»‡u Sinh váº­t vÃ o Clipboard!");
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
            return showToast(`âš ï¸ Danh má»¥c [${key}] hiá»‡n Ä‘ang trá»‘ng!`);
        }
        const jsonData = JSON.stringify(data, null, 2);
        await navigator.clipboard.writeText(jsonData);
        if (document.getElementById("codexContent")) {
            document.getElementById("codexContent").innerText = jsonData;
        }
        
        showToast(`ðŸ“‹ ÄÃ£ copy JSON cá»§a [${key}] thÃ nh cÃ´ng!`);

    } catch (err) {
        console.error("Lá»—i copy JSON:", err);
        showToast("âŒ KhÃ´ng thá»ƒ copy. Vui lÃ²ng kiá»ƒm tra quyá»n Clipboard hoáº·c dá»¯ liá»‡u.");
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
        opt.textContent = "-- Chá»n nhÃ¢n váº­t --";
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
        nhom: "âš¡ Chá»‰ sá»‘ cÆ¡ báº£n",
        moTa: "Ná»n táº£ng sá»©c máº¡nh cá»§a nhÃ¢n váº­t",
        items: [
            { key: "str", ten: "Sá»©c máº¡nh (STR)", sub: "TÄƒng sÃ¡t thÆ°Æ¡ng váº­t lÃ½" },
            { key: "agi", ten: "Nhanh nháº¹n (AGI)", sub: "TÄƒng tá»‘c Ä‘á»™, nÃ© trÃ¡nh" },
            { key: "int", ten: "TrÃ­ tuá»‡ (INT)", sub: "TÄƒng sá»©c máº¡nh phÃ©p thuáº­t" },
            { key: "vit", ten: "Thá»ƒ lá»±c (VIT)", sub: "TÄƒng mÃ¡u, chá»‘ng chá»‹u" },
            { key: "spi", ten: "Tinh tháº§n (SPI)", sub: "KhÃ¡ng phÃ©p, há»“i mana" },
            { key: "luk", ten: "May máº¯n (LUK)", sub: "ChÃ­ máº¡ng, rÆ¡i Ä‘á»“" }
        ],
        groupKey: "core"
    },
    {
        nhom: "â¤ï¸ Chá»‰ sá»‘ sinh tá»“n",
        moTa: "Kháº£ nÄƒng duy trÃ¬ chiáº¿n Ä‘áº¥u",
        items: [
            { key: "hp", ten: "HP (MÃ¡u)", sub: "LÆ°á»£ng mÃ¡u hiá»‡n cÃ³" },
            { key: "mp", ten: "MP (Mana)", sub: "NÄƒng lÆ°á»£ng ká»¹ nÄƒng" },
            { key: "stamina", ten: "Thá»ƒ lá»±c (Stamina)", sub: "DÃ¹ng Ä‘á»ƒ cháº¡y, nÃ©" },
            { key: "shield", ten: "KhiÃªn (Shield)", sub: "Báº£o vá»‡ táº¡m thá»i" }
        ],
        groupKey: "vital"
    },
    {
        nhom: "âš”ï¸ Chá»‰ sá»‘ táº¥n cÃ´ng",
        moTa: "Kháº£ nÄƒng gÃ¢y sÃ¡t thÆ°Æ¡ng",
        items: [
            { key: "atk", ten: "Váº­t lÃ½ (ATK)", sub: "SÃ¡t thÆ°Æ¡ng tay" },
            { key: "matk", ten: "PhÃ©p (MATK)", sub: "SÃ¡t thÆ°Æ¡ng phÃ©p" },
            { key: "critRate", ten: "Tá»· lá»‡ chÃ­ máº¡ng", sub: "% cÆ¡ há»™i X2 dame" },
            { key: "critDmg", ten: "SÃ¡t thÆ°Æ¡ng chÃ­ máº¡ng", sub: "Sá»©c máº¡nh cÃº Ä‘Ã¡nh" },
            { key: "pen", ten: "XuyÃªn giÃ¡p", sub: "Bá» qua phÃ²ng ngá»±" },
            { key: "atkSpeed", ten: "Tá»‘c Ä‘á»™ Ä‘Ã¡nh", sub: "Sá»‘ Ä‘Ã²n má»—i giÃ¢y" }
        ],
        groupKey: "offense"
    },
    {
        nhom: "ðŸ›¡ï¸ Chá»‰ sá»‘ phÃ²ng thá»§",
        moTa: "Kháº£ nÄƒng giáº£m chá»‹u Ä‘á»±ng",
        items: [
            { key: "def", ten: "GiÃ¡p (DEF)", sub: "Giáº£m ST váº­t lÃ½" },
            { key: "mdef", ten: "KhÃ¡ng phÃ©p (MDEF)", sub: "Giáº£m ST phÃ©p" },
            { key: "evasion", ten: "NÃ© trÃ¡nh", sub: "Tá»· lá»‡ há»¥t Ä‘Ã²n" },
            { key: "block", ten: "Äá»¡ Ä‘Ã²n", sub: "Giáº£m ST khi Ä‘á»¡" },
            { key: "resist", ten: "KhÃ¡ng hiá»‡u á»©ng", sub: "Giáº£m thá»i gian khá»‘ng cháº¿" }
        ],
        groupKey: "defense"
    }
];
async function compareCharacters() {
    const idA = document.getElementById("compareA")?.value;
    const idB = document.getElementById("compareB")?.value;
    if (!idA || !idB || String(idA) === String(idB)) {
        showToast("âš ï¸ Vui lÃ²ng chá»n 2 nhÃ¢n váº­t khÃ¡c nhau!");
        return;
    }

    const nvA = window.characters.find(c => String(c.id) === String(idA));
    const nvB = window.characters.find(c => String(c.id) === String(idB));
    
    if (!nvA || !nvB) {
        showToast("âŒ KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u nhÃ¢n váº­t!");
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
                <div class="sm-win"><span id="totalA">0</span> tháº¯ng</div>
            </div>
            <div class="summary-vs">VS</div>
            <div class="summary-card">
                <div class="sm-name">${nvB.name}</div>
                <div class="sm-pl">PL: ${plB.toLocaleString()}</div>
                <div class="sm-win"><span id="totalB">0</span> tháº¯ng</div>
            </div>
        </div>
        
        <div class="radar-container" style="position: relative; height:300px; width:100%">
            <canvas id="compareRadarChart"></canvas>
        </div>

        <table class="bang-so-sanh">
            <thead>
                <tr>
                    <th>Chá»‰ sá»‘</th>
                    <th>${nvA.name}</th>
                    <th>${nvB.name}</th>
                </tr>
            </thead>
            <tbody>
                <tr class="pl-row" style="background: rgba(251, 191, 36, 0.1);">
                    <td>â­ Power Level (Tá»•ng)</td>
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
        console.error("âŒ GM: KhÃ´ng tÃ¬m tháº¥y tháº» canvas 'compareRadarChart'");
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
        container.innerHTML = `<div class="empty-state"><p>ChÆ°a cÃ³ chá»§ng tá»™c nÃ o Ä‘Æ°á»£c khai phÃ¡...</p></div>`;
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
            traitsHTML += `<span class="trait-tag"><i class="fa-solid fa-hourglass-half"></i> ${race.lifespan} nÄƒm</span>`;
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
                <h3 class="race-name">${race.name || 'VÃ´ danh'}</h3>
                <div class="race-actions">
                    <button class="icon-btn-sm edit-btn" title="Sá»­a"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="icon-btn-sm delete-btn" title="XÃ³a"><i class="fa-solid fa-trash"></i></button>
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
                    <span class="pop-label">DÃ¢n sá»‘: ${memberCount}</span>
                    <div class="pop-bar"><div class="pop-fill" style="width: ${populationPercent}%"></div></div>
                </div>
                <button class="btn-text-gold detail-btn">Chi tiáº¿t <i class="fa-solid fa-chevron-right"></i></button>
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

function searchRaces() {
    clearTimeout(window.raceSearchTimeout);
    window.raceSearchTimeout = setTimeout(() => {
        const term = (document.getElementById("raceSearchInput")?.value || "").toLowerCase().trim();
        if (!term) {
            renderRaces(window.races);
            return;
        }
        const filtered = window.races.filter(r => 
            (r.name || "").toLowerCase().includes(term) ||
            (r.appearance || "").toLowerCase().includes(term) ||
            (r.kingdom || "").toLowerCase().includes(term) ||
            (r.environment || "").toLowerCase().includes(term)
        );
        renderRaces(filtered);
    }, 200);
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
        alert(`âš ï¸ KhÃ´ng thá»ƒ xÃ³a: Chá»§ng tá»™c "${raceName}" Ä‘ang cÃ³ nhÃ¢n váº­t sá»­ dá»¥ng!`);
        return;
    }

    if (confirm(`â“ Báº¡n cÃ³ cháº¯c muá»‘n xÃ³a chá»§ng tá»™c "${raceName}" khá»i sá»­ sÃ¡ch?`)) {
        window.races.splice(i, 1);
        
        if (typeof dbSave === "function") {
            await dbSave("races", window.races);
        }
        
        if (typeof renderRaces === "function") renderRaces();
        if (typeof updateRaceOptions === "function") updateRaceOptions();
        
        showToast("ðŸ—‘ï¸ ÄÃ£ xÃ³a chá»§ng tá»™c thÃ nh cÃ´ng.");
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
        showToast("âš ï¸ TÃªn chá»§ng tá»™c khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng!", "error");
        return;
    }

    try {
        if (editingRace === -1) {
            const isDuplicate = window.races.some(r => 
                String(r.name).trim().toLowerCase() === values.name.toLowerCase()
            );
            if (isDuplicate) {
                showToast("âš ï¸ Chá»§ng tá»™c nÃ y Ä‘Ã£ tá»“n táº¡i!", "info");
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
        
        showToast(`âœ… ÄÃ£ lÆ°u chá»§ng tá»™c: ${values.name}`, "success");
    } catch (err) {
        console.error(err);
        showToast("âŒ Lá»—i khi lÆ°u dá»¯ liá»‡u!", "error");
    }
}
function updateRaceOptions() {
    const raceSelect = document.getElementById("charRace");
    if (!raceSelect) return;
    raceSelect.innerHTML = '<option value="">-- Chá»n chá»§ng tá»™c --</option>';
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
                            <small>${c.job || 'Tá»± do'}</small>
                        </div>
                    </div>`;
            }
        } else {
            container.innerHTML = `<p class="empty-state-mini">ChÆ°a cÃ³ thÃ nh viÃªn nÃ o.</p>`;
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
                <small class="suggestion-race">${char.race || 'ChÆ°a rÃµ'}</small>
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
                    <label style="font-size: 11px; color: var(--primary); font-weight: bold; text-transform: uppercase;">TÃªn tráº¡ng thÃ¡i</label>
                    <input class="formName" placeholder="VD: Super Saiyan..." value="${formData.name || ""}" style="width: 100%; padding: 8px; border-radius: 6px;">
                </div>
                <div class="input-stack">
                    <label style="font-size: 11px; color: var(--primary); font-weight: bold; text-transform: uppercase;">MÃ´ táº£ sá»©c máº¡nh</label>
                    <textarea class="formDesc" placeholder="MÃ´ táº£ ká»¹ nÄƒng, Ä‘áº·c Ä‘iá»ƒm..." rows="2" style="width: 100%; padding: 8px; border-radius: 6px; font-size: 0.9rem;">${formData.desc || ""}</textarea>
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
        if (!file.type.startsWith('image/')) return showToast("âš ï¸ Chá»‰ há»— trá»£ tá»‡p áº£nh!");
        
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
            showToast("âŒ Lá»—i lÆ°u áº£nh");
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
                <label style="font-size: 11px; color: var(--primary); font-weight: bold; display: block; margin-bottom: 4px;">Äá»I TÆ¯á»¢NG</label>
                <select class="rel-character" style="width: 100%; padding: 10px; border-radius: 6px; background: var(--bg-main); color: var(--text-bright); border: 1px solid var(--border);">
                    <option value="">-- Chá»n nhÃ¢n váº­t --</option>
                    ${charOptions}
                </select>
            </div>
            <div class="input-group-mobile">
                <label style="font-size: 11px; color: var(--primary); font-weight: bold; display: block; margin-bottom: 4px;">QUAN Há»†</label>
                <input type="text" 
                       class="rel-type" 
                       placeholder="VD: Anh trai, Äá»‘i thá»§..." 
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
        showToast("âš ï¸ Vui lÃ²ng lÆ°u nhÃ¢n váº­t trÆ°á»›c khi xem báº£ng chá»‰ sá»‘ chi tiáº¿t!");
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
    if (descEl) descEl.innerText = desc || "KhÃ´ng cÃ³ mÃ´ táº£ cho tráº¡ng thÃ¡i nÃ y.";

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
    select.innerHTML = '<option value="">-- Chá»n Ä‘á»‹a Ä‘iá»ƒm hiá»‡n táº¡i --</option>';
    
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
        networkCanvas.style.height = "750px"; 
        container.innerHTML = '<h2 class="page-title">SÆ¡ Äá»“ Quan Há»‡ NhÃ¢n Váº­t</h2>';
        container.appendChild(networkCanvas);
    }
    
    networkCanvas.innerHTML = `<div class="loading-network" style="color:#fbbf24; text-align:center; padding-top:100px;">
        <i class="fas fa-spinner fa-spin"></i> Äang ma tráº­n hÃ³a hÃ ng nghÃ¬n má»‘i quan há»‡...
    </div>`;

    if (typeof vis === "undefined") {
        networkCanvas.innerHTML = "<p style='color:red; padding:20px;'>Lá»—i: ThÆ° viá»‡n Vis.js chÆ°a Ä‘Æ°á»£c táº£i.</p>";
        return;
    }

    // 1. Khá»Ÿi táº¡o DataSet (DÃ¹ng DataSet Ä‘á»ƒ cÃ³ thá»ƒ Filter Ä‘á»™ng)
    const nodesView = new vis.DataSet([]);
    const edgesView = new vis.DataSet([]);

    // 2. Xá»­ lÃ½ Nodes
    const nodeList = await Promise.all(window.characters.map(async (c) => {
        let imgUrl = "https://i.imgur.com/6X8FQyA.png";
        if (c.img) {
            if (c.img.startsWith("http") || c.img.startsWith("data:")) {
                imgUrl = c.img;
            } else if (typeof getImage === "function") {
                try {
                    const storedImg = await getImage(c.img);
                    if (storedImg) imgUrl = storedImg;
                } catch (e) { }
            }
        }
        return {
            id: c.id,
            label: `<b>${c.name}</b>\n<i>${c.job || ''}</i>`,
            shape: 'circularImage',
            image: imgUrl,
            size: 30,
            borderWidth: 2,
            color: {
                border: c.gender === 'Ná»¯' ? '#ec4899' : '#6366f1',
                background: '#1e293b',
                highlight: { border: '#fbbf24', background: '#1e293b' }
            },
            font: { multi: 'html', color: '#f1f5f9', size: 12, face: 'Plus Jakarta Sans' }
        };
    }));

    // 3. Xá»­ lÃ½ Edges
    const edgeList = [];
    window.characters.forEach(c => {
        if (c.relations && Array.isArray(c.relations)) {
            c.relations.forEach(rel => {
                if (window.characters.some(t => t.id === rel.targetId)) {
                    edgeList.push({
                        from: c.id,
                        to: rel.targetId,
                        label: rel.type,
                        arrows: { to: { enabled: true, scaleFactor: 0.4 } },
                        color: { color: 'rgba(148, 163, 184, 0.4)', hover: '#fbbf24', highlight: '#fbbf24' },
                        font: { size: 9, color: '#94a3b8', strokeWidth: 0, align: 'middle' },
                        smooth: { type: 'continuous', roundness: 0.5 }
                    });
                }
            });
        }
    });

    nodesView.add(nodeList);
    edgesView.add(edgeList);

    const options = {
        physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: { gravitationalConstant: -150, centralGravity: 0.01, springLength: 150, springConstant: 0.05, avoidOverlap: 1 },
            stabilization: { enabled: true, iterations: 200 }
        },
        interaction: {
            hover: true,
            hideEdgesOnDrag: true,
            hideEdgesOnZoom: true,
            navigationButtons: true
        }
    };

    networkCanvas.innerHTML = "";
    const network = new vis.Network(networkCanvas, { nodes: nodesView, edges: edgesView }, options);

    // --- LOGIC áº¨N CÃC NODE KHÃ”NG LIÃŠN QUAN ---
    network.on("click", function(params) {
        if (params.nodes.length > 0) {
            const selectedNodeId = params.nodes[0];
            
            // Láº¥y danh sÃ¡ch cÃ¡c node cÃ³ káº¿t ná»‘i trá»±c tiáº¿p
            const connectedNodes = network.getConnectedNodes(selectedNodeId);
            const allVisibleNodes = [selectedNodeId, ...connectedNodes];

            // Cáº­p nháº­t láº¡i DataSet: áº¨n báº±ng cÃ¡ch filter hoáº·c cáº­p nháº­t hidden
            const updateArray = nodeList.map(node => ({
                id: node.id,
                hidden: !allVisibleNodes.includes(node.id)
            }));
            nodesView.update(updateArray);

            // Tá»± Ä‘á»™ng cÄƒn chá»‰nh mÃ n hÃ¬nh vÃ o cá»¥m nhÃ¢n váº­t Ä‘ang xem
            network.fit({
                nodes: allVisibleNodes,
                animation: true
            });
        } else {
            // Click ra vÃ¹ng trá»‘ng -> Hiá»‡n láº¡i táº¥t cáº£
            const resetArray = nodeList.map(node => ({
                id: node.id,
                hidden: false
            }));
            nodesView.update(resetArray);
            network.fit({ animation: true });
        }
    });

    network.on("stabilizationIterationsDone", () => network.setOptions({ physics: false }));

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
            console.error("âŒ GM: KhÃ´ng tÃ¬m tháº¥y hÃ m reloadAllData!");
        }
        const safeRun = async (fn, ...args) => {
            if (typeof fn === "function") {
                return await fn(...args);
            } else {
                console.warn(`âš ï¸ GM: HÃ m ${fn} chÆ°a Ä‘Æ°á»£c Ä‘á»‹nh nghÄ©a. Kiá»ƒm tra láº¡i file .js tÆ°Æ¡ng á»©ng.`);
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

        console.log("ðŸš€ GM: á»¨ng dá»¥ng khá»Ÿi Ä‘á»™ng hoÃ n táº¥t!");

    } catch (err) {
        console.error("âŒ Lá»—i khá»Ÿi Ä‘á»™ng á»©ng dá»¥ng (app.js):", err);
    }
});
// Family Dropdowns Populate
function populateFamilyDropdowns() {
    const fatherSelect = document.getElementById("charFather");
    const motherSelect = document.getElementById("charMother");
    const familyRootSelect = document.getElementById("familyRootSelect");
    
    if (!fatherSelect || !motherSelect) return;
    
    let html = "<option value=\"\">Không rõ / ?n danh</option>";
    let rootHtml = "<option value=\"\">-- Ch?n Th?y T? / Ngu?i d?ng d?u --</option>";
    
    const sortedChars = [...window.characters].sort((a,b) => a.name.localeCompare(b.name));
    
    sortedChars.forEach(c => {
        if (typeof editingId !== "undefined" && c.id === editingId) return;
        html += `<option value="${c.id}">${c.name}</option>`;
    });
    
    fatherSelect.innerHTML = html;
    motherSelect.innerHTML = html;
    
    if (familyRootSelect) {
        sortedChars.forEach(c => {
            rootHtml += `<option value="${c.id}">${c.name}</option>`;
        });
        familyRootSelect.innerHTML = rootHtml;
    }
}
