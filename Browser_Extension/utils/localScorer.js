/**
 * Vignova Local Keyword Scorer v2
 * Pure browser JS — no external API required.
 * Uses the cached user profile + a comprehensive skills taxonomy to
 * score any job description against the user's actual background.
 *
 * v2 improvements:
 *  - Weighted skill tiers (generic skills count less, specific ones more)
 *  - Role-relevance penalty when job domain ≠ profile domain
 *  - Realistic thresholds for Very High / High / Medium / Low / Very Low
 *  - Returns ALL profile keywords (matching + missing from JD)
 */

const VignovaLocalScorer = (() => {

    // ── Skill tiers ──────────────────────────────────────────────────────
    // WEIGHT_HIGH  = 3  — niche / specific technologies & frameworks
    // WEIGHT_MED   = 2  — common but meaningful technologies
    // WEIGHT_LOW   = 1  — generic / ubiquitous skills almost everyone has

    const WEIGHT_HIGH = 3;
    const WEIGHT_MED  = 2;
    const WEIGHT_LOW  = 1;

    // ── HIGH-weight skills (specific, niche technologies & frameworks) ──
    const HIGH_SKILLS = new Set([
        // Specific frameworks / runtimes
        "react native", "next.js", "nuxt.js", "vue.js", "gatsby", "svelte",
        "nestjs", "express.js", "fastapi", "django rest framework",
        "spring boot", "ruby on rails", "asp.net core", "asp.net", ".net core",
        "flutter", "xamarin",

        // ML / AI specific
        "pytorch", "tensorflow", "keras", "jax", "scikit-learn",
        "hugging face", "langchain", "llamaindex",
        "transformers", "bert", "gpt", "llama",
        "reinforcement learning", "deep learning",
        "generative ai", "large language models",
        "retrieval augmented generation", "rag",
        "computer vision", "natural language processing",
        "mlops", "model deployment", "model training",
        "feature engineering", "hyperparameter tuning",

        // Data engineering specific
        "apache spark", "apache flink", "apache beam",
        "apache airflow", "prefect", "dagster",
        "apache kafka", "apache hadoop",
        "snowflake", "bigquery", "redshift", "databricks",
        "dbt", "fivetran", "airbyte",

        // DevOps / Infra specific
        "kubernetes", "k8s", "helm", "istio",
        "terraform", "ansible", "puppet", "pulumi",
        "argo cd", "argocd", "flux",
        "cloudformation", "ecs", "eks", "aks", "gke", "fargate",
        "prometheus", "grafana", "datadog", "new relic",
        "elk stack", "splunk",
        "site reliability engineering", "sre",

        // Databases specific
        "elasticsearch", "cassandra", "cockroachdb",
        "dynamodb", "neo4j", "influxdb",
        "prisma", "sequelize", "sqlalchemy", "hibernate",

        // Security specific
        "penetration testing", "vulnerability assessment",
        "cybersecurity", "application security", "network security",
        "cloud security", "zero trust", "soc 2", "iso 27001",
        "siem", "owasp",

        // Specialised domains
        "blockchain", "web3", "defi", "smart contracts",
        "event sourcing", "cqrs", "saga pattern",
        "clean architecture", "hexagonal architecture",
        "distributed systems", "system design",

        // Testing specific tools
        "playwright", "cypress", "selenium",

        // Specific languages (niche)
        "rust", "kotlin", "swift", "scala", "clojure",
        "haskell", "elixir", "erlang", "dart",
        "objective-c", "fortran", "cobol",

        // Visualisation / BI
        "tableau", "power bi", "looker", "metabase",

        // Mobile specific
        "xcode", "android studio",
        "ios development", "android development",

        // Architecture
        "graphql", "grpc", "websocket",
        "event-driven architecture", "domain driven design", "ddd",
        "microservices", "serverless",
    ]);

    // ── MEDIUM-weight skills (common but meaningful) ─────────────────────
    const MED_SKILLS = new Set([
        // Languages (widely used but still differentiating)
        "typescript", "python", "java", "c++", "c#", "golang", "go",
        "ruby", "php", "r", "matlab",

        // Common frameworks
        "react", "angular", "vue", "django", "flask", "express",
        "spring", "laravel", "rails", ".net",
        "node.js", "redux", "mobx", "zustand",
        "bootstrap", "tailwindcss", "tailwind css",
        "sass", "scss",
        "material ui", "chakra ui", "ant design",
        "storybook", "framer motion",

        // Cloud platforms
        "aws", "azure", "gcp", "google cloud platform",
        "amazon web services", "google cloud",

        // Databases (mainstream)
        "postgresql", "mongodb", "mysql", "redis",
        "sqlite", "oracle", "mssql", "sql server",
        "firebase", "supabase",

        // DevOps mainstream
        "docker", "ci/cd", "continuous integration", "continuous deployment",
        "jenkins", "github actions", "gitlab ci",
        "lambda", "cloud functions", "azure functions",
        "nginx", "apache",
        "kafka", "rabbitmq", "sqs",
        "linux",

        // ML / Data mainstream
        "machine learning", "artificial intelligence",
        "data science", "data engineering",
        "pandas", "numpy", "scipy", "matplotlib",
        "jupyter",
        "data pipeline", "data warehouse", "data lake",
        "etl", "elt",
        "statistical analysis", "statistical modeling",
        "time series", "recommendation system",
        "data visualization", "business intelligence",

        // API
        "rest api", "restful api", "api design", "api gateway",
        "oauth2", "oauth", "jwt", "openid connect", "saml",

        // Infra
        "load balancing", "auto scaling", "high availability",
        "s3", "ec2", "rds", "cloudfront",
        "infrastructure as code", "iac",
        "devops", "devsecops",

        // Testing concepts
        "unit testing", "integration testing", "end-to-end testing",
        "test driven development", "tdd",
        "behavior driven development", "bdd",
        "jest", "mocha", "pytest", "junit",

        // Architecture concepts
        "solid principles", "design patterns",
        "scalability", "performance optimization",
        "caching", "cdn",
        "single page application", "spa",
        "progressive web app", "pwa",

        // Build tools
        "webpack", "vite", "rollup", "babel", "esbuild",

        // Specific collaboration tools
        "postman", "swagger", "openapi",

        // Security compliance
        "gdpr", "hipaa", "pci dss", "compliance",
        "encryption", "ssl", "tls",

        // Domains
        "fintech", "financial technology",
        "healthtech", "health technology",
        "e-commerce", "ecommerce",
        "saas", "b2b", "b2c",
        "payments", "banking", "insurance",

        // Data tools
        "spark",

        // Mobile
        "ios", "android",
    ]);

    // ── LOW-weight skills (generic / ubiquitous) ─────────────────────────
    const LOW_SKILLS = new Set([
        "javascript", "html", "css", "html5", "css3",
        "sql", "nosql", "bash", "shell", "powershell",
        "c", "vba", "lua", "perl",
        "git", "version control",
        "github", "gitlab", "bitbucket",
        "jira", "confluence", "notion", "linear",
        "slack", "teams",
        "agile", "scrum", "kanban", "waterfall",
        "agile methodology", "scrum methodology",
        "project management", "product management",
        "leadership", "mentoring", "coaching",
        "collaboration", "teamwork",
        "cross-functional collaboration", "stakeholder management",
        "technical leadership", "engineering leadership",
        "problem solving", "critical thinking",
        "communication skills", "presentation skills",
        "responsive design", "cross-browser compatibility",
        "figma",
        "quality assurance", "qa",
        "database design", "data modeling", "query optimization",
        "stored procedures", "indexing", "sharding", "replication",
        "orm",
        "ubuntu", "centos", "debian", "unix",
        "app store", "play store", "push notifications",
        "marketplace", "supply chain", "logistics", "real estate",
        "media streaming", "gaming",
        "memcached",
        "less",
        "traefik",
        "cloudwatch", "route53", "sns", "pubsub",
        "identity and access management", "iam", "soc",
    ]);

    // Build the full taxonomy from all tiers
    const ALL_SKILLS = new Set([...HIGH_SKILLS, ...MED_SKILLS, ...LOW_SKILLS]);
    const SORTED_SKILLS = [...ALL_SKILLS].sort((a, b) => b.length - a.length);

    function getWeight(skill) {
        if (HIGH_SKILLS.has(skill)) return WEIGHT_HIGH;
        if (MED_SKILLS.has(skill))  return WEIGHT_MED;
        if (LOW_SKILLS.has(skill))  return WEIGHT_LOW;
        return WEIGHT_MED; // default for dynamic-extracted skills
    }

    // ── Role domains — used to detect job vs profile domain mismatch ─────
    const ROLE_DOMAINS = {
        frontend: ["react", "angular", "vue", "svelte", "next.js", "nuxt.js", "gatsby", "css", "html", "tailwindcss", "bootstrap", "sass", "scss", "redux", "mobx", "webpack", "vite", "storybook", "figma", "responsive design", "framer motion", "single page application", "spa", "progressive web app", "pwa", "material ui", "chakra ui", "ant design"],
        backend: ["node.js", "express", "express.js", "django", "flask", "fastapi", "spring", "spring boot", "laravel", "rails", "ruby on rails", "nestjs", ".net", ".net core", "asp.net", "asp.net core", "graphql", "grpc", "rest api", "microservices", "api design", "api gateway"],
        data_science: ["machine learning", "deep learning", "reinforcement learning", "pytorch", "tensorflow", "keras", "scikit-learn", "pandas", "numpy", "scipy", "matplotlib", "jupyter", "data science", "statistical analysis", "statistical modeling", "computer vision", "natural language processing", "nlp", "feature engineering", "hyperparameter tuning", "r", "matlab"],
        data_engineering: ["apache spark", "apache flink", "apache beam", "apache airflow", "apache kafka", "apache hadoop", "snowflake", "bigquery", "redshift", "databricks", "dbt", "data pipeline", "data warehouse", "data lake", "etl", "elt", "spark", "data engineering", "batch processing", "stream processing"],
        devops: ["kubernetes", "docker", "terraform", "ansible", "ci/cd", "jenkins", "github actions", "gitlab ci", "helm", "istio", "prometheus", "grafana", "argo cd", "site reliability engineering", "sre", "devops", "devsecops", "infrastructure as code", "ecs", "eks", "aks", "gke", "fargate", "cloudformation"],
        mobile: ["react native", "flutter", "swift", "kotlin", "xamarin", "ios", "android", "ios development", "android development", "xcode", "android studio", "dart"],
        ai_ml: ["generative ai", "large language models", "retrieval augmented generation", "rag", "artificial intelligence", "langchain", "llamaindex", "hugging face", "transformers", "bert", "gpt", "llama", "mlops", "model deployment"],
        security: ["cybersecurity", "penetration testing", "vulnerability assessment", "application security", "network security", "cloud security", "zero trust", "soc 2", "iso 27001", "siem", "owasp"],
        blockchain: ["blockchain", "web3", "defi", "smart contracts"],
    };

    // Alias resolution
    const ALIASES = {
        "js": "javascript", "ts": "typescript", "py": "python",
        "k8s": "kubernetes", "node": "node.js", "nodejs": "node.js",
        "reactjs": "react", "react.js": "react",
        "vuejs": "vue", "vue.js": "vue",
        "nextjs": "next.js", "nuxtjs": "nuxt.js",
        "sklearn": "scikit-learn",
        "restful": "rest api", "rest": "rest api",
        "golang": "go", "genai": "generative ai",
        "llm": "large language models", "llms": "large language models",
        "nlp": "natural language processing",
        "ml": "machine learning", "ai": "artificial intelligence",
        "cv": "computer vision",
        "gcp": "google cloud platform", "aws": "amazon web services",
        "cicd": "ci/cd", "ci/cd": "ci/cd",
        "postgres": "postgresql", "mongo": "mongodb",
        "es": "elasticsearch", "drl": "deep learning",
        "rl": "reinforcement learning", "sb": "spring boot",
        "ror": "ruby on rails", "iac": "infrastructure as code",
        "sre": "site reliability engineering",
        "qa": "quality assurance",
        "tdd": "test driven development",
        "bdd": "behavior driven development",
        "e2e": "end-to-end testing",
    };

    function canonicalize(term) {
        const t = term.trim().toLowerCase();
        return ALIASES[t] || t;
    }

    // Build a safe regex for a skill term
    function skillRegex(skill) {
        const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (skill.length <= 2) {
            return new RegExp(`(?:^|[\\s,;/(\\[])${escaped}(?:[\\s,;/+)\\]]|$)`, 'i');
        }
        return new RegExp(`(?<![\\w#+.])${escaped}(?![\\w#+.])`, 'i');
    }

    /** Extract skills from any text block */
    function extractSkills(text) {
        if (!text) return new Set();
        const found = new Set();

        for (const skill of SORTED_SKILLS) {
            if (skillRegex(skill).test(text)) {
                found.add(canonicalize(skill));
            }
        }

        // Dynamic extraction: "experience with X", "knowledge of X", etc.
        const dynamicPatterns = [
            /(?:experience (?:with|in|using)|knowledge of|proficiency in|expertise in|skilled in|familiar with|hands-on (?:with|experience in|in))\s+([\w\s.#+\/-]{2,35}?)(?=\s*(?:and|,|;|\.|\n|$))/gi,
            /(?:strong background in|deep (?:understanding|knowledge) of|working knowledge of)\s+([\w\s.#+\/-]{2,35}?)(?=\s*(?:and|,|;|\.|\n|$))/gi,
        ];
        for (const pat of dynamicPatterns) {
            let m;
            while ((m = pat.exec(text)) !== null) {
                const raw = m[1].trim().toLowerCase();
                const canon = canonicalize(raw);
                if (ALL_SKILLS.has(canon) || ALL_SKILLS.has(raw)) {
                    found.add(canon);
                }
            }
        }

        return found;
    }

    /** Build a Set of all skills the user has, from every part of their profile */
    function profileSkills(profile) {
        if (!profile) return new Set();
        const s = new Set();

        const addTerm = (raw) => {
            const t = canonicalize(raw.trim());
            if (t.length > 1) s.add(t);
            if (raw.trim().toLowerCase().length > 1) s.add(raw.trim().toLowerCase());
        };

        // skills[] array (could be strings or objects)
        for (const sk of (profile.skills || [])) {
            const text = typeof sk === 'string' ? sk : (sk.name || '');
            text.split(/[,|/]/).forEach(p => addTerm(p));
        }

        // skills as object with technical/soft keys
        if (profile.skills && typeof profile.skills === 'object' && !Array.isArray(profile.skills)) {
            const combined = [
                ...(profile.skills.technical || '').split(','),
                ...(profile.skills.soft || '').split(','),
            ];
            combined.forEach(p => addTerm(p));
        }

        // Experience: description text + tech_stack
        for (const exp of (profile.experience || [])) {
            const desc = exp.description || exp.responsibilities || '';
            extractSkills(desc).forEach(sk => s.add(sk));
            const tech = exp.tech_stack || exp.technologies || '';
            tech.split(/[,|/]/).forEach(p => addTerm(p));
        }

        // Projects: tech_stack
        for (const proj of (profile.projects || [])) {
            const tech = proj.tech_stack || proj.technologies || '';
            tech.split(/[,|/]/).forEach(p => addTerm(p));
            extractSkills(proj.description || '').forEach(sk => s.add(sk));
        }

        // Certifications imply knowledge
        for (const cert of (profile.certifications || [])) {
            extractSkills(cert.name || '').forEach(sk => s.add(sk));
        }

        return s;
    }

    /** Determine which role domains a set of skills belongs to */
    function detectDomains(skillSet) {
        const domainScores = {};
        for (const [domain, keywords] of Object.entries(ROLE_DOMAINS)) {
            let count = 0;
            for (const kw of keywords) {
                if (skillSet.has(canonicalize(kw))) count++;
            }
            if (count >= 2) {
                domainScores[domain] = count;
            }
        }
        return domainScores;
    }

    /** Compute domain overlap ratio between JD and profile */
    function domainRelevanceFactor(jdSkills, userSkills) {
        const jdDomains  = detectDomains(jdSkills);
        const userDomains = detectDomains(userSkills);

        const jdDomainKeys  = Object.keys(jdDomains);
        const userDomainKeys = Object.keys(userDomains);

        if (jdDomainKeys.length === 0 || userDomainKeys.length === 0) {
            return 1.0; // can't determine — no penalty
        }

        // Count how many of the JD's detected domains overlap with the user's
        let overlap = 0;
        for (const d of jdDomainKeys) {
            if (userDomainKeys.includes(d)) overlap++;
        }

        const overlapRatio = overlap / jdDomainKeys.length;

        // If no domain overlap at all, apply a strong penalty (0.45)
        // If partial overlap, scale between 0.55 and 1.0
        if (overlapRatio === 0) return 0.45;
        if (overlapRatio >= 1) return 1.0;
        return 0.55 + (overlapRatio * 0.45);
    }

    /** Check if a JD skill is covered by the user's skill set */
    function userHasSkill(jdSkill, userSet) {
        if (userSet.has(jdSkill)) return true;
        const alias = ALIASES[jdSkill];
        if (alias && userSet.has(alias)) return true;
        // Substring match for compound terms (e.g. user has "postgresql", JD says "postgres")
        for (const us of userSet) {
            if (
                (us.length > 3 && jdSkill.includes(us)) ||
                (jdSkill.length > 3 && us.includes(jdSkill))
            ) return true;
        }
        return false;
    }

    /**
     * Main entry point.
     * @param {string}      jdText   – raw job description text
     * @param {object|null} profile  – vignova_agent_profile from chrome.storage
     * @returns {{ score, success, breakdown }}
     */
    function computeScore(jdText, profile) {
        const jdSkills  = extractSkills(jdText);
        const userSet   = profileSkills(profile);

        const matched = [];
        const missing = [];

        // Weighted scoring
        let totalWeight   = 0;
        let matchedWeight = 0;

        for (const skill of jdSkills) {
            const w = getWeight(skill);
            totalWeight += w;

            if (userHasSkill(skill, userSet)) {
                matched.push(skill);
                matchedWeight += w;
            } else {
                missing.push(skill);
            }
        }

        // Sort: shorter (more fundamental) terms first, alphabetical as tiebreaker
        const sort = arr => arr.sort((a, b) => a.length - b.length || a.localeCompare(b));
        sort(matched);
        sort(missing);

        // Base keyword score (weighted)
        let keywordScore = totalWeight === 0
            ? 0  // If no skills detected in JD, score is 0 (can't determine)
            : Math.min(Math.round((matchedWeight / totalWeight) * 100), 100);

        // Apply domain relevance penalty
        const relevanceFactor = domainRelevanceFactor(jdSkills, userSet);
        const adjustedScore = Math.round(keywordScore * relevanceFactor);

        // Semantic score = raw keyword percentage (before domain adjustment)
        // This represents "vibe & theory" — how many keywords literally match
        const semanticScore = keywordScore;

        // Final combined score uses the domain-adjusted value
        const finalScore = Math.min(adjustedScore, 100);

        return {
            score: finalScore,
            success: true,
            breakdown: {
                keyword:              keywordScore,
                semantic:             semanticScore,
                domain_relevance:     Math.round(relevanceFactor * 100),
                match_count:          matched.length,
                total_unique_jd_words: jdSkills.size,
                matching_keywords:    matched,
                missing_keywords:     missing,
            },
        };
    }

    return { score: computeScore };
})();
