'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CopyIcon } from '@/components/ui/icons'
import { toast } from '@/lib/toast'
import type { SandboxDoc } from './doc'
import { curlSnippet, fetchSnippet } from './snippets'

async function copyText(text: string, what: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(text)
		toast({ title: `${what} copied` })
	} catch {
		toast({
			title: "Couldn't copy",
			description: 'Select the code and copy it yourself.',
			variant: 'destructive'
		})
	}
}

const FORMATS = [
	{ id: 'curl', label: 'curl', build: curlSnippet },
	{ id: 'typescript', label: 'TypeScript', build: fetchSnippet }
] as const

/** Copy as code (R54): the setup as a ready-to-run request. The key is a placeholder, never a real key. */
export function CodePanel({ doc }: { doc: SandboxDoc }) {
	const [format, setFormat] = useState<(typeof FORMATS)[number]['id']>('curl')
	const active = FORMATS.find((candidate) => candidate.id === format) ?? FORMATS[0]
	const code = active.build(doc)
	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center gap-2">
				<div role="group" aria-label="Code format" className="flex gap-1">
					{FORMATS.map((candidate) => (
						<Button
							key={candidate.id}
							type="button"
							size="sm"
							variant={candidate.id === format ? 'secondary' : 'outline'}
							aria-pressed={candidate.id === format}
							onClick={() => setFormat(candidate.id)}
						>
							{candidate.label}
						</Button>
					))}
				</div>
				<Button type="button" size="sm" onClick={() => void copyText(code, active.label)}>
					<CopyIcon /> Copy {active.label}
				</Button>
			</div>
			<pre className="bg-surface-hover text-text max-h-72 overflow-auto rounded p-3 text-xs whitespace-pre">
				{code}
			</pre>
			<p className="text-text-muted text-xs">
				Replace YOUR_TYPESAFE_KEY with your own key. The Sandbox never puts a real key in this code.
			</p>
		</div>
	)
}
