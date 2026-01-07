// ====== Variables globales ======
let db;
let currentApp = null;
let reviewStarsSelected = 0;

// ====== Inicializar cuando el DOM esté listo ======
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar año en el footer
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // Inicializar Firebase
    if (typeof firebase !== 'undefined') {
        try {
            // Configuración de Firebase (debe estar en firebase.js)
            if (typeof initFirebase === 'function') {
                initFirebase();
            }
            
            // Obtener referencia a Firestore
            db = firebase.firestore();
            
            // Cargar la app
            cargarApp();
            
        } catch (error) {
            console.error('Error al inicializar Firebase:', error);
            mostrarError('Error de conexión con la base de datos');
        }
    } else {
        console.error('Firebase no está disponible');
        mostrarError('Error de configuración');
    }
});

// ====== Obtener app de la URL ======
function getAppParamFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("app");
}

// ====== Cargar datos de la app ======
async function cargarApp() {
    const slug = getAppParamFromURL();

    if (!slug) {
        mostrarError("App no especificada en la URL");
        return;
    }

    try {
        const snap = await db
            .collection("apps")
            .where("slug", "==", slug)
            .limit(1)
            .get();

        if (snap.empty) {
            mostrarError("App no encontrada");
            return;
        }

        const doc = snap.docs[0];
        currentApp = { 
            ...doc.data(), 
            id: doc.id 
        };

        renderAppDetails(currentApp);
        actualizarMetaTags(currentApp);

    } catch (error) {
        console.error("Error cargando app:", error);
        mostrarError("Error de conexión con la base de datos");
    }
}

