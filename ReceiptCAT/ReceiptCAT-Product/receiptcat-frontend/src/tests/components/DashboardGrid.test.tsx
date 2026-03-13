import React from 'react'
import { render } from '@testing-library/react'
import DashboardGrid from '@/components/DashboardGrid'

describe('<DashboardGrid />', () => {
  it('should inject custom CSS for masonry layout and full-width blocks', () => {
    // Arrange: render the grid with one child
    const { container } = render(<DashboardGrid><div>One</div></DashboardGrid>);

    // Act: locate the injected <style> tag
    const styleEl = container.querySelector('style')!;
    const cssText = styleEl.textContent!;

    // Assert: ensure essential CSS classnames are present
    expect(styleEl).toBeTruthy();
    expect(cssText).toContain('.my-masonry-grid');
    expect(cssText).toContain('.my-masonry-grid_column');
    expect(cssText).toContain('.dashboard-fullwidth');
  });

  it('should render all children passed to DashboardGrid', () => {
    // Arrange: render the grid with three test items
    const { getByTestId } = render(
      <DashboardGrid>
        <div data-testid="c1">A</div>
        <div data-testid="c2">B</div>
        <div data-testid="c3">C</div>
      </DashboardGrid>
    );

    // Act & Assert: confirm all items are present
    expect(getByTestId('c1')).toBeInTheDocument();
    expect(getByTestId('c2')).toBeInTheDocument();
    expect(getByTestId('c3')).toBeInTheDocument();
  });

  it('should render span-2 items in the full-width section', () => {
    // Arrange: render the grid with normal and span-2 items
    const { getByTestId } = render(
      <DashboardGrid>
        <div data-testid="card-1">Card 1</div>
        <div data-testid="card-wide" className="span-2">Wide</div>
        <div data-testid="card-2">Card 2</div>
      </DashboardGrid>
    );

    // Act: locate the full-width container and wide card
    const fullWidth = document.querySelector('.dashboard-fullwidth');
    const wide = getByTestId('card-wide');

    // Assert: verify wide item is rendered correctly
    expect(fullWidth).toBeInTheDocument();
    expect(wide).toBeInTheDocument();
    expect(wide).toHaveClass('span-2');
  });

  it('should render original elements like section and article', () => {
    // Arrange: render the grid with semantic HTML elements
    const { getByTestId } = render(
      <DashboardGrid>
        <section data-testid="s" />
        <article data-testid="a" />
      </DashboardGrid>
    );

    // Act & Assert: check tag names remain unchanged
    expect(getByTestId('s').tagName.toLowerCase()).toBe('section');
    expect(getByTestId('a').tagName.toLowerCase()).toBe('article');
  });
})
