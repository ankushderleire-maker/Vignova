// Scraper for linkedin.com/in/* profiles

function showOverlay() {
    if (document.getElementById('vignova-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'vignova-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.color = 'white';
    overlay.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    
    overlay.innerHTML = `
        <div style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: vignova-spin 1s linear infinite;"></div>
        <h2 style="margin-top: 20px; font-size: 24px; font-weight: bold; color: white;">Vignova is analyzing your profile</h2>
        <p style="margin-top: 10px; font-size: 16px; color: #ccc;">Please do not interact or close this tab while we scroll...</p>
        <style>
            @keyframes vignova-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    `;
    document.body.appendChild(overlay);
}

function removeOverlay() {
    const overlay = document.getElementById('vignova-overlay');
    if (overlay) overlay.remove();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function smoothScrollToBottom() {
    return new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight - window.innerHeight) {
                clearInterval(timer);
                resolve();
            }
        }, 80);
        
        // Timeout just in case
        setTimeout(() => {
            clearInterval(timer);
            resolve();
        }, 8000);
    });
}

// ──────────────────────────────────────────────────────────
// Click all "see more" / "show more" buttons to expand text
// ──────────────────────────────────────────────────────────
async function clickAllSeeMore() {
    // LinkedIn uses multiple patterns for "see more" buttons
    const selectors = [
        'button.inline-show-more-text__button',           // About section see more
        'button[class*="inline-show-more-text"]',         // Any inline show more
        'a[class*="inline-show-more-text"]',              // Link-style show more
        'button[aria-label="Show more"]',                 // Generic show more
        'button[aria-label="see more"]',                  // Alternate casing
    ];
    
    let clicked = 0;
    for (const sel of selectors) {
        const buttons = document.querySelectorAll(sel);
        for (const btn of buttons) {
            try {
                // Only click if it says "see more" or "show more" (avoid "show less")
                const text = btn.innerText?.toLowerCase() || btn.getAttribute('aria-label')?.toLowerCase() || '';
                if (text.includes('more') && !text.includes('less')) {
                    btn.click();
                    clicked++;
                }
            } catch (e) {}
        }
    }
    
    if (clicked > 0) {
        console.log(`Vignova: Clicked ${clicked} "see more" buttons`);
        await sleep(800); // Wait for content to expand
    }
}

// ──────────────────────────────────────────────────────────
// Helper: safely get trimmed text from an element.
// Uses textContent as primary source to avoid SecurityError
// DOMExceptions thrown by innerText on cross-origin elements,
// then falls back to innerText for elements that need layout.
// ──────────────────────────────────────────────────────────
function getText(el) {
    if (!el) return null;
    try {
        // textContent never throws, even on sandboxed/cross-origin nodes
        const tc = el.textContent?.trim();
        if (tc) return tc;
        // innerText triggers layout — only call it when textContent was empty
        const it = el.innerText?.trim();
        return it || null;
    } catch (_) {
        return null;
    }
}

// ──────────────────────────────────────────────────────────
// Helper: safely run querySelector, returning null on error
// ──────────────────────────────────────────────────────────
function safeQuery(root, selector) {
    try {
        return (root || document).querySelector(selector);
    } catch (_) {
        return null;
    }
}

function safeQueryAll(root, selector) {
    try {
        return Array.from((root || document).querySelectorAll(selector));
    } catch (_) {
        return [];
    }
}

