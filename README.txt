SMART MATH LEARNING - SUPABASE EDITION

This version is configured for the Supabase project supplied by the app owner.

Features:
- Public users read shared learning content from Supabase.
- Admin signs in with the Supabase Auth email/password account.
- Admin membership is checked against public.admin_users.
- Content edits are saved to public.app_content and cached locally in IndexedDB.
- Previously loaded content remains available offline.
- Offline admin edits are queued locally and attempted again when the device reconnects.

Important:
- The Supabase publishable key is intended for browser use. Do not add a service_role or secret key.
- The existing local video upload feature still stores video files only in the current browser/device. Use YouTube links for videos that should be shared across devices until Supabase Storage is configured.
- The app expects public.app_content (id=1) and public.admin_users, with the RLS grants and policies created in the setup instructions.
- Host the folder contents on GitHub Pages over HTTPS. Do not open index.html using file:// if you want service-worker/offline installation.
