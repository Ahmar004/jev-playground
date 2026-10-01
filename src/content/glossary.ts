import { z } from 'zod'
import raw from '../../content/glossary.json'

const glossarySchema = z
	.array(z.object({ term: z.string().min(1), definition: z.string().min(1) }))
	.min(1)

export type GlossaryEntry = z.infer<typeof glossarySchema>[number]

// Parsed at import, so a malformed file fails the build at prerender
// (DESIGN 4.1). Sorted here so the file order never matters.
export const GLOSSARY: GlossaryEntry[] = glossarySchema
	.parse(raw)
	.sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }))
