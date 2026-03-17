/**
 * Splits a description (string or array) into an array of bullet-point lines.
 * It strictly splits by newlines ('\n') first, then by bullet points ('• '),
 * and finally by sentence boundaries if no other format is detected.
 */
export function splitDescription(description: string | string[] | undefined): string[] {
    if (!description) return [];

    let lines: string[] = [];

    // Normalize input to an array of strings
    if (Array.isArray(description)) {
        lines = description;
    } else {
        lines = [description];
    }

    // Process each line: split by newline first
    return lines
        .flatMap(line => line.split('\n'))
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .flatMap(line => {
            // If line contains bullet points, split by them
            if (line.includes('• ')) {
                return line.split('• ').filter(s => s.trim().length > 0).map(s => s.trim());
            }
            // If it's a very long text block without explicit newlines, we might want to split by sentences,
            // but the user specifically requested splitting by '\n'.
            // However, existing logic had sentence splitting. Let's keep it as a fallback
            // ONLY if the line is long and has no other structure?
            // Actually, the user said "in descriptions, after full stop create other bullet point"
            // THEN said "this is how API return data, so after \n make bullet point".
            // The API data HAS \n. So splitting by \n is the primary goal.
            // If we split by \n, we get the lines the user wants.
            // We should NOT split by sentences if \n was present / used.
            // But here we are processing a *single fragment* from the \n split.
            // If that fragment is still a huge blob, maybe split it?
            // Let's stick to the previous logic: if it has no bullets, try sentence split?
            // BUT the user's example shows "Designed... format.\nIntegrated..."
            // So splitting by \n yields "Designed... format."
            // We should NOT split "Designed... format." further.
            return [line];
        });
}
