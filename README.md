# GA Singhania Computers — Offline Business Desk

A browser-only billing and stock management starter built with HTML, CSS, JavaScript and IndexedDB. No Firebase, Supabase, API or server-side database is used.

## Run locally
- Extract the ZIP.
- Open `index.html` in a modern browser. For best PWA/offline caching support, serve the folder from a local static web server or GitHub Pages over HTTPS.
- On GitHub: create a repository, upload all files preserving the folder structure, enable GitHub Pages from the main branch root, then open the Pages URL.

## Data model and limitations
- Records are stored in IndexedDB on the current browser profile/device.
- GitHub Pages only hosts the app files; it does not store or synchronize business records.
- Use **Settings & Backup → Download full backup** to create a portable JSON data file. Send that file to another computer and use **Import shared business data file** there. After making changes on any computer, export a new JSON file and share the updated copy. Imports merge records by ID. Avoid making changes on multiple computers at the same time, because the app cannot automatically reconcile conflicts.
- Important: GitHub Pages is static hosting. It cannot accept writes to a shared JSON file. The JSON file is a manual transfer/backup method, not a live shared database. Every computer has its own local working copy. There is no simultaneous multi-device sync, multi-user access control, remote approval workflow, or cloud recovery without a shared backend.
- Clearing browser data or losing the device can erase records. Keep multiple backup copies on separate storage.

## Included
Dashboard, product master, stock-in, parties, simple party ledger, GST/non-GST invoice entry, automatic stock deduction, invoice printing, cashbook entries, dedicated expense panel (add/edit/delete, categories, payment modes and month filter), basic P&L and inventory valuation, CSV export, JSON backup/import, 7-day backup reminder, responsive layout and service worker caching.

## Important accounting notes
This is an initial offline operational application, not certified accounting or GST filing software. Verify tax calculations, invoice numbering, HSN/SAC, GSTIN, state-specific rules, e-invoice/e-way bill requirements, credit notes, returns and statutory reports with your accountant before production use. The current version does not implement split tender on a single bill, full GST place-of-supply logic, cheque clearance, supplier purchase invoices, payment allocations, user authentication/roles, barcode label printing, or automated WhatsApp sharing.
