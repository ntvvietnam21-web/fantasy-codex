function sortByName(array, key, order = "asc") {
  if (!Array.isArray(array) || array.length === 0) return [];

  return array.sort((a, b) => {
    const valA = String(a[key] || "");
    const valB = String(b[key] || "");
    const comparison = valA.localeCompare(valB, 'vi', { 
      sensitivity: 'accent', 
      numeric: true 
    });

    return order === "asc" ? comparison : -comparison;
  });
}
function sortCharacters(order = "asc") {
  if (typeof window.characters !== 'undefined' && Array.isArray(window.characters)) {
    sortByName(window.characters, "name", order);
    if (typeof render === "function") render(window.characters);
  }
}

function sortRaces(order = "asc") {
  if (typeof window.races !== 'undefined' && Array.isArray(window.races)) {
    sortByName(window.races, "name", order);
    if (typeof renderRaces === "function") renderRaces();
  }
}

function sortKingdoms(order = "asc") {
  if (typeof window.kingdoms !== 'undefined' && Array.isArray(window.kingdoms)) {
    sortByName(window.kingdoms, "name", order);
    if (typeof renderKingdoms === "function") renderKingdoms();
  }
}

function sortFactions(order = "asc") {
  if (typeof window.factions !== 'undefined' && Array.isArray(window.factions)) {
    sortByName(window.factions, "name", order);
    if (typeof renderFactions === "function") renderFactions();
  }
}
function sortAll(order = "asc") {
  console.log(`⚖️ GM: Đang sắp xếp toàn bộ theo bảng chữ cái tiếng Việt (${order})...`);
  localStorage.setItem("sortMode", order);

  if (window.characters) sortByName(window.characters, "name", order);
  if (window.races) sortByName(window.races, "name", order);
  if (window.kingdoms) sortByName(window.kingdoms, "name", order);
  if (window.factions) sortByName(window.factions, "name", order);

  // Render lại giao diện
  if (typeof render === "function") render(window.characters);
  if (typeof renderRaces === "function") renderRaces();
  if (typeof renderKingdoms === "function") renderKingdoms();
  if (typeof renderFactions === "function") renderFactions();
}
window.addEventListener("load", () => {
    setTimeout(() => {
        const savedOrder = localStorage.getItem("sortMode") || "asc";
        sortAll(savedOrder);
    }, 500); 
});
