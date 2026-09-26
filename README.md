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

Questa è una base geometrica per sviluppare le varianti. Prima di stampare bisogna misurare lo spazio reale, calibrare i giochi con un provino, definire giunti tra longheroni e montanti e suddividere i pezzi che superano il piano di stampa.

## STL e guida HTML

`stl/` contiene i 18 pezzi distinti del primo modulo standard. Per la torre a tre livelli occorrono tre copie di ogni file. `stl/manifest.json` registra quote e posizioni di montaggio; `dati/verifica_STL.json` riporta il controllo digitale dei file esportati.

Per rigenerare gli STL dopo una modifica a `CONFIG`, decommenta la riga `export_first_level_stls(...)` in fondo allo script e premi Alt+P. Il formato è millimetri, con Z=0 sul piano di stampa. La guida offline è `guida.html`; la sua sorgente è `dati/guida_spec.json`.

**Stato:** STL preliminari. Cassetto 275 × 310 mm, longheroni fino a 318 mm: verifica che entrino nel tuo piano di stampa. I contatti tra longheroni e montanti nel modello non sono ancora incastri meccanici completi; non attribuire una portata alla torre senza riprogettazione e prova fisica.
