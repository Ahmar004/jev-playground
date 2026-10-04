'use client'

import {
	DndContext,
	KeyboardSensor,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
	type DragEndEvent
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { ROUTER_TOOLS, type RouterCard, type RouterTool } from '@/content/level-schema'
import { racerName } from '@/features/race/racer-names'
import { cn } from '@/lib/cn'
import { isRouterTool, type Assignments } from './outcomes'

const POOL = 'pool'
const DRAG_DISTANCE_PX = 6

function Zone({
	id,
	title,
	listClassName,
	children
}: {
	id: string
	title: string
	listClassName?: string
	children: React.ReactNode
}) {
	const { setNodeRef, isOver } = useDroppable({ id })
	return (
		<section
			ref={setNodeRef}
			aria-label={title}
			className={cn(
				'bg-surface border-border flex min-h-32 flex-col gap-2 rounded-lg border-2 border-dashed p-3',
				isOver && 'border-accent'
			)}
		>
			<h4 className="text-text font-bold">{title}</h4>
			<ul className={cn('flex flex-col gap-2', listClassName)}>{children}</ul>
		</section>
	)
}

function CardView({
	card,
	current,
	onAssign
}: {
	card: RouterCard
	current: RouterTool | undefined
	onAssign: (taskId: string, tool: RouterTool | null) => void
}) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: card.taskId
	})
	const style = transform
		? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
		: undefined
	return (
		<li
			ref={setNodeRef}
			style={style}
			className={cn(
				'bg-bg border-border flex flex-col gap-2 rounded-lg border p-3',
				isDragging && 'relative z-10 shadow-lg'
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<p className="text-text font-bold">{card.title}</p>
					<p className="text-text-muted text-sm">{card.prompt}</p>
				</div>
				<button
					type="button"
					aria-label={`Drag the card ${card.title}`}
					className="text-text-muted border-border focus-visible:outline-accent cursor-grab touch-none rounded border px-2 py-1 text-sm focus-visible:outline focus-visible:outline-2"
					{...attributes}
					{...listeners}
				>
					Drag
				</button>
			</div>
			<div role="group" aria-label={`Send ${card.title} to`} className="flex flex-wrap gap-2">
				{ROUTER_TOOLS.map((tool) => (
					<Button
						key={tool}
						type="button"
						size="sm"
						variant={current === tool ? 'primary' : 'outline'}
						aria-pressed={current === tool}
						aria-label={`Send ${card.title} to ${racerName(tool)}`}
						onClick={() => onAssign(card.taskId, tool)}
					>
						{racerName(tool)}
					</Button>
				))}
			</div>
		</li>
	)
}

/**
 * Level 6 Play: sort each card into Jev, LLM or Code. Drag a card onto a tool,
 * or use the buttons on the card (keyboard and touch). Nothing is scored here;
 * the pipeline run shows what each tool really did.
 */
export function RouterGame({
	cards,
	assignments,
	onAssign,
	onRun,
	blocked = false,
	note
}: {
	cards: RouterCard[]
	assignments: Assignments
	onAssign: (taskId: string, tool: RouterTool | null) => void
	onRun: () => void
	// Developer mode: no keys yet, or a live run is in flight.
	blocked?: boolean
	// What the run will do or is doing, under the button (R80).
	note?: string
}) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: DRAG_DISTANCE_PX } }),
		useSensor(KeyboardSensor)
	)
	function onDragEnd(event: DragEndEvent) {
		const target = event.over ? String(event.over.id) : null
		if (target === POOL) onAssign(String(event.active.id), null)
		else if (target !== null && isRouterTool(target)) onAssign(String(event.active.id), target)
	}
	const unsorted = cards.filter((card) => assignments[card.taskId] === undefined)
	return (
		<section aria-labelledby="router-heading" className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h3 id="router-heading" className="text-text text-xl font-bold">
					Sort the cards
				</h3>
				<p className="text-text-muted">
					Which tool should do each job? Drag a card onto a tool, or press a tool button on the
					card. {cards.length - unsorted.length} of {cards.length} sorted.
				</p>
			</div>
			<DndContext id="router-dnd" sensors={sensors} onDragEnd={onDragEnd}>
				<div className="flex flex-col gap-4">
					<Zone id={POOL} title="Unsorted" listClassName="sm:grid sm:grid-cols-2 lg:grid-cols-3">
						{unsorted.map((card) => (
							<CardView key={card.taskId} card={card} current={undefined} onAssign={onAssign} />
						))}
					</Zone>
					<div className="grid gap-4 md:grid-cols-3">
						{ROUTER_TOOLS.map((tool) => (
							<Zone key={tool} id={tool} title={racerName(tool)}>
								{cards
									.filter((card) => assignments[card.taskId] === tool)
									.map((card) => (
										<CardView key={card.taskId} card={card} current={tool} onAssign={onAssign} />
									))}
							</Zone>
						))}
					</div>
				</div>
			</DndContext>
			<div>
				<Button type="button" disabled={unsorted.length > 0 || blocked} onClick={onRun}>
					Run the pipeline
				</Button>
				{unsorted.length > 0 && (
					<p className="text-text-muted mt-2 text-sm">Sort every card to run the pipeline.</p>
				)}
				{note && (
					<p role="status" className="text-text-muted mt-2 text-sm">
						{note}
					</p>
				)}
			</div>
		</section>
	)
}
