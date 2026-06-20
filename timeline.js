let timeline = [];
let editingEventId = null;
let currentFlipIndex = 0;
let totalPages = 0;

document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (typeof initImageDB === "function") {
            await initImageDB(); 
            await loadTimeline();
        }
    } catch (err) {
        console.error("Lỗi khởi động Timeline:", err);
    }
});

async function loadTimeline() {
    try {
        if (typeof initImageDB === "function" && !imageDB) {
            await initImageDB();
        }
        if (!imageDB.objectStoreNames.contains("timeline")) return;

        const tx = imageDB.transaction("timeline", "readonly");
        const store = tx.objectStore("timeline");
        const request = store.getAll();

        request.onsuccess = () => {
            timeline = Array.isArray(request.result) ? request.result : [];
            // Sort by year
            timeline.sort((a, b) => a.year - b.year);
            renderBook();
            console.log(`Đã tải ${timeline.length} sự kiện.`);
        };
    } catch (err) {
        console.error("Lỗi loadTimeline:", err);
    }
}

function getIcon(type) {
    switch(type) {
        case 'war': return '<i class="fa-solid fa-khanda icon-war"></i>';
        case 'magic': return '<i class="fa-solid fa-hat-wizard icon-magic"></i>';
        case 'discovery': return '<i class="fa-solid fa-compass icon-discovery"></i>';
        case 'disaster': return '<i class="fa-solid fa-volcano icon-disaster"></i>';
        case 'birth': return '<i class="fa-solid fa-seedling icon-birth"></i>';
        case 'death': return '<i class="fa-solid fa-skull icon-death"></i>';
        default: return '<i class="fa-solid fa-scroll icon-general"></i>';
    }
}

function renderEventContent(e) {
    if (!e) return "<div class='event-block'><div class='event-title' style='color:#777; font-style:italic;'>Trang trắng...</div></div>";
    
    let descHtml = e.desc || "";
    if (typeof renderMarkdown === "function") {
        descHtml = renderMarkdown(e.desc || "");
    } else {
        descHtml = descHtml.replace(/\n/g, "<br>");
    }

    return `
        <div class="event-block">
            <div class="event-year">
                ${e.year < 0 ? 'TCN ' + Math.abs(e.year) : 'Năm ' + e.year}
                ${e.era ? `<span class="event-era">[${e.era}]</span>` : ''}
            </div>
            <div class="event-title">${getIcon(e.type)} ${e.title}</div>
            <img class="event-image" id="img-ev-${e.id}" src="https://www.transparenttextures.com/patterns/old-wall.png" style="display:none;">
            <div class="event-desc markdown-body">${descHtml}</div>
            <div class="event-actions">
                <button onclick="prepareEditEvent('${e.id}')"><i class="fa-solid fa-pen"></i> Sửa</button>
                <button onclick="deleteEvent('${e.id}')"><i class="fa-solid fa-trash"></i> Xóa</button>
            </div>
        </div>
    `;
}

function renderBook() {
    const book = document.getElementById("book");
    if (!book) return;
    book.innerHTML = "";
    
    // Page 0: Cover / Event 0
    let pagesHtml = "";
    const numEvents = timeline.length;
    totalPages = Math.ceil((numEvents + 1) / 2); // cover + events

    for (let i = 0; i < totalPages; i++) {
        let frontContent = "";
        let backContent = "";
        
        if (i === 0) {
            frontContent = `
                <div class="front book-cover">
                    <i class="fa-solid fa-dragon"></i>
                    <h1>Sử Ký Thế Giới</h1>
                    <p style="opacity:0.8;">Bấm mũi tên để lật trang</p>
                </div>`;
            backContent = `<div class="back">${renderEventContent(timeline[0])}<div class="page-number">- 1 -</div></div>`;
        } else {
            const ev1 = timeline[i * 2 - 1];
            const ev2 = timeline[i * 2];
            frontContent = `<div class="front">${renderEventContent(ev1)}<div class="page-number">- ${i*2} -</div></div>`;
            backContent = `<div class="back">${renderEventContent(ev2)}<div class="page-number">- ${i*2 + 1} -</div></div>`;
        }
        
        const zIndex = totalPages - i;
        pagesHtml += `<div class="page" id="page-${i}" style="z-index:${zIndex};">${frontContent}${backContent}</div>`;
    }

    book.innerHTML = pagesHtml;
    currentFlipIndex = 0;
    updatePageVisibility();

    // Load images async
    timeline.forEach(e => {
        if (typeof getImage === "function") {
            getImage(e.id).then(url => {
                if (url) {
                    const imgEl = document.getElementById(`img-ev-${e.id}`);
                    if (imgEl) {
                        imgEl.src = url;
                        imgEl.style.display = "block";
                    }
                }
            });
        }
    });
}

