import { NextResponse } from "next/server";

/**
 * Company favicon proxy.
 *
 * Two reasons this is a route rather than pointing an <img> straight at Google:
 *
 *  1. Google answers an unknown domain with 404 *and a generic globe in the
 *     body*. A browser happily decodes that, so `onError` never fires and the
 *     card shows a meaningless globe instead of the company's initials. Here we
 *     can read the status and return a bodyless 404, which does trigger it.
 *  2. It keeps the user's job list out of Google's logs — the request now comes
 *     from the server, not from the person browsing their own tracker.
 *
 * Cached hard: a company's favicon does not change often, and every job card on
 * a page would otherwise be a separate round trip.
 */

const UPSTREAM = "https://www.google.com/s2/favicons";
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

/**
 * Hosts a `src` may point at.
 *
 * This is the whole of the SSRF defence for that parameter: an exact host
 * match against images the job boards themselves serve. Nothing here can be
 * pointed at an internal address, and no redirect is followed off it.
 */
const LOGO_HOSTS = new Set([
    "media.licdn.com",
    "media-exp1.licdn.com",
    "static.licdn.com",
    "d2q79iu7y748jz.cloudfront.net", // Indeed employer logos
    "employer-logos.indeed.com",
]);

function isAllowedLogoHost(hostname: string): boolean {
    const host = hostname.toLowerCase();
    return LOGO_HOSTS.has(host) || host.endsWith(".monster.com") || host.endsWith(".newjobs.com");
}

/** The scraped image, proxied, or null when it is not one we will fetch. */
async function fetchRemote(src: string): Promise<Response | null> {
    let url: URL;
    try {
        url = new URL(src);
    } catch {
        return null;
    }

    if (url.protocol !== "https:" || !isAllowedLogoHost(url.hostname)) return null;

    try {
        const upstream = await fetch(url.toString(), {
            // A redirect could leave the allowlist, so it is not followed.
            redirect: "error",
            signal: AbortSignal.timeout(6000),
        });

        const type = upstream.headers.get("content-type") || "";
        if (!upstream.ok || !type.startsWith("image/")) return null;

        const body = await upstream.arrayBuffer();
        if (body.byteLength < 100 || body.byteLength > 2_000_000) return null;

        return new NextResponse(body, {
            status: 200,
            headers: {
                "Content-Type": type,
                "Cache-Control": "public, max-age=604800, immutable",
            },
        });
    } catch {
        return null;
    }
}

export async function GET(req: Request) {
    const params = new URL(req.url).searchParams;

    // A logo captured from the posting is the employer's own; try it first and
    // fall through to the favicon guess when it cannot be served.
    const src = params.get("src");
    if (src) {
        const proxied = await fetchRemote(src);
        if (proxied) return proxied;
        return new NextResponse(null, { status: 404, headers: { "Cache-Control": "public, max-age=86400" } });
    }

    const domain = params.get("domain")?.toLowerCase().trim();

    // Only ever fetch something that looks like a hostname — this parameter
    // must not become a way to make the server fetch arbitrary URLs.
    if (!domain || domain.length > 100 || !DOMAIN_RE.test(domain)) {
        return new NextResponse(null, { status: 400 });
    }

    try {
        const upstream = await fetch(`${UPSTREAM}?domain=${encodeURIComponent(domain)}&sz=64`, {
            // Google 404s unknown domains but still sends the placeholder image.
            redirect: "follow",
            signal: AbortSignal.timeout(6000),
        });

        if (!upstream.ok) {
            // Bodyless, so the <img> fires onError and the initials show.
            return new NextResponse(null, {
                status: 404,
                headers: { "Cache-Control": "public, max-age=86400" },
            });
        }

        const body = await upstream.arrayBuffer();
        if (body.byteLength < 100) {
            return new NextResponse(null, { status: 404, headers: { "Cache-Control": "public, max-age=86400" } });
        }

        return new NextResponse(body, {
            status: 200,
            headers: {
                "Content-Type": upstream.headers.get("content-type") || "image/png",
                "Cache-Control": "public, max-age=604800, immutable",
            },
        });
    } catch {
        return new NextResponse(null, { status: 404 });
    }
}
