const state = {
  username: "Joueur Cyber", userAvatar: "🤖",
  pizzas: 0, clickPower: 1, pizzasPerSec: 0, omniPoints: 0,
  activeSkin: '🍕', unlockedSkins: ['🍕'],
  cardsCollection: {},
  activeEffect: 'cyan', unlockedEffects: ['cyan'],
  secrets: [], capsules: [], titleClicks: 0, matrixMode: false, raveMode: false, crtMode: false
};

let bonusHorsLigne = 0;

function chargerDonnees() {
  const save = localStorage.getItem("omni_app_full_save");

  if (save) {
    try {
      const donnees = JSON.parse(save);
      const derniereSauvegarde = Number(donnees.lastSavedAt);
      const { offresBoutique, ...donneesEtat } = donnees;

      Object.assign(state, donneesEtat);

      // Vérifier les champs sauvegardés avant de les utiliser.
      if (!Array.isArray(state.secrets)) state.secrets = [];
      if (!Array.isArray(state.capsules)) state.capsules = [];
      if (!Array.isArray(state.unlockedSkins)) state.unlockedSkins = ["🍕"];
      if (!Array.isArray(state.unlockedEffects)) state.unlockedEffects = ["cyan"];
      if (!state.cardsCollection || typeof state.cardsCollection !== "object" || Array.isArray(state.cardsCollection)) {
        state.cardsCollection = {};
      }
      Object.keys(state.cardsCollection).forEach(id => {
        const count = Number(state.cardsCollection[id]);
        if (!Number.isSafeInteger(count) || count < 0 || count > 1000000) delete state.cardsCollection[id];
        else state.cardsCollection[id] = count;
      });

      ["pizzas", "clickPower", "pizzasPerSec", "omniPoints"].forEach(cle => {
        if (!Number.isFinite(state[cle]) || state[cle] < 0) {
          state[cle] = cle === "clickPower" ? 1 : 0;
        }
      });

      state.secrets = state.secrets
        .filter(texte => typeof texte === "string")
        .slice(0, 50);
      state.capsules = state.capsules
        .filter(capsule =>
          capsule &&
          typeof capsule.text === "string" &&
          Number.isFinite(capsule.unlockTime)
        )
        .slice(0, 50);

      // Production hors ligne plafonnée à 8 heures.
      if (
        Number.isFinite(derniereSauvegarde) &&
        derniereSauvegarde > 0 &&
        Date.now() > derniereSauvegarde &&
        state.pizzasPerSec > 0
      ) {
        const secondesAbsence = Math.min(
          (Date.now() - derniereSauvegarde) / 1000,
          8 * 60 * 60
        );
        bonusHorsLigne = Math.floor(state.pizzasPerSec * secondesAbsence);
        state.pizzas += bonusHorsLigne;
      }

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

  // Enregistrer immédiatement l'heure de reprise pour éviter de compter deux fois le bonus.
  state.lastSavedAt = Date.now();
  sauvegarderDonnees();
}


function sauvegarderDonnees() {
  try {
    state.lastSavedAt = Date.now();
    const donnees = {
      ...state,
      offresBoutique: OFFRES_BOUTIQUE.map(item => ({
        id: item.id,
        cost: item.cost
      }))
    };

    localStorage.setItem("omni_app_full_save", JSON.stringify(donnees));
  } catch (erreur) {
    console.warn("La sauvegarde locale OMNI-APP a échoué :", erreur);
    const statut = document.getElementById("app-save-status");
    if (statut) statut.textContent = "⚠️ Sauvegarde impossible : vérifie l'espace disponible du navigateur.";
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
  "omni_2048_best",
  "omni_space_best",
  "omni_quiz_best",
  "omni_wheel_last_spin_date"
].forEach(cle => localStorage.removeItem(cle));

    // Recharge l'application avec les valeurs de départ
    window.location.reload();
  } catch (erreur) {
    console.error("Erreur lors de la réinitialisation :", erreur);
    alert("Impossible de réinitialiser OMNI-APP. Réessaie.");
  }
}


// MOTEUR AUDIO OMNI — SONS ORIGINAUX ET RADIO SYNTHÉTIQUE
let audioCtx = null;
let omniMasterGain = null;
let omniSfxGain = null;
let omniMusicGain = null;
let omniSfxEnabled = true;
let omniSfxVolume = 0.78;
let omniMusicVolume = 0.32;
let audioPreferencesLoaded = false;
let radioIsPlaying = false;
let radioTimer = null;
let radioStep = 0;
let radioNextStepAt = 0;
let radioStationIndex = 0;

const OMNI_RADIO_STATIONS = [
  { name:"NEON DRIVE", style:"Synthwave • 112 BPM", bpm:112, root:55,
    scale:[0,2,3,7,9,10,12,14], chords:[[0,3,7],[5,8,12],[3,7,10],[7,10,14]],
    bass:[0,5,3,7], melody:[0,2,4,7,4,2,5,7,0,2,4,9,7,5,4,2], lead:"triangle", bassWave:"sawtooth" },
  { name:"SPACE DREAMS", style:"Ambient spatial • 76 BPM", bpm:76, root:49,
    scale:[0,2,5,7,9,12,14,17], chords:[[0,4,7],[2,5,9],[5,9,12],[7,11,14]],
    bass:[0,2,5,7], melody:[0,null,2,null,4,null,7,null,5,null,4,null,2,null,0,null], lead:"sine", bassWave:"triangle" },
  { name:"ARCADE RUSH", style:"Chiptune rétro • 132 BPM", bpm:132, root:65.41,
    scale:[0,2,4,7,9,12,14,16], chords:[[0,4,7],[7,11,14],[5,9,12],[3,7,10]],
    bass:[0,7,5,3], melody:[0,4,7,4,2,5,9,5,0,4,7,12,9,7,4,2], lead:"square", bassWave:"triangle" },
  { name:"RAVE CIRCUIT", style:"Electro néon • 126 BPM", bpm:126, root:73.42,
    scale:[0,2,3,6,7,9,10,12], chords:[[0,3,7],[3,6,10],[5,9,12],[7,10,14]],
    bass:[0,0,5,3], melody:[0,3,6,7,3,6,9,7,0,3,6,10,9,7,6,3], lead:"sawtooth", bassWave:"square" }
];

function chargerPreferencesAudio() {
  if (audioPreferencesLoaded) return;
  audioPreferencesLoaded = true;
  try {
    const prefs = JSON.parse(localStorage.getItem("omni_audio_preferences") || "{}");
    if (typeof prefs.sfxEnabled === "boolean") omniSfxEnabled = prefs.sfxEnabled;
    if (Number.isFinite(prefs.sfxVolume)) omniSfxVolume = Math.max(0,Math.min(1,prefs.sfxVolume));
    if (Number.isFinite(prefs.musicVolume)) omniMusicVolume = Math.max(0, Math.min(.6, prefs.musicVolume));
    if (Number.isInteger(prefs.station) && prefs.station >= 0 && prefs.station < OMNI_RADIO_STATIONS.length) {
      radioStationIndex = prefs.station;
    }
  } catch (error) {
    console.warn("Préférences audio indisponibles :", error);
  }
}

function sauvegarderPreferencesAudio() {
  try {
    localStorage.setItem("omni_audio_preferences", JSON.stringify({
      sfxEnabled: omniSfxEnabled, sfxVolume: omniSfxVolume, musicVolume: omniMusicVolume, station: radioStationIndex
    }));
  } catch (error) {
    console.warn("Impossible de sauvegarder les préférences audio :", error);
  }
}

function initAudio() {
  chargerPreferencesAudio();
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
      omniMasterGain = audioCtx.createGain();
      omniSfxGain = audioCtx.createGain();
      omniMusicGain = audioCtx.createGain();
      omniSfxGain.connect(omniMasterGain);
      omniMusicGain.connect(omniMasterGain);
      omniMasterGain.connect(audioCtx.destination);
      omniMasterGain.gain.value = .82;
      appliquerVolumesAudio();
    }
    if (audioCtx.state === "suspended") {
      const resumed = audioCtx.resume();
      if (resumed && typeof resumed.catch === "function") resumed.catch(() => {});
    }
    return true;
  } catch (error) {
    console.warn("Le moteur audio OMNI n'est pas disponible :", error);
    return false;
  }
}

function appliquerVolumesAudio() {
  if (!audioCtx || !omniSfxGain || !omniMusicGain) return;
  const now = audioCtx.currentTime;
  omniSfxGain.gain.setTargetAtTime(omniSfxEnabled ? omniSfxVolume : .0001, now, .035);
  omniMusicGain.gain.setTargetAtTime(radioIsPlaying ? omniMusicVolume : .0001, now, .09);
}

function jouerOscillateur(freq, duration, volume, wave="sine", destination=null, when=null, endFreq=null) {
  if (!audioCtx && !initAudio()) return;
  if (!audioCtx) return;
  const start = Number.isFinite(when) ? when : audioCtx.currentTime;
  const length = Math.max(.035, duration);
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(Math.max(1, freq), start);
  if (Number.isFinite(endFreq) && endFreq > 0 && endFreq !== freq) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, start + length);
  }
  env.gain.setValueAtTime(.0001, start);
  env.gain.linearRampToValueAtTime(Math.max(.0001, volume), start + Math.min(.018, length * .35));
  env.gain.exponentialRampToValueAtTime(.0001, start + length);
  osc.connect(env);
  env.connect(destination || omniSfxGain || audioCtx.destination);
  osc.start(start);
  osc.stop(start + length + .025);
}

function jouerNote(freq, duration=.08, vol=.1) {
  if (!omniSfxEnabled) return;
  jouerOscillateur(freq, duration, Math.min(.12, vol), "sine", omniSfxGain);
}

function jouerEffetSonore(type="click") {
  if (!omniSfxEnabled || !initAudio() || !audioCtx) return;
  const now = audioCtx.currentTime;
  const patterns = {
    click:[[740,.045,.025,"sine",0]],
    nav:[[540,.06,.025,"sine",0],[820,.07,.018,"triangle",.045]],
    pizza:[[430,.055,.045,"triangle",0],[690,.07,.025,"sine",.045]],
    purchase:[[590,.08,.035,"triangle",0],[790,.09,.035,"sine",.075],[1040,.12,.025,"sine",.15]],
    success:[[523,.12,.04,"sine",0],[659,.13,.04,"sine",.09],[784,.18,.035,"triangle",.18]],
    error:[[290,.12,.04,"triangle",0],[210,.17,.035,"sawtooth",.1]],
    booster:[[310,.1,.035,"triangle",0],[420,.1,.04,"triangle",.09],[620,.13,.045,"sine",.18],[880,.2,.035,"sine",.3]],
    legendary:[[392,.18,.05,"sine",0],[523,.2,.05,"sine",.12],[659,.22,.05,"triangle",.24],[784,.28,.05,"sine",.37],[1046,.42,.035,"sine",.52]],
    flip:[[530,.055,.025,"triangle",0],[760,.06,.018,"sine",.035]],
    match:[[660,.09,.035,"sine",0],[880,.13,.04,"triangle",.08]],
    bubble:[[360,.055,.045,"sine",0,210]],
    coin:[[700,.07,.035,"sine",0],[1050,.11,.035,"sine",.07]],
    bounce:[[240,.055,.025,"triangle",0],[480,.06,.018,"sine",.025]],
    merge:[[460,.07,.025,"triangle",0],[690,.09,.035,"sine",.05],[920,.12,.03,"sine",.12]],
    tile:[[390,.045,.018,"sine",0]],
    tap:[[420,.04,.025,"triangle",0]],
    signal:[[880,.16,.04,"sine",0],[1175,.18,.025,"sine",.1]],
    start:[[330,.09,.03,"triangle",0],[494,.12,.03,"sine",.09]],
    crash:[[260,.17,.045,"sawtooth",0,95],[160,.2,.025,"triangle",.08,70]],
    win:[[523,.13,.035,"sine",0],[659,.13,.04,"sine",.11],[784,.18,.04,"triangle",.22],[1046,.3,.035,"sine",.36]],
    wheel:[[260,.09,.022,"sawtooth",0,500],[420,.1,.028,"triangle",.1,720],[620,.14,.025,"sine",.2,1000]],
    raveOn:[[392,.09,.025,"sawtooth",0],[587,.11,.03,"square",.07],[784,.16,.025,"triangle",.15]],
    raveOff:[[660,.08,.025,"sine",0],[440,.14,.025,"sine",.08]],
    crt:[[180,.07,.025,"square",0],[420,.09,.022,"triangle",.06]],
    matrix:[[900,.045,.02,"square",0],[1200,.055,.018,"square",.05]],
    whoosh:[[520,.18,.028,"sawtooth",0,120]],
    open:[[460,.1,.03,"sine",0],[690,.13,.025,"triangle",.1]],
    paint:[[520,.045,.035,"triangle",0],[780,.055,.018,"sine",.025]],
    brush:[[540,.11,.028,"sawtooth",0,260]],
    message:[[660,.06,.025,"sine",0],[880,.075,.024,"triangle",.055]],
    delete:[[340,.07,.03,"triangle",0,190],[210,.1,.02,"sine",.055]],
    choice:[[490,.08,.025,"triangle",0],[620,.1,.03,"sine",.075]],
    equip:[[540,.08,.03,"sine",0],[760,.11,.035,"triangle",.075],[980,.14,.025,"sine",.16]]
  };
  if (type.startsWith("simon-")) {
    const n = [392,494,587,784][(Number(type.split("-")[1]) || 0) % 4];
    jouerOscillateur(n,.16,.035,"sine",omniSfxGain,now);
    return;
  }
  (patterns[type] || patterns.click).forEach(note => {
    jouerOscillateur(note[0],note[1],Math.min(.12,note[2]*2.1),note[3],omniSfxGain,now+note[4],note[5]);
  });
}

