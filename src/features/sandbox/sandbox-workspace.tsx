'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { SandboxTemplateView } from '@/content/sandbox'
import { useMode } from '@/features/mode/mode-context'
import { MODES } from '@/lib/constants'
import { limitProblems, weaknessWarnings } from './checks'
import { ChecksPanel } from './checks-panel'
import { CodePanel } from './code-panel'
import { docFromTask, newQuestion, serializeBody, type SandboxDoc } from './doc'
import { FormEditor } from './form-editor'
import { JsonEditor } from './json-editor'
import { RunPanel } from './run-panel'

const BLANK: SandboxDoc = { state: '', questions: [] }

function startingDoc(view: SandboxTemplateView | undefined): SandboxDoc {
	if (view) return docFromTask(view.task)
	return { ...BLANK, questions: [newQuestion(BLANK)] }
}

/**
 * One setup being edited: a template's, or a blank one. The Form and the JSON
 * view show the same `doc`, so they stay in sync (R48). Remounted with a new
 * `key` when the template changes, which drops the old edits and run.
 */
export function SandboxWorkspace({ view }: { view: SandboxTemplateView | undefined }) {
	const { mode } = useMode()
	const developer = mode === MODES.developer
	const [initial] = useState(() => startingDoc(view))
	const [doc, setDoc] = useState(initial)
	const problems = limitProblems(doc)
	const warnings = weaknessWarnings(doc)
	const unchanged = serializeBody(doc) === serializeBody(initial)
	return (
		<div className="flex flex-col gap-4">
			<Card className="flex flex-col gap-4 p-5">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2 className="text-text text-2xl font-bold">
						{view ? view.template.title : 'Your own setup'}
					</h2>
					{view && !unchanged && (
						<Button type="button" variant="outline" size="sm" onClick={() => setDoc(initial)}>
							Reset the template
						</Button>
					)}
				</div>
				<div className="grid gap-6 lg:grid-cols-2">
					<FormEditor doc={doc} onChange={setDoc} />
					<JsonEditor doc={doc} onChange={setDoc} />
				</div>
				<ChecksPanel problems={problems} warnings={warnings} />
			</Card>
			<Card className="flex flex-col gap-4 p-5">
				<h2 className="text-text text-xl font-bold">Run it</h2>
				<RunPanel
					developer={developer}
					doc={doc}
					jev={view?.jev ?? null}
					lesson={view?.template.lesson ?? ''}
					unchanged={unchanged}
					blocked={problems.length > 0}
				/>
			</Card>
			<Card className="flex flex-col gap-3 p-5">
				<h2 className="text-text text-xl font-bold">Copy as code</h2>
				<CodePanel doc={doc} />
			</Card>
		</div>
	)
}
