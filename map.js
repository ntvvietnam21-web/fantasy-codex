let allMaps = []; 
let currentMap = null; 
let currentLocation = null;
let addMode = false;
let routeMode = false;
let routePoints = [];
let selectedMarker = null;
let scale = 1;
let originX = 0;
let originY = 0;
let isDraggingMap = false;
let dragStartX = 0, dragStartY = 0;
let tempX = 0, tempY = 0;

window.addEventListener("DOMContentLoaded", async () => {
    if (typeof initImageDB === "function") await initImageDB();
    
    await loadAllMapsFromDB();

    const lastId = localStorage.getItem("lastActiveMapId");
    if (allMaps.length > 0) {
        const targetMap = allMaps.find(m => m.id === lastId) || allMaps[0];
        await switchMap(targetMap.id);
    } else {
        updateMapHeaderUI(); 
    }
});

async function loadAllMapsFromDB() {
    try {
        if (typeof dbGet === "function") {
            const data = await dbGet("world_maps_v2");
            allMaps = Array.isArray(data) ? data : [];
        }
    } catch (e) {
        console.error("Lỗi nạp DB:", e);
        allMaps = [];
    }
    updateMapSelectorUI();
}

function updateMapSelectorUI() {
    const sel = document.getElementById("currentMapSelect");
    if (!sel) return;
    sel.innerHTML = allMaps.map(m => `<option value="${m.id}">${m.title}</option>`).join("");
    if (currentMap) sel.value = currentMap.id;
}

function updateMapHeaderUI() {
    const titleDisp = document.getElementById("displayMapTitle");
    const descDisp = document.getElementById("displayMapDesc");
    if (currentMap) {
        titleDisp.innerText = currentMap.title;
        descDisp.innerText = currentMap.desc || "Chưa có mô tả cho vùng đất này.";
    } else {
        titleDisp.innerText = "Chưa có bản đồ";
        descDisp.innerText = "Vui lòng tạo hoặc chọn bản đồ để bắt đầu.";
    }
}

async function createNewMap() {
    const title = prompt("Nhập tên bản đồ mới:", "Vùng đất mới");
    if (!title) return;

    const newMap = {
        id: crypto.randomUUID(),
        title: title,
        desc: "Một vùng đất xa xôi chưa được khám phá.",
        image: null, 
        locations: [],
        routes: []
    };

    allMaps.push(newMap);
    await syncDB();
    updateMapSelectorUI();
    await switchMap(newMap.id);
}

async function switchMap(id) {
    const map = allMaps.find(m => m.id === id);
    if (!map) return;

    currentMap = map;
    localStorage.setItem("lastActiveMapId", id);
    routePoints = []; 
    
    updateMapHeaderUI();
    const sel = document.getElementById("currentMapSelect");
    if (sel) sel.value = id;

    const mapImg = document.getElementById("mapImage");
    if (mapImg) {
        mapImg.src = ""; 
        if (map.image && typeof getImage === "function") {
            const imgData = await getImage(map.image);
            if (imgData) {
                mapImg.src = (imgData instanceof Blob) ? URL.createObjectURL(imgData) : imgData;
            }
        }
    }

    resetZoom();
    renderMap();
}

async function editMapMetadata() {
    if (!currentMap) return;
    const newTitle = prompt("Sửa tên bản đồ:", currentMap.title);
    if (newTitle === null) return;
    const newDesc = prompt("Sửa mô tả vùng đất:", currentMap.desc);
    
    currentMap.title = newTitle || currentMap.title;
    currentMap.desc = newDesc || currentMap.desc;
    
    updateMapHeaderUI();
    updateMapSelectorUI();
    await syncDB();
}