function actualiserInterfaceRadio() {
  const station = OMNI_RADIO_STATIONS[radioStationIndex] || OMNI_RADIO_STATIONS[0];
  const nom = document.getElementById("radio-current-station");
  const style = document.getElementById("radio-current-style");
  const play = document.getElementById("radio-play-btn");
  const status = document.getElementById("radio-status");
  const visualizer = document.getElementById("omni-radio-visualizer");
  const select = document.getElementById("radio-station-select");
  const volume = document.getElementById("radio-volume");
  const volumeValue = document.getElementById("radio-volume-value");
  const sfx = document.getElementById("omni-sfx-toggle-btn");
  const sfxVolume = document.getElementById("radio-sfx-volume");
  const sfxVolumeValue = document.getElementById("radio-sfx-volume-value");
  if (nom) nom.textContent = station.name;
  if (style) style.textContent = station.style + (radioIsPlaying ? " • EN DIRECT" : " • En pause");
  if (play) {
    play.textContent = radioIsPlaying ? "Ⅱ" : "▶";
    play.setAttribute("aria-label",radioIsPlaying ? "Mettre la radio en pause" : "Lancer la radio");
  }
  if (status) status.textContent = radioIsPlaying
    ? "DIFFUSION EN DIRECT — " + station.name
    : "RADIO EN VEILLE — Appuie sur lecture pour lancer la musique.";
  if (visualizer) visualizer.classList.toggle("is-playing",radioIsPlaying);
  if (select) select.value = String(radioStationIndex);
  if (volume) volume.value = String(Math.round(omniMusicVolume*100));
  if (volumeValue) volumeValue.textContent = Math.round(omniMusicVolume*100)+"%";
  if (sfx) {
    sfx.textContent = omniSfxEnabled ? "🔊 SONS ON" : "🔇 SONS OFF";
    sfx.setAttribute("aria-pressed",String(omniSfxEnabled));
  }
  if (sfxVolume) sfxVolume.value = String(Math.round(omniSfxVolume*100));
  if (sfxVolumeValue) sfxVolumeValue.textContent = Math.round(omniSfxVolume*100)+"%";
}

function programmerNoteRadio(freq,duration,volume,wave,when,endFreq=null) {
  if (!audioCtx || !omniMusicGain) return;
  jouerOscillateur(freq,duration,Math.min(.085,volume*2.4),wave,omniMusicGain,when,endFreq);
}

function programmerPasRadio(station,step,when) {
  const position = step % 64;
  const bar = Math.floor(position/16) % station.chords.length;
  const beat = position % 16;
  const root = station.root;
  const stepDuration = 60/station.bpm/2;

  if (beat===0 || beat===8) {
    station.chords[bar].forEach((interval,index) => {
      const freq = root*4*Math.pow(2,interval/12);
      programmerNoteRadio(freq,1.55,index===0?.016:.011,"sine",when);
    });
  }
  if (beat%4===0) {
    const bass = station.bass[bar] || 0;
    const freq = root*2*Math.pow(2,bass/12);
    programmerNoteRadio(freq,.32,.04,station.bassWave,when,freq*.985);
  }
  const melody = station.melody[beat];
  if (melody!==null && melody!==undefined) {
    const freq = root*8*Math.pow(2,station.scale[melody%station.scale.length]/12);
    programmerNoteRadio(freq,station.lead==="square"?.105:.16,station.lead==="square"?.01:.02,station.lead,when);
  }
  if (beat%4===2 && station.name==="RAVE CIRCUIT") programmerNoteRadio(1700,.025,.005,"square",when);
  return stepDuration;
}

function programmerBoucleRadio() {
  if (!radioIsPlaying || !audioCtx) return;
  const station = OMNI_RADIO_STATIONS[radioStationIndex];
  const horizon = audioCtx.currentTime+.22;
  let guard = 0;
  while (radioNextStepAt<horizon && guard<12) {
    radioNextStepAt += programmerPasRadio(station,radioStep,radioNextStepAt);
    radioStep++;
    guard++;
  }
}

function lancerRadioCyber() {
  if (!initAudio()) {
    const status = document.getElementById("radio-status");
    if (status) status.textContent = "Audio indisponible dans ce navigateur.";
    return;
  }
  radioIsPlaying = true;
  appliquerVolumesAudio();
  radioStep = 0;
  radioNextStepAt = audioCtx.currentTime+.06;
  if (radioTimer!==null) clearInterval(radioTimer);
  programmerBoucleRadio();
  radioTimer = setInterval(programmerBoucleRadio,70);
  actualiserInterfaceRadio();
}

function mettreRadioEnPause() {
  radioIsPlaying = false;
  if (radioTimer!==null) clearInterval(radioTimer);
  radioTimer = null;
  appliquerVolumesAudio();
  actualiserInterfaceRadio();
}

function toggleCyberRadioPlayback() {
  if (radioIsPlaying) mettreRadioEnPause();
  else lancerRadioCyber();
}

function changerStationRadio(value) {
  const index = Number(value);
  if (!Number.isInteger(index) || index<0 || index>=OMNI_RADIO_STATIONS.length) return;
  radioStationIndex = index;
  jouerEffetSonore("open");
  sauvegarderPreferencesAudio();
  if (radioIsPlaying) {
    mettreRadioEnPause();
    lancerRadioCyber();
  } else actualiserInterfaceRadio();
}

function modifierVolumeRadio(value) {
  const volume = Number(value);
  if (!Number.isFinite(volume)) return;
  omniMusicVolume = Math.max(0,Math.min(.6,volume/100));
  appliquerVolumesAudio();
  sauvegarderPreferencesAudio();
  actualiserInterfaceRadio();
}

function modifierVolumeEffets(value) {
  const volume = Number(value);
  if (!Number.isFinite(volume)) return;
  omniSfxVolume = Math.max(0,Math.min(1,volume/100));
  appliquerVolumesAudio();
  sauvegarderPreferencesAudio();
  actualiserInterfaceRadio();
}

function toggleCyberRadioPanel() {
  const panel = document.getElementById("omni-radio-settings");
  const button = document.getElementById("omni-radio-settings-btn");
  if (!panel) return;
  panel.hidden = !panel.hidden;
  if (button) button.setAttribute("aria-expanded",String(!panel.hidden));
  jouerEffetSonore("click");
}

function toggleSoundEffects() {
  omniSfxEnabled = !omniSfxEnabled;
  appliquerVolumesAudio();
  sauvegarderPreferencesAudio();
  actualiserInterfaceRadio();
  if (omniSfxEnabled) jouerEffetSonore("success");
}

window.addEventListener("click",initAudio,{once:true});
window.addEventListener("touchstart",initAudio,{once:true,passive:true});
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
  jouerEffetSonore("matrix");

  state.matrixMode = !state.matrixMode;
  document.body.classList.toggle("matrix-mode", state.matrixMode);
  if (state.matrixMode) {
    initMatrixEngine();
    if (!matrixInterval) matrixInterval = setInterval(drawMatrixFrame, 33);
  } else {
    if (matrixInterval) clearInterval(matrixInterval);
    matrixInterval = null;
    if (matrixCtx) matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  }
  sauvegarderDonnees();
}
function compterClicsTitre() {
  jouerEffetSonore("click");
  state.titleClicks++;
  if (state.titleClicks >= 5) {
    state.titleClicks = 0;
    toggleMatrix();
    alert("💻 MODE MATRIX ACTIVÉ !");
  }
}

let raveEmojiInterval;
function creerParticuleRave() {
  if (!state.raveMode || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const container = document.getElementById("rave-emoji-container");
  if (!container) return;
  const particle = document.createElement("span");
  const symbols = ["✦","✧","⚡","♫","◆"];
  particle.className = "rave-emoji";
  particle.textContent = symbols[Math.floor(Math.random()*symbols.length)];
  particle.style.left = (5+Math.random()*90)+"vw";
  particle.style.animationDuration = (3.2+Math.random()*1.4)+"s";
  particle.style.opacity = String(.35+Math.random()*.35);
  container.appendChild(particle);
  setTimeout(() => particle.remove(),5000);
}
function toggleRaveMode() {
  state.raveMode = !state.raveMode;
  document.body.classList.toggle("rave-active",state.raveMode);
  const button = document.getElementById("rave-btn");
  if (button) {
    button.innerText = state.raveMode ? "🟢 Mode Rave : ON" : "🔴 Mode Rave : OFF";
    button.setAttribute("aria-pressed",String(state.raveMode));
  }
  if (raveEmojiInterval) { clearInterval(raveEmojiInterval); raveEmojiInterval = null; }
  if (state.raveMode) {
    jouerEffetSonore("raveOn");
    creerParticuleRave();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raveEmojiInterval = setInterval(creerParticuleRave,950);
    }
  } else {
    jouerEffetSonore("raveOff");
    const container = document.getElementById("rave-emoji-container");
    if (container) container.replaceChildren();
  }
  sauvegarderDonnees();
}
function toggleCRTMode() {
  state.crtMode = !state.crtMode;
  const overlay = document.getElementById("crt-overlay");
  const button = document.getElementById("crt-toggle-btn");
  if (overlay) overlay.style.display = state.crtMode ? "block" : "none";
  if (button) button.setAttribute("aria-pressed",String(state.crtMode));
  jouerEffetSonore("crt");
  sauvegarderDonnees();
}

function changerAvatar() {
  jouerEffetSonore("open");

  const avatars = ["🤖", "👽", "👑", "🦊", "🥷", "🦁", "👾"];
  state.userAvatar = avatars[(avatars.indexOf(state.userAvatar) + 1 || 0) % avatars.length];
  document.getElementById("profile-avatar").innerText = state.userAvatar;
  sauvegarderDonnees();
}
function sauvegarderProfil() {
  const input=document.getElementById("username-input");
  state.username=(input?.value||"Joueur Cyber").trim().slice(0,24)||"Joueur Cyber";
  if (input) input.value=state.username;
  sauvegarderDonnees();
  jouerEffetSonore("success");
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
  jouerEffetSonore("pizza");

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

  if (!item) return;
  if (state.pizzas < item.cost) { jouerEffetSonore("error"); return; }

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
  jouerEffetSonore("purchase");

}


