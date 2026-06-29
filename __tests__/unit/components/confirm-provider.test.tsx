import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmProvider, useConfirm } from '@/components/ui/ConfirmProvider'

function Harness() {
  const confirm = useConfirm()
  const [result, setResult] = useState<string>('idle')
  return (
    <div>
      <button
        onClick={async () => {
          const ok = await confirm({ title: 'Delete item?', confirmLabel: 'Delete', variant: 'danger' })
          setResult(ok ? 'confirmed' : 'cancelled')
        }}
      >
        trigger
      </button>
      <span data-testid="result">{result}</span>
    </div>
  )
}

describe('ConfirmProvider / useConfirm', () => {
  it('shows the dialog and resolves true when confirmed', async () => {
    const user = userEvent.setup()
    render(
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>,
    )

    await user.click(screen.getByText('trigger'))
    expect(await screen.findByText('Delete item?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('confirmed'))
  })

  it('resolves false when cancelled', async () => {
    const user = userEvent.setup()
    render(
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>,
    )

    await user.click(screen.getByText('trigger'))
    await screen.findByText('Delete item?')

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('cancelled'))
  })

  it('falls back to window.confirm when no provider is mounted', async () => {
    const spy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()

    render(<Harness />)
    await user.click(screen.getByText('trigger'))

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('confirmed'))
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
