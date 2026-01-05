// ====== Referencias DOM ======
const appsGrid = document.getElementById("appsGrid");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const chips = document.querySelectorAll(".chip");
document.getElementById("year").textContent = new Date().getFullYear();

let allApps = [];
let currentCat = "all";

// ====== Cargar apps ======
db.collection("apps").orderBy("fecha", "desc").onSnapshot(
  snap => {
    allApps = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    renderApps();
  },
  () => {
    emptyState.style.display = "block";
    emptyState.textContent = "Error cargando apps. Intenta más tarde.";
  }
);

// ====== Render lista ======
function renderApps() {
  const q = (searchInput.value || "").toLowerCase();
  appsGrid.innerHTML = "";

  let list = [...allApps];
  if (currentCat !== "all") list = list.filter(a => a.categoria === currentCat);
  if (q) list = list.filter(a =>
    (a.nombre || "").toLowerCase().includes(q) ||
    (a.descripcion || "").toLowerCase().includes(q)
  );

  list.sort((a, b) => {
    const ra = a.ratingAvg || 0;
    const rb = b.ratingAvg || 0;
    if (rb !== ra) return rb - ra;
    return (b.ratingCount || 0) - (a.ratingCount || 0);
  });

  if (!list.length) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  list.forEach(app => {
    const card = document.createElement("article");
    card.className = "play-card";

    const ratingAvg = app.ratingAvg || 0;
    const ratingCount = app.ratingCount || 0;
    const starsText = ratingCount ? `⭐ ${ratingAvg.toFixed(1)} (${ratingCount})` : "⭐ Sin valoraciones";
    const internet = app.internet === "offline" ? "📴 Sin Internet" : "🌐 Con Internet";
    const descargas = app.descargasReales ?? app.descargas ?? 0;
    const size = app.size || "—";
    const likes = app.likes || 0;

    card.innerHTML = `
      <img class="play-icon" src="${app.imagen}" alt="${app.nombre}" loading="lazy">
      <div class="play-info">
        <h3 class="play-name">${app.nombre}</h3>
        <p class="play-line1">${internet}</p>
        <p class="play-line2">${starsText} • 👍 ${likes} • ${size} </p>
        <p class="play-line3">⬇️${descargas} Descargas</p>
      </div>
    `;

    // Redirigir a la página de detalles
    card.onclick = () => {
      window.location.href = `app-detail.html?app=${app.slug || app.id}`;

    };
    
    appsGrid.appendChild(card);
  });
}

// ====== Eventos ======
searchInput.addEventListener("input", renderApps);

chips.forEach(chip => {
  chip.onclick = () => {
    document.querySelector(".chip.active")?.classList.remove("active");
    chip.classList.add("active");
    currentCat = chip.dataset.cat;
    renderApps();
  };
});
