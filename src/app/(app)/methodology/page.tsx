import type { Metadata } from 'next'
import { PRICES } from '@/content/prices'
import { currentRecordings } from '@/content/recordings'
import { TASKS } from '@/content/tasks'
import { LOAD_TESTS } from '@/features/methodology/load-test'
import { LoadTestSection } from '@/features/methodology/load-test-section'
import { priceGroups, recordingRows } from '@/features/methodology/methodology-data'
import { CLAUDE_MODELS, NOUL_THRESHOLD, PROVIDER_LABELS, RACE_LANES } from '@/lib/constants'
import { ANTHROPIC_MAX_TOKENS } from '@/runner/providers/anthropic'
import { FIND_LINES_F1_BAR, SCORE_TOLERANCE } from '@/runner/score'

export const metadata: Metadata = { title: "Methodology - Jev's Playground" }

// Only TypeSafe docs may be linked from this site (CLAUDE.md > UI rules).
const TYPESAFE_DOCS_PREFIX = 'https://docs.typesafe.ai/'

const SECTION = 'bg-surface border-border flex flex-col gap-2 rounded-lg border p-4 shadow-card'
const SECTION_TITLE = 'text-text text-xl font-bold'
const BODY = 'text-text-muted'
const TABLE_WRAPPER = 'overflow-x-auto'
const TABLE = 'w-full text-left text-sm'
const CAPTION = 'text-text-muted pb-2 text-left text-sm'
const HEAD_CELL = 'text-text border-border border-b py-2 pr-4 font-bold'
const CELL = 'border-border text-text-muted border-b py-2 pr-4'
const GROUP_CELL = 'border-border text-text-muted border-b pt-4 pb-2 pr-4 text-left'

const SCORING_RULES: { term: string; rule: string }[] = [
	{ term: 'Choice', rule: 'Correct when the answer equals the correct option.' },
	{
		term: 'Noul',
		rule: `Jev's probability at or above ${NOUL_THRESHOLD} counts as yes. Correct when that matches the right answer.`
	},
	{
		term: 'Score',
		rule: `Jev is correct when it is within ${SCORE_TOLERANCE} of the correct level. An LLM is correct when its level equals the correct level.`
	},
	{
		term: 'Several questions in one request',
		rule: 'Accuracy is the share of questions answered right.'
	},
	{
		term: 'Finding lines',
		rule: `The F1 of the lines found against the correct lines. Correct at ${FIND_LINES_F1_BAR} or more.`
	},
	{ term: 'Text writing', rule: 'Shown to you, not scored.' }
]

