import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { GAMES } from '@/content/games'
import { getTask } from '@/content/tasks'
import { initialRaceState, raceReducer, type RaceState } from '@/features/race/race-state'
import type { Racer } from '@/lib/constants'
import type { ItemResult } from '@/runner/types'
import { ArcheryScene } from './archery-scene'
import { HoopsScene } from './hoops-scene'
import { InvadersScene } from './invaders-scene'
import { MazeScene } from './maze-scene'
import { PenaltyScene } from './penalty-scene'
import { TowersScene } from './towers-scene'

function setup(gameId: string) {
	const game = GAMES.get(gameId)
	const task = game ? getTask(game.taskId) : undefined
	if (!game || !task) throw new Error(`No game ${gameId}`)
	return { game, task }
}

function result(itemId: string, parsed: unknown, correct: boolean | null): ItemResult {
	return {
		itemId,
		ok: parsed !== null,
		raw: parsed === null ? 'Let me think about this first.' : '',
		parsed,
		credit: correct === null ? null : correct ? 1 : 0,
		correct,
		latencyMs: 50,
		usage: { inputTokens: 1, outputTokens: 1 },
		costUsd: 0
	}
}

function race(entries: { racer: Racer; result: ItemResult }[], total: number): RaceState {
	return entries.reduce<RaceState>(
		(state, { racer, result: item }) =>
			raceReducer(state, { type: 'item_finished', racer, lane: 1, atMs: 10, result: item }),
		initialRaceState(['jev', 'jev_code', 'llm'], total)
	)
}

const choice = (picked: string, confidence = 0.9) => ({
	answer: { type: 'choice', choice: picked, probabilities: { [picked]: confidence }, confidence }
})
const noul = (value: number) => ({ type: 'noul', noul: value })

function lane(name: RegExp) {
	return screen.getByRole('region', { name })
}

describe('PenaltyScene', () => {
	const { game, task } = setup('inbox-keeper')

	it('saves a kick when the keeper dives to the right zone and concedes when it does not', () => {
		const state = race(
			[
				{ racer: 'jev', result: result('e1', choice('phishing'), true) },
				{ racer: 'llm', result: result('e1', 'spam', false) }
			],
			task.items.length
		)
		render(<PenaltyScene game={game} task={task} perRacer={state} />)
		expect(within(lane(/^Jev in goal/)).getByText('Saves 1 of 12')).toBeInTheDocument()
		expect(
			within(lane(/^Jev in goal/)).getByText(/dived to Phishing: saved\.$/)
		).toBeInTheDocument()
		// The caption quotes the email's subject line.
		expect(screen.getAllByText(/"Unusual sign-in blocked" was Phishing/)).toHaveLength(2)
		expect(screen.getByText(/dived to Spam: goal\.$/)).toBeInTheDocument()
	})

	it('replays one kick in both goals and goes back to the newest', async () => {
		const state = race(
			[
				{ racer: 'jev', result: result('e1', choice('phishing'), true) },
				{ racer: 'jev', result: result('e2', choice('spam'), true) },
				{ racer: 'llm', result: result('e1', null, false) }
			],
			task.items.length
		)
		render(<PenaltyScene game={game} task={task} perRacer={state} />)
		expect(screen.getByText(/^Kick 2:.*saved\.$/)).toBeInTheDocument()
		await userEvent.click(screen.getAllByRole('button', { name: 'Replay kick 1: Right' })[0]!)
		expect(screen.getByText('Replaying kick 1 in every lane.')).toBeInTheDocument()
		expect(screen.getByText(/^Kick 1:.*dived to Phishing: saved\.$/)).toBeInTheDocument()
		expect(screen.getByText(/never dived: goal\.$/)).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Show the newest' }))
		expect(screen.getByText(/^Kick 2:/)).toBeInTheDocument()
	})
})

