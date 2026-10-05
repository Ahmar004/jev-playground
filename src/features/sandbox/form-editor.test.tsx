import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { QUESTION_KINDS } from '@/lib/constants'
import { docToBody, type SandboxDoc, type SandboxQuestion } from './doc'
import { FormEditor } from './form-editor'

const TOPIC: SandboxQuestion = {
	id: 'a',
	name: 'topic',
	question: {
		type: QUESTION_KINDS.choice,
		instructions: 'Main complaint?',
		criteria: { food: 'The meal itself', speed: null }
	}
}
const HAPPY: SandboxQuestion = {
	id: 'b',
	name: 'happy',
	question: { type: QUESTION_KINDS.noul, instructions: 'Happy?' }
}
const START: SandboxDoc = { state: 'The pasta was lovely but slow.', questions: [TOPIC, HAPPY] }

// The setup the Form last reported, so a test can read what the user's typing produced.
const seen: { doc: SandboxDoc } = { doc: START }

function Harness({ initial }: { initial: SandboxDoc }) {
	const [doc, setDoc] = useState(initial)
	return (
		<FormEditor
			doc={doc}
			onChange={(next) => {
				seen.doc = next
				setDoc(next)
			}}
		/>
	)
}

describe('Form view criteria', () => {
	it('shows each Choice option description and each Noul criterion field', () => {
		render(<Harness initial={START} />)
		expect(screen.getByLabelText('What does "food" mean? (optional)')).toHaveValue(
			'The meal itself'
		)
		expect(screen.getByLabelText('What does "speed" mean? (optional)')).toHaveValue('')
		expect(screen.getByLabelText('When is the answer true? (optional)')).toHaveValue('')
		expect(screen.getByLabelText('When is the answer false? (optional)')).toHaveValue('')
	})

	it('writes a Noul criterion into the setup and removes it when cleared', async () => {
		const user = userEvent.setup()
		render(<Harness initial={START} />)
		await user.type(screen.getByLabelText('When is the answer true? (optional)'), 'They praise it')
		expect(docToBody(seen.doc).questions.happy).toEqual({
			type: QUESTION_KINDS.noul,
			instructions: 'Happy?',
			criteria: { true: 'They praise it' }
		})
		await user.clear(screen.getByLabelText('When is the answer true? (optional)'))
		expect(docToBody(seen.doc).questions.happy).toEqual(HAPPY.question)
	})

	it('writes a Choice option description into the setup, and a cleared one becomes null', async () => {
		const user = userEvent.setup()
		render(<Harness initial={START} />)
		await user.type(screen.getByLabelText('What does "speed" mean? (optional)'), 'Waiting time')
		expect(docToBody(seen.doc).questions.topic).toMatchObject({
			criteria: { food: 'The meal itself', speed: 'Waiting time' }
		})
		await user.clear(screen.getByLabelText('What does "food" mean? (optional)'))
		expect(docToBody(seen.doc).questions.topic).toMatchObject({
			criteria: { food: null, speed: 'Waiting time' }
		})
	})

	it('follows a change made from outside, like the JSON view', () => {
		const { rerender } = render(<FormEditor doc={START} onChange={() => {}} />)
		const changed: SandboxDoc = {
			...START,
			questions: [
				TOPIC,
				{
					...HAPPY,
					question: {
						type: QUESTION_KINDS.noul,
						instructions: 'Happy?',
						criteria: { false: 'Any complaint' }
					}
				}
			]
		}
		rerender(<FormEditor doc={changed} onChange={() => {}} />)
		expect(screen.getByLabelText('When is the answer false? (optional)')).toHaveValue(
			'Any complaint'
		)
	})
})
