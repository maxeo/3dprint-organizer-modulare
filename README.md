# Organizer Modulare

Base parametrica per un organizer autoreggente e impilabile. La pagina in `originale/` è una traccia concettuale.

## File

- `Organizer_Modulare_Parametrico.blend`: scena Blender con tre livelli standard (320 × 340 mm, passo 106 mm) e script incorporato nel Text Editor.
- `organizer_parametrico.py`: sorgente dello stesso generatore, da eseguire in Blender.
- `HANDOFF.md`: obiettivi, stato e prossimi passi.

## Cambiare tipologia e dimensioni

In Blender apri il Text Editor, seleziona `organizer_parametrico.py`, modifica la riga `CONFIG` in fondo e premi **Alt+P**. Lo script rigenera solo la collezione `Organizer_Generato`. Usa misure in millimetri.

Esempio:

```python
CONFIG = make_config("mezzo", width_mm=170, depth_mm=360,
                     tray_height_mm=55, clearance_above_mm=60,
                     levels=2, divider_mode="grid",
                     drawer_open_fraction=0.25)
```

Preset disponibili: `standard`, `mezzo`, `basso`, `alto`, `profondo`. Divisori: `open`, `lane`, `grid`. Si possono modificare anche `wall_mm`, `side_clearance_mm`, `vertical_clearance_mm`, `post_mm`, `joint_mm` e `joint_clearance_mm`. Il secondo cassetto è quello mostrato estratto; se c'è un solo livello, si estrae il primo.

Il modello distingue telaio, guide, cassetti e divisori in collezioni. La struttura standard misura 318 mm di altezza, più 6 mm di tenoni superiori. Le sedi sono 0,35 mm più larghe del tenone per lato.

## Stato del prototipo

Questa è una base geometrica per sviluppare le varianti. I longheroni hanno tenoni 6 × 5 × 8 mm, i montanti sedi cieche 6,7 × 5,7 × 8,5 mm e le guide tre linguette per lato. Il gioco nominale dei tenoni è 0,35 mm per lato. Prima di stampare bisogna misurare lo spazio reale, calibrare i giochi con provini, verificare scorrimento e portata e suddividere i pezzi che superano il piano di stampa.

## STL e guida HTML

`stl/` contiene i 16 pezzi distinti del primo modulo standard. Per la torre a tre livelli occorrono tre copie di ogni file. `stl/manifest.json` registra quote e posizioni di montaggio; `dati/verifica_STL.json` riporta il controllo digitale dei file esportati.

Per rigenerare gli STL dopo una modifica a `CONFIG`, decommenta la riga `export_first_level_stls(...)` in fondo allo script e premi Alt+P. Il formato è millimetri, con Z=0 sul piano di stampa. La guida offline è `guida.html`; la sua sorgente è `dati/guida_spec.json`.

**Stato:** STL preliminari. Cassetto 275 × 312,5 mm compresa la piccola presa frontale, longheroni fino a 312 mm: verifica che entrino nel tuo piano di stampa. I giunti sono modellati ma non ancora calibrati con una stampa; non attribuire una portata alla torre senza prova fisica.

## Scanalature modulari

Il cassetto ha sedi verticali su tutti e quattro i lati, a passo 20 mm. Nello standard ci sono 13 posizioni per ciascun lato, larghe 3,0 mm e profonde 1,0 mm: resta una parete esterna di 2,2 mm. Il divisorio longitudinale è spesso 2,4 mm, entra nelle sedi alle estremità e ha intagli superiori ripetuti per traversi opzionali. In modalità `grid` tre traversi si montano a −80, 0 e +80 mm con intaglio inferiore a mezzo spessore. Verificare il gioco reale con un provino prima della stampa completa.

## Guida interattiva e generazione senza Blender

Apri `guida.html` con doppio clic: è una guida offline generata dagli STL standard, con vista 3D, esploso, passaggi, mappa e lista di stampa. La sorgente è `dati/guida_spec.json`.

Apri `configuratore.html` per modificare larghezza, profondità, altezze, numero di livelli, scanalature e divisori. La pagina aggiorna l'anteprima e crea in JavaScript un ZIP con STL nuovi, `manifest.json`, `configurazione.json` e istruzioni. Non serve Blender né una connessione. Il browser salva un nuovo ZIP: non modifica in silenzio gli STL già presenti nella cartella del progetto.

Gli STL JavaScript usano spigoli vivi; le quote funzionali di tenoni, sedi, guide e cassetto sono allineate al modello Blender. `dati/verifica_JS_grid.json` contiene l'ispezione di una variante a griglia generata in JavaScript: 19 STL, un corpo per file e nessun bordo aperto rilevato.
