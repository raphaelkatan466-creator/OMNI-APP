const state = {
  username: "Joueur Cyber", userAvatar: "🤖",
  pizzas: 0, clickPower: 1, pizzasPerSec: 0, omniPoints: 0,
  activeSkin: '🍕', unlockedSkins: ['🍕'],
  activeEffect: 'cyan', unlockedEffects: ['cyan'],
  secrets: [], capsules: [], titleClicks: 0, matrixMode: false, raveMode: false, crtMode: false
};

function chargerDonnees() {
  const save = localStorage.getItem("omni_app_full_save");

  if (save) {
    try {
      const donnees = JSON.parse(save);
      const { offresBoutique, ...donneesEtat } = donnees;

      Object.assign(state, donneesEtat);

      // Récupère les prix sauvegardés de la boutique
      if (Array.isArray(offresBoutique)) {
        offresBoutique.forEach(offreSauvee => {
          const offre = OFFRES_BOUTIQUE.find(
            item => item.id === offreSauvee.id
          );

          if (offre && Number.isFinite(offreSauvee.cost) && offreSauvee.cost > 0) {
            offre.cost = offreSauvee.cost;
          }
        });
      }
    } catch (erreur) {
      console.error("Erreur de chargement :", erreur);
    }
  }
}


function sauvegarderDonnees() {
  const donnees = {
    ...state,
    offresBoutique: OFFRES_BOUTIQUE.map(item => ({
      id: item.id,
      cost: item.cost
    }))
  };

  localStorage.setItem(
    "omni_app_full_save",
    JSON.stringify(donnees)
  );
}


function reinitialiserTout() {
  const confirmation = confirm(
    "Attention ! Tu vas supprimer toute ta progression OMNI-APP. Cette action est définitive. Continuer ?"
  );

  if (!confirmation) {
    return;
  }

  try {
    // Supprime uniquement la sauvegarde d'OMNI-APP
    localStorage.removeItem("omni_app_full_save");

    // Recharge l'application avec les valeurs de départ
    window.location.reload();
  } catch (erreur) {
    console.error("Erreur lors de la réinitialisation :", erreur);
    alert("Impossible de réinitialiser OMNI-APP. Réessaie.");
  }
}


// AUDIO DEVERROUILLE AUTOMATIQUEMENT
let audioCtx = null;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
window.addEventListener("click", initAudio, { once: true });
window.addEventListener("touchstart", initAudio, { once: true });

function jouerNote(freq, duration = 0.08, vol = 0.1) {
  if (!audioCtx) initAudio();
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
  } catch(e){}
}

// MATRIX & RAVE
let matrixCanvas, matrixCtx, matrixInterval;
const matrixChars = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let matrixDrops = [];

function initMatrixEngine() {
  matrixCanvas = document.getElementById("matrix-canvas");
  if (!matrixCanvas) return;
  matrixCtx = matrixCanvas.getContext("2d");
  matrixCanvas.width = window.innerWidth;
  matrixCanvas.height = window.innerHeight;
  const columns = Math.floor(matrixCanvas.width / 16);
  matrixDrops = [];
  for (let i = 0; i < columns; i++) matrixDrops[i] = Math.floor(Math.random() * -50);
}
function drawMatrixFrame() {
  if (!state.matrixMode || !matrixCtx) return;
  matrixCtx.fillStyle = "rgba(0, 0, 0, 0.05)";
  matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  matrixCtx.fillStyle = "#00ff66";
  matrixCtx.font = "14px monospace";
  for (let i = 0; i < matrixDrops.length; i++) {
    const text = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
    matrixCtx.fillText(text, i * 16, matrixDrops[i] * 16);
    if (matrixDrops[i] * 16 > matrixCanvas.height && Math.random() > 0.975) matrixDrops[i] = 0;
    matrixDrops[i]++;
  }
}
function toggleMatrix() {
  state.matrixMode = !state.matrixMode;
  document.body.classList.toggle("matrix-mode", state.matrixMode);
  if (state.matrixMode) {
    initMatrixEngine();
    if (!matrixInterval) matrixInterval = setInterval(drawMatrixFrame, 33);
  } else {
    if (matrixCtx) matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  }
}
function compterClicsTitre() {
  state.titleClicks++;
  if (state.titleClicks >= 5) {
    state.titleClicks = 0;
    toggleMatrix();
    alert("💻 MODE MATRIX ACTIVÉ !");
  }
}

let raveEmojiInterval;
function toggleRaveMode() {
  state.raveMode = !state.raveMode;
  document.body.classList.toggle("rave-active", state.raveMode);
  document.getElementById("rave-btn").innerText = state.raveMode ? "🟢 Mode Rave : ON" : "🔴 Mode Rave : OFF";
}
function toggleCRTMode() {
  state.crtMode = !state.crtMode;
  document.getElementById("crt-overlay").style.display = state.crtMode ? "block" : "none";
}

function changerAvatar() {
  const avatars = ["🤖", "👽", "👑", "🦊", "🥷", "🦁", "👾"];
  state.userAvatar = avatars[(avatars.indexOf(state.userAvatar) + 1 || 0) % avatars.length];
  document.getElementById("profile-avatar").innerText = state.userAvatar;
  sauvegarderDonnees();
}
function sauvegarderProfil() {
  state.username = document.getElementById("username-input").value || "Joueur Cyber";
  sauvegarderDonnees();
}


// ============================================
// PIZZA CLICKER — NEXOR ULTIMATE EDITION
// ============================================

// EFFET VISUEL AU POINT EXACT DU CLIC

