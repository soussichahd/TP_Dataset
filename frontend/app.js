const API = 'http://localhost:3000';

// ── Couleurs par freeway 
const FREEWAY_COLORS = {
  '101': '#f97316',  // orange
  '85':  '#22c55e',  // vert
  '87':  '#a78bfa',  // violet
  '880': '#38bdf8',  // bleu ciel
  '280': '#fb7185',  // rose
  '680': '#facc15',  // jaune
  '237': '#2dd4bf',  // teal
  '17':  '#f472b6',  // rose chaud
};
const DEFAULT_COLOR = '#7d7d7d';

//function pour retourner la couleur d'une freeway donnée, ou une couleur par défaut si la freeway n'est pas dans FREEWAY_COLORS
function fwColor(fw) {
  return FREEWAY_COLORS[String(fw)] || DEFAULT_COLOR;
}

// creation de carte avec latitude 37.35 et longitude -121.95 et zom 11
const map = L.map('map', { zoomControl: true }).setView([37.35, -121.95], 11);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd', maxZoom: 19
}).addTo(map);

// ── État global 
let allCapteurs   = [];//contiendra tous les capteurs récupérés depuis l’API.
let allMarkers    = [];  //contient les markers Leaflet affichés sur la carte.
let activeFreeway = null;//utiliser pour le filtre avec freeway 
let activeDir     = null;//utiliser pour le filtre avec direction

//Chargement depuis l'API
async function loadCapteurs() {
  const res  = await fetch(`${API}/api/capteurs`);
  allCapteurs = await res.json();

  document.getElementById('sensor-count').textContent =
    `${allCapteurs.length} capteurs chargés`;

  buildFilters();
  renderMarkers();
}

async function fetchAndStore() {
  const btn = document.getElementById('loadBtn');
  btn.disabled = true;
  btn.textContent = 'Chargement…';
  await fetch(`${API}/api/load`, { method: 'POST' });
  await loadCapteurs();
  btn.disabled = false;
  btn.textContent = '⟳ Charger les capteurs';
}

// ── Rendu des markers ─────────────────────────────────────────────────────
function renderMarkers() {
  // Retirer les anciens
  allMarkers.forEach(({ marker }) => map.removeLayer(marker));
  allMarkers = [];
   //filtrer les capteurs selon les filtres actifs (freeway et direction)
  const visible = allCapteurs.filter(c => {
    if (activeFreeway && String(c.freeway) !== activeFreeway) return false;
    if (activeDir     && c.direction !== activeDir)           return false;
    return true;
  });

  visible.forEach(c => {
    if (!c.latitude || !c.longitude) return;
    const color = fwColor(c.freeway);
    
    const marker = L.circleMarker([c.latitude, c.longitude], {
      radius:      7,
      color:       '#fff',
      weight:      1.5,
      fillColor:   color,
      fillOpacity: 0.9,
    }).addTo(map);


    //ajouter une popup à chaque marker avec les informations du capteur
    marker.bindPopup(`
      <div class="popup-fw-badge" style="background:${color}20;color:${color};border:1px solid ${color}50">
        Freeway ${c.freeway}
      </div>
      <div class="popup-title">Capteur #${c.sensorId}</div>
      <div class="popup-row"><span>Direction</span><span>${c.direction || '—'}</span></div>
      <div class="popup-row"><span>Postmile</span><span>${c.postmile || '—'}</span></div>
      <div class="popup-row"><span>Latitude</span><span>${c.latitude}</span></div>
      <div class="popup-row"><span>Longitude</span><span>${c.longitude}</span></div>
      <div class="popup-row"><span>Longueur</span><span>${c.length_km} km</span></div>
      <div class="popup-row"><span>Voies</span><span>${c.lanes}</span></div>
    `);

    allMarkers.push({ marker, capteur: c });
  });
}

//Construction des filtres sidebar 
function buildFilters() {
  // Freeway
  const fwCounts = {};
  //calcule de nombre de capteurs par freeway 
  allCapteurs.forEach(c => {
    fwCounts[c.freeway] = (fwCounts[c.freeway] || 0) + 1;
  });

  const fwContainer = document.getElementById('freeway-filters');
  fwContainer.innerHTML = '';
//creer une button pour chaque freeway, avec la couleur correspondante et le nombre de capteurs, et ajouter un event listener pour appliquer le filtre lors du clic
  Object.entries(fwCounts)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([fw, count]) => {
      const color = fwColor(fw);
      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (activeFreeway === fw ? ' active' : '');
      btn.dataset.fw = fw;
      btn.innerHTML = `
        <span class="dot" style="background:${color};box-shadow:0 0 6px ${color}80"></span>
        <span>Freeway ${fw}</span>
        <span class="count">${count}</span>
      `;
      btn.addEventListener('click', () => toggleFreeway(fw));//appliquer le filtre
      fwContainer.appendChild(btn);
    });

  // Direction
  const dirCounts = {};
  //calculer le nombre de compteur par freeway
  allCapteurs.forEach(c => {
    dirCounts[c.direction] = (dirCounts[c.direction] || 0) + 1;
  });

  const dirLabels = { N: 'Nord', S: 'Sud', E: 'Est', W: 'Ouest' };
  const dirContainer = document.getElementById('direction-filters');
  dirContainer.innerHTML = '';

  Object.entries(dirCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([dir, count]) => {//creer une button pour chaque dir
      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (activeDir === dir ? ' active' : '');
      btn.dataset.dir = dir;
      btn.innerHTML = `
        <span class="dir-badge">${dir}</span>
        <span>${dirLabels[dir] || dir}</span>
        <span class="count">${count}</span>
      `;
      btn.addEventListener('click', () => toggleDir(dir));//appliquer le filtre
      dirContainer.appendChild(btn);
    });
}

function toggleFreeway(fw) {
  activeFreeway = activeFreeway === fw ? null : fw;
  buildFilters();
  renderMarkers();
}

function toggleDir(dir) {
  activeDir = activeDir === dir ? null : dir;
  buildFilters();
  renderMarkers();
}

function resetFilters() {
  activeFreeway = null;
  activeDir     = null;
  buildFilters();
  renderMarkers();
}

// Chargement initial
loadCapteurs();
