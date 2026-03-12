let characters = JSON.parse(localStorage.getItem("characters")) || [];
let editingId = null;

let races = JSON.parse(localStorage.getItem("races")) || [];
let editingRace = -1;

function saveAndRefresh() {
    localStorage.setItem("characters", JSON.stringify(characters));
    render();
    renderJSONView();
    loadCompareSelect();   // thêm dòng này
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("active");
}

function showPage(id) {

    document.querySelectorAll(".page").forEach(p =>
        p.classList.add("hidden")
    );

    const page = document.getElementById(id);

    if (page) {
        page.classList.remove("hidden");
        window.scrollTo({top:0,behavior:"smooth"});
    }

    document.querySelectorAll(".nav-item").forEach(n =>
        n.classList.remove("active")
    );

    const nav = document.getElementById("nav-" + id);
    if (nav) nav.classList.add("active");

    document.getElementById("sidebar").classList.remove("active");
}

function openModal(){
    document.getElementById("characterModal").classList.add("active");
}

function closeCharacterModal(){

    document.getElementById("characterModal").classList.remove("active");

    document.getElementById("charForm").reset();

    const preview = document.getElementById("previewImg");
    preview.src="";
    preview.classList.add("hidden");

    editingId=null;

    document.getElementById("modalTitle").innerText="Thiết lập nhân vật";
}

function convertBase64(file){

    return new Promise(resolve=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.readAsDataURL(file);
    });
}


/* =========================
SAVE CHARACTER
========================= */

async function saveCharacter(){

    const name=document.getElementById("charName").value.trim();

    if(!name){
        alert("Vui lòng nhập tên nhân vật!");
        return;
    }

    let img="https://i.imgur.com/6X8FQyA.png";

    if(editingId){

        const old=characters.find(c=>c.id===editingId);
        if(old) img=old.img;
    }

    const file=document.getElementById("charImg").files[0];

    if(file){
        img=await convertBase64(file);
    }

    const obj={

        id:editingId || crypto.randomUUID(),

        name:name,

        race:document.getElementById("charRace").value.trim(),

        faction:document.getElementById("charFaction").value.trim(),
        
 pl:document.getElementById("charPL").value,
 
        appearance:document.getElementById("charAppearance").value.trim(),

        personality:document.getElementById("charPersonality").value.trim(),

        desc:document.getElementById("charDesc").value.trim(),

        img:img,

        favorite:false
    };


    if(editingId){

        const index=characters.findIndex(c=>c.id===editingId);

        obj.favorite=characters[index].favorite;

        characters[index]=obj;

    }else{

        characters.push(obj);
    }

    saveAndRefresh();

    closeCharacterModal();

    showPage("characters");
}


/* =========================
EDIT
========================= */

function editCharacter(id){

    const c=characters.find(x=>x.id===id);

    if(!c) return;

    editingId=id;

    document.getElementById("modalTitle").innerText="Chỉnh sửa: "+c.name;

    document.getElementById("charName").value=c.name;
    document.getElementById("charRace").value=c.race || "";
    document.getElementById("charFaction").value=c.faction || "";
    document.getElementById("charPL").value=c.pl || "";
    document.getElementById("charAppearance").value=c.appearance || "";
    document.getElementById("charPersonality").value=c.personality || "";
    document.getElementById("charDesc").value=c.desc || "";

    const preview=document.getElementById("previewImg");

    preview.src=c.img;
    preview.classList.remove("hidden");

    openModal();
}


/* =========================
DELETE
========================= */

function deleteCharacter(id){

    if(!confirm("Xóa nhân vật này?")) return;

    characters=characters.filter(c=>c.id!==id);

    saveAndRefresh();
}


/* =========================
FAVORITE
========================= */

function toggleFavorite(id){

    const c=characters.find(x=>x.id===id);

    if(!c) return;

    c.favorite=!c.favorite;

    saveAndRefresh();
}


/* =========================
PROFILE PAGE
========================= */

function openProfile(id){

    const c=characters.find(x=>x.id===id);

    if(!c) return;

    document.getElementById("charPageName").innerText=c.name;

    document.getElementById("charPageImg").src=c.img;

    document.getElementById("charPageRace").innerText=c.race || "-";

    document.getElementById("charPageFaction").innerText=c.faction || "-";
document.getElementById("charPagePL").innerText=c.pl || "-";
    document.getElementById("charPageDesc").innerText=c.desc || "-";

    document.getElementById("charPageAppearance").innerText=c.appearance || "-";

    document.getElementById("charPagePersonality").innerText=c.personality || "-";

    showPage("characterPage");
}


