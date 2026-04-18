const appsGrid = document.getElementById("appsGrid");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const chips = document.querySelectorAll(".chip");
document.getElementById("year").textContent = new Date().getFullYear();

let allApps = [];
let currentCat = "all";

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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderApps() {
  const q = (searchInput.value || "").toLowerCase();
  appsGrid.innerHTML = "";

  let list = [...allApps];
  if (currentCat !== "all") list = list.filter(a => a.categoria === currentCat);
  if (q) {
    list = list.filter(a =>
      (a.nombre || "").toLowerCase().includes(q) ||
      (a.descripcion || "").toLowerCase().includes(q)
    );
  }

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
    const slug = encodeURIComponent(app.slug || app.id);
    const appName = escapeHtml(app.nombre || "Aplicación");
    const appImage = escapeHtml(app.imagen || "logo.webp");
    const detailUrl = `app-detail.html?app=${slug}`;

    card.innerHTML = `
      <a href="${detailUrl}" aria-label="Ver detalles de ${appName}" style="text-decoration:none;color:inherit;display:block;width:100%;height:100%;">
        <img class="play-icon" src="${appImage}" alt="${appName}" loading="lazy">
        <div class="play-info">
          <h3 class="play-name">${appName}</h3>
          <p class="play-line1">${internet}</p>
          <p class="play-line2">${starsText} • 👍 ${likes} • ${escapeHtml(size)}</p>
          <p class="play-line3">⬇️ ${descargas} Descargas</p>
        </div>
      </a>
    `;

    appsGrid.appendChild(card);
  });
}

searchInput.addEventListener("input", renderApps);

chips.forEach(chip => {
  chip.onclick = () => {
    document.querySelector(".chip.active")?.classList.remove("active");
    chip.classList.add("active");
    currentCat = chip.dataset.cat;
    renderApps();
  };
});
