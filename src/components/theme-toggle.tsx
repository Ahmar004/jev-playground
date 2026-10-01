'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { MoonIcon, SunIcon } from '@/components/ui/icons'

// The icon swaps through the `dark:` variant, not through resolvedTheme, so
// the server render and the first client render match (no hydration flash).
export function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme()

	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			aria-label="Switch theme"
			onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
		>
			<SunIcon size={18} className="hidden dark:block" />
			<MoonIcon size={18} className="block dark:hidden" />
		</Button>
	)
}
