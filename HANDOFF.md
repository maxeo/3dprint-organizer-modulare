# Handoff — Organizer modulare parametrico

## Obiettivo
Realizzare una base autoreggente e impilabile, trasformabile via script per tipologie e misure diverse. L’HTML B18 in `originale/` è solo una traccia. L’utente vuole Blender via MCP, STL, guida HTML offline simile agli altri progetti in `D:\3D Print`, configurazione JavaScript anche senza Blender, scanalature multiple e commit separati per lavoro e handoff.

## Stato corrente
- `Organizer_Modulare_Parametrico.blend` e `organizer_parametrico.py`: torre standard 320 × 340 mm, tre livelli da 106 mm. Script incorporato nel `.blend`, preset e quote libere.
- Telaio con tenoni laterali e posteriori 6 × 5 × 8 mm sui sei traversi di ogni modulo; sedi cieche 6,7 × 5,7 × 8,5 mm nei montanti, sfalsate in quota. Gioco nominale 0,35 mm per lato. Ogni guida è un pezzo a L con tre linguette che entrano nel longherone inferiore. Tenoni e sedi verticali per impilare i moduli restano presenti.
- Cassetto con scanalature a passo 20 mm sui quattro lati interni, 13 posizioni per lato; divisorio longitudinale con intagli, variante `grid` con tre traversi. La **presa attualmente salvata** è un incavo rettangolare 42 × 10 mm con piccolo labbro da 2,5 mm. L’utente ha poi inviato due schizzi per modificarne la forma: vista frontale a U e vista dall’alto con curva che esce e rientra nel frontale. Ha precisato che la curva centrale deve sporgere **circa 12 mm**. Resta una domanda aperta: la U è un archetto pieno oppure il bordo di un incavo? **Attendere la risposta prima della forma finale.**
- `stl/`: 16 STL del modulo standard e `manifest.json`; tre copie per la torre. `guida.html` rigenerata dagli STL tramite `dati/guida_spec.json`, sette passaggi e schema quotato del tenone/sede. `configuratore.html` genera varianti e ZIP STL autonomamente in JavaScript.
- `README.md` aggiornato con quote e limiti; `dati/verifica_STL.json` e `dati/verifica_JS_grid.json` registrano ispezioni degli STL.

## Verifiche eseguite
- Blender MCP: 48 oggetti nella torre; montante, longherone, guida e cassetto campionati con zero bordi non manifold. Raggi sul montante: 8,9 mm fino al fondo della mortasa, 0,5 mm sulla faccia non scavata. Sul longherone: 4,9 mm nella sede guida, 0,5 mm fuori sede.
- Analizzatore STL: tutti i 16 STL standard e i 19 STL JavaScript della griglia hanno un corpo, Z minimo zero e zero spigoli spaiati approssimati. Il cassetto attuale è 275 × 312,5 × 48 mm compreso il labbro; longheroni 312 mm.
- JavaScript: sintassi valida, 16 pezzi standard; ZIP griglia di 19 STL e manifest aperto con `zipfile`, CRC corretto.
- Generatore guida: 16 pezzi, sette passaggi, nessun avviso di link o posa. Commit prodotto `7a2e76f`.

## Cosa ha funzionato / limiti
- Gli STL e la guida rappresentano ora tenoni e sedi reali, non semplici intersezioni. Lo schema SVG in guida li mostra anche quando l’assemblato li nasconde.
- I giochi, la portata e lo scorrimento non sono provati fisicamente. I fermi posteriori restano pezzi separati senza fissaggio definitivo. Il volume di stampa deve contenere cassetto e traversi o richiede ridimensionamento/suddivisione.
- Il browser integrato ha bloccato `file://` e vietato workaround tramite altre superfici; la pagina non è stata revisionata lì. Blender MCP, ispezione STL, generatore guida e JavaScript sono stati verificati.
- La guida mostra lo standard salvato, mentre il configuratore scarica ZIP nuovi senza modificare automaticamente la guida.

## Prossimi passi
1. Attendere la risposta sulla forma della U dopo i due schizzi. Nel workspace scrivibile `C:\Users\matteo\Documents\ChatGPT\3D Print\organizer_parametrico.py` esiste una **bozza non sincronizzata** di presa arrotondata; non è nel progetto D e va adattata alla risposta. Nel progetto D e nel `.blend` c’è ancora la presa rettangolare con labbro.
2. Implementare la forma finale in Python/Blender e in `configuratore.html`, rigenerare `.blend`, STL, `manifest.json`, guida e report; aggiornare README. Usare Blender MCP per mostrare il risultato.
3. Verificare chiusura/manifold degli STL, quote e ZIP JavaScript. Eseguire commit prodotto; aggiornare questo handoff e fare un secondo commit separato.
4. Stampare provini di tenone/sede, linguette guida, presa e divisorio; calibrare giochi e valutare portata.

## Modalità di lavoro
Il progetto D è fuori dalla radice scrivibile del terminale. Per i sorgenti: modificare copie in `C:\Users\matteo\Documents\ChatGPT\3D Print`, sincronizzarle in D con `mcp__blender__execute_blender_code`, rigenerare in Blender e salvare `.blend` tramite MCP. Il generatore guida è `C:\Users\matteo\.claude\skills\guida-stampa-3d\scripts\build_guide.py`. Per Git su D usare `git -c safe.directory='D:/3D Print/Organizer Modulare' -C 'D:\3D Print\Organizer Modulare'` con sandbox escalation. Non tentare il browser `file://` con superfici alternative dopo il blocco esplicito.
