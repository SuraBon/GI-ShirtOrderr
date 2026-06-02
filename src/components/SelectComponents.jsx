import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export function CustomSelect({
  id,
  value,
  values,
  onChange,
  placeholder = 'เลือกไซส์',
  disabled = false,
  compact = false,
  invalid = false,
  title,
  usePortal = true,
  size = 'md',
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = `${id || 'custom-select'}-menu`;

  const normalizedValues = useMemo(() => {
    return values.map((item) => {
      if (item && typeof item === 'object') {
        if (Array.isArray(item)) {
          return { value: item[0], label: item[1] || item[0] };
        }
        return { value: item.value, label: item.label || item.value };
      }
      return { value: item, label: item };
    });
  }, [values]);

  const selectedItem = normalizedValues.find((item) => item.value === value);
  const selectedLabel = selectedItem?.label || value || placeholder;

  function updateMenuPosition() {
    if (!usePortal) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 6;
    const minWidth = size === 'xs' ? 96 : size === 'sm' ? 128 : (compact ? 192 : 224);
    const menuWidth = Math.min(window.innerWidth - 16, Math.max(rect.width, minWidth));
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8);
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(256, openAbove ? spaceAbove : spaceBelow));
    setMenuStyle({
      left,
      top: openAbove ? Math.max(8, rect.top - gap - maxHeight) : rect.bottom + gap,
      width: menuWidth,
      maxHeight,
    });
  }

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const idx = normalizedValues.findIndex((i) => i.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target))
        setOpen(false);
    }
    function handleViewportChange() {
      updateMenuPosition();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open, value, normalizedValues]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, normalizedValues.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        setActiveIndex(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        setActiveIndex(normalizedValues.length - 1);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (activeIndex >= 0 && normalizedValues[activeIndex]) {
          selectValue(normalizedValues[activeIndex].value);
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, normalizedValues, activeIndex, value]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const items = menuRef.current?.querySelectorAll('[role="option"]');
    items?.[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  function selectValue(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  const menuContent = (
    <div
      role="listbox"
      aria-labelledby={id}
      aria-activedescendant={
        activeIndex >= 0 ? `${id || 'custom-select'}-option-${activeIndex}` : undefined
      }
      className="grid gap-0.5"
    >
      {normalizedValues.map((item, index) => {
        const selected = item.value === value;
        const highlighted = index === activeIndex;
        return (
          <button
            id={`${id || 'custom-select'}-option-${index}`}
            key={`${item.value}-${index}`}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => {
              setActiveIndex(index);
              selectValue(item.value);
            }}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-md text-left font-semibold text-neutral-900 transition',
              size === 'xs'
                ? 'min-h-7 px-2 text-[11px]'
                : size === 'sm'
                ? 'min-h-8 px-2.5 text-xs'
                : 'min-h-9 px-3 text-sm',
              highlighted ? 'bg-neutral-100' : 'hover:bg-neutral-100',
              selected && 'bg-primary-600 text-white hover:bg-primary-700'
            )}
          >
            <span className="min-w-0 truncate">{item.label || placeholder}</span>
            {selected && <Check className="size-4 shrink-0" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={rootRef} className="relative grid gap-1.5">
      <button
        id={id}
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={title}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border bg-white text-left font-bold text-neutral-900 outline-none transition disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500',
          invalid
            ? 'border-error focus:border-error focus:ring-2 focus:ring-error/15'
            : 'border-neutral-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-400/15',
          size === 'xs'
            ? 'h-7 px-1.5 text-xs rounded-md'
            : size === 'sm'
            ? 'h-8 px-2 text-xs rounded-md'
            : compact
            ? 'h-11 px-3 text-sm'
            : 'h-11 px-3.5 text-sm sm:text-base'
        )}
      >
        <span className={cn('min-w-0 truncate', !value && 'text-neutral-500')}>
          {selectedLabel}
        </span>
        <ChevronDown
          className={cn(
            'shrink-0 text-neutral-600 transition',
            size === 'xs' || size === 'sm' ? 'size-3.5' : 'size-4',
            open && 'rotate-180'
          )}
        />
      </button>

      {open &&
        (usePortal ? (
          menuStyle &&
          createPortal(
            <div
              ref={menuRef}
              id={menuId}
              className="fixed z-[9999] overflow-hidden rounded-lg border border-neutral-300 bg-white p-1 shadow-lg"
              style={{ left: menuStyle.left, top: menuStyle.top, width: menuStyle.width }}
            >
              <div
                className="scrollbar-thin overflow-y-auto"
                style={{ maxHeight: menuStyle.maxHeight }}
              >
                {menuContent}
              </div>
            </div>,
            document.body
          )
        ) : (
          <div
            ref={menuRef}
            id={menuId}
            className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-neutral-300 bg-white p-1 shadow-lg"
            style={{ top: '100%' }}
          >
            <div
              className="scrollbar-thin overflow-y-auto max-h-[224px]"
            >
              {menuContent}
            </div>
          </div>
        ))}
    </div>
  );
}

export function Select(props) {
  return <CustomSelect {...props} />;
}

export function GridSelect(props) {
  return <CustomSelect {...props} />;
}
