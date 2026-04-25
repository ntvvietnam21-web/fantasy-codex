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
  if (typeof characters !== 'undefined' && Array.isArray(characters)) {
    sortByName(characters, "name", order);
    if (typeof render === "function") render(characters);
  }
}

function sortRaces(order = "asc") {
  if (typeof races !== 'undefined' && Array.isArray(races)) {
    sortByName(races, "name", order);
    if (typeof renderRaces === "function") renderRaces();
  }
}

function sortKingdoms(order = "asc") {
  if (typeof kingdoms !== 'undefined' && Array.isArray(kingdoms)) {
    sortByName(kingdoms, "name", order);
    if (typeof renderKingdoms === "function") renderKingdoms();
  }
}

function sortFactions(order = "asc") {
  if (typeof factions !== 'undefined' && Array.isArray(factions)) {
    sortByName(factions, "name", order);
    if (typeof renderFactions === "function") renderFactions();
  }
}
function sortAll(order = "asc") {
  console.log(`⚖️ GM: Đang sắp xếp toàn bộ theo bảng chữ cái tiếng Việt (${order})...`);
  localStorage.setItem("sortMode", order);

  if (typeof characters !== 'undefined') sortByName(characters, "name", order);
  if (typeof races !== 'undefined') sortByName(races, "name", order);
  if (typeof kingdoms !== 'undefined') sortByName(kingdoms, "name", order);
  if (typeof factions !== 'undefined') sortByName(factions, "name", order);

  // Render lại giao diện
  if (typeof render === "function") render(characters);
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