function afficherEffetClicPizza(e) {
  const pizzaEl = document.getElementById("pizza-gigante");
  if (!pizzaEl) return;

  const rect = pizzaEl.getBoundingClientRect();

  const x = Number.isFinite(e?.clientX)
    ? e.clientX
    : rect.left + rect.width / 2;

  const y = Number.isFinite(e?.clientY)
    ? e.clientY
    : rect.top + rect.height / 2;

  const effect = document.createElement("div");
  effect.className = "omni-click-effect";
  effect.style.left = `${x}px`;
  effect.style.top = `${y}px`;
  effect.setAttribute("aria-hidden", "true");

  // Cercle lumineux
  const ring = document.createElement("span");
  ring.className = "omni-click-ring";
  effect.appendChild(ring);

  // Nombre exact de pizzas gagnées
  const number = document.createElement("span");
  number.className = "omni-click-number";
  number.textContent =
    `+${state.clickPower.toLocaleString("fr-FR")} 🍕`;
  effect.appendChild(number);

  // Six particules lumineuses
  for (let i = 0; i < 6; i++) {
    const particle = document.createElement("span");
    particle.className = "omni-click-particle";

    particle.style.setProperty(
      "--particle-angle",
      `${i * 60}deg`
    );

    effect.appendChild(particle);
  }

  document.body.appendChild(effect);

  // Nettoyage automatique de l'effet
  setTimeout(() => effect.remove(), 950);
}


// CLIQUER SUR LA PIZZA

function cliquerPizza(e) {

  // Ajouter les pizzas gagnées
  state.pizzas += state.clickPower;

  // Afficher l'effet au niveau du curseur
  afficherEffetClicPizza(e);

  // Actualiser les statistiques
  rafraichirAffichagePizza();

  // Sauvegarder la progression
  sauvegarderDonnees();

  // Son du clic
  jouerNote(400, 0.05, 0.05);

  // Animation de la pizza
  const pizzaEl = document.getElementById("pizza-gigante");

  if (pizzaEl) {
    pizzaEl.classList.add("clicked");

    setTimeout(() => {
      pizzaEl.classList.remove("clicked");
    }, 100);
  }
}


// ACTUALISATION DES STATISTIQUES

function rafraichirAffichagePizza() {

  const score = document.getElementById("score-pieces");
  const production = document.getElementById("pieces-par-seconde");
  const puissance = document.getElementById("click-power-display");
  const points = document.getElementById("omni-points-display");

  if (score) {
    score.innerText = Math.floor(state.pizzas).toLocaleString("fr-FR");
  }

  if (production) {
    production.innerText = state.pizzasPerSec.toLocaleString("fr-FR");
  }

  if (puissance) {
    puissance.innerText = state.clickPower.toLocaleString("fr-FR");
  }

  if (points) {
    points.innerText = state.omniPoints.toLocaleString("fr-FR");
  }

  genererInterfaceBoutique();
}


// ============================================
// 16 TYPES D'AMÉLIORATIONS
// ============================================

const OFFRES_BOUTIQUE = [

  // DÉBUTANT

  {
    id: 1,
    icon: "👆",
    type: "PUISSANCE DE CLIC",
    name: "Super Clic",
    cost: 15,
    power: 1,
    cps: 0,
    desc: "+1 pizza par clic"
  },

  {
    id: 2,
    icon: "🚴",
    type: "PRODUCTION AUTOMATIQUE",
    name: "Livreur à Vélo",
    cost: 50,
    power: 0,
    cps: 1,
    desc: "+1 pizza par seconde"
  },

  {
    id: 3,
    icon: "🧀",
    type: "PUISSANCE DE CLIC",
    name: "Sauce Premium",
    cost: 150,
    power: 2,
    cps: 0,
    desc: "+2 pizzas par clic"
  },

  {
    id: 4,
    icon: "🔥",
    type: "PRODUCTION AUTOMATIQUE",
    name: "Four à Bois Turbo",
    cost: 500,
    power: 0,
    cps: 5,
    desc: "+5 pizzas par seconde"
  },

  // INTERMÉDIAIRE

  {
    id: 5,
    icon: "🍕",
    type: "PUISSANCE DE CLIC",
    name: "Double Mozzarella",
    cost: 1200,
    power: 6,
    cps: 0,
    desc: "+6 pizzas par clic"
  },

  {
    id: 6,
    icon: "🛵",
    type: "PRODUCTION AUTOMATIQUE",
    name: "Scooter Turbo",
    cost: 3200,
    power: 0,
    cps: 15,
    desc: "+15 pizzas par seconde"
  },

  {
    id: 7,
    icon: "⚙️",
    type: "PUISSANCE DE CLIC",
    name: "Presse Quantique",
    cost: 8000,
    power: 25,
    cps: 0,
    desc: "+25 pizzas par clic"
  },

  {
    id: 8,
    icon: "🌋",
    type: "PRODUCTION AUTOMATIQUE",
    name: "Four Plasma",
    cost: 22000,
    power: 0,
    cps: 70,
    desc: "+70 pizzas par seconde"
  },

  // AVANCÉ

  {
    id: 9,
    icon: "👨‍🍳",
    type: "PUISSANCE DE CLIC",
    name: "Chef Cyber",
    cost: 60000,
    power: 150,
    cps: 0,
    desc: "+150 pizzas par clic"
  },

  {
    id: 10,
    icon: "🏭",
    type: "PRODUCTION AUTOMATIQUE",
    name: "Usine à Pizzas",
    cost: 180000,
    power: 0,
    cps: 450,
    desc: "+450 pizzas par seconde"
  },

  {
    id: 11,
    icon: "🤖",
    type: "PUISSANCE DE CLIC",
    name: "Clone Cuisinier",
    cost: 500000,
    power: 900,
    cps: 0,
    desc: "+900 pizzas par clic"
  },

  {
    id: 12,
    icon: "🌀",
    type: "PRODUCTION AUTOMATIQUE",
    name: "Portail Interdimensionnel",
    cost: 1500000,
    power: 0,
    cps: 3500,
    desc: "+3 500 pizzas par seconde"
  },

  // LÉGENDAIRE

  {
    id: 13,
    icon: "🛰️",
    type: "PUISSANCE DE CLIC",
    name: "Satellite Gastronomique",
    cost: 5000000,
    power: 8000,
    cps: 0,
    desc: "+8 000 pizzas par clic"
  },

  {
    id: 14,
    icon: "🌌",
    type: "PRODUCTION AUTOMATIQUE",
    name: "Dimension Fromagère",
    cost: 18000000,
    power: 0,
    cps: 45000,
    desc: "+45 000 pizzas par seconde"
  },

  {
    id: 15,
    icon: "👑",
    type: "PUISSANCE DE CLIC",
    name: "Empire Galactique",
    cost: 65000000,
    power: 100000,
    cps: 0,
    desc: "+100 000 pizzas par clic"
  },

  {
    id: 16,
    icon: "⚛️",
    type: "PRODUCTION AUTOMATIQUE",
    name: "Réacteur Quantique",
    cost: 250000000,
    power: 0,
    cps: 700000,
    desc: "+700 000 pizzas par seconde"
  }

];


