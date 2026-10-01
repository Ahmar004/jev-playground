import { describe, expect, it } from 'vitest'
import { racerName } from './racer-names'

describe('racerName', () => {
	it('names Jev, Code and Jev + Code', () => {
		expect(racerName('jev')).toBe('Jev')
		expect(racerName('code')).toBe('Code')
		expect(racerName('jev_code')).toBe('Jev + Code')
	})

	it('names an LLM by its model, falling back to the model id, then to LLM', () => {
		expect(racerName('llm', 'claude-opus-5-5')).toBe('Claude Opus 5.5')
		expect(racerName('llm', 'claude-sonnet-5-5')).toBe('Claude Sonnet 5.5')
		expect(racerName('llm', 'claude-haiku-4-5-20251001')).toBe('Claude Haiku 4.5')
		expect(racerName('llm', 'gpt-9')).toBe('gpt-9')
		expect(racerName('llm')).toBe('LLM')
	})
})
