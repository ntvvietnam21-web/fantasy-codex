// 🔥 Load danh sách nhóm từ localStorage
let teams = JSON.parse(localStorage.getItem("teams")) || [];

// 🔥 Hàm lưu nhóm
function saveTeams() {
    localStorage.setItem("teams", JSON.stringify(teams));
    renderTeams();
}

// 🔥 Tạo ID ngẫu nhiên
function generateId() {
    return 'team_' + Date.now() + '_' + Math.random().toString(36).slice(2);
}

// 🔥 Render nhóm ra grid
async function renderTeams() {
    const grid = document.getElementById("teamGrid");
    if (!grid) return; // Guard: tránh crash nếu element không tồn tại
    grid.innerHTML = "";

    for (let team of teams) {
        const imgUrl = team.imageKey ? await getImage(team.id) : "placeholder.png";

        const card = document.createElement("div");
        card.className = "team-card";
        card.innerHTML = `
            <img src="${imgUrl}" alt="Team Image">
            <h3>${team.name}</h3>
            <p>${team.desc || ''}</p>
            <div class="member-count">Thành viên: ${team.members.length}</div>
            <div class="team-actions">
                <button onclick="editTeam('${team.id}')">Sửa</button>
                <button onclick="deleteTeam('${team.id}')">Xoá</button>
            </div>
        `;

        // Click vào card => mở chi tiết các thành viên
        card.addEventListener("click", (e) => {
            if (e.target.tagName.toLowerCase() === 'button') return; // tránh click button
            openTeamDetail(team);
        });

        grid.appendChild(card);
    }
}

// 🔥 Modal Thêm/Sửa nhóm
function openTeamModal(team = null) {
    const modal = document.getElementById("teamModal");
    if (!modal) return; // Guard
    modal.classList.add("active");

    const title = document.getElementById("teamModalTitle");
    if (title) title.textContent = team ? "Sửa Nhóm" : "Thêm Nhóm";

    const form = document.getElementById("teamForm");
    if (!form) return; // Guard
    form.dataset.id = team ? team.id : "";

    form.teamName.value = team?.name || "";
    form.teamDesc.value = team?.desc || "";
    form.teamMembers.innerHTML = ""; // load nhân vật

    // Load danh sách nhân vật (giả sử window.characters chứa nhân vật)
    if (window.characters) {
        window.characters.forEach(ch => {
            const opt = document.createElement("option");
            opt.value = ch.id;
            opt.textContent = ch.name;
            if (team?.members.includes(ch.id)) opt.selected = true;
            form.teamMembers.appendChild(opt);
        });
    }
}

// 🔥 Submit form Thêm/Sửa nhóm
async function handleTeamFormSubmit(e) {
    e.preventDefault();
    const form = e.target;

    const id = form.dataset.id || generateId();
    const name = form.teamName.value.trim();
    const desc = form.teamDesc.value.trim();
    const members = Array.from(form.teamMembers.selectedOptions).map(opt => opt.value);

    let imageKey = null;

    const fileInput = document.getElementById("teamImage");
    if (fileInput && fileInput.files[0]) {
        // 🔥 Lưu ảnh vào imageDB.js
        imageKey = await saveImage(id, fileInput.files[0]);
    }

    const existingIndex = teams.findIndex(t => t.id === id);
    const teamData = { id, name, desc, members, imageKey };

    if (existingIndex >= 0) {
        teams[existingIndex] = { ...teams[existingIndex], ...teamData };
    } else {
        teams.push(teamData);
    }

    saveTeams();
    closeTeamModal();
}

// 🔥 Xoá nhóm
function deleteTeam(id) {
    if (!confirm("Bạn có chắc muốn xoá nhóm này?")) return;
    teams = teams.filter(t => t.id !== id);
    deleteImage(id); // xoá ảnh
    saveTeams();
}

// 🔥 Sửa nhóm
function editTeam(id) {
    const team = teams.find(t => t.id === id);
    openTeamModal(team);
}

// 🔥 Đóng modal
function closeTeamModal() {
    const modal = document.getElementById("teamModal");
    if (modal) modal.classList.remove("active");
}

// 🔥 Hiển thị chi tiết team + link nhân vật
function openTeamDetail(team) {
    let html = `<h2>${team.name}</h2><p>${team.desc}</p><ul>`;
    team.members.forEach(mid => {
        const ch = window.characters.find(c => c.id === mid);
        if (ch) html += `<li><a href="#character_${ch.id}">${ch.name}</a></li>`;
    });
    html += "</ul>";
    alert(html); // có thể đổi sang modal fancy hơn
}

// 🔥 Khởi động sau khi DOM sẵn sàng — tránh crash khi element chưa tồn tại
document.addEventListener("DOMContentLoaded", () => {
    // Gắn sự kiện cho nút Thêm nhóm
    const addTeamBtn = document.getElementById("addTeamBtn");
    if (addTeamBtn) {
        addTeamBtn.addEventListener("click", () => openTeamModal());
    }

    // Gắn submit form
    const teamForm = document.getElementById("teamForm");
    if (teamForm) {
        teamForm.addEventListener("submit", handleTeamFormSubmit);
    }

    // Gắn nút Hủy
    const cancelTeamBtn = document.getElementById("cancelTeamBtn");
    if (cancelTeamBtn) {
        cancelTeamBtn.addEventListener("click", closeTeamModal);
    }

    // Hiển thị khi load (chỉ render nếu grid tồn tại)
    if (document.getElementById("teamGrid")) {
        renderTeams();
    }
});