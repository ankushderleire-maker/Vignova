/**
 * Adzuna API Service
 * Handles job search queries, country code mapping, and in-memory caching.
 */

// --- TYPES ---

export interface AdzunaJob {
    title: string;
    company: string;
    location: string;
    salary_min: number | null;
    salary_max: number | null;
    redirect_url: string;
    description: string;
}

interface CacheEntry {
    data: AdzunaJob[];
    timestamp: number;
}

// --- CONFIG ---

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || "";
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || "";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESULTS_PER_PAGE = 20;

// In-memory cache: userId -> CacheEntry
const jobCache = new Map<string, CacheEntry>();

// --- COUNTRY CODE MAPPING ---

const COUNTRY_MAP: Record<string, string> = {
    // Full country names
    "united states": "us",
    "usa": "us",
    "united kingdom": "gb",
    "uk": "gb",
    "ireland": "ie",
    "india": "in",
    "germany": "de",
    "france": "fr",
    "canada": "ca",
    "australia": "au",
    "netherlands": "nl",
    "spain": "es",
    "italy": "it",
    "brazil": "br",
    "mexico": "mx",
    "singapore": "sg",
    "new zealand": "nz",
    "poland": "pl",
    "south africa": "za",
    "austria": "at",
    "switzerland": "ch",
    "belgium": "be",
    "sweden": "se",
    "russia": "ru",
};

// US state abbreviations
const US_STATES = new Set([
    "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga",
    "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md",
    "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
    "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc",
    "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy", "dc"
]);

/**
 * Derive ISO 2-letter country code from a location string.
 * Examples:
 *   "San Francisco, CA" → "us"
 *   "Dublin, Ireland" → "ie"
 *   "London, UK" → "gb"
 *   "Berlin, Germany" → "de"
 */
export function getCountryCode(location: string): string {
    if (!location) return "us"; // Default

    const lower = location.toLowerCase().trim();

    // 1. Check exact country name matches (last part after comma)
    const parts = lower.split(",").map((p) => p.trim());
    const lastPart = parts[parts.length - 1];

    if (COUNTRY_MAP[lastPart]) {
        return COUNTRY_MAP[lastPart];
    }

    // 2. Check if last part is a US state abbreviation (e.g., "CA", "NY")
    if (parts.length >= 2 && US_STATES.has(lastPart)) {
        return "us";
    }

    // 3. Scan the entire string for known country names
    for (const [name, code] of Object.entries(COUNTRY_MAP)) {
        if (lower.includes(name)) {
            return code;
        }
    }

    // 4. Default to US
    return "us";
}

/**
 * Extract city from location string.
 * "San Francisco, CA" → "San Francisco"
 * "Dublin, Ireland" → "Dublin"
 */
export function extractCity(location: string): string {
    if (!location) return "";
    const parts = location.split(",").map((p) => p.trim());
    return parts[0] || "";
}

/**
 * Generate an optimized Adzuna search query from profile data.
 * Format: ("Job Title") AND (Skill1 OR Skill2 OR Skill3)
 */
export function generateJobQuery(
    jobTitle: string,
    technicalSkills: string
): string {
    // Use exact job title
    let query = `"${jobTitle}"`;

    // Extract top 5 skills from comma-separated skills string
    if (technicalSkills) {
        const skills = technicalSkills
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .slice(0, 5);

        if (skills.length > 0) {
            query += ` AND (${skills.join(" OR ")})`;
        }
    }

    return query;
}

/**
 * Fetch jobs from Adzuna API.
 */
export async function searchAdzunaJobs(
    query: string,
    city: string,
    countryCode: string
): Promise<AdzunaJob[]> {
    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY || ADZUNA_APP_ID === "your_adzuna_app_id" || ADZUNA_APP_KEY === "your_adzuna_app_key") {
        throw new Error("Adzuna API credentials not configured. Please adding your real ADZUNA_APP_ID and ADZUNA_APP_KEY to the .env file.");
    }

    const params = new URLSearchParams({
        app_id: ADZUNA_APP_ID,
        app_key: ADZUNA_APP_KEY,
        what: query,
        results_per_page: String(RESULTS_PER_PAGE),
        "content-type": "application/json",
    });

    if (city) {
        params.set("where", city);
    }

    const url = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1?${params.toString()}`;

    console.log("[ADZUNA_DEBUG] Request URL:", url.replace(ADZUNA_APP_KEY, "HIDDEN").replace(ADZUNA_APP_ID, "HIDDEN_ID"));
    console.log("[ADZUNA_DEBUG] Params:", { query, city, countryCode });

    const response = await fetch(url, {
        headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("[ADZUNA_API_ERROR]", response.status, errorText);
        throw new Error(`Adzuna API returned ${response.status}`);
    }

    const data = await response.json();
    const results = data.results || [];

    return results.map((job: any) => ({
        title: job.title || "Untitled",
        company: job.company?.display_name || "Unknown Company",
        location: job.location?.display_name || "Unknown",
        salary_min: job.salary_min || null,
        salary_max: job.salary_max || null,
        redirect_url: job.redirect_url || "",
        description: job.description || "",
    }));
}

/**
 * Get cached results or fetch new ones.
 */
export async function getSmartMatchJobs(
    userId: string,
    jobTitle: string,
    technicalSkills: string,
    location: string
): Promise<AdzunaJob[]> {
    // Check cache
    const cached = jobCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
    }

    // Generate query and fetch
    const query = generateJobQuery(jobTitle, technicalSkills);
    const countryCode = getCountryCode(location);
    const city = extractCity(location);

    const jobs = await searchAdzunaJobs(query, city, countryCode);

    // Cache results
    jobCache.set(userId, { data: jobs, timestamp: Date.now() });

    return jobs;
}
