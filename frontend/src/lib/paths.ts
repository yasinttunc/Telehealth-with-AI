/* Role-based base paths so shared pages can build correct links (spec §4). */

import type { Role } from '../types/domain'

export function consultationsBase(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/consultations'
    case 'DOCTOR':
      return '/doctor/consultations'
    default:
      return '/patient/consultations'
  }
}
