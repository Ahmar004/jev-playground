import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PROVIDER_ERROR_KINDS, QUESTION_KINDS } from '@/lib/constants'
import type { ItemResult } from '@/runner/types'
import { TrickWriter } from './trick-writer'
import type { TrickAttempt } from './use-live-trick'

const QUESTION = 'Is the sender asking to cancel their subscription?'

function attempt(id: string, extra: Partial<ItemResult>, label = true): TrickAttempt {
	return {
		id,
		text: `Message ${id}`,
		label,
		ranAt: '2026-10-04T14:02:00.000Z',
		result: {
			itemId: id,
			ok: true,
			raw: 'raw reply',
			parsed: { answer: { type: QUESTION_KINDS.noul, noul: 0.9 } },
			credit: 1,
			correct: true,
			latencyMs: 140,
			usage: { inputTokens: 30, outputTokens: 1 },
			costUsd: 0.00001,
			...extra
		}
	}
}

function renderWriter(props: Partial<React.ComponentProps<typeof TrickWriter>> = {}) {
	const onAsk = vi.fn()
	const onOpenKeys = vi.fn()
	render(
		<TrickWriter
			question={QUESTION}
			missing={null}
			attempts={[]}
			pending={false}
			modelId="jev-1"
			onAsk={onAsk}
			onOpenKeys={onOpenKeys}
			{...props}
		/>
	)
	return { onAsk, onOpenKeys }
}

describe('TrickWriter', () => {
	it('asks Jev only once there is a message and a right answer, and Enter submits', async () => {
		const { onAsk } = renderWriter()
		const ask = screen.getByRole('button', { name: 'Ask Jev' })
		expect(ask).toBeDisabled()
		await userEvent.type(screen.getByLabelText('Your message'), 'Stop billing me')
		expect(ask).toBeDisabled()
		await userEvent.click(screen.getByRole('radio', { name: 'No' }))
		await userEvent.type(screen.getByLabelText('Your message'), '{Enter}')
		expect(onAsk).toHaveBeenCalledWith({ text: 'Stop billing me', label: false })
	})

	it('without a TypeSafe key, says so and opens Keys', async () => {
		const { onOpenKeys } = renderWriter({ missing: 'Add your TypeSafe key.' })
		expect(screen.getByText('Add your TypeSafe key.')).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Open Keys' }))
		expect(onOpenKeys).toHaveBeenCalledTimes(1)
		expect(screen.getByRole('button', { name: 'Ask Jev' })).toBeDisabled()
	})

	it("shows each attempt with Jev's answer, the verdict and the Developer mode label", () => {
		renderWriter({
			attempts: [attempt('a', { credit: 0, correct: false }, false), attempt('b', {})]
		})
		const items = screen.getAllByRole('listitem')
		expect(items[0]).toHaveTextContent('You fooled Jev')
		expect(items[0]).toHaveTextContent('Your right answer: no')
		expect(items[0]).toHaveTextContent('Jev: 90% yes')
		expect(items[0]).toHaveTextContent('Wrong')
		expect(items[0]).toHaveTextContent(/Developer mode - run .+ - jev-1/)
		expect(items[1]).toHaveTextContent('Jev saw through it')
		expect(items[1]).toHaveTextContent('Right')
	})

	it('shows a reply that did not parse as a miss, with its raw output as plain text (R44, R86)', () => {
		renderWriter({
			attempts: [
				attempt('a', { ok: false, parsed: null, credit: 0, correct: false, raw: '<b>odd</b>' })
			]
		})
		const item = screen.getByRole('listitem')
		expect(item).toHaveTextContent('You fooled Jev')
		expect(item).toHaveTextContent("Couldn't parse")
		expect(item).toHaveTextContent('counts as a miss')
		expect(screen.getByText('<b>odd</b>')).toBeInTheDocument()
	})

	it('shows a request Jev turned down as a miss', () => {
		renderWriter({
			attempts: [
				attempt('a', {
					ok: false,
					parsed: null,
					credit: 0,
					correct: false,
					raw: '{"error":"bad state"}',
					error: PROVIDER_ERROR_KINDS.malformed
				})
			]
		})
		expect(screen.getByRole('listitem')).toHaveTextContent('Jev turned the request down')
	})

	it('shows progress while Jev answers', () => {
		renderWriter({ pending: true })
		expect(screen.getByRole('status')).toHaveTextContent('Jev is reading your message.')
		expect(screen.getByRole('button', { name: 'Asking Jev...' })).toBeDisabled()
	})
})
