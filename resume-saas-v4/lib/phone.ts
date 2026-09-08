/**
 * Phone number handling for signup.
 *
 * Deliberately not a full libphonenumber-style validator: we only need to
 * store a reachable number, not prove it is dialable. Anything stricter would
 * reject valid numbers from countries whose rules we have not encoded, and a
 * signup form is the worst place to be wrong about that.
 *
 * Stored in E.164 — a leading "+" then digits — so the country code travels
 * with the number and the value means the same thing wherever it is read.
 */

/** Everything that is not a digit, dropped. */
export function digitsOnly(input: string): string {
    return String(input || "").replace(/\D/g, "");
}

/**
 * The national part, with the country's own trunk prefix removed.
 *
 * People type their number the way they say it — "07700 900123" in the UK,
 * "0912 345 6789" in India — and that leading zero is a domestic trunk code
 * that must not survive into E.164. Dropping it is safe: no country's
 * subscriber number starts with one.
 */
export function nationalDigits(input: string): string {
    return digitsOnly(input).replace(/^0+/, "");
}

/**
 * Removes a country code the user pasted in front of their number.
 *
 * The field sits beside a selector already showing "+1", so pasting
 * "+1 (775) 351-6501" would otherwise store +1177535165016 — the country code
 * twice. Only acts when the input actually announces itself as international
 * (a leading "+" or "00") and the digits really do begin with the selected
 * country's code; anything else is left exactly as typed, because a national
 * number is allowed to start with the same digits and silently eating them
 * would be worse than the problem.
 */
export function stripDialPrefix(raw: string, dial: string): string {
    const text = String(raw || "").trim();
    const prefix = digitsOnly(dial);
    if (!prefix) return digitsOnly(text);

    const international = text.startsWith("+") || /^00\d/.test(text);
    if (!international) return digitsOnly(text);

    const digits = digitsOnly(text).replace(/^00/, "");
    return digits.startsWith(prefix) ? digits.slice(prefix.length) : digits;
}

/**
 * E.164 for storage, or null when there is nothing worth storing.
 *
 * The phone is optional at signup, so an empty field is not an error — it is
 * simply absent. A number too short to be real is treated the same way rather
 * than failing the whole registration over a field nobody was required to
 * fill in.
 */
export function toE164(dial: string, input: string): string | null {
    const national = nationalDigits(input);
    if (!national) return null;

    const prefix = digitsOnly(dial);
    if (!prefix) return null;

    const full = prefix + national;
    // ITU-T E.164 caps the whole number at 15 digits; below ~7 total it is not
    // a real subscriber number anywhere.
    if (full.length < 7 || full.length > 15) return null;

    return "+" + full;
}

/** True when the field holds something we would store. */
export function isStorablePhone(dial: string, input: string): boolean {
    return toE164(dial, input) !== null;
}

/**
 * Accepts an already-normalised value from a client.
 *
 * The register route must not trust the browser to have done this, so it
 * re-derives E.164 from the raw parts; this is only for values arriving
 * already in E.164 form.
 */
export function isE164(value: unknown): value is string {
    return typeof value === "string" && /^\+[1-9]\d{6,14}$/.test(value);
}
