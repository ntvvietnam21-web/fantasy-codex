window.kingdoms = window.kingdoms || [];
let editingKingdom = -1;
let currentStructure = [];
function updateKingdomCount() {
    const el = document.getElementById("kingdomCount");
    if (el && window.kingdoms) el.innerText = window.kingdoms.length;
}
async function renderKingdoms() {
    const list = document.getElementById("kingdomList");
    if (!list) return;
    list.innerHTML = "";
    const allChars = window.characters || [];
    const countMap = {};
    allChars.forEach(c => {
        if (!countMap[c.kingdom]) countMap[c.kingdom] = 0;
        countMap[c.kingdom]++;
    });

    const fragment = document.createDocumentFragment();

    window.kingdoms.forEach((k, i) => {
        const members = countMap[k.id] || 0;
        const card = document.createElement("div");
        card.className = "card";
        
        // GM: Thêm onclick="openImageViewer('${k.img || ''}')" vào thẻ img
        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
              <img id="kingdom-img-${k.id}" 
                   src="https://i.imgur.com/6X8FQyA.png" 
                   onclick="openImageViewer('${k.img || ''}')" 
                   style="width:40px;height:40px;object-fit:cover;border-radius:8px;cursor:pointer;"
                   title="Click để phóng to">
              <h3 onclick="openKingdomPage(${i})" style="cursor:pointer">${k.name}</h3>
            </div>
            <p style="font-size:13px; margin: 5px 0;">Lãnh đạo: ${k.leader || "-"}</p>
            <p style="font-size:13px;"><b>Thành viên:</b> <span class="accent">${members}</span></p>
            <div class="race-buttons" style="margin-top:10px;">
              <button onclick="editKingdom(${i})">Sửa</button>
              <button onclick="deleteKingdom(${i})" style="background:rgba(248,113,113,0.2); color:#f87171;">Xóa</button>
            </div>`;
        fragment.appendChild(card);
    });
    
    list.appendChild(fragment);

    // Nạp ảnh từ IndexedDB sau khi UI đã hiển thị
    for (const k of window.kingdoms) {
        if (k.img) {
            const imgEl = document.getElementById("kingdom-img-" + k.id);
            if (imgEl) {
                // Nếu là link web thì gán luôn, nếu là key thì đi lấy từ DB
                if (k.img.startsWith("http") || k.img.startsWith("data:")) {
                    imgEl.src = k.img;
                } else if (typeof getImage === "function") {
                    const src = await getImage(k.img);
                    if (src) imgEl.src = src;
                }
            }
        }
    }

    if (typeof updateKingdomCount === "function") updateKingdomCount();
}
async function saveKingdom() {
    const val = id => document.getElementById(id)?.value.trim() || "";
    const isNew = editingKingdom === -1;
    const id = isNew ? ("k_" + Date.now()) : window.kingdoms[editingKingdom].id;
    let img = isNew ? "" : (window.kingdoms[editingKingdom].img || "");
    const fileInput = document.getElementById("kingdomImgInput");
    const file = fileInput?.files?.[0];
    
    const kingdomName = val("kingdomName");
    if (!kingdomName) { 
        if (typeof showToast === "function") {
            showToast("⚠️ Vui lòng nhập tên đế chế!", "warning");
        } else {
            alert("Vui lòng nhập tên đế chế!");
        }
        return; 
    }

    if (file) {
        try {
            await saveImage(id, file); 
            img = id; 
        } catch (err) {
            console.error("❌ GM: Lỗi lưu ảnh vào DB:", err);
            if (typeof showToast === "function") showToast("❌ Lỗi lưu trữ hình ảnh!", "error");
        }
    }

    const diplomacy = typeof getDiplomacyDataFromUI === "function" ? 
                        getDiplomacyDataFromUI('kingdomDiplomacyList') : [];

    const obj = {
        id,
        name: kingdomName,
        leader: val("kingdomLeader"),
        race: val("kingdomRace"),
        img: img,
        continent: val("kingdomContinent"),
        capital: val("kingdomCapital"),
        population: val("kingdomPopulation"),
        army: val("kingdomArmy"),
        government: val("kingdomGovernment"),
        religion: val("kingdomReligion"), // Đã bổ sung
        founded: val("kingdomFounded"),
        diplomacy: diplomacy, 
        desc: val("kingdomDesc"),
        structure: JSON.parse(JSON.stringify(currentStructure))
    };
    
    try {
        if (isNew) {
            window.kingdoms.push(obj);
        } else {
            window.kingdoms[editingKingdom] = obj;
        }

        if (typeof dbSave === "function") {
            await dbSave("kingdoms", window.kingdoms);
        }

        if (fileInput) fileInput.value = ""; 
        
        if (typeof renderKingdoms === "function") {
            await renderKingdoms();
        }
        
        if (typeof updateKingdomOptions === "function") {
            updateKingdomOptions();
        }

        if (typeof renderDiplomacyNetwork === "function") {
            renderDiplomacyNetwork('kingdom', 'kingdomNetworkCanvas');
        }

        closeKingdomModal();

        if (typeof showToast === "function") {
            showToast(`✅ Đã ${isNew ? 'khởi tạo' : 'cập nhật'} đế chế [${obj.name}]`, "success");
        }

    } catch (err) {
        console.error("❌ Critical Save Error:", err);
        if (typeof showToast === "function") showToast("❌ Lỗi hệ thống khi lưu vương quốc!", "error");
    }
}
async function editKingdom(i) {
  let k = window.kingdoms[i];
  if (!k) return;
  
  editingKingdom = i;
  const setV = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  setV("kingdomName", k.name);
  setV("kingdomLeader", k.leader);
  setV("kingdomRace", k.race);
  setV("kingdomContinent", k.continent);
  setV("kingdomCapital", k.capital);
  setV("kingdomPopulation", k.population);
  setV("kingdomArmy", k.army);
  setV("kingdomGovernment", k.government);
  setV("kingdomReligion", k.religion); // Đã bổ sung
  setV("kingdomFounded", k.founded);
  setV("kingdomDesc", k.desc);

  const dipContainer = document.getElementById('kingdomDiplomacyList');
  if (dipContainer) {
    dipContainer.innerHTML = "";
    if (k.diplomacy && Array.isArray(k.diplomacy)) {
        k.diplomacy.forEach(rel => {
            if (typeof addRelationRow === "function") {
                addRelationRow('kingdomDiplomacyList', rel);
            }
        });
    }
  }

  currentStructure = k.structure ? JSON.parse(JSON.stringify(k.structure)) : [];
  
  if (typeof renderStructureAdmin === "function") {
    renderStructureAdmin();
  }

  const preview = document.getElementById("kingdomImgPreview");
  if (preview) {
    if (k.img) {
      if (k.img.startsWith("http")) {
        preview.src = k.img;
      } else {
        const src = await getImage(k.img);
        preview.src = src || "https://i.imgur.com/6X8FQyA.png";
      }
    } else {
      preview.src = "https://i.imgur.com/6X8FQyA.png";
    }
  }

  openKingdomModal();
}
function addNewTab(name = "") {
    const tabName = name || prompt("Nhập tên bộ phận (VD: Hoàng gia, Quân đội):");
    if (!tabName) return;
    const tabId = "tab_" + Date.now();
    currentStructure.push({ id: tabId, name: tabName, roles: [] });
    renderStructureAdmin();
}
function addNewRole(tabId) {
    const tab = currentStructure.find(t => t.id === tabId);
    if (tab) {
        tab.roles.push({ id: "role_" + Date.now(), title: "", memberId: "" });
        renderStructureAdmin();
    }
}
function renderStructureAdmin() {
    const container = document.getElementById('kingdomStructureAdmin');
    if (!container) return;
    const allChars = window.characters || [];

    // 1. Đổ cấu trúc HTML vào container trước
    container.innerHTML = currentStructure.map((tab, tIdx) => `
        <div class="admin-tab-group" style="border: 1px solid var(--border); padding: 12px; margin-bottom: 20px; border-radius: 10px; background: rgba(0,0,0,0.15);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                <b style="color:var(--gold); font-size: 14px;">
                    <i class="fas fa-sitemap" style="margin-right:5px;"></i>${tab.name}
                </b>
                <div>
                    <button type="button" onclick="addChildRole('${tab.id}')" 
                            style="font-size:10px; padding:3px 10px; background:var(--primary); color:white; border:none; border-radius:4px; cursor:pointer;">
                        + Thêm Gốc
                    </button>
                    <button type="button" onclick="if(confirm('Xóa bộ phận này?')){ currentStructure.splice(${tIdx}, 1); renderStructureAdmin(); }" 
                            style="background:none; border:none; color:#f87171; cursor:pointer; margin-left:12px; font-size: 16px;">
                        &times;
                    </button>
                </div>
            </div>
            <div class="tab-tree-root">
                ${tab.treeNodes && tab.treeNodes.length > 0 
                    ? tab.treeNodes.map(node => renderNodeEditor(node, allChars)).join('') 
                    : '<p style="font-size:11px; opacity:0.3; text-align:center; padding:10px;">Chưa có sơ đồ nhân sự.</p>'}
            </div>
        </div>
    `).join('');

    // 2. Sau khi innerHTML đã chạy xong, kích hoạt logic nạp ảnh cho từng node
    // Logic này sẽ tìm các thẻ img có ID preview tương ứng đã được renderNodeEditor tạo ra
    const processNodeImages = async (nodes) => {
        for (const node of nodes) {
            const char = allChars.find(c => String(c.id) === String(node.memberId));
            if (char && char.img) {
                const imgEl = document.querySelector(`#preview-node-${node.id} img`);
                if (imgEl) {
                    if (char.img.startsWith("http") || char.img.startsWith("data:")) {
                        imgEl.src = char.img;
                    } else if (typeof getImage === "function") {
                        const src = await getImage(char.img);
                        if (src) imgEl.src = src;
                    }
                }
            }
            if (node.children) await processNodeImages(node.children);
        }
    };

    currentStructure.forEach(tab => {
        if (tab.treeNodes) processNodeImages(tab.treeNodes);
    });
}
function renderNodeEditor(node, allChars) {
    const char = allChars.find(c => String(c.id) === String(node.memberId));
    const previewId = `node-img-${node.id}`;
    const fallbackImg = "https://i.imgur.com/6X8FQyA.png";

    // 1. Xác định ID của vương quốc đang chỉnh sửa
    const currentKingdomId = editingKingdom !== -1 ? window.kingdoms[editingKingdom].id : null;

    // 2. Lọc danh sách: Chỉ lấy nhân vật thuộc vương quốc này 
    // hoặc nhân vật đang được chọn ở node hiện tại (để tránh mất dữ liệu cũ)
    const filteredChars = allChars.filter(c => 
        String(c.kingdom) === String(currentKingdomId) || String(c.id) === String(node.memberId)
    );

    setTimeout(async () => {
        const imgEl = document.getElementById(previewId);
        if (!imgEl) return;

        if (char && char.img) {
            if (char.img.startsWith("http") || char.img.startsWith("data:")) {
                imgEl.src = char.img;
            } else if (typeof getImage === "function") {
                const src = await getImage(char.img);
                if (src) imgEl.src = src;
            }
        }
    }, 0);

    return `
        <div class="node-edit-row" style="margin-left: 15px; border-left: 1px solid #334155; padding-left: 10px; margin-top: 8px;">
            <div style="display:flex; gap:8px; align-items:center; background: rgba(255,255,255,0.03); padding: 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="width:28px; height:28px; border-radius:4px; overflow:hidden; border:1px solid #444; flex-shrink:0; background:#000;">
                    <img id="${previewId}" src="${fallbackImg}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                
                <input type="text" value="${node.title || ''}" 
                       oninput="const n = findNodeById(currentStructure, '${node.id}'); if(n) n.title = this.value;" 
                       placeholder="Chức vụ" 
                       style="width:90px; font-size:11px; padding:3px; background:#020617; border:1px solid #334155; color:#fbbf24; border-radius:4px;">
                
                <select onchange="const n = findNodeById(currentStructure, '${node.id}'); if(n) { n.memberId = this.value; renderStructureAdmin(); }" 
                        style="width:110px; font-size:11px; padding:3px; background:#020617; border:1px solid #334155; color:#fff; border-radius:4px;">
                    <option value="">-- Trống --</option>
                    ${/* Sử dụng danh sách filteredChars đã lọc thay vì allChars */
                      filteredChars.map(c => `<option value="${c.id}" ${node.memberId == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>

                <div style="display:flex; gap:4px; margin-left: auto;">
                    <button type="button" onclick="addChildRole('${node.id}')" title="Thêm cấp dưới" style="background:rgba(16,185,129,0.1); border:none; color:#10b981; font-weight:bold; cursor:pointer; padding:2px 6px; border-radius:4px;">+</button>
                    <button type="button" onclick="removeRole('${node.id}')" title="Xóa" style="background:rgba(239,68,68,0.1); border:none; color:#ef4444; cursor:pointer; padding:2px 6px; border-radius:4px;">×</button>
                </div>
            </div>
            <div class="node-children">
                ${node.children ? node.children.map(c => renderNodeEditor(c, allChars)).join('') : ''}
            </div>
        </div>`;
}
function findNodeById(structure, id) {
    for (let tab of structure) {
        const search = (nodes) => {
            for (let n of nodes) {
                if (n.id === id) return n;
                if (n.children) {
                    const found = search(n.children);
                    if (found) return found;
                }
            }
            return null;
        };
        const res = search(tab.treeNodes || []);
        if (res) return res;
    }
    return null;
}
async function deleteKingdom(i) {
  if (!confirm("Xóa đế chế này?")) return;
  const k = window.kingdoms[i];
  
  if (k.img) {
      await deleteImage(k.img); // Xóa ảnh trong Store 'images'
  }

  window.kingdoms.splice(i, 1);
  
  // 🔥 Cập nhật lại Store 'kingdoms'
  await dbSave("kingdoms", window.kingdoms);
  
  await renderKingdoms();
  updateKingdomOptions();
}
function openKingdomModal(){
document.getElementById("kingdomModal").style.display="flex";
}
function closeKingdomModal(){
document.getElementById("kingdomModal").style.display="none";
resetKingdomForm();
}
function resetKingdomForm() {
  editingKingdom = -1;
  currentStructure = [];
  const clearV = (id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  };

  const fields = [
    "kingdomName", "kingdomLeader", "kingdomRace", "kingdomContinent", 
    "kingdomDesc", "kingdomCapital", 
    "kingdomPopulation", "kingdomArmy", "kingdomGovernment", 
    "kingdomReligion", "kingdomFounded"
  ];
  
  fields.forEach(clearV);

  const dipContainer = document.getElementById('kingdomDiplomacyList');
  if (dipContainer) dipContainer.innerHTML = "";

  const adminContainer = document.getElementById('kingdomStructureAdmin');
  if (adminContainer) adminContainer.innerHTML = "";

  const preview = document.getElementById("kingdomImgPreview");
  if (preview) preview.src = "";

  const input = document.getElementById("kingdomImgInput");
  if (input) input.value = "";
}
function updateKingdomOptions() {
    let select = document.getElementById("charKingdom");
    if (!select) return;

    select.innerHTML = "";
    const data = (window.kingdoms && Array.isArray(window.kingdoms)) ? window.kingdoms : [];

    if (data.length === 0) {
        let option = document.createElement("option");
        option.value = "";
        option.textContent = "Chưa có đế chế";
        select.appendChild(option);
        return;
    }

    // Thêm option mặc định để không bị trống
    let defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "-- Chọn đế chế --";
    select.appendChild(defaultOpt);

    // Bây giờ .forEach sẽ an toàn 100%
    data.forEach(k => {
        if (k && k.id) { // Kiểm tra đối tượng k tồn tại
            let option = document.createElement("option");
            option.value = k.id;
            option.textContent = k.name || "Không tên";
            select.appendChild(option);
        }
    });
}
async function openKingdomPage(i) {
    let k;
    if (typeof i === 'string' && i.startsWith('k_')) {
        k = window.kingdoms.find(item => item.id === i);
    } else {
        k = window.kingdoms ? window.kingdoms[i] : null;
    }
    
    if (!k) return;

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value || "-";
    };

    // 1. Thông tin văn bản
    const fields = ["Name", "Leader", "Race", "Continent", "Capital", "Population", "Army", "Government", "Religion", "Founded", "Desc"];
    fields.forEach(f => setText("kingdomPage" + f, k[f.toLowerCase()]));

    // 2. Logo Vương Quốc (Xử lý DB)
    const logoEl = document.getElementById("kingdomPageLogoMini");
    if (logoEl) {
        const fallback = "https://i.imgur.com/6X8FQyA.png";
        logoEl.src = fallback; // Set tạm ảnh mặc định
        if (k.img) {
            if (k.img.startsWith("http") || k.img.startsWith("data:")) {
                logoEl.src = k.img;
            } else if (typeof getImage === "function") {
                const dbSrc = await getImage(k.img);
                if (dbSrc) logoEl.src = dbSrc;
            }
        }
    }

    // 3. Ngoại giao
    if (typeof renderDiplomacyTags === "function") {
        renderDiplomacyTags("kingdomPageRelations", k.diplomacy || []);
    }

    // 4. Tabs & Sơ đồ bộ máy
    const tabHeader = document.getElementById("kingdomTabHeader");
    const tabContent = document.getElementById("kingdomTabContent");
    
    if (tabHeader && tabContent) {
        tabHeader.innerHTML = ""; 
        if (!k.structure || k.structure.length === 0) {
            tabContent.innerHTML = `<p class="empty-msg" style="padding:40px; opacity:0.5; text-align:center;">Chưa có dữ liệu bộ máy.</p>`;
        } else {
            // Tạo các tab bộ phận
            for (let idx = 0; idx < k.structure.length; idx++) {
                const tab = k.structure[idx];
                const btn = document.createElement("button");
                btn.className = `tab-btn ${idx === 0 ? 'active' : ''}`;
                btn.innerText = tab.name;
                
                btn.onclick = async () => {
                    tabHeader.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    if (typeof displayTabRoles === "function") await displayTabRoles(tab);
                };
                tabHeader.appendChild(btn);
            }

            // Hiển thị tab đầu tiên mặc định
            if (typeof displayTabRoles === "function") {
                await displayTabRoles(k.structure[0]);
            }
        }
    }

    // 5. Cư dân
    const allChars = window.characters || [];
    const members = allChars.filter(c => String(c.kingdom) === String(k.id));
    if (typeof renderKingdomMembersList === "function") {
        renderKingdomMembersList(members);
    }

    // 6. Chuyển trang
    if (typeof showPage === "function") showPage("kingdomPage");
}
async function displayTabRoles(tab) {
    const content = document.getElementById("kingdomTabContent");
    if (!tab || !content) return;
    
    let mermaidConfig = `graph TD\n`;
    const allChars = window.characters || [];
    const nodesToLoad = []; // Lưu danh sách để nạp ảnh sau

    // 1. Hàm xây dựng cấu trúc sơ đồ (Chạy nhanh, chưa lấy ảnh từ DB ngay)
    const buildTree = (node, parentId = null) => {
        const char = allChars.find(c => String(c.id) === String(node.memberId));
        const charName = char ? char.name : "Trống";
        const nodeId = `mermaid_node_${node.id}`;
        
        // Dùng ảnh mặc định làm placeholder
        let initialImg = "https://i.imgur.com/6X8FQyA.png";
        
        // Nếu là URL trực tiếp thì nạp luôn
        if (char && char.img && (char.img.startsWith("http") || char.img.startsWith("data:"))) {
            initialImg = char.img;
        } else if (char && char.img) {
            // Nếu là ảnh từ DB, lưu lại để nạp sau
            nodesToLoad.push({ domId: nodeId, imgKey: char.img });
        }

        const nodeHTML = `"<div class='role-node-mini clickable-node' data-char-id='${char ? char.id : ''}' id='${nodeId}'>
            <div class='role-img-mini'><img src='${initialImg}' class='node-avatar'></div>
            <div class='role-info-mini'>
                <div class='title'>${(node.title || 'CHỨC VỤ').toUpperCase()}</div>
                <div class='name'>${charName}</div>
            </div>
        </div>"`;

        mermaidConfig += `  ${node.id}[${nodeHTML}]\n`;
        if (parentId) mermaidConfig += `  ${parentId} --> ${node.id}\n`;

        if (node.children) {
            for (let child of node.children) {
                buildTree(child, node.id);
            }
        }
    };

    if (tab.treeNodes && tab.treeNodes.length > 0) {
        for (let rootNode of tab.treeNodes) {
            buildTree(rootNode);
        }
    } else {
        content.innerHTML = "<p style='font-size:12px; opacity:0.5; padding:20px;'>Chưa có sơ đồ bộ máy.</p>";
        return;
    }

    // 2. Render Mermaid khung trước
    content.innerHTML = `<div class="mermaid">${mermaidConfig}</div>`;

    if (window.mermaid) {
        try {
            mermaid.initialize({ 
                startOnLoad: false, 
                theme: 'dark', 
                securityLevel: 'loose',
                flowchart: { nodeSpacing: 30, rankSpacing: 40, htmlLabels: true } 
            });

            await mermaid.run({ nodes: [content.querySelector('.mermaid')] });

            // 3. SAU KHI VẼ XONG: Nạp ảnh từ imageDB vào các node tương ứng
            for (const item of nodesToLoad) {
                if (typeof getImage === "function") {
                    getImage(item.imgKey).then(src => {
                        if (src) {
                            const imgEl = document.querySelector(`#${item.domId} .node-avatar`);
                            if (imgEl) imgEl.src = src;
                        }
                    });
                }
            }

            // 4. Gán sự kiện click
            content.querySelectorAll('.clickable-node').forEach(el => {
                el.onclick = function() {
                    const cid = this.getAttribute('data-char-id');
                    if (cid && typeof openProfile === 'function') {
                        openProfile(cid);
                        if (typeof showPage === 'function') showPage("characterPage");
                    }
                };
            });
        } catch (err) {
            console.error("❌ Mermaid Render Error:", err);
            content.innerHTML = "<p style='color:red; font-size:12px;'>Lỗi hiển thị sơ đồ.</p>";
        }
    }
}
async function switchKingdomTab(btn, tabId, kingdomIdx) {
    const allButtons = document.querySelectorAll('#kingdomTabHeader .tab-btn');
    allButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const k = window.kingdoms[kingdomIdx];
    if (!k || !k.structure) return;

    const tab = k.structure.find(t => t.id === tabId);
    if (tab) {
        await displayTabRoles(tab);
    }
}
function filterRoles() {
    const input = document.getElementById("roleSearchInput");
    if (!input) return;
    const query = input.value.toLowerCase().trim();
    const nodes = document.querySelectorAll("#roleGridDisplay .role-node");
    
    nodes.forEach(node => {
        const roleMatch = node.getAttribute("data-role-name").includes(query);
        const nameMatch = node.getAttribute("data-char-name").includes(query);
        
        if (roleMatch || nameMatch) {
            node.style.display = "block";
        } else {
            node.style.display = "none";
        }
    });
}
function newKingdom(){
editingKingdom = -1;

resetKingdomForm();

openKingdomModal();

}
async function renderKingdomMembersList(chars) {
  const list = document.getElementById("kingdomCharacters");
  const pagination = document.getElementById("kingdomMemberPagination");
  const memberCountDisplay = document.getElementById("kingdomMemberCount");

  if (!list) return;
  memberCountDisplay.innerText = chars.length;
  
  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(chars.length / ITEMS_PER_PAGE);

  const renderPage = async (page) => {
    list.innerHTML = "";
    const start = (page - 1) * ITEMS_PER_PAGE;
    const pageChars = chars.slice(start, start + ITEMS_PER_PAGE);

    for (const c of pageChars) {
      const div = document.createElement("div");
      div.className = "card char-mini-card";
      div.style.cursor = "pointer";
      div.innerHTML = `
        <img class="char-img-load" src="https://i.imgur.com/6X8FQyA.png" style="width:70px;height:70px;object-fit:cover;border-radius:50%">
        <p style="margin-top:8px; font-weight:600; font-size:13px;">${c.name}</p>
      `;
      div.onclick = () => openCharacterPage(c.id);
      list.appendChild(div);

      const imgEl = div.querySelector("img");
      if (c.img) {
        if (c.img.startsWith("http")) imgEl.src = c.img;
        else imgEl.src = await getImage(c.img) || imgEl.src;
      }
    }

    pagination.innerHTML = "";
    if (totalPages > 1) {
      for (let p = 1; p <= totalPages; p++) {
        const btn = document.createElement("button");
        btn.innerText = p;
        if (p === page) btn.className = "active";
        btn.onclick = () => renderPage(p);
        pagination.appendChild(btn);
      }
    }
  };

  renderPage(1);
}
function openCharacterPage(id) {
  const chars = window.characters || [];
  const kList = window.kingdoms || [];
  const fList = window.factions || [];
  const c = chars.find(ch => String(ch.id) === String(id));
  
  if (!c) return;

  const setText = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val || "-"; };
  
  setText("charPageName", c.name);
  setText("charPageRace", c.race);
  setText("charPagePL", c.pl);
  setText("charPageGender", c.gender);
  setText("charPageAge", c.age);
  setText("charPageBirth", c.birth);
  setText("charPageLocation", c.location); 
  setText("charPageJob", c.job);
  setText("charPageStatus", c.status);
  setText("charPageDesc", c.desc);
  setText("charPageAppearance", c.appearance);
  setText("charPagePersonality", c.personality);

  // Vũ khí & Trang bị
  setText("charPageWeapon", c.equipment?.weapon);
  setText("charPageArmor", c.equipment?.armor);
  setText("charPageAccessory", c.equipment?.accessory);

  const kingdom = kList.find(k => String(k.id) === String(c.kingdom));
  setText("charPageKingdom", kingdom ? kingdom.name : "Không có");
  
  const faction = fList.find(f => String(f.id) === String(c.faction));
  setText("charPageFaction", faction ? faction.name : "Không có");

  const imgEl = document.getElementById("charPageImg");
  if (imgEl) {
    const fallback = "https://i.imgur.com/6X8FQyA.png";
    if (c.img) {
      if (c.img.startsWith("http")) {
        imgEl.src = c.img;
      } else if (typeof getImage === "function") {
        getImage(c.img).then(src => { imgEl.src = src || fallback; });
      }
    } else {
      imgEl.src = fallback;
    }
    imgEl.onclick = () => openImageViewer(c.img);
    imgEl.style.cursor = "pointer";
  }

  if (c.stats?.hidden) {
    setText("charPageTalent", c.stats.hidden.talent);
    setText("charPagePotential", c.stats.hidden.potential);
    setText("charPageFate", c.stats.hidden.fate);
  }

  if (typeof showPage === "function") showPage("characterPage");
}
function previewKingdomImg(e) {
    const file = e.target.files[0];
    const preview = document.getElementById("kingdomImgPreview");

    if (file && preview) {
        if (preview.src.startsWith('blob:')) {
            URL.revokeObjectURL(preview.src);
        }
        preview.src = URL.createObjectURL(file);
    }
}
async function openImageViewer(srcOrKey) {
    const modal = document.getElementById("imgViewerModal");
    const img = document.getElementById("imgViewer");
    if (!modal || !img || !srcOrKey) return;
    if (typeof srcOrKey === "string" && !srcOrKey.startsWith("http") && !srcOrKey.startsWith("data:")) {
        if (typeof getImage === "function") {
            const blobSrc = await getImage(srcOrKey);
            img.src = blobSrc || "https://i.imgur.com/6X8FQyA.png";
        }
    } else {
        // Nếu là link trực tiếp
        img.src = srcOrKey;
    }

    modal.style.display = "flex";
    // Thêm hiệu ứng mượt
    setTimeout(() => { modal.style.opacity = "1"; }, 10);
}
function closeImageViewer() {
    const modal = document.getElementById("imgViewerModal");
    if (modal) {
        modal.style.opacity = "0";
        setTimeout(() => {
            modal.style.display = "none";
        }, 200);
    }
}
function addNewTab() {
    const tabName = prompt("Nhập tên bộ phận (VD: Hội đồng tối cao, Quân đoàn):");
    if (!tabName) return;
    
    const newTab = {
        id: "tab_" + Date.now(),
        name: tabName,
        treeNodes: []
    };
    
    currentStructure.push(newTab);
    renderStructureAdmin();
}
function addChildRole(parentId) {
    const findAndAdd = (nodes) => {
        for (let node of nodes) {
            if (node.id === parentId) {
                node.children.push({ id: "role_" + Date.now(), title: "Chức vụ", memberId: "", children: [] });
                return true;
            }
            if (node.children && findAndAdd(node.children)) return true;
        }
        return false;
    };

    currentStructure.forEach(tab => {
        // Nếu parentId là ID của chính Tab, thêm một Node cha mới
        if (tab.id === parentId) {
            tab.treeNodes.push({ id: "role_" + Date.now(), title: "Lãnh đạo", memberId: "", children: [] });
        } else {
            findAndAdd(tab.treeNodes);
        }
    });
    renderStructureAdmin();
}
function removeRole(roleId) {
    const findAndRemove = (nodes) => {
        const idx = nodes.findIndex(n => n.id === roleId);
        if (idx !== -1) { nodes.splice(idx, 1); return true; }
        for (let n of nodes) { if (n.children && findAndRemove(n.children)) return true; }
        return false;
    };
    currentStructure.forEach(tab => findAndRemove(tab.treeNodes));
    renderStructureAdmin();
}
function addNewRole(tabId) {
    const tab = currentStructure.find(t => t.id === tabId);
    if (tab) {
        tab.roles.push({
            id: "role_" + Date.now(),
            title: "",
            memberId: ""
        });
        renderStructureAdmin();
    }
}
document.addEventListener("DOMContentLoaded", async () => {
    if (typeof reloadAllData === "function") {
        await reloadAllData();
    }
    renderKingdoms();
    updateKingdomOptions();
    const imgModal = document.getElementById("imgViewerModal");
    if (imgModal) {
        imgModal.onclick = (e) => {
            if (e.target.id === "imgViewerModal") closeImageViewer();
        };
    }
});

