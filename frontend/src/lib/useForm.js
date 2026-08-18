import { useCallback, useMemo, useState } from 'react'
import { validateAll } from './validation'

/**
 * Minimal form state helper: values, per-field errors, and which fields the user has
 * actually finished with.
 *
 * Errors are only surfaced once a field has been blurred or the form submitted, so a user
 * typing their email is not told it is invalid before they have finished typing it.
 *
 * @param {object} initialValues
 * @param {Record<string, (value: any) => string|null>} validators
 */
export function useForm(initialValues, validators = {}) {
    const [values, setValues] = useState(initialValues)
    const [touched, setTouched] = useState({})
    const [submitAttempted, setSubmitAttempted] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const { errors, isValid } = useMemo(
        () => validateAll(values, validators),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [values]
    )

    /** An error worth showing: the field is invalid *and* the user has seen it. */
    const errorFor = useCallback(
        (field) => ((touched[field] || submitAttempted) ? errors[field] : undefined),
        [errors, touched, submitAttempted]
    )

    const setValue = useCallback((field, value) => {
        setValues(prev => ({ ...prev, [field]: value }))
    }, [])

    const handleChange = useCallback((event) => {
        const { name, value, type, checked } = event.target
        setValues(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }, [])

    const handleBlur = useCallback((event) => {
        setTouched(prev => ({ ...prev, [event.target.name]: true }))
    }, [])

    const reset = useCallback((next = initialValues) => {
        setValues(next)
        setTouched({})
        setSubmitAttempted(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /**
     * Wraps a submit handler: marks the attempt, blocks invalid submissions, and manages the
     * submitting flag so the caller does not have to repeat that in every form.
     */
    const handleSubmit = useCallback((onValid) => async (event) => {
        event?.preventDefault?.()
        setSubmitAttempted(true)

        const { errors: currentErrors, isValid: currentlyValid } = validateAll(values, validators)
        if (!currentlyValid) {
            // Move focus to the first problem so keyboard and screen-reader users are not
            // left guessing which field the form is unhappy about.
            const firstField = Object.keys(currentErrors)[0]
            document.querySelector(`[name="${firstField}"]`)?.focus()
            return
        }

        setSubmitting(true)
        try {
            await onValid(values)
        } finally {
            setSubmitting(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values])

    return {
        values, errors, touched, submitting, isValid,
        errorFor, setValue, setValues, handleChange, handleBlur, handleSubmit, reset,
        /** Spread onto a FormField to wire up name/value/change/blur/error in one go. */
        fieldProps: (name) => ({
            name,
            value: values[name] ?? '',
            onChange: handleChange,
            onBlur: handleBlur,
            error: errorFor(name),
        }),
    }
}
