/**
 * What each plan includes and what each metered action costs.
 *
 * This module has no imports, so the pricing page, the checkout summary and
 * the routes that charge all read the same table: the price a user is shown is
 * the price the route takes. The defaults are shared the same way. The seed
 * script, the admin "Seed Default Plans" button and every fallback used to keep
 * their own hand-copied list, and they had drifted: the admin button was still
 * writing "40 resumes/month" and a Free plan without the extension long after
 * the rest of the app had moved to credit buckets.
 *
 * Live allowances come from plan_configs through lib/planLimits.ts. The numbers
 * in DEFAULT_PLANS are only what a fresh database starts with.
 */

/**
 * The metered allowances. Each is its own integer balance, which is what lets a
 * cover letter cost less than a tailored resume without fractional credits.
 */
export const BUCKETS = ["tailoring", "writing", "interview"] as const;
export type Bucket = (typeof BUCKETS)[number];

export function isBucket(value: string): value is Bucket {
    return (BUCKETS as readonly string[]).includes(value);
}

/** What each bucket is called where a user can see it. */
export const BUCKET_LABELS: Record<Bucket, string> = {
    tailoring: "Tailoring credits",
    writing: "Writing credits",
    interview: "Interview credits",
};

/** What spends from each bucket, for the usage screen and upgrade prompts. */
export const BUCKET_DESCRIPTIONS: Record<Bucket, string> = {
    tailoring: "Tailored resumes and AI ATS insights",
    writing: "Cover letters, application emails, LinkedIn and Naukri optimization and recruiter messages",
    interview: "AI-written interview question sets",
};

/** Stored as -1 in plan_configs; spent against FAIR_USE_CEILING in lib/planLimits.ts. */
export const UNLIMITED = -1;

export type CreditCost = Partial<Record<Bucket, number>>;

/**
 * The price of every action that calls a model.
 *
 * ops/credit-metering.test.cjs runs each route and compares what it charged
 * with this table, so a route that starts spending a different bucket fails a
 * test instead of quietly disagreeing with the pricing page.
 */
export const CREDIT_COSTS = {
    tailoredResume: { tailoring: 1 },
    atsInsights: { tailoring: 1 },
    coverLetter: { writing: 1 },
    applicationEmail: { writing: 1 },
    linkedinOptimization: { writing: 1 },
    naukriOptimization: { writing: 1 },
    recruiterMessage: { writing: 1 },
    interviewQuestions: { interview: 1 },
    // Three generations priced as one resume and one piece of writing, taken
    // together or not at all.
    applicationPack: { tailoring: 1, writing: 1 },
} as const satisfies Record<string, CreditCost>;

export type CreditAction = keyof typeof CREDIT_COSTS;

/** How each action is described on the pricing page, in display order. */
export const CREDIT_ACTIONS: { action: CreditAction; label: string; detail: string }[] = [
    { action: "tailoredResume", label: "Tailored resume", detail: "Your master profile rewritten for one posting" },
    { action: "atsInsights", label: "AI ATS insights", detail: "Bullet rewrites and an action plan on top of your score" },
    { action: "coverLetter", label: "Cover letter", detail: "Written for the job you are applying to" },
    { action: "applicationEmail", label: "Application email", detail: "A short email to send with the application" },
    { action: "linkedinOptimization", label: "LinkedIn optimization", detail: "AI rewrites of your analysed profile" },
    { action: "naukriOptimization", label: "Naukri optimization", detail: "AI rewrites of the profile the extension reads from Naukri" },
    { action: "recruiterMessage", label: "Recruiter message", detail: "An outreach note, from the Chrome extension" },
    { action: "interviewQuestions", label: "Interview questions", detail: "One tailored set with answer tips" },
    { action: "applicationPack", label: "Application pack", detail: "Resume, cover letter and email in one go" },
];

/** Never metered on any plan, so the pricing page can say so plainly. */
export const FREE_ON_EVERY_PLAN = [
    "Keyword match score",
    "Job tracker and status updates",
    "Resume upload and parsing",
];

/** "1 tailoring credit", "2 writing credits", "1 tailoring + 1 writing credit". */
export function describeCost(cost: CreditCost): string {
    const spent = BUCKETS.filter((bucket) => (cost[bucket] ?? 0) > 0);
    if (spent.length === 0) return "Free";
    const parts = spent.map((bucket) => `${cost[bucket]} ${bucket}`);
    const plural = spent.length === 1 && (cost[spent[0]] ?? 0) > 1;
    return `${parts.join(" + ")} credit${plural ? "s" : ""}`;
}

/** Plans that include the paid-only features, such as AI ATS insights. */
export const PAID_PLANS: readonly string[] = ["PRO", "PREMIUM"];

export function isPaidPlan(planType?: string | null): boolean {
    return PAID_PLANS.includes(String(planType || "").toUpperCase());
}

/** A plan_configs row without the columns the database fills in. */
export type PlanConfig = {
    plan_type: string;
    name: string;
    description: string;
    monthly_price: number;
    /** Legacy single pool, superseded by the three bucket columns. */
    credits: number;
    tailoring_credits: number;
    writing_credits: number;
    interview_credits: number;
    /** Stored master profiles allowed. -1 means unlimited. */
    max_profiles: number;
    has_extension_access: boolean;
    has_multi_profile: boolean;
    has_unlimited_resumes: boolean;
    has_linkedin_optimization: boolean;
    has_interview_prep: boolean;
    resume_creation_label: string;
    ai_optimization_label: string;
    templates_label: string;
    support_label: string;
    is_popular: boolean;
};

