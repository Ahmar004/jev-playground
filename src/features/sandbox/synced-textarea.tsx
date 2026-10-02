'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/**
 * A textarea for a value the setup also holds as something else (a parsed
 * state, a list of options). It keeps what the user typed, so a trailing
 * newline or a half-written JSON object is not rewritten under their cursor,
 * and adopts the setup's value when it changes from somewhere else, such as
 * the JSON view. `normalize` turns the typed text into the form `value` has.
 */
export function SyncedTextarea({
	id,
	label,
	value,
	normalize,
	onValue,
	className,
	hint
}: {
	id: string
	label: string
	value: string
	normalize: (text: string) => string
	onValue: (text: string) => void
	className?: string
	hint?: string
}) {
	const [text, setText] = useState(value)
	const [seen, setSeen] = useState(value)
	if (seen !== value) {
		setSeen(value)
		if (normalize(text) !== value) setText(value)
	}
	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor={id}>{label}</Label>
			<Textarea
				id={id}
				className={className}
				value={text}
				onChange={(event) => {
					setText(event.target.value)
					onValue(event.target.value)
				}}
			/>
			{hint && <p className="text-text-muted text-xs">{hint}</p>}
		</div>
	)
}