async function deleteCurrentMap() {
    if (!currentMap) return;
    if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn bản đồ "${currentMap.title}"?`)) return;

    const idToDelete = currentMap.id;
    if (currentMap.image && typeof deleteImage === "function") {
        await deleteImage(currentMap.image);
    }

    allMaps = allMaps.filter(m => m.id !== idToDelete);
    await syncDB();
    
    if (allMaps.length > 0) await switchMap(allMaps[0].id);
    else {
        currentMap = null;
        location.reload();
    }
}

async function syncDB() {
    if (!allMaps || typeof dbSave !== "function") return;
    if (currentMap) {
        const index = allMaps.findIndex(m => m.id === currentMap.id);
        if (index !== -1) {
            allMaps[index] = JSON.parse(JSON.stringify(currentMap));
        }
    }

    try {
        await dbSave("world_maps_v2", allMaps);
    } catch (err) {
        console.error("Lỗi đồng bộ dữ liệu:", err);
        throw err;
    }
}

function renderMap() {
    const container = document.getElementById("mapMarkers");
    const svgLayer = document.getElementById("mapRoutes");
    if (!container || !currentMap) return;
    
    container.innerHTML = "";
    if (svgLayer) svgLayer.innerHTML = "";
    
    const locations = currentMap.locations || [];
    locations.forEach(loc => {
        const marker = document.createElement("div");
        marker.className = "marker pulsing";
        const color = getDynamicColor(loc.type);
        marker.style.left = loc.x + "%";
        marker.style.top = loc.y + "%";

        let iconClass = "fa-solid fa-location-dot";
        const typeLower = (loc.type || "").toLowerCase();
        if (typeLower.includes("vương quốc") || typeLower.includes("thành phố")) iconClass = "fa-solid fa-chess-rook";
        else if (typeLower.includes("hầm ngục") || typeLower.includes("tàn tích")) iconClass = "fa-solid fa-skull";
        else if (typeLower.includes("rừng")) iconClass = "fa-brands fa-pagelines";
        else if (typeLower.includes("núi")) iconClass = "fa-solid fa-mountain";

        marker.innerHTML = `
            <div class="pin-icon" style="color: ${color}; border-color: ${color};"><i class="${iconClass}"></i></div>
            <div class="pin-label">${loc.name}</div>
        `;
        
        if ((currentLocation && currentLocation.id === loc.id) || routePoints.some(p => p.id === loc.id)) {
            marker.querySelector('.pin-icon').style.boxShadow = `0 0 20px 5px ${color}`;
            marker.style.transform = "translate(-50%, -50%) scale(1.3)";
            marker.classList.add("selected-marker");
        }

        marker.onclick = (e) => {
            e.stopPropagation();
            if (routeMode) handleRouteSelection(loc);
            else openPopup(loc);
        };
        
        marker.onmousedown = (e) => {
            if (routeMode || addMode) return;
            selectedMarker = { el: marker, data: loc };
            e.stopPropagation();
        };

        container.appendChild(marker);
    });

    if (svgLayer) renderRoutes(svgLayer);
}

function renderRoutes(svgLayer) {
    if (!currentMap.routes) return;
    svgLayer.innerHTML = "";
    currentMap.routes.forEach(route => {
        const start = currentMap.locations.find(l => l.id === route.startId);
        const end = currentMap.locations.find(l => l.id === route.endId);
        if (start && end) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", `${start.x}%`);
            line.setAttribute("y1", `${start.y}%`);
            line.setAttribute("x2", `${end.x}%`);
            line.setAttribute("y2", `${end.y}%`);
            line.setAttribute("stroke", getDynamicColor(start.type));
            line.setAttribute("class", "map-route");
            
            line.onclick = async (e) => {
                e.stopPropagation();
                if (confirm("Xóa đoạn đường nối này?")) {
                    currentMap.routes = currentMap.routes.filter(r => r.id !== route.id);
                    await syncDB();
                    renderRoutes(svgLayer);
                }
            };
            
            svgLayer.appendChild(line);
        }
    });
}

function toggleAddMode() {
    addMode = !addMode;
    routeMode = false;
    document.getElementById("addBtn").classList.toggle("active", addMode);
    document.getElementById("routeBtn").classList.remove("active");
    document.getElementById("mapWrapper").style.cursor = addMode ? "crosshair" : "grab";
}

function toggleRouteMode() {
    routeMode = !routeMode;
    addMode = false;
    routePoints = [];
    document.getElementById("routeBtn").classList.toggle("active", routeMode);
    document.getElementById("addBtn").classList.remove("active");
    renderMap();
}

function handleRouteSelection(loc) {
    if (routePoints.length > 0 && routePoints[0].id === loc.id) {
        routePoints = [];
    } else {
        routePoints.push(loc);
        if (routePoints.length === 2) {
            const exists = currentMap.routes.some(r => 
                (r.startId === routePoints[0].id && r.endId === routePoints[1].id) ||
                (r.startId === routePoints[1].id && r.endId === routePoints[0].id)
            );
            if (!exists) {
                currentMap.routes.push({
                    id: crypto.randomUUID(),
                    startId: routePoints[0].id,
                    endId: routePoints[1].id
                });
                syncDB();
            }
            routePoints = [];
        }
    }
    renderMap();
}

async function saveNewLocation() {
    const name = document.getElementById("newName").value.trim();
    const type = document.getElementById("newType").value.trim() || "Địa điểm";
    const desc = document.getElementById("newDesc").value.trim();
    
    if (!name) return;

    currentMap.locations.push({
        id: crypto.randomUUID(),
        name, type, desc,
        x: tempX, y: tempY,
        highlight: false
    });

    // Đồng bộ ngược lại hệ thống chính
    if (window.parent && window.parent.locations) {
        const exist = window.parent.locations.find(l => String(l.name).trim().toLowerCase() === name.toLowerCase());
        if (!exist) {
            window.parent.locations.push({
                id: crypto.randomUUID(),
                name: name,
                type: type,
                desc: desc
            });
            if (typeof window.parent.dbSave === "function") {
                await window.parent.dbSave("locations", window.parent.locations);
            }
        }
    }

    closeCreatePopup();
    await syncDB();
    renderMap();
    document.getElementById("newName").value = "";
    document.getElementById("newDesc").value = "";
}

async function deleteLocation() {
    if (!currentLocation || !currentMap) return;
    if (confirm("Xóa địa điểm này?")) {
        const id = currentLocation.id;
        currentMap.locations = currentMap.locations.filter(l => l.id !== id);
        currentMap.routes = currentMap.routes.filter(r => r.startId !== id && r.endId !== id);
        closePopup();
        await syncDB();
        renderMap();
    }
}

function applyZoom() {
    scale = Math.min(Math.max(0.2, scale), 5);
    const container = document.getElementById("mapContainer");
    if (container) {
        container.style.transform = `translate3d(${originX}px, ${originY}px, 0) scale(${scale})`;
    }
}

document.getElementById("mapWrapper").addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const prevScale = scale;
    scale *= e.deltaY < 0 ? 1.1 : 0.9;
    originX = cx - ((cx - originX) * scale / prevScale);
    originY = cy - ((cy - originY) * scale / prevScale);
    applyZoom();
}, { passive: false });

document.getElementById("mapWrapper").addEventListener("mousedown", (e) => {
    if (addMode || selectedMarker) return;
    isDraggingMap = true;
    dragStartX = e.clientX; 
    dragStartY = e.clientY;
});

document.addEventListener("mousemove", (e) => {
    if (selectedMarker) {
        const rect = document.getElementById("mapContainer").getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        selectedMarker.data.x = Math.max(0, Math.min(100, x));
        selectedMarker.data.y = Math.max(0, Math.min(100, y));
        
        // Optimize: Only update inline styles and redraw routes, don't recreate all DOM nodes
        selectedMarker.el.style.left = selectedMarker.data.x + "%";
        selectedMarker.el.style.top = selectedMarker.data.y + "%";
        const svgLayer = document.getElementById("mapRoutes");
        if (svgLayer) renderRoutes(svgLayer);
    } else if (isDraggingMap) {
        originX += e.clientX - dragStartX;
        originY += e.clientY - dragStartY;
        dragStartX = e.clientX; 
        dragStartY = e.clientY;
        applyZoom();
    }
});

document.addEventListener("mouseup", async () => {
    if (selectedMarker) {
        selectedMarker = null;
        await syncDB();
    }
    isDraggingMap = false;
});

document.getElementById("mapWrapper").addEventListener("click", (e) => {
    if (!addMode || isDraggingMap) return;
    if (e.target.closest('.marker')) return;
    const rect = document.getElementById("mapContainer").getBoundingClientRect();
    tempX = ((e.clientX - rect.left) / rect.width) * 100;
    tempY = ((e.clientY - rect.top) / rect.height) * 100;

    if (tempX >= 0 && tempX <= 100 && tempY >= 0 && tempY <= 100) {
        openCreatePopup();
    }
});

function openCreatePopup() { document.getElementById("createPopup").classList.remove("hidden"); }
function closeCreatePopup() { document.getElementById("createPopup").classList.add("hidden"); }

function openPopup(loc) {
    currentLocation = loc;
    document.getElementById("popupTitle").innerText = loc.name;
    document.getElementById("popupDesc").innerText = loc.desc;
    const tag = document.getElementById("popupTag");
    tag.innerText = loc.type;
    tag.style.color = getDynamicColor(loc.type);

    const charBox = document.getElementById("popupCharacters");
    if (charBox) {
        charBox.innerHTML = "";
        let foundChars = [];
        if (window.parent && window.parent.characters) {
            foundChars = window.parent.characters.filter(c => String(c.location || "").trim() === loc.name.trim());
        }
        
        if (foundChars.length > 0) {
            foundChars.forEach(c => {
                let imgSrc = c.img || "https://i.imgur.com/6X8FQyA.png";
                if (!imgSrc.startsWith("http") && !imgSrc.startsWith("data:") && typeof window.parent.getImage === "function") {
                    imgSrc = "https://i.imgur.com/6X8FQyA.png";
                }
                charBox.innerHTML += `<img src="${imgSrc}" class="present-char-avatar" title="${c.name}" onclick="if(window.parent && window.parent.openProfile) window.parent.openProfile('${c.id}')">`;
            });
            
            foundChars.forEach(async c => {
                if (c.img && !c.img.startsWith("http") && !c.img.startsWith("data:") && typeof window.parent.getImage === "function") {
                    try {
                        let url = await window.parent.getImage(c.img);
                        if(url) {
                            const imgs = charBox.querySelectorAll('img');
                            const targetImg = Array.from(imgs).find(i => i.title === c.name);
                            if(targetImg) targetImg.src = url;
                        }
                    } catch(e){}
                }
            });
        } else {
            charBox.innerHTML = `<div class="empty-chars-msg">Không có ai ở đây</div>`;
        }
    }

    document.getElementById("mapPopup").classList.remove("hidden");
    renderMap();
}

function closePopup() { 
    currentLocation = null;
    document.getElementById("mapPopup").classList.add("hidden");
    
    // Reset Edit Mode if it was open
    document.getElementById("popupViewMode").classList.remove("hidden");
    document.getElementById("popupEditMode").classList.add("hidden");
    document.getElementById("btnToggleEdit").innerHTML = '<i class="fa-solid fa-pen"></i>';
    
    renderMap();
}

function toggleEditLocation() {
    const viewMode = document.getElementById("popupViewMode");
    const editMode = document.getElementById("popupEditMode");
    const btn = document.getElementById("btnToggleEdit");
    
    if (editMode.classList.contains("hidden")) {
        // Chuyển sang Edit Mode
        viewMode.classList.add("hidden");
        editMode.classList.remove("hidden");
        btn.innerHTML = '<i class="fa-solid fa-rotate-left"></i>';
        
        document.getElementById("editLocName").value = currentLocation.name;
        document.getElementById("editLocType").value = currentLocation.type || "";
        document.getElementById("editLocDesc").value = currentLocation.desc || "";
    } else {
        // Hủy Edit Mode
        viewMode.classList.remove("hidden");
        editMode.classList.add("hidden");
        btn.innerHTML = '<i class="fa-solid fa-pen"></i>';
    }
}

async function saveEditLocation() {
    if (!currentLocation) return;
    const newName = document.getElementById("editLocName").value.trim();
    if (!newName) {
        if(typeof showToast === "function") showToast("Tên địa điểm không được để trống!", "warning");
        return;
    }
    
    currentLocation.name = newName;
    currentLocation.type = document.getElementById("editLocType").value.trim() || "Địa điểm";
    currentLocation.desc = document.getElementById("editLocDesc").value.trim();
    
    await syncDB();
    toggleEditLocation();
    openPopup(currentLocation); // Nạp lại dữ liệu mới vào view mode
    if(typeof showToast === "function") showToast("Đã cập nhật địa điểm!", "success");
}

function getDynamicColor(str) {
    let hash = 0;
    for (let i = 0; i < (str || "").length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash % 360)}, 70%, 60%)`;
}

function zoomIn() { scale *= 1.2; applyZoom(); }
function zoomOut() { scale *= 0.8; applyZoom(); }
function resetZoom() { scale = 1; originX = 0; originY = 0; applyZoom(); }

async function manualSave() {
    const saveBtn = document.getElementById("saveBtn");
    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Đang lưu...";
        }
        await syncDB();
        if (typeof showToast === "function") showToast("Đã lưu dữ liệu!");
    } catch (error) {
        if (typeof showToast === "function") showToast("Lỗi lưu dữ liệu!");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Lưu thay đổi";
        }
    }
}

document.getElementById("mapUpload").onchange = async (e) => {
    if (!currentMap) return;
    const file = e.target.files[0];
    if (file && typeof saveImage === "function") {
        const key = `img_${currentMap.id}`;
        await saveImage(key, file);
        currentMap.image = key;
        const mapImg = document.getElementById("mapImage");
        if (mapImg) mapImg.src = URL.createObjectURL(file);
        await syncDB();
    }
};
