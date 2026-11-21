# SCORPAX SX-9 — Interaktywny Przekrój 3D (Cutaway)

Interaktywna monografia techniczna i symulator 3D w stylu szwajcarskiego studia wzornictwa przemysłowego, zbudowana przy użyciu zainstalowanego skilla **cutaway** (`~/.gemini/config/skills/cutaway`).

Cały model 3D robota-skorpiona (`SCORPAX SX-9`), studio oświetleniowe (VSM + GTAO + dwuprzebiegowy miękki cień podłogowy + mapy refleksów PMREM), 3D linie konstrukcyjne oraz synteza dźwięków mechanicznych powstały **w 100% w kodzie (Three.js + Web Audio API)** — bez zewnętrznych plików `.glb`/`.mp3`.

## Uruchomienie

Plik `index.html` (oraz kopia `dist/index.html`) jest w pełni samodzielnym pakietem offline (zawiera wbudowany Three.js oraz fonty Inter i JetBrains Mono z polskimi znakami):

- Otwórz bezpośrednio [index.html](./index.html) w przeglądarce **lub**
- Uruchom lokalny serwer:
  ```bash
  python3 -m http.server 8080
  ```
  i wejdź na `http://localhost:8080`.

## Ponowne zbudowanie po edycji źródeł

```bash
export PATH="$HOME/node-env/bin:$PATH"
node build.mjs
```

## Interakcja i skróty klawiszowe

- **Tryb filmowy** (domyślny) — autonomiczna choreografia rozkładu wszystkich podzespołów z dedykowanymi ujęciami kamery i projekcją etykiet 3D.
- **Tryb manualny** — przejęcie kontroli jednym kliknięciem na dowolny podzespół, przeciągnięciem myszy (swobodny obrót 360°), kółkiem (zoom) lub suwakiem **Rozkład 0%–100%**.
- Skróty: `1–8` wybór podzespołu · `Space` start/pauza · `E` eksplozja 360° · `X` tryb X-Ray (przezroczysty pancerz) · `G` linie 3D · `M` dźwięk mechaniki · `D` dossier techniczne · `R` reset widoku.