export const DEFAULT_PLANS: PlanConfig[] = [
    {
        plan_type: "FREE",
        name: "Free",
        description: "Get started with basic features",
        monthly_price: 0,
        credits: 3,
        tailoring_credits: 3,
        writing_credits: 3,
        interview_credits: 1,
        max_profiles: 1,
        // The extension is the acquisition channel and the only daily-touch
        // surface, and a free account keeps the match score and the job
        // tracker there.
        has_extension_access: true,
        has_multi_profile: false,
        has_unlimited_resumes: false,
        has_linkedin_optimization: false,
        has_interview_prep: true,
        resume_creation_label: "3 tailored resumes/month",
        ai_optimization_label: "Keyword match score",
        templates_label: "5 templates",
        support_label: "Community",
        is_popular: false,
    },
    {
        plan_type: "PRO",
        name: "Pro",
        description: "Perfect for active job seekers",
        monthly_price: 13.99,
        credits: 50,
        tailoring_credits: 50,
        writing_credits: 100,
        interview_credits: 5,
        max_profiles: 5,
        has_extension_access: true,
        has_multi_profile: true,
        has_unlimited_resumes: false,
        has_linkedin_optimization: true,
        has_interview_prep: true,
        resume_creation_label: "50 tailored resumes/month",
        ai_optimization_label: "Advanced ATS Optimization",
        templates_label: "Premium Templates",
        support_label: "Priority Email",
        is_popular: true,
    },
    {
        plan_type: "PREMIUM",
        name: "Premium",
        description: "Unlimited power for professionals",
        monthly_price: 29.99,
        credits: UNLIMITED,
        tailoring_credits: UNLIMITED,
        writing_credits: UNLIMITED,
        interview_credits: UNLIMITED,
        max_profiles: UNLIMITED,
        has_extension_access: true,
        has_multi_profile: true,
        has_unlimited_resumes: true,
        has_linkedin_optimization: true,
        has_interview_prep: true,
        resume_creation_label: "Unlimited tailored resumes",
        ai_optimization_label: "Advanced ATS Optimization",
        templates_label: "Premium Templates",
        support_label: "24/7 Priority Email Support",
        is_popular: false,
    },
];

/** The fields of a plan the pricing UI reads. A plan_configs row satisfies it. */
export type PlanSummary = Pick<
    PlanConfig,
    | "plan_type"
    | "tailoring_credits"
    | "writing_credits"
    | "interview_credits"
    | "max_profiles"
    | "has_extension_access"
    | "has_linkedin_optimization"
    | "has_interview_prep"
    | "templates_label"
    | "support_label"
>;

export const INFINITY_SIGN = "\u221E";
export const NONE_SIGN = "\u2014";

export type AllowanceRow = {
    key: Bucket | "profiles";
    /** "50", INFINITY_SIGN or NONE_SIGN, for the number column on a pricing card. */
    amount: string;
    /** "tailoring credits / month", "Unlimited tailoring credits", "No interview credits". */
    label: string;
    /** The whole allowance as one phrase, for plain lists. */
    text: string;
    /** What the allowance pays for. */
    detail: string;
    unlimited: boolean;
    included: boolean;
};

function allowanceRow(
    key: AllowanceRow["key"],
    value: number,
    noun: string,
    detail: string,
    available = true
): AllowanceRow {
    const unlimited = value === UNLIMITED;
    if (!available || (!unlimited && value <= 0)) {
        const label = `No ${noun}`;
        return { key, amount: NONE_SIGN, label, text: label, detail, unlimited: false, included: false };
    }
    if (unlimited) {
        const label = `Unlimited ${noun}`;
        return { key, amount: INFINITY_SIGN, label, text: label, detail, unlimited: true, included: true };
    }
    const counted = value === 1 ? noun.replace(/s$/, "") : noun;
    // Profiles are kept rather than spent, so they do not refresh monthly.
    const label = key === "profiles" ? counted : `${counted} / month`;
    return { key, amount: String(value), label, text: `${value} ${label}`, detail, unlimited: false, included: true };
}

/** A plan's allowances, in the order the pricing card lists them. */
export function planAllowances(plan: PlanSummary): AllowanceRow[] {
    const writingUses = [
        "Cover letters",
        "emails",
        ...(plan.has_linkedin_optimization ? ["LinkedIn and Naukri optimization"] : []),
        "recruiter messages",
    ];
    return [
        allowanceRow(
            "tailoring",
            plan.tailoring_credits,
            "tailoring credits",
            isPaidPlan(plan.plan_type) ? "Tailored resumes and AI ATS insights" : "Tailored resumes"
        ),
        allowanceRow("writing", plan.writing_credits, "writing credits", writingUses.join(", ")),
        allowanceRow(
            "interview",
            plan.interview_credits,
            "interview credits",
            "Interview question sets",
            plan.has_interview_prep
        ),
        allowanceRow(
            "profiles",
            plan.max_profiles,
            "master profiles",
            plan.max_profiles === 1 ? "One profile to tailor from" : "Separate profiles for different roles"
        ),
    ];
}

export type FeatureRow = { label: string; included: boolean };

/** A plan's non-metered features, as the pricing card lists them. */
export function planFeatures(plan: PlanSummary): FeatureRow[] {
    const templates = plan.templates_label?.trim();
    const support = plan.support_label?.trim();
    return [
        { label: "Keyword match score and job tracker", included: true },
        { label: "Chrome extension", included: plan.has_extension_access },
        { label: "LinkedIn and Naukri profile optimization", included: plan.has_linkedin_optimization },
        { label: "AI ATS insights", included: isPaidPlan(plan.plan_type) },
        ...(templates ? [{ label: templates, included: true }] : []),
        ...(support ? [{ label: /support/i.test(support) ? support : `${support} support`, included: true }] : []),
    ];
}