// ============================================
// AFFICHAGE DE LA BOUTIQUE
// ============================================

function genererInterfaceBoutique() {

  const grid = document.getElementById("shop-container");
  if (!grid) return;

  grid.innerHTML = OFFRES_BOUTIQUE.map(item => {

    const canAfford = state.pizzas >= item.cost;

    return `
      <article class="shop-item ${canAfford ? "available" : ""}">

        <div class="shop-item-details">

          <div class="shop-item-icon">
            ${item.icon}
          </div>

          <div class="shop-item-copy">

            <span class="shop-item-type">
              ${item.type}
            </span>

            <strong>${item.name}</strong>

            <small>${item.desc}</small>

            <span class="shop-item-cost">
              ${item.cost.toLocaleString("fr-FR")} 🍕
            </span>

          </div>

        </div>

        <button
          class="shop-buy-btn"
          ${canAfford ? "" : "disabled"}
          onclick="acheterObjet(${item.id})">

          ${canAfford ? "ACHETER" : "VERROUILLÉ"}

        </button>

      </article>
    `;

  }).join("");

}


// ============================================
// ACHETER UNE AMÉLIORATION
// ============================================

function acheterObjet(id) {

  const item = OFFRES_BOUTIQUE.find(i => i.id === id);

  if (!item || state.pizzas < item.cost) return;

  // Payer le prix
  state.pizzas -= item.cost;

  // Ajouter les bonus
  state.clickPower += item.power;
  state.pizzasPerSec += item.cps;

  // Augmenter le prix du prochain achat
  item.cost = Math.floor(item.cost * 1.25);

  // Actualiser et sauvegarder
  rafraichirAffichagePizza();
  sauvegarderDonnees();

  // Son de réussite
  jouerNote(700, 0.12, 0.08);

}


// CARTES RARES (BOOSTER)
function ouvrirBooster() {
  document.getElementById("booster-container").style.display = "none";
  document.getElementById("cards-selection-container").style.display = "block";
  jouerNote(600, 0.2, 0.1);
}
const cardsList = [
  "🐉 Dragon Cybernétique (Légendaire)",
  "🍕 Pizza Quantique d'Or (Mythique)",
  "⚡ Matrix Hacker (Rare)",
  "🛸 Soucoupe Volante Néon (Épique)"
];
function revelerCarte(id) {
  const card = cardsList[Math.floor(Math.random() * cardsList.length)];
  document.getElementById("cards-selection-container").style.display = "none";
  document.getElementById("card-result").style.display = "block";
  document.getElementById("card-result-name").innerText = "🎉 Tu as obtenu : " + card;
  jouerNote(800, 0.3, 0.2);
}
function reinitialiserBooster() {
  document.getElementById("booster-container").style.display = "block";
  document.getElementById("cards-selection-container").style.display = "none";
  document.getElementById("card-result").style.display = "none";
}


// SIMON SAYS — COMPTEUR ET RECORD PERSONNEL

let simonSeq = [];
let simonUserStep = 0;
let simonPlaying = false;

let simonCurrentScore = 0;
let simonBestScore = 0;

let simonInterval = null;
let simonSequenceTimeout = null;

// Charger le record sauvegardé
function initialiserScoresSimon() {
  try {
    const sauvegarde = Number.parseInt(
      localStorage.getItem("omni_simon_best_score") || "0",
      10
    );

    simonBestScore = Number.isFinite(sauvegarde)
      ? Math.max(0, sauvegarde)
      : 0;
  } catch (error) {
    simonBestScore = 0;
  }

  actualiserAffichageScoresSimon();
}

// Actualiser les deux compteurs
function actualiserAffichageScoresSimon() {
  const scoreElement = document.getElementById("simon-round-score");
  const recordElement = document.getElementById("simon-best-score");

  if (scoreElement) {
    scoreElement.textContent = simonCurrentScore;
  }

  if (recordElement) {
    recordElement.textContent = simonBestScore;
  }
}

// Enregistrer un nouveau record
function enregistrerRecordSimon() {
  if (simonCurrentScore > simonBestScore) {
    simonBestScore = simonCurrentScore;

    try {
      localStorage.setItem(
        "omni_simon_best_score",
        String(simonBestScore)
      );
    } catch (error) {
      // Le record reste disponible pendant cette session.
    }
  }

  actualiserAffichageScoresSimon();
}

// Démarrer une nouvelle partie
function demarrerSimonGame() {
  if (simonInterval) clearInterval(simonInterval);
  if (simonSequenceTimeout) clearTimeout(simonSequenceTimeout);

  simonSeq = [Math.floor(Math.random() * 4)];
  simonUserStep = 0;
  simonCurrentScore = 0;

  actualiserAffichageScoresSimon();
  jouerSequenceSimon();
}

