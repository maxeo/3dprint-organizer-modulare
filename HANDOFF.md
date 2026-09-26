# Handoff — Organizer modulare parametrico

## Obiettivo
Creare in Blender una base scriptabile per organizer modulare autoreggente, con tipologie e dimensioni variabili. L’HTML in `originale/` è una traccia concettuale, non una specifica vincolante. Salvare i risultati nella cartella del progetto.

## Stato corrente
- Creato `organizer_parametrico.py` con configurazione in millimetri, preset standard/mezzo/basso/alto/profondo, numero di livelli, estrazione del cassetto e divisori open/lane/grid.
- Generata in Blender una torre standard 320 × 340 mm, 3 livelli, passo 106 mm, con telaio indipendente, guide e cassetti. Il secondo cassetto è estratto al 32% per mostrare lo scorrimento.
- Creati montanti con tenone quadrato da 8 mm e sede con gioco 0,35 mm per lato.
- Salvato `Organizer_Modulare_Parametrico.blend`; lo script è anche un Text datablock nel file Blender.

## Cosa ha funzionato
- Blender MCP è connesso e ha eseguito lo script; la scena ha 54 oggetti generati, visualizzati nella viewport.
- La collezione `Organizer_Generato` può essere rigenerata senza cancellare oggetti esterni.

## Cosa non ha funzionato / limiti
- La viewport era inizialmente centrata sul cubo di default: rimosso e riquadrato il modello.
- Modello ancora da verificare per manifold, quote, collisioni e varianti. Gli elementi del telaio sono oggetti intersecati; richiedono progettazione dei giunti e suddivisione prima di stampare.

## Prossimi passi
1. Verificare dimensioni, manifold del cassetto, giochi e posizioni.
2. Provare via script una variante differente e poi ripristinare la configurazione standard.
3. Correggere eventuali errori geometrici e aggiornare script e `.blend`.
4. Effettuare commit dei blocchi di lavoro e aggiornare questo handoff con un commit separato.
