# Organizer Modulare

Base parametrica per un organizer autoreggente e impilabile. La pagina in `originale/` è una traccia concettuale.

**Guida di stampa e montaggio:** https://maxeo.github.io/3dprint-guide/organizer/guida.html

## File

- `Organizer_Modulare_Parametrico.blend`: scena Blender con tre livelli standard (250 × 240 mm, passo 106 mm) e script incorporato nel Text Editor.
- `organizer_parametrico.py`: sorgente dello stesso generatore, da eseguire in Blender.
- `HANDOFF.md`: obiettivi, stato e prossimi passi.

## Cambiare tipologia e dimensioni

In Blender apri il Text Editor, seleziona `organizer_parametrico.py`, modifica la riga `CONFIG` in fondo e premi **Alt+P**. Lo script rigenera solo la collezione `Organizer_Generato`. Usa misure in millimetri.

Esempio:

```python
CONFIG = make_config("mezzo", width_mm=170, depth_mm=220,
                     tray_height_mm=55, clearance_above_mm=60,
                     levels=2, divider_mode="grid",
                     drawer_open_fraction=0.25)
```

Preset disponibili: `standard`, `mezzo`, `basso`, `alto`, `compatto` (200 × 200). Tutti i preset hanno ogni pezzo entro un piatto 230 × 230 mm (`PRINT_BED_MM`); l’export Blender avvisa se un pezzo lo supera. Nella guida il pulsante **Stampante** (in alto a destra, accanto al tema) imposta l’area di stampa reale X × Y × Z, con alcune stampanti comuni: il pulsante diventa rosso e il pannello Configura elenca i pezzi che non entrano in nessuna orientazione a 90°. Divisori: `open`, `lane`, `grid`. Si possono modificare anche `wall_mm`, `side_clearance_mm`, `vertical_clearance_mm`, `post_mm`, `joint_mm` e `joint_clearance_mm`. Il secondo cassetto è quello mostrato estratto; se c'è un solo livello, si estrae il primo.

Il modello distingue telaio, guide, cassetti e divisori in collezioni. La struttura standard misura 318 mm di altezza, più 6 mm di tenoni superiori. Le sedi sono 0,35 mm più larghe del tenone per lato.

## Stato del prototipo

Questa è una base geometrica per sviluppare le varianti. I traversi hanno tenoni 6 × 5 × 8 mm con un dente a L di 3 × 1,5 mm in punta; i montanti hanno sedi cieche 6,7 × 8,5 mm alte 5,7 + 1,5 mm con una tasca sul fondo. Il traverso si inserisce sollevato e poi si abbassa di 1,5 mm: resta agganciato e sopra il tenone rimane una luce di 1,5 mm. Longherone basso, guida a L e fermo posteriore sono un unico pezzo per lato (`Longherone_guida_S/D`). Il gioco nominale dei tenoni è 0,35 mm per lato. Prima di stampare bisogna misurare lo spazio reale, calibrare i giochi con provini, verificare scorrimento e portata e suddividere i pezzi che superano il piano di stampa.

## STL e guida HTML

`stl/` contiene i 12 pezzi distinti del primo modulo standard. Per la torre a tre livelli occorrono tre copie di ogni file. `stl/manifest.json` registra quote e posizioni di montaggio.

Per rigenerare gli STL dopo una modifica a `CONFIG`, decommenta la riga `export_first_level_stls(...)` in fondo allo script e premi Alt+P. Il formato è millimetri, con Z=0 sul piano di stampa. La guida offline è `guida.html`; la sua sorgente è `dati/guida_spec.json`.

**Stato:** STL preliminari. Lo standard è pensato per un piatto 230 × 230 mm: cassetto 205 × 224,9 mm compresa la presa frontale, traverse 222 mm, longheroni 212 mm, montanti 22 × 22 × 112 mm da stampare in piedi. I giunti sono modellati ma non ancora calibrati con una stampa; non attribuire una portata alla torre senza prova fisica.

La presa del cassetto è una mezza C integrata nella parete frontale: il guscio esterno curva fino a circa 15 mm di sporgenza e sfuma ai lati. La tasca è aperta fino al bordo superiore e attraversa la parete verso l'interno del cassetto, così si possono infilare le dita. Il guscio resta unito sotto e ai lati. Anche questa zona richiede un provino per verificarne comodità e resistenza.

