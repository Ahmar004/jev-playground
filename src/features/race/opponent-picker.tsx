'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon } from '@/components/ui/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RACERS } from '@/lib/constants'
import { racerName } from './racer-names'
import { RacerTag } from './racer-tag'

/** Picks which recorded LLM Jev races (DESIGN 1: Opus 5.5 by default). */
export function OpponentPicker({
	value,
	options,
	onChange
}: {
	value: string
	options: string[]
	onChange: (modelId: string) => void
}) {
	const [open, setOpen] = useState(false)
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button type="button" variant="outline">
					Opponent: {racerName(RACERS.llm, value)}
					<ChevronDownIcon />
				</Button>
			</PopoverTrigger>
			<PopoverContent>
				<fieldset className="flex flex-col gap-2">
					<legend className="text-text-muted mb-1 text-sm">Pick Jev&apos;s opponent</legend>
					{options.map((modelId) => (
						<label
							key={modelId}
							className="hover:bg-surface-hover has-[:focus-visible]:outline-accent flex cursor-pointer items-center gap-2 rounded p-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-2"
						>
							<input
								type="radio"
								name="opponent"
								value={modelId}
								checked={modelId === value}
								onChange={() => {
									onChange(modelId)
									setOpen(false)
								}}
								className="accent-accent"
							/>
							<RacerTag racer={RACERS.llm} modelId={modelId} />
						</label>
					))}
				</fieldset>
			</PopoverContent>
		</Popover>
	)
}
