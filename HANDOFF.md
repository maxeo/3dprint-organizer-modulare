# Handoff — Organizer modulare parametrico

## Obiettivo
Creare in Blender una base scriptabile per organizer modulare autoreggente, con tipologie e dimensioni variabili. L’HTML in `originale/` è una traccia concettuale, non una specifica vincolante. Salvare tutto nella cartella del progetto.

## Stato corrente
- `Organizer_Modulare_Parametrico.blend` contiene la scena standard: 320 × 340 mm, tre livelli da 106 mm, 54 oggetti nella collezione `Organizer_Generato`. Il secondo cassetto è estratto al 32%. Altezza del telaio 318 mm, altezza massima con tenoni 324 mm.
- `organizer_parametrico.py` è anche incorporato come Text datablock nel `.blend`; modifica `CONFIG` in fondo e usa Alt+P nel Text Editor per rigenerare.
- Preset disponibili: standard, mezzo, basso, alto, profondo. I parametri dimensionali possono essere sovrascritti liberamente in mm. Divisori open/lane/grid; numero di livelli ed estrazione configurabili.
- Modello separato in telaio portante, guide fisse, cassetto e divisori. I montanti hanno tenone quadrato da 8 mm e sede con 0,35 mm di gioco per lato.
- `README.md` documenta uso, parametri ed esempio.
- Commit del lavoro: `2cafdd4` (base), `f0cfba2` (primo handoff), `68df163` (correzioni e verifiche).

## Cosa ha funzionato
- Blender MCP connesso; scena generata e salvata dalla sessione Blender aperta.
- Cassetto e montante campionati: 0 spigoli non manifold. Cassetto standard 275 × 310 × 48 mm.
- Verificati i cinque preset: larghezza/profondità, 4 montanti per modulo, cassetto manifold e nessuna crescita delle collezioni ai rebuild.
- Verificata configurazione libera 237 × 381 mm, due livelli, passo 112 mm; poi ripristinata e salvata la configurazione standard.
- Script esterno e Text datablock nel `.blend` verificati identici al salvataggio.

## Cosa non ha funzionato / limiti
- Una prima versione lasciava collezioni orfane ai rebuild e non estraeva il cassetto con un solo livello; entrambi i difetti sono stati corretti. Le collezioni orfane della sessione sono state rimosse.
- Git LFS richiede accesso di scrittura alla cartella `.git` anche per alcuni controlli: usare esecuzione con permessi adeguati.
- Base geometrica, non ancora kit pronto da stampare: longheroni e montanti si intersecano ma non hanno giunti di montaggio definitivi; i pezzi grandi richiedono suddivisione. Le tolleranze vanno calibrate con provini e non è stata fatta una prova fisica di carico/scorrimento.

## Prossimi passi
1. Raccogliere dimensioni utili del mobile, altezza libera, carico previsto e volume di stampa.
2. Progettare i giunti reali tra longheroni e montanti, le clip/fermi rimovibili e la suddivisione per il piano di stampa.
3. Stampare un provino di tenone/sede e di guida/cassetto; aggiornare i giochi in base alla stampante.
4. Solo dopo la prova fisica, produrre STL delle tipologie definitive.

## Aggiornamento — STL per la guida
- Su richiesta è stata cercata la documentazione nelle cartelle Claude: `C:\Users\matteo\.claude\skills\guida-stampa-3d\SKILL.md` indica il flusso STL → `guida_spec.json` → `guida.html`; gli altri progetti in `D:\3D Print` usano questa struttura.
- Aggiunto `export_first_level_stls` a `organizer_parametrico.py`, incorporato nel `.blend`. Esporta 18 STL del primo modulo, normalizzati in mm con Z=0, e `stl/manifest.json` con le posizioni assemblate. Per la torre a tre livelli servono tre copie per file.
- `dati/verifica_STL.json`: 18 file, 0 spigoli spaiati approssimati, un corpo per file, dimensioni ricavate dagli STL. Cassetto 275 × 310 × 48 mm, montanti 22 × 22 × 112 mm; i pezzi più lunghi arrivano a 318 mm.
- Il nuovo blocco è nel commit `1af307f`.
- Prossimo blocco: scrivere `dati/guida_spec.json`, generare `guida.html` con lo script Claude, controllare viste e JS, aggiornare README e handoff con commit separati.

## Aggiornamento — scanalature modulari
- L'utente ha indicato sull'immagine la necessità di scanalature leggere nel cassetto e nei divisori, con più posizioni.
- Implementate 13 sedi per lato nello standard, su quattro lati, passo 20 mm, larghezza 3,0 mm, profondità 1,0 mm. Il divisorio longitudinale entra nelle sedi terminali e ha 13 intagli superiori; in modalità grid tre traversi usano sedi a −80/0/+80 mm e intagli inferiori. Parametri configurabili in `make_config`.
- Verificati in Blender cassetto e divisori manifold; la griglia è stata visualizzata. Ripristinata la torre standard a tre livelli e aggiornati STL, manifest e `dati/verifica_STL.json` (18 file, un corpo e 0 spigoli spaiati approssimati). Commit `d8660f1`.
- Nuova richiesta: aggiornare geometria e STL direttamente in JavaScript, anche senza Blender. Prossimo blocco: configuratore HTML offline con generazione STL/ZIP parametrica; collegarlo a `guida.html` generata con la skill Claude.