/* =========================
RENDER
========================= */
function render(data = characters) {

    const list = document.getElementById("characterList");
    if (!list) return;

    list.innerHTML = "";
    document.getElementById("charCount").innerText = data.length;

    data.forEach(c => {

        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <img src="${c.img}" class="card-img">

            <div class="card-body">
                <h3>${c.name}</h3>
<p class="race-badge">${c.race || "Unknown"}</p>
<p class="pl-badge">PL: ${c.pl || "?"}</p>

                <button class="btn-edit">Sửa</button>
                <button class="btn-delete">Xóa</button>
            </div>
        `;

        // mở profile
        card.querySelector(".card-img").onclick = () => {
            openProfile(c.id);
        };

        // sửa
        card.querySelector(".btn-edit").onclick = () => {
            editCharacter(c.id);
        };

        // xoá
        card.querySelector(".btn-delete").onclick = () => {

            if(confirm("Bạn có chắc muốn xoá?")){

                characters = characters.filter(x => x.id !== c.id);

                saveAndRefresh();
            }
        };

        list.appendChild(card);
    });
}



/* =========================
FILTER
========================= */

function applyFilters(){

    const term=(document.getElementById("searchInput").value || "").toLowerCase();

    const race=document.getElementById("raceFilter").value;

    const filtered=characters.filter(c=>{

        const name=(c.name || "").toLowerCase();

        const faction=(c.faction || "").toLowerCase();

        const raceValue=c.race || "";

        const matchName=name.includes(term) || faction.includes(term);

        const matchRace=!race || raceValue===race;

        return matchName && matchRace;
    });

    render(filtered);
}


/* =========================
JSON VIEW
========================= */

function renderJSONView(){

    const box=document.getElementById("codexContent");

    if(!box) return;

    box.innerText=JSON.stringify(characters,null,2);
}

function copyJSON(){

    navigator.clipboard.writeText(JSON.stringify(characters,null,2));

    alert("Đã copy JSON");
}


/* =========================
EXPORT
========================= */

function exportData(){

    const blob=new Blob([JSON.stringify(characters)],{type:"application/json"});

    const url=URL.createObjectURL(blob);

    const a=document.createElement("a");

    a.href=url;

    a.download="fantasy_data.json";

    a.click();
}


/* =========================
IMPORT
========================= */

function importData(e){

    const file=e.target.files[0];

    if(!file) return;

    const reader=new FileReader();

    reader.onload=(ev)=>{

        try{

            const data=JSON.parse(ev.target.result);

            if(!Array.isArray(data)) throw "invalid";
characters=data.map(c=>({

id:c.id || crypto.randomUUID(),

name:c.name || "Unknown",

race:c.race || "",

faction:c.faction || "",

pl:c.pl || "",

appearance:c.appearance || "",

personality:c.personality || "",

desc:c.desc || "",

img:c.img || "https://i.imgur.com/6X8FQyA.png",

favorite:c.favorite || false

}));
            

            saveAndRefresh();

        }catch{

            alert("File JSON không hợp lệ!");
        }
    };

    reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded",()=>{
render();
renderJSONView();
loadCompareSelect();
renderRaces();
updateRaceOptions();
document.getElementById("searchInput").addEventListener("input",applyFilters);
    document.getElementById("raceFilter").addEventListener("change",applyFilters);
// click ngoài sidebar để đóng
document.addEventListener("click", function(e){const sidebar = document.getElementById("sidebar");const menuBtn = document.querySelector(".menu-btn");if(sidebar.classList.contains("active") &&
!sidebar.contains(e.target) &&
!menuBtn.contains(e.target)){sidebar.classList.remove("active");}});
    document.getElementById("charImg").addEventListener("change",async function(){

        if(!this.files[0]) return;

        const base64=await convertBase64(this.files[0]);

        const preview=document.getElementById("previewImg");

        preview.src=base64;

        preview.classList.remove("hidden");
    });

});

function loadCompareSelect(){

const selectA = document.getElementById("compareA");
const selectB = document.getElementById("compareB");

if(!selectA || !selectB) return;

selectA.innerHTML="";
selectB.innerHTML="";

characters.forEach(char => {

const opt1=document.createElement("option");
opt1.value=char.id;
opt1.textContent=char.name;

const opt2=document.createElement("option");
opt2.value=char.id;
opt2.textContent=char.name;

selectA.appendChild(opt1);
selectB.appendChild(opt2);

});

}
function renderRaces(){
let raceList = document.getElementById("raceList");
raceList.innerHTML = "";
races.forEach((r,i)=>{
let card = document.createElement("div");
card.className = "card";
card.innerHTML = `
<div class="race-card-small">
<h3 onclick="openRacePage(${i})">${r.name}</h3>
<div class="race-buttons">
<button onclick="editRace(${i})">Sửa</button>
<button onclick="deleteRace(${i})">Xóa</button>
</div>
</div>
`;

raceList.appendChild(card);
});
document.getElementById("raceCount").textContent = races.length;
}

function compareCharacters(){
const idA = document.getElementById("compareA").value;
const idB = document.getElementById("compareB").value;

if(idA === idB){
    alert("Không thể so sánh cùng một nhân vật!");
    return;
}


const charA = characters.find(c=>c.id==idA);
const charB = characters.find(c=>c.id==idB);

if(!charA || !charB) return;

const html = `
<table class="compare-table">

<tr>
<td></td>
<td>${charA.name}</td>
<td>${charB.name}</td>
</tr>

<tr>
<td>Chủng tộc</td>
<td>${charA.race || "-"}</td>
<td>${charB.race || "-"}</td>
</tr>

<tr>
<td>Phe phái</td>
<td>${charA.faction || "-"}</td>
<td>${charB.faction || "-"}</td>
</tr>

<tr>
<td>Power Level</td>
<td style="color:${charA.pl>charB.pl?'#22c55e':'white'}">${charA.pl || "-"}</td>
<td style="color:${charB.pl>charA.pl?'#22c55e':'white'}">${charB.pl || "-"}</td>
</tr>

<tr>
<td>Tính cách</td>
<td>${charA.personality || "-"}</td>
<td>${charB.personality || "-"}</td>
</tr>

</table>
`;

document.getElementById("compareResult").innerHTML = html;

}
function openRaceModal(){

editingRace = -1;

document.getElementById("raceModal").style.display = "flex";

}function saveRace(){
let race = {
name:document.getElementById("raceName").value,
appearance:document.getElementById("raceAppearance").value,
lifespan:document.getElementById("raceLifespan").value,
skills:document.getElementById("raceSkills").value,
kingdom:document.getElementById("raceKingdom").value,
relations:document.getElementById("raceRelations").value
};
if(editingRace==-1){
races.push(race);
}else{
races[editingRace]=race;
}
localStorage.setItem("races", JSON.stringify(races));
renderRaces();
updateRaceOptions();
resetRaceForm();
closeRaceModal();
}

function editRace(i){
let r = races[i];
editingRace = i;
document.getElementById("raceName").value = r.name;
document.getElementById("raceAppearance").value = r.appearance;
document.getElementById("raceLifespan").value = r.lifespan;
document.getElementById("raceSkills").value = r.skills;
document.getElementById("raceKingdom").value = r.kingdom;
document.getElementById("raceRelations").value = r.relations;
openRaceModal();
}function deleteRace(i){
let raceName = races[i].name;
let used = characters.some(c => c.race === raceName);
if(used){
alert("Không thể xoá vì có nhân vật thuộc chủng tộc này!");
return;
}
races.splice(i,1);
localStorage.setItem("races", JSON.stringify(races));
renderRaces();
updateRaceOptions();
}

function closeRaceModal(){
document.getElementById("raceModal").style.display="none";
resetRaceForm();
editingRace=-1;
}

function openRacePage(i){
let r = races[i];
document.getElementById("racePageName").textContent = r.name;
document.getElementById("racePageAppearance").textContent = r.appearance;
document.getElementById("racePageLifespan").textContent = r.lifespan;
document.getElementById("racePageSkills").textContent = r.skills;
document.getElementById("racePageKingdom").textContent = r.kingdom;
document.getElementById("racePageRelations").textContent = r.relations;
showPage("racePage");}function updateRaceOptions(){

let select=document.getElementById("charRace");
let filter=document.getElementById("raceFilter");

if(!select || !filter) return;

select.innerHTML="";
filter.innerHTML='<option value="">Tất cả</option>';

races.forEach(r=>{
let option1=document.createElement("option");
option1.value=r.name;
option1.textContent=r.name;

let option2=document.createElement("option");
option2.value=r.name;
option2.textContent=r.name;

select.appendChild(option1);
filter.appendChild(option2);
});
}

function resetRaceForm(){

document.getElementById("raceName").value="";
document.getElementById("raceAppearance").value="";
document.getElementById("raceLifespan").value="";
document.getElementById("raceSkills").value="";
document.getElementById("raceKingdom").value="";
document.getElementById("raceRelations").value="";}
function showSuggestions(){

const text=document.getElementById("homeSearch").value.toLowerCase();

const box=document.getElementById("searchSuggestions");

box.innerHTML="";

if(!text){
box.style.display="none";
return;const results = characters.filter(c =>
(c.name || "").toLowerCase().includes(text) ||
(c.race || "").toLowerCase().includes(text) ||
(c.faction || "").toLowerCase().includes(text)
);
}

results.slice(0,5).forEach(char=>{
const div=document.createElement("div");
div.className="suggestion-item";
div.innerHTML = `
<b>${char.name}</b>
<br>
<small>${char.race || "Unknown"} • PL ${char.pl || "?"}</small>
`;
div.onclick=()=>{
openProfile(char.id);
showPage("characterPage");
box.innerHTML="";
document.getElementById("homeSearch").value="";
};
box.appendChild(div);
});
box.style.display="block";
}function quickSearch(){ const text=document.getElementById("homeSearch").value; document.getElementById("searchInput").value=text; applyFilters(); showPage("characters");}