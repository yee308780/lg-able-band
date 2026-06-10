import { apiRequest } from './apiClient'

export async function getAlerts({ type, status, limit = 20 } = {}) {
  const params = new URLSearchParams()

  if (type) {
    params.set('type', type)
  }

  if (status) {
    params.set('status', status)
  }

  if (limit) {
    params.set('limit', String(limit))
  }

  const query = params.toString()
  const response = await apiRequest(`/api/alerts${query ? `?${query}` : ''}`)
  return response?.items || []
}

export async function getAlertDetail(alertId) {
  return apiRequest(`/api/alerts/${alertId}`)
}

export async function confirmAlert(alertId) {
  return apiRequest(`/api/alerts/${alertId}/confirm`, {
    method: 'POST',
  })
}

export async function replayAlert(alertId) {
  return apiRequest(`/api/alerts/${alertId}/replay`, {
    method: 'POST',
  })
}
