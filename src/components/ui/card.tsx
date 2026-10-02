import { cn } from '@/lib/cn'

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'border-border bg-surface shadow-card rounded-lg border transition-all duration-200',
				// A card that is one big link lifts on hover.
				'has-[>a]:hover:border-accent/40 has-[>a]:hover:shadow-card-hover has-[>a]:hover:-translate-y-0.5',
				className
			)}
			{...props}
		/>
	)
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
	return <h3 className={cn('text-text text-lg font-semibold', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
	return <p className={cn('text-text-muted text-sm', className)} {...props} />
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return <div className={cn('p-6 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
}