// ──────────────────────────────────────────────────────────
// Strategy 1: Parse LinkedIn's BigPipe JSON <code> blocks
// ──────────────────────────────────────────────────────────
function scrapeProfileFromJson() {
    try {
        const profileData = { name: "", headline: "", location: "", photoUrl: "", about: "", experience: [], education: [], skills: [] };
        
        const codeBlocks = document.querySelectorAll('code[id^="bpr-guid-"]');
        if (codeBlocks.length === 0) {
            console.log("Vignova JSON: No <code> blocks found");
            return null;
        }

        const entityMap = new Map();
        
        for (const block of codeBlocks) {
            try {
                const data = JSON.parse(block.textContent.trim());
                if (data.included && Array.isArray(data.included)) {
                    for (const entity of data.included) {
                        if (entity.entityUrn) entityMap.set(entity.entityUrn, entity);
                        else if (entity.objectUrn) entityMap.set(entity.objectUrn, entity);
                    }
                }
            } catch (e) {}
        }

        console.log("Vignova JSON: Found", entityMap.size, "entities in BigPipe data");

        // Find the profile entity matching the current URL
        let profileEntity = null;
        for (const entity of entityMap.values()) {
            if (entity.$type === "com.linkedin.voyager.dash.identity.profile.Profile" && entity.publicIdentifier) {
                if (window.location.href.includes(entity.publicIdentifier)) {
                    profileEntity = entity;
                    break;
                }
            }
        }
        
        // Fallback: any Profile entity with firstName
        if (!profileEntity) {
            for (const entity of entityMap.values()) {
                if (entity.$type === "com.linkedin.voyager.dash.identity.profile.Profile" && entity.firstName) {
                    profileEntity = entity;
                    break;
                }
            }
        }

        if (!profileEntity) {
            console.log("Vignova JSON: No profile entity found");
            return null;
        }

        console.log("Vignova JSON: Found profile entity:", profileEntity.publicIdentifier);

        profileData.name = `${profileEntity.firstName || ""} ${profileEntity.lastName || ""}`.trim();
        profileData.headline = profileEntity.headline || "";
        profileData.location = profileEntity.locationName || profileEntity.geoLocationName || "";
        profileData.about = profileEntity.summary || "";

        // Extract photo
        if (profileEntity.profilePicture?.displayImageReference?.vectorImage?.rootUrl) {
            const img = profileEntity.profilePicture.displayImageReference.vectorImage;
            const artifact = img.artifacts?.[img.artifacts.length - 1];
            if (artifact) {
                profileData.photoUrl = img.rootUrl + artifact.fileIdentifyingUrlPathSegment;
            }
        }

        try {
            const profileId = profileEntity.entityUrn?.replace('urn:li:fsd_profile:', '') || "";
            
            for (const entity of entityMap.values()) {
                // Position (Experience)
                if (entity.$type === "com.linkedin.voyager.dash.identity.profile.Position") {
                    const start = entity.dateRange?.start ? `${entity.dateRange.start.month || 1}/${entity.dateRange.start.year}` : "";
                    const end = entity.dateRange?.end ? `${entity.dateRange.end.month || 1}/${entity.dateRange.end.year}` : "Present";
                    
                    profileData.experience.push({
                        title: entity.title || "",
                        company: entity.companyName || "",
                        dateRange: start ? `${start} - ${end}` : "",
                        description: entity.description || ""
                    });
                }
                
                // Education
                if (entity.$type === "com.linkedin.voyager.dash.identity.profile.Education") {
                    profileData.education.push({
                        school: entity.schoolName || "",
                        degree: [entity.degreeName, entity.fieldOfStudy].filter(Boolean).join(", "),
                        dateRange: entity.dateRange?.start?.year 
                            ? `${entity.dateRange.start.year} - ${entity.dateRange.end?.year || "Present"}` 
                            : ""
                    });
                }

                // Skill
                if (entity.$type === "com.linkedin.voyager.dash.identity.profile.Skill") {
                    if (entity.name) profileData.skills.push(entity.name);
                }
            }
        } catch(e) { console.error("Vignova JSON: Error parsing entities", e); }

        console.log("Vignova JSON: Extracted -", 
            "Name:", profileData.name, 
            "| About:", profileData.about?.substring(0, 50) + "...",
            "| Exp:", profileData.experience.length,
            "| Edu:", profileData.education.length,
            "| Skills:", profileData.skills.length
        );

        if (!profileData.name && !profileData.headline) return null;
        return profileData;
    } catch (e) {
        console.error("Vignova JSON: Top-level scrape failed", e);
        return null;
    }
}

