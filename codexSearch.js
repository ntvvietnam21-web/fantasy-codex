// codexSearch.js - Nâng cấp bởi GM (Codex)
let searchTimeout = null;
let currentFocus = -1; // Theo dõi vị trí đang chọn bằng phím mũi tên

async function searchCodex() {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
        const searchInput = document.getElementById("codexSearch");
        const resultBox = document.getElementById("codexSearchResults");

        if (!searchInput || !resultBox) return;

        const term = searchInput.value.toLowerCase().trim();
        currentFocus = -1; // Reset tiêu điểm khi nhập từ mới

        if (!term) {
            renderRecentSearches(); // GM: Hiện lịch sử khi ô tìm kiếm trống
            return;
        }

        resultBox.innerHTML = "";
        resultBox.style.display = "block";

        const highlight = (text) => {
            if (!text) return "";
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return text.replace(new RegExp(`(${escapedTerm})`, "gi"), "<mark>$1</mark>");
        };

        // --- GM: Nâng cấp pushResult hiển thị Ảnh và Thông tin phụ ---
        const pushResult = async (label, name, subInfo, imgId, onClick) => {
            const div = document.createElement("div");
            div.className = "search-result animated fadeIn";
            
            // Lấy URL ảnh (Xử lý cả URL và IndexedDB)
            let imgSrc = "https://i.imgur.com/6X8FQyA.png";
            if (imgId) {
                if (imgId.startsWith("http") || imgId.startsWith("data:")) {
                    imgSrc = imgId;
                } else if (typeof getImage === "function") {
                    imgSrc = await getImage(imgId) || imgSrc;
                }
            }

            div.innerHTML = `
                <img src="${imgSrc}" class="res-avatar" style="width:32px; height:32px; border-radius:4px; object-fit:cover;">
                <div class="res-content">
                    <div class="res-name">${highlight(name)}</div>
                    <div class="res-sub">${subInfo || label}</div>
                </div>
                <div class="res-badge">${label}</div>
            `;
            
            div.onclick = () => {
                saveRecentSearch({ label, name, imgId, action: onClick }); // Lưu vào lịch sử
                onClick();
                resultBox.style.display = "none";
                searchInput.value = "";
            };
            resultBox.appendChild(div);
        };

        let total = 0;
        const LIMIT = 12;

        const dataChars = window.characters || [];
        const dataKingdoms = window.kingdoms || [];
        const dataFactions = window.factions || [];
        const dataRaces = window.races || [];

        /* 1. NHÂN VẬT (Tìm theo tên hoặc Tộc) */
        for (const c of dataChars) {
            if (total >= LIMIT) break;
            if ((c.name || "").toLowerCase().includes(term) || (c.race || "").toLowerCase().includes(term)) {
                await pushResult("Nhân vật", c.name, c.race, c.img, () => {
                    if (typeof openProfile === "function") openProfile(c.id);
                });
                total++;
            }
        }

        /* 2. ĐẾ CHẾ */
        for (const k of dataKingdoms) {
            if (total >= LIMIT) break;
            if ((k.name || "").toLowerCase().includes(term)) {
                await pushResult("Đế chế", k.name, k.leader ? `Lãnh đạo: ${k.leader}` : "", k.img, () => {
                    if (typeof openKingdomPage === "function") {
                        const idx = dataKingdoms.indexOf(k);
                        openKingdomPage(idx);
                    }
                });
                total++;
            }
        }

        // Tương tự cho Faction và Race... (Code lặp lại tương tự nhưng dùng dữ liệu tương ứng)

        if (total === 0) {
            resultBox.innerHTML = `
                <div class="search-empty">
                    <i class="fa-solid fa-magnifying-glass-chart"></i>
                    <p>Không tìm thấy "<b>${term}</b>"</p>
                </div>`;
        }

    }, 250);
}

// --- GM: QUẢN LÝ LỊCH SỬ TÌM KIẾM GẦN ĐÂY ---
function saveRecentSearch(item) {
    let recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    recent = recent.filter(r => r.name !== item.name); // Xóa trùng
    recent.unshift(item); // Thêm vào đầu
    localStorage.setItem("recentSearches", JSON.stringify(recent.slice(0, 5)));
}

function renderRecentSearches() {
    const resultBox = document.getElementById("codexSearchResults");
    const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    
    if (recent.length === 0) {
        resultBox.style.display = "none";
        return;
    }

    resultBox.innerHTML = '<div class="search-header">Tìm kiếm gần đây</div>';
    recent.forEach(item => {
        const div = document.createElement("div");
        div.className = "search-result recent";
        div.innerHTML = `
            <i class="fa-solid fa-clock-rotate-left" style="margin-right:10px; color:var(--text-dim);"></i>
            <div class="res-name" style="flex:1">${item.name}</div>
            <div class="res-badge">${item.label}</div>
        `;
        div.onclick = () => {
            // GM Note: Cần cẩn thận khi lưu 'action' vào localStorage vì nó không lưu được function
            // Ở bản này chúng ta chỉ tìm lại tên đó
            document.getElementById("codexSearch").value = item.name;
            searchCodex();
        };
        resultBox.appendChild(div);
    });
    resultBox.style.display = "block";
}

// --- GM: ĐIỀU KHIỂN BẰNG BÀN PHÍM (HOTKEYS) ---
document.getElementById("codexSearch")?.addEventListener("keydown", function(e) {
    const resultBox = document.getElementById("codexSearchResults");
    const items = resultBox.getElementsByClassName("search-result");
    
    if (e.key === "ArrowDown") {
        currentFocus++;
        addActive(items);
    } else if (e.key === "ArrowUp") {
        currentFocus--;
        addActive(items);
    } else if (e.key === "Enter") {
        e.preventDefault();
        if (currentFocus > -1 && items[currentFocus]) {
            items[currentFocus].click();
        }
    }
});

function addActive(items) {
    if (!items) return false;
    removeActive(items);
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (items.length - 1);
    items[currentFocus].classList.add("search-active");
    items[currentFocus].scrollIntoView({ block: "nearest" });
}

function removeActive(items) {
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove("search-active");
    }
}

// Đóng box khi click ngoài
document.addEventListener("click", (e) => {
    const box = document.getElementById("codexSearchResults");
    const input = document.getElementById("codexSearch");
    if (box && !box.contains(e.target) && e.target !== input) {
        box.style.display = "none";
    }
});