describe('InvadersScene', () => {
	const { game, task } = setup('headline-invaders')

	it('counts clickbait shot down and honest headlines shot by mistake', () => {
		const state = race(
			[
				{ racer: 'jev', result: result('h1', { answer: noul(0.97) }, true) },
				{ racer: 'llm', result: result('h2', true, false) },
				{ racer: 'llm', result: result('h3', null, false) }
			],
			task.items.length
		)
		render(<InvadersScene game={game} task={task} perRacer={state} />)
		expect(screen.getByText('Clickbait shot 1 of 7')).toBeInTheDocument()
		expect(screen.getByText(/shot it down \(97% likely clickbait\): right\.$/)).toBeInTheDocument()
		expect(screen.getByText('Clickbait shot 0 of 7, 1 honest shot')).toBeInTheDocument()
		expect(screen.getByText(/gave no valid answer, so it held its fire\.$/)).toBeInTheDocument()
	})
})

describe('ArcheryScene', () => {
	const { game, task } = setup('severity-archery')

	it('says how many rings out an arrow landed and which way the rating missed', () => {
		const jevScore = {
			answer: { type: 'score', score: 0.2, legend: {}, probabilities: {}, confidence: 0.8 }
		}
		const state = race(
			[
				{ racer: 'jev', result: result('b1', jevScore, true) },
				{ racer: 'llm', result: result('b4', 4, false) }
			],
			task.items.length
		)
		render(<ArcheryScene game={game} task={task} perRacer={state} />)
		expect(screen.getByText(/said Trivial \(0\.2\): bullseye\.$/)).toBeInTheDocument()
		expect(
			screen.getByText(/is Severe\. LLM said Critical: 1 ring out, over-rated\.$/)
		).toBeInTheDocument()
		expect(screen.getAllByText(/^Bullseyes \d of 10$/)).toHaveLength(2)
	})
})

describe('MazeScene', () => {
	const { game, task } = setup('negation-maze')

	it('walks the robot to the furthest junction answered in order, and a wrong turn hits a wall', () => {
		const state = race(
			[
				{ racer: 'jev', result: result('j1', choice('right'), true) },
				{ racer: 'jev', result: result('j2', choice('right'), false) },
				{ racer: 'jev', result: result('j4', choice('right'), true) }
			],
			task.items.length
		)
		render(<MazeScene game={game} task={task} perRacer={state} />)
		expect(screen.getByText('Junctions passed 2 of 10, 1 into a wall')).toBeInTheDocument()
		expect(
			screen.getByText(/^Junction 2: .* means left\. Jev went right, hit the wall of a dead end/)
		).toBeInTheDocument()
	})
})

describe('HoopsScene', () => {
	const { game, task } = setup('carnival-hoops')

	it('throws at every hoop the racer said yes to and counts the right hoops', () => {
		const jevTags = {
			urgent: noul(0.9),
			refund: noul(0.95),
			angry: noul(0.2),
			needs_human: noul(0.1)
		}
		const state = race(
			[
				{ racer: 'jev', result: result('c1', jevTags, false) },
				{
					racer: 'llm',
					result: result(
						'c1',
						{ urgent: true, refund: true, angry: true, needs_human: false },
						true
					)
				}
			],
			task.items.length
		)
		render(<HoopsScene game={game} task={task} perRacer={state} />)
		expect(
			screen.getByText(/Jev threw at Urgent, Refund: 3 of 4 hoops right\.$/)
		).toBeInTheDocument()
		expect(screen.getByText('Hoops right 3 of 32')).toBeInTheDocument()
		expect(screen.getByText('Hoops right 4 of 32')).toBeInTheDocument()
	})
})

describe('TowersScene', () => {
	const { game, task } = setup('date-defense')

	it('gives Jev, Jev + Code and the LLM a tower each, and shows the days Code counted', () => {
		const state = race(
			[
				{ racer: 'jev', result: result('d1', { answer: noul(0.11) }, true) },
				{ racer: 'jev_code', result: result('d1', { answer: false, detail: { days: 37 } }, true) },
				{ racer: 'llm', result: result('d2', false, false) }
			],
			task.items.length
		)
		render(<TowersScene game={game} task={task} perRacer={state} />)
		expect(screen.getAllByRole('region', { name: /guards the warehouse$/ })).toHaveLength(3)
		expect(screen.getByText(/turned it away \(11% likely inside\): right\.$/)).toBeInTheDocument()
		expect(
			screen.getByText(/turned it away \(Code counted 37 days\): right\.$/)
		).toBeInTheDocument()
		expect(screen.getByText('Late returns stopped 0 of 5, 1 good ones refused')).toBeInTheDocument()
	})
})
