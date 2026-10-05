import { vi } from 'vitest'

// jsdom has no layout: every box is 0x0 and ResizeObserver/matchMedia are
// missing. The guide only spotlights elements that are on screen, so tests
// give every [data-guide] element a box.
export function stubLayout() {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		}
	)
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }))
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
		const size = this.hasAttribute('data-guide') ? 40 : 0
		return {
			top: 100,
			left: 100,
			width: size,
			height: size,
			bottom: 100 + size,
			right: 100 + size,
			x: 100,
			y: 100,
			toJSON: () => ({})
		}
	})
}
