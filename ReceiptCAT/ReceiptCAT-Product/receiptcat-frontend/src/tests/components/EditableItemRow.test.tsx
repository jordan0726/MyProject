// src/tests/components/EditableItemRow.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditableItemRow from '@/components/EditableItemRow';
import type { ReceiptItem } from '@/types/receipt';

// Mock Ant Design Select with a lightweight <select>, preserving key behaviors.
jest.mock('antd', () => {
  const Option = ({ children, value }: any) => (
    <option value={value}>{children}</option>
  );

  const Select = ({
    children,
    value,
    onChange,
    getPopupContainer,
    ['data-testid']: dataTestId,
  }: any) => {
    // Call getPopupContainer so component logic that relies on it is still executed.
    if (typeof getPopupContainer === 'function') {
      const trigger = document.createElement('div');
      document.body.appendChild(trigger);
      getPopupContainer(trigger);
      document.body.removeChild(trigger);
    }

    return (
      <select
        data-testid={dataTestId ?? 'mock-select'}
        value={value ?? ''}
        data-current-value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    );
  };

  Select.Option = Option;

  return { Select };
});

// Mock icon config
jest.mock(
  '@/config/categoryIcons',
  () => ({
    __esModule: true,
    CATEGORY_ICONS: {
      Food: '🍕',
      Drink: '🥤',
    },
  }),
  { virtual: true }
);

// Mock category label
jest.mock(
  '@/types/categoryLabels',
  () => ({
    __esModule: true,
    CATEGORY_LABELS: {
      Food: 'Food',
      Drink: 'Drink',
    },
  }),
  { virtual: true }
);