// Montrer la séquence
function jouerSequenceSimon() {
  simonPlaying = false;

  if (simonInterval) clearInterval(simonInterval);

  const status = document.getElementById("simon-status");

  if (status) {
    status.innerText = "👀 OBSERVE LA SÉQUENCE...";
  }

  let i = 0;

  simonInterval = setInterval(() => {
    flasherBoutonSimon(simonSeq[i]);
    i++;

    if (i >= simonSeq.length) {
      clearInterval(simonInterval);
      simonInterval = null;

      simonSequenceTimeout = setTimeout(() => {
        simonPlaying = true;
        simonSequenceTimeout = null;

        if (status) {
          status.innerText = "👉 À TON TOUR !";
        }
      }, 500);
    }
  }, 700);
}

// Faire clignoter un bouton
function flasherBoutonSimon(id) {
  const btn = document.getElementById("simon-" + id);

  if (!btn) return;

  btn.style.opacity = "0.3";

  setTimeout(() => {
    btn.style.opacity = "1";
  }, 300);
}

// Vérifier les réponses du joueur
function cliquerSimon(id) {
  if (!simonPlaying) return;

  flasherBoutonSimon(id);

  if (id === simonSeq[simonUserStep]) {
    simonUserStep++;

    // Séquence entièrement réussie !
    if (simonUserStep >= simonSeq.length) {

      simonCurrentScore++;

      // Vérifier et sauvegarder le record
      enregistrerRecordSimon();

      simonUserStep = 0;

      // Ajouter une nouvelle couleur
      simonSeq.push(Math.floor(Math.random() * 4));

      simonPlaying = false;

      simonSequenceTimeout = setTimeout(() => {
        simonSequenceTimeout = null;
        jouerSequenceSimon();
      }, 800);
    }

  } else {
    // Mauvaise réponse : fin de partie
    simonPlaying = false;

    if (simonInterval) {
      clearInterval(simonInterval);
      simonInterval = null;
    }

    if (simonSequenceTimeout) {
      clearTimeout(simonSequenceTimeout);
      simonSequenceTimeout = null;
    }

    const status = document.getElementById("simon-status");

    if (status) {
      status.innerText = "💥 PARTIE TERMINÉE !";
    }

    alert(
      "💥 Partie terminée !\n" +
      "🎯 Ton score : " + simonCurrentScore + "\n" +
      "🏆 Ton record : " + simonBestScore
    );
  }
}

// Afficher le record dès le chargement
initialiserScoresSimon();


