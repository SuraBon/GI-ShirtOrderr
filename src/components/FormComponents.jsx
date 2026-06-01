import React from 'react';
import { cn } from '../lib/utils';

export function Field({ label, children, required = false, hint, error }) {
  return (
    <div className="flex flex-col gap-1.5 sm:gap-2">
      <span className="text-xs font-bold text-neutral-700 sm:text-sm">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </span>
      {children}
      {error && <p className="text-xs font-bold text-error">{error}</p>}
      {hint && !error && <p className="text-xs font-semibold text-neutral-500">{hint}</p>}
    </div>
  );
}

export const TextInput = React.forwardRef(function TextInput(
  {
    id,
    value,
    onChange,
    placeholder,
    inputMode,
    type = 'text',
    pattern,
    autoCapitalize,
    disabled = false,
    maxLength,
    invalid = false,
    title,
  },
  ref
) {
  return (
    <input
      ref={ref}
      id={id}
      type={type}
      value={value}
      inputMode={inputMode}
      pattern={pattern}
      autoCapitalize={autoCapitalize}
      maxLength={maxLength}
      placeholder={placeholder}
      disabled={disabled}
      title={title}
      onChange={(event) => onChange(event.target.value)}
      className={cn('form-input', invalid && 'form-input-error')}
    />
  );
});

export function MonthInput({ value, onChange }) {
  return (
    <input
      type="month"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="form-input"
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 6,
  disabled = false,
  invalid = false,
  title,
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      title={title}
      onChange={(event) => onChange(event.target.value)}
      className={cn('form-textarea', invalid && 'form-input-error')}
    />
  );
}

export function GridInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  pattern,
  autoCapitalize,
  disabled = false,
  invalid = false,
  className,
  title,
  ...rest
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      pattern={pattern}
      autoCapitalize={autoCapitalize}
      title={title}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      {...rest}
      className={cn(
        'h-11 w-full rounded-lg border bg-white px-3 text-neutral-900 outline-none transition',
        invalid
          ? 'border-error focus:border-error focus:ring-error/15'
          : 'border-neutral-300 focus:border-primary-600 focus:ring-primary-400/15',
        disabled && 'bg-neutral-100 text-neutral-500 cursor-not-allowed',
        className
      )}
    />
  );
}