function mostrarError(mensaje) {
    const detailContent = document.getElementById("detailContent");
    if (!detailContent) return;
    
    detailContent.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <h2 style="color: #dc2626; margin-bottom: 20px;">${mensaje}</h2>
            <button class="btn-back" onclick="window.location.href='https://appsem.rap-infinite.online/'" style="
                background: #3b82f6;
                border: none;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 600;
                transition: background 0.3s;
            ">
                ← Volver al inicio
            </button>
        </div>
    `;
}

function actualizarMetaTags(app) {
    // Actualizar título
    document.title = `${app.nombre} — Appser Store`;
    
    // Actualizar meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metaDesc.content = `Descarga ${app.nombre} para Android desde Appser Store. ${app.descripcion?.substring(0, 150) || ''}`;
    }
    
    // Establecer la etiqueta canónica
    const canonicalTag = document.getElementById('canonicalTag');
    if (canonicalTag) {
        const currentUrl = window.location.href;
        canonicalTag.href = currentUrl;
        console.log('Canónica establecida:', currentUrl);
    }
    
    // Actualizar Open Graph Tags
    actualizarOpenGraphTags(app);
    
    // Agregar JSON-LD Structured Data
    agregarStructuredData(app);
}

function actualizarOpenGraphTags(app) {
    const ogTags = {
        'og:title': `${app.nombre} - Appser Store`,
        'og:description': app.descripcion ? `${app.descripcion.substring(0, 155)}...` : `Descarga ${app.nombre} desde Appser Store`,
        'og:url': window.location.href,
        'og:image': app.imagen || app.icono || 'https://appsem.rap-infinite.online/logo.webp',
        'og:type': 'website'
    };
    
    for (const [property, content] of Object.entries(ogTags)) {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    }
}

function agregarStructuredData(app) {
    // Eliminar structured data anterior si existe
    const oldScript = document.querySelector('script[type="application/ld+json"]');
    if (oldScript) {
        oldScript.remove();
    }
    
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": app.nombre,
        "applicationCategory": app.categoria || "Application",
        "operatingSystem": "Android",
        "description": app.descripcion || "",
        "softwareVersion": app.version || "1.0",
        "datePublished": app.fechaActualizacion || new Date().toISOString().split('T')[0],
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
        "aggregateRating": app.ratingAvg ? {
            "@type": "AggregateRating",
            "ratingValue": app.ratingAvg.toString(),
            "ratingCount": (app.ratingCount || 0).toString()
        } : undefined,
        "image": app.imagen || app.icono || "https://appsem.rap-infinite.online/logo.webp",
        "url": window.location.href
    };
    
    // Filtrar propiedades undefined
    Object.keys(structuredData).forEach(key => {
        if (structuredData[key] === undefined) {
            delete structuredData[key];
        }
    });
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
}

// ====== Renderizar detalles de la app ======
function renderAppDetails(app) {
    const votes = JSON.parse(localStorage.getItem("appsmart_votes") || "{}");
    const myVote = votes[app.id] || {};

    const ratingAvg = app.ratingAvg || 0;
    const ratingCount = app.ratingCount || 0;
    const descargas = app.descargasReales ?? app.descargas ?? 0;
    const likes = app.likes || 0;

    let breakdown = app.starsBreakdown || {1:0,2:0,3:0,4:0,5:0};
    let total = Object.values(breakdown).reduce((a,b)=>a+b,0);
    if (!total && ratingCount) { 
        breakdown = {1:0,2:0,3:0,4:0,5:ratingCount}; 
        total = ratingCount; 
    }

    // Función para estrellas estáticas
    function renderStarsStatic(rating) {
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.25 && rating % 1 < 0.75 ? 1 : 0;
        const empty = 5 - full - half;
        let stars = '';
        for (let i = 0; i < full; i++) stars += '<span class="star-static">★</span>';
        if (half) stars += '<span class="star-static">⯨</span>';
        for (let i = 0; i < empty; i++) stars += '<span class="star-static">☆</span>';
        return stars;
    }

    // HTML del detalle de la app
    const html = `
        <button id="detailClose" class="overlay-close" onclick="window.history.back()">✕</button>

        <div class="overlay-header">
            <img id="detailIcon" class="overlay-icon" src="${app.imagen}" alt="${app.nombre}" loading="lazy" 
                 onerror="this.src='https://appsem.rap-infinite.online/logo.webp'">
            <div>
                <h1 id="detailName">${app.nombre}</h1>
                <p id="detailCategory">${app.categoria}</p>
                <p id="detailSize">📦 Tamaño: ${app.size || '—'}</p>
                <p id="detailInternet">${app.internet === 'offline' ? '📴 Funciona sin Internet' : '🌐 Requiere Internet'}</p>
            </div>
        </div>

        <div class="install-share-row">
            <button id="installBtn" class="install-btn">
                <img src="assets/icons/descargar.png" alt="Descarga Directa" onerror="this.style.display='none'; this.parentNode.innerHTML='📥 Descargar';">
                Descargar APK
            </button>

            ${app.playstoreUrl ? `<button id="playstoreBtn" class="playstore-btn">
                <img src="assets/icons/playstore.png" alt="Play Store" onerror="this.style.display='none'; this.parentNode.innerHTML='▶️ Play Store';">
                Play Store
            </button>` : ''}

            ${app.uptodownUrl ? `<button id="uptodownBtn" class="uptodown-btn">
                <img src="assets/icons/uptodown.png" alt="Uptodown" onerror="this.style.display='none'; this.parentNode.innerHTML='📱 Uptodown';">
                Uptodown
            </button>` : ''}

            ${app.megaUrl ? `<button id="megaBtn" class="mega-btn">
                <img src="assets/icons/mega.png" alt="Mega" onerror="this.style.display='none'; this.parentNode.innerHTML='☁️ Mega';">
                Mega
            </button>` : ''}

            ${app.mediafireUrl ? `<button id="mediafireBtn" class="mediafire-btn">
                <img src="assets/icons/mediafire.png" alt="Mediafire" onerror="this.style.display='none'; this.parentNode.innerHTML='📂 Mediafire';">
                Mediafire
            </button>` : ''}

            <button id="shareBtn" class="share-btn">
                <img src="assets/icons/compartir.png" alt="Compartir" onerror="this.style.display='none'; this.parentNode.innerHTML='↗️ Compartir';">
                Compartir
            </button>
        </div>

        <p id="detailStats" class="detail-stats">
            📥 Descargas: ${descargas.toLocaleString("es-ES")} • 
            ❤️ Likes: ${likes.toLocaleString("es-ES")}
        </p>

        <!-- Bloque estrellas + like -->
        <div class="rating-block">
            <p id="ratingLabel" class="rating-label">
                ⭐ Valoración: ${ratingAvg.toFixed(1)} (${ratingCount} votos)
            </p>
            <div id="starsRow" class="stars-row">
                ${renderStarsStatic(ratingAvg)}
            </div>
            <button id="likeBtn" class="like-btn" ${myVote.liked ? 'disabled' : ''}>
                ${myVote.liked ? '❤️ Ya te gusta' : '❤️ Me gusta'} (${likes})
            </button>
        </div>

        <!-- Resumen valoraciones -->
        <h2>Valoraciones y reseñas</h2>
        <div class="stars-graph">
            <div class="stars-left">
                <div id="ratingBig" class="rating-big">${ratingAvg.toFixed(1)}</div>
                <div id="ratingTotal" class="rating-total">${total} reseñas</div>
            </div>

            <div class="stars-bars">
                ${[5,4,3,2,1].map(star => `
                    <div class="bar-row">
                        <span>${star}</span>
                        <div class="bar"><div id="bar${star}" class="bar-fill" style="width: ${total ? (breakdown[star] / total) * 100 : 0}%"></div></div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- INFORMACIÓN DE LA APP -->
        <h2>Información de la app</h2>
        <div class="info-grid">
            <div class="info-box">
                <span class="info-icon">🌐</span>
                <div>
                    <p class="info-title">Idioma</p>
                    <p id="infoIdioma" class="info-value">${app.idioma || '—'}</p>
                </div>
            </div>

            <div class="info-box">
                <span class="info-icon">🔢</span>
                <div>
                    <p class="info-title">Versión</p>
                    <p id="infoVersion" class="info-value">${app.version || '—'}</p>
                </div>
            </div>

            <div class="info-box">
                <span class="info-icon">🏷️</span>
                <div>
                    <p class="info-title">Licencia</p>
                    <p id="infoTipo" class="info-value">${app.tipo || '—'}</p>
                </div>
            </div>

            <div class="info-box">
                <span class="info-icon">📱</span>
                <div>
                    <p class="info-title">Sistema operativo</p>
                    <p id="infoSO" class="info-value">${app.sistemaOperativo || '—'}</p>
                </div>
            </div>

            <div class="info-box">
                <span class="info-icon">⚙️</span>
                <div>
                    <p class="info-title">Requisitos del sistema</p>
                    <p id="infoReq" class="info-value">${app.requisitos || '—'}</p>
                </div>
            </div>

            <div class="info-box">
                <span class="info-icon">📅</span>
                <div>
                    <p class="info-title">Actualización</p>
                    <p id="infoFechaAct" class="info-value">${app.fechaActualizacion ? new Date(app.fechaActualizacion).toLocaleDateString('es-ES') : '—'}</p>
                </div>
            </div>

            <div class="info-box">
                <span class="info-icon">🔞</span>
                <div>
                    <p class="info-title">Edad recomendada</p>
                    <p id="infoEdad" class="info-value">${app.edad || '—'}</p>
                </div>
            </div>

            <div class="info-box">
                <span class="info-icon">📢</span>
                <div>
                    <p class="info-title">Anuncios</p>
                    <p id="infoAnuncios" class="info-value">${app.anuncios === 'si' ? 'Sí' : app.anuncios === 'no' ? 'No' : '—'}</p>
                </div>
            </div>

            ${app.privacidadUrl ? `
            <div class="info-box">
                <span class="info-icon">🔗</span>
                <div>
                    <p class="info-title">Política de privacidad</p>
                    <p class="info-value">
                        <a href="${app.privacidadUrl}" target="_blank">Ver política</a>
                    </p>
                </div>
            </div>
            ` : ''}

            <div class="info-box">
                <span class="info-icon">📦</span>
                <div>
                    <p class="info-title">Tamaño del APK</p>
                    <p id="infoTamañoApk" class="info-value">${app.size || '—'}</p>
                </div>
            </div>

            ${app.packageName ? `
            <div class="info-box">
                <span class="info-icon">🆔</span>
                <div>
                    <p class="info-title">Package Name</p>
                    <p id="infoPackageName" class="info-value">${app.packageName}</p>
                </div>
            </div>
            ` : ''}

            <div class="info-box">
                <span class="info-icon">⬇️</span>
                <div>
                    <p class="info-title">Descargas</p>
                    <p id="infoDescargas" class="info-value">${descargas.toLocaleString('es-ES')}</p>
                </div>
            </div>
        </div>

        <h2>Descripción</h2>
        <p id="detailDesc" class="detail-desc">${app.descripcion || 'Sin descripción disponible.'}</p>

        ${app.imgSecundarias && app.imgSecundarias.length > 0 ? `
        <h2>Capturas de pantalla</h2>
        <div id="detailScreens" class="screenshots-row">
            ${app.imgSecundarias.map((img, index) => 
                `<img src="${img}" alt="Captura ${index + 1}" loading="lazy" 
                      onerror="this.style.display='none'">`
            ).join('')}
        </div>
        ` : ''}

        <h2>Reseñas de usuarios</h2>
        
        <!-- Formulario reseña -->
        <div class="review-form">
            <h3>Escribe una reseña</h3>
            <label>Tu puntuación:</label>
            <div id="reviewStars" class="stars-row"></div>
            <textarea id="reviewText" placeholder="Comparte tu experiencia con esta app..." maxlength="280"></textarea>
            <button id="sendReviewBtn" class="install-btn" style="margin-top:10px;">
                📝 Enviar reseña
            </button>
        </div>
        
        <!-- Lista reseñas -->
        <div id="reviewsList" class="reviews-list"></div>
    `;

    const detailContent = document.getElementById("detailContent");
    if (detailContent) {
        detailContent.innerHTML = html;
        
        // Inicializar eventos
        inicializarEventos(app);
        renderReviewStars();
        loadReviews(app.id);
    }
}

// ====== Inicializar eventos ======
function inicializarEventos(app) {
    // Botón de descarga principal
    const installBtn = document.getElementById('installBtn');
    if (installBtn && app.apk) {
        installBtn.onclick = () => {
            if (!app.apk) {
                alert("🚫 No hay archivo disponible para descargar.");
                return;
            }
            
            installBtn.disabled = true;
            installBtn.innerHTML = '⏳ Descargando...';
            
            // Incrementar contador en Firebase
            db.collection("apps").doc(app.id).update({
                descargasReales: firebase.firestore.FieldValue.increment(1)
            }).then(() => {
                // Abrir enlace de descarga
                window.open(app.apk, '_blank');
                
                // Restaurar botón después de 2 segundos
                setTimeout(() => {
                    installBtn.disabled = false;
                    installBtn.innerHTML = `
                        <img src="assets/icons/descargar.png" alt="Descarga Directa" 
                             onerror="this.style.display='none'; this.parentNode.innerHTML='📥 Descargar';">
                        Descargar APK
                    `;
                }, 2000);
            }).catch(error => {
                console.error("Error al actualizar descargas:", error);
                installBtn.disabled = false;
                installBtn.innerHTML = '📥 Descargar APK';
                alert("Error al registrar la descarga. Intenta de nuevo.");
            });
        };
    }

    // Botones extra
    const botones = [
        {id: 'playstoreBtn', url: app.playstoreUrl},
        {id: 'uptodownBtn', url: app.uptodownUrl},
        {id: 'megaBtn', url: app.megaUrl},
        {id: 'mediafireBtn', url: app.mediafireUrl},
    ];

    botones.forEach(({id, url}) => {
        const btn = document.getElementById(id);
        if (btn && url) {
            btn.onclick = () => window.open(url, '_blank');
        }
    });

    // Botón de compartir
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.onclick = () => {
            const url = window.location.href;
            const title = app.nombre;
            const text = app.descripcion?.substring(0, 100) || `Descarga ${app.nombre} desde Appser Store`;
            
            if (navigator.share) {
                navigator.share({ 
                    title, 
                    text, 
                    url 
                }).catch(console.error);
            } else {
                navigator.clipboard.writeText(url).then(() => {
                    alert('✅ Enlace copiado al portapapeles');
                }).catch(() => {
                    // Fallback para navegadores antiguos
                    const tempInput = document.createElement('input');
                    tempInput.value = url;
                    document.body.appendChild(tempInput);
                    tempInput.select();
                    document.execCommand('copy');
                    document.body.removeChild(tempInput);
                    alert('✅ Enlace copiado al portapapeles');
                });
            }
        };
    }

    // Botón de like - CORREGIDO
    const likeBtn = document.getElementById('likeBtn');
    if (likeBtn) {
        likeBtn.onclick = () => {
            // Obtener votos actuales
            const votes = JSON.parse(localStorage.getItem("appsmart_votes") || "{}");
            
            // Verificar si ya dio like
            if (votes[app.id] && votes[app.id].liked) {
                console.log('Ya has dado like a esta app');
                return;
            }
            
            console.log('Dando like a la app:', app.id);
            
            // Actualizar en Firebase
            db.collection("apps").doc(app.id).update({
                likes: firebase.firestore.FieldValue.increment(1)
            }).then(() => {
                // Actualizar localStorage
                votes[app.id] = { liked: true };
                localStorage.setItem("appsmart_votes", JSON.stringify(votes));
                
                // Actualizar botón
                const newLikes = (app.likes || 0) + 1;
                likeBtn.textContent = `❤️ Ya te gusta (${newLikes})`;
                likeBtn.disabled = true;
                
                console.log('Like registrado correctamente');
                
                // Actualizar estadísticas en pantalla
                const statsElement = document.getElementById('detailStats');
                if (statsElement) {
                    const descargas = app.descargasReales ?? app.descargas ?? 0;
                    statsElement.textContent = 
                        `📥 Descargas: ${descargas.toLocaleString("es-ES")} • ❤️ Likes: ${newLikes.toLocaleString("es-ES")}`;
                }
                
            }).catch(error => {
                console.error('Error al dar like:', error);
                alert('❌ Error al registrar el like. Intenta de nuevo.');
            });
        };
    }
}

// ====== Reseñas ======
function renderReviewStars() {
    const container = document.getElementById('reviewStars');
    if (!container) return;
    
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const btn = document.createElement('button');
        btn.textContent = '☆';
        btn.className = 'star-btn';
        btn.onclick = () => setReviewStars(i);
        container.appendChild(btn);
    }
}

