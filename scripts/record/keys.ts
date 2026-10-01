import { z } from 'zod'

// Owner-only keys (DESIGN 4.2, R22): read from .env.local by the recording
// CLI and nothing else. Never printed, logged, written or thrown.
const TYPESAFE_VAR = 'TYPESAFE_API_KEY'
const ANTHROPIC_VAR = 'ANTHROPIC_API_KEY'

const keySchema = z.string().min(1)

function read(env: Record<string, string | undefined>, name: string): string {
	const parsed = keySchema.safeParse(env[name])
	if (!parsed.success) {
		throw new Error(`${name} is not set in .env.local (see docs/api-setup-guide.md)`)
	}
	return parsed.data
}

export function ownerKeys(
	env: Record<string, string | undefined>,
	needs: { jev: boolean; llm: boolean }
): { typesafe: string | null; anthropic: string | null } {
	return {
		typesafe: needs.jev ? read(env, TYPESAFE_VAR) : null,
		anthropic: needs.llm ? read(env, ANTHROPIC_VAR) : null
	}
}
