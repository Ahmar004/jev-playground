import { cn } from '@/lib/cn'

// Literal class strings per strength, so Tailwind sees them at build.
const STRENGTH = {
	// Sign-in: the hues are the page's main decoration.
	strong: [
		'bg-hue-1/35 dark:bg-hue-1/30',
		'bg-hue-2/30 dark:bg-hue-2/30',
		'bg-hue-3/35 dark:bg-hue-3/30'
	],
	// In the app: visible behind the cards, never competing with them.
	soft: [
		'bg-hue-1/20 dark:bg-hue-1/20',
		'bg-hue-2/16 dark:bg-hue-2/20',
		'bg-hue-3/20 dark:bg-hue-3/18'
	]
} as const

/**
 * Three large blurred hues that drift slowly behind a page (`.hue-blobs` in
 * globals.css staggers them; reduced motion stops the drift). Decoration
 * only: no text sits on a hue alone. `fixed` keeps them in view while the
 * page scrolls.
 */
export function HueBackdrop({
	strength,
	fixed = false
}: {
	strength: keyof typeof STRENGTH
	fixed?: boolean
}) {
	const [one, two, three] = STRENGTH[strength]
	return (
		<div
			aria-hidden
			className={cn(
				'hue-blobs pointer-events-none inset-0 -z-10 overflow-hidden',
				fixed ? 'fixed' : 'absolute'
			)}
		>
			<div
				className={cn(
					'animate-drift absolute -top-32 -left-24 size-112 rounded-full blur-3xl',
					one
				)}
			/>
			<div
				className={cn(
					'animate-drift absolute top-1/4 -right-32 size-120 rounded-full blur-3xl',
					two
				)}
			/>
			<div
				className={cn(
					'animate-drift absolute -bottom-40 left-1/4 size-104 rounded-full blur-3xl',
					three
				)}
			/>
		</div>
	)
}
