/* ===============================
INFINITE SCROLL SYSTEM
=============================== */

let visibleCharacters = [];
let currentIndex = 0;

const PAGE_SIZE = 30;
let isLoading = false; // 🔥 chống spam load


/* ===============================
RESET SCROLL LIST
=============================== */

function resetCharacterList(data){

  visibleCharacters = data || characters;
  currentIndex = 0;

  const list = document.getElementById("characterList");
  if(!list) return;

  list.innerHTML = "";

  loadMoreCharacters();
}


/* ===============================
LOAD MORE CHARACTERS
=============================== */

function loadMoreCharacters(){

  if(isLoading) return; // 🔥 chặn spam
  isLoading = true;

  const list = document.getElementById("characterList");
  if(!list) return;

  // 🔥 nếu load hết rồi thì dừng
  if(currentIndex >= visibleCharacters.length){
    isLoading = false;
    return;
  }

  const fragment = document.createDocumentFragment();

  const end = currentIndex + PAGE_SIZE;
  const slice = visibleCharacters.slice(currentIndex, end);

  slice.forEach(c=>{

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img
        id="img-${c.id}"
        loading="lazy"
        decoding="async"
        class="card-img"
        src="https://i.imgur.com/6X8FQyA.png">

      <div class="card-body">
        <h3>${c.name}</h3>
        <p class="race-badge">${c.race || "Unknown"}</p>
        <p class="pl-badge">PL: ${c.pl || "?"}</p>

        <button class="btn-edit">Sửa</button>
        <button class="btn-delete">Xóa</button>
      </div>
    `;

    // 🔥 FIX: stopPropagation tránh click đè card
    card.querySelector(".card-img").onclick = (e)=>{
      e.stopPropagation();
      openProfile(c.id);
    };

    card.querySelector(".btn-edit").onclick = (e)=>{
      e.stopPropagation();
      editCharacter(c.id);
    };

    card.querySelector(".btn-delete").onclick = (e)=>{
      e.stopPropagation();
      deleteCharacter(c.id);
    };

    fragment.appendChild(card);

  });

  list.appendChild(fragment);

  // 🔥 load ảnh sau khi render
  if(typeof loadCardImages === "function"){
    loadCardImages(slice);
  }

  currentIndex += PAGE_SIZE;

  isLoading = false;
}


/* ===============================
SCROLL DETECTION
=============================== */

function handleScroll(){

  const scrollPosition = window.innerHeight + window.scrollY;
  const threshold = document.body.offsetHeight - 200; // 🔥 giảm lag

  if(scrollPosition >= threshold){
    loadMoreCharacters();
  }
}


/* ===============================
ACTIVATE SCROLL
=============================== */

window.addEventListener("scroll", handleScroll);