function setReviewStars(n) {
    reviewStarsSelected = n;
    const stars = document.querySelectorAll('#reviewStars .star-btn');
    stars.forEach((star, index) => {
        star.textContent = index < n ? '★' : '☆';
    });
}

function loadReviews(appId) {
    const container = document.getElementById('reviewsList');
    if (!container) return;
    
    container.innerHTML = '<p>⏳ Cargando reseñas...</p>';
    
    db.collection("apps").doc(appId).collection("reviews")
        .orderBy("timestamp", "desc")
        .limit(20)
        .get()
        .then(snap => {
            container.innerHTML = '';
            
            if (snap.empty) {
                container.innerHTML = '<p>No hay reseñas todavía. ¡Sé el primero en comentar! 😊</p>';
                return;
            }
            
            snap.forEach(doc => {
                const r = doc.data();
                const item = document.createElement('div');
                item.className = 'review-item';
                const starsStr = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
                item.innerHTML = `
                    <div class="review-stars">${starsStr}</div>
                    <div class="review-text">${r.comment}</div>
                    <div class="review-time">${new Date(r.timestamp).toLocaleDateString('es-ES')}</div>
                `;
                container.appendChild(item);
            });
        })
        .catch(error => {
            console.error("Error cargando reseñas:", error);
            container.innerHTML = '<p>❌ Error al cargar las reseñas.</p>';
        });
}

