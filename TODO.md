# TODO - Real Authentication Integration (Travel Planner)

## Approved Decisions
- [x] Phone nullable
- [x] Store token in localStorage
- [x] CORS allow FE origin (http://localhost:5173)

## Backend (Back End/TravelPlanner.API)
- [ ] 1. Update User model + DbContext mapping to make Phone nullable
- [ ] 2. Add packages: JWT Bearer + BCrypt
- [ ] 3. Add JWT settings in appsettings.json
- [ ] 4. Create Auth DTOs (login/register/refresh/response)
- [ ] 5. Create JWT token service
- [ ] 6. Create Auth service (register/login/refresh/logout/me)
- [ ] 7. Create AuthController endpoints
- [ ] 8. Wire DI + CORS + Authentication/Authorization in Program.cs
- [ ] 9. Add migration for phone nullable and update database

## Frontend (Fornt End/Plan_travel)
- [ ] 10. Create api client service (axios instance + auth header)
- [ ] 11. Create auth service methods calling backend
- [ ] 12. Replace AuthContext mock login/register with real API flow
- [ ] 13. Update Register page payload for backend schema (phone optional)
- [ ] 14. Keep Login page behavior but consume real backend errors

## Validation
- [ ] 15. Build backend successfully
- [ ] 16. Run backend and verify endpoints via curl:
  - [ ] POST /api/auth/register
  - [ ] POST /api/auth/login
  - [ ] GET /api/auth/me (Bearer token)
  - [ ] POST /api/auth/refresh
  - [ ] POST /api/auth/logout
- [ ] 17. Run frontend and verify login flow works end-to-end
