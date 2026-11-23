# Texterkennung (offline)

Wird nur geladen, wenn man eine Nährwerttabelle scannt. Alles läuft lokal auf dem Gerät, es wird nichts hochgeladen.

- `tesseract.min.js`, `worker.min.js`: tesseract.js 7.0.0, Apache License 2.0 (LICENSE-tesseract.js.md, Drittanbieter-Hinweise in *.LICENSE.txt)
- `core/*-lstm.wasm.js`: tesseract.js-core 7.0.0, basiert auf Tesseract OCR, Apache License 2.0 (LICENSE-tesseract-core.txt)
- `lang/deu.traineddata.gz`: deutsche Sprachdaten (tessdata_best, Integer-Variante) aus dem npm-Paket @tesseract.js-data/deu 1.0.0; die Tesseract-Sprachdaten stehen unter der Apache License 2.0
