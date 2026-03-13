// -----------------------------------------------------------------------------
// CollapsibleCard.test.tsx
// Purpose: Deterministic, AAA-style tests for the CollapsibleCard component.
// Guidelines:
//  - Use a namespace import for React so hooks (e.g., useRef) can be spied on.
//  - Stub requestAnimationFrame per test for stable timing.
//  - Wrap temporary spies in try/finally to prevent leakage.
// -----------------------------------------------------------------------------
import * as React from 'react'  // Namespace import so we can spy on React hooks
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CollapsibleCard from '../../components/CollapsibleCard'

// ---------- Shared helpers ----------
// Centralized test IDs to avoid typos and ease refactors
const IDS = {
  root: 'root',
  header: 'hdr',
  body: 'body',
  chev: 'chev',
} as const

// Default props for most tests (immediate style for deterministic asserts)
const defaultProps: React.ComponentProps<typeof CollapsibleCard> = {
  title: 'Test Title',
  defaultExpanded: true,
  testNoAnimation: true,
  rootTestId: IDS.root,
  headerTestId: IDS.header,
  bodyTestId: IDS.body,
  chevronTestId: IDS.chev,
  children: <div>Content</div>,
}

// Header toggle button (stable via provided test id)
const getHeaderButton = () => screen.getByTestId(IDS.header) as HTMLButtonElement

// Collapsible body element (stable via test id; does not rely on DOM nesting)
const getContentElement = () => screen.getByTestId(IDS.body) as HTMLElement

// Root wrapper (exposes data-state-expanded)
const getRoot = () => screen.getByTestId(IDS.root) as HTMLElement

// Assert helper: checks aria-expanded (header) and data-state-expanded (root)
const expectExpandedState = (expanded: boolean) => {
  const header = getHeaderButton()
  const root = getRoot()
  expect(header).toHaveAttribute('aria-expanded', expanded ? 'true' : 'false')
  expect(root).toHaveAttribute('data-state-expanded', expanded ? 'true' : 'false')
}

// Render helper — concise and intention-revealing
const renderCard = (overrides?: Partial<React.ComponentProps<typeof CollapsibleCard>>) => {
  render(<CollapsibleCard {...defaultProps} {...overrides} />)
  const headerButton = getHeaderButton()  // header toggle button
  const contentElement = getContentElement()  // collapsible body element
  return { headerButton, contentElement }
}

const user = userEvent.setup()

