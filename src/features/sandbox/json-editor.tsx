'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { bodyToDoc, serializeBody, type SandboxDoc } from './doc'

// What the user typed, and the setup it was typed against. When the Form
// changes the setup, the draft no longer matches it and the view shows the
// setup again.
type Draft = { text: string; error: string | null; doc: SandboxDoc }

/** The JSON view (R48): the request exactly as Jev receives it, editable. A valid edit updates the setup at once. */
export function JsonEditor({
	doc,
	onChange
}: {
	doc: SandboxDoc
	onChange: (doc: SandboxDoc) => void
}) {
	const [draft, setDraft] = useState<Draft | null>(null)
	const active = draft && draft.doc === doc ? draft : null
	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor="sandbox-json">Request JSON</Label>
			<Textarea
				id="sandbox-json"
				className="min-h-72 font-mono"
				spellCheck={false}
				aria-invalid={active?.error ? true : undefined}
				aria-describedby={active?.error ? 'sandbox-json-error' : undefined}
				value={active?.text ?? serializeBody(doc)}
				onChange={(event) => {
					const text = event.target.value
					const parsed = bodyToDoc(text)
					if (parsed.ok) {
						setDraft({ text, error: null, doc: parsed.doc })
						onChange(parsed.doc)
					} else {
						setDraft({ text, error: parsed.error, doc })
					}
				}}
				onBlur={() => {
					if (!active?.error) setDraft(null)
				}}
			/>
			{active?.error ? (
				<p id="sandbox-json-error" role="alert" className="text-danger text-sm">
					{active.error} The Form still shows your last valid setup.
				</p>
			) : (
				<p className="text-text-muted text-xs">
					Edit either view: they show the same setup. Valid JSON updates the Form as you type.
				</p>
			)}
		</div>
	)
}
