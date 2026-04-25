const keys = [
  "characters", "stats", "races", "kingdoms", "factions",
  "weapons_data", "skills_data", "items_data",
  "mapLocations", "timeline", "locations", "world_maps_v2",
  "creatures", "laws", "law_categories" 
];

const $ = id => document.getElementById(id);
function downloadJSON(data, filename) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
function normalizeCharacters(data) {
  data.forEach(c => {
    if (!c.stats) c.stats = {};
    if (!c.stats.hidden) {
      c.stats.hidden = { talent: 0, potential: 0, fate: 0 };
    } else {
      c.stats.hidden.talent = parseInt(c.stats.hidden.talent) || 0;
      c.stats.hidden.potential = parseInt(c.stats.hidden.potential) || 0;
      c.stats.hidden.fate = parseInt(c.stats.hidden.fate) || 0;
    }

    // 2. CHUẨN HÓA SKILL (Quan trọng cho Vortex Tree)
    // Đảm bảo nhân vật luôn có mảng kỹ năng tùy chỉnh
    if (!Array.isArray(c.customSkills)) {
      c.customSkills = []; 
    }

    // 3. Chuẩn hóa các hình thái (Forms)
    if (!Array.isArray(c.forms)) c.forms = [];
    else c.forms = c.forms.filter(f => f && f.name);
  });
  return data;
}
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
async function exportSelectedKey(batchSize = 200) {
  const key = $("codexKeySelect")?.value;
  if (!key) return showToast("⚠️ Chọn key để export!");
  if (key === "creatures") {
    try {
      const creatureDBRequest = indexedDB.open("CreatureCodexDB", 1);
      creatureDBRequest.onsuccess = (e) => {
        const dbC = e.target.result;
        const tx = dbC.transaction("creatures", "readonly");
        const store = tx.objectStore("creatures");
        const req = store.getAll();
        req.onsuccess = () => {
          const data = req.result || [];
          if (data.length === 0) return showToast("❌ Không có sinh vật nào để export");
          const timestamp = new Date().toISOString().slice(0, 10);
          downloadJSON(data, `Codex_Creatures_${timestamp}.json`);
          showToast(`🎉 Export [${key}] thành công!`);
        };
      };
      return;
    } catch (err) {
      console.error("Lỗi export sinh vật:", err);
      return showToast("❌ Lỗi khi đọc dữ liệu sinh vật");
    }
  }

  // GM: Xử lý riêng cho Thư viện Luật (World Laws)
  if (key === "laws" || key === "law_categories") {
    try {
      const lawDBRequest = indexedDB.open("WorldLawsDB", 2);
      lawDBRequest.onsuccess = (e) => {
        const dbL = e.target.result;
        const storeName = (key === "laws") ? "laws" : "categories";
        const tx = dbL.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        
        req.onsuccess = () => {
          const data = req.result || [];
          const timestamp = new Date().toISOString().slice(0, 10);
          downloadJSON(data, `Codex_WorldLaws_${key}_${timestamp}.json`);
          showToast(`🎉 Export [${key}] thành công!`);
        };
      };
      return;
    } catch (err) {
      console.error("Lỗi export luật:", err);
      return showToast("❌ Lỗi khi đọc dữ liệu luật");
    }
  }

  // --- Logic cũ cho các key khác ---
  if (key === "images") {
    if (typeof exportImages === "function") {
      await exportImages(batchSize);
    } else {
      showToast("❌ Chưa có module exportImages");
    }
    return;
  }

  let data = [];
  try {
    if (key.includes("_data")) {
        data = (typeof dbGetCustom === "function") ? await dbGetCustom(key) : await dbGet(key);
    } else {
        data = (typeof dbGetAll === "function") ? await dbGetAll(key) : await dbGet(key);
    }
    
    if (key === "stats") {
      const chars = (typeof dbGetAll === "function") ? await dbGetAll("characters") : await dbGet("characters");
      data = chars.map(c => ({ id: c.id, name: c.name, stats: c.stats || {} }));
    }
  } catch (err) {
    console.error("Lỗi đọc DB:", err);
    return showToast(`❌ Không thể đọc dữ liệu của [${key}]`);
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
      return showToast("❌ Không có dữ liệu để export");
  }

  const exportData = Array.isArray(data) ? data : [data];
  const batches = chunkArray(exportData, batchSize);
  const timestamp = new Date().toISOString().slice(0, 10);

  batches.forEach((batch, i) => {
    const partSuffix = batches.length > 1 ? `_Part${i + 1}` : "";
    const cleanName = key.replace("_data", "").charAt(0).toUpperCase() + key.replace("_data", "").slice(1);
    const filename = `Codex_${cleanName}${partSuffix}_${timestamp}.json`;
    downloadJSON(batch, filename);
  });

  showToast(`🎉 Export [${key}] xong: ${batches.length} file.`);
}
async function importCodexFile(file, key) {
  if (!file || !key) return;
  
  const reader = new FileReader();
  reader.onload = async (ev) => {
    let importedData;
    try {
      importedData = JSON.parse(ev.target.result);
      if (!Array.isArray(importedData)) throw new Error("Dữ liệu phải là một mảng JSON!");
    } catch (err) {
      return showToast("❌ File JSON không hợp lệ!");
    }

    if (key === "images") {
      return typeof importImagesFromJSON === "function" 
        ? await importImagesFromJSON(file) 
        : showToast("❌ Thiếu module ảnh");
    }

    if (!confirm(`⚠️ Ghi đè dữ liệu [${key}]?`)) return;

    try {
        // GM: Xử lý Import cho Sinh vật (Giữ nguyên)
        if (key === "creatures") {
            const creatureDBRequest = indexedDB.open("CreatureCodexDB", 1);
            creatureDBRequest.onsuccess = (e) => {
                const dbC = e.target.result;
                const tx = dbC.transaction("creatures", "readwrite");
                const store = tx.objectStore("creatures");
                store.clear();
                importedData.forEach(item => {
                    store.put({
                        id: item.id || Date.now().toString() + Math.random(),
                        name: item.name || "Sinh vật vô danh",
                        type: item.type || "Chưa rõ",
                        rank: item.rank || "C",
                        desc: item.desc || "",
                        imgId: item.imgId || null,
                        updatedAt: item.updatedAt || Date.now()
                    });
                });
                tx.oncomplete = () => {
                    showToast(`🎉 Đã Import ${importedData.length} sinh vật.`);
                    setTimeout(() => location.reload(), 800);
                };
            };
            return;
        }

        // GM: Xử lý Import cho Luật Thế Giới (laws & law_categories)
        if (key === "laws" || key === "law_categories") {
            const lawDBRequest = indexedDB.open("WorldLawsDB", 2);
            lawDBRequest.onsuccess = (e) => {
                const dbL = e.target.result;
                const storeName = (key === "laws") ? "laws" : "categories";
                const tx = dbL.transaction(storeName, "readwrite");
                const store = tx.objectStore(storeName);
                store.clear();
                importedData.forEach(item => store.put(item));
                tx.oncomplete = () => {
                    showToast(`🎉 Đã Import ${importedData.length} dữ liệu pháp tắc.`);
                    setTimeout(() => location.reload(), 800);
                };
            };
            return;
        }

        // --- Logic chuẩn hóa dữ liệu cho các key khác ---
        let finalizedData = importedData.map(item => {
            switch (key) {
                case "characters":
                    return normalizeCharacters([item])[0];
                
                case "skills_data":
                    return {
                        id: item.id || `SKILL_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                        name: item.name || "Bí thuật vô danh",
                        desc: item.desc || "",
                        image: item.image || null,
                        power: item.power || "D",
                        type: item.type || "Chủ động",
                        element: item.element || "None"
                    };

                case "weapons_data":
                case "items_data":
                    return {
                        id: item.id || `${key.split('_')[0].toUpperCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                        name: item.name || "Vật phẩm chưa tên",
                        desc: item.desc || "",
                        image: item.image || null,
                        power: item.power || ""
                    };

                case "kingdoms":
                    let struct = Array.isArray(item.structure) ? item.structure : [];
                    struct = struct.map(tab => {
                        if (!tab.treeNodes) {
                            tab.treeNodes = tab.roles ? JSON.parse(JSON.stringify(tab.roles)) : [];
                        }
                        const repairNode = (node) => {
                            if (!node.children) node.children = [];
                            node.children.forEach(repairNode);
                        };
                        tab.treeNodes.forEach(repairNode);
                        return tab;
                    });
                    return { ...item, structure: struct };

                default:
                    return item;
            }
        });

        // Thực hiện lưu vào IndexedDB mặc định
        if (key.includes("_data")) {
            if (typeof dbSaveCustom === "function") await dbSaveCustom(key, finalizedData);
            else await dbSave(key, finalizedData);
        } else {
            await dbSave(key, finalizedData);
        }
        
        if (window[key]) window[key] = finalizedData;

        showToast(`🎉 Thành công! Đã cập nhật ${finalizedData.length} bản ghi cho [${key}].`);
        setTimeout(() => location.reload(), 800);

    } catch (err) {
      console.error("Lỗi Import:", err);
      showToast(`❌ Lỗi đồng bộ dữ liệu: ${key}`);
    }
  };
  reader.readAsText(file);
}
function handleImportFile(e) {
  const file = e.target.files[0];
  const key = $("codexKeySelect")?.value;

  if (!file || !key) return;

  importCodexFile(file, key);

  e.target.value = null; // reset input
}
async function exportImages(batchSize = 200) {
    if (!imageDB) await initImageDB();

    const tx = imageDB.transaction("images", "readonly");
    const store = tx.objectStore("images");

    const request = store.getAll();

    request.onsuccess = async () => {
        const images = request.result || [];
        if (!images.length) return showToast("❌ Không có ảnh để export");

        let batchIndex = 0;

        while (images.length) {
            const batch = images.splice(0, batchSize);

            const converted = await Promise.all(batch.map(async img => {
                let data;
                if (img.data instanceof Blob) data = await blobToBase64(img.data);
                else if (typeof img.data === "string") data = img.data;
                else return null;

                return { id: img.id, data };
            }));

            // loại bỏ null
            const batchData = converted.filter(x => x);

            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            downloadJSON(batchData, `images_Backup_batch${batchIndex}_${timestamp}.json`);
            batchIndex++;
        }

        showToast(`🖼️ Export xong ${batchIndex} batch ảnh`);
    };

    request.onerror = () => showToast("❌ Lỗi đọc database");
}
async function importImagesFromJSON(file) {
    if (!imageDB) await initImageDB(false);

    const reader = new FileReader();
    reader.onload = async (e) => {
        let data;
        try {
            data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error("File phải là mảng JSON");
        } catch (err) {
            return showToast("❌ File ảnh không hợp lệ: " + err.message);
        }

        const currentStore = "images"; 
        const tx = imageDB.transaction(currentStore, "readwrite");
        const store = tx.objectStore(currentStore);

        let imported = 0;

        for (const img of data) {
            if (!img.id || !img.data) continue;

            let blob;
            if (typeof img.data === "string") {
                if (!img.data.startsWith("data:")) continue;
                const parts = img.data.split(",");
                const byteString = atob(parts[1]);
                const mimeString = parts[0].split(":")[1].split(";")[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                blob = new Blob([ab], { type: mimeString });
            } else if (img.data instanceof Blob) {
                blob = img.data;
            } else continue;

            const key = `${img.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            store.put({ key, id: img.id, data: blob, timestamp: Date.now() });
            imported++;
        }

        tx.oncomplete = async () => {
            showToast(`🖼️ Import thành công: ${imported} ảnh`);
            if (typeof renderImages === "function") await renderImages();
        };

        tx.onerror = () => showToast("❌ Lỗi import ảnh");
    };

    reader.readAsText(file);
}
async function renderImages() {
    const container = document.getElementById("imageContainer");
    if (!container) return;

    container.innerHTML = "";

    if (typeof initImageDB === "function" && !imageDB) await initImageDB();

    const tx = imageDB.transaction("images", "readonly");
    const store = tx.objectStore("images");

    const request = store.getAll();

    request.onsuccess = () => {
        const images = request.result || [];
        if (!images.length) {
            container.innerHTML = "<p>Không có ảnh</p>";
            return;
        }

        images.forEach(img => {
            if (!img.data || !img.id) return;

            const div = document.createElement("div");
            div.className = "image-item";

            let url;
            if (img.data instanceof Blob) {
                url = URL.createObjectURL(img.data);
            } else if (typeof img.data === "string") {
                url = img.data;
            } else {
                return;
            }

            div.innerHTML = `
                <img src="${url}" style="width:100px; height:100px; object-fit:cover; border-radius:8px;">
                <p style="font-size:10px; overflow:hidden;">${img.id}</p>
            `;

            container.appendChild(div);
        });
    };

    request.onerror = (e) => {
        console.error("❌ Lỗi renderImages:", e.target.error);
    };
}
$("importFileInput")?.addEventListener("change", handleImportFile);
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });
}