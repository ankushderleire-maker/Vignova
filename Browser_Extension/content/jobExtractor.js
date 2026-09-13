// Read the selected job locally. No network calls, page mutations, or application submission.
(() => {
    if (window.top !== window || window.Vignova_JobPage) return;
    let selectedJobUrl = '';
    const webUrl = raw => { if (typeof raw !== 'string' || !raw.trim()) return ''; try { const url = new URL(raw, location.href); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; } };
    const visible = el => !!el && !el.closest('[hidden],[aria-hidden="true"]') && el.getClientRects().length > 0;
    const clean = (text, limit = 200) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, limit);
    const find = (root, selectors) => selectors.split('|').map(s => Array.from(root.querySelectorAll(s)).find(visible)).find(Boolean);
    const text = (root, selectors) => clean(find(root, selectors)?.innerText);
    /**
     * Readable text of an element, without any CSS or JS it happens to contain.
     *
     * Indeed's description wrapper (.react-native-html-content) holds two
     * <style> blocks, and their @layer rules come back in innerText — roughly
     * 2,600 characters of CSS that were being scored as job keywords, which is
     * how a real posting came out at 0% match.
     */
    /**
     * Off-screen is not the same as absent.
     *
     * Indeed's job pane reports zero client rects while holding the whole
     * posting, so the visible() gate skipped it and the extractor came back
     * empty. Content lookups only need the node to be real and not
     * aria-hidden; rect-based visibility stays for picking between duplicates.
     */
    const notHidden = el => !!el && !el.closest('[hidden],[aria-hidden="true"]');
    const findRich = (root, selectors, min = 1) => selectors.split('|')
        .map(selector => Array.from(root.querySelectorAll(selector))
            .filter(notHidden).map(el => richText(el)).find(value => value.length >= min))
        .find(Boolean) || '';
    const richText = el => {
        if (!el) return '';
        const copy = el.cloneNode(true);
        copy.querySelectorAll('style,script,noscript,template').forEach(node => node.remove());
        return (copy.innerText || copy.textContent || '').trim();
    };
    const isBadTitle = value => {
        const candidate = clean(value, 300).toLowerCase();
        return !candidate || candidate.length < 3 || /^\d+\s+notifications?$/.test(candidate) || candidate === 'jobs based on your preferences' || candidate === 'job role';
    };
    const titleFromCurrentJobLink = (jobId, root) => {
        const selectors = jobId
            ? [`a[href*="/jobs/view/${jobId}"]`, `a[href*="currentJobId=${jobId}"]`]
            : ['a[href*="/jobs/view/"]'];
        for (const scope of [root, document].filter(Boolean)) {
            for (const selector of selectors) {
                for (const link of Array.from(scope.querySelectorAll(selector))) {
                    const candidate = clean(link.innerText || link.textContent || link.getAttribute('aria-label'), 300);
                    if (!isBadTitle(candidate)) return candidate;
                }
            }
        }
        return '';
    };
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const logoFromSchema = schema => {
        const raw = schema?.hiringOrganization?.logo || schema?.image;
        const value = Array.isArray(raw) ? raw[0] : raw;
        return webUrl(typeof value === 'object' ? value?.url : value);
    };
    const jobLink = (root, title = '') => {
        const links = Array.from(root.querySelectorAll('a[href*="/job-openings/"]'));
        const matching = title ? links.filter(a => clean(a.textContent).toLowerCase() === title.toLowerCase()) : links;
        const urls = [...new Set(matching.map(a => webUrl(a.getAttribute('href'))).filter(Boolean))];
        if (title && urls.includes(selectedJobUrl)) return selectedJobUrl;
        return urls.length === 1 ? urls[0] : '';
    };
    document.addEventListener('click', event => {
        if (!/(^|\.)monster\./i.test(location.hostname) || !(event.target instanceof Element)) return;
        // Monster uses an overlay button over each card; its job URL lives in the sibling heading link.
        let el = event.target;
        for (let depth = 0; el && depth < 5; depth++, el = el.parentElement) {
            const url = el.matches('a[href*="/job-openings/"]') ? webUrl(el.getAttribute('href')) : jobLink(el);
            if (url) { selectedJobUrl = url; return; }
        }
    }, true);
    function structuredJob(selectedId = '') {
        const jobs = [];
        for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
            try {
                const queue = [JSON.parse(script.textContent)];
                while (queue.length) {
                    const item = queue.shift();
                    if (Array.isArray(item)) { queue.push(...item); continue; }
                    if (!item || typeof item !== 'object') continue;
                    if ([].concat(item['@type'] || []).includes('JobPosting')) jobs.push(item);
                    for (const key of ['@graph', 'itemListElement', 'item']) if (item[key]) queue.push(item[key]);
                }
            } catch { /* A malformed unrelated schema must not break visible job extraction. */ }
        }
        if (selectedId) return jobs.find(j => String(j.url || j.identifier?.value || '').includes(selectedId)) || null;
        return jobs.length === 1 ? jobs[0] : null;
    }
    async function prepareLinkedInDetail(root) {
        if (!/(^|\.)linkedin\.com$/i.test(location.hostname)) return;
        const containers = [
            root,
            document.querySelector('.jobs-search__job-details--container'),
            document.querySelector('.jobs-details__main-content'),
            document.scrollingElement,
        ].filter(Boolean);
        for (const button of Array.from(root.querySelectorAll('button'))) {
            const label = clean(button.innerText || button.textContent || '', 80).toLowerCase();
            if ((label === 'see more' || label === 'show more' || label.includes('show more') || label.includes('see more')) && visible(button)) {
                try { button.click(); } catch { /* ignore */ }
            }
        }
        if (!find(root, '#job-details|.jobs-description__content|.jobs-description|.jobs-box__html-content|article.jobs-description__container|[class*="jobs-description"]')) {
            for (const el of containers) {
                try {
                    el.scrollTop = Math.max(el.scrollTop || 0, 650);
                    el.dispatchEvent(new Event('scroll', { bubbles: true }));
                } catch { /* ignore */ }
            }
        }
        await wait(350);
    }
    function descriptionFromAboutHeading(root) {
        const headings = Array.from(root.querySelectorAll('h2,h3')).filter(visible);
        const heading = headings.find(h => /about the job|job description|about this role/i.test(h.textContent || ''));
        if (!heading) return '';
        const candidates = [
            heading.nextElementSibling,
            heading.parentElement?.nextElementSibling,
            heading.closest('section,article,div')?.nextElementSibling,
            heading.closest('section,article,div'),
        ].filter(Boolean);
        const best = candidates.find(el => clean(el.innerText || el.textContent || '', 20000).length >= 50);
        return best ? best.innerText || best.textContent || '' : '';
    }
    async function extract() {
        const url = new URL(location.href), monster = /(^|\.)monster\./i.test(url.hostname), linkedin = /(^|\.)linkedin\.com$/i.test(url.hostname);
        const detail = find(document, '[data-testid="svx-job-view-wrapper"]|[data-testid="desktop-job-header"]|[data-testid="job-view"]|#JobView|#jobsearch-ViewjobPaneWrapper|.jobsearch-JobComponent|.jobs-search__job-details--container|.jobs-details__main-content|.job-details-jobs-unified-top-card__container--two-pane|.job-view-layout|.scaffold-layout__detail');
        const root = detail || document;
        await prepareLinkedInDetail(root);
        // A search results page is not a job description. Never copy its list or pick an arbitrary first job.
        if (monster && !url.pathname.startsWith('/job-openings/') && !detail) {
            return { error: 'Select a Monster job and open its full job description, then try again. You can also paste a job description.', selectedJobUrl: selectedJobUrl || null };
        }
        const schema = structuredJob(monster && !url.pathname.startsWith('/job-openings/') ? url.searchParams.get('id') || '' : '');
        const linkedinJobId = linkedin ? url.searchParams.get('currentJobId') || url.pathname.match(/\/jobs\/view\/(\d+)/)?.[1] || '' : '';
        const titleSelectors = linkedin
            ? '[data-testid="jobTitle"]|.job-details-jobs-unified-top-card__job-title h1|.job-details-jobs-unified-top-card__job-title|.job-details-jobs-unified-top-card__job-title-link|.job-details-jobs-unified-top-card__title-container h1|.job-details-jobs-unified-top-card__title-container h2|.jobs-unified-top-card__job-title|[class*="job-title"]'
            : '[data-testid="jobTitle"]|.job-details-jobs-unified-top-card__job-title h1|.job-details-jobs-unified-top-card__job-title|.job-details-jobs-unified-top-card__job-title-link|.job-details-jobs-unified-top-card__title-container h1|.job-details-jobs-unified-top-card__title-container h2|.jobs-unified-top-card__job-title|[data-testid="vj-job-title"]|[data-testid="vj-job-title-compact"]|[data-testid="jobsearch-JobInfoHeader-title"]|h1.jobsearch-JobInfoHeader-title|h1|.posting-headline h2';
        let title = text(root, titleSelectors) || clean(findRich(root, titleSelectors, 3)) || clean(schema?.title);
        if (linkedin && isBadTitle(title)) title = titleFromCurrentJobLink(linkedinJobId, root);
        const company = text(root, '[data-testid="company-name"]|[data-testid="company"]|.job-details-jobs-unified-top-card__company-name|.jobs-unified-top-card__company-name|.job-details-jobs-unified-top-card__primary-description a[href*="/company/"]|.jobs-unified-top-card__subtitle-primary-grouping a[href*="/company/"]|[data-testid="inlineHeader-companyName"]|[data-company-name]|.company-name|.company') || clean(findRich(root, '[data-testid="company-name"]|[data-testid="inlineHeader-companyName"]', 2)) || clean(schema?.hiringOrganization?.name);
        const addresses = [].concat(schema?.jobLocation || []).map(place => place?.address).filter(Boolean);
        const address = addresses[0];
        const jobLocation = text(root, '[data-testid="text-location"]|[data-testid="jobDetailLocation"]|[data-testid="svx-jobview-location-value"]|.job-details-jobs-unified-top-card__primary-description-container|.jobs-unified-top-card__bullet|[data-testid="inlineHeader-companyLocation"]|[data-testid="job-location"]|.location|.posting-categories .location') || [address?.addressLocality, address?.addressRegion, address?.addressCountry].filter(Boolean).join(', ');
        let description = findRich(root, '[data-testid="description-clamp-wrapper"]|[data-testid="svx-description-container-inner"]|#jobDescriptionText|.react-native-html-content|#job-details|.jobs-description__content|.jobs-description|.jobs-box__html-content|.jobs-description-content__text|.jobs-description-content|article.jobs-description__container|[data-testid="job-description"]|[class*="jobs-description"]|.job-description|#job-description|.posting-page .content|.section-wrapper', 50);
        // Indeed's search pane labels the block "Full job description" instead
        // of giving it a stable id.
        if (!description) {
            const heading = Array.from(root.querySelectorAll('[data-testid="vj-job-description-heading"]')).find(notHidden);
            const near = [heading?.nextElementSibling, heading?.parentElement?.nextElementSibling].filter(Boolean);
            description = near.map(richText).find(value => value.length >= 50) || '';
        }
        if (!description && linkedin) description = descriptionFromAboutHeading(root);
        if (!description && schema?.description) description = new DOMParser().parseFromString(schema.description, 'text/html').body.textContent || '';
        if (!description && !monster && !linkedin && title && company) description = find(root, 'article|main')?.innerText || '';
        if (!title || clean(description, 20000).length < 50) return { error: 'The job description is not available yet. Open the full posting, wait for it to load, or paste the description.', selectedJobUrl: selectedJobUrl || null };
        if (linkedin) {
            const id = linkedinJobId;
            if (id) { url.pathname = '/jobs/view/' + id + '/'; url.search = ''; }
        }
        if (/(^|\.)indeed\.com$/.test(url.hostname)) {
            const id = url.searchParams.get('vjk') || url.searchParams.get('jk');
            if (id) { url.pathname = '/viewjob'; url.search = '?jk=' + encodeURIComponent(id); }
        }
        let jobUrl = url.href;
        if (monster && !url.pathname.startsWith('/job-openings/')) {
            jobUrl = jobLink(document, title) || webUrl(schema?.url);
            if (jobUrl) { const posting = new URL(jobUrl); if (posting.hostname !== url.hostname || !posting.pathname.startsWith('/job-openings/')) jobUrl = ''; }
            // Keep search URLs out of duplicate detection when a canonical posting URL is unknown.
            if (!jobUrl) return { error: 'Open this Monster job in its full job page before saving it.', selectedJobUrl: null };
        }
        const canonical = new URL(jobUrl); canonical.hash = '';
        const image = find(root, 'img[data-testid="jobHeaderCompanyLogo"]|[data-testid="jobHeaderCompanyLogo"] img|img[data-testid*="companyLogo"]|[data-testid*="companyLogo"] img|img[data-testid*="company-logo"]|[data-testid*="company-logo"] img|img[data-testid*="CompanyLogo"]|[data-testid*="CompanyLogo"] img|img[data-testid*="companyAvatar"]|[data-testid*="companyAvatar"] img|img[data-testid*="CompanyAvatar"]|[data-testid*="CompanyAvatar"] img|.job-details-jobs-unified-top-card__company-logo img|.jobs-unified-top-card__company-logo img|img[data-testid="inlineHeader-companyLogo"]|[data-testid="inlineHeader-companyLogo"] img|[class*="company-logo"] img|[class*="CompanyLogo"] img|[class*="companyAvatar"] img|[class*="CompanyAvatar"] img');
        return { title, company, location: clean(jobLocation), description: description.trim().slice(0, 20000), jobUrl: canonical.href, companyLogo: webUrl(image?.currentSrc || image?.src || '') || logoFromSchema(schema) };
    }
    window.Vignova_JobPage = { extract };
    chrome.runtime.onMessage.addListener((message, _sender, reply) => {
        if (message.type !== 'EXTRACT_JOB_DETAILS') return;
        extract().then(job => reply({ success: true, job })).catch(() => reply({ success: false, error: 'The job could not be read. Open its full description and try again.' }));
        return true;
    });
})();
