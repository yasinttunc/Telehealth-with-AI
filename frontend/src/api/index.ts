/*
 * The single API facade every page imports from.
 *
 * Pages call e.g. `api.patients.list()` or `api.auth.login(...)` and never
 * touch mock data or axios directly (spec §2). For this MVP every resource is
 * backed by mockApi because the Spring backend has no browser JWT login or
 * CORS configuration yet (docs/current-backend-task-roadmap.md, Phase 3).
 *
 * Replacement path: once the backend is ready, implement a springApi with the
 * same shape and route individual resources here (e.g.
 * `patients: springApi.patients`). Because the signatures are identical, page
 * and form code will not change.
 */

import { mockApi } from './mockApi'

export const api = mockApi

export { ApiError } from './types'
