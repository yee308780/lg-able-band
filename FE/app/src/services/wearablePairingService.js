import { apiRequest } from './apiClient'

export async function completeWearablePairing(pairing) {
  return apiRequest(
    `/api/wearable/pairing-sessions/${encodeURIComponent(pairing.pairingSessionId)}/complete`,
    {
      method: 'POST',
      body: {
        deviceId: pairing.deviceId,
        pairingCode: pairing.pairingCode,
        nonce: pairing.nonce,
      },
    },
  )
}
