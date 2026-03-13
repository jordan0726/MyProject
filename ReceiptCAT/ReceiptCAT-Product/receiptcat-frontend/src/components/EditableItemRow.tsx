// src/components/EditableItemRow.tsx
import React, { useEffect, useState } from 'react';
import Icon from '@mdi/react';
import { mdiChevronRight } from '@mdi/js';
import { CATEGORY_ICONS } from '@/config/categoryIcons';
import { CATEGORY_LABELS, normalizeCategoryKey } from '@/types/categoryLabels';
import { ReceiptItem } from '@/types/receipt';
import { Select } from 'antd';
import 'antd/dist/reset.css'; 
import { editableItemRowStyles as s } from './Styles/EditableItemRow.styles';

type Props = {
  item: ReceiptItem;
  onChange: (updated: ReceiptItem) => void;
  onDelete: () => void;
  isNew?: boolean;
  onDone?: (mode: 'cancel' | 'done') => void;
};

// Inline form row for editing a single receipt item; toggles between read-only and edit modes.
export default function EditableItemRow({ item, onChange, onDelete, isNew=false, onDone }: Props) {
  const [isEditing, setIsEditing] = useState(isNew);   // render edit UI when new or explicitly toggled
  const [isActive, setIsActive] = useState(false);     // pressed-state feedback for Done button
  const [showConfirm, setShowConfirm] = useState(false); // delete confirmation modal visibility

  // Inputs drop to empty strings when the upstream value is NaN/undefined, so we coerce them here.
  const quantityValue: number | '' = (typeof item.quantity === 'number' && !Number.isNaN(item.quantity))
    ? item.quantity
    : '';
  const normalizedQuantity = typeof item.quantity === 'number' && !Number.isNaN(item.quantity) && item.quantity > 0
    ? item.quantity
    : undefined;
  const itemTotalValue: number | '' = (typeof item.price === 'number' && !Number.isNaN(item.price))
    ? item.price
    : '';
  const unitPriceValue: number | '' = typeof itemTotalValue === 'number'
    ? itemTotalValue / (normalizedQuantity ?? 1)
    : '';
  const normalizedCategoryKey = normalizeCategoryKey(item.category);
  const categoryValue = normalizedCategoryKey ?? (item.category ?? '');

  useEffect(() => {
    if (normalizedCategoryKey && item.category !== normalizedCategoryKey) {
      onChange({ ...item, category: normalizedCategoryKey });
    }
  }, [normalizedCategoryKey, item, onChange]);

  const isValidItem = (item: ReceiptItem): boolean => (
    item.name.trim() !== '' &&
    typeof item.quantity === 'number' && item.quantity > 0 &&
    typeof item.price === 'number' && item.price > 0 &&
    item.category?.trim() !== ''
  );

  const handleUpdate = (key: keyof ReceiptItem, value: string | number) => {
    onChange({ ...item, [key]: value });
  };

  const handleItemTotalChange = (rawValue: string) => {
    const total = rawValue === '' ? Number.NaN : Number(rawValue);
    if (Number.isNaN(total)) {
      handleUpdate('price', Number.NaN);
      return;
    }

    handleUpdate('price', total);
  };

  const handleUnitPriceChange = (rawValue: string) => {
    const unit = rawValue === '' ? Number.NaN : Number(rawValue);
    if (Number.isNaN(unit)) {
      handleUpdate('price', Number.NaN);
      return;
    }

    const qty = normalizedQuantity && normalizedQuantity > 0 ? normalizedQuantity : 1;
    handleUpdate('price', unit * qty);
  };

  if (isEditing) {
    return (
      <div style={s.container}>
        {/* Name */}
        <div style={s.fieldRow} data-testid="editable-item-row__field-name">
          <label style={s.label}>Name</label>
          <input
            type="text"
            value={item.name}
            onChange={(e) => handleUpdate('name', e.target.value)}
            placeholder='Enter item name...'
            style={s.input}
            data-testid="editable-item-row__input-name"
          />
        </div>
        {/* Quantity: typed as decimal to support tablets, guard against empty input */}
        <div style={s.fieldRow} data-testid="editable-item-row__field-quantity">
          <label style={s.label}>Quantity</label>
          <input
            type="number"
            value={quantityValue}
            onChange={(e) => {
              const nextValue = e.target.value === '' ? Number.NaN : Number(e.target.value);
              if (Number.isNaN(nextValue)) {
                handleUpdate('quantity', Number.NaN);
                return;
              }
              handleUpdate('quantity', nextValue);
            }}
            placeholder='Enter item quantity...'
            min={1}
            style={s.input}
            inputMode="decimal"
            data-testid="editable-item-row__input-quantity"
          />
        </div>
        {/* Unit Price: same empty-string guard as quantity */}
        <div style={s.fieldRow} data-testid="editable-item-row__field-price">
          <label style={{ width: 90 }}>Unit Price</label>
          <input
            type="number"
            value={unitPriceValue}
            onChange={(e) => handleUnitPriceChange(e.target.value)}
            placeholder='Enter item price...'
            style={s.input}
            inputMode="decimal"
            step="0.01"
            min={0}
            data-testid="editable-item-row__input-price"
          />
        </div>
        {/* Subtotal: editable line total for receipts lacking unit prices */}
        <div style={s.fieldRow} data-testid="editable-item-row__field-total">
          <label style={{ width: 90 }}>Subtotal</label>
          <input
            type="number"
            value={itemTotalValue}
            onChange={(e) => handleItemTotalChange(e.target.value)}
            placeholder='Enter item subtotal...'
            style={s.input}
            inputMode="decimal"
            step="0.01"
            min={0}
            data-testid="editable-item-row__input-total"
          />
        </div>
        {/* Category */}
        <div style={s.fieldRow} data-testid="editable-item-row__field-category">
          <label style={s.categoryLabel}>Category</label>
          <div style={s.categorySelectWrapper}>
            <Select
              value={categoryValue}
              onChange={(value) => handleUpdate('category', value)}
              popupMatchSelectWidth={false}
              optionFilterProp="children"
              style={s.categorySelect}
              getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
              data-testid="editable-item-row__select-category"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <Select.Option key={key} value={key}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </div>
        </div>

        <div style={s.fieldRow}>
          {/* Cancel / Delete */}
          {isNew ? (
            <button
              style={s.buttonCancel}
              onClick={() => onDone?.('cancel')}
              data-testid="editable-item-row__btn-cancel"
            >Cancel</button>
          ) : (
            <button
              style={s.buttonDelete(isValidItem(item), isActive)}
              onClick={() => setShowConfirm(true)}
              data-testid="editable-item-row__btn-delete"
            >Delete</button>
          )}
          {/* Done */}
          <button
            onClick={() => {
              if (isNew) {
                onDone?.('done');
              } else if (isValidItem(item)) setIsEditing(false);
            }}
            disabled={!isValidItem(item)}
            style={s.buttonDone(isValidItem(item), isActive)}
            onMouseDown={() => setIsActive(true)}
            onMouseUp={() => setIsActive(false)}
            data-testid="editable-item-row__btn-done"
          >
            Done
          </button>
          {showConfirm && (
            <div style={s.confirmOverlay} data-testid="editable-item-row__confirm-overlay" role="dialog" aria-modal="true">
              <div style={s.confirmBox}>
                <p style={{ marginBottom: 16 }}>
                  Do you confirm that you want to delete this item? <br />
                  Once it is deleted, it cannot be recovered.
                </p>
                <div style={s.confirmButtons}>
                  <button
                    onClick={() => setShowConfirm(false)}
                    style={s.confirmCancelBtn}
                    data-testid="editable-item-row__confirm-cancel"
                  >Cancel</button>
                  <button
                    onClick={() => { onDelete(); setShowConfirm(false); }}
                    style={s.confirmConfirmBtn}
                    data-testid="editable-item-row__confirm-confirm"
                  >Confirm</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const itemTotalNumeric = typeof item.price === 'number' && !Number.isNaN(item.price)
    ? item.price
    : 0;
  // Preserve legacy behaviour: display 1 when quantity is missing.
  const displayQuantity = (typeof item.quantity === 'number' && !Number.isNaN(item.quantity))
    ? item.quantity
    : (item.quantity ?? 1);
  const formattedItemTotal = itemTotalNumeric.toFixed(2);

  return (
    <div
      style={s.displayMode}
      onClick={() => setIsEditing(true)}
      data-testid="editable-item-row__display"
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setIsEditing(true);
        }
      }}
    >
      <div style={s.displayLeft} data-testid="editable-item-row__display-left">
        <span data-testid="editable-item-row__display-icon">
          {normalizedCategoryKey ? CATEGORY_ICONS[normalizedCategoryKey] : ''}
        </span>
        <span style={{ fontWeight: 500 }} data-testid="editable-item-row__display-name">{item.name}</span>
      </div>
      <div style={s.displayRight} data-testid="editable-item-row__display-right">
        <span data-testid="editable-item-row__display-quantity">{displayQuantity}</span>
        <span data-testid="editable-item-row__display-price">${formattedItemTotal}</span>
        <Icon path={mdiChevronRight} size={1} />
      </div>
    </div>
  );
}
