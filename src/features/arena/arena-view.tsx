'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { useMode } from '@/features/mode/mode-context'
import { cn } from '@/lib/cn'
import { MODES } from '@/lib/constants'
import { ROUTES } from '@/lib/links'
import { ArenaBrief } from './arena-brief'
import { BeginnerPanel } from './beginner-panel'
import { CustomDeveloperPanel, PresetDeveloperPanel } from './developer-panel'
import type { ArenaPresetView } from './snapshot'

const PRESET_PARAM = 'preset'
// A pseudo preset id in ?preset=: the Developer mode "Custom task" tab.
export const CUSTOM_PRESET = 'custom'

const TAB =
	'rounded-lg border px-3 py-2 text-left text-sm font-medium focus-visible:outline-accent focus-visible:outline focus-visible:outline-2'

/** The Arena (R39-R46): pick a preset, see Jev and an LLM side by side. The chosen preset lives in ?preset=. */
export function ArenaView({ views }: { views: ArenaPresetView[] }) {
	const { mode, setMode } = useMode()
	const searchParams = useSearchParams()
	const router = useRouter()
	const pathname = usePathname()
	const developer = mode === MODES.developer
	const param = searchParams.get(PRESET_PARAM)
	const custom = developer && param === CUSTOM_PRESET
	const selected = views.find((view) => view.preset.id === param) ?? views[0]

	const choose = (presetId: string) =>
		router.replace(`${pathname}?${PRESET_PARAM}=${presetId}`, { scroll: false })
	const useBeginner = () => setMode(MODES.beginner)

	return (
		<div className="flex flex-col gap-6">
			<div role="group" aria-label="Presets" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{views.map(({ preset }) => {
					const active = !custom && preset.id === selected?.preset.id
					return (
						<button
							key={preset.id}
							type="button"
							aria-pressed={active}
							onClick={() => choose(preset.id)}
							className={cn(
								TAB,
								active
									? 'border-accent bg-surface-hover text-text'
									: 'border-border bg-surface text-text hover:bg-surface-hover'
							)}
						>
							<span className="block font-bold">{preset.title}</span>
							<span className="text-text-muted block text-xs font-normal">{preset.blurb}</span>
						</button>
					)
				})}
				{developer && (
					<button
						type="button"
						aria-pressed={custom}
						onClick={() => choose(CUSTOM_PRESET)}
						className={cn(
							TAB,
							custom
								? 'border-accent bg-surface-hover text-text'
								: 'border-border bg-surface text-text hover:bg-surface-hover'
						)}
					>
						<span className="block font-bold">Custom task</span>
						<span className="text-text-muted block text-xs font-normal">
							Write your own text and question.
						</span>
					</button>
				)}
			</div>

			{custom ? (
				<Card className="flex flex-col gap-4 p-5">
					<h2 className="text-text text-2xl font-bold">Custom task</h2>
					<CustomDeveloperPanel onUseBeginner={useBeginner} />
				</Card>
			) : (
				selected && (
					<Card className="flex flex-col gap-4 p-5">
						<h2 className="text-text text-2xl font-bold">{selected.preset.title}</h2>
						<ArenaBrief task={selected.task} words={selected.preset.items} showInput={!developer} />
						{selected.batchItems !== null && (
							<p className="text-text-muted text-sm">
								Want to see it at scale?{' '}
								<Link
									href={ROUTES.arenaBatch(selected.preset.id)}
									className="text-accent underline"
								>
									Run all {selected.batchItems} items as a batch
								</Link>
							</p>
						)}
						{/* Remounting on a new preset or mode drops the old run. */}
						{developer ? (
							<PresetDeveloperPanel
								key={`dev-${selected.preset.id}`}
								view={selected}
								onUseBeginner={useBeginner}
							/>
						) : (
							<BeginnerPanel key={`beg-${selected.preset.id}`} view={selected} />
						)}
					</Card>
				)
			)}
		</div>
	)
}
