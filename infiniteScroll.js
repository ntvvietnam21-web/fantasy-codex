/* ===============================
INFINITE SCROLL SYSTEM
(Note: resetCharacterList() và scroll logic được quản lý bởi app.js với hệ thống phân trang)
Các hàm helper giữ lại ở đây để tương thích
=============================== */

const PAGE_SIZE = 30;

/* ===============================
LOAD CARD IMAGES (Helper)
Được gọi bởi app.js sau khi render danh sách
=============================== */
function loadCardImages(slice) {
    if (!slice || !Array.isArray(slice)) return;
    slice.forEach(c => {
        const img = document.getElementById(`img-${c.id}`);
        if (!img || img.dataset.loaded === "true") return;
        if (c.img) {
            if (c.img.startsWith("http") || c.img.startsWith("data:")) {
                img.src = c.img;
                img.dataset.loaded = "true";
            } else if (typeof getImage === "function") {
                getImage(c.img).then(src => {
                    if (src && img) {
                        img.src = src;
                        img.dataset.loaded = "true";
                    }
                }).catch(() => {});
            }
        }
    });
}