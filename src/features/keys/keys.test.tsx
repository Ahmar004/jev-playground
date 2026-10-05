import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KeysPanel } from './keys-panel'
import { KeysProvider, useKeys } from './keys-context'

const SECRET = 'sk-ant-super-secret-key-1234' // allowlist secret: fake test fixture

function Harness() {
	const { setPanelOpen } = useKeys()
	return (
		<button type="button" onClick={() => setPanelOpen(true)}>
			Open
		</button>
	)
}

function renderPanel() {
	const client = new QueryClient()
	render(
		<QueryClientProvider client={client}>
			<KeysProvider>
				<Harness />
				<KeysPanel />
			</KeysProvider>
		</QueryClientProvider>
	)
	return client
}

function mockModels() {
	const fetchMock = vi.fn<typeof fetch>(
		async () =>
			new Response(JSON.stringify({ data: [{ id: 'claude-opus-5-5', display_name: 'Opus' }] }))
	)
	vi.stubGlobal('fetch', fetchMock)
	return fetchMock
}

afterEach(() => {
	vi.unstubAllGlobals()
	window.localStorage.clear()
	window.sessionStorage.clear()
})

describe('Keys panel', () => {
	it('saves a key on Enter, tests it with a real model-list call, and shows the models', async () => {
		const fetchMock = mockModels()
		const user = userEvent.setup()
		renderPanel()
		await user.click(screen.getByRole('button', { name: 'Open' }))
		await user.type(screen.getByLabelText('Anthropic key'), `${SECRET}{Enter}`)
		await waitFor(() => expect(screen.getByText(/1 models available/)).toBeInTheDocument())
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
			'https://api.anthropic.com/v1/models?limit=1000'
		)
	})

	it('shows a friendly message with Retry when the key is rejected, never the key', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('{}', { status: 401 }))
		)
		const user = userEvent.setup()
		renderPanel()
		await user.click(screen.getByRole('button', { name: 'Open' }))
		await user.type(screen.getByLabelText('Anthropic key'), `${SECRET}{Enter}`)
		const message = await screen.findByText(/did not accept this key/)
		expect(message.textContent).not.toContain(SECRET)
		expect(screen.getAllByRole('button', { name: 'Retry' }).length).toBeGreaterThan(0)
	})

	it('removes one key, and every key at once (R20)', async () => {
		mockModels()
		const user = userEvent.setup()
		renderPanel()
		await user.click(screen.getByRole('button', { name: 'Open' }))
		await user.type(screen.getByLabelText('Anthropic key'), `${SECRET}{Enter}`)
		await user.type(screen.getByLabelText('OpenAI key'), 'sk-openai-abc{Enter}')
		await user.click(screen.getByRole('button', { name: 'Remove Anthropic key' }))
		expect(screen.getByLabelText('Anthropic key')).toBeInTheDocument()
		expect(screen.queryByLabelText('OpenAI key')).not.toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: 'Remove all keys' }))
		expect(screen.getByLabelText('OpenAI key')).toBeInTheDocument()
	})

	it('never writes a key to browser storage, a cookie, or a query key (Rule-8)', async () => {
		mockModels()
		const user = userEvent.setup()
		const client = renderPanel()
		await user.click(screen.getByRole('button', { name: 'Open' }))
		await user.type(screen.getByLabelText('Anthropic key'), `${SECRET}{Enter}`)
		await waitFor(() => expect(screen.getByText(/models available/)).toBeInTheDocument())
		const dump = JSON.stringify({
			local: { ...window.localStorage },
			session: { ...window.sessionStorage },
			cookie: document.cookie,
			queryKeys: client
				.getQueryCache()
				.getAll()
				.map((query) => query.queryKey)
		})
		expect(dump).not.toContain(SECRET)
	})

	it('marks the key field so session replay and capture skip it (R15)', async () => {
		const user = userEvent.setup()
		renderPanel()
		await user.click(screen.getByRole('button', { name: 'Open' }))
		expect(screen.getByLabelText('Anthropic key')).toHaveClass('ph-no-capture')
		expect(screen.getByLabelText('Anthropic key')).toHaveAttribute('type', 'password')
	})
})
