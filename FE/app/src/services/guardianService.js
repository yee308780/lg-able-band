import { apiRequest } from './apiClient'

export async function getGuardians() {
  const response = await apiRequest('/api/guardians')
  return response?.items || []
}

export async function linkGuardianByEmail({ email, isPrimary = false, notifyOnDanger = true }) {
  return apiRequest('/api/guardians/link-by-email', {
    method: 'POST',
    body: {
      email,
      isPrimary,
      notifyOnDanger,
    },
  })
}

export async function deleteGuardian(guardianId) {
  return apiRequest(`/api/guardians/${guardianId}`, {
    method: 'DELETE',
  })
}
