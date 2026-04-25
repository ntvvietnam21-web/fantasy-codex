const SCHEMA_VERSION_KEY = "imageDB_schema_version";
let imageDB = null;
const DB_NAME = "FantasyCodexImages";
const STORE_NAME = "images";
let DB_VERSION = 26;
const CURRENT_SCHEMA_VERSION = 6;

function initImageDB(forceReset = false) {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject("Trình duyệt không hỗ trợ IndexedDB.");

        const savedVersion = localStorage.getItem(SCHEMA_VERSION_KEY);
        if (!savedVersion || Number(savedVersion) !== CURRENT_SCHEMA_VERSION) {
            forceReset = true;
            localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
        }

        const openDB = () => {
            const request = indexedDB.open(DB_NAME, DB_VERSION + CURRENT_SCHEMA_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
                    store.createIndex("id", "id", { unique: false });
                }

                const stores = ["characters", "races", "kingdoms", "factions", "locations", "map_routes", "world_maps_v2", "timeline"];
                stores.forEach(s => {
                    if (!db.objectStoreNames.contains(s)) {
                        const key = (s === "races") ? "name" : "id";
                        db.createObjectStore(s, { keyPath: key });
                    }
                });
            };

            request.onsuccess = (e) => {
                imageDB = e.target.result;
                resolve(imageDB);
            };

            request.onerror = (e) => {
                if (e.target.error.name === "VersionError") {
                    indexedDB.deleteDatabase(DB_NAME);
                    location.reload();
                }
                reject("Lỗi DB: " + e.target.error);
            };
        };

        if (forceReset) {
            const deleteReq = indexedDB.deleteDatabase(DB_NAME);
            deleteReq.onsuccess = () => openDB();
            deleteReq.onerror = () => reject("Không thể xóa database cũ.");
        } else {
            openDB();
        }
    });
}

async function dbGet(storeName) {
    if (!imageDB) await initImageDB();
    return new Promise((resolve) => {
        const tx = imageDB.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
    });
}

async function dbGetAll(storeName) {
    try {
        if (!imageDB) await initImageDB();
        return new Promise((resolve, reject) => {
            const tx = imageDB.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (e) {
        return [];
    }
}

async function dbSave(storeName, data) {
    if (!imageDB) await initImageDB();
    
    return new Promise((resolve, reject) => {
        if (!imageDB.objectStoreNames.contains(storeName)) {
            return reject(`Store "${storeName}" không tồn tại.`);
        }

        const tx = imageDB.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        
        if (Array.isArray(data)) {
            const clearReq = store.clear();
            clearReq.onsuccess = () => {
                data.forEach(item => {
                    if (item) store.put(item);
                });
            };
        } else {
            store.put(data);
        }
        
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
    });
}

async function dbDelete(storeName, id) {
    if (!imageDB) await initImageDB();
    return new Promise((resolve, reject) => {
        const tx = imageDB.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function saveImage(id, file) {
    try {
        if (!imageDB) await initImageDB();
        const compressedBlob = await compressImage(file, 800, 0.7);
        const key = `${id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        return new Promise((resolve, reject) => {
            const tx = imageDB.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const request = store.put({ 
                key: key, 
                id: id, 
                data: compressedBlob, 
                timestamp: Date.now() 
            });
            request.onsuccess = () => resolve(key);
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (err) {
        return null;
    }
}

async function getImage(id) {
    if (!imageDB) await initImageDB();
    return new Promise((resolve) => {
        const tx = imageDB.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const index = store.index("id");
        const request = index.getAll(id);

        request.onsuccess = () => {
            const results = request.result;
            if (!results || !results.length) return resolve(null);
            const latest = results.sort((a, b) => b.timestamp - a.timestamp)[0];
            resolve(URL.createObjectURL(latest.data));
        };
        request.onerror = () => resolve(null);
    });
}

async function deleteImage(id) {
    if (!imageDB) await initImageDB();
    return new Promise((resolve) => {
        const tx = imageDB.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const index = store.index("id");
        const request = index.getAll(id);

        request.onsuccess = () => {
            const images = request.result || [];
            images.forEach(img => store.delete(img.key));
        };
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
    });
}

function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
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
                canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
            };
        };
        reader.onerror = (err) => reject(err);
    });
}
async function cleanUnusedImages() {
    if (!imageDB) await initImageDB();
    if (!confirm("🧹 GM: Dọn dẹp ảnh cũ? (Hệ thống sẽ chỉ giữ lại 1 phiên bản mới nhất cho mỗi ID ảnh để tiết kiệm bộ nhớ)")) return;

    const tx = imageDB.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        const images = request.result || [];
        const grouped = {};
        let deletedCount = 0;

        // Bước 1: Gom nhóm ảnh theo ID
        images.forEach(img => {
            if (!img.id) return;
            if (!grouped[img.id]) grouped[img.id] = [];
            grouped[img.id].push(img);
        });

        // Bước 2: Duyệt từng nhóm để xóa bản cũ
        Object.values(grouped).forEach(list => {
            // Nếu chỉ có 1 ảnh thì bỏ qua
            if (list.length <= 1) return;

            // Sắp xếp theo timestamp (mới nhất lên đầu)
            list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            const latestKey = list[0].key;
            
            // Xóa tất cả các ảnh không phải là bản mới nhất
            list.forEach(img => {
                if (img.key !== latestKey) {
                    store.delete(img.key);
                    deletedCount++;
                }
            });
        });

        // Bước 3: Thông báo kết quả sau khi Transaction hoàn tất
        tx.oncomplete = () => {
            if (deletedCount > 0) {
                showToast(`🧹 GM: Đã dọn dẹp ${deletedCount} phiên bản ảnh cũ thành công!`, "success");
            } else {
                showToast("✨ GM: Kho ảnh đã gọn gàng, không có phiên bản thừa.", "info");
            }
            console.log(`[GM] CleanUp: Deleted ${deletedCount} old image versions.`);
        };

        tx.onerror = () => {
            showToast("❌ GM: Lỗi khi truy cập kho ảnh!", "error");
        };
    };
}





