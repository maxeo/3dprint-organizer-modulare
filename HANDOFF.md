# Handoff — Organizer modulare parametrico

## Obiettivo
Realizzare una base autoreggente e impilabile, trasformabile per tipologia e dimensioni. L’HTML B18 in `originale/` è solo una traccia. L’utente vuole Blender via MCP, STL, guida HTML simile agli altri progetti in `D:\3D Print` e un modo per rigenerare gli STL in JavaScript anche senza Blender. Ha chiesto inoltre scanalature multiple nel cassetto e nei divisori e commit separati per il lavoro e l’handoff.

## Stato corrente
- `Organizer_Modulare_Parametrico.blend` e `organizer_parametrico.py`: torre standard 320 × 340 mm, tre livelli da 106 mm, cassetto estraibile, telaio portante indipendente. Lo script incorporato nel `.blend` rigenera preset e quote libere.
- Scanalature a passo 20 mm su tutti i quattro lati interni del cassetto: nello standard 13 posizioni per lato, sede larga 3,0 mm e profonda 1,0 mm nella parete da 3,2 mm. Divisorio da 2,4 mm con intagli superiori ripetuti. In `grid` tre traversi si montano a −80, 0 e +80 mm con intaglio inferiore.
- `stl/`: 18 STL del modulo standard e `manifest.json`; per una torre a tre livelli stampare tre copie di ogni pezzo. `dati/verifica_STL.json`: quote, 0 spigoli spaiati approssimati e un corpo per file.
- `guida.html`: pagina offline generata dalla skill Claude `guida-stampa-3d` a partire da `dati/guida_spec.json`, con vista 3D, esploso, passaggi, mappa e lista di stampa. Mostra un modulo standard, da ripetere tre volte.
- `configuratore.html`: pagina offline autonoma. Modifica dimensioni, livelli, scanalature e divisori; anteprima in pianta; scarica ZIP generato in JS con STL per un modulo, manifest, configurazione e istruzioni. Il browser scarica il ZIP e non sovrascrive i file in `stl/`. Gli STL JS hanno spigoli vivi; il `.blend` usa piccoli raccordi cosmetici.
- `README.md` spiega uso e limiti; `dati/verifica_JS_grid.json` registra 21 STL della variante griglia generata nel browser.

## Verifiche eseguite
- Blender MCP: vista delle scanalature e della griglia; cassetto e divisori campionati manifold. Scena standard ripristinata e salvata.
- Analizzatore STL della skill Claude: tutti gli STL standard e i 21 STL JS della griglia hanno un corpo, Z=0 e nessun bordo aperto nel controllo approssimato.
- JavaScript: sintassi valida; test del calcolo per standard, griglia e quote personalizzate; simulazione DOM del pulsante Scarica; ZIP completo aperto con `zipfile` senza errore CRC. Un primo bug dell’indice centrale ZIP è stato trovato e corretto.
- Generatore guida: 18 parti, 6 passaggi, nessun avviso su link o posa. Tre script di `guida.html` e quello del configuratore passano `node --check`.

## Limiti / cosa non ha funzionato
- Base ancora preliminare: longheroni, montanti e guide si sovrappongono ma non hanno giunti meccanici completi. Il cassetto standard misura 275 × 310 mm, il longherone più lungo 318 mm; verificare il piano di stampa. Giochi, portata e scorrimento richiedono provini e prova fisica.
- Il browser integrato ha bloccato `file://` (ammette solo HTTP/HTTPS) e vietato un aggiramento tramite altre superfici. Non è stata possibile una revisione visiva della pagina HTML renderizzata; sono stati eseguiti controlli strutturali, JS e STL. L’utente può aprire i file locali con doppio clic.
- La guida HTML è una fotografia del set STL standard. Il configuratore genera ZIP nuovi e un’anteprima live, ma non rigenera automaticamente `guida.html`.

## Come proseguire
1. Misurare mobile, altezza libera, carico e volume del piano di stampa.
2. Progettare giunti veri fra longheroni e montanti, attacco delle guide e fermi rimovibili; suddividere i pezzi che non entrano nel piatto.
3. Stampare provini di tenone/sede e di scanalatura/divisorio; correggere giochi e verificare lo scorrimento.
4. Dopo modifiche agli STL standard, aggiornare `dati/guida_spec.json` e rigenerare `guida.html` con `C:\Users\matteo\.claude\skills\guida-stampa-3d\scripts\build_guide.py`.

## Commit principali
`2cafdd4` base Blender · `1af307f` STL · `d8660f1` scanalature · `6f41e21` guida HTML e configuratore. Ogni blocco ha un commit handoff separato.
