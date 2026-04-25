// ===============================
// EFFECT SYSTEM
// ===============================

// ===== TOAST =====
function showToast(msg, type="info"){
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.innerText = msg;

    document.body.appendChild(toast);

    setTimeout(()=> toast.classList.add("show"), 10);

    setTimeout(()=>{
        toast.classList.remove("show");
        setTimeout(()=> toast.remove(), 300);
    }, 2500);
}


// ===== FLOAT TEXT (+10) =====
function floatText(text, x, y, color="#4ade80"){
    const el = document.createElement("div");
    el.className = "float-text";
    el.innerText = text;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.color = color;

    document.body.appendChild(el);

    setTimeout(()=> el.remove(), 1000);
}


// ===== CLICK EFFECT =====
document.addEventListener("click", (e)=>{
    const dot = document.createElement("div");
    dot.className = "click-effect";

    dot.style.left = e.clientX + "px";
    dot.style.top = e.clientY + "px";

    document.body.appendChild(dot);

    setTimeout(()=> dot.remove(), 500);
});


// ===== HOVER GLOW =====
function applyHoverGlow(selector){
    document.querySelectorAll(selector).forEach(el=>{
        el.addEventListener("mouseenter", ()=>{
            el.classList.add("hover-glow");
        });
        el.addEventListener("mouseleave", ()=>{
            el.classList.remove("hover-glow");
        });
    });
}


// ===== INPUT FLASH =====
function flashInput(input){
    input.classList.add("input-flash");
    setTimeout(()=> input.classList.remove("input-flash"), 300);
}


// ===== LEVEL UP =====
function levelUpEffect(){
    const el = document.createElement("div");
    el.className = "level-up";
    el.innerText = "LEVEL UP";

    document.body.appendChild(el);

    setTimeout(()=> el.remove(), 1500);
}


// ===== SCREEN SHAKE =====
function screenShake(){
    document.body.classList.add("shake");
    setTimeout(()=> document.body.classList.remove("shake"), 300);
}