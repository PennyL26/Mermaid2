SheetJS library (xlsx.full.min.js) — one-time setup
=====================================================

This app reads Excel files entirely in the browser using the SheetJS
library. Section 6 of the spec requires the library to live locally
in /vendor/ (no CDN dependency at runtime), so the app can work fully
offline.

The file was NOT downloaded automatically because the environment
this app was built in has no internet access. Download it once,
yourself, before deploying:

    curl -LO https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js

Then move the downloaded xlsx.full.min.js file into this /vendor/
folder (same folder as this README), so the final path is:

    vendor/xlsx.full.min.js

If you don't have curl, you can also just open this URL in a browser
and save the file:

    https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js

That's it — no build step, no npm install required. Once the file is
in place, index.html will pick it up automatically via:

    <script src="vendor/xlsx.full.min.js"></script>

Until then, the app will still load and show the Home screen, but
KUMITE/KATA will report a friendly "library not found" style error
instead of a raw JavaScript crash (this is intentional — see
js/excel.js, the LIBRARY_MISSING check).
