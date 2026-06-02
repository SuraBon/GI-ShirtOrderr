import React from 'react';
import { cn } from '../lib/utils';

export function Field({ label, children, htmlFor, required = false, hint, error }) {
  const childArray = React.Children.toArray(children);
  const firstChild = childArray[0];
  const childId = React.isValidElement(firstChild) ? firstChild.props.id : undefined;
  const fieldId = htmlFor || childId;
  const describedBy = [];

  if (hint && fieldId) {
    describedBy.push(`${fieldId}-hint`);
  }
  if (error && fieldId) {
    describedBy.push(`${fieldId}-error`);
  }

  const clonedChildren = React.Children.map(children, (child, index) => {
    if (index !== 0 || !React.isValidElement(child)) {
      return child;
    }

    const existingDescribedBy = child.props['aria-describedby'];
    const describedByValue = describedBy.length
      ? [existingDescribedBy, ...describedBy].filter(Boolean).join(' ')
      : existingDescribedBy;

    return React.cloneElement(child, {
      id: fieldId ?? child.props.id,
      'aria-describedby': describedByValue || undefined,
      'aria-invalid': error ? 'true' : child.props['aria-invalid'],
    });
  });

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={fieldId}>
        {label}
        {required && (
          <span className="text-error ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {clonedChildren}
      {error ? (
        <p className="form-error" id={fieldId ? `${fieldId}-error` : undefined}>
          {error}
        </p>
      ) : (
        hint && (
          <p className="form-hint" id={fieldId ? `${fieldId}-hint` : undefined}>
            {hint}
          </p>
        )
      )}
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
      aria-invalid={invalid ? 'true' : undefined}
      onChange={(event) => onChange(event.target.value)}
      className={cn('form-input', invalid && 'form-input-error')}
    />
  );
});

export function MonthInput({ id, value, onChange, disabled = false, invalid = false, title }) {
  return (
    <input
      id={id}
      type="month"
      value={value}
      disabled={disabled}
      title={title}
      aria-invalid={invalid ? 'true' : undefined}
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
      aria-invalid={invalid ? 'true' : undefined}
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
      aria-invalid={invalid ? 'true' : undefined}
      onChange={(event) => onChange(event.target.value)}
      {...rest}
      className={cn('form-input', invalid && 'form-input-error', className)}
    />
  );
}
