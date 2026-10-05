import { cn } from '@/lib/cn'

/**
 * A box that scrolls (a wide table, a long code block). Keyboard users can only
 * scroll it if it can take focus, so it is focusable, labelled as a region, and
 * shows a focus ring (WCAG 2.1.1, axe rule scrollable-region-focusable).
 */
export function ScrollRegion({
	label,
	className,
	...props
}: React.ComponentProps<'div'> & { label: string }) {
	return (
		<div
			role="region"
			aria-label={label}
			tabIndex={0}
			className={cn(
				'focus-visible:outline-accent focus-visible:outline focus-visible:outline-2',
				className
			)}
			{...props}
		/>
	)
}
