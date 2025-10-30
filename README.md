# Trick or Treat — QR Hunt (v3)

What's included:
- Frontend (index.html) with camera QR scanning (html5-qrcode), leaderboard, and printable QR images.
- Admin page (admin.html) — Admins sign in with Firebase Auth. Create an admin user in Firebase Console and set the password to `happytreats!1234`.
- Pre-generated QR images in assets/qrs/ (QR1..QR10), each encoding `TRICKORTREAT::QRn`.
- Cloud Function (functions/index.js) `verifyScan` which validates QR scans and awards points server-side.
- Game state stored in Firestore under `gameState/current` (fields: locked (bool), endsAt (timestamp)). When locked or timer ends, clients will not register scans.

Important setup steps (summary):
1. In Firebase console, enable Email/Password auth.
2. Create an admin user (teacher) with password `happytreats!1234`.
3. (Optional) Add the admin user's UID as a document in `admins/{uid}` to mark them as admin.
4. Create a Firestore database.
5. Deploy the Cloud Function `verifyScan` (not included: deployment commands per request).
6. Start the site via a static server (e.g., `npx serve`) and test scanning.

Security notes:
- This repo includes a server-side function to validate scans. Deploy it to your Firebase project to protect from spoofing.
- Make sure to set proper Firestore security rules restricting writes/reads as appropriate.