// CARTES RARES — BOOSTERS À CHOIX ET COLLECTION PERSISTANTE
const cardsList = [
  {id:"mini-bot-neon",name:"Mini-Bot Néon",rarity:"COMMUNE",icon:"🤖",weight:38},
  {id:"renard-pixel",name:"Renard Pixel",rarity:"COMMUNE",icon:"🦊",weight:27},
  {id:"matrix-hacker",name:"Matrix Hacker",rarity:"RARE",icon:"⚡",weight:18},
  {id:"soucoupe-neon",name:"Soucoupe Volante Néon",rarity:"ÉPIQUE",icon:"🛸",weight:10},
  {id:"dragon-cyber",name:"Dragon Cybernétique",rarity:"LÉGENDAIRE",icon:"🐉",weight:5},
  {id:"pizza-quantique",name:"Pizza Quantique d'Or",rarity:"MYTHIQUE",icon:"🍕",weight:2}
];
let boosterEnCours = [];
let ouvertureBoosterEnCours = false;

function tirerCarteCosmique() {
  const total = cardsList.reduce((sum,card)=>sum+card.weight,0);
  let draw = Math.random()*total;
  for (const card of cardsList) {
    draw -= card.weight;
    if (draw<0) return card;
  }
  return cardsList[0];
}

function classeRareteCarte(rarete) {
  return "rarity-"+String(rarete||"commune").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z]/g,"");
}

function afficherCollectionCartes() {
  const grid = document.getElementById("card-collection-grid");
  if (!grid) return;
  if (!state.cardsCollection || typeof state.cardsCollection!=="object" || Array.isArray(state.cardsCollection)) {
    state.cardsCollection = {};
  }
  grid.replaceChildren();
  let unique = 0;
  let total = 0;

  cardsList.forEach(card => {
    const count = Math.max(0,Number(state.cardsCollection[card.id])||0);
    total += count;
    if (count>0) unique++;
    const item = document.createElement("article");
    item.className = "omni-collection-card "+(count>0?classeRareteCarte(card.rarity):"is-locked");
    const icon = document.createElement("span");
    icon.className = "omni-collection-icon";
    icon.textContent = count>0?card.icon:"🔒";
    const name = document.createElement("strong");
    name.textContent = count>0?card.name:"Carte à découvrir";
    const rarity = document.createElement("small");
    rarity.textContent = count>0?card.rarity:"INCONNUE";
    const quantity = document.createElement("span");
    quantity.className = "omni-collection-count";
    quantity.textContent = count>0?"×"+count:"NON OBTENUE";
    item.append(icon,name,rarity,quantity);
    grid.appendChild(item);
  });

  const counter = document.getElementById("card-collection-count");
  const progress = document.getElementById("card-collection-progress");
  const badge = document.querySelector(".omni-collection-badge");
  if (counter) counter.textContent = unique+" / "+cardsList.length;
  if (progress) progress.style.width = (unique/cardsList.length*100)+"%";
  if (badge) badge.textContent = "🎴 "+total+" CARTE"+(total>1?"S":"")+" OBTENUE"+(total>1?"S":"");
}

function ouvrirBooster() {
  if (ouvertureBoosterEnCours) return;
  const booster = document.getElementById("booster-container");
  const selection = document.getElementById("cards-selection-container");
  const pack = booster?.querySelector(".booster-pack");
  if (!booster || !selection || !pack) return;
  ouvertureBoosterEnCours = true;
  boosterEnCours = Array.from({length:3},tirerCarteCosmique);
  pack.classList.add("is-opening");
  jouerEffetSonore("booster");

  setTimeout(() => {
    booster.style.display = "none";
    selection.style.display = "block";
    selection.classList.add("is-visible");
    document.querySelectorAll("[data-card-choice]").forEach((button,index) => {
      button.disabled = false;
      button.classList.remove("is-revealed","is-selected");
      button.dataset.rarity = "";
      const symbol = button.querySelector(".card-back-symbol");
      const label = button.querySelector("small");
      if (symbol) symbol.textContent = index===1?"✧":"✦";
      if (label) label.textContent = "OMNI • 0"+(index+1);
    });
    ouvertureBoosterEnCours = false;
  },360);
}

function revelerCarte(id) {
  if (ouvertureBoosterEnCours || !Number.isInteger(Number(id))) return;
  const index = Number(id)-1;
  const card = boosterEnCours[index];
  if (!card) return;

  document.querySelectorAll("[data-card-choice]").forEach(button=>button.disabled=true);
  const selection = document.getElementById("cards-selection-container");
  const result = document.getElementById("card-result");
  const icon = document.getElementById("card-result-icon");
  const name = document.getElementById("card-result-name");
  const rarity = document.getElementById("card-result-rarity");
  if (!result || !icon || !name || !rarity) return;

  const selectedButton = document.querySelector('[data-card-choice="'+(index+1)+'"]');
  if (selectedButton) {
    selectedButton.classList.add("is-revealed","is-selected",classeRareteCarte(card.rarity));
    const symbol = selectedButton.querySelector(".card-back-symbol");
    const label = selectedButton.querySelector("small");
    if (symbol) symbol.textContent = card.icon;
    if (label) label.textContent = card.rarity;
  }
  if (!state.cardsCollection || typeof state.cardsCollection!=="object" || Array.isArray(state.cardsCollection)) {
    state.cardsCollection = {};
  }
  const duplicate = Number(state.cardsCollection[card.id])>0;
  state.cardsCollection[card.id] = (Number(state.cardsCollection[card.id])||0)+1;
  if (selection) selection.style.display = "none";

  icon.textContent = card.icon;
  icon.className = "omni-card-result-icon "+classeRareteCarte(card.rarity);
  name.textContent = card.name;
  rarity.textContent = card.rarity+(duplicate?" • DOUBLON AJOUTÉ À LA COLLECTION":" • NOUVELLE CARTE !");
  result.style.display = "grid";
  result.classList.remove("is-revealing");
  void result.offsetWidth;
  result.classList.add("is-revealing");

  jouerEffetSonore(card.rarity==="LÉGENDAIRE"||card.rarity==="MYTHIQUE"?"legendary":duplicate?"coin":"success");
  afficherCollectionCartes();
  sauvegarderDonnees();
}

function reinitialiserBooster() {
  const booster = document.getElementById("booster-container");
  const selection = document.getElementById("cards-selection-container");
  const result = document.getElementById("card-result");
  const pack = booster?.querySelector(".booster-pack");
  if (booster) booster.style.display = "flex";
  if (selection) { selection.style.display = "none"; selection.classList.remove("is-visible"); }
  if (result) result.style.display = "none";
  if (pack) pack.classList.remove("is-opening");
  document.querySelectorAll("[data-card-choice]").forEach(button => {
    button.disabled = false;
    button.classList.remove("is-revealed","is-selected","rarity-commune","rarity-rare","rarity-epique","rarity-legendaire","rarity-mythique");
  });
  boosterEnCours = [];
  ouvertureBoosterEnCours = false;
  jouerEffetSonore("open");
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
  jouerEffetSonore("start");

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
  jouerEffetSonore("simon-" + id);

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
    jouerEffetSonore("error");
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


// ROBOT IA — DÉMO LOCALE SANS ENVOI DE DONNÉES
function envoyerMessageIA() {
  const input = document.getElementById("ai-user-input");
  const chatBox = document.getElementById("ai-chat-box");
  if (!input || !chatBox) return;

  const text = input.value.trim().slice(0, 500);
  if (!text) return;

  const userMsg = document.createElement("div");
  userMsg.style.cssText = "background:var(--neon-blue); color:#0f172a; font-weight:bold; padding:8px 12px; border-radius:8px; align-self:flex-end; max-width:80%; font-size:13px; overflow-wrap:anywhere;";
  userMsg.textContent = text;
  chatBox.appendChild(userMsg);
  jouerEffetSonore("message");
  input.value = "";

  setTimeout(() => {
    const aiMsg = document.createElement("div");
    aiMsg.style.cssText = "background:#1e293b; padding:8px 12px; border-radius:8px; align-self:flex-start; max-width:80%; font-size:13px; overflow-wrap:anywhere;";
    aiMsg.textContent = "🤖 Cyber-Bot (démo) : J’ai reçu ton message. Cette version fonctionne localement et ne contacte pas un service d’IA.";
    chatBox.appendChild(aiMsg);
    jouerEffetSonore("open");
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 350);
}

// PAPIER BULLE & PIXEL ART — INTERACTIONS POINTEUR / TACTILE
let isSwipingBubble = false;
function initPapierBulle() {
  const container = document.getElementById("bubble-wrap-container");
  if (!container) return;
  container.innerHTML = "";
  container.style.touchAction = "none";
  for (let i=0;i<40;i++) {
    const bubble = document.createElement("div");
    bubble.className = "bubble-item";
    bubble.setAttribute("role","button");
    bubble.setAttribute("tabindex","0");
    bubble.setAttribute("aria-label","Faire éclater une bulle "+(i+1));
    const pop = () => {
      if (bubble.classList.contains("popped")) return;
      bubble.classList.add("popped");
      jouerEffetSonore("bubble");
    };
    bubble.addEventListener("pointerdown",event => {
      isSwipingBubble = true;
      event.preventDefault();
      pop();
    });
    bubble.addEventListener("pointerenter",() => { if (isSwipingBubble) pop(); });
    bubble.addEventListener("keydown",event => {
      if (event.key==="Enter" || event.key===" ") {
        event.preventDefault();
        pop();
      }
    });
    container.appendChild(bubble);
  }
}

let currentColor = "#38bdf8";
let isDrawingPixel = false;
let dernierSonPixel = 0;
const colorsList = ["#38bdf8","#ef4444","#22c55e","#eab308","#a855f7","#ec4899","#ffffff","#0f172a"];
function jouerSonPixelArt() {
  const now = performance.now();
  if (now-dernierSonPixel<65) return;
  dernierSonPixel=now;
  jouerEffetSonore("paint");
}
function initPixelArtPro() {
  const palette = document.getElementById("palette-container");
  if (!palette) return;
  palette.innerHTML = "";
  colorsList.forEach((color,index) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "color-swatch"+(index===0?" active":"");
    swatch.style.background = color;
    swatch.setAttribute("aria-label","Choisir la couleur "+color);
    swatch.setAttribute("aria-pressed",String(index===0));
    if (color==="#0f172a") swatch.style.border = "1px solid #64748b";
    swatch.addEventListener("click",() => {
      document.querySelectorAll(".color-swatch").forEach(node => {
        node.classList.remove("active");
        node.setAttribute("aria-pressed","false");
      });
      swatch.classList.add("active");
      swatch.setAttribute("aria-pressed","true");
      currentColor=color;
    });
    palette.appendChild(swatch);
  });
  const grid = document.getElementById("pixel-grid");
  if (!grid) return;
  grid.innerHTML = "";
  grid.style.touchAction = "none";
  for (let index=0;index<144;index++) {
    const cell=document.createElement("div");
    cell.className="omni-pixel-cell";
    cell.style.width="18px";
    cell.style.height="18px";
    cell.style.background="#1e293b";
    cell.style.borderRadius="3px";
    cell.setAttribute("role","button");
    cell.setAttribute("tabindex","0");
    cell.setAttribute("aria-label","Pixel "+(index+1));
    const paint=() => {
      if (cell.style.background===currentColor) return;
      cell.style.background=currentColor;
      cell.setAttribute("aria-label","Pixel "+(index+1)+" peint");
      jouerSonPixelArt();
    };
    cell.addEventListener("pointerdown",event => {
      isDrawingPixel=true;
      event.preventDefault();
      paint();
    });
    cell.addEventListener("pointerenter",() => { if (isDrawingPixel) paint(); });
    cell.addEventListener("keydown",event => {
      if (event.key==="Enter" || event.key===" ") {
        event.preventDefault();
        paint();
      }
    });
    grid.appendChild(cell);
  }
}
window.addEventListener("pointerup",() => { isSwipingBubble=false; isDrawingPixel=false; });
window.addEventListener("pointercancel",() => { isSwipingBubble=false; isDrawingPixel=false; });

// GRAFFITI & CHAT — CHAT DE DÉMONSTRATION LOCALE
let gCanvas, gCtx, isDrawing = false;
function initGraffiti() {
  gCanvas=document.getElementById("graffiti-canvas");
  if (!gCanvas) return;
  gCtx=gCanvas.getContext("2d");
  if (!gCtx) return;
  gCtx.strokeStyle="#38bdf8";
  gCtx.lineWidth=4;
  gCtx.lineCap="round";
  gCtx.lineJoin="round";
  gCtx.shadowColor="#38bdf8";
  gCtx.shadowBlur=7;
  gCanvas.style.touchAction="none";
  const position=event => {
    const rect=gCanvas.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*(gCanvas.width/rect.width),y:(event.clientY-rect.top)*(gCanvas.height/rect.height)};
  };
  const startDraw=event => {
    event.preventDefault();
    isDrawing=true;
    const point=position(event);
    gCtx.beginPath();
    gCtx.moveTo(point.x,point.y);
    jouerEffetSonore("brush");
    if (gCanvas.setPointerCapture) {
      try { gCanvas.setPointerCapture(event.pointerId); } catch(error) {}
    }
  };
  const stopDraw=event => {
    isDrawing=false;
    if (gCtx) gCtx.beginPath();
    if (event && gCanvas.releasePointerCapture && gCanvas.hasPointerCapture?.(event.pointerId)) {
      try { gCanvas.releasePointerCapture(event.pointerId); } catch(error) {}
    }
  };
  const draw=event => {
    if (!isDrawing) return;
    const point=position(event);
    gCtx.lineTo(point.x,point.y);
    gCtx.stroke();
    gCtx.beginPath();
    gCtx.moveTo(point.x,point.y);
  };
  gCanvas.addEventListener("pointerdown",startDraw);
  gCanvas.addEventListener("pointermove",draw);
  gCanvas.addEventListener("pointerup",stopDraw);
  gCanvas.addEventListener("pointercancel",stopDraw);
  gCanvas.addEventListener("lostpointercapture",stopDraw);
}
function effacerGraffiti() {
  if (!gCtx || !gCanvas) return;
  jouerEffetSonore("whoosh");
  gCtx.clearRect(0,0,gCanvas.width,gCanvas.height);
}

