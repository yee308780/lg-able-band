const STORAGE_KEY = 'lg-able-band.living-signal.v1'

export const SOUND_TYPE_OPTIONS = [
  { value: 'apartment_announcement', label: '아파트 방송' },
  { value: 'doorbell', label: '초인종' },
  { value: 'fire_alarm', label: '화재 경보' },
  { value: 'appliance_done', label: '가전 완료음' },
  { value: 'background_noise', label: '배경 소음' },
]

export function getSoundTypeLabel(soundType) {
  return SOUND_TYPE_OPTIONS.find((option) => option.value === soundType)?.label || soundType
}

export function buildInitialEditor() {
  return {
    isOpen: false,
    mode: 'create',
    soundId: null,
    name: '',
    soundType: SOUND_TYPE_OPTIONS[0].value,
    notes: '',
    error: '',
  }
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function fallbackEmbedding(seed) {
  return [0.22, 0.31, 0.44, 0.53, 0.39, 0.28, 0.17, 0.11].map(
    (value, index) => value + seed * 0.01 + index * 0.001,
  )
}

function normalizeLegacySound(sound, soundIndex) {
  const sampleNames = sound.sampleNames || []

  return {
    soundId: sound.soundId || createId('living-signal'),
    registeredSoundName: sound.registeredSoundName,
    soundType: sound.soundType,
    soundTypeLabel: getSoundTypeLabel(sound.soundType),
    notes: sound.notes || '',
    updatedAt: sound.updatedAt || new Date().toISOString(),
    recordings: sampleNames.map((sampleName, sampleIndex) => ({
      recordingId: createId('recording'),
      label: sampleName,
      createdAt: new Date().toISOString(),
      durationSec: 2,
      audioDataUrl: '',
      embedding: fallbackEmbedding(soundIndex + sampleIndex),
    })),
  }
}

function normalizeSource(source) {
  if (source.sounds?.[0]?.recordings) {
    return {
      threshold: source.threshold ?? 0.8,
      workflow: source.workflow ?? [],
      detections: source.detections ?? [],
      sounds: source.sounds,
    }
  }

  if (source.summary && source.sounds) {
    return {
      threshold: source.summary.threshold ?? 0.8,
      workflow: source.workflow ?? [],
      detections: [],
      sounds: source.sounds.map(normalizeLegacySound),
    }
  }

  return {
    threshold: 0.8,
    workflow: [],
    detections: [],
    sounds: [],
  }
}

export function cloneLivingSignalState(source) {
  const normalized = normalizeSource(source)

  return {
    threshold: normalized.threshold,
    workflow: [...normalized.workflow],
    detections: normalized.detections.map((item) => ({ ...item })),
    sounds: normalized.sounds.map((sound) => ({
      ...sound,
      soundTypeLabel: getSoundTypeLabel(sound.soundType),
      recordings: sound.recordings.map((recording) => ({
        ...recording,
        embedding: [...recording.embedding],
      })),
    })),
  }
}

export function countTotalRecordings(sounds) {
  return sounds.reduce((count, sound) => count + sound.recordings.length, 0)
}

export function createRecordingEntry(sample) {
  return {
    recordingId: createId('recording'),
    label: sample.label,
    createdAt: sample.createdAt,
    durationSec: sample.durationSec,
    audioDataUrl: sample.audioDataUrl,
    embedding: [...sample.embedding],
  }
}

export function createSoundEntry({ registeredSoundName, soundType, notes, recordings }) {
  return {
    soundId: createId('living-signal'),
    registeredSoundName,
    soundType,
    soundTypeLabel: getSoundTypeLabel(soundType),
    notes,
    updatedAt: new Date().toISOString(),
    recordings,
  }
}

export function createDetectionEvent(match) {
  return {
    eventId: createId('detect'),
    predicted: match.predicted,
    registeredSoundName: match.registeredSoundName || 'unknown',
    soundType: match.soundType || 'unknown',
    soundTypeLabel: match.soundTypeLabel || '알 수 없음',
    similarity: match.similarity || 0,
    detectedAt: match.detectedAt || new Date().toISOString(),
  }
}

export function cosineSimilarity(left, right) {
  const size = Math.min(left.length, right.length)
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0

  for (let index = 0; index < size; index += 1) {
    dot += left[index] * right[index]
    leftNorm += left[index] * left[index]
    rightNorm += right[index] * right[index]
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}

export function averageEmbeddings(embeddings) {
  if (embeddings.length === 0) {
    return []
  }

  const length = embeddings[0].length
  const sums = new Array(length).fill(0)

  embeddings.forEach((embedding) => {
    for (let index = 0; index < length; index += 1) {
      sums[index] += embedding[index] || 0
    }
  })

  return sums.map((value) => value / embeddings.length)
}

export function serializeLivingSignalState(state) {
  return JSON.stringify(state)
}

export function saveLivingSignalState(state) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, serializeLivingSignalState(state))
}

export function loadLivingSignalState() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue)
    return cloneLivingSignalState(parsed)
  } catch {
    return null
  }
}
