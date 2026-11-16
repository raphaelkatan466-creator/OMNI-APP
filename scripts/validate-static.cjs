const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "script.js"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");

function extractMatches(source, regex, group = 1) {
  return [...source.matchAll(regex)].map(match => match[group]);
}

const ids = extractMatches(html, /\\bid=["']([^"']+)["']/g);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual([...new Set(duplicateIds)], [], "index.html contient des identifiants dupliqués.");

const declaredFunctions = new Set(extractMatches(js, /\\bfunction\\s+([A-Za-z_$][\\w$]*)\\s*\\(/g));
const inlineHandlers = extractMatches(
  html,
  /\\bonclick\\s*=\\s*["']\\s*([A-Za-z_$][\\w$]*)\\s*\\(/gi
);
const allowedGlobals = new Set(["alert"]);
const missingHandlers = [...new Set(inlineHandlers)].filter(
  name => !declaredFunctions.has(name) && !allowedGlobals.has(name)
);
assert.deepEqual(missingHandlers, [], "Un bouton HTML appelle une fonction JavaScript absente.");

const requiredFunctions = [
  "ouvrirMiniJeu",
  "demarrerSimonGame",
  "demarrerSnake",
  "demarrerMemory",
  "initialiserReflexe",
  "demarrerReflexe",
  "cliquerReflexe",
  "traiterToucheReflexe",
  "demarrerPong",
  "demarrer2048",
  "deplacer2048",
  "jouerMorpion",
  "recommencerMorpion",
  "demarrerSpaceDodger",
  "demarrerQuiz",
  "repondreQuiz",
  "arreterJeuxSecondaires"
];
const missingRequired = requiredFunctions.filter(name => !declaredFunctions.has(name));
assert.deepEqual(missingRequired, [], "Une fonction requise de l'Arcade est absente.");

for (const id of [
  "omni-game-simon",
  "omni-game-snake",
  "omni-game-memory",
  "omni-game-reflex",
  "omni-game-pong",
  "omni-game-2048",
  "omni-game-morpion",
  "omni-game-space",
  "omni-game-quiz"
]) {
  assert.ok(html.includes('id="' + id + '"'), "Panneau de jeu absent : " + id);
}

assert.ok(html.includes('id="reflex-cible-mode"'), "Mode Cible absent.");
assert.ok(html.includes('id="reflex-clavier-mode"'), "Mode Clavier absent.");
assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"), "La préférence de réduction des animations n'est pas prise en compte.");

function assertBalancedCssBraces(source) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let inComment = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];

    if (inComment) {
      if (char === "*" && next === "/") {
        inComment = false;
        i++;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "/" && next === "*") {
      inComment = true;
      i++;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      assert.ok(depth >= 0, "Accolade CSS fermante en trop.");
    }
  }

  assert.equal(depth, 0, "Les accolades CSS ne sont pas équilibrées.");
  assert.equal(inComment, false, "Un commentaire CSS n'est pas fermé.");
  assert.equal(quote, null, "Une chaîne CSS n'est pas fermée.");
}
assertBalancedCssBraces(css);

console.log("Validation statique OMNI-APP réussie.");
console.log("9 panneaux Arcade, gestionnaires présents, identifiants uniques et CSS équilibré.");
