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
        marker.style.backgroundColor = color;
        marker.style.left = loc.x + "%";
        marker.style.top = loc.y + "%";
        
        if ((currentLocation && currentLocation.id === loc.id) || routePoints.some(p => p.id === loc.id)) {
            marker.style.boxShadow = `0 0 15px 5px ${color}`;
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
            line.setAttribute("stroke-width", "2");
            line.setAttribute("stroke-dasharray", "4,4");
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
        renderMap();
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
    document.getElementById("mapPopup").classList.remove("hidden");
    renderMap();
}

function closePopup() { 
    currentLocation = null;
    document.getElementById("mapPopup").classList.add("hidden"); 
    renderMap();
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
