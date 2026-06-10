import {
  averageEmbeddings,
  cloneLivingSignalState,
  cosineSimilarity,
  countTotalRecordings,
} from './livingSignalUtils'
import { livingSignalMock } from './livingSignalMock'

describe('livingSignalUtils', () => {
  it('calculates cosine similarity for equal vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1)
  })

  it('averages embeddings', () => {
    const averaged = averageEmbeddings([
      [0.2, 0.4],
      [0.4, 0.6],
    ])

    expect(averaged[0]).toBeCloseTo(0.3)
    expect(averaged[1]).toBeCloseTo(0.5)
  })

  it('counts total recordings from registry', () => {
    expect(countTotalRecordings(livingSignalMock.sounds)).toBe(3)
  })

  it('clones living signal state without mutating the source', () => {
    const cloned = cloneLivingSignalState(livingSignalMock)
    cloned.sounds[0].registeredSoundName = 'changed'

    expect(livingSignalMock.sounds[0].registeredSoundName).toBe('우리 아파트 방송음')
  })
})
