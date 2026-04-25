// ===== ID SYSTEM =====

// tạo ID duy nhất
function generateID(prefix){

return prefix + "_" + Date.now() + "_" + Math.floor(Math.random()*1000);

}


// ===== KINGDOM =====

function createKingdomID(){

return generateID("kingdom");

}


// ===== FACTION =====

function createFactionID(){

return generateID("faction");

}


// ===== RACE =====

function createRaceID(){

return generateID("race");

}


// ===== CHARACTER =====

function createCharacterID(){

return generateID("char");

}


// ===== HELPER FIND FUNCTIONS =====

// tìm kingdom theo ID
function getKingdomByID(id){

const kingdoms = JSON.parse(localStorage.getItem("kingdoms")) || [];

return kingdoms.find(k => k.id === id);

}


// tìm faction theo ID
function getFactionByID(id){

const factions = JSON.parse(localStorage.getItem("factions")) || [];

return factions.find(f => f.id === id);

}


// tìm race theo ID
function getRaceByID(id){

const races = JSON.parse(localStorage.getItem("races")) || [];

return races.find(r => r.id === id);

}