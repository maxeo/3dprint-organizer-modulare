// Integra il configuratore in guida.html dopo la generazione con build_guide.py.
// Uso: node dati/integra_configuratore.js   (dalla cartella del progetto)
// I moduli di dati/js/ vengono copiati inline: la guida resta un unico file offline.
// Rieseguibile: i blocchi iniettati in precedenza vengono sostituiti.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const guide = path.join(root, "guida.html");
const MODULES = ["geometria.js", "stl_zip.js", "anteprima.js", "dal_vivo.js", "pannello.js"];
const START = "<!--configuratore:inizio-->", END = "<!--configuratore:fine-->";
const RSTART = "<!--configuratore-ridisegno:inizio-->", REND = "<!--configuratore-ridisegno:fine-->";

let html = fs.readFileSync(guide, "utf8");
for (const [s, e] of [[START, END], [RSTART, REND]]) {
  const a = html.indexOf(s);
  if (a >= 0) html = html.slice(0, a) + html.slice(html.indexOf(e) + e.length).replace(/^\r?\n/, "");
}

// Un <script> per modulo: il worker di dal_vivo.js rilegge il testo di geometria.js da qui.
const scripts = MODULES.map(f => {
  const src = fs.readFileSync(path.join(__dirname, "js", f), "utf8");
  if (/<\/script/i.test(src)) throw Error(`${f} contiene </script>`);
  return `<script data-modulo="${f}">\n${src}</script>`;
}).join("\n");

// I dati della guida passano da OrganizerCfg.patch prima di essere usati.
const decl = "const DATA=";
const at = html.indexOf(decl);
if (at < 0) throw Error("const DATA= non trovato in guida.html");
if (!html.startsWith("const DATA=OrganizerCfg.patch(", at)) {
  const endMatch = /\};\r?\nconst \$=id=>/.exec(html.slice(at));
  if (!endMatch) throw Error("fine di DATA non trovata");
  const end = at + endMatch.index;
  html = html.slice(0, end) + "})" + html.slice(end + 1);
  html = html.slice(0, at) + "const DATA=OrganizerCfg.patch(" + html.slice(at + decl.length);
}

// Sostituzioni esatte nel visualizzatore del template: se il template cambia, meglio fermarsi.
const VIEW_PATCHES = [
  // Pezzi fantasma di "Mostra più livelli": disegnati (e cliccabili) ma senza sigla, nascosti con "Isola pezzo".
  ["const vis=DATA.parts.filter(p=>visible(p.id))",
   "const vis=DATA.parts.concat(OrganizerCfg.ghosts||[]).filter(p=>p.ghost?visible(p.main)&&!(isolate&&selected):visible(p.id))"],
  ["for(const p of vis){const o=offset(p.id),q=project(",
   "for(const p of vis){if(p.ghost)continue;const o=offset(p.id),q=project("],
  // Applicazione senza ricaricare (dal_vivo.js): questi valori vengono riassegnati.
  ["const A=DATA.assembly,CENTER=A.center,SIZE=A.size||100,DIST=SIZE*3.5;",
   "let A=DATA.assembly,CENTER=A.center,SIZE=A.size||100,DIST=SIZE*3.5;"],
  ["const CAPTION0=", "let CAPTION0="],
  ["const totalQty=", "let totalQty="],
];
for (const [from, to] of VIEW_PATCHES) {
  if (html.includes(to)) continue;
  if (html.split(from).length !== 2) throw Error(`patch del visualizzatore non applicabile: ${from}`);
  html = html.replace(from, to);
}

// Ridisegno delle parti HTML che dipendono dai pezzi: le istruzioni sono quelle del template,
// copiate tali e quali in una funzione globale chiamata da dal_vivo.js dopo aver aggiornato DATA.
const cut = (from, to, { keepTo = false, stripBrace = false } = {}) => {
  const a = html.indexOf(from);
  if (a < 0 || html.split(from).length !== 2) throw Error(`ridisegno: inizio non trovato: ${from}`);
  const b = html.indexOf(to, a);
  if (b < 0) throw Error(`ridisegno: fine non trovata: ${to}`);
  let s = html.slice(a, keepTo ? b + to.length : b).trim();
  if (stripBrace) { if (!s.endsWith("}")) throw Error(`ridisegno: blocco inatteso per ${from}`); s = s.slice(0, -1); }
  return s;
};
const main = html.indexOf("const DATA=OrganizerCfg.patch(");
const lineOf = start => { const a = html.indexOf(start, main); return html.slice(a, html.indexOf("\n", a)).trim(); };
const rerender = [
  lineOf("$('header').innerHTML="),
  lineOf("$('modelNote').innerHTML="),
  lineOf("$('nav').innerHTML=nav.map"),
  cut("$('maps').innerHTML=", "\nconst P=DATA.print", { stripBrace: true }),
  cut("$('inventory').innerHTML=", "\n$('clearProgress')"),
  lineOf("$('steps').innerHTML="),
  cut("document.querySelectorAll('[data-step]').forEach(b=>b.onclick=", ";$('showAll')"),
].map(s => s.endsWith(";") ? s : s + ";").join("\n");
const mainEnd = html.indexOf("</script>", main) + "</script>".length;
html = html.slice(0, mainEnd) + `\n${RSTART}<script>\n// Generato da dati/integra_configuratore.js: istruzioni del template per rifare mappa, lista, passaggi e intestazione.\nfunction organizerRerender(){\n${rerender}\n}\n</script>${REND}` + html.slice(mainEnd);

const scriptAt = html.lastIndexOf("<script", html.indexOf("const DATA="));
html = html.slice(0, scriptAt) + `${START}\n${scripts}\n${END}\n` + html.slice(scriptAt);
fs.writeFileSync(guide, html);
console.log(`configuratore integrato in ${path.relative(process.cwd(), guide)}: ${MODULES.length} moduli, ridisegno di ${rerender.split("\n").length} blocchi`);
