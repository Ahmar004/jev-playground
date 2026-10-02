import { z } from 'zod'

const text = z.string().min(1)

// content/sandbox/templates.json (spec 9). A template names one Sandbox task
// and holds only words: the state, the questions and the numbers come from
// that task and its Jev recording.
export const sandboxTemplateSchema = z.strictObject({
	id: z.string().regex(/^[a-z0-9-]+$/),
	title: text,
	blurb: text,
	taskId: text,
	lesson: text
})
export type SandboxTemplate = z.infer<typeof sandboxTemplateSchema>