// ROBOT IA
function envoyerMessageIA() {
  const input = document.getElementById("ai-user-input");
  const text = input.value.trim();
  if (!text) return;
  const chatBox = document.getElementById("ai-chat-box");
  const userMsg = document.createElement("div");
  userMsg.style.cssText = "background:var(--neon-blue); color:#0f172a; font-weight:bold; padding:8px 12px; border-radius:8px; align-self:flex-end; max-width:80%; font-size:13px;";
  userMsg.innerText = text;
  chatBox.appendChild(userMsg);
  input.value = "";

  setTimeout(() => {
    const aiMsg = document.createElement("div");
    aiMsg.style.cssText = "background:#1e293b; padding:8px 12px; border-radius:8px; align-self:flex-start; max-width:80%; font-size:13px;";
    aiMsg.innerHTML = `🤖 <strong>Cyber-Bot :</strong> J'ai bien analysé "${text}". Tu gères !`;
    chatBox.appendChild(aiMsg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 500);
}

// PAPIER BULLE & PIXEL ART
let isSwipingBubble = false;
function initPapierBulle() {
  const container = document.getElementById("bubble-wrap-container");
  if(!container) return;
  container.innerHTML = "";
  for (let i = 0; i < 40; i++) {
    const bubble = document.createElement("div");
    bubble.className = "bubble-item";
    const pop = () => {
      if (!bubble.classList.contains("popped")) {
        bubble.classList.add("popped");
        jouerNote(300, 0.04, 0.1);
      }
    };
    bubble.onmouseover = () => { if (isSwipingBubble) pop(); };
    bubble.onmousedown = pop;
    bubble.ontouchmove = (e) => {
      const touch = e.touches[0];
      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      if (elem && elem.classList.contains("bubble-item")) {
        elem.classList.add("popped");
        jouerNote(300, 0.04, 0.1);
      }
    };
    container.appendChild(bubble);
  }
}

let currentColor = "#38bdf8";
let isDrawingPixel = false;
const colorsList = ["#38bdf8", "#ef4444", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#ffffff", "#0f172a"];
function initPixelArtPro() {
  const palette = document.getElementById("palette-container");
  if(!palette) return;
  palette.innerHTML = "";
  colorsList.forEach((c, idx) => {
    const swatch = document.createElement("div");
    swatch.className = "color-swatch" + (idx === 0 ? " active" : "");
    swatch.style.background = c;
    if(c === "#0f172a") swatch.style.border = "1px solid #334155";
    swatch.onclick = () => {
      document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
      swatch.classList.add("active");
      currentColor = c;
    };
    palette.appendChild(swatch);
  });

  const grid = document.getElementById("pixel-grid");
  if(!grid) return;
  grid.innerHTML = "";
  for (let i = 0; i < 144; i++) {
    const cell = document.createElement("div");
    cell.style.width = "18px"; cell.style.height = "18px";
    cell.style.background = "#1e293b"; cell.style.borderRadius = "2px";
    cell.style.cursor = "pointer";
    const paint = () => { cell.style.background = currentColor; };
    cell.onmousedown = paint;
    cell.onmouseenter = () => { if (isDrawingPixel) paint(); };
    grid.appendChild(cell);
  }
}

// GRAFFITI & CHAT
let gCanvas, gCtx, isDrawing = false;
function initGraffiti() {
  gCanvas = document.getElementById("graffiti-canvas");
  if (!gCanvas) return;
  gCtx = gCanvas.getContext("2d");
  gCtx.strokeStyle = "#38bdf8";
  gCtx.lineWidth = 3;
  gCtx.lineCap = "round";

  const startDraw = (e) => { isDrawing = true; draw(e); };
  const stopDraw = () => { isDrawing = false; gCtx.beginPath(); };
  const draw = (e) => {
    if (!isDrawing) return;
    const rect = gCanvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    gCtx.lineTo(x, y);
    gCtx.stroke();
    gCtx.beginPath();
    gCtx.moveTo(x, y);
  };

  gCanvas.onmousedown = startDraw; gCanvas.onmouseup = stopDraw; gCanvas.onmousemove = draw;
  gCanvas.ontouchstart = startDraw; gCanvas.ontouchend = stopDraw; gCanvas.ontouchmove = draw;
}
function effacerGraffiti() { if (gCtx) gCtx.clearRect(0, 0, gCanvas.width, gCanvas.height); }

function envoyerChatCommunautaire() {
  const input = document.getElementById("community-input");
  const text = input.value.trim();
  if (!text) return;
  const chatBox = document.getElementById("community-chat-box");
  const msg = document.createElement("div");
  msg.style.cssText = "background:#1e293b; padding:6px 10px; border-radius:6px; font-size:13px;";
  msg.innerHTML = `<strong style="color:#22c55e;">Moi :</strong> ${text}`;
  chatBox.appendChild(msg);
  input.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;
}
function voterHumeur(humeur) { alert(`Humeur enregistrée : ${humeur} !`); }

// CITATIONS & DILEMMES
const aiSubjects = ["L'intelligence artificielle", "La matrice néon", "Le réseau quantique", "La pizza sacrée"];
const aiVerbs = ["illumine", "transcende", "recalibre", "harmonise"];
const aiContexts = ["les réalités virtuelles.", "le futur du Cyber-Espace.", "les possibilités de l'OmniApp."];
function genererCitationIA() {
  const sub = aiSubjects[Math.floor(Math.random() * aiSubjects.length)];
  const verb = aiVerbs[Math.floor(Math.random() * aiVerbs.length)];
  const ctx = aiContexts[Math.floor(Math.random() * aiContexts.length)];
  document.getElementById("citation-display").innerText = `« ${sub} ${verb} ${ctx} »`;
}

const dilemmesIADatabase = [
  { q: "🥐 Quel est le vrai nom sacré de cette viennoiserie ?", o1: "🥐 Pain au Chocolat", o2: "🍫 Chocolatine" },
  { q: "⚡ Quel pouvoir cyberpunk choisis-tu d'incarner ?", o1: "🦅 Voler dans les airs", o2: "👻 Invisibilité totale" },
  { q: "🍔 Que préfères-tu manger gratuitement à vie ?", o1: "🍕 Pizzas à volonté", o2: "🍔 Burgers gastronomiques" }
];
let currentDilemmeIndex = 0;
function chargerDilemmeIA() {
  const d = dilemmesIADatabase[currentDilemmeIndex % dilemmesIADatabase.length];
  if(document.getElementById("dilemme-question")) {
    document.getElementById("dilemme-question").innerText = "⚖️ " + d.q;
    document.getElementById("opt-1").innerText = d.o1;
    document.getElementById("opt-2").innerText = d.o2;
  }
}
function voterDilemme(choix) {
  const p1 = Math.floor(Math.random() * 40) + 30;
  document.getElementById("dilemme-options").style.display = "none";
  document.getElementById("dilemme-resultats").style.display = "block";
  document.getElementById("res-texte").innerHTML = `📊 Résultats :<br><span style="color:var(--neon-blue)">Choix 1 : ${p1}%</span> | <span style="color:var(--neon-gold)">Choix 2 : ${100 - p1}%</span>`;
}
function prochainDilemmeIA() {
  currentDilemmeIndex++;
  document.getElementById("dilemme-options").style.display = "flex";
  document.getElementById("dilemme-resultats").style.display = "none";
  chargerDilemmeIA();
}

// CAPSULES & SECRETS
function creerCapsule() {
  const txt = document.getElementById("capsule-text").value.trim();
  if (!txt) return;
  const delay = parseInt(document.getElementById("capsule-delay").value);
  const unlockTime = Date.now() + delay * 60000;
  state.capsules.push({ text: txt, unlockTime });
  document.getElementById("capsule-text").value = "";
  afficherCapsules();
  sauvegarderDonnees();
  alert("📦 Capsule verrouillée avec succès !");
}
function afficherCapsules() {
  const container = document.getElementById("capsules-list");
  if(!container) return;
  container.innerHTML = state.capsules.map((c) => {
    const locked = Date.now() < c.unlockTime;
    return `<div class="card" style="border-color:${locked ? '#ef4444' : 'var(--neon-green)'};">
      <h4 style="color:${locked ? '#ef4444' : 'var(--neon-green)'};">${locked ? '🔒 Capsule Verrouillée' : '🔓 Capsule Déverrouillée !'}</h4>
      <p>${locked ? '<i>Message scellé... Revenez plus tard !</i>' : c.text}</p>
    </div>`;
  }).join("");
}

function publierSecret() {
  const txt = document.getElementById("secret-input").value.trim();
  if (!txt) return;
  state.secrets.unshift(txt);
  document.getElementById("secret-input").value = "";
  afficherSecrets();
  sauvegarderDonnees();
}
function afficherSecrets() {
  const container = document.getElementById("secrets-list");
  if(!container) return;
  container.innerHTML = state.secrets.map(s => `
    <div class="card" style="border-color:var(--neon-blue);">
      <p style="font-size:16px; margin:0;">🤫 "${s}"</p>
    </div>
  `).join("");
}

function detruireSouciGeant() {
  const textarea = document.getElementById("vent-input");
  if (!textarea || !textarea.value.trim()) return;
  textarea.style.transition = "transform 0.8s ease, opacity 0.8s ease";
  textarea.style.transform = "scale(0) rotate(720deg)";
  textarea.style.opacity = "0";
  setTimeout(() => {
    textarea.value = "";
    textarea.style.transform = "none";
    textarea.style.opacity = "1";
    alert("🌌 Ton souci a été définitivement anéanti dans le néant cosmique !");
  }, 800);
}

// BOUTIQUE COSMÉTIQUE
const SKINS_LIST = [
  { id: '🍕', name: 'Pizza Classique', cost: 0 },
  { id: '👑', name: 'Pizza Royale', cost: 50 },
  { id: '🌌', name: 'Pizza Cosmique', cost: 100 }
];
const EFFECTS_LIST = [
  { id: 'cyan', name: 'Étincelles Cyan', cost: 0 },
  { id: 'fire', name: 'Flammes 🔥', cost: 40 }
];
function genererBoutiqueCosmetique() {
  const grid = document.getElementById("pizza-skins-grid");
  if(grid) {
    grid.innerHTML = SKINS_LIST.map(s => {
      const owned = state.unlockedSkins.includes(s.id);
      return `<div class="cosmetic-card ${owned ? 'owned' : ''}">
        <span style="font-size:45px;">${s.id}</span>
        <h4 style="margin:10px 0 5px 0;">${s.name}</h4>
        <p style="color:var(--neon-gold); font-size:13px; margin:0 0 10px 0;">${s.cost} ⭐</p>
        ${owned ? 
          `<button class="music-btn" onclick="equiperSkin('${s.id}')">${state.activeSkin === s.id ? 'Équipé ✅' : 'Équiper'}</button>` :
          `<button class="btn" style="padding:6px; font-size:13px;" onclick="acheterSkin('${s.id}',${s.cost})">Acheter</button>`
        }
      </div>`;
    }).join("");
  }
}
function acheterSkin(id, cost) {
  if (state.omniPoints >= cost) {
    state.omniPoints -= cost;
    state.unlockedSkins.push(id);
    equiperSkin(id);
    genererBoutiqueCosmetique();
    rafraichirAffichagePizza();
    sauvegarderDonnees();
  } else alert("Points OMNI ⭐ insuffisants !");
}
function equiperSkin(id) {
  state.activeSkin = id;
  const pizzaEl = document.getElementById("pizza-gigante");
  if(pizzaEl) pizzaEl.innerText = id;
  genererBoutiqueCosmetique();
  sauvegarderDonnees();
}


// ROUE OMNI
let wheelCanvas, wheelCtx;
let isSpinning = false;
let wheelRotation = 0;

// Chaque segment possède sa propre récompense
const rewards = [
  { label: "+100 ⭐", type: "omni", amount: 100 },
  { label: "Rien... 😢", type: "nothing", amount: 0 },
  { label: "+500 🍕", type: "pizza", amount: 500 },
  { label: "+10 ⭐", type: "omni", amount: 10 },
  { label: "LÉGENDAIRE +50 ⭐", type: "omni", amount: 50 },
  { label: "Rien !", type: "nothing", amount: 0 }
];

function ouvrirGrandeRoue() {
  document.getElementById("wheel-modal").style.display = "flex";
  dessinerRoue();
}

function fermerGrandeRoue() {
  document.getElementById("wheel-modal").style.display = "none";
}

function dessinerRoue() {
  wheelCanvas = document.getElementById("wheel-canvas");
  if (!wheelCanvas) return;

  wheelCtx = wheelCanvas.getContext("2d");

  const numOptions = rewards.length;
  const arcSize = (2 * Math.PI) / numOptions;

  const colors = [
    "#ef4444", "#38bdf8", "#a855f7",
    "#eab308", "#22c55e", "#ec4899"
  ];

  wheelCtx.clearRect(0, 0, 320, 320);

  for (let i = 0; i < numOptions; i++) {
    wheelCtx.beginPath();
    wheelCtx.fillStyle = colors[i];
    wheelCtx.moveTo(160, 160);
    wheelCtx.arc(160, 160, 150, i * arcSize, (i + 1) * arcSize);
    wheelCtx.fill();

    wheelCtx.save();
    wheelCtx.translate(160, 160);
    wheelCtx.rotate(i * arcSize + arcSize / 2);
    wheelCtx.fillStyle = "white";
    wheelCtx.font = "bold 12px sans-serif";
    wheelCtx.fillText(rewards[i].label, 50, 5);
    wheelCtx.restore();
  }
}

function tournerLaGrandeRoue() {
  if (isSpinning || !wheelCanvas) return;

  isSpinning = true;

  // Choisir le segment gagnant
  const rewardIndex = Math.floor(Math.random() * rewards.length);
  const reward = rewards[rewardIndex];

  // Calculer l'angle pour placer le segment choisi sous
  // le pointeur situé en haut de la roue
  const segmentAngle = 360 / rewards.length;
  const centerAngle = rewardIndex * segmentAngle + segmentAngle / 2;
  const targetAngle = (270 - centerAngle + 360) % 360;

  const currentAngle = wheelRotation % 360;
  const extraAngle = (targetAngle - currentAngle + 360) % 360;

  wheelRotation += 360 * 8 + extraAngle;

  wheelCanvas.style.transform = `rotate(${wheelRotation}deg)`;

  setTimeout(() => {
    // Attribuer exactement la récompense sélectionnée
    if (reward.type === "omni") {
      state.omniPoints += reward.amount;
    } else if (reward.type === "pizza") {
      state.pizzas += reward.amount;
    }

    rafraichirAffichagePizza();
    sauvegarderDonnees();

    isSpinning = false;

    if (reward.type === "omni") {
      alert(`🎉 Bravo ! Tu remportes ${reward.amount} Points OMNI ⭐ !`);
    } else if (reward.type === "pizza") {
      alert(`🍕 Super ! Tu remportes ${reward.amount} pizzas !`);
    } else {
      alert("😢 Pas de récompense cette fois-ci !");
    }

    fermerGrandeRoue();
  }, 4200);
}


function switchTab(tabId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
  const p = document.getElementById("page-" + tabId);
  const b = document.getElementById("btn-" + tabId);
  if(p) p.classList.add("active");
  if(b) b.classList.add("active");
}

window.onload = () => {
  chargerDonnees();
  initMatrixEngine();
  initPapierBulle();
  initPixelArtPro();
  initGraffiti();
  chargerDilemmeIA();
  genererBoutiqueCosmetique();
  afficherCapsules();
  afficherSecrets();
  rafraichirAffichagePizza();
  
  const pizzaEl = document.getElementById("pizza-gigante");
  if(pizzaEl) pizzaEl.innerText = state.activeSkin;
};

window.addEventListener("resize", () => {
  if (matrixCanvas) {
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;
  }
});

setInterval(() => {
  state.playTimeSeconds = (state.playTimeSeconds || 0) + 1;
  if (state.pizzasPerSec > 0) {
    state.pizzas += state.pizzasPerSec;
    rafraichirAffichagePizza();
  }
  sauvegarderDonnees();
}, 1000);

/* ==========================================
   OMNI-APP — ARCADE NAVIGATION + SNAKE CYBER
========================================== */

// Jeux actuellement programmés
const omniJeuxDisponibles = ["simon", "snake"];

// Ouvrir un mini-jeu depuis le menu
function ouvrirMiniJeu(nom) {
  if (!omniJeuxDisponibles.includes(nom)) {
    alert("🚧 Ce mini-jeu arrive dans une prochaine mise à jour !");
    return;
  }

  arreterMiniJeuActif();

  const menu = document.getElementById("omni-arcade-menu");
  const stage = document.getElementById("omni-game-stage");

  if (!menu || !stage) return;

  menu.hidden = true;
  stage.hidden = false;

  document.querySelectorAll("#omni-game-stage .omni-game-panel")
    .forEach(panel => panel.hidden = true);

  const panneau = document.getElementById("omni-game-" + nom);

  if (panneau) {
    panneau.hidden = false;
  }

  if (nom === "simon" && typeof initialiserScoresSimon === "function") {
    initialiserScoresSimon();
  }
}

// Revenir au menu de l'Arcade
function retourMenuArcade() {
  arreterMiniJeuActif();

  const menu = document.getElementById("omni-arcade-menu");
  const stage = document.getElementById("omni-game-stage");

  if (menu) menu.hidden = false;
  if (stage) stage.hidden = true;
}

// Arrêter proprement le jeu actif
function arreterMiniJeuActif() {
  arreterSnake(false);

  if (typeof simonPlaying !== "undefined") {
    simonPlaying = false;
  }

  if (typeof simonInterval !== "undefined" && simonInterval) {
    clearInterval(simonInterval);
    simonInterval = null;
  }

  if (typeof simonSequenceTimeout !== "undefined" && simonSequenceTimeout) {
    clearTimeout(simonSequenceTimeout);
    simonSequenceTimeout = null;
  }
}


/* ==========================================
   SNAKE CYBER
========================================== */

const SNAKE_TAILLE_CASE = 18;
const SNAKE_NOMBRE_CASES = 20;

let snakeCorps = [];
let snakeDirection = "right";
let snakeProchaineDirection = "right";
let snakeNourriture = { x: 15, y: 10 };
let snakeScore = 0;
let snakeRecord = 0;
let snakeEnCours = false;
let snakeInterval = null;

// Récupérer le canvas
function obtenirCanvasSnake() {
  const canvas = document.getElementById("snake-canvas");
  if (!canvas) return null;

  return canvas.getContext("2d");
}

// Lire le record personnel
function chargerRecordSnake() {
  try {
    const valeur = Number.parseInt(
      localStorage.getItem("omni_snake_best") || "0",
      10
    );

    snakeRecord = Number.isFinite(valeur)
      ? Math.max(0, valeur)
      : 0;
  } catch (error) {
    snakeRecord = 0;
  }

  actualiserScoresSnake();
}

// Actualiser les statistiques
function actualiserScoresSnake() {
  const scoreElement = document.getElementById("snake-score");
  const recordElement = document.getElementById("snake-best");

  if (scoreElement) {
    scoreElement.textContent = snakeScore;
  }

  if (recordElement) {
    recordElement.textContent = snakeRecord;
  }
}

// Créer une nourriture à un emplacement libre
function placerNourritureSnake() {
  let position;
  let essais = 0;

  do {
    position = {
      x: Math.floor(Math.random() * SNAKE_NOMBRE_CASES),
      y: Math.floor(Math.random() * SNAKE_NOMBRE_CASES)
    };

    essais++;
  } while (
    snakeCorps.some(partie =>
      partie.x === position.x && partie.y === position.y
    ) && essais < 500
  );

  snakeNourriture = position;
}

// Dessiner le terrain et le serpent
function dessinerSnake() {
  const canvas = document.getElementById("snake-canvas");
  const ctx = obtenirCanvasSnake();

  if (!canvas || !ctx) return;

  const taille = SNAKE_TAILLE_CASE;
  const total = SNAKE_NOMBRE_CASES * taille;

  // Fond
  ctx.clearRect(0, 0, total, total);
  ctx.fillStyle = "#050b18";
  ctx.fillRect(0, 0, total, total);

  // Grille
  ctx.strokeStyle = "rgba(56, 232, 255, 0.09)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= total; i += taille) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, total);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(total, i);
    ctx.stroke();
  }

  // Nourriture
  const fx = snakeNourriture.x * taille + taille / 2;
  const fy = snakeNourriture.y * taille + taille / 2;

  ctx.save();
  ctx.shadowColor = "#f472b6";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#ff5da8";
  ctx.beginPath();
  ctx.arc(fx, fy, taille * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Serpent
  snakeCorps.forEach((partie, index) => {
    const marge = index === 0 ? 1 : 2;

    ctx.save();

    if (index === 0) {
      ctx.fillStyle = "#b8ffff";
      ctx.shadowColor = "#38e8ff";
      ctx.shadowBlur = 16;
    } else {
      ctx.fillStyle = `hsl(${165 + index * 2}, 90%, ${55 - Math.min(index, 15)}%)`;
    }

    ctx.fillRect(
      partie.x * taille + marge,
      partie.y * taille + marge,
      taille - marge * 2,
      taille - marge * 2
    );

    ctx.restore();
  });
}

// Démarrer une nouvelle partie
function demarrerSnake() {
  if (snakeInterval) {
    clearInterval(snakeInterval);
    snakeInterval = null;
  }

  snakeCorps = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];

  snakeDirection = "right";
  snakeProchaineDirection = "right";
  snakeScore = 0;
  snakeEnCours = true;

  placerNourritureSnake();
  actualiserScoresSnake();
  dessinerSnake();

  snakeInterval = setInterval(avancerSnake, 125);
}

// Modifier la direction avec le clavier ou les boutons
function changerDirectionSnake(direction) {
  if (!snakeEnCours) return;

  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  const nouvelle = directions[direction];
  const actuelle = directions[snakeProchaineDirection];

  if (!nouvelle || !actuelle) return;

  // Interdire le demi-tour direct
  if (
    nouvelle.x === -actuelle.x &&
    nouvelle.y === -actuelle.y
  ) {
    return;
  }

  snakeProchaineDirection = direction;
}

// Faire avancer le serpent
function avancerSnake() {
  if (!snakeEnCours || snakeCorps.length === 0) return;

  snakeDirection = snakeProchaineDirection;

  const mouvements = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  const mouvement = mouvements[snakeDirection];
  const tete = snakeCorps[0];

  const nouvelleTete = {
    x: tete.x + mouvement.x,
    y: tete.y + mouvement.y
  };

  // Collision avec les murs
  if (
    nouvelleTete.x < 0 ||
    nouvelleTete.x >= SNAKE_NOMBRE_CASES ||
    nouvelleTete.y < 0 ||
    nouvelleTete.y >= SNAKE_NOMBRE_CASES
  ) {
    terminerSnake();
    return;
  }

  const mange = (
    nouvelleTete.x === snakeNourriture.x &&
    nouvelleTete.y === snakeNourriture.y
  );

  // Collision avec le corps
  const corpsAVerifier = mange
    ? snakeCorps
    : snakeCorps.slice(0, -1);

  const collision = corpsAVerifier.some(partie =>
    partie.x === nouvelleTete.x &&
    partie.y === nouvelleTete.y
  );

  if (collision) {
    terminerSnake();
    return;
  }

  snakeCorps.unshift(nouvelleTete);

  if (mange) {
    snakeScore += 10;

    if (snakeScore > snakeRecord) {
      snakeRecord = snakeScore;

      try {
        localStorage.setItem(
          "omni_snake_best",
          String(snakeRecord)
        );
      } catch (error) {
        // Le record reste en mémoire pour cette session.
      }

    }

    placerNourritureSnake();
    actualiserScoresSnake();

  } else {
    snakeCorps.pop();
  }

  dessinerSnake();
}

// Fin de partie
function terminerSnake() {
  if (!snakeEnCours) return;

  snakeEnCours = false;

  if (snakeInterval) {
    clearInterval(snakeInterval);
    snakeInterval = null;
  }

  dessinerSnake();

  alert(
    "🐍 FIN DE PARTIE !\n\n" +
    "🎯 Ton score : " + snakeScore + "\n" +
    "🏆 Ton record : " + snakeRecord
  );
}

// Arrêter Snake sans afficher de message
function arreterSnake(redessiner = false) {
  snakeEnCours = false;

  if (snakeInterval) {
    clearInterval(snakeInterval);
    snakeInterval = null;
  }

  if (redessiner) {
    dessinerSnake();
  }
}

// Contrôles clavier : flèches ou ZQSD
document.addEventListener("keydown", function(event) {
  const panneauSnake = document.getElementById("omni-game-snake");

  if (!panneauSnake || panneauSnake.hidden || !snakeEnCours) {
    return;
  }

  if (
    event.target &&
    ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
  ) {
    return;
  }

  const touches = {
    ArrowUp: "up",
    z: "up",
    Z: "up",
    ArrowDown: "down",
    s: "down",
    S: "down",
    ArrowLeft: "left",
    q: "left",
    Q: "left",
    ArrowRight: "right",
    d: "right",
    D: "right"
  };

  const direction = touches[event.key];

  if (direction) {
    event.preventDefault();
    changerDirectionSnake(direction);
  }
});

// Charger le record dès le démarrage
chargerRecordSnake();

// Arrêter les jeux lorsqu'on quitte l'onglet Arcade
document.addEventListener("click", function(event) {
  const boutonNavigation = event.target.closest(
    ".bottom-nav .nav-item, .more-menu-item"
  );

  if (
    boutonNavigation &&
    boutonNavigation.id !== "btn-arcade"
  ) {
    arreterMiniJeuActif();
  }
});
