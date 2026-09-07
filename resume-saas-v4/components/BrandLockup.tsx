/**
 * The Vignova mark plus wordmark.
 *
 * This used to be copy-pasted into the sidebar, the three auth screens and the
 * interview-prep print header, each with its own negative margin to claw back
 * the padding baked into the old logo file. The current logo.png is trimmed to
 * its artwork, so the spacing is a plain gap and lives in one place.
 */
export function BrandLockup({
    size = 36,
    className = "",
    wordmarkClassName = "text-lg",
    tone = "auto",
}: {
    size?: number;
    className?: string;
    wordmarkClassName?: string;
    /**
     * "auto"    — follows the theme (--logo-gradient).
     * "on-dark" — the auth screens paint their own black background whatever
     *             the theme is, so they always need the lifted gradient.
     * "print"   — flat ink: background-clip:text does not survive printing.
     */
    tone?: "auto" | "on-dark" | "print";
}) {
    const isGradient = tone !== "print";
    const backgroundImage =
        tone === "on-dark"
            ? "linear-gradient(110deg, #a855f7 0%, #6f7bff 45%, #38b6ff 100%)"
            : "var(--logo-gradient)";

    return (
        <span className={`inline-flex items-center gap-2 ${className}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/logo.png"
                alt=""
                width={size}
                height={size}
                style={{ width: size, height: size }}
                className="object-contain shrink-0"
            />
            <span
                className={`font-extrabold tracking-[0.06em] leading-none ${
                    isGradient ? "bg-clip-text text-transparent" : "text-black"
                } ${wordmarkClassName}`}
                style={isGradient ? { backgroundImage } : undefined}
            >
                VIGNOVA
            </span>
        </span>
    );
}

export default BrandLockup;
