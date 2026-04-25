
let timeline = [];
let zoomLevel = 1;
let editingEventId = null;

// 1. Khởi tạo ngay khi trang load
document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (typeof initImageDB === "function") {
            await initImageDB(); 
            await loadTimeline();
        }
    } catch (err) {
        console.error("❌ GM: Lỗi khởi động Timeline:", err);
    }
    initDragScroll();
});
async function loadTimeline() {
    try {
        // Đảm bảo DB đã sẵn sàng
        if (typeof initImageDB === "function" && !imageDB) {
            await initImageDB();
        }
        
        if (!imageDB.objectStoreNames.contains("timeline")) {
            console.warn("⚠️ GM: Store 'timeline' chưa được tạo trong IndexedDB.");
            return;
        }

        const tx = imageDB.transaction("timeline", "readonly");
        const store = tx.objectStore("timeline");
        const request = store.getAll();

        request.onsuccess = () => {
            // Đảm bảo dữ liệu luôn là mảng và được gán vào biến global
            timeline = Array.isArray(request.result) ? request.result : [];
            renderTimeline();
            console.log(`📜 GM: Đã tải ${timeline.length} sự kiện.`);
        };
    } catch (err) {
        console.error("❌ Lỗi loadTimeline:", err);
    }
}
// 3. Thêm sự kiện mới
async function addEvent() {
    const title = document.getElementById("eventTitle")?.value.trim();
    const year = document.getElementById("eventYear")?.value;
    const desc = document.getElementById("eventDesc")?.value.trim();
    const typeEl = document.getElementById("eventType");
    const type = typeEl ? typeEl.value : "general";

    if (!title || !year) {
        if (typeof showToast === "function") showToast("⚠️ GM: Nhập tên và năm!");
        return;
    }

    // Nếu editingEventId có giá trị -> Lấy ID cũ, nếu không -> Tạo ID mới
    const eventData = {
        id: editingEventId || crypto.randomUUID(),
        title: title,
        year: Number(year),
        desc: desc,
        type: type,
        timestamp: Date.now()
    };

    try {
        if (!imageDB) await initImageDB();
        
        const tx = imageDB.transaction("timeline", "readwrite");
        const store = tx.objectStore("timeline");
        
        await store.put(eventData);

        // Cập nhật mảng tạm thời để UI thay đổi ngay lập tức
        if (editingEventId) {
            const idx = timeline.findIndex(e => e.id === editingEventId);
            if (idx !== -1) timeline[idx] = eventData;
        } else {
            timeline.push(eventData);
        }

        renderTimeline();
        clearForm();
        
        if (typeof showToast === "function") {
            showToast(editingEventId ? "✅ Đã cập nhật sử sách!" : "✅ Sử sách đã được khắc ghi!");
        }

        // Reset trạng thái sửa
        editingEventId = null;
        const submitBtn = document.querySelector(".timeline-form button");
        if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-feather-pointed"></i> Khắc ghi vào sử sách';

    } catch (err) {
        console.error("❌ Lỗi lưu sự kiện:", err);
    }
}
// 4. Render giao diện
function prepareEditEvent(id) {
    const event = timeline.find(e => e.id === id);
    if (!event) {
        console.error("❌ GM: Không tìm thấy sự kiện với ID:", id);
        return;
    }

    // 2. Đánh dấu ID đang được sửa
    editingEventId = id;

    // 3. Đổ dữ liệu vào Form
    document.getElementById("eventTitle").value = event.title;
    document.getElementById("eventYear").value = event.year;
    document.getElementById("eventDesc").value = event.desc || "";
    
    const typeEl = document.getElementById("eventType");
    if (typeEl) {
        typeEl.value = event.type || "general";
    }

    // 4. Đổi giao diện nút bấm
    const submitBtn = document.querySelector(".timeline-form button");
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Cập nhật thay đổi';
        submitBtn.style.background = "#27ae60"; // Màu xanh lá cho chế độ Update
    }

    // 5. Đóng modal và cuộn lên
    closeModal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof showToast === "function") showToast("🛠️ Chế độ sửa: " + event.title);
}
function renderTimeline() {
    const box = document.getElementById("timelineList");
    if (!box) return;
    box.innerHTML = "";

    if (!timeline || timeline.length === 0) {
        box.innerHTML = "<div class='empty-msg' style='padding:20px; opacity:0.5;'>Chưa có sự kiện nào trong sử sách...</div>";
        return;
    }
    timeline.sort((a, b) => a.year - b.year);

    const yearRatio = 40 * zoomLevel; 

    timeline.forEach((e, index) => {
        const div = document.createElement("div");
        // Gán class dựa trên loại sự kiện để hiển thị màu sắc khác nhau
        div.className = `timeline-item type-${e.type || 'general'}`;
        
        let marginLeft = 40; 
        if (index > 0) {
            const yearDiff = e.year - timeline[index - 1].year;
            // Tính toán khoảng cách dựa trên năm thực tế và mức zoom
            marginLeft = Math.min(Math.max(40, yearDiff * (yearRatio / 5)), 600); 
        }

        div.style.marginLeft = index === 0 ? "20px" : `${marginLeft}px`;

        div.innerHTML = `
            <div class="item-header">
                <span class="year-label">${e.year < 0 ? 'TCN ' + Math.abs(e.year) : 'Năm ' + e.year}</span>
                <div class="dot-marker"></div>
            </div>
            <div class="item-card">
                <div class="item-title">${e.title}</div>
                <div class="item-desc">${e.desc || "Không có mô tả."}</div>
                <button class="del-btn" title="Xóa" onclick="event.stopPropagation(); deleteEvent('${e.id}')">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;

        div.onclick = () => openModal(e);
        box.appendChild(div);
    });
}
// 5. Xóa sự kiện
async function deleteEvent(id) {
    if (!confirm("GM: Bạn có chắc muốn xóa sự kiện này khỏi dòng thời gian?")) return;
    try {
        const tx = imageDB.transaction("timeline", "readwrite");
        await tx.objectStore("timeline").delete(id);
        
        timeline = timeline.filter(e => e.id !== id);
        renderTimeline();
        closeModal(); // Đóng modal sau khi xóa thành công
        
        if (typeof showToast === "function") showToast("🧹 Đã xóa khỏi dòng thời gian.");
    } catch (err) { console.error("❌ Lỗi xóa:", err); }
}
// --- ZOOM & UI HELPERS ---
function zoomIn() { zoomLevel = Math.min(3, zoomLevel + 0.2); updateUI(); }
function zoomOut() { zoomLevel = Math.max(0.3, zoomLevel - 0.2); updateUI(); }
function updateUI() {
    const display = document.getElementById("zoomDisplay");
    if (display) display.innerText = Math.round(zoomLevel * 100) + "%";
    renderTimeline();
}
function clearForm() {
    ["eventTitle", "eventYear", "eventDesc"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    // Reset ID đang sửa về null
    editingEventId = null;

    // Đưa nút bấm về trạng thái thêm mới
    const submitBtn = document.querySelector(".timeline-form button");
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fa-solid fa-feather-pointed"></i> Khắc ghi vào sử sách';
        submitBtn.style.background = ""; // Reset về màu mặc định trong CSS
    }
}
function openModal(e) {
    const modal = document.getElementById("eventModal");
    if (!modal) return;
    
    document.getElementById("modalTitle").innerText = e.title;
    document.getElementById("modalYear").innerText = "Năm: " + e.year;
    document.getElementById("modalDesc").innerText = e.desc || "Không có mô tả";
    
    const badge = document.getElementById("modalBadge");
    if (badge) {
        badge.innerText = (e.type || "GENERAL").toUpperCase();
        badge.className = `event-badge badge-${e.type || 'general'}`;
    }

    // Gán ID sự kiện vào hàm onclick của các nút trong modal
    const btnEdit = document.querySelector("#eventModal button[onclick^='prepareEditEvent']");
    if (btnEdit) {
        btnEdit.onclick = () => prepareEditEvent(e.id);
    }

    const btnDelete = document.getElementById("btnDeleteConfirm");
    if (btnDelete) {
        btnDelete.onclick = () => deleteEvent(e.id);
    }

    modal.classList.remove("hidden");
}
function closeModal() {
    const modal = document.getElementById("eventModal");
    if (modal) modal.classList.add("hidden");
}
function initDragScroll() {
    const wrapper = document.getElementById("timelineWrapper");
    if (!wrapper) return;
    let isDown = false, startX, scrollLeft;
    wrapper.addEventListener("mousedown", (e) => {
        isDown = true; wrapper.classList.add("grabbing");
        startX = e.pageX - wrapper.offsetLeft;
        scrollLeft = wrapper.scrollLeft;
    });
    wrapper.addEventListener("mouseleave", () => isDown = false);
    wrapper.addEventListener("mouseup", () => { isDown = false; wrapper.classList.remove("grabbing"); });
    wrapper.addEventListener("mousemove", (e) => {
        if (!isDown) return;
        const x = e.pageX - wrapper.offsetLeft;
        wrapper.scrollLeft = scrollLeft - (x - startX) * 1.5;
    });
}
