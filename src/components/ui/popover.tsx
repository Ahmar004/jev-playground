'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/cn'

// Radix handles focus, Esc to close and outside clicks (docs/rules/components.md).
export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

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
					'border-border bg-surface text-text z-50 rounded-lg border p-3 shadow-md focus-visible:outline-none',
					className
				)}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	)
}
