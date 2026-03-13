import { describe, it, expect } from '@jest/globals'
// src/tests/components/RequireAuth.test.tsx
import { render, screen } from '@testing-library/react'
import RequireAuth from '../../components/RequireAuth'


jest.mock('../../layouts/AppLayout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="mock-layout">{children}</div>,
}))

// mock useAuthGuard hook
jest.mock('../../lib/auth/useAuthGuard', () => ({
  useAuthGuard: jest.fn(),
}))

import { useAuthGuard } from '../../lib/auth/useAuthGuard'
const mockUseAuthGuard = useAuthGuard as jest.Mock

describe('RequireAuth', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state', () => {
    // Simulate hook reporting that auth is still loading
    mockUseAuthGuard.mockReturnValue({ isLoading: true })

    render(
      <RequireAuth>
        <div>Protected content</div>
      </RequireAuth>
    )

    // Expect the loading indicator to be shown inside the layout
    expect(screen.getByText('Loading…')).toBeTruthy()
  })

  it('renders error state', () => {
    // Simulate hook reporting an authentication error
    mockUseAuthGuard.mockReturnValue({
      error: { message: 'Something went wrong' },
    })

    render(
      <RequireAuth>
        <div>Protected content</div>
      </RequireAuth>
    )
    // Expect the error message to be rendered
    expect(screen.getByText(/Auth error:/)).toBeTruthy()
    expect(screen.getByText('Auth error: Something went wrong')).toBeTruthy()
  })

  it('renders redirecting state if not authenticated', () => {
    // Simulate hook reporting that user is not authenticated
    mockUseAuthGuard.mockReturnValue({ isAuthenticated: false })

    render(
      <RequireAuth>
        <div>Protected content</div>
      </RequireAuth>
    )

    // Expect the component to show a redirecting message
    expect(screen.getByText('Redirecting…')).toBeTruthy()
  })

  it('renders children when authenticated', () => {
    // Simulate hook reporting user is authenticated
    mockUseAuthGuard.mockReturnValue({ isAuthenticated: true })

    render(
      <RequireAuth>
        <div>Protected content</div>
      </RequireAuth>
    )
    // Expect the protected children to be displayed normally
    expect(screen.getByText('Protected content')).toBeTruthy()
  })

  it('should render redirecting state if token is expired', () => {
    // Simulate user is authenticated but token has expired
    mockUseAuthGuard.mockReturnValue({
      isAuthenticated: true,
      user: { expired: true },
    });

    render(
      <RequireAuth>
        <div>Protected content</div>
      </RequireAuth>
    );

    // Expect the redirecting message due to expired token
    expect(screen.getByText('Redirecting…')).toBeTruthy();
  });
})