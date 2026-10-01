// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ownerKeys } from './keys'

describe('ownerKeys', () => {
	it('returns only the keys a run needs', () => {
		const env = { TYPESAFE_API_KEY: 'ts-secret', ANTHROPIC_API_KEY: 'an-secret' }
		expect(ownerKeys(env, { jev: true, llm: false })).toEqual({
			typesafe: 'ts-secret',
			anthropic: null
		})
	})

	it('names the missing variable without printing any value', () => {
		const env = { TYPESAFE_API_KEY: 'ts-secret' }
		expect(() => ownerKeys(env, { jev: true, llm: true })).toThrow(/ANTHROPIC_API_KEY/)
		try {
			ownerKeys(env, { jev: true, llm: true })
		} catch (error) {
			expect(String(error)).not.toContain('ts-secret')
		}
	})

	it('treats an empty value as missing', () => {
		expect(() => ownerKeys({ TYPESAFE_API_KEY: '' }, { jev: true, llm: false })).toThrow(
			/TYPESAFE_API_KEY/
		)
	})
})
