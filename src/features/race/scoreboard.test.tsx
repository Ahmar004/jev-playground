import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { jevRecording, opusRecording } from './testing/recordings'
import { Scoreboard, type ScoreboardRow } from './scoreboard'

const jevRow: ScoreboardRow = {
	racer: 'jev',
	modelId: jevRecording.modelId,
	recordedAt: jevRecording.recordedAt,
	totals: jevRecording.totals
}
const opusRow: ScoreboardRow = {
	racer: 'llm',
	modelId: opusRecording.modelId,
	recordedAt: opusRecording.recordedAt,
	totals: opusRecording.totals
}

describe('Scoreboard', () => {
	it('shows accuracy, time, cost and parse failures per racer', () => {
		render(<Scoreboard rows={[jevRow, opusRow]} caption="Final numbers" />)
		const table = screen.getByRole('table', { name: 'Final numbers' })
		const opus = within(table).getByRole('row', { name: /Claude Opus 5.5/ })
		expect(opus).toHaveTextContent('50% (1 of 2)')
		expect(opus).toHaveTextContent('1.1 s')
		expect(opus).toHaveTextContent('$0.0024')
		expect(opus).toHaveTextContent('1')
		expect(opus).toHaveTextContent('Beginner mode - recorded 2026-10-02 - claude-opus-5-5')
		const jev = within(table).getByRole('row', { name: /Jev/ })
		expect(jev).toHaveTextContent('100% (2 of 2)')
		expect(jev).toHaveTextContent('120 ms')
	})

	it('says price unknown and not scored instead of inventing numbers', () => {
		const unknown: ScoreboardRow = {
			...opusRow,
			totals: { ...opusRecording.totals, costUsd: null, accuracy: null, scored: 0, correct: 0 }
		}
		render(<Scoreboard rows={[unknown]} caption="Numbers" />)
		expect(screen.getByText('price unknown')).toBeInTheDocument()
		expect(screen.getByText('not scored')).toBeInTheDocument()
	})
})