// ====== Enviar reseña ======
document.addEventListener('click', function(e) {
    if (e.target.id === 'sendReviewBtn' || e.target.closest('#sendReviewBtn')) {
        handleSendReview();
    }
});

function handleSendReview() {
    if (!currentApp) return;
    
    const reviewText = document.getElementById('reviewText');
    const text = reviewText?.value.trim() || '';
    
    if (reviewStarsSelected === 0) {
        alert("⚠️ Por favor, selecciona una puntuación con estrellas.");
        return;
    }
    
    if (text.length < 5) {
        alert("⚠️ Escribe un comentario más largo (mínimo 5 caracteres).");
        return;
    }
    
    const app = currentApp;
    const prevAvg = app.ratingAvg || 0;
    const prevCount = app.ratingCount || 0;
    const newCount = prevCount + 1;
    const newAvg = (prevAvg * prevCount + reviewStarsSelected) / newCount;
    const breakdown = app.starsBreakdown || {1:0,2:0,3:0,4:0,5:0};
    breakdown[reviewStarsSelected]++;
    
    // Crear batch para actualizar todo a la vez
    const appRef = db.collection("apps").doc(app.id);
    const reviewRef = appRef.collection("reviews").doc();
    const batch = db.batch();
    
    // Agregar reseña
    batch.set(reviewRef, { 
        stars: reviewStarsSelected, 
        comment: text, 
        timestamp: Date.now(),
        userId: 'anonymous'
    });
    
    // Actualizar estadísticas de la app
    batch.update(appRef, { 
        ratingAvg: newAvg, 
        ratingCount: newCount, 
        starsBreakdown: breakdown 
    });
    
    // Ejecutar batch
    batch.commit().then(() => {
        // Limpiar formulario
        if (reviewText) reviewText.value = '';
        reviewStarsSelected = 0;
        renderReviewStars();
        
        // Recargar reseñas
        loadReviews(app.id);
        
        // Actualizar datos locales
        app.ratingAvg = newAvg;
        app.ratingCount = newCount;
        app.starsBreakdown = breakdown;
        
        // Actualizar UI
        const ratingLabel = document.getElementById('ratingLabel');
        const starsRow = document.getElementById('starsRow');
        const ratingBig = document.getElementById('ratingBig');
        const ratingTotal = document.getElementById('ratingTotal');
        
        if (ratingLabel) {
            ratingLabel.textContent = `⭐ Valoración: ${newAvg.toFixed(1)} (${newCount} votos)`;
        }
        
        if (starsRow) {
            const full = Math.floor(newAvg);
            const half = newAvg % 1 >= 0.25 && newAvg % 1 < 0.75 ? 1 : 0;
            const empty = 5 - full - half;
            let stars = '';
            for (let i = 0; i < full; i++) stars += '<span class="star-static">★</span>';
            if (half) stars += '<span class="star-static">⯨</span>';
            for (let i = 0; i < empty; i++) stars += '<span class="star-static">☆</span>';
            starsRow.innerHTML = stars;
        }
        
        if (ratingBig) ratingBig.textContent = newAvg.toFixed(1);
        if (ratingTotal) ratingTotal.textContent = `${newCount} reseñas`;
        
        // Actualizar gráfico de barras
        Object.keys(breakdown).forEach(star => {
            const bar = document.getElementById(`bar${star}`);
            if (bar) {
                bar.style.width = `${(breakdown[star] / newCount) * 100}%`;
            }
        });
        
        alert("✅ ¡Tu reseña fue publicada! Gracias por tu opinión.");
        
    }).catch(error => {
        console.error("Error enviando reseña:", error);
        alert("❌ Error al enviar la reseña. Intenta de nuevo.");
    });
}

// ====== Funciones auxiliares ======
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ====== Error handling global ======
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error global:', msg, url, lineNo, columnNo, error);
    return false;
};
