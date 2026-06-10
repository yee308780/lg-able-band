import { apiRequest } from './apiClient'
import { mockHomeSummary } from '../mocks/homeMock'
import { mockAppPreview } from '../mocks/appPreviewMock'

export async function getHomeSummary() {
  return normalizeHomeSummary(await apiRequest('/api/app/home'))
}

export async function getAppPreview() {
  return structuredClone(mockAppPreview)
}

function normalizeHomeSummary(summary) {
  return {
    ...summary,
    user: summary.user || mockHomeSummary.user,
    safetyStatus: {
      ...mockHomeSummary.safetyStatus,
      ...summary.safetyStatus,
    },
    recentAlerts: summary.recentAlerts || [],
    deviceSummary: {
      ...mockHomeSummary.deviceSummary,
      ...summary.deviceSummary,
    },
    emergency: {
      ...mockHomeSummary.emergency,
      ...summary.emergency,
      primaryGuardianName: summary.emergency?.primaryGuardianName || '보호자',
    },
    quickActions: {
      ...mockHomeSummary.quickActions,
      ...summary.quickActions,
    },
  }
}
