/* =========================
IMAGE UPLOAD + PREVIEW + SAVE TO DB
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
            // 🔹 Preview ngay
            const reader = new FileReader();
            reader.onload = function (e) {
                preview.src = e.target.result;
                preview.classList.remove("hidden");
            };
            reader.readAsDataURL(file);

            // 🔹 Lưu vào IndexedDB
            if (!window.imageDB) await initImageDB(); // gọi DB init từ imageDB.js

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
HELPER: Compress IMAGE
========================= */
function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith("image/")) return reject("File không phải ảnh.");

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
                let { width, height } = img;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => resolve(blob),
                    "image/webp",
                    quality
                );
            };

            img.onerror = (err) => reject("Lỗi tải ảnh: " + err);
        };

        reader.onerror = (err) => reject("Lỗi đọc file: " + err);
    });
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