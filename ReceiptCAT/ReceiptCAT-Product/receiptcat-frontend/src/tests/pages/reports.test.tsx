import { describe, expect } from '@jest/globals'
import { render } from '@testing-library/react'
import ReportsPage from '../../pages/app/reports'

// Mock AppLayout
jest.mock('../../layouts/AppLayout', () => ({ children }: { children: React.ReactNode }) => (
  <div data-testid="app-layout">{children}</div>
))

describe('ReportsPage', () => {
  test('should render reports page', () => {
    const { container } = render(<ReportsPage />)
    
    // Check that the page renders without errors
    const appLayout = container.querySelector('[data-testid="app-layout"]')
    expect(appLayout).not.toBe(null)
    
    // Check that the title is present
    const title = container.querySelector('h1')
    expect(title?.textContent).toEqual('Reports')
  })
})
