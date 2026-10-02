'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/cn'

// Radix handles focus, Esc to close and outside clicks (docs/rules/components.md).
export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverClose = PopoverPrimitive.Close

const POPOVER_OFFSET = 6

export function PopoverContent({
	className,
	align = 'start',
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				align={align}
				sideOffset={POPOVER_OFFSET}
				className={cn(
					'border-border bg-surface text-text shadow-card-hover z-50 origin-(--radix-popover-content-transform-origin) rounded-lg border p-3 focus-visible:outline-none',
					'data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in',
					className
				)}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	)
}
