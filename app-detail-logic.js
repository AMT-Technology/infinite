const detailContent = document.getElementById("detailContent");
const searchInput = document.getElementById("searchInput");
const chips = document.querySelectorAll(".chip");
let currentApp = null;
let reviewStarsSelected = 0;

function getAppParamFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("app");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-ES");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("es-ES");
}

function getAppImage(app) {
  return app?.imagen || app?.icono || "https://appsem.rap-infinite.online/logo.webp";
}

function getInternetLabel(value) {
  return value === "offline" ? "📴 Funciona sin Internet" : "🌐 Requiere Internet";
}

function getAdsLabel(value) {
  if (value === "si") return "Sí";
  if (value === "no") return "No";
  return "—";
}

function renderStarsStatic(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.25 && rating % 1 < 0.75 ? 1 : 0;
  const empty = 5 - full - half;
  let stars = "";

  for (let i = 0; i < full; i++) stars += '<span class="star-static">★</span>';
  if (half) stars += '<span class="star-static">⯨</span>';
  for (let i = 0; i < empty; i++) stars += '<span class="star-static">☆</span>';

  return stars;
}

function renderRowStars(star) {
  return `${"★".repeat(star)}${"☆".repeat(5 - star)}`;
}

function setRobotsMeta(content) {
  let robots = document.querySelector('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.name = "robots";
    document.head.appendChild(robots);
  }
  robots.content = content;

  let googlebot = document.querySelector('meta[name="googlebot"]');
  if (!googlebot) {
    googlebot = document.createElement("meta");
    googlebot.name = "googlebot";
    document.head.appendChild(googlebot);
  }
  googlebot.content = content;
}

async function cargarApp() {
  const slug = getAppParamFromURL();

  if (!slug) {
    setRobotsMeta("noindex, follow");
    window.location.href = "index.html";
    return;
  }

  try {
    const snap = await db
      .collection("apps")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (snap.empty) {
      setRobotsMeta("noindex, follow");
      mostrarError("App no encontrada");
      return;
    }

    const doc = snap.docs[0];
    currentApp = { ...doc.data(), id: doc.id };

    setRobotsMeta("index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    renderAppDetails(currentApp);
    actualizarMetaTags(currentApp);
  } catch (error) {
    console.error("Error cargando app:", error);
    setRobotsMeta("noindex, follow");
    mostrarError("Error de conexión");
  }
}

function mostrarError(mensaje) {
  detailContent.innerHTML = `
    <div style="text-align:center; padding:50px;">
      <h2>${escapeHtml(mensaje)}</h2>
      <button class="btn-back" onclick="window.location.href='https://appsem.rap-infinite.online/'">
        Volver al inicio
      </button>
    </div>
  `;
}

function actualizarMetaTags(app) {
  document.title = `${app.nombre} — Appser Store`;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.content = `Descarga ${app.nombre} para Android desde Appser Store. ${app.descripcion?.substring(0, 150) || ""}`;
  }

  const canonicalTag = document.getElementById("canonicalTag");
  if (canonicalTag) canonicalTag.href = window.location.href;

  actualizarOpenGraphTags(app);
  actualizarTwitterTags(app);
  agregarStructuredData(app);
}

function actualizarOpenGraphTags(app) {
  const ogTags = {
    "og:title": `${app.nombre} - Appser Store`,
    "og:description": app.descripcion
      ? `${app.descripcion.substring(0, 155)}...`
      : `Descarga ${app.nombre} desde Appser Store`,
    "og:url": window.location.href,
    "og:image": getAppImage(app),
    "og:type": "website"
  };

  for (const [property, content] of Object.entries(ogTags)) {
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("property", property);
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  }
}

function actualizarTwitterTags(app) {
  const twitterTags = {
    "twitter:title": `${app.nombre} - Appser Store`,
    "twitter:description": app.descripcion
      ? `${app.descripcion.substring(0, 155)}...`
      : `Descarga ${app.nombre} desde Appser Store`,
    "twitter:image": getAppImage(app)
  };

  for (const [name, content] of Object.entries(twitterTags)) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", name);
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  }
}

