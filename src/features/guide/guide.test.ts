import { describe, expect, it } from 'vitest'
import { GUIDE_PARTS, LEVEL_STEPS } from '@/lib/constants'
import { mergeGuideSeen, placeCard, tipForStep } from './guide'

describe('mergeGuideSeen', () => {
	it('adds new parts once, in the canonical order', () => {
		expect(mergeGuideSeen([GUIDE_PARTS.check], [GUIDE_PARTS.welcome, GUIDE_PARTS.check])).toEqual([
			GUIDE_PARTS.welcome,
			GUIDE_PARTS.check
		])
	})

	it('drops stored values that are not guide parts', () => {
		expect(mergeGuideSeen(['old-part', GUIDE_PARTS.reveal], [])).toEqual([GUIDE_PARTS.reveal])
	})
})

describe('tipForStep', () => {
	it('has a tip for Predict, Reveal and Check only', () => {
		expect(tipForStep(LEVEL_STEPS.predict)?.part).toBe(GUIDE_PARTS.predict)
		expect(tipForStep(LEVEL_STEPS.reveal)?.part).toBe(GUIDE_PARTS.reveal)
		expect(tipForStep(LEVEL_STEPS.check)?.part).toBe(GUIDE_PARTS.check)
		expect(tipForStep(LEVEL_STEPS.learn)).toBeNull()
		expect(tipForStep(LEVEL_STEPS.play)).toBeNull()
	})
})

describe('placeCard', () => {
	const viewport = { width: 1280, height: 800 }
	const cardWidth = 360

	it('centers the card when there is no target', () => {
		const placed = placeCard(null, viewport, cardWidth)
		expect(placed.spotlight).toBeNull()
		expect(placed.card).toEqual({ left: 460, top: 'center' })
	})

	it('puts the card below a target near the top, centered on it', () => {
		const placed = placeCard({ top: 20, left: 600, width: 80, height: 30 }, viewport, cardWidth)
		expect(placed.card).toEqual({ left: 460, top: 20 + 30 + 8 + 12 })
	})

	it('puts the card above a target near the bottom', () => {
		const placed = placeCard({ top: 700, left: 100, width: 200, height: 40 }, viewport, cardWidth)
		expect(placed.card).toEqual({ left: 20, bottom: 800 - 700 + 8 + 12 })
	})

	it('keeps the card inside the screen with a 16px gutter', () => {
		const placed = placeCard({ top: 20, left: 1250, width: 20, height: 20 }, viewport, cardWidth)
		expect(placed.card.left).toBe(1280 - 360 - 16)
	})

	it('pads the spotlight and clips it to the screen', () => {
		const placed = placeCard({ top: -50, left: 0, width: 100, height: 1000 }, viewport, cardWidth)
		expect(placed.spotlight).toEqual({ top: 0, left: 0, width: 108, height: 800 })
	})

	it('docks the card to the bottom when the target leaves no room above or below', () => {
		const placed = placeCard({ top: 100, left: 0, width: 400, height: 600 }, viewport, cardWidth)
		expect(placed.card).toEqual({ left: 20, bottom: 16 })
	})

	it('narrows the card on a phone', () => {
		const placed = placeCard(null, { width: 390, height: 844 }, cardWidth)
		expect(placed.width).toBe(390 - 32)
		expect(placed.card.left).toBe(16)
	})
})
