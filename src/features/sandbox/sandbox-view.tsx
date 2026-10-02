'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { SandboxTemplateView } from '@/content/sandbox'
import { cn } from '@/lib/cn'
import { SandboxWorkspace } from './sandbox-workspace'

const TEMPLATE_PARAM = 'template'
// A pseudo template id in ?template=: a blank setup.
export const BLANK_TEMPLATE = 'blank'

const TAB =
	'rounded-lg border px-3 py-2 text-left text-sm font-medium focus-visible:outline-accent focus-visible:outline focus-visible:outline-2'

/** The Sandbox (R47-R54): pick a template or start blank. The choice lives in ?template=. */
export function SandboxView({ views }: { views: SandboxTemplateView[] }) {
	const searchParams = useSearchParams()
	const router = useRouter()
	const pathname = usePathname()
	const param = searchParams.get(TEMPLATE_PARAM)
	const blank = param === BLANK_TEMPLATE
	const selected = blank
		? undefined
		: (views.find((view) => view.template.id === param) ?? views[0])
	const selectedId = blank ? BLANK_TEMPLATE : selected?.template.id

	const choose = (id: string) =>
		router.replace(`${pathname}?${TEMPLATE_PARAM}=${id}`, { scroll: false })

	const options = [
		...views.map(({ template }) => ({
			id: template.id,
			title: template.title,
			blurb: template.blurb
		})),
		{ id: BLANK_TEMPLATE, title: 'Start blank', blurb: 'Write your own state and questions.' }
	]
	return (
		<div className="flex flex-col gap-6">
			<div role="group" aria-label="Templates" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
				{options.map((option) => {
					const active = option.id === selectedId
					return (
						<button
							key={option.id}
							type="button"
							aria-pressed={active}
							onClick={() => choose(option.id)}
							className={cn(
								TAB,
								active
									? 'border-accent bg-surface-hover text-text'
									: 'border-border bg-surface text-text hover:bg-surface-hover'
							)}
						>
							<span className="block font-bold">{option.title}</span>
							<span className="text-text-muted block text-xs font-normal">{option.blurb}</span>
						</button>
					)
				})}
			</div>
			<SandboxWorkspace key={selectedId} view={selected} />
		</div>
	)
}
