# CP Room Booking frontend

## Local development

1. Copy `.env.example` to `.env.local` and set the Firebase Web App config from Firebase Console > Project settings > Your apps > Web app. Set `NEXT_PUBLIC_API_BASE_URL` to the Spring Boot API base URL.
2. Enable Google under Firebase Authentication > Sign-in method and add the frontend host to Authentication > Settings > Authorized domains.
3. Configure the PostgreSQL and Firebase Admin service-account variables in `code/backend/.env`. Add at least one verified administrator Google account email to `ADMIN_EMAILS` before that user first signs in, and add this frontend origin to `CORS_ALLOWED_ORIGINS`. Allowlisted administrators retain admin access. Keep the service-account key on the backend only.
4. Start the backend from `code/backend` and the frontend from `code/frontend`:

```powershell
.\mvnw.cmd spring-boot:run
```

```powershell
npm run dev
```

Open `http://localhost:3000`. The rooms page reads from `GET /api/rooms`; booking requests are stored through `POST /api/bookings`. Signed-in users only see their own bookings. Admins see all requests and can update booking status and account roles.

## Deployment

- Deploy the Next.js frontend and Spring Boot backend as separate services, and use a managed PostgreSQL database reachable by the backend.
- Set the frontend `NEXT_PUBLIC_*` variables in the frontend hosting provider **at build time**. Set `NEXT_PUBLIC_API_BASE_URL` to the deployed HTTPS backend URL, and set the Firebase Web App values to the intended Firebase project. The frontend Firebase project ID must match the backend `FIREBASE_PROJECT_ID`.
- Set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `ADMIN_EMAILS`, and `CORS_ALLOWED_ORIGINS` as backend hosting-provider secrets/environment variables. Set `CORS_ALLOWED_ORIGINS` to the exact deployed frontend origin(s), not `*`.
- Never commit `.env`, `.env.local`, database credentials, or the Firebase service-account key. Do not expose `FIREBASE_PRIVATE_KEY` via a `NEXT_PUBLIC_*` variable.
- Back up the database and configure production schema migrations/backup policies before launch. `JPA_DDL_AUTO=update` is intended for local setup; use a reviewed schema migration process for production.

The project build and lint checks validate the application code, but deployment still requires live Firebase, backend, database, and host configuration.
