import { describe, expect, it } from 'vitest'
import { jevRecording, opusRecording, sonnetRecording } from '@/features/race/testing/recordings'
import { defaultOpponentId, raceLineup } from './lineup'

describe('raceLineup', () => {
	it('splits Jev from the LLMs and orders the LLMs Opus, Sonnet, Haiku', () => {
		const lineup = raceLineup([sonnetRecording, jevRecording, opusRecording])
		expect(lineup.jev).toBe(jevRecording)
		expect(lineup.opponents.map((recording) => recording.modelId)).toEqual([
			'claude-opus-5-5',
			'claude-sonnet-5-5'
		])
	})

	it('has no Jev and no opponents when nothing is recorded', () => {
		expect(raceLineup([])).toEqual({ jev: undefined, opponents: [] })
	})
})

describe('defaultOpponentId', () => {
	it('defaults to Opus 5.5, else the first recorded LLM', () => {
		expect(defaultOpponentId([sonnetRecording, opusRecording])).toBe('claude-opus-5-5')
		expect(defaultOpponentId([sonnetRecording])).toBe('claude-sonnet-5-5')
		expect(defaultOpponentId([])).toBeUndefined()
	})
})
