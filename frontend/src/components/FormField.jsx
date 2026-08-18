import { useId } from 'react'

/**
 * A labelled input with inline validation messaging.
 *
 * Accessibility is the reason this exists as a component rather than markup repeated in
 * every form: the label is bound to the control, the error is linked through
 * aria-describedby, and aria-invalid marks the field so a screen reader announces the
 * problem instead of the user discovering it only when submit silently fails.
 *
 * Colour is never the only signal — an invalid field also gets an explicit message.
 */
export default function FormField({
    label,
    name,
    type = 'text',
    error,
    hint,
    required = false,
    options,              // present => render a <select>
    rows,                 // present => render a <textarea>
    className = '',       // applied to the control
    wrapperClassName = '', // applied to the .form-group wrapper, for grid spans
    ...inputProps
}) {
    const reactId = useId()
    const fieldId = `${name}-${reactId}`
    const errorId = `${fieldId}-error`
    const hintId = `${fieldId}-hint`

    const describedBy = [error ? errorId : null, hint ? hintId : null]
        .filter(Boolean).join(' ') || undefined

    const shared = {
        id: fieldId,
        name,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        className: `input ${error ? 'input-error' : ''} ${className}`.trim(),
        ...inputProps,
    }

    return (
        <div className={`form-group ${wrapperClassName}`.trim()}>
            <label htmlFor={fieldId}>
                {label}
                {required && <span className="field-required" aria-hidden="true"> *</span>}
                {required && <span className="sr-only"> (required)</span>}
            </label>

            {options ? (
                <select {...shared}>
                    {options.map(option => (
                        typeof option === 'string'
                            ? <option key={option} value={option}>{option}</option>
                            : <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            ) : rows ? (
                <textarea {...shared} rows={rows} />
            ) : (
                <input {...shared} type={type} />
            )}

            {hint && !error && <p id={hintId} className="field-hint">{hint}</p>}

            {/* aria-live so the message is announced when it appears after a blur. */}
            {error && (
                <p id={errorId} className="field-error" role="alert" aria-live="polite">
                    {error}
                </p>
            )}
        </div>
    )
}
