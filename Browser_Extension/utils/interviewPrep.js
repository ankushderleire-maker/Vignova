/**
 * Vignova Local Interview Prep Generator
 * Pure JS — generates contextual interview questions from JD + profile.
 * No external API required.
 */
const VignovaInterviewPrep = (() => {

    const BEHAVIORAL = [
        { question: "Tell me about a time you had to meet a very tight deadline. How did you handle it?", tip: "Use STAR: describe the deadline, what was at stake, the actions you took, and the outcome. Highlight time management." },
        { question: "Describe a situation where you disagreed with a team member or manager. How did you resolve it?", tip: "Show you can handle conflict constructively. Focus on communication and finding common ground, not winning the argument." },
        { question: "Give me an example of when you had to learn a new skill quickly. How did you approach it?", tip: "Interviewers love learning agility. Mention specific resources (docs, courses, mentors) and how fast you became productive." },
        { question: "Tell me about the most complex technical problem you've solved. Walk me through your approach.", tip: "Structure: problem definition → options considered → why you chose your solution → outcome + lessons learned." },
        { question: "Describe a project you're most proud of. What was your specific contribution?", tip: "Pick something with measurable impact. Use numbers — 'reduced build time by 40%' is far more compelling than 'improved performance'." },
        { question: "Tell me about a time a project failed or didn't go as planned. What did you do?", tip: "Honesty scores well. Acknowledge what went wrong, take ownership, and emphasise what you learned and changed afterwards." },
        { question: "How do you prioritise when you have multiple competing deadlines?", tip: "Show a system (e.g. impact/effort matrix, stakeholder alignment). Mention communication — proactively flagging risks impresses hiring managers." },
    ];

    const ROLE_QUESTIONS = {
        engineer: [
            { question: "How do you ensure code quality and avoid technical debt on a fast-moving team?", tip: "Mention code reviews, tests, documentation, refactoring cycles. Show you balance speed with sustainability." },
            { question: "Walk me through how you'd design a system to handle 10× the current traffic.", tip: "Cover: bottleneck identification, horizontal scaling, caching, async processing, monitoring. You don't need a perfect answer—show structured thinking." },
        ],
        "data scientist": [
            { question: "How do you decide which model to use for a new problem?", tip: "Discuss the process: understand the data and target, start simple (baseline), then iterate. Mention bias-variance, interpretability, and production constraints." },
            { question: "Tell me about a time your model performed well in evaluation but poorly in production. What happened?", tip: "This tests real-world ML experience. Cover distribution shift, feature leakage, or monitoring gaps — and what you did to fix it." },
        ],
        product: [
            { question: "How do you decide what to build next when the backlog is full and everyone wants something different?", tip: "Show a framework: impact vs effort, user research, business goals. Mention stakeholder alignment and how you say no gracefully." },
            { question: "Tell me about a product decision you made that didn't pan out. What did you learn?", tip: "Shows intellectual honesty and iteration mindset. Describe what signals you missed and how your process improved afterwards." },
        ],
        design: [
            { question: "Walk me through your process for a recent project from brief to delivery.", tip: "Cover: discovery, user research, ideation, prototyping, testing, and handoff. Mention specific tools and how you incorporated feedback." },
            { question: "How do you handle feedback from engineers that a design is too complex to build?", tip: "Show collaboration and pragmatism. Discuss negotiating constraints vs user value, and how you find creative solutions within limits." },
        ],
        default: [
            { question: "How do you stay current with trends and new developments in your field?", tip: "Mention specific sources (blogs, communities, conferences, courses). Show genuine curiosity rather than just listing names." },
            { question: "What does success look like for you in the first 90 days of this role?", tip: "Tie your answer back to the JD. Show you've thought about onboarding, quick wins, and long-term value. Ask a question back if needed." },
        ],
    };

    function detectRole(jobTitle) {
        const t = (jobTitle || "").toLowerCase();
        if (t.includes("data scientist") || t.includes("ml engineer") || t.includes("machine learning")) return "data scientist";
        if (t.includes("product manager") || t.includes("product owner")) return "product";
        if (t.includes("design") || t.includes("ux") || t.includes("ui")) return "design";
        if (t.includes("engineer") || t.includes("developer") || t.includes("software") || t.includes("backend") || t.includes("frontend") || t.includes("fullstack")) return "engineer";
        return "default";
    }

    /**
     * Generate interview questions for a given job.
     * @param {string} jobTitle
     * @param {string} company
     * @param {string} jdText
     * @param {object|null} profile - cached vignova_agent_profile
     * @returns {Array<{question: string, tip: string}>}
     */
    function generate(jobTitle, company, jdText, profile) {
        const questions = [];

        // 1. Opener — always first
        questions.push({
            question: `Tell me about yourself and why you're excited about this ${jobTitle || "role"}${company ? ` at ${company}` : ""}.`,
            tip: "Structure: current role → 2–3 most relevant experiences → why THIS company and role specifically. Keep it under 2 minutes.",
        });

        // 2. Skill-based questions from JD keywords
        if (jdText && typeof VignovaLocalScorer !== "undefined") {
            try {
                const result = VignovaLocalScorer.score(jdText, profile);
                const matched = (result.breakdown?.matching_keywords || []).slice(0, 3);
                const missing = (result.breakdown?.missing_keywords || []).slice(0, 2);

                for (const skill of matched.slice(0, 2)) {
                    questions.push({
                        question: `Can you walk me through a specific project where you used ${skill}? What was the outcome?`,
                        tip: `Use the STAR method (Situation, Task, Action, Result). Try to quantify the impact — numbers make answers memorable.`,
                    });
                }

                if (missing.length > 0) {
                    questions.push({
                        question: `This role requires ${missing[0]}. How would you rate your experience with it, and how would you get up to speed?`,
                        tip: "Be honest — interviewers respect self-awareness. Show learning agility: mention similar skills you've picked up quickly before.",
                    });
                }
            } catch (_) {
                // localScorer not available — skip skill questions
            }
        }

        // 3. Role-specific questions
        const roleKey = detectRole(jobTitle);
        const roleQs = ROLE_QUESTIONS[roleKey] || ROLE_QUESTIONS.default;
        questions.push(...roleQs.slice(0, 2));

        // 4. Behavioral questions (fill to 7 total)
        const shuffled = [...BEHAVIORAL].sort(() => Math.random() - 0.5);
        for (const q of shuffled) {
            if (questions.length >= 7) break;
            questions.push(q);
        }

        // 5. Closing — always last
        questions.push({
            question: `Do you have any questions for us about the ${jobTitle || "role"} or the team${company ? ` at ${company}` : ""}?`,
            tip: "Always have 2–3 prepared. Good ones: 'What does success look like in 6 months?', 'What's the biggest challenge the team is facing right now?', 'How does the team handle disagreements?'",
        });

        return questions.slice(0, 8);
    }

    return { generate };
})();
