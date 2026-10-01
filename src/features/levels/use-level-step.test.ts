import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()
let search = new URLSearchParams()

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push }),
	usePathname: () => '/levels/test-level',
	useSearchParams: () => search
}))

const { parseStep, useLevelStep } = await import('./use-level-step')

beforeEach(() => {
	push.mockClear()
	search = new URLSearchParams()
})

describe('parseStep', () => {
	it('reads a known step and falls back to Learn', () => {
		expect(parseStep('reveal')).toBe('reveal')
		expect(parseStep('check')).toBe('learn')
		expect(parseStep(null)).toBe('learn')
	})
})

describe('useLevelStep', () => {
	it('reads ?step= and moves with a new history entry', () => {
		search = new URLSearchParams('step=predict')
		const { result } = renderHook(() => useLevelStep())
		expect(result.current.step).toBe('predict')
		act(() => result.current.goTo('play'))
		expect(push).toHaveBeenCalledWith('/levels/test-level?step=play')
	})
})