function updatePageVisibility() {
    // Hide buttons if at ends
    document.getElementById("prevPageBtn").style.visibility = currentFlipIndex === 0 ? "hidden" : "visible";
    document.getElementById("nextPageBtn").style.visibility = currentFlipIndex >= totalPages ? "hidden" : "visible";
    
    // Update z-indexes to allow proper stacking
    for (let i = 0; i < totalPages; i++) {
        const pageEl = document.getElementById(`page-${i}`);
        if (!pageEl) continue;
        
        if (i < currentFlipIndex) {
            // Flipped pages stack on the left (lowest index = highest z-index)
            pageEl.style.zIndex = i + 1;
        } else {
            // Unflipped pages stack on the right (highest index = lowest z-index)
            pageEl.style.zIndex = totalPages - i;
        }
    }
}

function nextPage() {
    if (currentFlipIndex >= totalPages) return;
    const p = document.getElementById(`page-${currentFlipIndex}`);
    if (p) {
        p.classList.add("flipped");
        currentFlipIndex++;
        updatePageVisibility();
    }
}

function prevPage() {
    if (currentFlipIndex <= 0) return;
    currentFlipIndex--;
    const p = document.getElementById(`page-${currentFlipIndex}`);
    if (p) {
        p.classList.remove("flipped");
        updatePageVisibility();
    }
}

/* Modal Form Operations */
function openAddForm() {
    editingEventId = null;
    document.getElementById("eventTitle").value = "";
    document.getElementById("eventYear").value = "";
    document.getElementById("eventEra").value = "";
    document.getElementById("eventType").value = "general";
    document.getElementById("eventDesc").value = "";
    document.getElementById("formTitleText").innerText = "Khắc ghi Sử Sách";
    document.getElementById("formModal").classList.remove("hidden");
}

function prepareEditEvent(id) {
    const e = timeline.find(x => x.id === id);
    if (!e) return;
    editingEventId = id;
    document.getElementById("eventTitle").value = e.title;
    document.getElementById("eventYear").value = e.year;
    document.getElementById("eventEra").value = e.era || "";
    document.getElementById("eventType").value = e.type || "general";
    document.getElementById("eventDesc").value = e.desc || "";
    document.getElementById("formTitleText").innerText = "Chỉnh sửa Sự kiện";
    document.getElementById("formModal").classList.remove("hidden");
}

function closeFormModal() {
    document.getElementById("formModal").classList.add("hidden");
}

async function addEvent() {
    const title = document.getElementById("eventTitle")?.value.trim();
    const year = document.getElementById("eventYear")?.value;
    const era = document.getElementById("eventEra")?.value.trim();
    const desc = document.getElementById("eventDesc")?.value.trim();
    const type = document.getElementById("eventType")?.value || "general";

    if (!title || !year) {
        if (typeof showToast === "function") showToast("⚠️ Yêu cầu Tên và Năm!");
        return;
    }

    const id = editingEventId || crypto.randomUUID();
    const eventData = {
        id: id,
        title: title,
        year: Number(year),
        era: era,
        desc: desc,
        type: type,
        timestamp: Date.now()
    };

    try {
        if (!imageDB) await initImageDB();
        const tx = imageDB.transaction("timeline", "readwrite");
        await tx.objectStore("timeline").put(eventData);

        const fileInput = document.getElementById("eventImage");
        if (fileInput?.files[0] && typeof saveImage === "function") {
            await saveImage(id, fileInput.files[0]);
        }

        if (editingEventId) {
            const idx = timeline.findIndex(e => e.id === id);
            if (idx !== -1) timeline[idx] = eventData;
        } else {
            timeline.push(eventData);
        }

        timeline.sort((a, b) => a.year - b.year);
        renderBook();
        closeFormModal();
        if (typeof showToast === "function") showToast("✅ Sử sách đã được khắc ghi!");

        // Flip to the page where this event is
        const idx = timeline.findIndex(e => e.id === id);
        const targetPage = Math.ceil((idx + 1) / 2);
        
        // Cố gắng lật sách đến đúng trang (logic đơn giản)
        while(currentFlipIndex < targetPage && currentFlipIndex < totalPages) {
            nextPage();
        }
        while(currentFlipIndex > targetPage && currentFlipIndex > 0) {
            prevPage();
        }

    } catch (err) {
        console.error("Lỗi lưu sự kiện:", err);
    }
}

async function deleteEvent(id) {
    if (!confirm("Bạn có chắc muốn xóa trang sử này?")) return;
    try {
        const tx = imageDB.transaction("timeline", "readwrite");
        await tx.objectStore("timeline").delete(id);
        if (typeof deleteImage === "function") await deleteImage(id);
        
        timeline = timeline.filter(e => e.id !== id);
        renderBook();
        
        if (typeof showToast === "function") showToast("🧹 Đã xóa khỏi sử sách.");
    } catch (err) { console.error("Lỗi xóa:", err); }
}
