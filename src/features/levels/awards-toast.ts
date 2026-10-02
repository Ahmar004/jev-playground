import { BADGE_LABELS } from '@/lib/constants'
import { toast } from '@/lib/toast'
import type { Awards } from './level-progress'

/** One "+N XP" toast, then one toast per newly earned badge. Says nothing when nothing was earned. */
export function announceAwards(awards: Awards): void {
	if (awards.xp > 0) toast({ title: `+${awards.xp} XP` })
	for (const badge of awards.badges) {
		toast({ title: `Badge earned: ${BADGE_LABELS[badge].name}` })
	}
}