describe('CollapsibleCard', () => {
  // Focus: toggle behavior, a11y wiring, animation-side effects, and robustness to null refs
  beforeEach(() => {
    // Arrange: make RAF immediate so the scheduled "set maxHeight to 0px" runs synchronously
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(((cb: FrameRequestCallback) => {
      cb(0)
      return 1 as unknown as number
    }) as any)
  })

  afterEach(() => {
    // Cleanup: restore any spies/mocks to avoid cross‑test leakage
    jest.restoreAllMocks()
  })

  it('should start expanded by default and collapse on header click', async () => {
    // Arrange
    const { headerButton, contentElement } = renderCard({ defaultExpanded: true })

    // Assert (initial expanded state)
    expectExpandedState(true)
    expect(contentElement.style.maxHeight).toBe('none') // testNoAnimation: immediate 'none'

    // Act (collapse)
    await user.click(headerButton)

    // Assert (collapsed state)
    expectExpandedState(false)
    expect(contentElement).toHaveStyle({ maxHeight: '0px' })
  })

  it('should respect defaultExpanded=false and expand on click', async () => {
    // Arrange
    const { headerButton, contentElement } = renderCard({ defaultExpanded: false })

    // Assert (initial collapsed)
    expect(contentElement).toHaveStyle({ maxHeight: '0px' })
    expectExpandedState(false)

    // Act (expand)
    await user.click(headerButton)

    // Assert (expanded)
    expectExpandedState(true)
    expect(contentElement.style.maxHeight).toBe('none')
    expectExpandedState(true)
  })

  it('should not toggle when collapsible is false', async () => {
    // Arrange
    const { headerButton, contentElement } = renderCard({ collapsible: false, defaultExpanded: true })

    // Snapshot current inline style to assert immutability after an ignored click
    const maxHeightBefore = contentElement.style.maxHeight

    expect(headerButton.style.cursor).toBe('default')

    // Act (click is ignored)
    await user.click(headerButton)

    // Assert (no change)
    expect(headerButton).toHaveAttribute('aria-expanded', 'true')
    expect(contentElement).toHaveStyle({ maxHeight: maxHeightBefore || '' })
    expectExpandedState(true)
  })

  it('should link aria-controls to the collapsible body element', () => {
    const { headerButton } = renderCard({ defaultExpanded: true })
    const bodyId = headerButton.getAttribute('aria-controls')!
    expect(bodyId).toBeTruthy()  // Header references body via aria-controls
    const body = document.getElementById(bodyId as string)
    expect(body).toBe(getContentElement())
  })

  it('should mark the collapsible body as role="region"', () => {
    renderCard()
    const body = getContentElement()
    expect(body).toHaveAttribute('role', 'region')
  })

  it('should render icon and extra content in the header', () => {
    // Arrange
    renderCard({
      icon: <span data-testid="icon">Icon</span>,
      extra: <span data-testid="extra">Extra</span>,
    })

    // Assert (both icon and extra are rendered)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByTestId('extra')).toBeInTheDocument()
  })

  it('should render chevron when collapsible is true', () => {
    renderCard({ collapsible: true })
    expect(screen.getByTestId(IDS.chev)).toBeInTheDocument()
  })

  it('should not render chevron when collapsible is false', () => {
    renderCard({ collapsible: false })
    expect(screen.queryByTestId(IDS.chev)).toBeNull()
  })

  it('should rotate chevron based on expanded state (0deg when expanded, -90deg when collapsed)', async () => {
    const { headerButton } = renderCard({ collapsible: true, defaultExpanded: true })
    // Sanity check: header exposes ARIA wiring
    expect(headerButton.tagName.toLowerCase()).toBe('button') // Semantic <button> does not require explicit role attribute
    expect(headerButton).toHaveAttribute('aria-controls')
    const chev = screen.getByTestId(IDS.chev) as HTMLElement
    // Expanded: rotate(0deg)
    expect(chev.style.transform).toBe('rotate(0deg)')

    // Collapse once
    await user.click(headerButton)
    expect(chev.style.transform).toBe('rotate(-90deg)')
  })

  it('should register a transitionend handler on expand and remove it after the event', async () => {
    // Arrange
    const { headerButton, contentElement } = renderCard({ defaultExpanded: false, testNoAnimation: false })

    const addSpy = jest.spyOn(contentElement, 'addEventListener')
    const removeSpy = jest.spyOn(contentElement, 'removeEventListener')

    // Act
    await user.click(headerButton)

    // Assert
    expect(addSpy).toHaveBeenCalledWith('transitionend', expect.any(Function))
    const handler = addSpy.mock.calls.find(([evt]) => evt === 'transitionend')?.[1] as EventListener
    expect(typeof handler).toBe('function')

    // Act
    contentElement.dispatchEvent(new Event('transitionend'))

    // Assert
    expect(removeSpy).toHaveBeenCalledWith('transitionend', handler)
    expect(contentElement.style.maxHeight).toBe('none')

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('should lock current height before collapsing (reads scrollHeight)', async () => {
    // Arrange
    const { headerButton, contentElement } = renderCard({ defaultExpanded: true, testNoAnimation: false })

    // The component reads scrollHeight; mock to a known value
    Object.defineProperty(contentElement, 'scrollHeight', { configurable: true, value: 456 })

    // Pause RAF for one frame to observe the intermediate lock ("456px") before it becomes "0px"
    const rafSpy = (window.requestAnimationFrame as jest.MockedFunction<typeof window.requestAnimationFrame>)
    const originalImpl = rafSpy.getMockImplementation()
    rafSpy.mockImplementationOnce(() => 1 as unknown as number) // do NOT call the callback this time

    // Act (collapse)
    await user.click(headerButton)

    // Assert: first frame locks to current height before animating to 0
    expect(contentElement.style.maxHeight).toBe('456px')

    // Restore the usual immediate RAF for subsequent frames/tests
    if (originalImpl) rafSpy.mockImplementation(originalImpl as any)
  })

  it('should call onToggle with the next expanded state', async () => {
    const onToggle = jest.fn()
    const { headerButton } = renderCard({ defaultExpanded: true, onToggle })

    // Collapse -> next=false
    await user.click(headerButton)
    expect(onToggle).toHaveBeenCalledWith(false)  // Collapse -> next=false

    // Expand -> next=true
    await user.click(headerButton)
    expect(onToggle).toHaveBeenCalledWith(true)   // Expand -> next=true
    expect(onToggle).toHaveBeenCalledTimes(2)
  })

  it('should no-op safely when content ref is null (covers early return)', async () => {
    // Covers the effect guard: `if (!bodyElement) return;` (early-return path)
    // Spy only this test: make the first useRef call return a null ref for the content element
    const refSpy = jest.spyOn(React, 'useRef')
      .mockReturnValueOnce({ current: null } as unknown as React.MutableRefObject<HTMLDivElement | null>)

    // Render should not throw even if content ref is null
    expect(() => {
      render(
        <CollapsibleCard
          title="Test Title"
          defaultExpanded
          rootTestId={IDS.root}
          headerTestId={IDS.header}
          bodyTestId={IDS.body}
          chevronTestId={IDS.chev}
        >
          <div>Content</div>
        </CollapsibleCard>
      )
    }).not.toThrow()

    // Act: toggling should not throw; effect guard returns early
    const headerButton = getHeaderButton()
    await expect(user.click(headerButton)).resolves.not.toThrow()

    // Restore the spy to avoid leaking across tests
    refSpy.mockRestore()
  })

  it('should early-return when content ref stays null across toggles (persistent null ref via react mock)', async () => {
    // Covers the effect guard: `if (!bodyElement) return;` (early-return path)
    await (async () => {
      // Create a ref object whose `.current` always reads as null and ignores writes.
      const fakeRef: React.MutableRefObject<HTMLDivElement | null> = { current: null } as any
      Object.defineProperty(fakeRef, 'current', {
        configurable: true,
        get: () => null, // always null
        set: () => { /* ignore assignments from React's ref setter */ },
      })

      // Spy after suite-level imports but before render; hook calls during render will use this impl.
      const refSpy = jest.spyOn(React, 'useRef').mockImplementation(
        () => fakeRef as React.MutableRefObject<HTMLDivElement | null>
      )

      // Render with real animation path so the effect body would run if not guarded
      render(
        <CollapsibleCard
          title="Test Title"
          defaultExpanded
          testNoAnimation={false}
          rootTestId={IDS.root}
          headerTestId={IDS.header}
          bodyTestId={IDS.body}
          chevronTestId={IDS.chev}
        >
          <div>Content</div>
        </CollapsibleCard>
      )

      // Act: toggle twice; effect should early-return each time (no crashes)
      const headerButton = getHeaderButton()
      await user.click(headerButton)
      await user.click(headerButton)

      // Assert: interactive with no errors implies the guard executed
      expect(headerButton).toBeInTheDocument()

      refSpy.mockRestore()
    })()
  })

  it('should take the testNoAnimation early-return path in effect when toggled on', () => {
    // Arrange: start on real animation path (testNoAnimation=false)
    const baseProps = {
      title: 'Test Title',
      defaultExpanded: true as const,
      testNoAnimation: false,
      rootTestId: IDS.root,
      headerTestId: IDS.header,
      bodyTestId: IDS.body,
      chevronTestId: IDS.chev,
    }
    const { rerender } = render(
      <CollapsibleCard {...baseProps}>
        <div>Content</div>
      </CollapsibleCard>
    )

    const body = screen.getByTestId(IDS.body) as HTMLDivElement

    // Spy on addEventListener/removeEventListener around the rerender step
    const addSpy = jest.spyOn(body, 'addEventListener')
    const removeSpy = jest.spyOn(body, 'removeEventListener')

    // Act: toggle testNoAnimation -> true (no state change, but effect depends on this prop)
    rerender(
      <CollapsibleCard {...baseProps} testNoAnimation={true}>
        <div>Content</div>
      </CollapsibleCard>
    )

    // Assert: early-return path sets immediate maxHeight; no new listener added
    // React will invoke the previous effect cleanup before applying the new effect,
    // so removeEventListener is expected to be called here.
    expect(body.style.maxHeight).toBe('none') // immediate style for expanded=true
    expect(addSpy).not.toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalledWith('transitionend', expect.any(Function))

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