// ──────────────────────────────────────────────────────────
// Strategy 2: DOM-based extraction using stable selectors
// ──────────────────────────────────────────────────────────
function scrapeProfileFromDom() {
    const profileData = { name: "", headline: "", location: "", photoUrl: "", coverImageUrl: "", about: "", experience: [], education: [], skills: [] };

    // ── 1. Top Card (Intro) ──
    try {
        const topCard = safeQuery(document, 'section[data-member-id]') || document;

        profileData.name = getText(safeQuery(topCard, 'h1')) || "";
        console.log("Vignova DOM: Name =", profileData.name);

        profileData.headline = getText(safeQuery(topCard, 'div.text-body-medium.break-words'))
                            || getText(safeQuery(topCard, 'div.text-body-medium'))
                            || "";
        console.log("Vignova DOM: Headline =", profileData.headline);

        const mt2Container = safeQuery(topCard, 'div.mt2');
        if (mt2Container) {
            const locationSpans = safeQueryAll(mt2Container, 'span.text-body-small.inline.t-black--light');
            for (const span of locationSpans) {
                const t = getText(span);
                if (t && !t.toLowerCase().includes('contact')) {
                    profileData.location = t;
                    break;
                }
            }
        }
        console.log("Vignova DOM: Location =", profileData.location);

        const photoEl = safeQuery(topCard, 'img.profile-photo-edit__preview')
                      || safeQuery(document, 'img.pv-top-card-profile-picture__image')
                      || safeQuery(topCard, 'img[width="200"]');
        if (photoEl) profileData.photoUrl = photoEl.src || "";
        console.log("Vignova DOM: Photo =", profileData.photoUrl ? "Found" : "Not found");

        const coverEl = safeQuery(document, '#profile-background-image-target-image')
                     || safeQuery(document, 'img.profile-background-image__image')
                     || safeQuery(document, '.top-card-background-hero-image img');
        if (coverEl) profileData.coverImageUrl = coverEl.src || "";
        console.log("Vignova DOM: Cover Image =", profileData.coverImageUrl ? "Found" : "Not found");
    } catch (e) {
        console.error("Vignova DOM: Top card scrape error", e instanceof DOMException ? e.message : String(e));
    }

    // ── 2. About Section ──
    try {
        const aboutAnchor = safeQuery(document, '#about');
        if (aboutAnchor) {
            const aboutSection = aboutAnchor.closest('section');
            if (aboutSection) {
                const aboutTextEl = safeQuery(aboutSection, 'div[class*="inline-show-more-text"] span:not([aria-hidden="true"])')
                                 || safeQuery(aboutSection, 'div[class*="inline-show-more-text"]')
                                 || safeQuery(aboutSection, '.display-flex.ph5.pv3 span')
                                 || safeQuery(aboutSection, '.display-flex.ph5.pv3');
                if (aboutTextEl) {
                    profileData.about = getText(aboutTextEl)?.replace(/^About\s*/i, '').trim() || "";
                }
            }
        }
        console.log("Vignova DOM: About =", profileData.about ? profileData.about.substring(0, 60) + "..." : "Not found");
    } catch (e) {
        console.error("Vignova DOM: About scrape error", e instanceof DOMException ? e.message : String(e));
    }

    // ── 3. Experience Section ──
    try {
        const expAnchor = safeQuery(document, '#experience');
        if (expAnchor) {
            const expSection = expAnchor.closest('section');
            if (expSection) {
                const items = safeQueryAll(expSection, 'li.artdeco-list__item');
                console.log("Vignova DOM: Experience li items found:", items.length);
                items.forEach(item => {
                    try {
                        const entity = safeQuery(item, 'div[data-view-name="profile-component-entity"]');
                        if (!entity) return;

                        const titleEl = safeQuery(entity, '.hoverable-link-text.t-bold span')
                                     || safeQuery(entity, '.t-bold span');
                        const title = getText(titleEl);
                        if (!title) return;

                        const companyEl = safeQuery(entity, 'span.t-14.t-normal:not(.t-black--light) span');
                        const dateEl = safeQuery(entity, 'span.pvs-entity__caption-wrapper');

                        let location = "";
                        const lightSpans = safeQueryAll(entity, 'span.t-14.t-normal.t-black--light > span:not(.pvs-entity__caption-wrapper)');
                        for (const s of lightSpans) {
                            const t = getText(s);
                            if (t && !t.match(/\d{4}/)) {
                                location = t;
                                break;
                            }
                        }

                        let description = "";
                        const subComp = safeQuery(entity, '.pvs-entity__sub-components');
                        if (subComp) {
                            const descDivs = safeQueryAll(subComp, 'div[dir="ltr"]');
                            for (const div of descDivs) {
                                if (!div.closest('a')) {
                                    const span = safeQuery(div, 'span');
                                    const t = getText(span);
                                    if (t) { description = t; break; }
                                }
                            }
                        }

                        const logoEl = safeQuery(entity, 'a[data-field="experience_company_logo"] img');
                        const skillsEl = safeQuery(entity, 'a[data-field="position_contextual_skills_see_details"] strong');

                        profileData.experience.push({
                            title: title,
                            company: getText(companyEl) || "",
                            dateRange: getText(dateEl) || "",
                            location: location,
                            description: description,
                            companyLogoUrl: logoEl?.src || "",
                            associatedSkills: getText(skillsEl) || ""
                        });
                    } catch(itemErr) {
                        console.warn("Vignova DOM: Error parsing experience item", itemErr);
                    }
                });
            }
        }
        console.log("Vignova DOM: Experience extracted:", profileData.experience.length);
    } catch (e) {
        console.error("Vignova DOM: Experience scrape error", e instanceof DOMException ? e.message : String(e));
    }

    // ── 4. Education Section ──
    try {
        const eduAnchor = safeQuery(document, '#education');
        if (eduAnchor) {
            const eduSection = eduAnchor.closest('section');
            if (eduSection) {
                const items = safeQueryAll(eduSection, 'li.artdeco-list__item');
                console.log("Vignova DOM: Education items found:", items.length);
                items.forEach(item => {
                    try {
                        const entity = safeQuery(item, 'div[data-view-name="profile-component-entity"]');
                        if (!entity) return;

                        const schoolEl = safeQuery(entity, '.hoverable-link-text.t-bold span')
                                      || safeQuery(entity, '.t-bold span');
                        const school = getText(schoolEl);
                        if (!school) return;

                        const degreeEl = safeQuery(entity, 'span.t-14.t-normal:not(.t-black--light) span');
                        const dateEl = safeQuery(entity, 'span.pvs-entity__caption-wrapper');

                        const logoEl = safeQuery(entity, 'a[data-field="education_company_logo"] img')
                                    || safeQuery(entity, '.pvs-entity__image img');

                        profileData.education.push({
                            school: school,
                            degree: getText(degreeEl) || "",
                            dateRange: getText(dateEl) || "",
                            schoolLogoUrl: logoEl?.src || ""
                        });
                    } catch(itemErr) {
                        console.warn("Vignova DOM: Error parsing education item", itemErr);
                    }
                });
            }
        }
        console.log("Vignova DOM: Education extracted:", profileData.education.length);
    } catch (e) {
        console.error("Vignova DOM: Education scrape error", e instanceof DOMException ? e.message : String(e));
    }

    // ── 5. Skills Section ──
    try {
        const skillsAnchor = safeQuery(document, '#skills');
        if (skillsAnchor) {
            const skillsSection = skillsAnchor.closest('section');
            if (skillsSection) {
                const items = safeQueryAll(skillsSection, 'li.artdeco-list__item');
                console.log("Vignova DOM: Skills items found:", items.length);
                items.forEach(item => {
                    try {
                        const entity = safeQuery(item, 'div[data-view-name="profile-component-entity"]');
                        if (!entity) return;

                        const nameEl = safeQuery(entity, '.hoverable-link-text.t-bold span')
                                    || safeQuery(entity, '.t-bold span');
                        
                        const name = getText(nameEl);
                        if (name && !profileData.skills.includes(name)) {
                            profileData.skills.push(name);
                        }
                    } catch(itemErr) {}
                });
            }
        }
        console.log("Vignova DOM: Skills extracted:", profileData.skills.length);
    } catch (e) {
        console.error("Vignova DOM: Skills scrape error", e instanceof DOMException ? e.message : String(e));
    }

    // ── 6. Analytics (Private to profile owner) ──
    try {
        const insightsAnchor = safeQuery(document, '#insights');
        if (insightsAnchor) {
            const insightsSection = insightsAnchor.closest('section');
            if (insightsSection) {
                profileData.analytics = {
                    profileViews:      getText(safeQuery(insightsSection, 'a[data-field="insights_wvmp"] .t-bold span'))                  || "0",
                    postImpressions:   getText(safeQuery(insightsSection, 'a[data-field="insights_content_impressions"] .t-bold span'))   || "0",
                    searchAppearances: getText(safeQuery(insightsSection, 'a[data-field="insights_search_appearances"] .t-bold span'))    || "0",
                };
                console.log("Vignova DOM: Analytics =", profileData.analytics);
            }
        }
    } catch (e) {
        console.error("Vignova DOM: Analytics scrape error", e instanceof DOMException ? e.message : String(e));
    }
    
    return profileData;
}

