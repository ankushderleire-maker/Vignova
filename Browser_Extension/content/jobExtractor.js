// Read the selected job locally. No network calls, page mutations, or application submission.
(() => {
    if (window.top !== window || window.Vignova_JobPage) return;
    let selectedJobUrl = '';
    const webUrl = raw => { if (typeof raw !== 'string' || !raw.trim()) return ''; try { const url = new URL(raw, location.href); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; } };
    const visible = el => !!el && !el.closest('[hidden],[aria-hidden="true"]') && el.getClientRects().length > 0;
    const clean = (text, limit = 200) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, limit);
    const find = (root, selectors) => selectors.split('|').map(s => Array.from(root.querySelectorAll(s)).find(visible)).find(Boolean);
    const text = (root, selectors) => clean(find(root, selectors)?.innerText);
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
    function extract() {
        const url = new URL(location.href), monster = /(^|\.)monster\./i.test(url.hostname);
        const detail = find(document, '[data-testid="svx-job-view-wrapper"]|[data-testid="job-view"]|#JobView|#jobsearch-ViewjobPaneWrapper|.jobsearch-JobComponent|.jobs-search__job-details--container|.jobs-details__main-content|.job-view-layout');
        const root = detail || document;
        // A search results page is not a job description. Never copy its list or pick an arbitrary first job.
        if (monster && !url.pathname.startsWith('/job-openings/') && !detail) {
            return { error: 'Select a Monster job and open its full job description, then try again. You can also paste a job description.', selectedJobUrl: selectedJobUrl || null };
        }
        const schema = structuredJob(monster && !url.pathname.startsWith('/job-openings/') ? url.searchParams.get('id') || '' : '');
        const title = text(root, '[data-testid="jobTitle"]|.job-details-jobs-unified-top-card__job-title h1|.job-details-jobs-unified-top-card__job-title|.jobs-unified-top-card__job-title|[data-testid="jobsearch-JobInfoHeader-title"]|h1.jobsearch-JobInfoHeader-title|h1|.posting-headline h2') || clean(schema?.title);
        const company = text(root, '[data-testid="company"]|.job-details-jobs-unified-top-card__company-name|.jobs-unified-top-card__company-name|[data-testid="inlineHeader-companyName"]|[data-company-name]|.company-name|.company') || clean(schema?.hiringOrganization?.name);
        const addresses = [].concat(schema?.jobLocation || []).map(place => place?.address).filter(Boolean);
        const address = addresses[0];
        const jobLocation = text(root, '[data-testid="jobDetailLocation"]|[data-testid="svx-jobview-location-value"]|.job-details-jobs-unified-top-card__primary-description-container|.jobs-unified-top-card__bullet|[data-testid="inlineHeader-companyLocation"]|[data-testid="job-location"]|.location|.posting-categories .location') || [address?.addressLocality, address?.addressRegion, address?.addressCountry].filter(Boolean).join(', ');
        let description = find(root, '[data-testid="description-clamp-wrapper"]|[data-testid="svx-description-container-inner"]|#jobDescriptionText|.jobs-description__content|.jobs-description-content__text|#job-details|[data-testid="job-description"]|.job-description|#job-description|.posting-page .content|.section-wrapper')?.innerText || '';
        if (!description && schema?.description) description = new DOMParser().parseFromString(schema.description, 'text/html').body.textContent || '';
        if (!description && !monster && title && company) description = find(root, 'article|main')?.innerText || '';
        if (!title || clean(description, 20000).length < 50) return { error: 'The job description is not available yet. Open the full posting, wait for it to load, or paste the description.', selectedJobUrl: selectedJobUrl || null };
        if (/(^|\.)linkedin\.com$/.test(url.hostname)) {
            const id = url.searchParams.get('currentJobId') || url.pathname.match(/\/jobs\/view\/(\d+)/)?.[1];
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
        try { reply({ success: true, job: extract() }); }
        catch { reply({ success: false, error: 'The job could not be read. Open its full description and try again.' }); }
    });
})();