function envoyerChatCommunautaire() {
  const input = document.getElementById("community-input");
  const chatBox = document.getElementById("community-chat-box");
  if (!input || !chatBox) return;

  const text = input.value.trim().slice(0, 250);
  if (!text) return;

  const msg = document.createElement("div");
  msg.style.cssText = "background:#1e293b; padding:8px 10px; border-radius:8px; font-size:13px; overflow-wrap:anywhere;";
  const auteur = document.createElement("strong");
  auteur.style.color = "#22c55e";
  auteur.textContent = "Moi : ";
  const contenu = document.createElement("span");
  contenu.textContent = text;
  msg.append(auteur, contenu);
  chatBox.appendChild(msg);
  jouerEffetSonore("message");
  input.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;
}

function voterHumeur(humeur) {
  const statut = document.getElementById("mood-status");
  if (statut) statut.textContent = "Humeur choisie sur cet appareil : " + humeur + " (démo locale).";
  jouerEffetSonore("success");
}

// CITATIONS & DILEMMES

// CITATIONS & DILEMMES
const aiSubjects = ["L'intelligence artificielle", "La matrice néon", "Le réseau quantique", "La pizza sacrée"];
const aiVerbs = ["illumine", "transcende", "recalibre", "harmonise"];
const aiContexts = ["les réalités virtuelles.", "le futur du Cyber-Espace.", "les possibilités de l'OmniApp."];
function genererCitationIA() {
  const sub = aiSubjects[Math.floor(Math.random() * aiSubjects.length)];
  const verb = aiVerbs[Math.floor(Math.random() * aiVerbs.length)];
  const ctx = aiContexts[Math.floor(Math.random() * aiContexts.length)];
  document.getElementById("citation-display").innerText = `« ${sub} ${verb} ${ctx} »`;
  jouerEffetSonore("open");
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
  jouerEffetSonore("choice");
  const p1 = Math.floor(Math.random() * 40) + 30;
  document.getElementById("dilemme-options").style.display = "none";
  document.getElementById("dilemme-resultats").style.display = "block";
  document.getElementById("res-texte").textContent = `📊 Répartition simulée pour s'amuser : Choix 1 : ${p1}% | Choix 2 : ${100 - p1}%`;
}
function prochainDilemmeIA() {
  jouerEffetSonore("open");
  currentDilemmeIndex++;
  document.getElementById("dilemme-options").style.display = "flex";
  document.getElementById("dilemme-resultats").style.display = "none";
  chargerDilemmeIA();
}

// CAPSULES & NOTES PERSONNELLES — AFFICHAGE SÉCURISÉ
let capsulesRefreshTimer = null;

function creerCapsule() {
  const input = document.getElementById("capsule-text");
  const select = document.getElementById("capsule-delay");
  if (!input || !select) return;

  const txt = input.value.trim().slice(0, 500);
  if (!txt) return;

  const delaisAutorises = [1, 5, 60];
  const delaiDemande = Number(select.value);
  const delay = delaisAutorises.includes(delaiDemande) ? delaiDemande : 1;
  const unlockTime = Date.now() + delay * 60000;

  if (!Array.isArray(state.capsules)) state.capsules = [];
  state.capsules.unshift({ text: txt, unlockTime });
  jouerEffetSonore("success");
  state.capsules = state.capsules.slice(0, 50);

  input.value = "";
  afficherCapsules();
  sauvegarderDonnees();

  const statut = document.getElementById("capsule-status");
  if (statut) statut.textContent = "📦 Capsule créée. Elle se déverrouillera automatiquement à la fin du délai.";
}

function supprimerCapsule(index) {
  if (!Array.isArray(state.capsules) || !Number.isInteger(index)) return;
  if (index < 0 || index >= state.capsules.length) return;
  state.capsules.splice(index, 1);
  jouerEffetSonore("delete");
  afficherCapsules();
  sauvegarderDonnees();
}

function afficherCapsules() {
  const container = document.getElementById("capsules-list");
  if (!container) return;

  if (capsulesRefreshTimer !== null) {
    clearTimeout(capsulesRefreshTimer);
    capsulesRefreshTimer = null;
  }

  if (!Array.isArray(state.capsules)) state.capsules = [];
  container.replaceChildren();

  let prochainDeblocage = Infinity;

  state.capsules.forEach((capsule, index) => {
    if (!capsule || typeof capsule.text !== "string" || !Number.isFinite(capsule.unlockTime)) return;

    const locked = Date.now() < capsule.unlockTime;
    if (locked) prochainDeblocage = Math.min(prochainDeblocage, capsule.unlockTime);

    const card = document.createElement("article");
    card.className = "card omni-private-entry";
    card.style.borderColor = locked ? "#ef4444" : "var(--neon-green)";

    const titre = document.createElement("h4");
    titre.style.color = locked ? "#ef4444" : "var(--neon-green)";
    titre.textContent = locked ? "🔒 Capsule verrouillée" : "🔓 Capsule déverrouillée !";

    const message = document.createElement("p");
    message.textContent = locked ? "Message scellé… Reviens à la fin du compte à rebours." : capsule.text;

    const suppression = document.createElement("button");
    suppression.type = "button";
    suppression.className = "music-btn";
    suppression.textContent = "🗑️ Supprimer";
    suppression.addEventListener("click", () => supprimerCapsule(index));

    card.append(titre, message, suppression);
    container.appendChild(card);
  });

  if (Number.isFinite(prochainDeblocage)) {
    const attente = Math.max(50, Math.min(prochainDeblocage - Date.now() + 50, 2147483000));
    capsulesRefreshTimer = setTimeout(afficherCapsules, attente);
  }
}

function publierSecret() {
  const input = document.getElementById("secret-input");
  if (!input) return;
  const txt = input.value.trim().slice(0, 500);
  if (!txt) return;

  if (!Array.isArray(state.secrets)) state.secrets = [];
  state.secrets.unshift(txt);
  jouerEffetSonore("success");
  state.secrets = state.secrets.slice(0, 50);
  input.value = "";
  afficherSecrets();
  sauvegarderDonnees();
}

function afficherSecrets() {
  const container = document.getElementById("secrets-list");
  if (!container) return;

  if (!Array.isArray(state.secrets)) state.secrets = [];
  container.replaceChildren();

  state.secrets.forEach((secret, index) => {
    if (typeof secret !== "string") return;

    const card = document.createElement("article");
    card.className = "card omni-private-entry";
    card.style.borderColor = "var(--neon-blue)";

    const message = document.createElement("p");
    message.style.cssText = "font-size:16px; margin:0; overflow-wrap:anywhere;";
    message.textContent = "🤫 “" + secret + "”";

    const suppression = document.createElement("button");
    suppression.type = "button";
    suppression.className = "music-btn";
    suppression.textContent = "🗑️ Supprimer";
    suppression.addEventListener("click", () => supprimerSecret(index));

    card.append(message, suppression);
    container.appendChild(card);
  });
}

function supprimerSecret(index) {
  if (!Array.isArray(state.secrets) || !Number.isInteger(index)) return;
  if (index < 0 || index >= state.secrets.length) return;
  state.secrets.splice(index, 1);
  jouerEffetSonore("delete");
  afficherSecrets();
  sauvegarderDonnees();
}

function detruireSouciGeant() {
  const textarea = document.getElementById("vent-input");
  if (!textarea || !textarea.value.trim()) return;
  if (textarea.dataset.animating === "true") return;
  jouerEffetSonore("whoosh");

  textarea.dataset.animating = "true";
  textarea.style.transition = "transform 0.65s ease, opacity 0.65s ease";
  textarea.style.transform = "scale(0) rotate(360deg)";
  textarea.style.opacity = "0";

  setTimeout(() => {
    textarea.value = "";
    textarea.style.transform = "none";
    textarea.style.opacity = "1";
    textarea.dataset.animating = "false";
  }, 650);
}

// BOUTIQUE COSMÉTIQUE

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
  if (!Number.isFinite(cost) || cost < 0 || state.omniPoints < cost) {
    jouerEffetSonore("error");
    alert("Points OMNI ⭐ insuffisants !");
    return;
  }
  if (state.unlockedSkins.includes(id)) {
    equiperSkin(id);
    return;
  }
  state.omniPoints -= cost;
  state.unlockedSkins.push(id);
  jouerEffetSonore("purchase");
  equiperSkin(id);
  genererBoutiqueCosmetique();
  rafraichirAffichagePizza();
  sauvegarderDonnees();
}
function equiperSkin(id) {
  if (!state.unlockedSkins.includes(id)) return;
  const changed = state.activeSkin !== id;
  state.activeSkin = id;
  const pizzaEl = document.getElementById("pizza-gigante");
  if (pizzaEl) {
    pizzaEl.innerText = id;
    pizzaEl.classList.remove("clicked");
    void pizzaEl.offsetWidth;
    pizzaEl.classList.add("skin-equipped");
    setTimeout(() => pizzaEl.classList.remove("skin-equipped"),500);
  }
  if (changed) jouerEffetSonore("equip");
  genererBoutiqueCosmetique();
  sauvegarderDonnees();
}


// ROUE OMNI — UNE TENTATIVE PAR JOUR CALENDAIRE
let wheelCanvas, wheelCtx;
let isSpinning = false;
let wheelRotation = 0;
let wheelSpinTimeout = null;
const OMNI_WHEEL_DATE_KEY = "omni_wheel_last_spin_date";

// Chaque segment possède sa propre récompense
const rewards = [
  { label: "+100 ⭐", type: "omni", amount: 100 },
  { label: "Rien... 😢", type: "nothing", amount: 0 },
  { label: "+500 🍕", type: "pizza", amount: 500 },
  { label: "+10 ⭐", type: "omni", amount: 10 },
  { label: "LÉGENDAIRE +50 ⭐", type: "omni", amount: 50 },
  { label: "Rien !", type: "nothing", amount: 0 }
];

function dateLocaleActuelle() {
  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = String(maintenant.getMonth() + 1).padStart(2, "0");
  const jour = String(maintenant.getDate()).padStart(2, "0");
  return annee + "-" + mois + "-" + jour;
}

function roueDejaUtiliseeAujourdHui() {
  try {
    return localStorage.getItem(OMNI_WHEEL_DATE_KEY) === dateLocaleActuelle();
  } catch (erreur) {
    console.warn("Impossible de lire la date de la roue :", erreur);
    return false;
  }
}

