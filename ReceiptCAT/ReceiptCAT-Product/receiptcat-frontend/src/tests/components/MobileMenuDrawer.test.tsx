import { describe, it, expect } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileMenuDrawer from '../../components/MobileMenuDrawer'

// Mock antd components
jest.mock('antd', () => ({
  // Mock Drawer: only renders when `open` is true
  Drawer: ({ open, children, title, onClose }: any) => (
    open ? (
      <div data-testid="drawer" role="dialog">
        <div data-testid="drawer-title">{title}</div>
        <button data-testid="close-drawer" onClick={onClose}>×</button>
        {children}
      </div>
    ) : null
  ),
  
  // Mock Menu: renders items as divs with click handlers
  Menu: ({ items, onSelect, selectedKeys }: any) => (
    <div data-testid="drawer-menu">
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
  ),

  // Mock Button: plain button with props
  Button: ({ children, onClick, danger }: any) => (
    <button onClick={onClick} data-danger={danger} data-testid="logout-btn">{children}</button>
  )
}))

describe('MobileMenuDrawer', () => {
  const defaultProps = {
    open: false,
    onClose: jest.fn(),
    currentKey: 'dashboard',
    navItems: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'settings', label: 'Settings' }
    ],
    onSelect: jest.fn(),
    onLogout: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when closed', () => {
    // Drawer should be hidden when open=false
    render(<MobileMenuDrawer {...defaultProps} open={false} />)
    expect(screen.queryByTestId('drawer')).toBeNull()
  })

  it('should render when open', () => {
    // Drawer should render with menu and logout button
    render(<MobileMenuDrawer {...defaultProps} open={true} />)
    expect(screen.getByTestId('drawer')).toBeDefined()
    expect(screen.getByTestId('drawer-menu')).toBeDefined()
    expect(screen.getByTestId('logout-btn')).toBeDefined()
  })

  it('should render with custom title', () => {
    // Title prop should appear as drawer header
    render(<MobileMenuDrawer {...defaultProps} open={true} title="Navigation" />)
    expect(screen.getByTestId('drawer-title').textContent).toEqual('Navigation')
  })

  it('should render with default title', () => {
    // Default title is "Menu" if no title is passed
    render(<MobileMenuDrawer {...defaultProps} open={true} />)
    expect(screen.getByTestId('drawer-title').textContent).toEqual('Menu')
  })

  it('should call onClose when close button is clicked', () => {
    // Verify close button triggers callback
    const onClose = jest.fn()
    render(<MobileMenuDrawer {...defaultProps} open={true} onClose={onClose} />)
    
    fireEvent.click(screen.getByTestId('close-drawer'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should call onSelect when menu item is clicked', () => {
    // Verify selecting a menu item triggers callback with correct key
    const onSelect = jest.fn()
    render(<MobileMenuDrawer {...defaultProps} open={true} onSelect={onSelect} />)
    
    fireEvent.click(screen.getByTestId('menu-item-settings'))
    expect(onSelect).toHaveBeenCalledWith('settings')
  })

  it('should call onLogout when logout button is clicked', () => {
    // Logout button should call onLogout handler
    const onLogout = jest.fn()
    render(<MobileMenuDrawer {...defaultProps} open={true} onLogout={onLogout} />)
    
    fireEvent.click(screen.getByTestId('logout-btn'))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('should highlight current menu item', () => {
    // Selected menu item should have data-selected="true"
    render(<MobileMenuDrawer {...defaultProps} open={true} currentKey="settings" />)
    
    const settingsItem = screen.getByTestId('menu-item-settings')
    expect(settingsItem.getAttribute('data-selected')).toBe('true')
  })

  it('should handle empty currentKey', () => {
    // When no key is selected, none should be highlighted
    render(<MobileMenuDrawer {...defaultProps} open={true} currentKey="" />)
    
    const dashboardItem = screen.getByTestId('menu-item-dashboard')
    const settingsItem = screen.getByTestId('menu-item-settings')
    expect(dashboardItem.getAttribute('data-selected')).toBe('false')
    expect(settingsItem.getAttribute('data-selected')).toBe('false')
  })

  it('should render logout button with danger style', () => {
    // Logout button should have danger style for emphasis
    render(<MobileMenuDrawer {...defaultProps} open={true} />)
    
    const logoutBtn = screen.getByTestId('logout-btn')
    expect(logoutBtn.getAttribute('data-danger')).toBe('true')
  })

  it('should render without onLogout prop', () => {
    // Even without onLogout callback, logout button still renders
    const propsWithoutLogout = { ...defaultProps }
    delete (propsWithoutLogout as any).onLogout
    
    render(<MobileMenuDrawer {...propsWithoutLogout} open={true} />)
    expect(screen.getByTestId('logout-btn')).toBeDefined()
  })
})