function agregarStructuredData(app) {
  const oldScript = document.querySelector('script[type="application/ld+json"]');
  if (oldScript) oldScript.remove();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": app.nombre,
    "applicationCategory": app.categoria || "Application",
    "operatingSystem": "Android",
    "description": app.descripcion || "",
    "softwareVersion": app.version || "1.0",
    "datePublished": app.fechaActualizacion || new Date().toISOString().split("T")[0],
    "author": {
      "@type": "Organization",
      "name": "Appser Store",
      "url": "https://appsem.rap-infinite.online/"
    },
    "offers": {
      "@type": "Offer",
      "price": app.tipo === "Gratis" ? "0" : "Varies",
      "priceCurrency": "USD"
    },
    "aggregateRating": app.ratingAvg
      ? {
          "@type": "AggregateRating",
          "ratingValue": app.ratingAvg.toString(),
          "ratingCount": (app.ratingCount || 0).toString()
        }
      : undefined,
    "image": getAppImage(app),
    "url": window.location.href
  };

  Object.keys(structuredData).forEach((key) => {
    if (structuredData[key] === undefined) delete structuredData[key];
  });

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(structuredData);
  document.head.appendChild(script);
}

function renderAppDetails(app) {
  const votes = JSON.parse(localStorage.getItem("appsmart_votes") || "{}");
  const myVote = votes[app.id] || {};

  const ratingAvg = Number(app.ratingAvg || 0);
  const ratingCount = Number(app.ratingCount || 0);
  const descargas = Number(app.descargasReales ?? app.descargas ?? 0);
  const likes = Number(app.likes || 0);

  let breakdown = app.starsBreakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  if (!total && ratingCount) {
    breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: ratingCount };
    total = ratingCount;
  }

  const appImage = escapeHtml(getAppImage(app));
  const appName = escapeHtml(app.nombre || "Aplicación");
  const appCategory = escapeHtml(app.categoria || "Sin categoría");
  const appSize = escapeHtml(app.size || "—");
  const appVersion = escapeHtml(app.version || "—");
  const appType = escapeHtml(app.tipo || "—");
  const appLanguage = escapeHtml(app.idioma || "—");
  const appSystem = escapeHtml(app.sistemaOperativo || "—");
  const appRequirements = escapeHtml(app.requisitos || "—");
  const appAge = escapeHtml(app.edad || "—");
  const appPackage = escapeHtml(app.packageName || "—");
  const appDescription = escapeHtml(app.descripcion || "");
  const appUpdate = escapeHtml(formatDate(app.fechaActualizacion));
  const adsLabel = escapeHtml(getAdsLabel(app.anuncios));
  const internetLabel = escapeHtml(getInternetLabel(app.internet));
  const screenshots = Array.isArray(app.imgSecundarias) ? app.imgSecundarias : [];

  const statsCards = `
    <div class="stat-card compact-stat-card">
      <div class="stat-label">Descargas</div>
      <div class="stat-value">${formatNumber(descargas)}</div>
    </div>
    <div class="stat-card compact-stat-card">
      <div class="stat-label">Me gusta</div>
      <div class="stat-value">${formatNumber(likes)}</div>
    </div>
    <div class="stat-card compact-stat-card">
      <div class="stat-label">Versión</div>
      <div class="stat-value">${appVersion}</div>
    </div>
  `;

  const screenshotsHtml = screenshots.length
    ? `
      <h2>Capturas de pantalla</h2>
      <div class="screenshots-wrapper">
        <div id="detailScreens" class="screenshots-row">
          ${screenshots.map((img, index) => {
            const safeImg = escapeHtml(img);
            return `<img src="${safeImg}" alt="Captura ${index + 1} de ${appName}" loading="lazy">`;
          }).join("")}
        </div>
      </div>
    `
    : "";

  const privacyHtml = app.privacidadUrl
    ? `<a href="${escapeHtml(app.privacidadUrl)}" target="_blank" rel="noopener noreferrer">Ver política</a>`
    : "No disponible";

  const html = `
    <button id="detailClose" class="overlay-close" onclick="window.history.back()">← Volver</button>

    <div class="overlay-header">
      <img id="detailIcon" class="overlay-icon" src="${appImage}" alt="${appName}" loading="lazy">
      <div>
        <h1 id="detailName">${appName}</h1>

        <div class="overlay-subtitle">
          <span class="meta-pill">${appCategory}</span>
          <span class="meta-pill">${appType}</span>
          <span class="meta-pill">${appSize}</span>
        </div>

        <div class="overlay-meta">
          <span class="overlay-meta-item">📦 ${appSize}</span>
          <span class="overlay-meta-item">${internetLabel}</span>
          <span class="overlay-meta-item">🔄 Actualizada: ${appUpdate}</span>
        </div>
      </div>
    </div>

    <div id="detailStats" class="detail-stats detail-stats-top">
      ${statsCards}
    </div>

    <div class="install-share-row">
      <button id="installBtn" class="install-btn" aria-label="Descargar APK principal">
        <img src="assets/icons/descargar.png" alt="Descarga Directa">
      </button>

      ${app.playstoreUrl ? `
        <button id="playstoreBtn" class="playstore-btn" aria-label="Abrir en Play Store">
          <img src="assets/icons/playstore.png" alt="Play Store">
        </button>` : ""}

      ${app.uptodownUrl ? `
        <button id="uptodownBtn" class="uptodown-btn" aria-label="Abrir en Uptodown">
          <img src="assets/icons/uptodown.png" alt="Uptodown">
        </button>` : ""}

      ${app.megaUrl ? `
        <button id="megaBtn" class="mega-btn" aria-label="Abrir en Mega">
          <img src="assets/icons/mega.png" alt="Mega">
        </button>` : ""}

      ${app.mediafireUrl ? `
        <button id="mediafireBtn" class="mediafire-btn" aria-label="Abrir en Mediafire">
          <img src="assets/icons/mediafire.png" alt="Mediafire">
        </button>` : ""}

      <button id="shareBtn" class="share-btn" aria-label="Compartir aplicación">
        <img src="assets/icons/compartir.png" alt="Compartir">
      </button>
    </div>

    <h2>Valoraciones</h2>
    <div class="rating-summary-card">
      <div class="rating-summary-left">
        <div id="ratingBig" class="rating-big">${ratingAvg.toFixed(1)}</div>
        <div id="starsRow" class="stars-row rating-main-stars">
          ${renderStarsStatic(ratingAvg)}
        </div>
        <div class="rating-total">${formatNumber(total)} valoraciones</div>
      </div>

      <div class="rating-summary-right">
        ${[5, 4, 3, 2, 1].map((star) => `
          <div class="rating-row">
            <div class="rating-row-label">
              <span class="rating-row-number">${star}</span>
              <span class="rating-row-stars">${renderRowStars(star)}</span>
            </div>
            <div class="bar">
              <div class="bar-fill" style="width: ${total ? (breakdown[star] / total) * 100 : 0}%"></div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="rating-actions">
      <button id="likeBtn" class="like-btn" ${myVote.liked ? "disabled" : ""}>
        ${myVote.liked ? "❤️ Ya te gusta" : "❤️ Me gusta"} (${formatNumber(likes)})
      </button>
    </div>

    <h2>Información de la app</h2>
    <div class="info-grid">
      <div class="info-box"><span class="info-icon">🌐</span><div><p class="info-title">Idioma</p><p class="info-value">${appLanguage}</p></div></div>
      <div class="info-box"><span class="info-icon">🔢</span><div><p class="info-title">Versión</p><p class="info-value">${appVersion}</p></div></div>
      <div class="info-box"><span class="info-icon">🏷️</span><div><p class="info-title">Licencia</p><p class="info-value">${appType}</p></div></div>
      <div class="info-box"><span class="info-icon">📱</span><div><p class="info-title">Sistema operativo</p><p class="info-value">${appSystem}</p></div></div>
      <div class="info-box"><span class="info-icon">⚙️</span><div><p class="info-title">Requisitos del sistema</p><p class="info-value">${appRequirements}</p></div></div>
      <div class="info-box"><span class="info-icon">📅</span><div><p class="info-title">Actualización</p><p class="info-value">${appUpdate}</p></div></div>
      <div class="info-box"><span class="info-icon">🔞</span><div><p class="info-title">Edad recomendada</p><p class="info-value">${appAge}</p></div></div>
      <div class="info-box"><span class="info-icon">📢</span><div><p class="info-title">Anuncios</p><p class="info-value">${adsLabel}</p></div></div>
      <div class="info-box"><span class="info-icon">🔗</span><div><p class="info-title">Política de privacidad</p><p class="info-value">${privacyHtml}</p></div></div>
      <div class="info-box"><span class="info-icon">📦</span><div><p class="info-title">Tamaño del APK</p><p class="info-value">${appSize}</p></div></div>
      <div class="info-box"><span class="info-icon">🆔</span><div><p class="info-title">Package Name</p><p class="info-value">${appPackage}</p></div></div>
      <div class="info-box"><span class="info-icon">⬇️</span><div><p class="info-title">Descargas</p><p class="info-value">${formatNumber(descargas)}</p></div></div>
    </div>

    <h2>Descripción</h2>
    <p id="detailDesc" class="detail-desc">${appDescription}</p>

    ${screenshotsHtml}

    <h2>Reseñas de usuarios</h2>
    <div class="review-form">
      <h3>Escribe una reseña</h3>
      <label>Tu puntuación:</label>
      <div id="reviewStars" class="stars-row"></div>
      <textarea id="reviewText" placeholder="Escribe tu comentario..." maxlength="280"></textarea>
      <button id="sendReviewBtn">Enviar reseña</button>
    </div>

    <div id="reviewsList" class="reviews-list"></div>
  `;

  detailContent.innerHTML = html;
  inicializarEventos(app);
  renderReviewStars();
  loadReviews(app.id);
}

function inicializarEventos(app) {
  const installBtn = document.getElementById("installBtn");
  if (installBtn) {
    installBtn.onclick = () => {
      if (!app.apk) {
        alert("🚫 No hay archivo disponible.");
        return;
      }

      installBtn.disabled = true;

      db.collection("apps").doc(app.id).update({
        descargasReales: firebase.firestore.FieldValue.increment(1)
      }).then(() => {
        window.open(app.apk, "_blank");
        setTimeout(() => {
          installBtn.disabled = false;
        }, 1000);
      }).catch((error) => {
        console.error("Error al incrementar descargas:", error);
        installBtn.disabled = false;
        window.open(app.apk, "_blank");
      });
    };
  }

  const botones = [
    { id: "playstoreBtn", url: app.playstoreUrl },
    { id: "uptodownBtn", url: app.uptodownUrl },
    { id: "megaBtn", url: app.megaUrl },
    { id: "mediafireBtn", url: app.mediafireUrl }
  ];

  botones.forEach(({ id, url }) => {
    const btn = document.getElementById(id);
    if (btn && url) {
      btn.onclick = () => window.open(url, "_blank");
    } else if (btn) {
      btn.style.display = "none";
    }
  });

  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    shareBtn.onclick = async () => {
      const url = window.location.href;
      const title = app.nombre;
      const text = app.descripcion?.substring(0, 100) || "";

      try {
        if (navigator.share) {
          await navigator.share({ title, text, url });
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          alert("¡Enlace copiado al portapapeles!");
        } else {
          alert(url);
        }
      } catch (error) {
        console.error("Error compartiendo:", error);
      }
    };
  }

  const likeBtn = document.getElementById("likeBtn");
  if (likeBtn) {
    likeBtn.onclick = () => {
      const votes = JSON.parse(localStorage.getItem("appsmart_votes") || "{}");
      if (votes[app.id] && votes[app.id].liked) return;

      db.collection("apps").doc(app.id).update({
        likes: firebase.firestore.FieldValue.increment(1)
      }).then(() => {
        votes[app.id] = { liked: true };
        localStorage.setItem("appsmart_votes", JSON.stringify(votes));
        likeBtn.textContent = `❤️ Ya te gusta (${formatNumber((app.likes || 0) + 1)})`;
        likeBtn.disabled = true;
      }).catch((error) => {
        console.error("Error dando like:", error);
      });
    };
  }
}

function renderReviewStars() {
  const container = document.getElementById("reviewStars");
  if (!container) return;

  container.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "☆";
    btn.className = "star-btn";
    btn.onclick = () => setReviewStars(i);
    container.appendChild(btn);
  }
}

function setReviewStars(n) {
  reviewStarsSelected = n;
  const stars = document.querySelectorAll("#reviewStars .star-btn");
  stars.forEach((star, index) => {
    star.textContent = index < n ? "★" : "☆";
  });
}

function loadReviews(appId) {
  const container = document.getElementById("reviewsList");
  if (!container) return;

  container.innerHTML = "<p>Cargando reseñas...</p>";

  db.collection("apps").doc(appId).collection("reviews")
    .orderBy("timestamp", "desc")
    .get()
    .then((snap) => {
      container.innerHTML = "";

      if (snap.empty) {
        container.innerHTML = "<p>No hay reseñas todavía. Sé el primero en comentar.</p>";
        return;
      }

      snap.forEach((doc) => {
        const r = doc.data();
        const item = document.createElement("div");
        item.className = "review-item";
        const starsStr = "★".repeat(r.stars || 0) + "☆".repeat(5 - (r.stars || 0));

        item.innerHTML = `
          <div class="review-stars">${starsStr}</div>
          <div class="review-text">${escapeHtml(r.comment || "")}</div>
          <div class="review-time">${formatDate(r.timestamp)}</div>
        `;

        container.appendChild(item);
      });
    })
    .catch((error) => {
      console.error("Error cargando reseñas:", error);
      container.innerHTML = "<p>Error cargando reseñas.</p>";
    });
}

document.addEventListener("click", function (e) {
  if (e.target.id === "sendReviewBtn" || e.target.closest("#sendReviewBtn")) {
    handleSendReview();
  }
});

function handleSendReview() {
  if (!currentApp) return;

  const reviewTextElement = document.getElementById("reviewText");
  const text = reviewTextElement?.value.trim() || "";

  if (reviewStarsSelected === 0) {
    alert("Selecciona una puntuación.");
    return;
  }

  if (text.length < 5) {
    alert("Escribe un comentario más largo (mínimo 5 caracteres).");
    return;
  }

  const app = currentApp;
  const prevAvg = Number(app.ratingAvg || 0);
  const prevCount = Number(app.ratingCount || 0);
  const newCount = prevCount + 1;
  const newAvg = (prevAvg * prevCount + reviewStarsSelected) / newCount;
  const breakdown = app.starsBreakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  breakdown[reviewStarsSelected] = Number(breakdown[reviewStarsSelected] || 0) + 1;

  const appRef = db.collection("apps").doc(app.id);
  const reviewRef = appRef.collection("reviews").doc();
  const batch = db.batch();

  batch.set(reviewRef, {
    stars: reviewStarsSelected,
    comment: text,
    timestamp: Date.now(),
    userId: "anonymous"
  });

  batch.update(appRef, {
    ratingAvg: newAvg,
    ratingCount: newCount,
    starsBreakdown: breakdown
  });

  batch.commit()
    .then(() => {
      if (reviewTextElement) reviewTextElement.value = "";
      reviewStarsSelected = 0;
      currentApp.ratingAvg = newAvg;
      currentApp.ratingCount = newCount;
      currentApp.starsBreakdown = breakdown;
      renderAppDetails(currentApp);
      actualizarMetaTags(currentApp);
      alert("¡Tu reseña fue publicada!");
    })
    .catch((error) => {
      console.error("Error enviando reseña:", error);
      alert("Error al enviar la reseña.");
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  cargarApp();

  chips.forEach((chip) => {
    chip.onclick = () => {
      window.location.href = "https://appsem.rap-infinite.online";
    };
  });

  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const term = searchInput.value.trim();
        if (term) {
          window.location.href = `https://appsem.rap-infinite.online?search=${encodeURIComponent(term)}`;
        } else {
          window.location.href = "https://appsem.rap-infinite.online";
        }
      }
    });
  }
});
