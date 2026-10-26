SARVIO WEBSITE — SUPABASE MIGRATION
==================================
This version removes Firebase scripts/config and connects to the Supabase project supplied by the user.

IMPORTANT
- Use this website through VS Code Live Server or an HTTPS host. Do not open HTML via file://.
- The browser code uses only the Supabase URL and publishable key. Never put a database password, secret key, or service_role key in website files.
- Admin access is protected by Supabase Auth plus the admin_users table. Do not make the admin dashboard public.
- This migration has not been tested against your live project from this environment. Follow setup below and test before launch.

SETUP
1. Open your Supabase project: https://supabase.com/dashboard/project/qajxyqrzjzhcpdinqoya
2. Go to Authentication > Users and create an admin user using your admin email and a strong password. Confirm the account if your Auth settings require it.
3. Open SQL Editor, create a new query, paste all contents of supabase_setup.sql, and Run.
4. In Authentication > Users, copy the UUID of the admin user you just created.
5. In SQL Editor run this command, replacing YOUR-ADMIN-USER-UUID with that exact UUID:

   insert into public.admin_users (user_id) values ('YOUR-ADMIN-USER-UUID') on conflict do nothing;

6. In Supabase Project Settings > Authentication / URL Configuration, set your local development URL as a redirect URL if needed, e.g. http://127.0.0.1:5500/** and http://localhost:5500/**. Use the actual origin you run.
7. Extract this ZIP, open its folder in VS Code, install/enable Live Server, then right-click index.html > Open with Live Server.
8. Open admin.html through the same Live Server URL and sign in using the Supabase admin account created in step 2.
9. Test customer registration/login, catalogue reads, an order submission, and admin product/category/banner edits.

WHAT IS INCLUDED
- index.html and admin.html wired to supabase-bootstrap.js
- supabase-cloud.js adapter for Supabase Auth and database
- supabase_setup.sql creates tables, RLS policies, and a public sarvio-media bucket with admin-only writes
- Existing store UI and local cache retained

DATA NOTES
- Existing Firebase data is not automatically copied. Export it from the old system first if you need it.
- This version stores product/category/order records in sarvio_store_items JSON payloads, and promotions in sarvio_settings.
- Product/banner file upload integration is not yet connected to Supabase Storage. Existing image URLs and data URLs can still display, but uploading large base64 images is not a reliable production storage strategy. Storage bucket and policies are prepared for the next upload integration step.
- Customer order submission attempts a public insert; verify it works after applying SQL. Admin order visibility requires admin authentication.
- For a real production shop, consider requiring verified customer email and adding spam protection/order validation.

CHECKOUT UPDATE (phone format, location, saved addresses)
1. After replacing your website files with this ZIP, open Supabase Dashboard > SQL Editor.
2. Run the added SQL at the bottom of supabase_setup.sql (or run the complete setup script if safe for your existing setup; it uses CREATE IF NOT EXISTS and policy replacements).
3. Ensure Email/Password auth is enabled and customers are signed in before checkout.
4. Checkout accepts only 10 digits beginning 6, 7, 8, or 9 for Indian mobile numbers. This validates format only; it does NOT verify ownership or prove a number is active.
5. “Use My Current Location” requires HTTPS (or localhost) and customer permission. Reverse geocoding may return an approximate address; customer should verify it.
6. Customers can save up to 3 address records in sarvio_addresses. Saved addresses follow the signed-in Supabase account across browsers/devices.
7. Orders are inserted into public.sarvio_store_items with kind='orders'. Admin order view loads orders after authorized admin login.
8. This demo checkout does not collect payment. Test with a low-risk test order before public launch.