// ──────────────────────────────────────────────────────────
// Main scraper: tries JSON first, then DOM, then merges
// ──────────────────────────────────────────────────────────
async function scrapeProfile() {
    try {
        console.log("Vignova: ═══════════════════════════════════════");
        console.log("Vignova: Starting LinkedIn Profile Scrape");
        console.log("Vignova: URL:", window.location.href);
        showOverlay();
        
        // Scroll the full page to trigger lazy-loaded sections
        await smoothScrollToBottom();
        await sleep(2000);
        
        // Scroll back up and wait for rendering
        window.scrollTo(0, 0);
        await sleep(1000);

        // Click all "see more" buttons to expand truncated text
        await clickAllSeeMore();

        // Try JSON extraction first (most reliable when available)
        let jsonProfile = scrapeProfileFromJson();
        
        // Always run DOM extraction too
        let domProfile = scrapeProfileFromDom();
        
        // Decide which is the primary source
        let profileData;
        
        if (jsonProfile && jsonProfile.name) {
            console.log("Vignova: Using JSON as primary source");
            profileData = jsonProfile;
            
            // Merge any missing fields from DOM
            if (domProfile) {
                if (!profileData.about && domProfile.about) profileData.about = domProfile.about;
                if (!profileData.location && domProfile.location) profileData.location = domProfile.location;
                if (!profileData.photoUrl && domProfile.photoUrl) profileData.photoUrl = domProfile.photoUrl;
                if (!profileData.coverImageUrl && domProfile.coverImageUrl) profileData.coverImageUrl = domProfile.coverImageUrl;
                if (profileData.experience.length === 0 && domProfile.experience.length > 0) profileData.experience = domProfile.experience;
                if (profileData.education.length === 0 && domProfile.education.length > 0) profileData.education = domProfile.education;
                if (profileData.skills.length === 0 && domProfile.skills.length > 0) profileData.skills = domProfile.skills;
                if (domProfile.analytics) profileData.analytics = domProfile.analytics;
            }
        } else if (domProfile && domProfile.name) {
            console.log("Vignova: Using DOM as primary source (JSON failed)");
            profileData = domProfile;
        } else {
            console.error("Vignova: Both JSON and DOM scrapers failed to extract name");
            profileData = domProfile || jsonProfile || { name: "", headline: "", location: "", photoUrl: "", about: "", experience: [], education: [], skills: [] };
        }

        console.log("Vignova: ═══════════════════════════════════════");
        console.log("Vignova: FINAL SCRAPED PROFILE:");
        console.log("  Name:", profileData.name);
        console.log("  Headline:", profileData.headline);
        console.log("  Location:", profileData.location);
        console.log("  About:", profileData.about ? profileData.about.substring(0, 80) + "..." : "(empty)");
        console.log("  Experience:", profileData.experience.length, "items");
        console.log("  Education:", profileData.education.length, "items");
        console.log("  Skills:", profileData.skills.length, "items");
        console.log("  Photo:", profileData.photoUrl ? "Yes" : "No");
        console.log("  Cover:", profileData.coverImageUrl ? "Yes" : "No");
        console.log("Vignova: ═══════════════════════════════════════");

        removeOverlay();
        return profileData;

    } catch (e) {
        console.error("Vignova: Top-level scrape error", e instanceof DOMException ? e.message : (e?.message || String(e)));
        removeOverlay();
        throw e;
    }
}

