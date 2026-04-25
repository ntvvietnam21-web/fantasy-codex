function getAllEntities() {
    return [...(window.kingdoms || []), ...(window.factions || [])];
}

function getCurrentEditingId(containerId) {
    if (containerId === 'kingdomDiplomacyList' && window.kingdoms?.[editingKingdom]) {
        return window.kingdoms[editingKingdom].id;
    }
    if (containerId === 'factionDiplomacyList' && window.factions?.[editingFaction]) {
        return window.factions[editingFaction].id;
    }
    return "";
}

function addRelationRow(containerId, data = { targetId: '', label: '' }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentEditingId = getCurrentEditingId(containerId);
    const kingdoms = window.kingdoms || [];
    const factions = window.factions || [];

    let options = `<option value="">-- Chọn đối tác --</option>`;

    if (kingdoms.length) {
        options += `<optgroup label="Vương quốc">`;
        options += kingdoms
            .filter(k => k.id !== currentEditingId)
            .map(k => `<option value="${k.id}" ${k.id === data.targetId ? 'selected' : ''}>${k.name}</option>`)
            .join('');
        options += `</optgroup>`;
    }

    if (factions.length) {
        options += `<optgroup label="Phe phái">`;
        options += factions
            .filter(f => f.id !== currentEditingId)
            .map(f => `<option value="${f.id}" ${f.id === data.targetId ? 'selected' : ''}>${f.name}</option>`)
            .join('');
        options += `</optgroup>`;
    }

    const row = document.createElement('div');
    row.className = 'relation-row fade-in';

    row.innerHTML = `
        <select class="rel-target-select">${options}</select>
        <input class="rel-label-input" type="text"
            placeholder="Quan hệ (VD: Đồng minh / Thù địch)"
            value="${data.label}">
        <button type="button" class="rel-delete-btn">
            <i class="fa fa-trash"></i>
        </button>
    `;

    row.querySelector('.rel-delete-btn').onclick = () => row.remove();

    container.appendChild(row);
}


function getDiplomacyDataFromUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];

    const relations = [];

    container.querySelectorAll('.relation-row').forEach(row => {
        const targetId = row.querySelector('.rel-target-select')?.value;
        const label = row.querySelector('.rel-label-input')?.value.trim();

        if (!targetId || !label) return;

        // tránh trùng
        if (!relations.some(r => r.targetId === targetId)) {
            relations.push({ targetId, label });
        }
    });

    return relations;
}

function renderDiplomacyTags(targetElementId, relations) {
    const container = document.getElementById(targetElementId);
    if (!container) return;

    const all = getAllEntities();
    const map = new Map(all.map(e => [e.id, e]));

    const valid = (relations || []).filter(r => map.has(r.targetId));

    if (!valid.length) {
        container.innerHTML = `<span class="no-relation-msg">Chưa có bang giao chính thức.</span>`;
        return;
    }

    container.innerHTML = valid.map(rel => {
        const target = map.get(rel.targetId);
        const label = rel.label.toLowerCase();

        let type = "neutral";
        if (/(thù|chiến|địch)/.test(label)) type = "hostile";
        if (/(minh|bạn|hòa)/.test(label)) type = "friendly";

        return `
        <div class="rel-tag tag-${type}" data-id="${rel.targetId}">
            <small>${rel.label}</small>
            <b>${target?.name || "???"}</b>
        </div>`;
    }).join('');

    // event delegation (tốt hơn onclick inline)
    container.onclick = (e) => {
        const tag = e.target.closest('.rel-tag');
        if (tag) quickViewEntity(tag.dataset.id);
    };
}


