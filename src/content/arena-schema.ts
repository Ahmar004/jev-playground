import { z } from 'zod'
import { itemWordsSchema } from './game-schema'

const text = z.string().min(1)

// content/arena/presets.json (DESIGN 9). A preset names one item of a Task.
// Words only: every number comes from that task's Recordings at render time.
export const arenaPresetSchema = z.strictObject({
	id: z.string().regex(/^[a-z0-9-]+$/),
	title: text,
	blurb: text,
	taskId: text,
	itemId: text,
	lesson: text,
	// What the task's items and yes or no answers are called (the batch list, the answers).
	items: itemWordsSchema
})
export type ArenaPreset = z.infer<typeof arenaPresetSchema>
