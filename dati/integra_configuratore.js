// Integra il configuratore in guida.html dopo la generazione con build_guide.py.
// Uso: node dati/integra_configuratore.js   (dalla cartella del progetto)
// I moduli di dati/js/ vengono copiati inline: la guida resta un unico file offline.
// Rieseguibile: il blocco iniettato in precedenza viene sostituito.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const guide = path.join(root, "guida.html");
const MODULES = ["geometria.js", "stl_zip.js", "anteprima.js", "pannello.js"];
const START = "<!--configuratore:inizio-->", END = "<!--configuratore:fine-->";

let html = fs.readFileSync(guide, "utf8");
const a = html.indexOf(START);
if (a >= 0) html = html.slice(0, a) + html.slice(html.indexOf(END) + END.length);

const code = MODULES.map(f => {
  const src = fs.readFileSync(path.join(__dirname, "js", f), "utf8");
  if (/<\/script/i.test(src)) throw Error(`${f} contiene </script>`);
  return `/* dati/js/${f} */\n${src}`;
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

// Pezzi fantasma di "Mostra più livelli": disegnati (e cliccabili) ma senza sigla,
// nascosti con "Isola pezzo". Sostituzioni esatte: se il template cambia, meglio fermarsi.
const VIEW_PATCHES = [
  ["const vis=DATA.parts.filter(p=>visible(p.id))",
   "const vis=DATA.parts.concat(OrganizerCfg.ghosts||[]).filter(p=>p.ghost?visible(p.main)&&!(isolate&&selected):visible(p.id))"],
  ["for(const p of vis){const o=offset(p.id),q=project(",
   "for(const p of vis){if(p.ghost)continue;const o=offset(p.id),q=project("],
];
for (const [from, to] of VIEW_PATCHES) {
  if (html.includes(to)) continue;
  if (html.split(from).length !== 2) throw Error(`patch del visualizzatore non applicabile: ${from}`);
  html = html.replace(from, to);
}

const scriptAt =html.lastIndexOf("<script", html.indexOf("const DATA="));
html = html.slice(0, scriptAt) + `${START}<script>\n${code}</script>${END}\n` + html.slice(scriptAt);
fs.writeFileSync(guide, html);
console.log(`configuratore integrato in ${path.relative(process.cwd(), guide)}: ${MODULES.length} moduli, ${Math.round(code.length / 1024)} kB`);