async function renderDiplomacyNetwork(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const all = getAllEntities();
    const map = new Map(all.map(e => [e.id, e]));
    const dataList = type === 'kingdom' ? window.kingdoms : window.factions;

    if (!dataList?.length) {
        container.innerHTML = `<div class="empty-msg"><i class="fa-solid fa-ghost fa-2x"></i><br>Hệ thống trống</div>`;
        return;
    }

    const elements = [];
    const addedNodes = new Set();

    dataList.forEach(item => {
        item.diplomacy?.forEach(rel => {
            const target = map.get(rel.targetId);
            if (!target) return;

            if (!addedNodes.has(item.id)) {
                elements.push({ data: { id: item.id, label: item.name.toUpperCase() } });
                addedNodes.add(item.id);
            }
            if (!addedNodes.has(target.id)) {
                elements.push({ data: { id: target.id, label: target.name.toUpperCase() } });
                addedNodes.add(target.id);
            }

            let relType = "neutral";
            const l = rel.label.toLowerCase();
            if (/(minh|bạn|hòa)/.test(l)) relType = "ally";
            if (/(thù|chiến|địch)/.test(l)) relType = "enemy";

            elements.push({
                data: {
                    id: `${item.id}-${target.id}`,
                    source: item.id,
                    target: target.id,
                    label: rel.label,
                    type: relType
                }
            });
        });
    });

    if (!elements.length) {
        container.innerHTML = `<div class="empty-msg">Chưa ghi nhận bang giao</div>`;
        return;
    }

    container.innerHTML = `<div id="${containerId}-cyto" class="cyto-map"></div>`;

    const cy = cytoscape({
        container: document.getElementById(`${containerId}-cyto`),
        elements: elements,
        style: [
            {
                selector: 'node',
                style: {
                    'width': 50,
                    'height': 50,
                    'background-color': '#0f0f1a',
                    'border-width': 2,
                    'border-color': '#d4af37',
                    'label': 'data(label)',
                    'color': '#fff',
                    'font-size': '10px',
                    'font-family': 'Cinzel, serif',
                    'text-valign': 'bottom',
                    'text-margin-y': 8,
                    'text-max-width': '80px',
                    'text-wrap': 'wrap',
                    'font-weight': 'bold',
                    'text-outline-width': 2,
                    'text-outline-color': '#0f0f1a'
                }
            },
            {
                selector: 'edge',
                style: {
                    'curve-style': 'bezier',
                    'width': 2,
                    'line-color': '#444',
                    'target-arrow-color': '#444',
                    'target-arrow-shape': 'vee',
                    'arrow-scale': 1.2,
                    'label': 'data(label)',
                    'font-size': '9px',
                    'color': '#aaa',
                    'text-rotation': 'autorotate',
                    'text-background-opacity': 1,
                    'text-background-color': '#0f0f1a',
                    'text-background-padding': '3px',
                    'opacity': 0.8
                }
            },
            {
                selector: 'edge[type="ally"]',
                style: {
                    'line-color': '#10b981',
                    'target-arrow-color': '#10b981',
                    'width': 3,
                    'line-style': 'dashed'
                }
            },
            {
                selector: 'edge[type="enemy"]',
                style: {
                    'line-color': '#ef4444',
                    'target-arrow-color': '#ef4444',
                    'width': 3
                }
            },
            {
                selector: 'edge[type="neutral"]',
                style: { 'line-color': '#fbbf24', 'target-arrow-color': '#fbbf24' }
            },
            // Hiệu ứng khi nhấn vào node
            {
                selector: 'node:active',
                style: { 'border-color': '#fff', 'border-width': 4 }
            }
        ],
        layout: {
            name: 'cose',
            animate: true,
            refresh: 20,
            fit: true,
            padding: 50,
            nodeOverlap: 20,
            nodeRepulsion: 10000
        }
    });

    // Sự kiện tương tác chuyên nghiệp
    cy.on('mouseover', 'node', (e) => {
        container.style.cursor = 'pointer';
        e.target.connectedEdges().animate({ style: { 'width': 5, 'opacity': 1 } }, { duration: 200 });
    });

    cy.on('mouseout', 'node', (e) => {
        container.style.cursor = 'default';
        e.target.connectedEdges().animate({ style: { 'width': 2, 'opacity': 0.8 } }, { duration: 200 });
    });

    cy.on('tap', 'node', (evt) => quickViewEntity(evt.target.id()));

    window.cyInstance = cy;
}





function toggleSubmenu(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('hidden');
    el.previousElementSibling?.classList.toggle('active');
}

function quickViewEntity(id) {
    if (!id) return;

    if (id.startsWith('k_')) {
        const i = window.kingdoms.findIndex(k => k.id === id);
        if (i !== -1) openKingdomPage?.(i);
    }

    if (id.startsWith('f_')) {
        const i = window.factions.findIndex(f => f.id === id);
        if (i !== -1) openFactionPage?.(i);
    }
}