function actualiserRoueQuotidienne() {
  const dejaUtilisee = roueDejaUtiliseeAujourdHui();
  const boutonOuvrir = document.getElementById("wheel-open-btn");
  const boutonTourner = document.getElementById("spin-wheel-btn");
  const statut = document.getElementById("wheel-status");
  const statutPage = document.getElementById("wheel-page-status");
  const boutonFermer = document.getElementById("wheel-close-btn");
  const disponible = !dejaUtilisee && !isSpinning;

  if (boutonOuvrir) {
    boutonOuvrir.disabled = !disponible;
    boutonOuvrir.textContent = dejaUtilisee ? "✅ Reviens demain !" : "🎡 Lancer la Grande Roue !";
  }
  if (boutonTourner) {
    boutonTourner.disabled = !disponible;
    boutonTourner.textContent = dejaUtilisee ? "✅ Déjà utilisée aujourd’hui" : "🎰 TOURNER !";
  }
  const messageRoue = isSpinning
    ? "✨ La roue tourne…"
    : dejaUtilisee
      ? "Tu as déjà utilisé ta roue aujourd’hui. Reviens demain pour une nouvelle tentative."
      : "Une tentative gratuite par jour. Les récompenses sont virtuelles et restent sur cet appareil.";
  if (statut) statut.textContent = messageRoue;
  if (statutPage) statutPage.textContent = dejaUtilisee
    ? "✅ Tentative utilisée aujourd'hui. La prochaine sera disponible demain."
    : "🎁 Ta tentative quotidienne est disponible.";
  if (boutonFermer) boutonFermer.disabled = isSpinning;
}

function ouvrirGrandeRoue() {
  const modal = document.getElementById("wheel-modal");
  if (!modal) return;
  modal.style.display = "flex";
  jouerEffetSonore("open");
  dessinerRoue();
  actualiserRoueQuotidienne();
}

function fermerGrandeRoue() {
  const modal = document.getElementById("wheel-modal");
  if (modal && !isSpinning) { modal.style.display = "none"; jouerEffetSonore("open"); }
}

function dessinerRoue() {
  wheelCanvas = document.getElementById("wheel-canvas");
  if (!wheelCanvas) return;

  wheelCtx = wheelCanvas.getContext("2d");
  if (!wheelCtx) return;

  const numOptions = rewards.length;
  const arcSize = (2 * Math.PI) / numOptions;
  const colors = ["#ef4444", "#38bdf8", "#a855f7", "#eab308", "#22c55e", "#ec4899"];

  wheelCtx.clearRect(0, 0, 320, 320);

  for (let i = 0; i < numOptions; i++) {
    wheelCtx.beginPath();
    wheelCtx.fillStyle = colors[i];
    wheelCtx.moveTo(160, 160);
    wheelCtx.arc(160, 160, 150, i * arcSize, (i + 1) * arcSize);
    wheelCtx.closePath();
    wheelCtx.fill();

    wheelCtx.save();
    wheelCtx.translate(160, 160);
    wheelCtx.rotate(i * arcSize + arcSize / 2);
    wheelCtx.fillStyle = "white";
    wheelCtx.font = "bold 12px sans-serif";
    wheelCtx.textAlign = "left";
    wheelCtx.fillText(rewards[i].label, 50, 5);
    wheelCtx.restore();
  }
}

function tournerLaGrandeRoue() {
  if (isSpinning || !wheelCanvas || roueDejaUtiliseeAujourdHui()) {
    actualiserRoueQuotidienne();
    return;
  }

  isSpinning = true;
  jouerEffetSonore("wheel");
  try {
    localStorage.setItem(OMNI_WHEEL_DATE_KEY, dateLocaleActuelle());
  } catch (erreur) {
    jouerEffetSonore("error");
    console.warn("La roue ne peut pas enregistrer sa date :", erreur);
    isSpinning = false;
    actualiserRoueQuotidienne();
    return;
  }

  const rewardIndex = Math.floor(Math.random() * rewards.length);
  const reward = rewards[rewardIndex];
  const segmentAngle = 360 / rewards.length;
  const centerAngle = rewardIndex * segmentAngle + segmentAngle / 2;
  const targetAngle = (270 - centerAngle + 360) % 360;
  const currentAngle = wheelRotation % 360;
  const extraAngle = (targetAngle - currentAngle + 360) % 360;

  wheelRotation += 360 * 8 + extraAngle;
  wheelCanvas.style.transition = "transform 4.2s cubic-bezier(.12,.72,.18,1)";
  wheelCanvas.style.transform = "rotate(" + wheelRotation + "deg)";
  actualiserRoueQuotidienne();

  wheelSpinTimeout = setTimeout(() => {
    wheelSpinTimeout = null;

    if (reward.type === "omni") {
      jouerEffetSonore("win");
      state.omniPoints += reward.amount;
    } else if (reward.type === "pizza") {
      jouerEffetSonore("win");
      state.pizzas += reward.amount;
    }

    rafraichirAffichagePizza();
    sauvegarderDonnees();
    isSpinning = false;
    actualiserRoueQuotidienne();

    if (reward.type === "omni") {
      alert("🎉 Bravo ! Tu remportes " + reward.amount + " Points OMNI ⭐ !");
    } else if (reward.type === "pizza") {
      alert("🍕 Super ! Tu remportes " + reward.amount + " pizzas !");
    } else {
      jouerEffetSonore("error");
      alert("😢 Pas de récompense cette fois-ci. Reviens demain !");
    }

    const modal = document.getElementById("wheel-modal");
    if (modal) modal.style.display = "none";
  }, 4200);
}

