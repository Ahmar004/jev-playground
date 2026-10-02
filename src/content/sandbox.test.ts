import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { QUESTION_KINDS } from '@/lib/constants'
import { docFromTask } from '@/features/sandbox/doc'
import { limitProblems } from '@/features/sandbox/checks'
import { buildSandboxTask } from '@/features/sandbox/doc'
import { TEMPLATES, templateViews } from './sandbox'

const MIN_TEMPLATES = 6

describe('sandbox templates', () => {
	it('imports every template in content/sandbox/templates.json', () => {
		const raw: unknown = JSON.parse(
			readFileSync(join(process.cwd(), 'content', 'sandbox', 'templates.json'), 'utf8')
		)
		const ids = z
			.array(z.object({ id: z.string() }))
			.parse(raw)
			.map((template) => template.id)
		expect([...TEMPLATES.keys()]).toEqual(ids)
		expect(ids.length).toBeGreaterThanOrEqual(MIN_TEMPLATES)
	})

	it('gives every template a recorded Jev answer to every question, within the limits', () => {
		for (const view of templateViews()) {
			const doc = docFromTask(view.task)
			expect(buildSandboxTask(doc).ok, view.template.id).toBe(true)
			expect(limitProblems(doc), view.template.id).toEqual([])
			expect(view.jev?.result.ok, `${view.template.id} needs a recording`).toBe(true)
		}
	})

	it('covers Noul, Choice and Score across the templates', () => {
		const kinds = new Set(
			templateViews().flatMap((view) =>
				docFromTask(view.task).questions.map((entry) => entry.question.type)
			)
		)
		expect(kinds).toEqual(
			new Set([QUESTION_KINDS.noul, QUESTION_KINDS.choice, QUESTION_KINDS.score])
		)
	})
})
