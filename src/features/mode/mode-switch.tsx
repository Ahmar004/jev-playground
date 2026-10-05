'use client'

import { Button } from '@/components/ui/button'
import { KeyIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import { MODES, type Mode } from '@/lib/constants'
import { useKeys } from '@/features/keys/keys-context'
import { GUIDE_TARGETS } from '@/features/guide/guide'
import { useMode } from './mode-context'

const MODE_OPTIONS: { mode: Mode; label: string }[] = [
	{ mode: MODES.beginner, label: 'Beginner' },
	{ mode: MODES.developer, label: 'Developer' }
]

/**
 * The header's Beginner / Developer switch and the Keys button (spec 3.1).
 * Switching to Developer mode with no keys opens the Keys panel.
 */
export function ModeSwitch() {
	const { mode, setMode } = useMode()
	const { keys, setPanelOpen } = useKeys()

	function choose(next: Mode): void {
		setMode(next)
		if (next === MODES.developer && Object.keys(keys).length === 0) setPanelOpen(true)
	}

	return (
		<div className="flex items-center gap-1" data-guide={GUIDE_TARGETS.modeSwitch}>
			<div
				role="radiogroup"
				aria-label="Mode"
				className="border-border bg-surface-hover/60 flex rounded-full border p-0.5 text-xs sm:text-sm"
			>
				{MODE_OPTIONS.map((option) => (
					<button
						key={option.mode}
						type="button"
						role="radio"
						aria-checked={mode === option.mode}
						onClick={() => choose(option.mode)}
						className={cn(
							'focus-visible:outline-accent rounded-full px-2.5 py-1 font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2',
							mode === option.mode
								? 'bg-accent text-accent-ink shadow-card'
								: 'text-text-muted hover:text-text'
						)}
					>
						{option.label}
					</button>
				))}
			</div>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				aria-label="API keys"
				onClick={() => setPanelOpen(true)}
			>
				<KeyIcon />
				<span className="hidden lg:inline xl:hidden 2xl:inline">Keys</span>
			</Button>
		</div>
	)
}