function switchTab(tabId) {
  jouerEffetSonore("nav");
  const moreMenu = document.querySelector(".more-nav");
  if (moreMenu) moreMenu.open = false;

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
  document.body.classList.toggle("matrix-mode",state.matrixMode);
  if (state.matrixMode && !matrixInterval) matrixInterval = setInterval(drawMatrixFrame,33);
  const raveButton = document.getElementById("rave-btn");
  const crtButton = document.getElementById("crt-toggle-btn");
  const crtOverlay = document.getElementById("crt-overlay");
  document.body.classList.toggle("rave-active",state.raveMode);
  if (raveButton) {
    raveButton.textContent = state.raveMode ? "🟢 Mode Rave : ON" : "🔴 Mode Rave : OFF";
    raveButton.setAttribute("aria-pressed",String(state.raveMode));
  }
  if (state.raveMode && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    creerParticuleRave();
    raveEmojiInterval = setInterval(creerParticuleRave,950);
  }
  if (crtOverlay) crtOverlay.style.display = state.crtMode ? "block" : "none";
  if (crtButton) crtButton.setAttribute("aria-pressed",String(state.crtMode));
  initPapierBulle();
  initPixelArtPro();
  initGraffiti();
  chargerDilemmeIA();
  genererBoutiqueCosmetique();
  afficherCollectionCartes();
  chargerPreferencesAudio();
  actualiserInterfaceRadio();
  afficherCapsules();
  afficherSecrets();
  actualiserRoueQuotidienne();
  rafraichirAffichagePizza();

  const annonceHorsLigne = document.getElementById("offline-reward-banner");
  if (annonceHorsLigne && bonusHorsLigne > 0) {
    annonceHorsLigne.hidden = false;
    annonceHorsLigne.textContent = "🚀 Bon retour ! Ta production a généré " +
      bonusHorsLigne.toLocaleString("fr-FR") +
      " pizzas pendant ton absence (maximum 8 heures).";
  }
  
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
const omniJeuxDisponibles = ["simon", "snake", "memory", "reflex", "pong", "2048", "morpion", "space", "quiz"];



// Ouvrir un mini-jeu depuis le menu
function ouvrirMiniJeu(nom) {
  if (!omniJeuxDisponibles.includes(nom)) {
    alert("🚧 Ce mini-jeu arrive dans une prochaine mise à jour !");
    return;
  }

  // Arrêter le jeu précédent
  jouerEffetSonore("open");
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
  if (nom === "pong") dessinerPong();
  if (nom === "2048" && !jeu2048Initialise) demarrer2048();
  if (nom === "morpion") initialiserMorpion();
  if (nom === "space") {
    actualiserScoreSpace();
    dessinerSpaceDodger(false);
  }
  if (nom === "quiz") initialiserQuiz();
}


// Revenir au menu de l'Arcade
function retourMenuArcade() {
  jouerEffetSonore("nav");

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

  // Couper les animations et minuteries des autres mini-jeux
  if (typeof arreterReflexe === "function") arreterReflexe();
  if (typeof arreterPong === "function") arreterPong();
  if (typeof arreterSpaceDodger === "function") arreterSpaceDodger();
  if (typeof arreterQuiz === "function") arreterQuiz();
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
  jouerEffetSonore("start");

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
  jouerEffetSonore("tap");

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
    jouerEffetSonore("coin");
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
  jouerEffetSonore("crash");
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
  jouerEffetSonore("start");


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
  jouerEffetSonore("flip");

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
      jouerEffetSonore("match");
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
      jouerEffetSonore("error");
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
  jouerEffetSonore("win");
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
   MINI-JEUX OMNI-APP — RÉFLEXE, PONG, 2048, MORPION,
   SPACE DODGER ET QUIZ
========================================================= */

/* RÉFLEXE NÉON */
let reflexTimer = null;
let reflexEtat = "idle";
let reflexDebut = 0;
let reflexRecord = Number(localStorage.getItem("omni_reflex_best")) || 0;

function actualiserReflexe() {
  const best = document.getElementById("reflex-best");
  if (best) best.textContent = reflexRecord ? reflexRecord + " ms" : "--";
}

function initialiserReflexe() {
  if (reflexTimer !== null) clearTimeout(reflexTimer);
  reflexTimer = null;
  reflexEtat = "idle";
  const cible = document.getElementById("reflex-target");
  const statut = document.getElementById("reflex-status");
  const temps = document.getElementById("reflex-time");
  const bouton = document.getElementById("reflex-start");
  if (cible) cible.classList.remove("ready", "waiting");
  if (statut) statut.textContent = "APPUIE SUR DÉMARRER";
  if (temps) temps.textContent = "--";
  if (bouton) bouton.disabled = false;
  actualiserReflexe();
}

function demarrerReflexe() {
  if (reflexTimer !== null) clearTimeout(reflexTimer);
  const cible = document.getElementById("reflex-target");
  const statut = document.getElementById("reflex-status");
  const bouton = document.getElementById("reflex-start");
  const temps = document.getElementById("reflex-time");
  if (!cible || !statut) return;
  jouerEffetSonore("start");

  reflexEtat = "waiting";
  cible.classList.remove("ready");
  cible.classList.add("waiting");
  statut.textContent = "ATTENDS LE SIGNAL VERT…";
  if (temps) temps.textContent = "--";
  if (bouton) bouton.disabled = true;

  const delai = 1300 + Math.random() * 2200;
  reflexTimer = setTimeout(() => {
    if (reflexEtat !== "waiting") return;
    reflexEtat = "ready";
    reflexDebut = performance.now();
    jouerEffetSonore("signal");
    cible.classList.remove("waiting");
    cible.classList.add("ready");
    statut.textContent = "MAINTENANT ! CLIQUE !";
  }, delai);
}

function cliquerReflexe() {
  const cible = document.getElementById("reflex-target");
  const statut = document.getElementById("reflex-status");
  const temps = document.getElementById("reflex-time");
  const bouton = document.getElementById("reflex-start");
  if (!cible || !statut) return;

  if (reflexEtat === "waiting") {
    if (reflexTimer !== null) clearTimeout(reflexTimer);
    reflexTimer = null;
    reflexEtat = "idle";
    jouerEffetSonore("error");
    cible.classList.remove("waiting", "ready");
    statut.textContent = "TROP TÔT ! Recommence.";
    if (bouton) bouton.disabled = false;
    return;
  }

  if (reflexEtat !== "ready") {
    statut.textContent = "Clique d'abord sur DÉMARRER.";
    return;
  }

  const reaction = Math.max(0, Math.round(performance.now() - reflexDebut));
  jouerEffetSonore("success");
  reflexEtat = "idle";
  reflexTimer = null;
  cible.classList.remove("ready", "waiting");
  if (temps) temps.textContent = reaction + " ms";

  if (reflexRecord === 0 || reaction < reflexRecord) {
    reflexRecord = reaction;
    localStorage.setItem("omni_reflex_best", String(reflexRecord));
    statut.textContent = "🏆 NOUVEAU RECORD ! " + reaction + " ms";
  } else {
    statut.textContent = reaction < 250 ? "⚡ ÉCLAIR ! " + reaction + " ms" : "Bien joué ! " + reaction + " ms";
  }

  if (bouton) bouton.disabled = false;
  actualiserReflexe();
}

function arreterReflexe() {
  if (reflexTimer !== null) clearTimeout(reflexTimer);
  reflexTimer = null;
  if (reflexEtat === "waiting" || reflexEtat === "ready") {
    reflexEtat = "idle";
    const cible = document.getElementById("reflex-target");
    const statut = document.getElementById("reflex-status");
    const bouton = document.getElementById("reflex-start");
    if (cible) cible.classList.remove("ready", "waiting");
    if (statut) statut.textContent = "Partie arrêtée. Tu peux recommencer.";
    if (bouton) bouton.disabled = false;
  }
}

/* PONG NÉON — RAQUETTES HORIZONTALES ET ADVERSAIRE AUTOMATIQUE */
const PONG_LARGEUR = 480;
const PONG_HAUTEUR = 320;
const PONG_RAQUETTE_L = 88;
const PONG_RAQUETTE_H = 12;
let pongCanvas = null;
let pongCtx = null;
let pongAnimation = null;
let pongEnCours = false;
let pongDerniereImage = 0;
let pongJoueurX = 196;
let pongJoueurCibleX = 196;
let pongRaquetteIdleAnimation = null;
let pongRaquetteIdleDerniereImage = 0;
let pongCpuX = 196;
let pongScoreJoueur = 0;
let pongScoreCpu = 0;
let pongBalle = { x: 240, y: 160, vx: 3.1, vy: 3.4, r: 7 };

function obtenirCanvasPong() {
  if (!pongCanvas) {
    pongCanvas = document.getElementById("pong-canvas");
    if (pongCanvas) pongCtx = pongCanvas.getContext("2d");
  }
  return pongCanvas && pongCtx;
}

function mettreAJourScorePong() {
  const joueur = document.getElementById("pong-player-score");
  const cpu = document.getElementById("pong-cpu-score");
  if (joueur) joueur.textContent = String(pongScoreJoueur);
  if (cpu) cpu.textContent = String(pongScoreCpu);
}

function dessinerPong() {
  if (!obtenirCanvasPong()) return;
  const ctx = pongCtx;
  ctx.clearRect(0, 0, PONG_LARGEUR, PONG_HAUTEUR);
  const fond = ctx.createLinearGradient(0, 0, PONG_LARGEUR, PONG_HAUTEUR);
  fond.addColorStop(0, "#101d38");
  fond.addColorStop(1, "#070b18");
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, PONG_LARGEUR, PONG_HAUTEUR);

  ctx.strokeStyle = "#38e8ff55";
  ctx.lineWidth = 2;
  ctx.setLineDash([9, 10]);
  ctx.beginPath();
  ctx.moveTo(0, PONG_HAUTEUR / 2);
  ctx.lineTo(PONG_LARGEUR, PONG_HAUTEUR / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.shadowBlur = 18;
  ctx.shadowColor = "#c084fc";
  ctx.fillStyle = "#c084fc";
  ctx.fillRect(pongCpuX, 18, PONG_RAQUETTE_L, PONG_RAQUETTE_H);
  ctx.shadowColor = "#38e8ff";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#38e8ff";
  ctx.fillRect(pongJoueurX, PONG_HAUTEUR - 30, PONG_RAQUETTE_L, PONG_RAQUETTE_H);

  ctx.beginPath();
  ctx.arc(pongBalle.x, pongBalle.y, pongBalle.r, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;

  if (!pongEnCours) {
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 17px Arial";
    ctx.fillText("PREMIER À 5 POINTS", PONG_LARGEUR / 2, 155);
  }
}

function lancerBallePong(direction) {
  pongBalle = {
    x: PONG_LARGEUR / 2,
    y: PONG_HAUTEUR / 2,
    vx: (Math.random() > 0.5 ? 1 : -1) * (2.8 + Math.random() * 0.8),
    vy: direction * 3.4,
    r: 7
  };
}

function demarrerPong() {
  jouerEffetSonore("start");

  if (!obtenirCanvasPong() || pongEnCours) return;
  if (pongAnimation !== null) cancelAnimationFrame(pongAnimation);
  pongScoreJoueur = 0;
  pongScoreCpu = 0;
  if (pongRaquetteIdleAnimation !== null) {
    cancelAnimationFrame(pongRaquetteIdleAnimation);
  }
  pongRaquetteIdleAnimation = null;
  pongRaquetteIdleDerniereImage = 0;
  pongJoueurX = (PONG_LARGEUR - PONG_RAQUETTE_L) / 2;
  pongJoueurCibleX = pongJoueurX;
  pongCpuX = pongJoueurX;
  lancerBallePong(Math.random() > 0.5 ? 1 : -1);
  mettreAJourScorePong();
  pongEnCours = true;
  const boutonJouer = document.getElementById("pong-start");
  if (boutonJouer) boutonJouer.disabled = true;
  pongDerniereImage = 0;
  const statut = document.getElementById("pong-status");
  if (statut) statut.textContent = "À toi de renvoyer la balle ! Flèches gauche/droite ou boutons.";
  pongAnimation = requestAnimationFrame(bouclePong);
  dessinerPong();
}

// Quand la partie est au repos, on anime aussi la raquette pour que les
// boutons restent agréables à utiliser avant le lancement d'une manche.
function animerRaquettePongHorsJeu(timestamp) {
  if (pongEnCours) {
    pongRaquetteIdleAnimation = null;
    pongRaquetteIdleDerniereImage = 0;
    return;
  }

  const facteur = pongRaquetteIdleDerniereImage
    ? Math.min((timestamp - pongRaquetteIdleDerniereImage) / 16.67, 2)
    : 1;
  pongRaquetteIdleDerniereImage = timestamp;

  const ecart = pongJoueurCibleX - pongJoueurX;
  pongJoueurX += ecart * (1 - Math.pow(0.82, facteur));

  if (Math.abs(pongJoueurCibleX - pongJoueurX) < 0.35) {
    pongJoueurX = pongJoueurCibleX;
    pongRaquetteIdleAnimation = null;
    pongRaquetteIdleDerniereImage = 0;
    dessinerPong();
    return;
  }

  dessinerPong();
  pongRaquetteIdleAnimation = requestAnimationFrame(animerRaquettePongHorsJeu);
}

function deplacerRaquettePong(direction) {
  jouerEffetSonore("tap");

  const sens = direction === "left" ? -1 : 1;
  // Un clic donne un vrai déplacement, mais la raquette glisse jusqu'à sa cible.
  pongJoueurCibleX = Math.max(
    0,
    Math.min(PONG_LARGEUR - PONG_RAQUETTE_L, pongJoueurCibleX + sens * 90)
  );

  if (!pongEnCours && pongRaquetteIdleAnimation === null) {
    pongRaquetteIdleDerniereImage = 0;
    pongRaquetteIdleAnimation = requestAnimationFrame(animerRaquettePongHorsJeu);
  }
}

function bouclePong(timestamp) {
  if (!pongEnCours) return;
  const facteur = pongDerniereImage ? Math.min((timestamp - pongDerniereImage) / 16.67, 2) : 1;
  pongDerniereImage = timestamp;

  // La raquette suit sa position cible avec une accélération douce.
  const ecartRaquette = pongJoueurCibleX - pongJoueurX;
  pongJoueurX += ecartRaquette * (1 - Math.pow(0.82, facteur));
  if (Math.abs(pongJoueurCibleX - pongJoueurX) < 0.35) {
    pongJoueurX = pongJoueurCibleX;
  }

  pongBalle.x += pongBalle.vx * facteur;
  pongBalle.y += pongBalle.vy * facteur;

  if (pongBalle.x - pongBalle.r <= 0) {
    jouerEffetSonore("bounce");
    pongBalle.x = pongBalle.r;
    pongBalle.vx = Math.abs(pongBalle.vx);
  } else if (pongBalle.x + pongBalle.r >= PONG_LARGEUR) {
    jouerEffetSonore("bounce");
    pongBalle.x = PONG_LARGEUR - pongBalle.r;
    pongBalle.vx = -Math.abs(pongBalle.vx);
  }

  const cibleCpu = Math.max(0, Math.min(PONG_LARGEUR - PONG_RAQUETTE_L, pongBalle.x - PONG_RAQUETTE_L / 2));
  const ecartCpu = cibleCpu - pongCpuX;
  pongCpuX += Math.max(-2.6 * facteur, Math.min(2.6 * facteur, ecartCpu));

  const yJoueur = PONG_HAUTEUR - 30;
  if (pongBalle.vy > 0 &&
      pongBalle.y + pongBalle.r >= yJoueur &&
      pongBalle.y - pongBalle.r <= yJoueur + PONG_RAQUETTE_H &&
      pongBalle.x >= pongJoueurX - pongBalle.r &&
      pongBalle.x <= pongJoueurX + PONG_RAQUETTE_L + pongBalle.r) {
    jouerEffetSonore("bounce");
    pongBalle.y = yJoueur - pongBalle.r;
    pongBalle.vy = -Math.abs(pongBalle.vy) * 1.025;
    const decalage = (pongBalle.x - (pongJoueurX + PONG_RAQUETTE_L / 2)) / (PONG_RAQUETTE_L / 2);
    pongBalle.vx += decalage * 1.05;
  }

  const yCpu = 18 + PONG_RAQUETTE_H;
  if (pongBalle.vy < 0 &&
      pongBalle.y - pongBalle.r <= yCpu &&
      pongBalle.y + pongBalle.r >= yCpu - PONG_RAQUETTE_H &&
      pongBalle.x >= pongCpuX - pongBalle.r &&
      pongBalle.x <= pongCpuX + PONG_RAQUETTE_L + pongBalle.r) {
    jouerEffetSonore("bounce");
    pongBalle.y = yCpu + pongBalle.r;
    pongBalle.vy = Math.abs(pongBalle.vy) * 1.015;
    const decalageCpu = (pongBalle.x - (pongCpuX + PONG_RAQUETTE_L / 2)) / (PONG_RAQUETTE_L / 2);
    pongBalle.vx += decalageCpu * 0.75;
  }

  if (pongBalle.y < -pongBalle.r) {
    jouerEffetSonore("success");
    pongScoreJoueur++;
    mettreAJourScorePong();
    if (pongScoreJoueur >= 5) return terminerPong("🏆 Victoire ! Tu as battu l'ordinateur.");
    lancerBallePong(1);
  } else if (pongBalle.y > PONG_HAUTEUR + pongBalle.r) {
    jouerEffetSonore("error");
    pongScoreCpu++;
    mettreAJourScorePong();
    if (pongScoreCpu >= 5) return terminerPong("🤖 L'ordinateur gagne cette manche. Retente ta chance !");
    lancerBallePong(-1);
  }

  dessinerPong();
  pongAnimation = requestAnimationFrame(bouclePong);
}

function terminerPong(message) {
  jouerEffetSonore(message.includes("Victoire") ? "win" : "crash");
  pongEnCours = false;
  const boutonJouer = document.getElementById("pong-start");
  if (boutonJouer) boutonJouer.disabled = false;
  if (pongAnimation !== null) cancelAnimationFrame(pongAnimation);
  pongAnimation = null;
  const statut = document.getElementById("pong-status");
  if (statut) statut.textContent = message + " Clique sur JOUER pour une revanche.";
  dessinerPong();
}

function arreterPong() {
  const etaitEnCours = pongEnCours;
  pongEnCours = false;
  if (pongAnimation !== null) cancelAnimationFrame(pongAnimation);
  pongAnimation = null;
  if (pongRaquetteIdleAnimation !== null) {
    cancelAnimationFrame(pongRaquetteIdleAnimation);
  }
  pongRaquetteIdleAnimation = null;
  pongRaquetteIdleDerniereImage = 0;
  const boutonJouer = document.getElementById("pong-start");
  if (boutonJouer) boutonJouer.disabled = false;
  const statut = document.getElementById("pong-status");
  if (etaitEnCours && statut) statut.textContent = "Partie interrompue. Clique sur JOUER pour recommencer.";
}

/* 2048 CYBER */
let grille2048 = Array(16).fill(0);
let score2048 = 0;
let meilleur2048 = Number(localStorage.getItem("omni_2048_best")) || 0;
let jeu2048Initialise = false;
let jeu2048Actif = false;
let victoire2048 = false;

function statut2048(message) {
  const element = document.getElementById("2048-status");
  if (element) element.textContent = message;
}

function ajouterTuile2048() {
  const casesVides = [];
  grille2048.forEach((valeur, index) => {
    if (valeur === 0) casesVides.push(index);
  });
  if (!casesVides.length) return;
  const index = casesVides[Math.floor(Math.random() * casesVides.length)];
  grille2048[index] = Math.random() < 0.9 ? 2 : 4;
}

function afficher2048() {
  const grille = document.getElementById("2048-grid");
  const score = document.getElementById("2048-score");
  const record = document.getElementById("2048-best");
  if (!grille) return;
  grille.replaceChildren();
  grille2048.forEach((valeur, index) => {
    const tuile = document.createElement("div");
    tuile.dataset.value = String(valeur);
    tuile.textContent = valeur ? String(valeur) : "";
    tuile.setAttribute("aria-label", valeur ? "Case " + (index + 1) + " : " + valeur : "Case vide");
    grille.appendChild(tuile);
  });
  if (score) score.textContent = score2048.toLocaleString("fr-FR");
  if (record) record.textContent = meilleur2048.toLocaleString("fr-FR");
}

function demarrer2048() {
  jouerEffetSonore("start");

  grille2048 = Array(16).fill(0);
  score2048 = 0;
  victoire2048 = false;
  jeu2048Actif = true;
  jeu2048Initialise = true;
  ajouterTuile2048();
  ajouterTuile2048();
  afficher2048();
  statut2048("Fusionne deux tuiles identiques. Utilise les flèches ou les boutons.");
}

function lignes2048(direction) {
  const lignes = [];
  for (let i = 0; i < 4; i++) {
    let indices;
    if (direction === "left" || direction === "right") {
      indices = [i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3];
    } else {
      indices = [i, i + 4, i + 8, i + 12];
    }
    if (direction === "right" || direction === "down") indices.reverse();
    lignes.push(indices);
  }
  return lignes;
}

function aDesCoups2048() {
  if (grille2048.some(valeur => valeur === 0)) return true;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const index = y * 4 + x;
      if (x < 3 && grille2048[index] === grille2048[index + 1]) return true;
      if (y < 3 && grille2048[index] === grille2048[index + 4]) return true;
    }
  }
  return false;
}

function deplacer2048(direction) {
  if (!jeu2048Actif) return;
  const avant = grille2048.join(",");
  let pointsGagnes = 0;

  lignes2048(direction).forEach(indices => {
    const valeurs = indices.map(index => grille2048[index]).filter(valeur => valeur !== 0);
    const fusion = [];
    for (let i = 0; i < valeurs.length; i++) {
      if (valeurs[i] === valeurs[i + 1]) {
        const nouvelleValeur = valeurs[i] * 2;
        fusion.push(nouvelleValeur);
        pointsGagnes += nouvelleValeur;
        i++;
      } else {
        fusion.push(valeurs[i]);
      }
    }
    while (fusion.length < 4) fusion.push(0);
    indices.forEach((index, position) => {
      grille2048[index] = fusion[position];
    });
  });

  if (avant === grille2048.join(",")) return;
  jouerEffetSonore(pointsGagnes > 0 ? "merge" : "tile");
  score2048 += pointsGagnes;
  if (score2048 > meilleur2048) {
    meilleur2048 = score2048;
    localStorage.setItem("omni_2048_best", String(meilleur2048));
  }
  ajouterTuile2048();
  afficher2048();

  if (!victoire2048 && grille2048.some(valeur => valeur >= 2048)) {
    victoire2048 = true;
    jouerEffetSonore("win");
    statut2048("🏆 2048 atteint ! Tu peux continuer à jouer pour battre ton record.");
  } else if (!aDesCoups2048()) {
    jeu2048Actif = false;
    jouerEffetSonore("crash");
    statut2048("Fin de partie ! Score : " + score2048 + ". Clique sur RECOMMENCER.");
  } else if (!victoire2048) {
    statut2048("Bien joué ! Continue à fusionner les tuiles.");
  }
}

/* MORPION CYBER — DEUX JOUEURS SUR LE MÊME ÉCRAN */
let morpionPlateau = Array(9).fill("");
let morpionJoueur = "X";
let morpionTermine = false;
const MORPION_LIGNES_GAGNANTES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function afficherMorpion(ligneGagnante) {
  const grille = document.getElementById("morpion-grid");
  if (!grille) return;
  const boutons = grille.querySelectorAll("button");
  boutons.forEach((bouton, index) => {
    const valeur = morpionPlateau[index];
    bouton.textContent = valeur;
    bouton.disabled = morpionTermine || Boolean(valeur);
    bouton.classList.toggle("morpion-x", valeur === "X");
    bouton.classList.toggle("morpion-o", valeur === "O");
    bouton.classList.toggle("is-winner", Boolean(ligneGagnante && ligneGagnante.includes(index)));
    bouton.setAttribute("aria-label", "Case " + (index + 1) + (valeur ? " : " + valeur : " vide"));
  });
}

function initialiserMorpion() {
  jouerEffetSonore("start");

  morpionPlateau = Array(9).fill("");
  morpionJoueur = "X";
  morpionTermine = false;
  const statut = document.getElementById("morpion-status");
  if (statut) statut.textContent = "À toi de jouer, joueur X !";
  afficherMorpion(null);
}

function jouerMorpion(index) {
  if (!Number.isInteger(index) || index < 0 || index > 8) return;
  if (morpionTermine || morpionPlateau[index]) return;
  morpionPlateau[index] = morpionJoueur;
  jouerEffetSonore("tap");

  const ligneGagnante = MORPION_LIGNES_GAGNANTES.find(ligne =>
    ligne.every(position => morpionPlateau[position] === morpionJoueur)
  );
  const statut = document.getElementById("morpion-status");

  if (ligneGagnante) {
    jouerEffetSonore("win");
    morpionTermine = true;
    if (statut) statut.textContent = "🏆 Joueur " + morpionJoueur + " remporte la partie !";
    afficherMorpion(ligneGagnante);
    return;
  }

  if (morpionPlateau.every(Boolean)) {
    jouerEffetSonore("success");
    morpionTermine = true;
    if (statut) statut.textContent = "🤝 Égalité ! Bien joué à tous les deux.";
    afficherMorpion(null);
    return;
  }

  morpionJoueur = morpionJoueur === "X" ? "O" : "X";
  if (statut) statut.textContent = "À toi de jouer, joueur " + morpionJoueur + " !";
  afficherMorpion(null);
}

function recommencerMorpion() {
  jouerEffetSonore("start");
  initialiserMorpion();
}

/* SPACE DODGER — ESQUIVE D'ASTÉROÏDES */
let spaceCanvas = null;
let spaceCtx = null;
let spaceAnimation = null;
let spaceEnCours = false;
let spaceDerniereImage = 0;
let spaceTemps = 0;
let spaceScore = 0;
let spaceRecord = Number(localStorage.getItem("omni_space_best")) || 0;
let spaceJoueurX = 210;
let spaceJoueurCibleX = 210;
let spaceObstacles = [];
let spaceTempsSpawn = 0;
let spaceEtoiles = Array.from({ length: 42 }, () => ({
  x: Math.random() * 420,
  y: Math.random() * 420,
  taille: 1 + Math.random() * 2,
  vitesse: 12 + Math.random() * 30
}));

function obtenirCanvasSpace() {
  if (!spaceCanvas) {
    spaceCanvas = document.getElementById("space-canvas");
    if (spaceCanvas) spaceCtx = spaceCanvas.getContext("2d");
  }
  return Boolean(spaceCanvas && spaceCtx);
}

function actualiserScoreSpace() {
  const score = document.getElementById("space-score");
  const record = document.getElementById("space-best");
  if (score) score.textContent = String(spaceScore);
  if (record) record.textContent = String(spaceRecord);
}

function dessinerSpaceDodger(fin) {
  if (!obtenirCanvasSpace()) return;
  const ctx = spaceCtx;
  ctx.clearRect(0, 0, 420, 420);
  const fond = ctx.createLinearGradient(0, 0, 420, 420);
  fond.addColorStop(0, "#101b3c");
  fond.addColorStop(1, "#070a18");
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, 420, 420);

  spaceEtoiles.forEach(etoile => {
    ctx.globalAlpha = 0.35 + (etoile.taille / 4);
    ctx.fillStyle = "#dbeafe";
    ctx.fillRect(etoile.x, etoile.y, etoile.taille, etoile.taille);
  });
  ctx.globalAlpha = 1;

  spaceObstacles.forEach(obstacle => {
    ctx.save();
    ctx.shadowColor = "#fb923c";
    ctx.shadowBlur = 13;
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.arc(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2,
      Math.max(obstacle.w, obstacle.h) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fdba74";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  });

  const joueurY = 360;
  ctx.save();
  ctx.translate(spaceJoueurX, joueurY);
  ctx.shadowColor = "#38e8ff";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#38e8ff";
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(17, 16);
  ctx.lineTo(0, 10);
  ctx.lineTo(-17, 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#dbeafe";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "left";
  ctx.fillText("SCORE " + spaceScore, 14, 22);

  if (fin) {
    ctx.fillStyle = "#050816cc";
    ctx.fillRect(0, 0, 420, 420);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fb7185";
    ctx.font = "bold 27px Arial";
    ctx.fillText("MISSION TERMINÉE", 210, 190);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Arial";
    ctx.fillText("Score : " + spaceScore, 210, 225);
  }
}

function demarrerSpaceDodger() {
  if (!obtenirCanvasSpace()) return;
  jouerEffetSonore("start");
  if (spaceAnimation !== null) cancelAnimationFrame(spaceAnimation);
  spaceEnCours = true;
  spaceDerniereImage = 0;
  spaceTemps = 0;
  spaceScore = 0;
  spaceTempsSpawn = 0;
  spaceJoueurX = 210;
  spaceJoueurCibleX = 210;
  spaceObstacles = [];
  actualiserScoreSpace();
  const statut = document.getElementById("space-status");
  if (statut) statut.textContent = "Mission lancée ! Évite les astéroïdes.";
  spaceAnimation = requestAnimationFrame(boucleSpaceDodger);
  dessinerSpaceDodger(false);
}

function deplacerVaisseau(direction) {
  const sens = Number(direction);
  if (!Number.isFinite(sens) || !spaceEnCours) return;
  jouerEffetSonore("tap");
  // Le vaisseau rejoint progressivement sa cible au lieu de sauter par à-coups.
  spaceJoueurCibleX = Math.max(22, Math.min(398, spaceJoueurCibleX + sens * 68));
}

function boucleSpaceDodger(timestamp) {
  if (!spaceEnCours) return;
  const delta = spaceDerniereImage ? Math.min((timestamp - spaceDerniereImage) / 1000, 0.035) : 0.016;
  spaceDerniereImage = timestamp;
  spaceTemps += delta;
  spaceTempsSpawn += delta * 1000;
  spaceScore = Math.floor(spaceTemps * 10);

  const ecartVaisseau = spaceJoueurCibleX - spaceJoueurX;
  spaceJoueurX += ecartVaisseau * (1 - Math.exp(-delta / 0.085));
  if (Math.abs(spaceJoueurCibleX - spaceJoueurX) < 0.25) {
    spaceJoueurX = spaceJoueurCibleX;
  }

  const intervalleSpawn = Math.max(300, 850 - spaceTemps * 9);
  if (spaceTempsSpawn >= intervalleSpawn) {
    spaceTempsSpawn = 0;
    const largeur = 20 + Math.random() * 34;
    spaceObstacles.push({
      x: Math.random() * (420 - largeur),
      y: -36,
      w: largeur,
      h: largeur * (0.7 + Math.random() * 0.5),
      speed: 105 + Math.min(spaceTemps * 2.2, 100) + Math.random() * 35
    });
  }

  spaceObstacles.forEach(obstacle => {
    obstacle.y += obstacle.speed * delta;
  });
  spaceObstacles = spaceObstacles.filter(obstacle => obstacle.y < 450);

  const joueur = { x: spaceJoueurX - 13, y: 345, w: 26, h: 30 };
  const collision = spaceObstacles.some(obstacle =>
    joueur.x < obstacle.x + obstacle.w - 5 &&
    joueur.x + joueur.w > obstacle.x + 5 &&
    joueur.y < obstacle.y + obstacle.h - 5 &&
    joueur.y + joueur.h > obstacle.y + 5
  );

  if (collision) return terminerSpaceDodger();
  spaceEtoiles.forEach(etoile => {
    etoile.y += etoile.vitesse * delta;
    if (etoile.y > 420) {
      etoile.y = -3;
      etoile.x = Math.random() * 420;
    }
  });

  actualiserScoreSpace();
  dessinerSpaceDodger(false);
  spaceAnimation = requestAnimationFrame(boucleSpaceDodger);
}

function terminerSpaceDodger() {
  jouerEffetSonore("crash");
  spaceEnCours = false;
  if (spaceAnimation !== null) cancelAnimationFrame(spaceAnimation);
  spaceAnimation = null;
  if (spaceScore > spaceRecord) {
    spaceRecord = spaceScore;
    localStorage.setItem("omni_space_best", String(spaceRecord));
  }
  actualiserScoreSpace();
  const statut = document.getElementById("space-status");
  if (statut) statut.textContent = "Fin de mission ! Clique sur DÉCOLLER pour retenter le record.";
  dessinerSpaceDodger(true);
}

function arreterSpaceDodger() {
  const etaitEnCours = spaceEnCours;
  spaceEnCours = false;
  if (spaceAnimation !== null) cancelAnimationFrame(spaceAnimation);
  spaceAnimation = null;
  const statut = document.getElementById("space-status");
  if (etaitEnCours && statut) statut.textContent = "Mission mise en pause. Tu pourras repartir avec DÉCOLLER.";
}

/* QUIZ CYBER — 10 QUESTIONS PAR PARTIE */
const BANQUE_QUESTIONS_QUIZ = [
  { q: "Quel langage structure le contenu d'une page web ?", a: ["HTML", "CSS", "SQL", "Python"], c: 0 },
  { q: "Quelle planète est surnommée la planète rouge ?", a: ["Vénus", "Mars", "Jupiter", "Mercure"], c: 1 },
  { q: "Combien font 8 × 7 ?", a: ["48", "54", "56", "64"], c: 2 },
  { q: "Quel animal est le plus grand parmi ces choix ?", a: ["L'éléphant d'Afrique", "Le loup", "Le panda", "Le renard"], c: 0 },
  { q: "Quelle touche sert généralement à faire un espace ?", a: ["Échap", "Entrée", "Majuscule", "Barre d'espace"], c: 3 },
  { q: "Quel est le symbole chimique de l'eau ?", a: ["CO2", "H2O", "O2", "NaCl"], c: 1 },
  { q: "Combien de côtés possède un hexagone ?", a: ["5", "6", "7", "8"], c: 1 },
  { q: "Quel océan est le plus vaste ?", a: ["Atlantique", "Indien", "Pacifique", "Arctique"], c: 2 },
  { q: "Quel composant exécute les instructions d'un ordinateur ?", a: ["Le processeur", "L'écran", "Le clavier", "La souris"], c: 0 },
  { q: "Quelle est la valeur binaire de 1 + 1 ?", a: ["10", "11", "01", "100"], c: 0 },
  { q: "Quel gaz les plantes absorbent-elles principalement pour la photosynthèse ?", a: ["Oxygène", "Dioxyde de carbone", "Hélium", "Azote"], c: 1 },
  { q: "Combien de minutes y a-t-il dans deux heures ?", a: ["90", "100", "120", "180"], c: 2 },
  { q: "Quel instrument mesure la température ?", a: ["Baromètre", "Thermomètre", "Chronomètre", "Boussole"], c: 1 },
  { q: "Quelle couleur obtient-on en mélangeant du bleu et du jaune ?", a: ["Vert", "Violet", "Orange", "Rose"], c: 0 },
  { q: "Quel est le résultat de 9 au carré ?", a: ["18", "72", "81", "99"], c: 2 }
];
let quizQuestionsPartie = [];
let quizIndex = 0;
let quizScoreValeur = 0;
let quizRecord = Number(localStorage.getItem("omni_quiz_best")) || 0;
let quizEnCours = false;
let quizRepondu = false;
let quizTimerSuivant = null;

function initialiserQuiz() {
  if (quizTimerSuivant !== null) clearTimeout(quizTimerSuivant);
  quizTimerSuivant = null;
  quizEnCours = false;
  quizRepondu = false;
  const question = document.getElementById("quiz-question");
  const reponses = document.getElementById("quiz-answers");
  const statut = document.getElementById("quiz-status");
  const bouton = document.getElementById("quiz-start");
  const score = document.getElementById("quiz-score");
  const record = document.getElementById("quiz-best");
  if (question) question.textContent = "Prêt à relever le défi ?";
  if (reponses) reponses.replaceChildren();
  if (statut) statut.textContent = "10 questions • 10 points par bonne réponse.";
  if (bouton) {
    bouton.hidden = false;
    bouton.textContent = "▶ COMMENCER LE QUIZ";
  }
  if (score) score.textContent = "0";
  if (record) record.textContent = String(quizRecord);
}

function demarrerQuiz() {
  jouerEffetSonore("start");

  if (quizTimerSuivant !== null) clearTimeout(quizTimerSuivant);
  quizTimerSuivant = null;
  quizQuestionsPartie = BANQUE_QUESTIONS_QUIZ.slice();
  for (let i = quizQuestionsPartie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [quizQuestionsPartie[i], quizQuestionsPartie[j]] = [quizQuestionsPartie[j], quizQuestionsPartie[i]];
  }
  quizQuestionsPartie = quizQuestionsPartie.slice(0, 10);
  quizIndex = 0;
  quizScoreValeur = 0;
  quizEnCours = true;
  quizRepondu = false;
  const bouton = document.getElementById("quiz-start");
  if (bouton) bouton.hidden = true;
  afficherQuestionQuiz();
}

function afficherQuestionQuiz() {
  if (!quizEnCours) return;
  if (quizIndex >= quizQuestionsPartie.length) return terminerQuiz();

  const item = quizQuestionsPartie[quizIndex];
  const question = document.getElementById("quiz-question");
  const reponses = document.getElementById("quiz-answers");
  const statut = document.getElementById("quiz-status");
  const score = document.getElementById("quiz-score");
  if (!question || !reponses) return;

  quizRepondu = false;
  question.textContent = "QUESTION " + (quizIndex + 1) + "/10 — " + item.q;
  if (statut) statut.textContent = "Choisis la bonne réponse.";
  if (score) score.textContent = String(quizScoreValeur);
  reponses.replaceChildren();

  item.a.forEach((texte, index) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.textContent = texte;
    bouton.addEventListener("click", () => repondreQuiz(index));
    reponses.appendChild(bouton);
  });
}

function repondreQuiz(choix) {
  if (!quizEnCours || quizRepondu) return;
  const item = quizQuestionsPartie[quizIndex];
  const boutons = document.querySelectorAll("#quiz-answers button");
  if (!item || !boutons.length) return;
  quizRepondu = true;

  boutons.forEach((bouton, index) => {
    bouton.disabled = true;
    if (index === item.c) bouton.classList.add("is-correct");
    if (index === choix && choix !== item.c) bouton.classList.add("is-wrong");
  });

  const statut = document.getElementById("quiz-status");
  if (choix === item.c) {
    jouerEffetSonore("success");
    quizScoreValeur += 10;
    if (statut) statut.textContent = "✅ Bonne réponse ! +10 points";
  } else if (statut) {
    jouerEffetSonore("error");
    statut.textContent = "❌ Pas tout à fait. La bonne réponse est : " + item.a[item.c];
  }

  const score = document.getElementById("quiz-score");
  if (score) score.textContent = String(quizScoreValeur);

  quizTimerSuivant = setTimeout(() => {
    quizTimerSuivant = null;
    quizIndex++;
    afficherQuestionQuiz();
  }, 950);
}

function terminerQuiz() {
  jouerEffetSonore("win");
  quizEnCours = false;
  const question = document.getElementById("quiz-question");
  const statut = document.getElementById("quiz-status");
  const bouton = document.getElementById("quiz-start");
  const record = document.getElementById("quiz-best");

  if (quizScoreValeur > quizRecord) {
    quizRecord = quizScoreValeur;
    localStorage.setItem("omni_quiz_best", String(quizRecord));
    if (statut) statut.textContent = "🏆 Nouveau record ! " + quizScoreValeur + "/100 points.";
  } else if (statut) {
    statut.textContent = "Défi terminé : " + quizScoreValeur + "/100 points. Tu peux retenter ta chance !";
  }

  if (question) question.textContent = "🎉 Quiz terminé !";
  if (bouton) {
    bouton.hidden = false;
    bouton.textContent = "🔄 REJOUER";
  }
  if (record) record.textContent = String(quizRecord);
}

function arreterQuiz() {
  if (quizTimerSuivant !== null) clearTimeout(quizTimerSuivant);
  quizTimerSuivant = null;
  if (quizEnCours) {
    quizEnCours = false;
    quizRepondu = false;
    const bouton = document.getElementById("quiz-start");
    const statut = document.getElementById("quiz-status");
    if (bouton) {
      bouton.hidden = false;
      bouton.textContent = "▶ REPRENDRE UN QUIZ";
    }
    if (statut) statut.textContent = "Partie interrompue. Tu peux relancer un quiz.";
  }
}


/* Sons discrets des interactions hors mini-jeux */
document.addEventListener("click",function(event){
  const target=event.target && event.target.closest
    ? event.target.closest("button, summary, .color-swatch")
    : null;
  if(!target || target.disabled) return;
  if(target.closest("#omni-radio-player, .omni-game-panel, #omni-game-stage, #wheel-modal")) return;
  if(target.matches("#pizza-gigante, #rave-btn, #crt-toggle-btn, .booster-pack, .card-item, .bubble-item, .omni-pixel-cell")) return;
  if(target.closest(".omni-game-card, [onclick^='switchTab'], #shop-container, #wheel-open-btn")) return;
  if(target.closest('[onclick*="voterHumeur"], [onclick*="publierSecret"], [onclick*="creerCapsule"], [onclick*="supprimerSecret"], [onclick*="supprimerCapsule"], [onclick*="detruireSouciGeant"], [onclick*="effacerGraffiti"], [onclick*="genererCitationIA"], [onclick*="envoyerMessageIA"], [onclick*="envoyerChatCommunautaire"], [onclick*="voterDilemme"], [onclick*="prochainDilemmeIA"], [onclick*="acheterSkin"], [onclick*="equiperSkin"]')) return;
  jouerEffetSonore("click");
},false);

/* COMMANDES AU CLAVIER — ACTIVES UNIQUEMENT DANS LE JEU AFFICHÉ */
document.addEventListener("keydown", function(event) {
  const stage = document.getElementById("omni-game-stage");
  if (!stage || stage.hidden) return;

  const target = event.target;
  if (target && target.closest && target.closest("input, textarea, select, [contenteditable='true']")) return;

  const panneau = document.querySelector("#omni-game-stage .omni-game-panel:not([hidden])");
  if (!panneau) return;

  const touche = event.key.toLowerCase();
  if (panneau.id === "omni-game-2048") {
    const directions = {
      arrowup: "up", arrowdown: "down", arrowleft: "left", arrowright: "right"
    };
    if (directions[touche]) {
      event.preventDefault();
      deplacer2048(directions[touche]);
    }
  } else if (panneau.id === "omni-game-pong") {
    if (touche === "arrowleft" || touche === "a" || touche === "q") {
      event.preventDefault();
      deplacerRaquettePong("left");
    } else if (touche === "arrowright" || touche === "d") {
      event.preventDefault();
      deplacerRaquettePong("right");
    }
  } else if (panneau.id === "omni-game-space") {
    if (touche === "arrowleft" || touche === "a" || touche === "q") {
      event.preventDefault();
      deplacerVaisseau(-1);
    } else if (touche === "arrowright" || touche === "d") {
      event.preventDefault();
      deplacerVaisseau(1);
    }
  }
});
