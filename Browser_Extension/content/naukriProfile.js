/**
 * Naukri profile reader.
 *
 * Naukri has no API, so on naukri.com/mnjuser/profile this reads the profile
 * off the page and sends it to Vignova, which scores it against the user's
 * Master Profile and rewrites it the way the LinkedIn Optimizer does.
 *
 * Unlike LinkedIn, Naukri's profile markup is stable: each section is a
 * widget with a fixed id (#lazyResumeHead, #lazyKeySkills, #lazyEmployment...)
 * and plain class names, so it can be read with selectors. Phone, email,
 * salary and the personal-details block are left out; the optimizer needs
 * none of them.
 */
(function () {
    "use strict";
    if (window.__vignovaNaukriProfile) return;
    window.__vignovaNaukriProfile = true;

    const PROFILE_PATH = /^\/mnjuser\/profile/;
    const DASHBOARD_URL = "https://app.vignova.io/dashboard/naukri-optimizer";
    const ACCOMPLISHMENT_KINDS = {
        onlineProfile: "onlineProfiles",
        workSample: "workSamples",
        publication: "publications",
        presentation: "presentations",
        patent: "patents",
        certifications: "certifications",
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const textOf = (el) => (el ? (el.innerText || el.textContent || "") : "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
    const one = (root, selector) => (root ? root.querySelector(selector) : null);
    const all = (root, selector) => (root ? Array.from(root.querySelectorAll(selector)) : []);
    const section = (id) => document.getElementById(id);
    const isPlaceholder = (text) => /^(add\b|-$)/i.test(text);

    /** Walks down the page so every lazy widget renders, then returns to where the user was. */
    async function loadAllSections(timeoutMs = 12000) {
        const started = Date.now();
        const startY = window.scrollY;
        const step = Math.max(300, Math.round(window.innerHeight * 0.8));
        for (let y = 0; y < document.documentElement.scrollHeight && Date.now() - started < timeoutMs; y += step) {
            window.scrollTo(0, y);
            await sleep(200);
        }
        const pending = () => all(document, '[id^="lazy"][data-loaded="false"]');
        while (pending().length && Date.now() - started < timeoutMs) await sleep(250);
        window.scrollTo(0, startY);
    }

    /** Long summaries and job profiles are cut at "Read More" until it is clicked. */
    async function expandReadMore() {
        const links = all(document, "#lazyProfileSummary a.morelink, #lazyEmployment a.morelink, #lazyProject a.morelink")
            .filter((link) => /read more/i.test(textOf(link)));
        links.forEach((link) => link.click());
        if (links.length) await sleep(500);
    }

    const withoutReadMore = (text) => text.replace(/\s*(\.\.\.)?\s*read (more|less)\s*$/i, "").trim();

    function readEmployment() {
        return all(section("lazyEmployment"), ".emp-list").map((row) => {
            const description = withoutReadMore(textOf(one(row, ".emp-desc")));
            return {
                designation: textOf(one(row, ".emp-desg")),
                company: textOf(one(row, ".emp-org")),
                employmentType: textOf(one(row, ".expType")),
                duration: textOf(one(row, ".experienceType .truncate:not(.expType)")),
                description: /^add job profile$/i.test(description) ? "" : description,
            };
        });
    }

    function readEducation() {
        return all(section("lazyEducation"), ".edu-list").map((row) => {
            const titles = all(row, ".title").map(textOf);
            const years = one(row, ".item.typ-14Regular") || one(row, ".item:last-child");
            const courseType = textOf(one(years, "span:not(.ver-line)"));
            return {
                degree: titles[0] || "",
                specialization: titles[1] || "",
                institute: textOf(one(row, ".ins")),
                duration: textOf(years).replace(courseType, "").trim(),
                courseType,
            };
        });
    }

    function readItSkills() {
        return all(section("lazyITSkills"), "li.collection")
            .map((row) => all(row, "span.col").map(textOf))
            .filter((cells) => cells[0] && !/^skills$/i.test(cells[0]))
            .map(([skills, version, lastUsed, experience]) => ({
                skills,
                version: version === "-" ? "" : version || "",
                lastUsed: lastUsed === "-" ? "" : lastUsed || "",
                experience: experience || "",
            }));
    }

    function readProjects() {
        const root = one(section("lazyProject"), ".widgetCont");
        if (!root || one(root, ".empty")) return [];
        // Entries are rows like the employment list. Their inner classes are
        // not stable across Naukri releases, so each row is read line by line.
        let rows = all(root, '[class*="proj-list"], [class*="project-list"] > *, .row');
        rows = rows.filter((row) => !rows.some((other) => other !== row && other.contains(row)));
        return rows
            .map((row) => {
                const lines = textOf(row)
                    .split("\n")
                    .map((line) => line.trim())
                    .filter((line) => line && !/OneTheme$/.test(line) && !/^(edit|read (more|less))$/i.test(line));
                const title = textOf(one(row, '[class*="title"], [class*="proj-name"]')) || lines[0] || "";
                const rest = lines.filter((line) => line !== title);
                const dateAt = rest.findIndex((line) => line.length < 80 && /\b(19|20)\d{2}\b|present|\bmonths?\b|\byears?\b/i.test(line));
                const duration = dateAt >= 0 ? rest.splice(dateAt, 1)[0] : "";
                const client = rest.length > 1 && rest[0].length < 80 ? rest.shift() : "";
                return { title, client, duration, description: withoutReadMore(rest.join("\n")) };
            })
            .filter((project) => project.title);
    }

    function readAccomplishments() {
        const result = Object.fromEntries(Object.values(ACCOMPLISHMENT_KINDS).map((kind) => [kind, []]));
        all(section("lazyAccomplishment"), ".acm-list-item").forEach((item) => {
            const kind = Array.from(item.classList)
                .map((name) => ACCOMPLISHMENT_KINDS[name.replace(/-wrapper$/, "")])
                .find(Boolean);
            if (!kind) return;
            all(item, ".df").forEach((head) => {
                const entry = head.parentElement;
                const link = one(entry, 'a[href^="http"]');
                result[kind].push({
                    title: textOf(one(head, ".hdn4, span")).replace(/\s*\w*OneTheme$/, ""),
                    url: link ? link.href : "",
                    description: all(entry, ".brkword").filter((el) => !el.classList.contains("link")).map(textOf).join(" "),
                });
            });
        });
        return result;
    }

    function readCareerProfile() {
        const fields = {};
        all(section("lazyDesiredProfile"), ".hori-list .col").forEach((col) => {
            const title = textOf(one(col, ".title"));
            const value = textOf(one(col, ".desc"));
            // Salary is not needed to optimize a profile, so it is not sent.
            if (title && value && !/salary/i.test(title)) fields[title] = value;
        });
        return fields;
    }

    function readLanguages() {
        return all(section("lazyPersonalDetail"), ".language-list li.collection:not(.head)")
            .map((row) => ({ language: textOf(one(row, ".language")), proficiency: textOf(one(row, ".proficiency")) }))
            .filter((row) => row.language);
    }

    /** "2 Years" and "6 Months" sit in sibling spans with nothing between them. */
    const spans = (el) => all(el, "span").map(textOf).filter(Boolean).join(" ") || textOf(el);

    function scrapeProfile() {
        const percent = parseInt(textOf(one(document, ".user-percentage")), 10);
        const headline = textOf(one(section("lazyResumeHead"), ".widgetCont .prefill"));
        const summary = withoutReadMore(textOf(one(section("lazyProfileSummary"), ".widgetCont .prefill")));
        return {
            source: "naukri",
            profileUrl: location.origin + location.pathname,
            name: textOf(one(document, ".hdn .fullname")),
            location: textOf(one(document, 'span.txt[name="Location"]')),
            experience: spans(one(document, 'span.txt[name="Experience"]')),
            noticePeriod: textOf(one(document, 'span.txt[name="notice period"]')),
            profileCompleteness: Number.isFinite(percent) ? percent : null,
            lastUpdated: textOf(one(document, ".mod-date-val")),
            headline: isPlaceholder(headline) ? "" : headline,
            keySkills: all(section("lazyKeySkills"), ".widgetCont .chip").map(textOf).filter(Boolean),
            employment: readEmployment(),
            education: readEducation(),
            itSkills: readItSkills(),
            projects: readProjects(),
            profileSummary: isPlaceholder(summary) ? "" : summary,
            accomplishments: readAccomplishments(),
            careerProfile: readCareerProfile(),
            languages: readLanguages(),
            resumeFileName: textOf(one(section("lazyAttachCV"), ".resume-name-inline .truncate")),
        };
    }

    // ─── On-page button ───

    let button = null;
    let toast = null;
    let busy = false;

    function ensureUi() {
        if (button && document.body.contains(button)) return;
        button = document.createElement("button");
        button.type = "button";
        button.id = "vignova-naukri-btn";
        button.className = "vg-nk-btn";
        const logo = document.createElement("img");
        logo.src = chrome.runtime.getURL("icons/icon48.png");
        logo.alt = "";
        const label = document.createElement("span");
        label.textContent = "Optimize with Vignova";
        button.append(logo, label);
        button.addEventListener("click", run);

        toast = document.createElement("div");
        toast.className = "vg-nk-toast";
        toast.setAttribute("role", "status");
        toast.hidden = true;
        document.body.append(button, toast);

        // A scan started from the Vignova dashboard runs once the page is ready.
        chrome.runtime.sendMessage({ type: "NAUKRI_SCAN_PENDING" })
            .then((reply) => {
                if (reply && reply.pending) {
                    say("Scanning your profile for Vignova\u2026");
                    setTimeout(run, 1500);
                }
            })
            .catch(() => null);
    }

    function removeUi() {
        if (button) button.remove();
        if (toast) toast.remove();
        button = null;
        toast = null;
    }

    function say(message, tone = "info", action = null) {
        if (!toast) return;
        toast.textContent = "";
        toast.className = `vg-nk-toast vg-nk-${tone}`;
        const text = document.createElement("span");
        text.textContent = message;
        toast.appendChild(text);
        if (action) {
            const link = document.createElement("button");
            link.type = "button";
            link.className = "vg-nk-action";
            link.textContent = action.label;
            link.addEventListener("click", action.onClick);
            toast.appendChild(link);
        }
        toast.hidden = false;
    }

    const openResults = (id) =>
        chrome.runtime.sendMessage({ type: "OPEN_TAB", url: `${DASHBOARD_URL}?analysis=${encodeURIComponent(id)}` }).catch(() => null);

    async function run() {
        if (busy) return;
        if (!(chrome.runtime && chrome.runtime.id)) {
            say("Vignova was updated. Reload this page and try again.", "error");
            return;
        }
        busy = true;
        button.disabled = true;
        try {
            say("Reading your Naukri profile\u2026");
            await loadAllSections();
            await expandReadMore();
            const profile = scrapeProfile();
            if (!profile.headline && !profile.keySkills.length && !profile.employment.length) {
                say("Couldn't find your profile on this page. Let it load fully, then try again.", "error");
                return;
            }

            say("Scoring it against your Master Profile\u2026");
            const reply = await chrome.runtime.sendMessage({ type: "API_NAUKRI_IMPORT", data: { profile } }).catch(() => null);
            if (!reply || !reply.success) {
                const message = reply && reply.authenticated === false
                    ? "Sign in to the Vignova extension first, then try again."
                    : (reply && (reply.error || reply.message)) || "Vignova couldn't analyze your profile. Try again in a moment.";
                say(message, "error");
                return;
            }

            const score = typeof reply.overallScore === "number" ? ` Score ${Math.round(reply.overallScore)}/100.` : "";
            if (reply.returnedToDashboard) {
                say(`Profile analyzed.${score} Your results are open in the Vignova tab.`, "success");
                return;
            }
            say(`Profile analyzed.${score}`, "success", { label: "View results", onClick: () => openResults(reply.analysisId) });
            openResults(reply.analysisId);
        } catch (error) {
            say("Something went wrong reading the profile. Reload the page and try again.", "error");
        } finally {
            busy = false;
            if (button) button.disabled = false;
        }
    }

    function sync() {
        if (PROFILE_PATH.test(location.pathname)) ensureUi();
        else removeUi();
    }

    // Naukri is a single-page app: the profile can open without a page load,
    // and a re-render can drop the button.
    let lastPath = location.pathname;
    sync();
    setInterval(() => {
        if (location.pathname !== lastPath) {
            lastPath = location.pathname;
            sync();
        } else if (PROFILE_PATH.test(lastPath) && !document.getElementById("vignova-naukri-btn")) {
            sync();
        }
    }, 1000);
})();