// ──────────────────────────────────────────────────────────
// Scrape all 90+ skills from /details/skills/
// ──────────────────────────────────────────────────────────
async function scrapeSkillsPage() {
    console.log("Vignova: ═══════════════════════════════════════");
    console.log("Vignova: Starting LinkedIn Skills Page Scrape");
    showOverlay();

    await smoothScrollToBottom();
    await sleep(2000);
    window.scrollTo(0, 0);

    const skills = [];
    try {
        const items = document.querySelectorAll('li.pvs-list__paged-list-item');
        items.forEach(item => {
            const nameEl = item.querySelector('.hoverable-link-text.t-bold span')
                        || item.querySelector('.t-bold span');
            const name = getText(nameEl);
            if (name && !skills.includes(name)) {
                skills.push(name);
            }
        });
        
        // Fallback for different UI versions
        if (skills.length === 0) {
            const fallbackItems = document.querySelectorAll('.t-bold span');
            fallbackItems.forEach(span => {
                const text = getText(span);
                // Exclude empty strings and common non-skill bold texts
                if (text && text.length > 1 && !text.includes('Show all')) {
                    if (!skills.includes(text)) skills.push(text);
                }
            });
        }
    } catch(e) { console.error("Vignova: Error scraping skills page", e); }

    console.log("Vignova: Extracted", skills.length, "skills from details page");
    console.log("Vignova: ═══════════════════════════════════════");
    removeOverlay();
    return skills;
}

