import { describe, it, expect } from 'vitest'
import { pickWinner, type CommandScore } from './whisperClassifier'
import { getCommandCandidates } from './voiceCommands'

// Note : classifyCommand (forced-decoding Whisper) n'est pas testé en unitaire
// — il charge le modèle ONNX. Seule la logique de décision pure (pickWinner)
// est couverte ici ; le scoring acoustique se valide au micro.

describe('whisperClassifier.pickWinner', () => {
  const candidates = getCommandCandidates('employer')

  it('returns null for empty scores', () => {
    expect(pickWinner([], candidates).command).toBeNull()
  })

  it('returns the best command when score is high and margin is clear', () => {
    const scores: CommandScore[] = [
      { phrase: 'planning', avgLogProb: -0.25 },
      { phrase: 'équipe', avgLogProb: -1.0 },
    ]
    expect(pickWinner(scores, candidates).command?.path).toBe('/planning')
  })

  it('rejects when even the best score is below the minimum (audio unlike any command)', () => {
    const scores: CommandScore[] = [
      { phrase: 'planning', avgLogProb: -1.6 },
      { phrase: 'équipe', avgLogProb: -2.0 },
    ]
    expect(pickWinner(scores, candidates).command).toBeNull()
  })

  it('rejects when the top two scores are too close (ambiguous)', () => {
    const scores: CommandScore[] = [
      { phrase: 'planning', avgLogProb: -0.3 },
      { phrase: 'équipe', avgLogProb: -0.4 },
    ]
    expect(pickWinner(scores, candidates).command).toBeNull()
  })

  it('accepts a lone candidate above the threshold (no margin check)', () => {
    const scores: CommandScore[] = [{ phrase: 'planning', avgLogProb: -0.5 }]
    expect(pickWinner(scores, candidates).command?.path).toBe('/planning')
  })
})