export default function MethodologyPage() {
	const recordings = recordingRows([...TASKS.keys()].flatMap(currentRecordings))

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-text text-3xl font-extrabold">Methodology</h1>
				<p className={BODY}>
					How every race is run, scored and priced, so you can judge the results yourself.
				</p>
			</div>

			<section className={SECTION}>
				<h2 className={SECTION_TITLE}>Same inputs, same format</h2>
				<p className={BODY}>
					Jev and every LLM get the same state, the same instructions and the same options or levels
					for every item. The LLM is asked to reply with a fixed JSON object. Jev returns typed
					answers by design.
				</p>
			</section>

			<section className={SECTION}>
				<h2 className={SECTION_TITLE}>How a race runs</h2>
				<p className={BODY}>
					Each item is one call. Every racer gets {RACE_LANES} parallel lanes. Each call is sent
					once, with no retries. Latency is timed from sending the request to receiving the full
					response. Replays in Beginner mode play at the recorded latency.
				</p>
			</section>

			<section className={SECTION}>
				<h2 className={SECTION_TITLE}>Model settings</h2>
				<p className={BODY}>
					Every LLM runs at its provider&apos;s default settings. Claude Opus 5.5 cannot turn its
					thinking off, so it runs at low effort, and its thinking tokens are counted in its cost.
					The Claude models are {CLAUDE_MODELS.opus}, {CLAUDE_MODELS.sonnet} and{' '}
					{CLAUDE_MODELS.haiku}. Every Claude call has a{' '}
					{ANTHROPIC_MAX_TOKENS.toLocaleString('en-US')}-token output cap, and a reply cut off by
					the cap counts as a miss.
				</p>
			</section>

			<section className={SECTION}>
				<h2 className={SECTION_TITLE}>Parsing and scoring</h2>
				<p className={BODY}>
					An answer that cannot be parsed counts as a miss and is shown with a &quot;couldn&apos;t
					parse&quot; note, never hidden.
				</p>
				<dl className="mt-1 flex flex-col gap-2">
					{SCORING_RULES.map(({ term, rule }) => (
						<div key={term}>
							<dt className="text-text font-bold">{term}</dt>
							<dd className={BODY}>{rule}</dd>
						</div>
					))}
				</dl>
			</section>

			<section className={SECTION}>
				<h2 className={SECTION_TITLE}>Cost</h2>
				<p className={BODY}>
					Cost is tokens times the stored price per million tokens. Jev&apos;s output tokens are
					free. A call that returns an error costs $0. A model with no stored price shows
					&quot;price unknown&quot; and is never estimated.
				</p>
				<p className={BODY}>
					Developer mode uses the same runner and the same math, with your own keys. Jev, Anthropic,
					OpenAI and Google models use the table below, matched by the exact model ID; a model from
					OpenRouter is priced from OpenRouter&apos;s published list; any other model shows
					&quot;price unknown&quot;. Jev&apos;s time in Developer mode is the time our server
					measured for its call to TypeSafe, so the hop from your browser to our server is not
					counted.
				</p>
				<p className={BODY}>
					OpenAI and Google charge more for very long prompts (over 272,000 tokens at OpenAI, over
					200,000 at Google). This site never sends a prompt that long, so the table holds only the
					standard price. A discount a provider gives for a repeated prompt (cached input) is not
					applied, so a cost can read slightly high, never low. A promotional price shows its last
					day; after that day the model shows &quot;price unknown&quot; until the table is checked
					again.
				</p>
				<div className={TABLE_WRAPPER}>
					<table className={TABLE}>
						<caption className={CAPTION}>
							Prices checked on {PRICES.checkedOn}, from each provider&apos;s official pricing page.
						</caption>
						<thead>
							<tr>
								<th scope="col" className={HEAD_CELL}>
									Model
								</th>
								<th scope="col" className={HEAD_CELL}>
									Input $/M
								</th>
								<th scope="col" className={HEAD_CELL}>
									Output $/M
								</th>
							</tr>
						</thead>
						{priceGroups(PRICES).map((group) => (
							<tbody key={group.provider}>
								<tr>
									<th scope="colgroup" colSpan={3} className={`${GROUP_CELL} break-all`}>
										<span className="text-text font-bold">{PROVIDER_LABELS[group.provider]}</span>{' '}
										<span className="font-normal">
											-{' '}
											{group.sources.map((source) =>
												source.startsWith(TYPESAFE_DOCS_PREFIX) ? (
													<a
														key={source}
														href={source}
														className="text-accent focus-visible:outline-accent rounded underline underline-offset-4 focus-visible:outline focus-visible:outline-2"
													>
														{source}
													</a>
												) : (
													<span key={source}>{source}</span>
												)
											)}
										</span>
									</th>
								</tr>
								{group.rows.map((row) => (
									<tr key={row.modelId}>
										<th scope="row" className={`${CELL} font-medium`}>
											<span className="break-all">{row.modelId}</span>
											{row.validUntil ? (
												<span className="block font-normal">
													promotional price until {row.validUntil}
												</span>
											) : null}
										</th>
										<td className={CELL}>{row.inputPerM}</td>
										<td className={CELL}>{row.outputPerM}</td>
									</tr>
								))}
							</tbody>
						))}
					</table>
				</div>
			</section>

			<section className={SECTION}>
				<h2 className={SECTION_TITLE}>How items are chosen</h2>
				<p className={BODY}>
					Items and their correct answers are written for this site and checked by hand before
					recording. Some items are written to show a weakness TypeSafe documents. The same items
					are never re-run to get a different result. A recording interrupted by a rate limit,
					overload or network failure is discarded and recorded again, because that measures the
					account, not the model. When content changes, it is recorded again and old recordings stop
					showing.
				</p>
				<p className={BODY}>
					Level 8 (Trick Jev) was rewritten once. The first set of six tricks did not fool Jev at
					all: it answered all 12 messages correctly, as did Haiku 4.5 and Opus 5.5, and Sonnet 5.5
					had two replies that did not parse. We then wrote new tricks aimed at documented
					weaknesses (wording that points at someone else, a planted instruction, a question about
					cancelling rather than a request) and recorded that set once. Only the second set is shown
					in the level.
				</p>
				<p className={BODY}>
					The Number Crunch Showdown game was rewritten once too. Its first set of counting and
					arithmetic problems was easy for Jev (it answered all 12 correctly), so we wrote harder
					ones (longer words, multi-digit arithmetic) and recorded that set once. Only the second
					set is shown in the game.
				</p>
			</section>

			<section className={SECTION}>
				<h2 className={SECTION_TITLE}>Recordings</h2>
				<p className={BODY}>Recordings are real outputs and are never edited.</p>
				{recordings.length === 0 ? (
					<p className="text-text">No recordings yet.</p>
				) : (
					<div className={TABLE_WRAPPER}>
						<table className={TABLE}>
							<caption className={CAPTION}>Every recording currently shown on this site.</caption>
							<thead>
								<tr>
									<th scope="col" className={HEAD_CELL}>
										Task
									</th>
									<th scope="col" className={HEAD_CELL}>
										Model
									</th>
									<th scope="col" className={HEAD_CELL}>
										Recorded on
									</th>
									<th scope="col" className={HEAD_CELL}>
										Items
									</th>
								</tr>
							</thead>
							<tbody>
								{recordings.map((row) => (
									<tr key={`${row.taskId}-${row.modelId}`}>
										<td className={CELL}>{row.taskId}</td>
										<td className={`${CELL} break-all`}>{row.modelId}</td>
										<td className={CELL}>{row.recordedOn}</td>
										<td className={CELL}>{row.items}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<LoadTestSection runs={LOAD_TESTS} />
		</main>
	)
}
