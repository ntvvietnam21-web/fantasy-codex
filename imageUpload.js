/* =========================
IMAGE UPLOAD + PREVIEW + SAVE TO DB
(compressImage được dùng từ imageDB.js để tránh trùng lặp)
========================= */

async function initImageUpload() {
    const input = document.getElementById("charImg");
    const preview = document.getElementById("previewImg");
    const container = document.getElementById("imageContainer");

    if (!input || !preview || !container) return;

    input.addEventListener("change", async function () {
        const file = this.files[0];
        if (!file) return;

        // 🔥 Chỉ cho phép ảnh
        if (!file.type.startsWith("image/")) {
            alert("Vui lòng chọn file ảnh!");
            return;
        }

        try {
            // 🔹 Preview ngay bằng Object URL (không dùng FileReader để nhanh hơn)
            const objectUrl = URL.createObjectURL(file);
            preview.src = objectUrl;
            preview.classList.remove("hidden");
            // Revoke sau khi render xong, không revoke trong onload
            preview.onload = () => {
                // Chờ thêm một tick để đảm bảo render xong
                setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
            };

            // 🔹 Lưu vào IndexedDB (dùng compressImage từ imageDB.js)
            if (!window.imageDB) await initImageDB();

            // compressImage được định nghĩa trong imageDB.js
            if (typeof compressImage !== "function") {
                console.warn("⚠️ compressImage chưa được nạp từ imageDB.js");
                return;
            }

            const compressedBlob = await compressImage(file, 800, 0.7);
            const id = input.dataset.charId || "char"; // nếu có ID nhân vật
            const key = `${id}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

            const tx = imageDB.transaction("images", "readwrite");
            const store = tx.objectStore("images");

            store.put({
                key,
                id,
                data: compressedBlob,
                timestamp: Date.now()
            });

            tx.oncomplete = async () => {
                log(`✅ Lưu ảnh thành công cho id=${id}`);
                // 🔹 Render ảnh mới
                await renderImages();
            };

            tx.onerror = (e) => {
                console.error("❌ Lỗi lưu ảnh:", e.target.error);
            };

        } catch (err) {
            console.error("❌ Lỗi upload image:", err);
        }
    });
}

/* =========================
RENDER IMAGES FROM DB
========================= */
async function renderImages() {
    const container = document.getElementById("imageContainer");
    if (!container) return;

    container.innerHTML = "";

    if (!window.imageDB) await initImageDB();

    const tx = imageDB.transaction("images", "readonly");
    const store = tx.objectStore("images");

    const request = store.getAll();

    request.onsuccess = () => {
        const images = request.result || [];

        if (!images.length) {
            container.innerHTML = "<p>Chưa có ảnh nào</p>";
            return;
        }

        images.sort((a, b) => b.timestamp - a.timestamp); // ưu tiên ảnh mới

        images.forEach(img => {
            if (!img.data || !img.id) return;

            const div = document.createElement("div");
            div.className = "image-item";

            const url = URL.createObjectURL(img.data);
            div.innerHTML = `
                <img src="${url}" style="width:100px;border-radius:8px;">
                <p>${img.id}</p>
            `;
            container.appendChild(div);
        });
    };

    request.onerror = (e) => {
        console.error("❌ Lỗi renderImages:", e.target.error);
    };
}

/* =========================
DEBUG LOG
========================= */
function log(msg) {
    const box = document.getElementById("debugBox");
    if (!box) return;
    box.innerHTML += "<br>" + msg;
}

/* =========================
AUTO INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
    initImageUpload();
    renderImages(); // render tất cả ảnh khi load page
});