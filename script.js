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

      if (donneesEtat && typeof donneesEtat === "object") Object.assign(state, donneesEtat);

      if (!Array.isArray(state.unlockedSkins)) state.unlockedSkins = ["🍕"];
      if (!Array.isArray(state.unlockedEffects)) state.unlockedEffects = ["cyan"];
      if (!Array.isArray(state.secrets)) state.secrets = [];
      if (!Array.isArray(state.capsules)) state.capsules = [];
      if (!state.unlockedSkins.includes("🍕")) state.unlockedSkins.unshift("🍕");
      if (!state.unlockedEffects.includes("cyan")) state.unlockedEffects.unshift("cyan");
      if (!state.unlockedSkins.includes(state.activeSkin)) state.activeSkin = "🍕";
      if (!state.unlockedEffects.includes(state.activeEffect)) state.activeEffect = "cyan";
      ["pizzas", "clickPower", "pizzasPerSec", "omniPoints", "playTimeSeconds"].forEach(key => {
        const value = Number(state[key]);
        state[key] = Number.isFinite(value) && value >= 0 ? value : (key === "clickPower" ? 1 : 0);
      });

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

  try {
    localStorage.setItem("omni_app_full_save", JSON.stringify(donnees));
  } catch (erreur) {
    console.error("Impossible de sauvegarder OMNI-APP :", erreur);
  }
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
    [
  "omni_app_full_save",
  "omni_simon_best_score",
  "omni_snake_best",
  "omni_memory_best_moves",
  "omni_memory_last_back_motif",
  "omni_reflex_best",
  "omni_reflex_target_best",
  "omni_reflex_keyboard_best",
  "omni_space_best",
  "omni_quiz_best"
].forEach(cle => localStorage.removeItem(cle));

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
    if (matrixInterval) {
      clearInterval(matrixInterval);
      matrixInterval = null;
    }
    if (matrixCtx && matrixCanvas) {
      matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    }
  }
  sauvegarderDonnees();
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
  const button = document.getElementById("rave-btn");
  if (button) button.textContent = state.raveMode ? "🟢 Mode Rave : ON" : "🔴 Mode Rave : OFF";
  sauvegarderDonnees();
}
function toggleCRTMode() {
  state.crtMode = !state.crtMode;
  const overlay = document.getElementById("crt-overlay");
  if (overlay) overlay.style.display = state.crtMode ? "block" : "none";
  sauvegarderDonnees();
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
  effect.dataset.effect = EFFECTS_LIST.some(item => item.id === state.activeEffect)
    ? state.activeEffect
    : "cyan";
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
    const aiLabel = document.createElement("strong");
    aiLabel.textContent = "🤖 Cyber-Bot : ";
    aiMsg.append(aiLabel, document.createTextNode(`J'ai bien analysé "${text}". Tu gères !`));
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
  const author = document.createElement("strong");
  author.style.color = "#22c55e";
  author.textContent = "Moi : ";
  msg.append(author, document.createTextNode(text));
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
let capsuleRefreshTimer = null;

function programmerActualisationCapsules() {
  if (capsuleRefreshTimer !== null) clearTimeout(capsuleRefreshTimer);
  capsuleRefreshTimer = null;

  const prochainsDeblocages = state.capsules
    .map(capsule => Number(capsule?.unlockTime))
    .filter(temps => Number.isFinite(temps) && temps > Date.now());

  if (!prochainsDeblocages.length) return;

  const prochain = Math.min(...prochainsDeblocages);
  capsuleRefreshTimer = setTimeout(() => {
    capsuleRefreshTimer = null;
    afficherCapsules();
  }, Math.min(Math.max(50, prochain - Date.now() + 25), 2147483647));
}

function creerCapsule() {
  const input = document.getElementById("capsule-text");
  const select = document.getElementById("capsule-delay");
  if (!input || !select) return;

  const txt = input.value.trim();
  const delay = Number.parseInt(select.value, 10);
  if (!txt || !Number.isFinite(delay) || delay <= 0) return;

  state.capsules.push({ text: txt, unlockTime: Date.now() + delay * 60000 });
  input.value = "";
  afficherCapsules();
  sauvegarderDonnees();
  alert("📦 Capsule verrouillée avec succès !");
}

function afficherCapsules() {
  const container = document.getElementById("capsules-list");
  if (!container) return;

  container.replaceChildren();
  const maintenant = Date.now();

  state.capsules.forEach(capsule => {
    if (!capsule || typeof capsule !== "object") return;

    const verrouillee = Number(capsule.unlockTime) > maintenant;
    const card = document.createElement("div");
    card.className = "card";
    card.style.borderColor = verrouillee ? "#ef4444" : "var(--neon-green)";

    const titre = document.createElement("h4");
    titre.style.color = verrouillee ? "#ef4444" : "var(--neon-green)";
    titre.textContent = verrouillee ? "🔒 Capsule Verrouillée" : "🔓 Capsule Déverrouillée !";

    const message = document.createElement("p");
    if (verrouillee) {
      const italic = document.createElement("i");
      italic.textContent = "Message scellé... Revenez plus tard !";
      message.appendChild(italic);
    } else {
      message.textContent = String(capsule.text ?? "");
    }

    card.append(titre, message);
    container.appendChild(card);
  });

  programmerActualisationCapsules();
}

function publierSecret() {
  const input = document.getElementById("secret-input");
  if (!input) return;

  const txt = input.value.trim();
  if (!txt) return;

  state.secrets.unshift(txt);
  input.value = "";
  afficherSecrets();
  sauvegarderDonnees();
}

function afficherSecrets() {
  const container = document.getElementById("secrets-list");
  if (!container) return;

  container.replaceChildren();
  state.secrets.forEach(secret => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.borderColor = "var(--neon-blue)";

    const message = document.createElement("p");
    message.style.fontSize = "16px";
    message.style.margin = "0";
    message.textContent = `🤫 "${String(secret ?? "")}"`;

    card.appendChild(message);
    container.appendChild(card);
  });
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
  if (grid) {
    grid.innerHTML = SKINS_LIST.map(s => {
      const owned = state.unlockedSkins.includes(s.id);
      return `<div class="cosmetic-card ${owned ? "owned" : ""}">
        <span style="font-size:45px;">${s.id}</span>
        <h4 style="margin:10px 0 5px 0;">${s.name}</h4>
        <p style="color:var(--neon-gold); font-size:13px; margin:0 0 10px 0;">${s.cost} ⭐</p>
        ${owned
          ? `<button class="music-btn" type="button" onclick="equiperSkin('${s.id}')">${state.activeSkin === s.id ? "Équipé ✅" : "Équiper"}</button>`
          : `<button class="btn" type="button" style="padding:6px; font-size:13px;" onclick="acheterSkin('${s.id}',${s.cost})">Acheter</button>`
        }
      </div>`;
    }).join("");
  }

  const effectsGrid = document.getElementById("click-effects-grid");
  if (effectsGrid) {
    effectsGrid.innerHTML = EFFECTS_LIST.map(effect => {
      const owned = state.unlockedEffects.includes(effect.id);
      const equipped = state.activeEffect === effect.id;
      return `<div class="cosmetic-card ${owned ? "owned" : ""}">
        <span class="cosmetic-effect-preview effect-preview-${effect.id}" aria-hidden="true">✦</span>
        <h4 style="margin:10px 0 5px 0;">${effect.name}</h4>
        <p style="color:var(--neon-gold); font-size:13px; margin:0 0 10px 0;">${effect.cost} ⭐</p>
        ${owned
          ? `<button class="music-btn" type="button" onclick="equiperEffet('${effect.id}')">${equipped ? "Équipé ✅" : "Équiper"}</button>`
          : `<button class="btn" type="button" style="padding:6px; font-size:13px;" onclick="acheterEffet('${effect.id}')">Acheter</button>`
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
  if (!SKINS_LIST.some(skin => skin.id === id) || !state.unlockedSkins.includes(id)) return;
  state.activeSkin = id;
  const pizzaEl = document.getElementById("pizza-gigante");
  if (pizzaEl) pizzaEl.textContent = id;
  genererBoutiqueCosmetique();
  sauvegarderDonnees();
}

function acheterEffet(id) {
  const effet = EFFECTS_LIST.find(item => item.id === id);
  if (!effet || state.unlockedEffects.includes(id)) return;

  if (state.omniPoints < effet.cost) {
    alert("Points OMNI ⭐ insuffisants !");
    return;
  }

  state.omniPoints -= effet.cost;
  state.unlockedEffects.push(id);
  state.activeEffect = id;
  genererBoutiqueCosmetique();
  rafraichirAffichagePizza();
  sauvegarderDonnees();
}

function equiperEffet(id) {
  if (!EFFECTS_LIST.some(effet => effet.id === id) || !state.unlockedEffects.includes(id)) return;
  state.activeEffect = id;
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
    // Restaurer le profil sauvegardé
  const usernameInput = document.getElementById("username-input");
  const profileAvatar = document.getElementById("profile-avatar");

  if (usernameInput) {
    usernameInput.value = state.username;
  }

  if (profileAvatar) {
    profileAvatar.textContent = state.userAvatar;
  }
  initMatrixEngine();

  document.body.classList.toggle("matrix-mode", Boolean(state.matrixMode));
  document.body.classList.toggle("rave-active", Boolean(state.raveMode));
  const raveButton = document.getElementById("rave-btn");
  if (raveButton) raveButton.textContent = state.raveMode ? "🟢 Mode Rave : ON" : "🔴 Mode Rave : OFF";
  const crtOverlay = document.getElementById("crt-overlay");
  if (crtOverlay) crtOverlay.style.display = state.crtMode ? "block" : "none";
  if (state.matrixMode && !matrixInterval) matrixInterval = setInterval(drawMatrixFrame, 33);

  initPapierBulle();
  initPixelArtPro();
  initGraffiti();
  chargerDilemmeIA();
  genererBoutiqueCosmetique();
  afficherCapsules();
  afficherSecrets();
  rafraichirAffichagePizza();
  
  const pizzaEl = document.getElementById("pizza-gigante");
  if (pizzaEl) pizzaEl.textContent = state.activeSkin;
  actualiserAffichageScoresSimon();
  afficherScoreSnake();
  actualiserAffichageMemory();
};

window.addEventListener("resize", () => {
  if (!matrixCanvas) return;
  if (state.matrixMode) initMatrixEngine();
  else {
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
const omniJeuxDisponibles = ["simon", "snake", "memory", "reflex", "pong", "2048", "morpion", "space", "quiz"];



// Ouvrir un mini-jeu depuis le menu
function ouvrirMiniJeu(nom) {
  if (!omniJeuxDisponibles.includes(nom)) {
    alert("🚧 Ce mini-jeu arrive dans une prochaine mise à jour !");
    return;
  }

  // Arrêter le jeu précédent
  arreterMiniJeuActif();

  const menu = document.getElementById("omni-arcade-menu");
  const stage = document.getElementById("omni-game-stage");

  if (!menu || !stage) return;

  menu.hidden = true;
  stage.hidden = false;

  // Cacher tous les panneaux
  document.querySelectorAll("#omni-game-stage .omni-game-panel")
    .forEach(panel => panel.hidden = true);

  // Afficher le jeu sélectionné
  const panneau = document.getElementById("omni-game-" + nom);

  if (panneau) {
    panneau.hidden = false;
  }

  // Initialiser Memory
  if (nom === "memory") {
    demarrerMemory();
  }

  // Initialiser Simon
  if (nom === "simon") {
    initialiserScoresSimon();
  }

  // Initialiser Snake
  if (nom === "snake") {
    chargerRecordSnake();
  }

  if (nom === "reflex") initialiserReflexe();
  if (nom === "pong") initialiserPong();
  if (nom === "2048") demarrer2048();
  if (nom === "morpion") recommencerMorpion();
  if (nom === "space") initialiserSpaceDodger();
  if (nom === "quiz") initialiserQuiz();
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
  // Arrêter Snake
  arreterSnake(false);

  // Arrêter Simon
  simonPlaying = false;

  if (simonInterval) {
    clearInterval(simonInterval);
    simonInterval = null;
  }

  if (simonSequenceTimeout) {
    clearTimeout(simonSequenceTimeout);
    simonSequenceTimeout = null;
  }

  // Arrêter Memory
  if (typeof arreterMemory === "function") {
    arreterMemory();
  }

  if (typeof arreterJeuxSecondaires === "function") {
    arreterJeuxSecondaires();
  }
}






// SNAKE CYBER — VERSION FLUIDE

const snakeCanvas = document.getElementById("snake-canvas");
const snakeCtx = snakeCanvas.getContext("2d");

snakeCanvas.width = 720;
snakeCanvas.height = 720;
snakeCanvas.style.width = "min(100%, 420px)";
snakeCanvas.style.height = "auto";

const SNAKE_CASE = 36;
const SNAKE_TAILLE = 20;
const SNAKE_VITESSE = 115;

let snakeCorps = [];
let snakeAncienCorps = [];
let snakeDirection = "right";
let snakeProchaineDirection = "right";
let snakeNourriture = { x: 12, y: 10 };
let snakeScore = 0;
let snakeRecord = Number(localStorage.getItem("omni_snake_best")) || 0;
let snakeEnCours = false;
let snakeAnimationFrame = null;
let snakeDernierPas = 0;
let snakeGameOver = false;

function chargerRecordSnake() {
  snakeRecord = Number(localStorage.getItem("omni_snake_best")) || 0;
  afficherScoreSnake();
}

function afficherScoreSnake() {
  const score = document.getElementById("snake-score");
  const record = document.getElementById("snake-best");

  if (score) score.textContent = snakeScore;
  if (record) record.textContent = snakeRecord;
}

function placerNourritureSnake() {
  let valide = false;

  while (!valide) {
    snakeNourriture = {
      x: Math.floor(Math.random() * SNAKE_TAILLE),
      y: Math.floor(Math.random() * SNAKE_TAILLE)
    };

    valide = !snakeCorps.some(
      morceau =>
        morceau.x === snakeNourriture.x &&
        morceau.y === snakeNourriture.y
    );
  }
}

function demarrerSnake() {
  arreterSnake();

  snakeCorps = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 }
  ];

  snakeAncienCorps = snakeCorps.map(p => ({ ...p }));
  snakeDirection = "right";
  snakeProchaineDirection = "right";
  snakeScore = 0;
  snakeGameOver = false;
  snakeEnCours = true;
  snakeDernierPas = 0;

  placerNourritureSnake();
  afficherScoreSnake();

  const status = document.getElementById("snake-status");
  if (status) status.textContent = "À toi de jouer !";

  snakeAnimationFrame = requestAnimationFrame(boucleSnake);
}

function changerDirectionSnake(direction) {
  const opposés = {
    up: "down",
    down: "up",
    left: "right",
    right: "left"
  };

  if (!snakeEnCours) return;
  if (opposés[direction] === snakeDirection) return;

  snakeProchaineDirection = direction;
}

function avancerSnake() {
  snakeDirection = snakeProchaineDirection;

  snakeAncienCorps = snakeCorps.map(p => ({ ...p }));

  const tete = { ...snakeCorps[0] };

  if (snakeDirection === "up") tete.y--;
  if (snakeDirection === "down") tete.y++;
  if (snakeDirection === "left") tete.x--;
  if (snakeDirection === "right") tete.x++;

  const mange = (
    tete.x === snakeNourriture.x &&
    tete.y === snakeNourriture.y
  );

  const corpsCollision = mange
    ? snakeCorps
    : snakeCorps.slice(0, -1);

  const collisionMur =
    tete.x < 0 || tete.x >= SNAKE_TAILLE ||
    tete.y < 0 || tete.y >= SNAKE_TAILLE;

  const collisionCorps = corpsCollision.some(
    p => p.x === tete.x && p.y === tete.y
  );

  if (collisionMur || collisionCorps) {
    terminerSnake();
    return;
  }

  snakeCorps.unshift(tete);

  if (mange) {
    snakeScore += 1;

    if (snakeScore > snakeRecord) {
      snakeRecord = snakeScore;
      localStorage.setItem("omni_snake_best", snakeRecord);
    }

    placerNourritureSnake();
    afficherScoreSnake();
  } else {
    snakeCorps.pop();
  }
}

function boucleSnake(temps) {
  if (!snakeEnCours) return;

  if (!snakeDernierPas) snakeDernierPas = temps;

  while (temps - snakeDernierPas >= SNAKE_VITESSE) {
    avancerSnake();
    snakeDernierPas += SNAKE_VITESSE;

    if (!snakeEnCours) return;
  }

  const progression = Math.min(
    1,
    (temps - snakeDernierPas) / SNAKE_VITESSE
  );

  dessinerSnake(progression);

  snakeAnimationFrame = requestAnimationFrame(boucleSnake);
}

function positionSnakeLisse(index, progression) {
  const actuel = snakeCorps[index];
  const ancien = snakeAncienCorps[index] || actuel;

  return {
    x: ancien.x + (actuel.x - ancien.x) * progression,
    y: ancien.y + (actuel.y - ancien.y) * progression
  };
}

function dessinerPommeSnake(x, y, temps) {
  const cx = (x + 0.5) * SNAKE_CASE;
  const cy = (y + 0.5) * SNAKE_CASE;
  const pulse = 1 + Math.sin(temps / 180) * 0.045;

  snakeCtx.save();
  snakeCtx.translate(cx, cy);
  snakeCtx.scale(pulse, pulse);

  snakeCtx.shadowColor = "#ff315f";
  snakeCtx.shadowBlur = 22;

  const pomme = snakeCtx.createRadialGradient(-8, -9, 2, 0, 0, 23);
  pomme.addColorStop(0, "#ffb4c5");
  pomme.addColorStop(0.35, "#ff416d");
  pomme.addColorStop(1, "#a90035");

  snakeCtx.fillStyle = pomme;
  snakeCtx.beginPath();
  snakeCtx.moveTo(0, -5);
  snakeCtx.bezierCurveTo(-22, -22, -25, 4, -12, 17);
  snakeCtx.bezierCurveTo(-5, 25, -1, 19, 0, 18);
  snakeCtx.bezierCurveTo(8, 24, 18, 17, 22, 3);
  snakeCtx.bezierCurveTo(28, -13, 11, -23, 0, -5);
  snakeCtx.fill();

  snakeCtx.shadowBlur = 0;

  snakeCtx.strokeStyle = "#75411f";
  snakeCtx.lineWidth = 5;
  snakeCtx.lineCap = "round";
  snakeCtx.beginPath();
  snakeCtx.moveTo(0, -12);
  snakeCtx.quadraticCurveTo(1, -23, 8, -26);
  snakeCtx.stroke();

  snakeCtx.fillStyle = "#70ef9a";
  snakeCtx.beginPath();
  snakeCtx.ellipse(12, -22, 9, 4, -0.55, 0, Math.PI * 2);
  snakeCtx.fill();

  snakeCtx.fillStyle = "#ffffff99";
  snakeCtx.beginPath();
  snakeCtx.ellipse(-10, -5, 4, 7, -0.5, 0, Math.PI * 2);
  snakeCtx.fill();

  snakeCtx.restore();
}

function dessinerSnake(progression = 1) {
  const temps = performance.now();
  const ctx = snakeCtx;
  const taille = snakeCanvas.width;

  ctx.clearRect(0, 0, taille, taille);

  const fond = ctx.createLinearGradient(0, 0, taille, taille);
  fond.addColorStop(0, "#07172a");
  fond.addColorStop(1, "#10112b");
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, taille, taille);

  ctx.strokeStyle = "#38bdf811";
  ctx.lineWidth = 1;

  for (let i = 0; i <= SNAKE_TAILLE; i++) {
    const pos = i * SNAKE_CASE;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, taille);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(taille, pos);
    ctx.stroke();
  }

  dessinerPommeSnake(
    snakeNourriture.x,
    snakeNourriture.y,
    temps
  );

  if (snakeCorps.length === 0) return;

  const positions = snakeCorps.map((_, i) =>
    positionSnakeLisse(i, progression)
  );

  // Corps lumineux et arrondi
  if (positions.length > 1) {
    const gradient = ctx.createLinearGradient(0, 0, taille, taille);
    gradient.addColorStop(0, "#a3ffca");
    gradient.addColorStop(0.5, "#28d98a");
    gradient.addColorStop(1, "#087b70");

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 27;
    ctx.strokeStyle = gradient;
    ctx.shadowColor = "#36ffad";
    ctx.shadowBlur = 16;

    ctx.beginPath();

    positions.forEach((p, i) => {
      const px = (p.x + 0.5) * SNAKE_CASE;
      const py = (p.y + 0.5) * SNAKE_CASE;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });

    ctx.stroke();
    ctx.restore();

    // Reflet sur le corps
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#e0fff477";

    ctx.beginPath();

    positions.forEach((p, i) => {
      const px = (p.x + 0.5) * SNAKE_CASE;
      const py = (p.y + 0.5) * SNAKE_CASE;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });

    ctx.stroke();
    ctx.restore();
  }

  // Tête
  const tete = positions[0];
  const hx = (tete.x + 0.5) * SNAKE_CASE;
  const hy = (tete.y + 0.5) * SNAKE_CASE;

  const teteGradient = ctx.createRadialGradient(
    hx - 7, hy - 8, 2, hx, hy, 22
  );
  teteGradient.addColorStop(0, "#e2ffe9");
  teteGradient.addColorStop(0.35, "#65ffc0");
  teteGradient.addColorStop(1, "#0da978");

  ctx.save();
  ctx.fillStyle = teteGradient;
  ctx.shadowColor = "#48ffbd";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(hx, hy, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Yeux orientés selon la direction
  let yeux = [];

  if (snakeDirection === "right") yeux = [[7, -7], [7, 7]];
  if (snakeDirection === "left") yeux = [[-7, -7], [-7, 7]];
  if (snakeDirection === "up") yeux = [[-7, -7], [7, -7]];
  if (snakeDirection === "down") yeux = [[-7, 7], [7, 7]];

  yeux.forEach(([ox, oy]) => {
    ctx.fillStyle = "#073b37";
    ctx.beginPath();
    ctx.arc(hx + ox, hy + oy, 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(hx + ox - 1, hy + oy - 1, 1.3, 0, Math.PI * 2);
    ctx.fill();
  });

  if (snakeGameOver) {
    ctx.fillStyle = "#050b1dcc";
    ctx.fillRect(0, 0, taille, taille);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px Arial";
    ctx.fillText("PARTIE TERMINÉE", taille / 2, taille / 2 - 12);

    ctx.fillStyle = "#63f5ff";
    ctx.font = "26px Arial";
    ctx.fillText(
      "Score : " + snakeScore,
      taille / 2,
      taille / 2 + 35
    );
  }
}

function terminerSnake() {
  snakeEnCours = false;
  snakeGameOver = true;

  if (snakeAnimationFrame) {
    cancelAnimationFrame(snakeAnimationFrame);
  }

  dessinerSnake(1);

  const status = document.getElementById("snake-status");
  if (status) status.textContent = "Partie terminée ! Relance une partie pour rejouer.";
}

function arreterSnake(redessiner = false) {
  snakeEnCours = false;

  if (snakeAnimationFrame) {
    cancelAnimationFrame(snakeAnimationFrame);
    snakeAnimationFrame = null;
  }

  if (redessiner && snakeCanvas) {
    dessinerSnake(1);
  }
}

// Commandes à la souris : orienter le serpent vers le curseur
snakeCanvas.addEventListener("pointermove", event => {
  if (!snakeEnCours || snakeCorps.length === 0) return;

  const rect = snakeCanvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (snakeCanvas.width / rect.width);
  const y = (event.clientY - rect.top) * (snakeCanvas.height / rect.height);

  const tete = snakeCorps[0];
  const dx = x - (tete.x + 0.5) * SNAKE_CASE;
  const dy = y - (tete.y + 0.5) * SNAKE_CASE;

  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    changerDirectionSnake(dx > 0 ? "right" : "left");
  } else {
    changerDirectionSnake(dy > 0 ? "down" : "up");
  }
});

// Commandes au clavier : flèches et ZQSD
document.addEventListener("keydown", event => {
  const panneau = document.getElementById("omni-game-snake");

  if (!panneau || panneau.hidden || !snakeEnCours) return;

  const directions = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    z: "up",
    Z: "up",
    s: "down",
    S: "down",
    q: "left",
    Q: "left",
    d: "right",
    D: "right"
  };

  if (directions[event.key]) {
    event.preventDefault();
    changerDirectionSnake(directions[event.key]);
  }
});

chargerRecordSnake();

/* ==========================================
   OMNI-APP — MEMORY MATRIX
========================================== */

let memoryCartes = [];
let memorySelection = [];
let memoryVerrouille = false;

let memoryCoups = 0;
let memoryPairesTrouvees = 0;
let memoryTimeout = null;

let memoryMeilleurScore =
  Number(localStorage.getItem("omni_memory_best_moves")) || 0;
// ============================================
// OMNI FUTURE — COLLECTION DE 30 MOTIFS
// ============================================

const MEMORY_MOTIFS = [

  // ⚡ FAMILLE ÉLECTRIQUE
  { id: "electric-01", famille: "electric", primaire: "#38bdf8", secondaire: "#1d4ed8", decoration: "⚡" },
  { id: "electric-02", famille: "electric", primaire: "#00e5ff", secondaire: "#2563eb", decoration: "✦" },
  { id: "electric-03", famille: "electric", primaire: "#60a5fa", secondaire: "#1e40af", decoration: "ϟ" },
  { id: "electric-04", famille: "electric", primaire: "#22d3ee", secondaire: "#0e7490", decoration: "◇" },
  { id: "electric-05", famille: "electric", primaire: "#818cf8", secondaire: "#4338ca", decoration: "✧" },

  // 🌈 FAMILLE HOLOGRAPHIQUE
  { id: "holo-01", famille: "holographic", primaire: "#c084fc", secondaire: "#ec4899", decoration: "✧" },
  { id: "holo-02", famille: "holographic", primaire: "#e879f9", secondaire: "#8b5cf6", decoration: "◇" },
  { id: "holo-03", famille: "holographic", primaire: "#a78bfa", secondaire: "#22d3ee", decoration: "⟡" },
  { id: "holo-04", famille: "holographic", primaire: "#f0abfc", secondaire: "#6366f1", decoration: "❖" },
  { id: "holo-05", famille: "holographic", primaire: "#c4b5fd", secondaire: "#db2777", decoration: "✺" },

  // 💻 FAMILLE TECHNOLOGIQUE
  { id: "tech-01", famille: "circuit", primaire: "#22c55e", secondaire: "#0f766e", decoration: "⌘" },
  { id: "tech-02", famille: "circuit", primaire: "#34d399", secondaire: "#065f46", decoration: "⊞" },
  { id: "tech-03", famille: "circuit", primaire: "#2dd4bf", secondaire: "#155e75", decoration: "▦" },
  { id: "tech-04", famille: "circuit", primaire: "#84cc16", secondaire: "#166534", decoration: "◉" },
  { id: "tech-05", famille: "circuit", primaire: "#38bdf8", secondaire: "#075985", decoration: "⌬" },

  // 🌌 FAMILLE COSMIQUE
  { id: "cosmic-01", famille: "cosmic", primaire: "#818cf8", secondaire: "#312e81", decoration: "✧" },
  { id: "cosmic-02", famille: "cosmic", primaire: "#c084fc", secondaire: "#4c1d95", decoration: "☾" },
  { id: "cosmic-03", famille: "cosmic", primaire: "#60a5fa", secondaire: "#1e3a8a", decoration: "✦" },
  { id: "cosmic-04", famille: "cosmic", primaire: "#e879f9", secondaire: "#701a75", decoration: "◌" },
  { id: "cosmic-05", famille: "cosmic", primaire: "#a5b4fc", secondaire: "#3730a3", decoration: "✺" },

  // 🔥 FAMILLE ÉNERGÉTIQUE
  { id: "energy-01", famille: "energy", primaire: "#f97316", secondaire: "#9a3412", decoration: "✹" },
  { id: "energy-02", famille: "energy", primaire: "#fb7185", secondaire: "#9f1239", decoration: "✧" },
  { id: "energy-03", famille: "energy", primaire: "#facc15", secondaire: "#a16207", decoration: "✴" },
  { id: "energy-04", famille: "energy", primaire: "#ef4444", secondaire: "#7f1d1d", decoration: "⬡" },
  { id: "energy-05", famille: "energy", primaire: "#f472b6", secondaire: "#9d174d", decoration: "❋" },

  // 🪙 FAMILLE MÉTALLIQUE
  { id: "metal-01", famille: "metal", primaire: "#cbd5e1", secondaire: "#475569", decoration: "◈" },
  { id: "metal-02", famille: "metal", primaire: "#94a3b8", secondaire: "#334155", decoration: "✦" },
  { id: "metal-03", famille: "metal", primaire: "#e2e8f0", secondaire: "#64748b", decoration: "⬡" },
  { id: "metal-04", famille: "metal", primaire: "#a1a1aa", secondaire: "#52525b", decoration: "⌘" },
  { id: "metal-05", famille: "metal", primaire: "#f8fafc", secondaire: "#64748b", decoration: "❖" }

];


// MÉMORISER LE MOTIF PRÉCÉDENT
let memoryMotifPrecedent = null;
let memoryMotifActuel = null;


// CHOISIR UN MOTIF SANS RÉPÉTER LE PRÉCÉDENT
function choisirMotifMemory() {

  if (memoryMotifPrecedent === null) {
    try {
      memoryMotifPrecedent =
        localStorage.getItem("omni_memory_last_back_motif");
    } catch (erreur) {
      memoryMotifPrecedent = "";
    }
  }

  const motifsDisponibles = MEMORY_MOTIFS.filter(
    motif => motif.id !== memoryMotifPrecedent
  );

  const collection = motifsDisponibles.length
    ? motifsDisponibles
    : MEMORY_MOTIFS;

  const choix = collection[
    Math.floor(Math.random() * collection.length)
  ];

  memoryMotifPrecedent = choix.id;

  try {
    localStorage.setItem(
      "omni_memory_last_back_motif",
      choix.id
    );
  } catch (erreur) {
    // Le motif reste utilisable pendant cette session.
  }

  return choix;
}

// AFFICHER LES STATISTIQUES
function actualiserAffichageMemory() {
  const coups = document.getElementById("memory-moves");
  const paires = document.getElementById("memory-pairs");
  const record = document.getElementById("memory-best");

  if (coups) coups.textContent = memoryCoups;
  if (paires) paires.textContent = memoryPairesTrouvees;

  if (record) {
    record.textContent = memoryMeilleurScore
      ? `${memoryMeilleurScore} coups`
      : "--";
  }
}


// MÉLANGER LES CARTES
function melangerCartesMemory(cartes) {
  for (let i = cartes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cartes[i], cartes[j]] = [cartes[j], cartes[i]];
  }

  return cartes;
}


// DÉMARRER UNE NOUVELLE PARTIE
function demarrerMemory() {

  const grille = document.getElementById("memory-grid");
  const statut = document.getElementById("memory-status");

  if (!grille) return;

  if (memoryTimeout !== null) {
    clearTimeout(memoryTimeout);
    memoryTimeout = null;
  }

  // Choisir un nouveau dos de carte OMNI
  memoryMotifActuel = choisirMotifMemory();

  // Les 8 cartes originales
  const cartesBase = [
    { symbole: "✦", nom: "NOVA", code: "NX-01", couleur: "#38bdf8" },
    { symbole: "◈", nom: "PHANTOM", code: "NX-02", couleur: "#a855f7" },
    { symbole: "⬡", nom: "PULSE", code: "NX-03", couleur: "#22c55e" },
    { symbole: "⟡", nom: "ORBIT", code: "NX-04", couleur: "#f59e0b" },
    { symbole: "◎", nom: "CORE", code: "NX-05", couleur: "#ec4899" },
    { symbole: "⌘", nom: "GLITCH", code: "NX-06", couleur: "#06b6d4" },
    { symbole: "△", nom: "QUANTUM", code: "NX-07", couleur: "#ef4444" },
    { symbole: "✧", nom: "ECLIPSE", code: "NX-08", couleur: "#c084fc" }
  ];

  // Créer les 16 cartes et les mélanger
  memoryCartes = melangerCartesMemory(
    [...cartesBase, ...cartesBase].map(carte => ({
      ...carte,
      trouvee: false
    }))
  );

  memorySelection = [];
  memoryVerrouille = false;
  memoryCoups = 0;
  memoryPairesTrouvees = 0;

  // Générer les cartes
  grille.innerHTML = memoryCartes.map((carte, index) => {

    const decalageX = Math.round((Math.random() - 0.5) * 220);
    const decalageY = Math.round((Math.random() - 0.5) * 160);
    const rotation = Math.round((Math.random() - 0.5) * 100);

    return `
      <button
        type="button"
        class="omni-memory-card"
        data-memory-index="${index}"
        aria-label="Retourner la carte ${index + 1}"
        style="
          --deal-index: ${index};
          --shuffle-x: ${decalageX}px;
          --shuffle-y: ${decalageY}px;
          --shuffle-rotation: ${rotation}deg;
        "
        onclick="retournerCarteMemory(${index})"
      >

        <span
          class="memory-card-back"
          data-memory-family="${memoryMotifActuel.famille}"
          style="
            --back-primary: ${memoryMotifActuel.primaire};
            --back-secondary: ${memoryMotifActuel.secondaire};
          "
        >
          <span class="memory-back-pattern" aria-hidden="true">
            ${memoryMotifActuel.decoration}
          </span>

          <span class="memory-back-question" aria-hidden="true">
            ?
          </span>
        </span>

        <span
          class="memory-card-symbol"
          style="--card-accent: ${carte.couleur};"
        >
          <span class="memory-trading-card">

            <span class="memory-card-topline">
              <span>${carte.code}</span>
              <span>✦</span>
            </span>

            <span class="memory-card-art">
              ${carte.symbole}
            </span>

            <span class="memory-card-name">
              ${carte.nom}
            </span>

            <span class="memory-card-bottomline">
              OMNI • COLLECTIBLE
            </span>

          </span>
        </span>

      </button>
    `;

  }).join("");

  if (statut) {
    statut.textContent =
      `✨ Nouveau design OMNI : ${memoryMotifActuel.id} ! Trouve les 8 paires.`;
  }

  actualiserAffichageMemory();
}


// RETOURNER UNE CARTE
function retournerCarteMemory(index) {

  if (memoryVerrouille) return;

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= memoryCartes.length
  ) return;

  const carte = memoryCartes[index];

  if (!carte || carte.trouvee) return;
  if (memorySelection.includes(index)) return;

  const grille = document.getElementById("memory-grid");

  const bouton = grille?.querySelector(
    `[data-memory-index="${index}"]`
  );

  if (!bouton) return;

  bouton.classList.add("is-flipped");
  memorySelection.push(index);

  // Deux cartes sont retournées
  if (memorySelection.length === 2) {

    memoryCoups++;
    actualiserAffichageMemory();

    const [premiereIndex, deuxiemeIndex] = memorySelection;

    const premiere = memoryCartes[premiereIndex];
    const deuxieme = memoryCartes[deuxiemeIndex];

    // LES DEUX CARTES SONT IDENTIQUES
    if (premiere.symbole === deuxieme.symbole) {

      premiere.trouvee = true;
      deuxieme.trouvee = true;

      const boutonA = grille.querySelector(
        `[data-memory-index="${premiereIndex}"]`
      );

      const boutonB = grille.querySelector(
        `[data-memory-index="${deuxiemeIndex}"]`
      );

      boutonA?.classList.add("is-flipped", "is-matched");
      boutonB?.classList.add("is-flipped", "is-matched");

      memoryPairesTrouvees++;
      memorySelection = [];

      const statut = document.getElementById("memory-status");

      if (statut) {
        statut.textContent = "✨ Paire trouvée ! Elle est conservée !";
      }

      actualiserAffichageMemory();

      if (memoryPairesTrouvees === 8) {
        terminerMemory();
      }

    } else {

      // LES DEUX CARTES SONT DIFFÉRENTES
      memoryVerrouille = true;

      const statut = document.getElementById("memory-status");

      if (statut) {
        statut.textContent = "❌ Pas de correspondance. Réessaie !";
      }

      const cartesAretourner = [...memorySelection];

      memoryTimeout = setTimeout(() => {

        cartesAretourner.forEach(carteIndex => {

          const carteBouton = grille.querySelector(
            `[data-memory-index="${carteIndex}"]`
          );

          carteBouton?.classList.remove("is-flipped");

        });

        memorySelection = [];
        memoryVerrouille = false;
        memoryTimeout = null;

        if (statut) {
          statut.textContent = "À toi de jouer ! Trouve les autres paires.";
        }

      }, 800);
    }
  }
}


// FIN DE PARTIE
function terminerMemory() {
  const statut = document.getElementById("memory-status");

  let nouveauRecord = false;

  if (
    memoryMeilleurScore === 0 ||
    memoryCoups < memoryMeilleurScore
  ) {
    memoryMeilleurScore = memoryCoups;

    localStorage.setItem(
      "omni_memory_best_moves",
      String(memoryMeilleurScore)
    );

    nouveauRecord = true;
  }

  if (statut) {
    statut.textContent = nouveauRecord
      ? `🏆 NOUVEAU RECORD ! ${memoryCoups} coups pour trouver les 8 paires !`
      : `🎉 BRAVO ! Tu as trouvé les 8 paires en ${memoryCoups} coups !`;
  }

  actualiserAffichageMemory();
}


// ARRÊTER LE MEMORY
function arreterMemory() {
  if (memoryTimeout !== null) {
    clearTimeout(memoryTimeout);
    memoryTimeout = null;
  }

  memorySelection = [];
  memoryVerrouille = true;
}


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



/* =========================================================
   OMNI-APP ARCADE — JEUX COMPLÉMENTAIRES
   Développement local : aucune donnée n'est envoyée à un serveur.
========================================================= */

function omniLireRecord(cle) {
  try {
    const valeur = Number.parseInt(localStorage.getItem(cle) || "0", 10);
    return Number.isFinite(valeur) && valeur >= 0 ? valeur : 0;
  } catch (erreur) {
    return 0;
  }
}

function omniSauverRecord(cle, valeur) {
  try {
    localStorage.setItem(cle, String(valeur));
  } catch (erreur) {
    console.warn("Le record ne peut pas être sauvegardé sur cet appareil.", erreur);
  }
}

function omniStatutJeu(id, texte, parent) {
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement("p");
    element.id = id;
    element.className = "omni-game-feedback";
    element.setAttribute("aria-live", "polite");
    if (parent) parent.appendChild(element);
  }
  element.textContent = texte;
  return element;
}

/* 4. RÉFLEXE NÉON — MODE CIBLE ET MODE CLAVIER */
let reflexTimer = null;
let reflexMode = "cible";
let reflexPhase = "idle";
let reflexDebut = 0;
let reflexTouche = "";
const reflexRecords = {
  cible: omniLireRecord("omni_reflex_target_best"),
  clavier: omniLireRecord("omni_reflex_keyboard_best")
};
const reflexTouches = ["A", "S", "D", "F", "J", "K", "L", "Q", "W", "E", "R", "U", "I", "O"];

function afficherRecordsReflexe() {
  const cible = document.getElementById("reflex-cible-best");
  const clavier = document.getElementById("reflex-clavier-best");
  if (cible) cible.textContent = reflexRecords.cible ? reflexRecords.cible + " ms" : "--";
  if (clavier) clavier.textContent = reflexRecords.clavier ? reflexRecords.clavier + " ms" : "--";
}

function choisirModeReflexe(mode) {
  if (mode !== "cible" && mode !== "clavier") return;
  if (reflexTimer) clearTimeout(reflexTimer);
  reflexTimer = null;
  reflexPhase = "idle";
  reflexMode = mode;

  const cibleMode = document.getElementById("reflex-cible-mode");
  const clavierMode = document.getElementById("reflex-clavier-mode");
  const boutonCible = document.getElementById("reflex-mode-cible");
  const boutonClavier = document.getElementById("reflex-mode-clavier");
  const arena = document.getElementById("reflex-arena");
  const touche = document.getElementById("reflex-key-display");

  if (cibleMode) cibleMode.hidden = mode !== "cible";
  if (clavierMode) clavierMode.hidden = mode !== "clavier";
  if (boutonCible) {
    boutonCible.classList.toggle("is-active", mode === "cible");
    boutonCible.setAttribute("aria-pressed", String(mode === "cible"));
  }
  if (boutonClavier) {
    boutonClavier.classList.toggle("is-active", mode === "clavier");
    boutonClavier.setAttribute("aria-pressed", String(mode === "clavier"));
  }
  if (arena) {
    arena.replaceChildren();
    arena.classList.remove("is-ready");
    const hint = document.createElement("span");
    hint.className = "omni-reflex-arena-hint";
    hint.textContent = "ZONE DE TEST";
    arena.appendChild(hint);
  }
  if (touche) touche.textContent = "?";

  const statusId = mode === "cible" ? "reflex-cible-status" : "reflex-clavier-status";
  const status = document.getElementById(statusId);
  const time = document.getElementById(mode === "cible" ? "reflex-cible-time" : "reflex-clavier-time");
  if (status) status.textContent = mode === "cible"
    ? "Lance une manche, attends le signal, puis touche la cible !"
    : "Lance une manche, attends la lettre, puis tape-la au clavier !";
  if (time) time.textContent = "--";
  afficherRecordsReflexe();
}

function initialiserReflexe() {
  reflexRecords.cible = omniLireRecord("omni_reflex_target_best");
  reflexRecords.clavier = omniLireRecord("omni_reflex_keyboard_best");
  afficherRecordsReflexe();
  choisirModeReflexe("cible");
}

function demarrerReflexe() {
  if (reflexTimer) clearTimeout(reflexTimer);
  reflexTimer = null;
  reflexPhase = "waiting";
  reflexTouche = "";

  const status = document.getElementById(reflexMode === "cible"
    ? "reflex-cible-status" : "reflex-clavier-status");
  const time = document.getElementById(reflexMode === "cible"
    ? "reflex-cible-time" : "reflex-clavier-time");
  const arena = document.getElementById("reflex-arena");
  const keyDisplay = document.getElementById("reflex-key-display");

  if (time) time.textContent = "--";
  if (arena) {
    arena.replaceChildren();
    arena.classList.remove("is-ready");
    const hint = document.createElement("span");
    hint.className = "omni-reflex-arena-hint";
    hint.textContent = "CONCENTRATION…";
    arena.appendChild(hint);
  }
  if (keyDisplay) {
    keyDisplay.textContent = "…";
    keyDisplay.classList.remove("is-ready");
  }
  if (status) status.textContent = "Prépare-toi… le signal arrive à un moment aléatoire.";
  const delai = 1200 + Math.random() * 2700;

  reflexTimer = setTimeout(() => {
    if (reflexPhase !== "waiting") return;
    reflexPhase = "ready";
    reflexDebut = performance.now();

    if (reflexMode === "cible") {
      afficherCibleReflexe();
      if (status) status.textContent = "⚡ MAINTENANT ! Touche la cible !";
    } else {
      reflexTouche = reflexTouches[Math.floor(Math.random() * reflexTouches.length)];
      if (keyDisplay) {
        keyDisplay.textContent = reflexTouche;
        keyDisplay.classList.add("is-ready");
      }
      if (status) status.textContent = "⚡ TAPE LA TOUCHE AFFICHÉE !";
    }
    reflexTimer = null;
  }, delai);
}

function afficherCibleReflexe() {
  const arena = document.getElementById("reflex-arena");
  if (!arena) return;
  arena.replaceChildren();
  arena.classList.add("is-ready");

  const cible = document.createElement("button");
  cible.type = "button";
  cible.className = "omni-reflex-live-target";
  cible.textContent = "CLIQUE !";
  cible.setAttribute("aria-label", "Cliquer sur la cible lumineuse");
  cible.style.left = (8 + Math.random() * 76) + "%";
  cible.style.top = (14 + Math.random() * 66) + "%";
  cible.addEventListener("click", event => {
    event.stopPropagation();
    cliquerReflexe();
  });
  arena.appendChild(cible);
  cible.focus({ preventScroll: true });
}

function cliquerZoneReflexe() {
  if (reflexMode !== "cible") return;
  if (reflexPhase === "waiting") {
    reflexPhase = "idle";
    if (reflexTimer) clearTimeout(reflexTimer);
    reflexTimer = null;
    const status = document.getElementById("reflex-cible-status");
    if (status) status.textContent = "Trop tôt ! Attends que la cible apparaisse en vert.";
  }
}

function cliquerReflexe() {
  if (reflexMode !== "cible" || reflexPhase !== "ready") return;
  const resultat = Math.max(0, Math.round(performance.now() - reflexDebut));
  reflexPhase = "done";

  const arena = document.getElementById("reflex-arena");
  const status = document.getElementById("reflex-cible-status");
  const time = document.getElementById("reflex-cible-time");
  const nouveauRecord = !reflexRecords.cible || resultat < reflexRecords.cible;

  if (arena) {
    arena.classList.remove("is-ready");
    arena.replaceChildren();
    const marque = document.createElement("span");
    marque.className = "omni-reflex-result-mark";
    marque.textContent = "✓";
    arena.appendChild(marque);
  }
  if (time) time.textContent = resultat + " ms";
  if (status) status.textContent = nouveauRecord
    ? "🏆 Nouveau record ! " + resultat + " ms"
    : "Bien joué : " + resultat + " ms. Essaie encore pour battre ton record.";

  if (nouveauRecord) {
    reflexRecords.cible = resultat;
    omniSauverRecord("omni_reflex_target_best", resultat);
    afficherRecordsReflexe();
  }
}

function traiterToucheReflexe(event) {
  const panneau = document.getElementById("omni-game-reflex");
  if (!panneau || panneau.hidden || reflexMode !== "clavier") return;
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.target && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;

  if (reflexPhase === "waiting") {
    reflexPhase = "idle";
    if (reflexTimer) clearTimeout(reflexTimer);
    reflexTimer = null;
    const status = document.getElementById("reflex-clavier-status");
    if (status) status.textContent = "Trop tôt ! Attends que la touche s'affiche.";
    const keyDisplay = document.getElementById("reflex-key-display");
    if (keyDisplay) keyDisplay.textContent = "…";
    return;
  }

  if (reflexPhase !== "ready") return;
  const touche = event.key.length === 1 ? event.key.toUpperCase() : "";
  if (touche !== reflexTouche) {
    const status = document.getElementById("reflex-clavier-status");
    if (status) status.textContent = "Mauvaise touche ! Il fallait appuyer sur " + reflexTouche + ".";
    reflexPhase = "idle";
    const keyDisplay = document.getElementById("reflex-key-display");
    if (keyDisplay) keyDisplay.classList.remove("is-ready");
    return;
  }

  event.preventDefault();
  const resultat = Math.max(0, Math.round(performance.now() - reflexDebut));
  reflexPhase = "done";
  const status = document.getElementById("reflex-clavier-status");
  const time = document.getElementById("reflex-clavier-time");
  const keyDisplay = document.getElementById("reflex-key-display");
  const nouveauRecord = !reflexRecords.clavier || resultat < reflexRecords.clavier;

  if (time) time.textContent = resultat + " ms";
  if (keyDisplay) {
    keyDisplay.classList.remove("is-ready");
    keyDisplay.textContent = "✓";
  }
  if (status) status.textContent = nouveauRecord
    ? "🏆 Nouveau record clavier ! " + resultat + " ms"
    : "Bien joué : " + resultat + " ms. À toi de battre ton record !";

  if (nouveauRecord) {
    reflexRecords.clavier = resultat;
    omniSauverRecord("omni_reflex_keyboard_best", resultat);
    afficherRecordsReflexe();
  }
}

/* 5. PONG NÉON — JOUEUR CONTRE IA */
let pongCanvas = null;
let pongCtx = null;
let pongFrame = null;
let pongEnCours = false;
let pongDernierTemps = 0;
let pongJoueurY = 130;
let pongCpuY = 130;
let pongBalle = { x: 240, y: 160, vx: 230, vy: 95 };
let pongScoreJoueur = 0;
let pongScoreCpu = 0;

function initialiserPong() {
  pongCanvas = document.getElementById("pong-canvas");
  if (!pongCanvas) return;
  pongCtx = pongCanvas.getContext("2d");
  if (!pongCtx) return;
  if (!pongEnCours) {
    pongJoueurY = pongCanvas.height / 2 - 30;
    pongCpuY = pongCanvas.height / 2 - 30;
    pongBalle = { x: pongCanvas.width / 2, y: pongCanvas.height / 2, vx: 230, vy: 95 };
    dessinerPong();
  }
  actualiserScorePong();
  omniStatutJeu("pong-feedback", "Déplace ta raquette avec ↑ et ↓, ou les touches Z et S.", document.getElementById("omni-game-pong"));
}

function actualiserScorePong() {
  const joueur = document.getElementById("pong-player-score");
  const cpu = document.getElementById("pong-cpu-score");
  if (joueur) joueur.textContent = pongScoreJoueur;
  if (cpu) cpu.textContent = pongScoreCpu;
}

function dessinerPong() {
  if (!pongCtx || !pongCanvas) return;
  const ctx = pongCtx;
  const w = pongCanvas.width;
  const h = pongCanvas.height;
  ctx.clearRect(0, 0, w, h);
  const fond = ctx.createLinearGradient(0, 0, w, h);
  fond.addColorStop(0, "#081a31");
  fond.addColorStop(1, "#120d2b");
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = "#67e8f933";
  ctx.setLineDash([8, 9]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
  ctx.restore();

  ctx.shadowBlur = 18;
  ctx.shadowColor = "#38e8ff";
  ctx.fillStyle = "#38e8ff";
  ctx.fillRect(22, pongJoueurY, 12, 60);
  ctx.shadowColor = "#c084fc";
  ctx.fillStyle = "#c084fc";
  ctx.fillRect(w - 34, pongCpuY, 12, 60);

  ctx.beginPath();
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#ffffff";
  ctx.arc(pongBalle.x, pongBalle.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (!pongEnCours) {
    ctx.fillStyle = "#e6f6ff";
    ctx.textAlign = "center";
    ctx.font = "bold 17px Arial";
    ctx.fillText("PONG NÉON", w / 2, h / 2 - 32);
    ctx.font = "13px Arial";
    ctx.fillText("Premier à 5 points", w / 2, h / 2 + 38);
  }
}

function lancerBallePong(direction) {
  const angle = Math.random() * 0.8 - 0.4;
  const vitesse = 230;
  pongBalle = {
    x: pongCanvas.width / 2,
    y: pongCanvas.height / 2,
    vx: Math.cos(angle) * vitesse * direction,
    vy: Math.sin(angle) * vitesse + (Math.random() * 70 - 35)
  };
}

function demarrerPong() {
  if (pongFrame) cancelAnimationFrame(pongFrame);
  initialiserPong();
  if (!pongCanvas || !pongCtx) return;
  pongScoreJoueur = 0;
  pongScoreCpu = 0;
  pongJoueurY = pongCanvas.height / 2 - 30;
  pongCpuY = pongCanvas.height / 2 - 30;
  lancerBallePong(Math.random() > 0.5 ? 1 : -1);
  pongEnCours = true;
  pongDernierTemps = 0;
  actualiserScorePong();
  omniStatutJeu("pong-feedback", "À toi de jouer ! Le premier à 5 points gagne.", document.getElementById("omni-game-pong"));
  pongFrame = requestAnimationFrame(bouclePong);
}

function bouclePong(temps) {
  if (!pongEnCours || !pongCanvas) return;
  const dt = Math.min(0.032, pongDernierTemps ? (temps - pongDernierTemps) / 1000 : 0.016);
  pongDernierTemps = temps;
  const w = pongCanvas.width;
  const h = pongCanvas.height;

  pongCpuY += ((pongBalle.y - 30) - pongCpuY) * Math.min(1, dt * 3.1);
  pongCpuY = Math.max(0, Math.min(h - 60, pongCpuY));
  pongBalle.x += pongBalle.vx * dt;
  pongBalle.y += pongBalle.vy * dt;

  if (pongBalle.y < 8 || pongBalle.y > h - 8) pongBalle.vy *= -1;

  if (pongBalle.vx < 0 && pongBalle.x <= 42 &&
      pongBalle.y >= pongJoueurY - 7 && pongBalle.y <= pongJoueurY + 67) {
    pongBalle.x = 42;
    pongBalle.vx = Math.abs(pongBalle.vx) * 1.035;
    pongBalle.vy += (pongBalle.y - (pongJoueurY + 30)) * 3;
  }

  if (pongBalle.vx > 0 && pongBalle.x >= w - 42 &&
      pongBalle.y >= pongCpuY - 7 && pongBalle.y <= pongCpuY + 67) {
    pongBalle.x = w - 42;
    pongBalle.vx = -Math.abs(pongBalle.vx) * 1.025;
    pongBalle.vy += (pongBalle.y - (pongCpuY + 30)) * 2.3;
  }

  if (pongBalle.x < -12) {
    pongScoreCpu++;
    actualiserScorePong();
    if (pongScoreCpu >= 5) return terminerPong("L'ordinateur remporte la partie. Retente ta chance !");
    lancerBallePong(1);
  } else if (pongBalle.x > w + 12) {
    pongScoreJoueur++;
    actualiserScorePong();
    if (pongScoreJoueur >= 5) return terminerPong("🏆 Victoire ! Tu as battu l'ordinateur !");
    lancerBallePong(-1);
  }

  dessinerPong();
  pongFrame = requestAnimationFrame(bouclePong);
}

function deplacerRaquettePong(direction) {
  if (!pongCanvas) initialiserPong();
  if (!pongCanvas) return;
  const pas = 38;
  if (direction === "up") pongJoueurY -= pas;
  if (direction === "down") pongJoueurY += pas;
  pongJoueurY = Math.max(0, Math.min(pongCanvas.height - 60, pongJoueurY));
  dessinerPong();
}

function terminerPong(message) {
  pongEnCours = false;
  if (pongFrame) cancelAnimationFrame(pongFrame);
  pongFrame = null;
  omniStatutJeu("pong-feedback", message, document.getElementById("omni-game-pong"));
  dessinerPong();
}

function arreterPong() {
  pongEnCours = false;
  if (pongFrame) cancelAnimationFrame(pongFrame);
  pongFrame = null;
}

/* 6. 2048 CYBER */
let grille2048 = [];
let score2048 = 0;
let gagne2048 = false;
let fin2048 = false;

function demarrer2048() {
  grille2048 = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  score2048 = 0;
  gagne2048 = false;
  fin2048 = false;
  ajouterTuile2048();
  ajouterTuile2048();
  afficher2048();
  omniStatutJeu("2048-feedback", "Fusionne deux tuiles identiques pour atteindre 2048. Flèches ou ZQSD.", document.getElementById("omni-game-2048"));
}

function ajouterTuile2048() {
  const libres = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grille2048[r][c] === 0) libres.push([r, c]);
    }
  }
  if (!libres.length) return;
  const [r, c] = libres[Math.floor(Math.random() * libres.length)];
  grille2048[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function afficher2048() {
  const grille = document.getElementById("2048-grid");
  const score = document.getElementById("2048-score");
  if (!grille) return;
  grille.replaceChildren();
  grille2048.flat().forEach(valeur => {
    const tuile = document.createElement("div");
    tuile.className = "omni-2048-tile" + (valeur ? " tile-" + Math.min(valeur, 2048) : " tile-empty");
    tuile.dataset.value = String(valeur);
    tuile.textContent = valeur ? valeur.toLocaleString("fr-FR") : "";
    tuile.setAttribute("aria-label", valeur ? "Tuile " + valeur : "Case vide");
    grille.appendChild(tuile);
  });
  if (score) score.textContent = score2048.toLocaleString("fr-FR");
}

function deplacer2048(direction) {
  if (fin2048 || !grille2048.length) return;
  const avant = grille2048.map(ligne => ligne.slice());
  let gagneMaintenant = false;

  for (let index = 0; index < 4; index++) {
    const coordonnees = [];
    for (let pas = 0; pas < 4; pas++) {
      if (direction === "left") coordonnees.push([index, pas]);
      if (direction === "right") coordonnees.push([index, 3 - pas]);
      if (direction === "up") coordonnees.push([pas, index]);
      if (direction === "down") coordonnees.push([3 - pas, index]);
    }

    const valeurs = coordonnees.map(([r, c]) => grille2048[r][c]).filter(Boolean);
    const resultat = [];
    for (let i = 0; i < valeurs.length; i++) {
      if (valeurs[i] === valeurs[i + 1]) {
        const fusion = valeurs[i] * 2;
        resultat.push(fusion);
        score2048 += fusion;
        if (fusion === 2048) gagneMaintenant = true;
        i++;
      } else {
        resultat.push(valeurs[i]);
      }
    }
    while (resultat.length < 4) resultat.push(0);
    coordonnees.forEach(([r, c], i) => { grille2048[r][c] = resultat[i]; });
  }

  const change = grille2048.some((ligne, r) => ligne.some((valeur, c) => valeur !== avant[r][c]));
  if (!change) return;

  ajouterTuile2048();
  afficher2048();

  if (gagneMaintenant && !gagne2048) {
    gagne2048 = true;
    omniStatutJeu("2048-feedback", "🎉 2048 atteint ! Tu peux continuer pour battre ton score.", document.getElementById("omni-game-2048"));
  }
  if (!peutBouger2048()) {
    fin2048 = true;
    omniStatutJeu("2048-feedback", "Partie terminée : plus aucun mouvement possible. Appuie sur Recommencer.", document.getElementById("omni-game-2048"));
  }
}

function peutBouger2048() {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!grille2048[r][c]) return true;
      if (r < 3 && grille2048[r][c] === grille2048[r + 1][c]) return true;
      if (c < 3 && grille2048[r][c] === grille2048[r][c + 1]) return true;
    }
  }
  return false;
}

/* 7. MORPION CYBER — DEUX JOUEURS SUR LE MÊME ÉCRAN */
let morpionCases = Array(9).fill("");
let morpionJoueur = "X";
let morpionTermine = false;
const MORPION_COMBINAISONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function recommencerMorpion() {
  morpionCases = Array(9).fill("");
  morpionJoueur = "X";
  morpionTermine = false;
  const grille = document.getElementById("morpion-grid");
  if (grille) {
    grille.querySelectorAll("button").forEach((bouton, index) => {
      bouton.textContent = "";
      bouton.disabled = false;
      bouton.classList.remove("is-winning", "mark-x", "mark-o");
      bouton.setAttribute("aria-label", "Case " + (index + 1));
    });
  }
  const statut = document.getElementById("morpion-status");
  if (statut) statut.textContent = "Au joueur X de commencer !";
}

function jouerMorpion(index) {
  if (morpionTermine || !Number.isInteger(index) || index < 0 || index > 8 || morpionCases[index]) return;
  morpionCases[index] = morpionJoueur;
  const grille = document.getElementById("morpion-grid");
  const boutons = grille ? grille.querySelectorAll("button") : [];
  const bouton = boutons[index];

  if (bouton) {
    bouton.textContent = morpionJoueur;
    bouton.disabled = true;
    bouton.classList.add(morpionJoueur === "X" ? "mark-x" : "mark-o");
    bouton.setAttribute("aria-label", "Case " + (index + 1) + " : " + morpionJoueur);
  }

  const gagnante = MORPION_COMBINAISONS.find(combo =>
    combo.every(position => morpionCases[position] === morpionJoueur)
  );
  const statut = document.getElementById("morpion-status");

  if (gagnante) {
    morpionTermine = true;
    gagnante.forEach(position => boutons[position]?.classList.add("is-winning"));
    if (statut) statut.textContent = "🏆 Le joueur " + morpionJoueur + " gagne !";
    boutons.forEach(b => { b.disabled = true; });
    return;
  }

  if (morpionCases.every(Boolean)) {
    morpionTermine = true;
    if (statut) statut.textContent = "🤝 Match nul ! Rejouez une partie.";
    return;
  }

  morpionJoueur = morpionJoueur === "X" ? "O" : "X";
  if (statut) statut.textContent = "Au joueur " + morpionJoueur + " de jouer.";
}

/* 8. SPACE DODGER — ESQUIVE SPATIALE */
let spaceCanvas = null;
let spaceCtx = null;
let spaceFrame = null;
let spaceEnCours = false;
let spaceDernierTemps = 0;
let spaceTempsSpawn = 0;
let spaceScore = 0;
let spaceRecord = omniLireRecord("omni_space_best");
let spaceJoueurX = 210;
let spaceObstacles = [];
let spaceEtoiles = [];

function initialiserSpaceDodger() {
  spaceCanvas = document.getElementById("space-canvas");
  if (!spaceCanvas) return;
  spaceCtx = spaceCanvas.getContext("2d");
  if (!spaceCtx) return;
  spaceRecord = omniLireRecord("omni_space_best");
  const record = document.getElementById("space-best");
  if (record) record.textContent = spaceRecord;
  if (!spaceEnCours) dessinerSpaceDodger();
  omniStatutJeu("space-feedback", "Évite les météorites. Utilise les flèches, A/D ou les boutons.", document.getElementById("omni-game-space"));
}

function demarrerSpaceDodger() {
  if (spaceFrame) cancelAnimationFrame(spaceFrame);
  initialiserSpaceDodger();
  if (!spaceCanvas || !spaceCtx) return;
  spaceEnCours = true;
  spaceDernierTemps = 0;
  spaceTempsSpawn = 0;
  spaceScore = 0;
  spaceJoueurX = spaceCanvas.width / 2;
  spaceObstacles = [];
  spaceEtoiles = Array.from({ length: 48 }, () => ({
    x: Math.random() * spaceCanvas.width,
    y: Math.random() * spaceCanvas.height,
    vitesse: 20 + Math.random() * 75,
    rayon: Math.random() * 1.7 + 0.5
  }));
  actualiserScoreSpace();
  omniStatutJeu("space-feedback", "🚀 Décollage ! Reste en mouvement.", document.getElementById("omni-game-space"));
  spaceFrame = requestAnimationFrame(boucleSpaceDodger);
}

function actualiserScoreSpace() {
  const score = document.getElementById("space-score");
  const record = document.getElementById("space-best");
  if (score) score.textContent = Math.floor(spaceScore);
  if (record) record.textContent = spaceRecord;
}

function deplacerVaisseau(direction) {
  if (!spaceCanvas) initialiserSpaceDodger();
  if (!spaceCanvas) return;
  spaceJoueurX += Number(direction) * 34;
  spaceJoueurX = Math.max(22, Math.min(spaceCanvas.width - 22, spaceJoueurX));
  if (!spaceEnCours) dessinerSpaceDodger();
}

function dessinerSpaceDodger() {
  if (!spaceCanvas || !spaceCtx) return;
  const ctx = spaceCtx;
  const w = spaceCanvas.width;
  const h = spaceCanvas.height;
  ctx.clearRect(0, 0, w, h);
  const fond = ctx.createLinearGradient(0, 0, w, h);
  fond.addColorStop(0, "#050b1c");
  fond.addColorStop(1, "#1b1040");
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#dbeafe";
  spaceEtoiles.forEach(etoile => {
    ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 350 + etoile.x) * 0.3;
    ctx.beginPath();
    ctx.arc(etoile.x, etoile.y, etoile.rayon, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  spaceObstacles.forEach(obstacle => {
    ctx.save();
    ctx.shadowColor = "#fb7185";
    ctx.shadowBlur = 16;
    const gradient = ctx.createRadialGradient(
      obstacle.x - 5, obstacle.y - 6, 2,
      obstacle.x, obstacle.y, obstacle.r
    );
    gradient.addColorStop(0, "#ffe4e6");
    gradient.addColorStop(0.38, "#fb7185");
    gradient.addColorStop(1, "#7f1d1d");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(obstacle.x, obstacle.y, obstacle.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  ctx.save();
  ctx.translate(spaceJoueurX, h - 48);
  ctx.shadowColor = "#38e8ff";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#38e8ff";
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(18, 18);
  ctx.lineTo(0, 11);
  ctx.lineTo(-18, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function boucleSpaceDodger(temps) {
  if (!spaceEnCours || !spaceCanvas) return;
  const dt = Math.min(0.035, spaceDernierTemps ? (temps - spaceDernierTemps) / 1000 : 0.016);
  spaceDernierTemps = temps;
  spaceScore += dt * 10;

  spaceEtoiles.forEach(etoile => {
    etoile.y += etoile.vitesse * dt;
    if (etoile.y > spaceCanvas.height) {
      etoile.y = 0;
      etoile.x = Math.random() * spaceCanvas.width;
    }
  });

  spaceTempsSpawn += dt * 1000;
  const intervalleSpawn = Math.max(350, 880 - spaceScore * 1.1);
  if (spaceTempsSpawn >= intervalleSpawn) {
    spaceTempsSpawn = 0;
    spaceObstacles.push({
      x: 20 + Math.random() * (spaceCanvas.width - 40),
      y: -24,
      r: 10 + Math.random() * 9,
      vitesse: 125 + Math.min(170, spaceScore * 1.1)
    });
  }

  spaceObstacles.forEach(obstacle => { obstacle.y += obstacle.vitesse * dt; });
  spaceObstacles = spaceObstacles.filter(obstacle => obstacle.y < spaceCanvas.height + 30);

  const shipY = spaceCanvas.height - 48;
  const collision = spaceObstacles.some(obstacle =>
    Math.abs(obstacle.x - spaceJoueurX) < obstacle.r + 15 &&
    Math.abs(obstacle.y - shipY) < obstacle.r + 15
  );
  actualiserScoreSpace();
  dessinerSpaceDodger();

  if (collision) {
    terminerSpaceDodger();
    return;
  }
  spaceFrame = requestAnimationFrame(boucleSpaceDodger);
}

function terminerSpaceDodger() {
  spaceEnCours = false;
  if (spaceFrame) cancelAnimationFrame(spaceFrame);
  spaceFrame = null;
  const scoreFinal = Math.floor(spaceScore);
  const nouveauRecord = scoreFinal > spaceRecord;
  if (nouveauRecord) {
    spaceRecord = scoreFinal;
    omniSauverRecord("omni_space_best", spaceRecord);
  }
  actualiserScoreSpace();
  dessinerSpaceDodger();
  const ctx = spaceCtx;
  if (ctx && spaceCanvas) {
    ctx.fillStyle = "#071226dd";
    ctx.fillRect(20, spaceCanvas.height / 2 - 55, spaceCanvas.width - 40, 110);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Arial";
    ctx.fillText("MISSION TERMINÉE", spaceCanvas.width / 2, spaceCanvas.height / 2 - 8);
    ctx.fillStyle = "#67e8f9";
    ctx.font = "16px Arial";
    ctx.fillText("Score : " + scoreFinal, spaceCanvas.width / 2, spaceCanvas.height / 2 + 24);
  }
  omniStatutJeu("space-feedback",
    (nouveauRecord ? "🏆 Nouveau record ! " : "Bien joué ! ") +
    "Score : " + scoreFinal + ". Appuie sur Décoller pour rejouer.",
    document.getElementById("omni-game-space"));
}

function arreterSpaceDodger() {
  spaceEnCours = false;
  if (spaceFrame) cancelAnimationFrame(spaceFrame);
  spaceFrame = null;
}

/* 9. QUIZ CYBER */
const quizQuestions = [
  { question: "Quel langage structure le contenu d'une page web ?", answers: ["HTML", "CSS", "SQL", "Python"], correct: 0 },
  { question: "Quel langage sert principalement à styliser une page web ?", answers: ["Java", "CSS", "C++", "Bash"], correct: 1 },
  { question: "Que signifie CPU ?", answers: ["Central Processing Unit", "Control Pixel Utility", "Core Program User", "Central Private Upload"], correct: 0 },
  { question: "Quel élément HTML crée un lien ?", answers: ["<p>", "<a>", "<img>", "<main>"], correct: 1 },
  { question: "Quel est le rôle de JavaScript dans un site ?", answers: ["Stocker l'électricité", "Ajouter des interactions", "Remplacer l'écran", "Créer le réseau Wi-Fi"], correct: 1 },
  { question: "Combien de côtés possède un hexagone ?", answers: ["5", "6", "7", "8"], correct: 1 },
  { question: "Quelle planète est surnommée la planète rouge ?", answers: ["Vénus", "Mars", "Jupiter", "Mercure"], correct: 1 },
  { question: "Quel raccourci clavier copie généralement un élément ?", answers: ["Ctrl + X", "Ctrl + V", "Ctrl + C", "Ctrl + Z"], correct: 2 },
  { question: "Quel composant affiche généralement les pages d'un site ?", answers: ["Navigateur", "Clavier", "Routeur seul", "Imprimante"], correct: 0 },
  { question: "Quelle valeur CSS rend un élément invisible tout en gardant sa place ?", answers: ["display: none", "visibility: hidden", "position: fixed", "float: left"], correct: 1 }
];
let quizListe = [];
let quizIndex = 0;
let quizScore = 0;
let quizRecord = omniLireRecord("omni_quiz_best");
let quizActif = false;
let quizTimeout = null;

function initialiserQuiz() {
  quizRecord = omniLireRecord("omni_quiz_best");
  const record = document.getElementById("quiz-best");
  if (record) record.textContent = quizRecord;
  const score = document.getElementById("quiz-score");
  if (score) score.textContent = "0";
  const question = document.getElementById("quiz-question");
  if (question) question.textContent = "Prêt à relever le défi ? 10 questions t'attendent.";
  const answers = document.getElementById("quiz-answers");
  if (answers) answers.replaceChildren();
  const start = document.getElementById("quiz-start");
  if (start) {
    start.disabled = false;
    start.textContent = "▶ COMMENCER LE QUIZ";
  }
}

function demarrerQuiz() {
  if (quizTimeout) clearTimeout(quizTimeout);
  quizTimeout = null;
  quizListe = quizQuestions.map(question => ({ ...question, answers: question.answers.slice() }))
    .sort(() => Math.random() - 0.5);
  quizIndex = 0;
  quizScore = 0;
  quizActif = true;
  const score = document.getElementById("quiz-score");
  if (score) score.textContent = "0";
  const start = document.getElementById("quiz-start");
  if (start) start.disabled = true;
  afficherQuestionQuiz();
}

function afficherQuestionQuiz() {
  const question = document.getElementById("quiz-question");
  const answers = document.getElementById("quiz-answers");
  if (!question || !answers) return;
  if (quizIndex >= quizListe.length) {
    terminerQuiz();
    return;
  }

  const item = quizListe[quizIndex];
  question.textContent = (quizIndex + 1) + "/" + quizListe.length + " — " + item.question;
  answers.replaceChildren();
  item.answers.forEach((reponse, index) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.textContent = reponse;
    bouton.addEventListener("click", () => repondreQuiz(index));
    answers.appendChild(bouton);
  });
  omniStatutJeu("quiz-feedback", "Choisis la bonne réponse pour gagner 1 point.", document.getElementById("omni-game-quiz"));
}

function repondreQuiz(index) {
  if (!quizActif || quizTimeout) return;
  const item = quizListe[quizIndex];
  const boutons = document.querySelectorAll("#quiz-answers button");
  boutons.forEach((bouton, position) => {
    bouton.disabled = true;
    if (position === item.correct) bouton.classList.add("is-correct");
    else if (position === index) bouton.classList.add("is-wrong");
  });

  const correct = index === item.correct;
  if (correct) quizScore++;
  const score = document.getElementById("quiz-score");
  if (score) score.textContent = quizScore;
  omniStatutJeu("quiz-feedback",
    correct ? "✅ Bonne réponse ! +1 point." : "❌ Pas tout à fait. La bonne réponse était : " + item.answers[item.correct] + ".",
    document.getElementById("omni-game-quiz"));

  quizIndex++;
  quizTimeout = setTimeout(() => {
    quizTimeout = null;
    afficherQuestionQuiz();
  }, 850);
}

function terminerQuiz() {
  quizActif = false;
  const nouveauRecord = quizScore > quizRecord;
  if (nouveauRecord) {
    quizRecord = quizScore;
    omniSauverRecord("omni_quiz_best", quizRecord);
  }
  const record = document.getElementById("quiz-best");
  if (record) record.textContent = quizRecord;
  const question = document.getElementById("quiz-question");
  if (question) question.textContent = "🎉 Quiz terminé : " + quizScore + " / " + quizListe.length;
  const answers = document.getElementById("quiz-answers");
  if (answers) answers.replaceChildren();
  omniStatutJeu("quiz-feedback",
    (nouveauRecord ? "🏆 Nouveau record personnel ! " : "Bien joué ! ") +
    "Tu as obtenu " + quizScore + " point(s).",
    document.getElementById("omni-game-quiz"));
  const start = document.getElementById("quiz-start");
  if (start) {
    start.disabled = false;
    start.textContent = "🔄 REJOUER";
  }
}

function arreterQuiz() {
  quizActif = false;
  if (quizTimeout) clearTimeout(quizTimeout);
  quizTimeout = null;
}

/* COMMANDES CLAVIER PARTAGÉES */
document.addEventListener("keydown", event => {
  traiterToucheReflexe(event);

  const panneauPong = document.getElementById("omni-game-pong");
  if (panneauPong && !panneauPong.hidden && pongEnCours) {
    if (event.key === "ArrowUp" || event.key.toLowerCase() === "z") {
      event.preventDefault();
      deplacerRaquettePong("up");
    } else if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
      event.preventDefault();
      deplacerRaquettePong("down");
    }
  }

  const panneau2048 = document.getElementById("omni-game-2048");
  if (panneau2048 && !panneau2048.hidden) {
    const directions = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      z: "up", Z: "up", s: "down", S: "down", q: "left", Q: "left", d: "right", D: "right"
    };
    if (directions[event.key]) {
      event.preventDefault();
      deplacer2048(directions[event.key]);
    }
  }

  const panneauSpace = document.getElementById("omni-game-space");
  if (panneauSpace && !panneauSpace.hidden && spaceEnCours) {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a" || event.key.toLowerCase() === "q") {
      event.preventDefault();
      deplacerVaisseau(-1);
    } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      event.preventDefault();
      deplacerVaisseau(1);
    }
  }
});

/* COMMANDES SOURIS / TACTILES POUR SPACE DODGER */
document.addEventListener("pointermove", event => {
  if (!spaceEnCours || !spaceCanvas) return;
  const panneau = document.getElementById("omni-game-space");
  if (!panneau || panneau.hidden) return;
  if (event.pointerType === "mouse" && event.buttons === 0) return;
  const rect = spaceCanvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (spaceCanvas.width / rect.width);
  if (x >= 0 && x <= spaceCanvas.width) {
    spaceJoueurX = Math.max(22, Math.min(spaceCanvas.width - 22, x));
  }
});

/* ARRÊT DES BOUCLES ET DÉLAIS QUAND ON QUITTE UN JEU */
function arreterJeuxSecondaires() {
  if (reflexTimer) clearTimeout(reflexTimer);
  reflexTimer = null;
  reflexPhase = "idle";
  arreterPong();
  arreterSpaceDodger();
  arreterQuiz();
}

