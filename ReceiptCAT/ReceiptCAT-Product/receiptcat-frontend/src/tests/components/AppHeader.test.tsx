import { describe, it, expect } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import AppHeader from '../../components/AppHeader'

// Mock antd components
jest.mock('antd', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Button: ({ children, onClick, danger, ...props }: any) => (
    // we ignore `danger` because native <button> doesn’t support it
    <button onClick={onClick} {...props}>{children}</button>
  ),
  Menu: ({ items, onSelect, selectedKeys }: any) => (
    // use a div to mock the menu component, render every item as a clickable div
    <div data-testid="menu">
      {items?.map((item: any) => (
        <div 
          key={item.key} 
          onClick={() => onSelect({ key: item.key })}
          data-selected={selectedKeys?.includes(item.key)}
          data-testid={`menu-item-${item.key}`}
        >
          {item.label}
        </div>
      ))}
    </div>
  )
}))

describe('AppHeader', () => {
  const defaultProps = {
    isMobile: false,
    currentKey: 'dashboard',
    navItems: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'settings', label: 'Settings' }
    ],
    onMenuOpen: jest.fn(),
    onSelect: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render desktop header with horizontal menu', () => {
    render(<AppHeader {...defaultProps} />)
    // desktop view: have logo, nav bar(horizontal menu) and no hamburger icon
    expect(screen.getByText('ReceiptCAT')).not.toBeNull()
    expect(screen.getByTestId('menu')).not.toBeNull()
    expect(screen.queryByText('☰')).toBeNull()
  })

  it('should render mobile header with hamburger button', () => {
    render(<AppHeader {...defaultProps} isMobile={true} />)
    // mobile view: have logo, hamburger icon and no nav bar(horizontal menu)
    expect(screen.getByText('ReceiptCAT')).not.toBeNull()
    expect(screen.getByText('☰')).not.toBeNull()
    expect(screen.queryByTestId('menu')).toBeNull()
  })

  it('should call onMenuOpen when hamburger button is clicked', () => {
    const onMenuOpen = jest.fn()
    render(<AppHeader {...defaultProps} isMobile={true} onMenuOpen={onMenuOpen} />)
    // click hamburger icon, fire onMenuOpen event
    fireEvent.click(screen.getByText('☰'))
    expect(onMenuOpen).toHaveBeenCalledTimes(1)
  })

  it('should call onSelect when menu item is clicked', () => {
    const onSelect = jest.fn()
    render(<AppHeader {...defaultProps} onSelect={onSelect} />)
    // click menu item can pass its key to onSelect 
    fireEvent.click(screen.getByTestId('menu-item-settings'))
    expect(onSelect).toHaveBeenCalledWith('settings')
  })

  it('should render right slot content', () => {
    // used to render upload button, etc.
    const rightSlot = <button data-testid="upload-btn">Upload</button>
    render(<AppHeader {...defaultProps} rightSlot={rightSlot} />)
    
    expect(screen.getByTestId('upload-btn')).not.toBeNull()
  })

  it('should highlight current menu item', () => {
    render(<AppHeader {...defaultProps} currentKey="settings" />)
    // when currentKey is "settings", the corresponding menu item should be highlighted
    const settingsItem = screen.getByTestId('menu-item-settings')
    expect(settingsItem.getAttribute('data-selected')).toEqual('true')
  })

  it('should handle empty currentKey', () => {
    render(<AppHeader {...defaultProps} currentKey="" />)
    // when currentKey is empty, no menu item should be highlighted
    const dashboardItem = screen.getByTestId('menu-item-dashboard')
    const settingsItem = screen.getByTestId('menu-item-settings')
    expect(dashboardItem.getAttribute('data-selected')).toEqual('false')
    expect(settingsItem.getAttribute('data-selected')).toEqual('false')
  })

  it('should render without right slot', () => {
    render(<AppHeader {...defaultProps} />)
    // even without rightslot, the header should still be rendered
    expect(screen.getByText('ReceiptCAT')).not.toBeNull()
    // Right slot area should still exist but be empty
    const header = document.querySelector('header')
    expect(header).not.toBeNull()
  })

  it('should call onLogout when logout button is clicked(desktop only)', () => {
    // click logout button, fire onLogout event
    const onLogout = jest.fn()
    render(<AppHeader {...defaultProps} onLogout={onLogout} />)
    fireEvent.click(screen.getByRole('button', { name: /log out/i }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
  it('should NOT render "Log out" button on mobile', () => {
    // mobile view should not show "Log out" button on appheader 
    const onLogout = jest.fn()
    render(<AppHeader {...defaultProps} isMobile={true} onLogout={onLogout} />)
    expect(screen.queryByRole('button', { name: /log out/i })).toBeNull()
  })
})
