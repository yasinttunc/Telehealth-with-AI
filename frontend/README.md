# Telehealth With AI Frontend

Student-project React, Vite, and TypeScript frontend for the Telehealth With AI application.

## Run locally

```bash
hnpm run dev
```

Demo accounts are intentionally mock-only:

- `admin` / `admin`
- `dr.sarah.patel` / `password`
- `patient.oliver.hughes` / `password`

## Current mode

All pages use `src/api/index.ts`, which currently exposes the in-memory `mockApi` implementation. No browser request is sent to Spring yet. This keeps the student MVP easy to demonstrate while the backend authentication work is completed.

The mock payload types in `src/api/types.ts` already reflect the important backend rules:

- Doctor and patient profiles are created with one enabled, unlinked `AppUser` of the matching role.
- Profile updates do not change `appUserId`.
- Clinic fields are `clinicName` and `clinicAddress`.
- A consultation is created as `SCHEDULED`; status changes use a separate operation.

## Later API handoff

After backend JWT login and CORS are ready, add `src/api/springApi.ts` with the same facade shape and switch resources in `src/api/index.ts`. Keep page components importing only `api`.

Expected routes:

- `POST /api/auth/login` for token-based login.
- `/api/users`, `/api/doctors`, `/api/patients`, and `/api/clinics` for CRUD.
- `POST /api/consultations`, `GET /api/consultations`, `GET /api/consultations/{id}`.
- The backend's dedicated consultation-status route for lifecycle changes.
- The backend's transcript and alert routes when those features are completed.

Do not switch one page at a time to Axios. Replace the facade implementation after authentication, CORS, and the relevant backend routes have been tested together.