## Ruote

Lo standard ha 4 ruote Ø10 × 3 mm sotto il cassetto, due per lato (`wheels=4`). Nel pannello Configura (*Ruote sotto il cassetto*) si sceglie nessuna, 4, 6, 8 o 10: le due estreme stanno vicino a fronte e fondo, le altre a metà fra due sedi dei divisori, distribuite il più possibile in modo uniforme. Senza ruote il cassetto scivola sulla mensola come prima. Ogni ruota sta in un supporto ricavato dentro il cassetto, lontano dalle sedi dei divisori, e gira su un perno Ø3,42 × 8,7 mm (stesso accoppiamento tarato dei perni Sakura: sede quadrata da 3,4, foro della ruota 3,8). Il perno si infila dall’esterno della sponda fino a filo; a cassetto montato resta bloccato dalla guida, a 0,5 mm. La ruota sporge 2 mm sotto il fondo: la mensola della guida si abbassa di conseguenza e si allarga verso l’interno, così il cassetto resta alla stessa quota e il modulo non cresce. Pezzi: `P11_Perno_ruota` e `P12_Ruota_cassetto`, una copia per file, da stampare 4 per cassetto (12 per tre livelli); le traverse sono diventate P13 e P14. Nella guida le ruote compaiono tutte e quattro grazie al campo `instances` dello spec. Non ancora provate in stampa.

## Scanalature modulari

Il cassetto ha sedi verticali su tutti e quattro i lati, a passo 20 mm. Nello standard ci sono 9 posizioni per ciascun lato, larghe 3,0 mm e profonde 1,0 mm: resta una parete esterna di 2,2 mm. Il divisorio longitudinale è spesso 2,4 mm, entra nelle sedi alle estremità e ha intagli superiori ripetuti per traversi opzionali. In modalità `grid` tre traversi si montano a −60, 0 e +60 mm con intaglio inferiore a mezzo spessore. Verificare il gioco reale con un provino prima della stampa completa.

## Guida interattiva e generazione senza Blender

Apri `guida.html` con doppio clic: è una guida offline generata dagli STL standard, con vista 3D, esploso, passaggi, mappa e lista di stampa. La sorgente è `dati/guida_spec.json`.

Il configuratore è dentro la guida: il pulsante fisso **Configura** apre un pannello con tipologia (preset o *Personalizzata*), misure con campo numerico e slider, scanalature, giochi e pianta. **Applica all'anteprima** salva la configurazione nelle preferenze del browser (`localStorage`) e aggiorna la guida sul posto, senza ricaricare: i pezzi si calcolano in un worker in background e la vista 3D, la mappa e la lista di stampa usano i pezzi calcolati nel browser, gli stessi dello ZIP. **Scarica ZIP STL** crea STL, `manifest.json`, `configurazione.json` e istruzioni; anche i pulsanti "Scarica Pxx · STL" dei singoli pezzi scaricano la versione configurata. **Predefinito** (con conferma) ripristina i pezzi salvati in `stl/`. Non serve Blender né una connessione, e gli STL della cartella non vengono modificati. `configuratore.html` ora rimanda a `guida.html#configura`.

Sorgenti JavaScript in `dati/js/`: `geometria.js` (pezzi, voxel, mesh STL e mesh accorpata per l'anteprima), `stl_zip.js`, `dal_vivo.js` (worker e aggiornamento sul posto), `anteprima.js` (sostituisce i pezzi della guida quando c'è una configurazione applicata), `pannello.js` (interfaccia). Dopo aver rigenerato la guida con `build_guide.py`, esegui `node dati/integra_configuratore.js`: copia i moduli inline, così `guida.html` resta un file unico offline.

Gli STL JavaScript usano spigoli vivi e una versione sfaccettata della curva della presa; le quote funzionali di tenoni, sedi, guide e cassetto sono allineate al modello Blender. `dati/verifica_JS_grid.json` contiene l'ispezione di una variante a griglia generata in JavaScript: 19 STL, un corpo per file e nessun bordo aperto rilevato.
