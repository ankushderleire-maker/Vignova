(() => {
    'use strict';
    const APP = 'https://app.vignova.io';
    const $ = id => document.getElementById(id);
    const state = { paid: false, profile: null, profiles: [], jobs: [], stats: null, job: null, keywords: null, filter: 'match', expanded: {}, busy: false, revision: 0, agentRunning: false };
    let toastTimer, reloading = false, initialized = false;
    VignovaIcons.render();
    /**
     * Use the official LinkedIn asset for the LinkedIn Optimizer tile when it
     * has been added to assets/, otherwise keep the generic profile glyph.
     *
     * Drop the file LinkedIn publishes on its brand resources page at
     * Browser_Extension/assets/linkedin.svg and it appears here automatically;
     * nothing else needs changing. A relative URL would resolve against the
     * page, so it is built with chrome.runtime.getURL().
     */
    (async () => {
        const slot = document.querySelector('#linkedinOptimizerBtn .icon[data-icon="linkedin"]');
        if (!slot) return;
        try {
            const href = chrome.runtime.getURL('assets/linkedin.svg');
            const response = await fetch(href);
            if (!response.ok) return;
            const img = document.createElement('img');
            img.src = href;
            img.alt = '';
            img.width = 20;
            img.height = 20;
            slot.replaceChildren(img);
        } catch (_) { /* asset not bundled - the generic glyph stays */ }
    })();
    const node = (tag, cls, text) => {
        const el = document.createElement(tag);
        if (cls)
            el.className = cls;
        if (text != null)
            el.textContent = String(text);
        return el;
    };
    const icon = name => {
        const el = node('span', 'icon');
        el.innerHTML = VignovaIcons.svg(name);
        return el;
    };
    const msg = (type, data) => chrome.runtime.sendMessage({ type, data });
    const openApp = path => chrome.tabs.create({ url: APP + path });
    const safeUrl = value => {
        try {
            const u = new URL(value);
            return ['https:', 'http:'].includes(u.protocol) ? u.href : '';
        }
        catch {
            return '';
        }
    };
    const value = x => x == null ? '' : Array.isArray(x) ? x.map(value).filter(Boolean).join(', ') : typeof x === 'object' ? value(x.name || x.title || '') : String(x);
    const unique = arr => [...new Map(arr.filter(Boolean).map(x => [String(x).toLowerCase(), String(x)])).values()];
    const skills = data => unique(Array.isArray(data) ? data.flatMap(x => skills(x)) : data && typeof data === 'object' ? Object.values(data).flatMap(x => skills(x)) : typeof data === 'string' ? data.split(/[,;\n]/).map(x => x.trim()) : []);
    function show(id) {
        document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== id);
    }
    function toast(text) {
        $('copyToast').textContent = text;
        $('copyToast').classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => $('copyToast').classList.remove('show'), 4000);
    }
    function fail(error, id = 'panelError') {
        if (error?.handled || reloading)
            return;
        $(id).textContent = error?.message || String(error);
        $(id).hidden = false;
        toast(error?.message || String(error));
    }
    function upgrade(feature, result = {}) {
        $('upgradeTitle').textContent = result.outOfCredits ? 'You’re out of AI credits' : feature + ' is a paid feature';
        $('upgradeMessage').textContent = result.message || 'Available with Pro and Premium. Choose a plan to use this tool.';
        $('upgradeDialog').showModal();
    }
    async function api(type, data) {
        const r = await msg(type, data);
        if (r?.upgradeRequired) {
            upgrade(r.feature || 'This tool', r);
            throw { handled: true };
        }
        if (r?.duplicate)
            return r;
        if (!r?.success)
            throw new Error(r?.error || 'Vignova could not complete this request. Please try again.');
        return r;
    }
    async function paid(feature) {
        if (!state.paid) {
            upgrade(feature);
            return false;
        }
        const r = await msg('CHECK_PAID_ACCESS');
        if (!r?.success) {
            if (r?.upgradeRequired)
                upgrade(feature, r);
            else
                fail(new Error(r?.error || 'Please sign in again.'));
            return false;
        }
        return true;
    }
    async function busy(label, work) {
        if (state.busy)
            return;
        state.busy = true;
        $('busyText').textContent = label;
        $('busyOverlay').hidden = false;
        $('panelError').hidden = true;
        $('jobEditorError').hidden = true;
        try {
            return await work();
        }
        catch (e) {
            fail(e, $('jobEditorView').hidden ? 'panelError' : 'jobEditorError');
        }
        finally {
            state.busy = false;
            $('busyOverlay').hidden = true;
        }
    }
    async function copy(text) {
        if (!text)
            return;
        try {
            await navigator.clipboard.writeText(text);
            toast('Copied to clipboard');
        }
        catch {
            const input = node('textarea');
            input.value = text;
            document.body.append(input);
            input.select();
            const ok = document.execCommand('copy');
            input.remove();
            toast(ok ? 'Copied to clipboard' : 'Could not copy. Please copy the text manually.');
        }
    }
    function setTab(name, analyze = true) {
        document.querySelectorAll('[data-tab]').forEach(b => {
            const selected = b.dataset.tab === name;
            b.classList.toggle('active', selected);
            b.setAttribute('aria-selected', String(selected));
            b.tabIndex = selected ? 0 : -1;
        });
        document.querySelectorAll('.tab-panel').forEach(p => p.hidden = p.id !== 'tab-' + name);
        if (name === 'keywords' && analyze && !state.keywords)
            void analyzeCurrent();
    }
    function renderPlan(r) {
        state.user = r.user;
        state.paid = ['PRO', 'PREMIUM'].includes(r.plan_type);
        $('planBadge').textContent = r.plan_type || 'FREE';
        $('creditBalance').textContent = (r.credits_remaining ?? 0) + ' credits';
        document.querySelectorAll('[data-paid]').forEach(b => {
            b.querySelector('.paid-badge')?.remove();
            if (!state.paid)
                b.append(node('span', 'paid-badge', 'PRO'));
        });
    }
    async function refreshCredits() {
        const r = await msg('API_GET_STATUS');
        if (r?.authenticated)
            renderPlan(r);
    }
    function initials(name) {
        return (name || 'Vignova').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
    }
    function personalRows() {
        const p = state.profile || {};
        return [['user', 'Full Name', [p.first_name, p.last_name].filter(Boolean).join(' ')], ['email', 'Email', p.email], ['phone', 'Phone', p.phone], ['pin', 'Location', [p.city, p.state, p.country].filter(Boolean).join(', ')], ['linkedin', 'LinkedIn URL', p.linkedin], ['link', 'Portfolio URL', p.portfolio || p.github]];
    }
    function copyRow([symbol, label, raw]) {
        const text = value(raw), row = node('div', 'copy-row');
        const content = node('span', 'row-value' + (text ? '' : ' empty-value'), text || 'Not added');
        content.title = text;
        const button = node('button', 'copy-button');
        button.type = 'button';
        button.append(icon('copy'), node('span', '', 'Copy'));
        button.disabled = !text;
        button.setAttribute('aria-label', 'Copy ' + label);
        button.onclick = () => copy(text);
        row.append(icon(symbol), node('span', 'row-label', label), content, button);
        return row;
    }
    function renderProfile() {
        const p = state.profile || {};
        $('personalSectionBody').replaceChildren(...personalRows().map(copyRow));
        $('copyAllBtn').disabled = !state.profile;
        $('workSectionBody').replaceChildren(...[['briefcase', 'Current Title', p.current_title], ['chart', 'Experience', p.years_experience != null && p.years_experience !== '' ? p.years_experience + ' years' : ''], ['globe', 'Work Authorization', [p.work_authorized, p.visa_status, p.needs_sponsorship ? 'Sponsorship: ' + p.needs_sponsorship : ''].filter(Boolean).join(' · ')]].map(copyRow));
        const items = skills(p.skills);
        $('skillsSectionCaption').textContent = 'Technical & professional skills (' + items.length + ')';
        $('skillsSectionBody').replaceChildren();
        if (!items.length)
            $('skillsSectionBody').append(node('p', 'empty', 'Add skills to your profile.'));
        else {
            const list = node('div', 'keyword-chips');
            items.forEach(s => {
                const b = node('button', 'keyword-chip', s);
                b.title = 'Copy ' + s;
                b.onclick = () => copy(s);
                list.append(b);
            });
            $('skillsSectionBody').append(list);
        }
        $('educationSectionBody').replaceChildren();
        (Array.isArray(p.education) ? p.education : []).forEach(e => {
            const row = node('div', 'education-item');
            row.append(node('strong', '', value(e.degree || e.qualification)), node('small', '', value(e.institution || e.school || e.university)), node('small', '', [e.field_of_study || e.field, e.start_date || e.startDate, e.end_date || e.endDate].filter(Boolean).join(' · ')));
            const b = node('button', 'copy-button', 'Copy');
            b.onclick = () => copy(row.innerText.replace(/\nCopy$/, ''));
            row.append(b);
            $('educationSectionBody').append(row);
        });
        if (!$('educationSectionBody').children.length)
            $('educationSectionBody').append(node('p', 'empty', 'Add your education in Edit Profile.'));
        if (Array.isArray(p.experience) && p.experience.length) {
            const history = node('details', 'history-details');
            history.append(node('summary', '', p.experience.length + ' work experience entries'));
            p.experience.forEach(e => {
                const item = node('div', 'history-item');
                item.append(node('strong', '', value(e.title || e.position)), node('small', '', value(e.company)), node('small', '', value(e.description || e.highlights)));
                history.append(item);
            });
            $('workSectionBody').append(history);
        }
    }
    async function loadProfile() {
        const version = ++state.revision;
        state.keywords = null;
        renderKeywords();
        const results = await Promise.all([api('API_GET_PROFILES'), api('API_AGENT_GET_PROFILE')]);
        if (version !== state.revision)
            return;
        state.profiles = results[0].profiles;
        state.profile = results[1].profile;
        const active = state.profiles.find(p => p.is_default) || state.profiles[0];
        ['activeProfileSelect', 'profileSelect'].forEach(id => {
            $(id).replaceChildren(...state.profiles.map(p => {
                const option = node('option', '', p.name);
                option.value = p.id;
                option.selected = p.id === active?.id;
                return option;
            }));
            $(id).disabled = !state.profiles.length;
        });
        document.querySelectorAll('.profile-initials').forEach(el => el.textContent = initials(personalRows()[0][2]));
        $('profileSubtitle').textContent = [state.profile.current_title, state.profile.years_experience ? state.profile.years_experience + ' years experience' : ''].filter(Boolean).join(' · ') || 'Your active profile';
        renderProfile();
        void loadDocuments();
    }
    async function loadDocuments() {
        const version = state.revision;
        try {
            const r = await api('API_GET_DOCUMENTS');
            if (version !== state.revision)
                return;
            $('documentsSectionCaption').textContent = 'Resumes & cover letters (' + r.documents.length + ')';
            $('documentsSectionBody').replaceChildren(...r.documents.map(d => {
                const row = node('div', 'document-row'), meta = node('div');
                meta.append(node('strong', '', d.name), node('small', '', d.type === 'resume' ? 'Resume' : 'Cover letter'));
                const button = node('button', 'copy-button');
                button.append(icon('download'), node('span', '', 'PDF'));
                button.title = 'Download ' + d.name;
                button.onclick = () => busy('Preparing your document…', async () => {
                    const result = await api('API_DOWNLOAD_DOCUMENT', { documentId: d.id, docType: d.type });
                    downloadPdf(result.pdfBase64, result.filename || d.name + '.pdf');
                });
                row.append(icon('file'), meta, button);
                return row;
            }));
            if (!r.documents.length)
                $('documentsSectionBody').append(node('p', 'empty', 'Your generated documents will appear here.'));
        }
        catch (e) {
            $('documentsSectionBody').replaceChildren(node('p', 'empty', e.message || 'Could not load documents.'));
        }
    }
    async function switchProfile(id) {
        await busy('Switching profile…', async () => {
            state.profile = null;
            ++state.revision;
            renderProfile();
            await api('API_SET_PROFILE', { profileId: id });
            await loadProfile();
            toast('Active profile updated');
        });
    }
    function logo(job) {
        const el = node('span', 'company-logo', initials(job.company).slice(0, 1)), url = safeUrl(job.companyLogo);
        if (url) {
            const img = node('img');
            img.alt = '';
            img.referrerPolicy = 'no-referrer';
            img.src = url;
            img.onerror = () => el.replaceChildren(document.createTextNode(initials(job.company).slice(0, 1)));
            el.replaceChildren(img);
        }
        return el;
    }
    function ago(date) {
        const n = Math.max(0, Date.now() - new Date(date).getTime());
        if (!Number.isFinite(n))
            return '';
        const minutes = Math.floor(n / 60000);
        return minutes < 1 ? 'Just now' : minutes < 60 ? minutes + ' min ago' : minutes < 1440 ? Math.floor(minutes / 60) + ' hours ago' : Math.floor(minutes / 1440) + ' days ago';
    }
    function jobRow(job, action) {
        const row = node('button', 'recent-job'), meta = node('span', 'job-meta'), status = node('span', 'job-status');
        meta.append(node('strong', '', job.title || job.jobTitle), node('small', '', [job.company, job.location].filter(Boolean).join(' · ')));
        const stage = job.status && job.status !== 'SAVED' ? job.status.toLowerCase() : job.hasResume ? 'tailored' : job.analyzed ? 'analyzed' : job.status === 'SAVED' ? 'saved' : 'tracked';
        status.append(node('span', 'status-pill ' + stage, ({ tailored: 'Resume Tailored', saved: 'Saved', analyzed: 'Analyzed' })[stage] || stage.charAt(0).toUpperCase() + stage.slice(1)), node('small', '', ago(job.createdAt)));
        row.append(logo(job), meta, status, icon('right'));
        row.onclick = action;
        return row;
    }
    async function loadOverview() {
        $('retryJobsBtn').hidden = true;
        const r = await api('API_GET_OVERVIEW');
        state.jobs = r.jobs;
        state.stats = r.stats || null;
        $('weeklyCard').hidden = !state.stats;
        $('recentJobsList').replaceChildren(...r.jobs.slice(0, 3).map(j => jobRow(j, () => openApp('/dashboard/jobs/' + encodeURIComponent(j.id)))));
        if (!r.jobs.length)
            $('recentJobsList').append(node('p', 'empty', 'Save your first job to start tracking your search.'));
        if (state.stats) Object.entries({ statSaved: 'saved', statApplied: 'applications', statResumes: 'resumes', statInterviews: 'interviews' }).forEach(([id, key]) => $(id).textContent = r.stats[key] ?? 0);
    }
    async function currentTab() {
        const r = await msg('GET_CONTEXT_TAB');
        const tab = r?.tab;
        if (!tab?.id || !safeUrl(tab.url) || tab.url.startsWith(APP))
            throw new Error('Open a job posting in LinkedIn, Indeed or an application site, then try again.');
        return tab;
    }
    async function readJob() {
        const tab = await currentTab();
        const job = await extractJobData(tab);
        state.selectedJobUrl = job.selectedJobUrl || null;
        if (job.error) {
            $('openSelectedJobBtn').hidden = !state.selectedJobUrl;
            $('jobChoices').replaceChildren(node('p', 'helper', job.error));
            $('changeJobDialog').showModal();
            throw Object.assign(new Error(job.error), { handled: true });
        }
        return { ...job, jobUrl: job.jobUrl || tab.url, tabId: tab.id, source: new URL(tab.url).hostname };
    }
    function selectJob(job) {
        ++state.revision;
        state.job = { ...job, title: job.title || job.jobTitle || '' };
        state.keywords = null;
        state.expanded = {};
        $('keywordJobTitle').textContent = state.job.title || 'Job description';
        $('keywordJobCompany').textContent = [job.company, job.location].filter(Boolean).join(' · ') || 'Compared with your active profile';
        $('keywordJobLogo').replaceWith(Object.assign(logo(job), { id: 'keywordJobLogo' }));
        renderKeywords();
    }
    async function analyzeCurrent() {
        state.pasteAction = 'analyze';
        await busy('Checking your keyword match…', async () => {
            try {
                if (!state.job)
                    selectJob(await readJob());
                await analyze();
            }
            catch (e) {
                $('scoreStatus').textContent = e.message || 'Could not analyze this job';
                if (e.handled)
                    throw e;
            }
        });
    }
    async function analyze() {
        if (!state.job?.description || state.job.description.length < 50)
            throw new Error('Paste a job description with at least 50 characters.');
        const version = state.revision;
        const r = await api('API_GET_SCORE', { jobDescription: state.job.description });
        if (version !== state.revision)
            return;
        const raw = r.breakdown || r.scoreData?.breakdown || r.scoreData || r;
        state.keywords = { matched: skills(raw.matching_keywords || raw.matchedKeywords), missing: skills(raw.missing_keywords || raw.missingKeywords) };
        const matched = new Set(state.keywords.matched.map(s => s.toLowerCase()));
        state.keywords.missing = state.keywords.missing.filter(s => !matched.has(s.toLowerCase()));
        renderKeywords();
    }
    function renderKeywords() {
        $('keywordEmptyState').hidden = !!state.keywords;
        $('keywordResultState').hidden = !state.keywords;
        if (!state.keywords)
            return;
        const { matched, missing } = state.keywords, total = matched.length + missing.length, score = total ? Math.round(100 * matched.length / total) : 0;
        $('matchScore').textContent = total ? score + '%' : '—';
        $('matchRing').style.setProperty('--score', score);
        $('matchRing').setAttribute('aria-valuenow', score);
        $('matchVerdict').textContent = !total ? 'No skills detected' : score >= 75 ? 'Good match!' : score >= 45 ? 'Room to improve' : 'Build your match';
        $('matchDescription').textContent = total ? 'Your profile matches ' + matched.length + ' of ' + total + ' skills found in this job description.' : 'Try a more detailed job description.';
        $('missingNote').textContent = missing.length + ' missing keywords';
        $('matchSummary').hidden = state.filter !== 'match';
        $('matchedCard').hidden = state.filter === 'missing';
        $('missingCard').hidden = false;
        for (const [kind, items] of [['matched', matched], ['missing', missing]]) {
            $(kind + 'Count').textContent = '(' + items.length + ')';
            const expanded = state.expanded[kind] || state.filter !== 'match', shown = expanded ? items : items.slice(0, kind === 'matched' ? 12 : 8);
            $(kind + 'ViewAllBtn').hidden = items.length <= (kind === 'matched' ? 12 : 8) || state.filter !== 'match';
            $(kind + 'ViewAllBtn').textContent = expanded ? 'Show less' : 'View all';
            $(kind + 'Keywords').replaceChildren(...shown.map(s => {
                const chip = node('button', 'keyword-chip' + (kind === 'missing' ? ' missing' : ''));
                chip.append(icon(kind === 'missing' ? 'plus' : 'check'), document.createTextNode(s));
                chip.title = 'Copy ' + s;
                chip.onclick = () => copy(s);
                return chip;
            }));
            if (items.length > shown.length) {
                const b = node('button', 'keyword-chip more', '+' + (items.length - shown.length) + ' more');
                b.onclick = () => {
                    state.expanded[kind] = true;
                    renderKeywords();
                };
                $(kind + 'Keywords').append(b);
            }
            if (!items.length)
                $(kind + 'Keywords').append(node('p', 'helper', kind === 'matched' ? 'No matching skills found.' : 'No missing keywords found.'));
        }
    }
    const actionNames = { resume: 'Tailor Resume', letter: 'Cover Letter', save: 'Save Job', extract: 'Extract Job Details', analyze: 'Check Keyword Match', email: 'Application Email', hr: 'Message HR' };
    async function editJob(action, blank = false) {
        state.pasteAction = action;
        if (['resume', 'letter', 'email', 'hr'].includes(action) && !await paid(actionNames[action]))
            return;
        await busy('Reading job details…', async () => {
            const job = blank ? {} : (action === 'extract' || action === 'save' || !state.job ? await readJob() : state.job);
            if (!blank && (!job.title || !job.description || job.description.length < 50)) {
                throw new Error('Open a specific job and wait for its description to load, or choose Paste a job description.');
            }
            state.editorAction = action;
            state.editorJob = job;
            $('jobEditorHeading').textContent = actionNames[action];
            $('jobTitleInput').value = job.title || job.jobTitle || '';
            $('jobCompanyInput').value = job.company || '';
            $('jobCompanyInput').required = !['analyze'].includes(action);
            $('jobLocationInput').value = job.location || '';
            $('jobDescriptionInput').value = job.description || '';
            $('resumeHintInput').value = '';
            $('resumeHintLabel').hidden = action !== 'resume';
            $('jobEditorSubmit').textContent = ({ extract: 'Save Job', resume: 'Generate Resume', letter: 'Generate Cover Letter', analyze: 'Analyze Keywords', email: 'Draft Email', hr: 'Draft Message' })[action] || 'Save Job';
            updateCharCount();
            show('jobEditorView');
        });
    }
    function updateCharCount() {
        $('jobCharCount').textContent = $('jobDescriptionInput').value.length.toLocaleString() + ' / 20,000 characters';
    }
    async function submitJob(event) {
        event.preventDefault();
        const action = state.editorAction;
        await busy(action === 'save' || action === 'extract' ? 'Saving your job…' : 'Working on your ' + actionNames[action].toLowerCase() + '…', async () => {
            const job = { ...state.editorJob, title: $('jobTitleInput').value.trim(), company: $('jobCompanyInput').value.trim(), location: $('jobLocationInput').value.trim(), description: $('jobDescriptionInput').value.trim() };
            if (job.description.length < 50)
                throw new Error('Add a job description with at least 50 characters.');
            selectJob(job);
            const data = { jobTitle: job.title, company: job.company, location: job.location, description: job.description, jobDescription: job.description, jobUrl: safeUrl(job.jobUrl) || undefined, companyLogo: safeUrl(job.companyLogo) || undefined, source: job.source || 'extension', hint: $('resumeHintInput').value.trim() };
            if (action === 'analyze') {
                await analyze();
                show('dashboardView');
                setTab('keywords', false);
                return;
            }
            if (['extract', 'save'].includes(action)) {
                await api('API_SAVE_JOB', data);
                await loadOverview().catch(() => { $('retryJobsBtn').hidden = false; $('weeklyCard').hidden = true; });
                show('dashboardView');
                setTab('autofill');
                toast('Job saved to your tracker');
                return;
            }
            if (!await paid(actionNames[action]))
                return;
            const type = action === 'resume' ? 'API_GENERATE_RESUME' : action === 'letter' ? 'API_GENERATE_COVER_LETTER' : 'API_OUTREACH';
            if (['hr', 'email'].includes(action))
                data.action = action === 'hr' ? 'hr-message' : 'email';
            let r = await api(type, data);
            if (r.duplicate) {
                const goAhead = await askConfirm({
                    title: 'Already generated',
                    message: 'You already have a generated document for this job. Generate another one using your current profile?',
                    confirmLabel: 'Generate Again',
                    note: 'Generating again uses another credit and replaces what you have.',
                });
                if (!goAhead)
                    return;
                r = await api(type, { ...data, force: true });
            }
            showResult(action, r);
            await Promise.allSettled([refreshCredits(), loadOverview(), loadDocuments()]);
        });
    }
    /**
     * In-extension replacement for window.confirm().
     *
     * A native confirm() renders as a browser-chrome alert ("The extension
     * Vignova says..."), which looks like a security prompt rather than part
     * of the product — and it blocks the whole page while it is up. This uses
     * the same <dialog> styling as the rest of the panel.
     *
     * Resolves false on Cancel, on Esc, and on any other dismissal.
     */
    function askConfirm({ title, message, confirmLabel = 'Continue', note = '' } = {}) {
        const dialog = $('confirmDialog');
        $('confirmTitle').textContent = title || 'Are you sure?';
        $('confirmMessage').textContent = message || '';
        $('confirmOkLabel').textContent = confirmLabel;
        $('confirmNote').textContent = note;
        $('confirmNote').hidden = !note;
        VignovaIcons.render(dialog);

        return new Promise((resolve) => {
            let done = false;
            const finish = (value) => {
                if (done) return;
                done = true;
                if (dialog.open) dialog.close();
                resolve(value);
            };
            $('confirmOkBtn').onclick = () => finish(true);
            $('confirmCancelBtn').onclick = () => finish(false);
            dialog.addEventListener('close', () => finish(false), { once: true });
            dialog.showModal();
        });
    }

    function downloadPdf(base64, filename) {
        if (!base64)
            throw new Error('The server did not return a PDF. Please try again.');
        const bytes = Uint8Array.from(atob(base64.replace(/^data:.*?;base64,/, '')), c => c.charCodeAt(0)), url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), a = node('a');
        a.href = url;
        a.download = (filename || 'Vignova-document.pdf').replace(/[<>:"/\\|?*]/g, '_');
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    function showResult(action, r) {
        state.result = r;
        $('resultTitle').textContent = actionNames[action] + ' ready';
        $('resultNote').textContent = action === 'resume' ? (r.pdfBase64 ? 'Download your tailored resume and review it before applying.' : 'Your resume is saved. Open the Job Tracker to view it or retry its PDF download.') : 'Review and edit your draft before using it.';
        $('resultBody').hidden = action === 'resume';
        $('resultCopyBtn').hidden = action === 'resume';
        $('resultDownloadBtn').hidden = !r.pdfBase64;
        $('resultBody').value = [r.subject ? 'Subject: ' + r.subject : '', r.coverLetter || r.body || r.message || ''].filter(Boolean).join('\n\n');
        $('resultTrackerBtn').hidden = !r.jobId;
        show('resultView');
    }
    async function toggleAgent() {
        if (state.agentRunning) {
            await api('STOP_AGENT_ON_TAB');
            state.agentRunning = false;
            $('agentBtnText').textContent = 'Autofill';
            return;
        }
        if (!await paid('Autofill'))
            return;
        await busy('Starting autofill…', async () => {
            await currentTab();
            state.agentRunning = true;
            try { await api('START_AGENT_ON_TAB'); }
            catch (error) { state.agentRunning = false; throw error; }
            if (!state.agentRunning) return;
            $('agentBtnText').textContent = 'Stop';
            $('agentStatusText').textContent = 'Filling your application. Review all fields before submitting.';
            $('agentStatusText').hidden = false;
        });
    }
    function agentEvent(event) {
        if (!state.agentRunning && event?.status === 'stopped') return;
        if (!event)
            return;
        const type = event.status || event.type;
        if (['done', 'complete', 'completed', 'stopped', 'error'].includes(type)) {
            state.agentRunning = false;
            $('agentBtnText').textContent = 'Autofill';
        }
        const text = event.message || event.text;
        if (text) {
            $('agentStatusText').textContent = text;
            $('agentStatusText').hidden = false;
        }
    }
    function analytics() {
        show('analyticsView');
        const s = state.stats;
        if (!s) {
            $('analyticsPeriod').textContent = 'Could not load your activity. Try reopening this panel.';
            return;
        }
        $('analyticsPeriod').textContent = 'Week of ' + new Date(s.since).toLocaleDateString(undefined, { month: 'long', day: 'numeric', timeZone: 'UTC' }) + ' · UTC';
        $('analyticsRows').replaceChildren(...[['Jobs saved', s.saved], ['Applications', s.applications], ['Resumes tailored', s.resumes], ['Interviews', s.interviews]].map(([label, n]) => {
            const row = node('div', 'metric-row');
            row.append(node('span', '', label), node('strong', '', n));
            return row;
        }));
    }
    async function showLogin() {
        show('loginView');
        const r = await msg('WEB_SESSION_PROBE');
        const user = r?.user;
        if (user) {
            $('webSessionCard').hidden = false;
            $('webSessionName').textContent = user.name || user.email;
            $('webSessionEmail').textContent = user.email || '';
            $('webSessionAvatar').textContent = initials(user.name || user.email);
        }
    }
    async function bootstrap() {
        try {
            const update = await msg('GET_UPDATE_STATE');
            if (update?.blocked) {
                $('updateMessage').textContent = update.message || 'Install the latest extension to continue.';
                $('updateBtn').onclick = () => chrome.tabs.create({ url: safeUrl(update.installUrl) || 'https://chromewebstore.google.com/search/vignova' });
                show('updateView');
                return;
            }
            const auth = await msg('SYNC_AUTH');
            if (!auth?.isLoggedIn) {
                await showLogin();
                initialized = true;
                return;
            }
            const r = await msg('API_GET_STATUS');
            if (!r?.authenticated) {
                await showLogin();
                if (r?.error)
                    fail(new Error(r.error), 'loginError');
                initialized = true;
                return;
            }
            if (r.accessDenied)
                throw new Error('This account cannot access the extension. Please contact Vignova support.');
            renderPlan(r);
            show('dashboardView');
            const results = await Promise.allSettled([loadProfile(), loadOverview()]);
            if (results[0].status === 'rejected') {
                renderProfile();
                ['activeProfileSelect', 'profileSelect'].forEach(id => {
                    $(id).replaceChildren(node('option', '', 'Add a profile in Vignova'));
                    $(id).disabled = true;
                });
                fail(results[0].reason);
            }
            if (results[1].status === 'rejected') {
                $('recentJobsList').replaceChildren(node('p', 'empty', 'Your jobs could not be loaded. Retry or open the Job Tracker.'));
                $('retryJobsBtn').hidden = false;
                $('weeklyCard').hidden = true;
            }
            initialized = true;
        }
        catch (e) {
            show('loginView');
            fail(e, 'loginError');
            initialized = true;
        }
    }
    // Reload only this extension view; host pages stay in place. Old account data disappears immediately.
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !initialized || reloading)
            return;
        const u = changes.vignova_user;
        const identityChanged = changes.vignova_token && changes.vignova_token.oldValue !== changes.vignova_token.newValue;
        const planChanged = u && (u.oldValue?.email !== u.newValue?.email || u.oldValue?.plan !== u.newValue?.plan);
        if (identityChanged || planChanged) {
            reloading = true;
            document.body.style.visibility = 'hidden';
            location.reload();
        }
    });
    chrome.runtime.onMessage.addListener(message => {
        if (message.type === 'AGENT_UPDATE_STATUS')
            agentEvent(message.event);
    });
    window.addEventListener('message', event => {
        if (event.source === window.parent && event.data?.type === 'Vignova_AGENT_STATUS')
            agentEvent(event.data);
    });
    chrome.tabs.onUpdated.addListener((id, change) => {
        if (change.url && state.job?.tabId === id && change.url !== state.job.jobUrl) {
            state.job = null;
            state.keywords = null;
            ++state.revision;
            $('keywordJobTitle').textContent = 'Job changed';
            $('keywordJobCompany').textContent = 'Analyze the current job posting';
            renderKeywords();
        }
    });
    $('closeBtn').onclick = () => {
        if (window.parent !== window)
            window.parent.postMessage({ type: 'Vignova_CLOSE_DASHBOARD' }, '*');
        else
            window.close();
    };
    $('settingsBtn').onclick = () => openApp('/dashboard/extension');
    $('logoutBtn').onclick = () => busy('Signing out…', async () => {
        await api('SIGN_OUT');
        location.reload();
    });
    $('loginForm').onsubmit = event => {
        event.preventDefault();
        void busy('Signing in…', async () => {
            const r = await msg('API_LOGIN', { email: $('email').value.trim(), password: $('password').value });
            if (!r?.success) {
                fail(new Error(r?.error || 'Could not sign in.'), 'loginError');
                return;
            }
            location.reload();
        });
    };
    $('webSessionCard').onclick = () => busy('Connecting your account…', async () => {
        await api('WEB_SESSION_ADOPT');
        location.reload();
    });
    // The login page explicitly returns through the website session bridge, including after extension sign-out.
    for (const provider of ['google', 'linkedin'])
        $(provider + 'LoginBtn').onclick = async () => {
            await msg('BEGIN_WEB_SIGN_IN');
            await chrome.tabs.create({ url: APP + '/login' });
            toast('Complete sign-in in Vignova, then return to this panel.');
        };
    $('recheckVersionBtn').onclick = async () => {
        await chrome.runtime.sendMessage({ type: 'GET_UPDATE_STATE', force: true });
        location.reload();
    };
    document.querySelectorAll('[data-tab]').forEach(b => {
        b.onclick = () => setTab(b.dataset.tab);
        b.onkeydown = e => {
            if (!['ArrowLeft', 'ArrowRight'].includes(e.key))
                return;
            e.preventDefault();
            const list = [...document.querySelectorAll('[data-tab]')], next = list[(list.indexOf(b) + (e.key === 'ArrowRight' ? 1 : 2)) % 3];
            next.focus();
            setTab(next.dataset.tab);
        };
    });
    document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => {
        show('dashboardView');
    });
    for (const id of ['activeProfileSelect', 'profileSelect'])
        $(id).onchange = e => void switchProfile(e.target.value);
    $('copyAllBtn').onclick = () => copy(personalRows().filter(r => r[2]).map(r => r[1] + ': ' + r[2]).join('\n'));
    $('editProfileLink').onclick = () => openApp('/dashboard/profile');
    for (const id of ['jobTrackerLink', 'recentViewAllBtn', 'analyticsTrackerBtn'])
        $(id).onclick = () => openApp('/dashboard/jobs');
    $('analyticsBtn').onclick = analytics;
    $('retryJobsBtn').onclick = () => busy('Loading your jobs…', async () => { try { await loadOverview(); } catch(e) { $('retryJobsBtn').hidden = false; throw e; } });
    $('showAllToolsBtn').onclick = () => {
        const expanded = $('moreTools').hidden;
        $('moreTools').hidden = !expanded;
        $('showAllToolsBtn').setAttribute('aria-expanded', String(expanded));
        $('showAllToolsBtn').replaceChildren(document.createTextNode(expanded ? 'Show fewer tools' : 'Show all tools'), icon('arrow'));
    };
    $('supportedSitesList').textContent = 'LinkedIn, Indeed, Workday, Greenhouse, Lever, Ashby and other standard application forms. Custom forms may require manual input.';
    for (const [id, action] of Object.entries({ tailorResumeBtn: 'resume', coverLetterBtn: 'letter', extractJobBtn: 'extract', saveJobBtn: 'save', hrMessageBtn: 'hr', applyEmailBtn: 'email', updateResumeBtn: 'resume' }))
        $(id).onclick = () => void editJob(action);
    $('interviewPrepBtn').onclick = async () => { if (await paid('Interview Prep')) openApp('/dashboard/interview-prep'); };
    $('linkedinOptimizerBtn').onclick = async () => {
        if (await paid('LinkedIn Optimizer'))
            openApp('/dashboard/linkedin-optimizer');
    };
    $('checkKeywordBtn').onclick = () => setTab('keywords');
    $('analyzeBtn').onclick = () => void analyzeCurrent();
    $('pasteJobBtn').onclick = () => void editJob('analyze', true);
    $('startAgentBtn').onclick = () => void toggleAgent();
    $('jobEditorForm').onsubmit = submitJob;
    $('jobDescriptionInput').oninput = updateCharCount;
    $('resultCopyBtn').onclick = () => copy($('resultBody').value);
    $('resultDownloadBtn').onclick = () => {
        try {
            downloadPdf(state.result?.pdfBase64, state.result?.filename || 'Vignova-resume.pdf');
        }
        catch (e) {
            fail(e);
        }
    };
    $('resultTrackerBtn').onclick = () => openApp('/dashboard/jobs/' + encodeURIComponent(state.result.jobId));
    $('upgradeCloseBtn').onclick = () => $('upgradeDialog').close();
    $('upgradePlansBtn').onclick = () => openApp('/dashboard/billing');
    $('openSelectedJobBtn').onclick = () => { const url = safeUrl(state.selectedJobUrl); if (url) chrome.tabs.create({ url }); $('changeJobDialog').close(); };
    $('changeJobCloseBtn').onclick = () => $('changeJobDialog').close();
    $('changeJobBtn').onclick = () => {
        $('openSelectedJobBtn').hidden = true;
        $('jobChoices').replaceChildren(...state.jobs.filter(j => j.description?.length >= 50).map(j => jobRow(j, () => {
            $('changeJobDialog').close();
            selectJob(j);
            void analyzeCurrent();
        })));
        if (!$('jobChoices').children.length)
            $('jobChoices').append(node('p', 'empty', 'Open a posting or paste its description to check keywords.'));
        $('changeJobDialog').showModal();
    };
    $('useCurrentJobBtn').onclick = async () => {
        const button = $('useCurrentJobBtn');
        const original = button.innerHTML;
        button.disabled = true;
        button.replaceChildren(icon('refresh'), document.createTextNode(' Reading current page...'));
        state.job = null;
        try {
            const job = await readJob();
            selectJob(job);
            $('changeJobDialog').close();
            await analyzeCurrent();
        }
        catch (e) {
            const message = e?.message || 'The job description is not available yet. Open the full posting, wait for it to load, or paste the description.';
            $('jobChoices').replaceChildren(node('p', 'helper', message));
            $('openSelectedJobBtn').hidden = !state.selectedJobUrl;
            if (!$('changeJobDialog').open) $('changeJobDialog').showModal();
        }
        finally {
            button.disabled = false;
            button.innerHTML = original;
            VignovaIcons.render(button);
        }
    };
    $('usePastedJobBtn').onclick = () => {
        $('changeJobDialog').close();
        void editJob(state.pasteAction || 'analyze', true);
    };
    document.querySelectorAll('[data-keyword-filter]').forEach(b => b.onclick = () => {
        state.filter = b.dataset.keywordFilter;
        document.querySelectorAll('[data-keyword-filter]').forEach(el => {
            el.classList.toggle('active', el === b);
            el.setAttribute('aria-selected', String(el === b));
        });
        renderKeywords();
    });
    for (const kind of ['matched', 'missing'])
        $(kind + 'ViewAllBtn').onclick = () => {
            state.expanded[kind] = !state.expanded[kind];
            renderKeywords();
        };
    void bootstrap();
})();