// ──────────────────────────────────────────────────────────
// Scrape analytics from /dashboard/
// ──────────────────────────────────────────────────────────
async function scrapeAnalyticsPage() {
    console.log("Vignova: ═══════════════════════════════════════");
    console.log("Vignova: Starting LinkedIn Analytics Page Scrape");
    showOverlay();

    await sleep(2000); // Usually quick, but give it a moment to load the numbers

    const analytics = {
        postImpressions: "0",
        totalFollowers: "0",
        profileViewers: "0",
        searchAppearances: "0"
    };

    try {
        // The dashboard has cards with large numbers. We look for the text around them.
        const cards = document.querySelectorAll('.artdeco-card');
        
        // Find the "Track performance" section
        let trackCard = null;
        for (const card of cards) {
            if (card.innerText?.includes('Track performance')) {
                trackCard = card;
                break;
            }
        }
        
        const containerToSearch = trackCard || document;

        // Try to find the numbers by searching for the labels
        const allTextNodes = Array.from(containerToSearch.querySelectorAll('*')).filter(el => el.childNodes.length === 1 && el.childNodes[0].nodeType === 3);
        
        // Helper to find the big number preceding a specific label
        const findNumberForLabel = (labelPattern) => {
            // New UI has specific link containers
            const links = containerToSearch.querySelectorAll('a');
            for (const link of links) {
                if (link.innerText?.toLowerCase().includes(labelPattern)) {
                    // Number is usually the first big text in the link block
                    const numMatch = link.innerText.match(/^[\d,KMB\.]+/);
                    if (numMatch) return numMatch[0];
                    
                    // Fallback: look at the first span
                    const firstSpan = link.querySelector('span');
                    if (firstSpan) {
                        const num = getText(firstSpan);
                        if (num && /[\d,KMB\.]+/.test(num)) return num;
                    }
                }
            }
            return "0";
        };

        analytics.postImpressions = findNumberForLabel('impression');
        analytics.totalFollowers = findNumberForLabel('follower');
        analytics.profileViewers = findNumberForLabel('profile viewer');
        analytics.searchAppearances = findNumberForLabel('search appearance');
        
        // Sometimes labels are slightly different (e.g., "Profile views" instead of "Profile viewers")
        if (analytics.profileViewers === "0") analytics.profileViewers = findNumberForLabel('profile view');

    } catch(e) { console.error("Vignova: Error scraping analytics page", e); }

    console.log("Vignova: Extracted Analytics:", analytics);
    console.log("Vignova: ═══════════════════════════════════════");
    removeOverlay();
    return analytics;
}


// ──────────────────────────────────────────────────────────
// Message listener: triggered by the background service worker
// ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "EXTRACT_LINKEDIN_PROFILE") {
        scrapeProfile().then(data => sendResponse({ success: true, data: data }))
                       .catch(err => sendResponse({ success: false, error: err.message }));
        return true; 
    }
    
    if (message.action === "EXTRACT_LINKEDIN_SKILLS") {
        scrapeSkillsPage().then(data => sendResponse({ success: true, data: data }))
                          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
    
    if (message.action === "EXTRACT_LINKEDIN_ANALYTICS") {
        scrapeAnalyticsPage().then(data => sendResponse({ success: true, data: data }))
                             .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});
