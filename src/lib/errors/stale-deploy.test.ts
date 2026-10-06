import { beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.fn()
vi.mock('@/lib/toast', () => ({ toast }))

// The error class Next's router throws when a Server Action id is missing on
// the server, which is what a tab opened before a deploy gets afterwards.
const { UnrecognizedActionError } =
	await import('next/dist/client/components/unrecognized-action-error')
const { isStaleDeployError, handleStaleDeploy, showStaleDeployNotice, STALE_DEPLOY_NOTICE } =
	await import('./stale-deploy')

beforeEach(() => {
	toast.mockClear()
})

describe('stale deploy', () => {
	it("recognises a Server Action that the new deploy doesn't have", () => {
		expect(
			isStaleDeployError(new UnrecognizedActionError('Server Action "abc" was not found'))
		).toBe(true)
		expect(isStaleDeployError(new Error('Server Action "abc" was not found'))).toBe(false)
		expect(isStaleDeployError('nope')).toBe(false)
	})

	it('shows one notice that stays up with a Reload button', () => {
		showStaleDeployNotice()
		expect(toast).toHaveBeenCalledTimes(1)
		const input = toast.mock.calls[0]?.[0]
		expect(input).toMatchObject({
			key: STALE_DEPLOY_NOTICE.key,
			title: 'The site was just updated',
			description: 'Reload to continue.',
			persistent: true,
			action: { label: 'Reload' }
		})
		expect(typeof input.action.onClick).toBe('function')
	})

	it('handles only stale deploy errors, so other failures keep their own message', () => {
		expect(handleStaleDeploy(new Error('boom'))).toBe(false)
		expect(toast).not.toHaveBeenCalled()

		expect(handleStaleDeploy(new UnrecognizedActionError('gone'))).toBe(true)
		expect(toast).toHaveBeenCalledTimes(1)
	})
})
