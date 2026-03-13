// src/tests/pages/index.test.tsx
import React from 'react'
import '@testing-library/jest-dom'
import { render, waitFor } from '@testing-library/react'
import { useAuth } from 'react-oidc-context'
import type { AuthContextProps } from 'react-oidc-context'
import LoginPage from '../../pages/index'

// --- Mocks ---
jest.mock('react-oidc-context')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

/**
 * Helper: set the useAuth() return shape for this file.
 * - Keep the shape minimal (only what the component reads).
 * - Use `undefined` (not null) to represent no activeNavigator.
 */
function mockAuthState(partial: Partial<AuthContextProps>) {
  const base: Partial<AuthContextProps> = {
    isLoading: false,
    isAuthenticated: false,
    activeNavigator: undefined,
    signinRedirect: jest.fn().mockResolvedValue(undefined),
  }
  const value = { ...base, ...partial } as AuthContextProps
  mockUseAuth.mockReturnValue(value)
}

describe('LoginPage', () => {
  // Keep originals to restore after each test and avoid cross-test coupling
  const originalEnv = process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI
  const originalLocation = window.location

  beforeEach(() => {
    jest.clearAllMocks()

    // Spy window.location.assign so we can assert redirects without real navigation
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, assign: jest.fn() },
      writable: true,
    })

    // Default baseline: unauthenticated, idle (no active navigator)
    mockAuthState({
      isLoading: false,
      isAuthenticated: false,
      activeNavigator: undefined,
    })
  })

  afterEach(() => {
    // Restore env and location to keep tests isolated
    process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI = originalEnv
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true })
  })

  describe('basic render', () => {
    it('should render without crashing', () => {
      render(<LoginPage />)
    })
  })

  describe('redirect / side-effects', () => {
    it('should redirect to /app when already authenticated and no env redirect is set', () => {
      // Arrange — authenticated user, and no NEXT_PUBLIC_OIDC_REDIRECT_URI
      delete process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI
      mockAuthState({ isLoading: false, isAuthenticated: true })

      // Act
      render(<LoginPage />)

      // Assert — falls back to "/app"
      expect(window.location.assign).toHaveBeenCalledWith('/app')
    })

    it('should call signinRedirect when unauthenticated and idle (no active navigator)', () => {
      // Arrange — not authenticated, and no navigator is active
      const signinRedirect = jest.fn().mockResolvedValue(undefined)
      mockAuthState({
        isLoading: false,
        isAuthenticated: false,
        activeNavigator: undefined,
        signinRedirect,
      })

      // Act
      render(<LoginPage />)

      // Assert
      expect(signinRedirect).toHaveBeenCalledTimes(1)
    })

    it('should not call signinRedirect when an auth navigator is already active', () => {
      // Arrange — a navigator (e.g. signinRedirect) is already in progress
      const signinRedirect = jest.fn()
      mockAuthState({
        isLoading: false,
        isAuthenticated: false,
        activeNavigator: 'signinRedirect',
        signinRedirect,
      })

      // Act
      render(<LoginPage />)

      // Assert
      expect(signinRedirect).not.toHaveBeenCalled()
      expect(window.location.assign).not.toHaveBeenCalled()
    })

    it('should log a friendly error when signinRedirect rejects (covers catch branch)', async () => {
      // Arrange — unauthenticated and idle (no activeNavigator), but signinRedirect rejects
      const signinRedirect = jest.fn().mockRejectedValue(new Error('boom'))
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}) // silence console

      mockAuthState({
        isLoading: false,
        isAuthenticated: false,
        activeNavigator: undefined, // critical: must be undefined to enter redirect branch
        signinRedirect,
      })

      // Act — rendering triggers useEffect
      render(<LoginPage />)

      // Assert — redirect attempted and catch branch logged the error
      await waitFor(() => {
        expect(signinRedirect).toHaveBeenCalledTimes(1)
        expect(errorSpy).toHaveBeenCalledWith('signinRedirect failed:', expect.any(Error))
      })

      // Cleanup
      errorSpy.mockRestore()
    })
  })
})