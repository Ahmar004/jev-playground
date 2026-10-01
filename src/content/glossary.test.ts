import { describe, expect, it } from 'vitest'
import { GLOSSARY } from './glossary'

describe('GLOSSARY', () => {
	it('defines every vocabulary term from spec 1.2', () => {
		const terms = GLOSSARY.map((entry) => entry.term)
		for (const term of [
			'Jev',
			'LLM',
			'Code',
			'State',
			'Question',
			'Noul',
			'Choice',
			'Score',
			'Confidence',
			'Beginner mode',
			'Developer mode',
			'Recording',
			'Level',
			'VS game',
			'Arena',
			'Sandbox',
			'Racer'
		]) {
			expect(terms).toContain(term)
		}
	})

	it('is sorted by term and has no duplicates', () => {
		const terms = GLOSSARY.map((entry) => entry.term)
		const sorted = [...terms].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
		expect(terms).toEqual(sorted)
		expect(new Set(terms).size).toBe(terms.length)
	})
})
