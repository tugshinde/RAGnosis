/**
 * Field validation rules, kept in one place so every form agrees on what "valid" means.
 *
 * These run in the browser for fast feedback only. The API validates the same fields
 * independently — anyone can skip this file with a direct request, so it is a convenience,
 * never a control.
 *
 * Each validator returns an error string, or null when the value is acceptable.
 */

// Indian mobile numbering: ten digits, and the leading digit is always 6-9.
export const MOBILE_PATTERN = /^[6-9]\d{9}$/

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
export const BLOOD_GROUP_OPTIONS = BLOOD_GROUPS

export const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say']

const isBlank = (value) => value === null || value === undefined || String(value).trim() === ''

/** Wraps a validator so an empty value passes — for genuinely optional fields. */
const optional = (validate) => (value) => (isBlank(value) ? null : validate(value))

export const required = (label) => (value) =>
    isBlank(value) ? `${label} is required.` : null

export const validateName = (value) => {
    if (isBlank(value)) return 'Full name is required.'
    const name = String(value).trim()
    if (name.length < 2) return 'Please enter at least 2 characters.'
    if (name.length > 120) return 'Please keep this under 120 characters.'
    // Allows accents, apostrophes and hyphens: O'Neill, Jean-Luc, Ravi Kumār.
    if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(name)) return 'Use letters, spaces, apostrophes and hyphens only.'
    return null
}

export const validateEmail = (value) => {
    if (isBlank(value)) return 'Email address is required.'
    const email = String(value).trim()
    if (email.length > 200) return 'Please keep this under 200 characters.'
    // Deliberately permissive: the address is confirmed by the account existing, not by a regex.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Enter a valid email address, e.g. name@example.com.'
    return null
}

export const validateMobile = (value) => {
    if (isBlank(value)) return 'Mobile number is required.'
    const mobile = String(value).trim()
    if (!/^\d+$/.test(mobile)) return 'Digits only — no spaces, +91 or dashes.'
    if (mobile.length !== 10) return `Must be exactly 10 digits (you entered ${mobile.length}).`
    if (!MOBILE_PATTERN.test(mobile)) return 'A mobile number must start with 6, 7, 8 or 9.'
    return null
}

export const validateMobileOptional = optional(validateMobile)

export const validatePassword = (value) => {
    if (isBlank(value)) return 'Password is required.'
    const password = String(value)
    // 8 is the client-side floor; the API accepts 6 so existing accounts keep working.
    if (password.length < 8) return 'Use at least 8 characters.'
    if (password.length > 128) return 'Please keep this under 128 characters.'
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Include at least one letter and one number.'
    return null
}

/** Sign-in only checks that something was typed: rules may have changed since the account was made. */
export const validatePasswordPresent = required('Password')

export const confirmPasswordMatches = (password) => (value) => {
    if (isBlank(value)) return 'Please confirm your password.'
    return value === password ? null : 'Passwords do not match.'
}

const numberInRange = (label, min, max, unit) => (value) => {
    const number = Number(value)
    if (Number.isNaN(number)) return `${label} must be a number.`
    if (number < min || number > max) return `${label} must be between ${min} and ${max}${unit ? ` ${unit}` : ''}.`
    return null
}

export const validateAge = (value) => {
    if (isBlank(value)) return 'Age is required.'
    if (!/^\d+$/.test(String(value).trim())) return 'Enter a whole number of years.'
    return numberInRange('Age', 1, 120, 'years')(value)
}

export const validateHeight = (value) => {
    if (isBlank(value)) return 'Height is required.'
    return numberInRange('Height', 20, 100, 'inches')(value)
}

export const validateWeight = optional(numberInRange('Weight', 2, 400, 'kg'))

export const validateBloodPressure = optional((value) => {
    const match = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(String(value).trim())
    if (!match) return 'Use the format systolic/diastolic, e.g. 120/80.'

    const systolic = Number(match[1])
    const diastolic = Number(match[2])
    if (systolic < 70 || systolic > 250) return 'Systolic (the first number) looks out of range.'
    if (diastolic < 40 || diastolic > 150) return 'Diastolic (the second number) looks out of range.'
    if (diastolic >= systolic) return 'Systolic must be higher than diastolic.'
    return null
})

export const validateBloodGroup = optional((value) =>
    BLOOD_GROUPS.includes(String(value).trim().toUpperCase())
        ? null
        : `Choose one of: ${BLOOD_GROUPS.join(', ')}.`)

/** Sign-in accepts either an email address or a mobile number in the same box. */
export const validateIdentifier = (value) => {
    if (isBlank(value)) return 'Enter your email or mobile number.'
    const identifier = String(value).trim()
    return /^\d+$/.test(identifier) ? validateMobile(identifier) : validateEmail(identifier)
}

/**
 * Runs a `{ field: validator }` map over a values object.
 *
 * Each validator is called as `(value, allValues)`. The second argument is what makes
 * cross-field rules possible — "confirm password matches password" cannot be expressed by
 * looking at the confirm field alone.
 *
 * @returns {{ errors: Record<string,string>, isValid: boolean }}
 */
export function validateAll(values, validators) {
    const errors = {}
    for (const [field, validate] of Object.entries(validators)) {
        const error = validate(values[field], values)
        if (error) errors[field] = error
    }
    return { errors, isValid: Object.keys(errors).length === 0 }
}
