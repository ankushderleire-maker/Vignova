/**
 * Copies text to the clipboard. Resolves true when it worked.
 *
 * navigator.clipboard is missing on plain http, refused in a sandboxed frame
 * and rejected when the document does not have focus, which is when the copy
 * buttons "sometimes did not work". A hidden textarea with execCommand still
 * copies in all of those, so it is the fallback rather than an alert.
 */
export async function copyText(value: unknown): Promise<boolean> {
    const text = Array.isArray(value) ? value.map((item) => String(item ?? "")).join("\n") : String(value ?? "");
    if (!text) return false;

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Refused or unfocused: fall through to the textarea.
        }
    }

    try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.top = "-1000px";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        area.setSelectionRange(0, text.length);
        const copied = document.execCommand("copy");
        document.body.removeChild(area);
        return copied;
    } catch {
        return false;
    }
}