describe('EditableItemRow', () => {
  const defaultItem: ReceiptItem = {
    name: 'Banana',
    quantity: 2,
    price: 3,
    category: 'fruits_vegetables',
    receiptId: 'r1',
  };

  // Helper wrapper that keeps EditableItemRow controlled during user-event flows.
  const ControlledEditableItemRow = ({
    initialItem,
    onChange = () => {},
    ...rest
  }: {
    initialItem: ReceiptItem;
    onChange?: (item: ReceiptItem) => void;
  } & Omit<React.ComponentProps<typeof EditableItemRow>, 'item' | 'onChange'>) => {
    const [item, setItem] = React.useState(initialItem);

    return (
      <EditableItemRow
        {...rest}
        item={item}
        onChange={(updated) => {
          setItem(updated);
          onChange(updated);
        }}
      />
    );
  };

  // Convenience helper: switch component into edit mode and return the name input.
  const openEditMode = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByTestId('editable-item-row__display'));
    return screen.findByTestId('editable-item-row__input-name');
  };

  it('should render display mode by default and switch to edit mode on click', async () => {
    // Arrange
    render(<EditableItemRow item={defaultItem} onChange={jest.fn()} onDelete={jest.fn()} />);

    // Assert: display mode by default
    expect(screen.getByTestId('editable-item-row__display-name')).toHaveTextContent('Banana');
    expect(screen.getByTestId('editable-item-row__display-quantity')).toHaveTextContent('2');
    expect(screen.getByTestId('editable-item-row__display-price')).toHaveTextContent('$3.00');

    // Act
    const user = userEvent.setup();
    await user.click(screen.getByTestId('editable-item-row__display'));

    // Assert: switched to edit mode
    expect(screen.getByTestId('editable-item-row__input-name')).toBeInTheDocument();
  });

  it('should render edit mode when the item is new', () => {
    // Arrange
    render(
      <EditableItemRow
        item={{ ...defaultItem, name: '' }}
        isNew
        onChange={jest.fn()}
        onDelete={jest.fn()}
        onDone={jest.fn()}
      />
    );

    // Assert
    expect(screen.getByTestId('editable-item-row__input-name')).toBeInTheDocument();
    expect(screen.getByTestId('editable-item-row__btn-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('editable-item-row__btn-done')).toBeInTheDocument();
  });

  it('should call onChange when text fields are updated', async () => {
    // Arrange
    const onChangeMock = jest.fn();
    render(
      <ControlledEditableItemRow
        initialItem={defaultItem}
        onChange={onChangeMock}
        onDelete={jest.fn()}
      />
    );

    // Act
    const user = userEvent.setup();
    const nameInput = (await openEditMode(user)) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'Apple');

    // Assert
    await waitFor(() =>
      expect(onChangeMock).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Apple' }))
    );
    expect(nameInput).toHaveValue('Apple');
  });

  it('should parse numeric updates for quantity and price', async () => {
    // Arrange
    const onChangeMock = jest.fn();
    render(
      <ControlledEditableItemRow
        initialItem={defaultItem}
        onChange={onChangeMock}
        onDelete={jest.fn()}
      />
    );

    // Act
    const user = userEvent.setup();
    await openEditMode(user);
    const quantityInput = screen.getByTestId('editable-item-row__input-quantity') as HTMLInputElement;
    await user.clear(quantityInput);
    await user.type(quantityInput, '5');
    const priceInput = screen.getByTestId('editable-item-row__input-price') as HTMLInputElement;
    await user.clear(priceInput);
    await user.type(priceInput, '2.75');

    // Assert
    await waitFor(() =>
      expect(onChangeMock).toHaveBeenCalledWith(expect.objectContaining({ quantity: 5 }))
    );
    await waitFor(() =>
      expect(onChangeMock).toHaveBeenLastCalledWith(expect.objectContaining({ price: 13.75 }))
    );
    expect(quantityInput).toHaveValue(5);
    expect(priceInput).toHaveValue(2.75);
  });

  it('should allow editing item total and adjust unit price accordingly', async () => {
    // Arrange
    const onChangeMock = jest.fn();
    render(
      <ControlledEditableItemRow
        initialItem={defaultItem}
        onChange={onChangeMock}
        onDelete={jest.fn()}
      />
    );

    // Act
    const user = userEvent.setup();
    await openEditMode(user);
    const totalInput = screen.getByTestId('editable-item-row__input-total') as HTMLInputElement;
    await user.clear(totalInput);
   await user.type(totalInput, '10');

    // Assert
    await waitFor(() =>
      expect(onChangeMock).toHaveBeenLastCalledWith(expect.objectContaining({ price: 10 }))
    );
    expect(totalInput).toHaveValue(10);
    expect(screen.getByTestId('editable-item-row__input-price')).toHaveValue(5);
  });

  it('should fallback to quantity 1 when deriving totals for items without quantity', async () => {
    // Arrange
    const onChangeMock = jest.fn();
    const itemWithoutQuantity: ReceiptItem = {
      ...defaultItem,
      quantity: undefined,
      price: 4,
    };

    render(
      <ControlledEditableItemRow
        initialItem={itemWithoutQuantity}
        onChange={onChangeMock}
        onDelete={jest.fn()}
      />
    );

    const user = userEvent.setup();
    const nameInput = (await openEditMode(user)) as HTMLInputElement;
    expect(nameInput).toHaveValue('Banana');

    const lineTotalInput = screen.getByTestId('editable-item-row__input-total') as HTMLInputElement;
    await user.clear(lineTotalInput);
    await user.type(lineTotalInput, '12');

    await waitFor(() =>
      expect(onChangeMock).toHaveBeenLastCalledWith(expect.objectContaining({ price: 12 }))
    );
    expect(lineTotalInput).toHaveValue(12);

    const unitPriceInput = screen.getByTestId('editable-item-row__input-price') as HTMLInputElement;
    await user.clear(unitPriceInput);
    await user.type(unitPriceInput, '7.5');

    await waitFor(() =>
      expect(onChangeMock).toHaveBeenLastCalledWith(expect.objectContaining({ price: 7.5 }))
    );
    expect(unitPriceInput).toHaveValue(7.5);
  });

  it('should call onDone with done for a valid new item', async () => {
    // Arrange
    const onDoneMock = jest.fn();
    const validItem = { name: 'Bread', quantity: 1, price: 1, category: 'Drink', receiptId: 'r2' };
    render(
      <EditableItemRow
        item={validItem}
        isNew
        onChange={jest.fn()}
        onDelete={jest.fn()}
        onDone={onDoneMock}
      />
    );

    // Act
    const user = userEvent.setup();
    await user.click(screen.getByTestId('editable-item-row__btn-done'));

    // Assert
    expect(onDoneMock).toHaveBeenCalledWith('done');
  });

  it('should show delete confirmation and call onDelete when confirmed', async () => {
    // Arrange
    const onDeleteMock = jest.fn();
    render(<EditableItemRow item={defaultItem} onChange={jest.fn()} onDelete={onDeleteMock} />);

    // Act
    const user = userEvent.setup();
    await user.click(screen.getByTestId('editable-item-row__display'));
    await user.click(screen.getByTestId('editable-item-row__btn-delete'));

    // Assert: confirmation visible
    expect(screen.getByTestId('editable-item-row__confirm-overlay')).toBeInTheDocument();

    // Act: confirm deletion
    await user.click(screen.getByTestId('editable-item-row__confirm-confirm'));

    // Assert: deletion callback fired
    await waitFor(() => {
      expect(onDeleteMock).toHaveBeenCalled();
    });
  });

  it('should cancel delete confirmation when cancel is clicked', async () => {
    // Arrange
    render(<EditableItemRow item={defaultItem} onChange={jest.fn()} onDelete={jest.fn()} />);

    // Act
    const user = userEvent.setup();
    await user.click(screen.getByTestId('editable-item-row__display'));
    await user.click(screen.getByTestId('editable-item-row__btn-delete'));

    // Assert: confirmation visible
    expect(screen.getByTestId('editable-item-row__confirm-overlay')).toBeInTheDocument();

    // Act: cancel confirmation
    await user.click(screen.getByTestId('editable-item-row__confirm-cancel'));

    // Assert: confirmation dismissed
    expect(screen.queryByTestId('editable-item-row__confirm-overlay')).not.toBeInTheDocument();
  });

  it('should call onDone with cancel when cancelling a new item', async () => {
    // Arrange
    const onDoneMock = jest.fn();
    render(
      <EditableItemRow
        item={{ ...defaultItem, name: '' }}
        isNew
        onChange={jest.fn()}
        onDelete={jest.fn()}
        onDone={onDoneMock}
      />
    );

    // Act
    const user = userEvent.setup();
    await user.click(screen.getByTestId('editable-item-row__btn-cancel'));

    // Assert
    expect(onDoneMock).toHaveBeenCalledWith('cancel');
  });

  it('should disable the done button for invalid items and enable it for valid ones', async () => {
    // Arrange
    render(
      <ControlledEditableItemRow
        initialItem={defaultItem}
        onDelete={jest.fn()}
        onDone={jest.fn()}
      />
    );

    // Act: enter edit mode
    const user = userEvent.setup();
    const nameInput = (await openEditMode(user)) as HTMLInputElement;

    // Assert: enabled initially
    const doneButton = screen.getByTestId('editable-item-row__btn-done');
    expect(doneButton).not.toBeDisabled();

    // Act: make invalid
    await user.clear(nameInput);
    await user.type(nameInput, ' ');

    // Assert: disabled when invalid
    await waitFor(() => expect(doneButton).toBeDisabled());

    // Act: fix validation
    await user.clear(nameInput);
    await user.type(nameInput, 'Rice');

    // Assert: enabled again when valid
    await waitFor(() => expect(doneButton).not.toBeDisabled());
  });

  it('should update category selection through the dropdown', async () => {
    // Arrange
    const onChangeMock = jest.fn();
    render(
      <ControlledEditableItemRow
        initialItem={defaultItem}
        onChange={onChangeMock}
        onDelete={jest.fn()}
      />
    );

    // Act
    const user = userEvent.setup();
    await openEditMode(user);
    const select = screen.getByTestId('editable-item-row__select-category') as HTMLSelectElement;
    const options = Array.from(select.options);
    const nextOption = options.find((option) => option.value !== select.value) ?? options[0];
    await user.selectOptions(select, nextOption);

    // Assert
    expect(onChangeMock).toHaveBeenCalledWith(expect.objectContaining({ category: nextOption.value }));
  });

  it('should return to display mode after saving a valid edit', async () => {
    // Arrange
    render(<EditableItemRow item={defaultItem} onChange={jest.fn()} onDelete={jest.fn()} />);

    // Act
    const user = userEvent.setup();
    await user.click(screen.getByTestId('editable-item-row__display'));
    await user.click(screen.getByTestId('editable-item-row__btn-done'));

    // Assert
    expect(screen.getByTestId('editable-item-row__display-name')).toHaveTextContent('Banana');
    expect(screen.queryByTestId('editable-item-row__input-name')).not.toBeInTheDocument();
  });

  it('should render fallback values for invalid price and quantity in display mode', () => {
    // Arrange
    const invalidItem: ReceiptItem = {
      ...defaultItem,
      price: Number.NaN,
      quantity: undefined,
    };

    render(<EditableItemRow item={invalidItem} onChange={jest.fn()} onDelete={jest.fn()} />);

    // Assert
    expect(screen.getByTestId('editable-item-row__display-price')).toHaveTextContent('$0.00');
    expect(screen.getByTestId('editable-item-row__display-quantity')).toHaveTextContent('1');
  });

  it('should handle missing category with empty icon and select value', async () => {
    // Arrange
    const itemWithoutCategory: ReceiptItem = {
      ...defaultItem,
      category: undefined,
    };

    render(<EditableItemRow item={itemWithoutCategory} onChange={jest.fn()} onDelete={jest.fn()} />);

    // Assert display fallback icon
    expect(screen.getByTestId('editable-item-row__display-icon')).toBeEmptyDOMElement();

    // Act: open edit mode and check select value fallback
    const user = userEvent.setup();
    await user.click(screen.getByTestId('editable-item-row__display'));
    const select = await screen.findByTestId('editable-item-row__select-category');

    expect(select.dataset.currentValue).toBe('');
  });

  it('should enter edit mode when pressing keyboard shortcuts in display mode', async () => {
    // Arrange
    render(<EditableItemRow item={defaultItem} onChange={jest.fn()} onDelete={jest.fn()} />);
    const display = screen.getByTestId('editable-item-row__display');
    const user = userEvent.setup();

    // Act: press Enter
    display.focus();
    await user.keyboard('{Enter}');

    // Assert: switched to edit mode
    expect(screen.getByTestId('editable-item-row__input-name')).toBeInTheDocument();

    // Cleanup back to display mode for Space test
    await user.click(screen.getByTestId('editable-item-row__btn-done'));
    await waitFor(() => expect(screen.queryByTestId('editable-item-row__input-name')).not.toBeInTheDocument());

    // Act: press Space
    const displayAfterDone = screen.getByTestId('editable-item-row__display');
    displayAfterDone.focus();
    await user.keyboard(' ');

    // Assert again
    await waitFor(() =>
      expect(screen.getByTestId('editable-item-row__input-name')).toBeInTheDocument()
    );
  });
});
