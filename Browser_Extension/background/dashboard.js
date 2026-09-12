// The release must also work against the currently deployed API.
async function fetchDashboard(token) {
    const headers = { Authorization: `Bearer ${token}` };
    const overview = await fetch(`${Vignova_API_BASE}/api/extension/overview`, { headers, cache: 'no-store' });
    if (overview.ok) {
        const data = await overview.json();
        if (!Array.isArray(data.jobs)) throw new Error('Invalid job list returned by Vignova.');
        const stats = data.stats;
        const validStats = stats && ['saved', 'applications', 'resumes', 'interviews'].every(key => Number.isFinite(stats[key])) && Number.isFinite(Date.parse(stats.since));
        return { success: true, jobs: data.jobs, stats: validStats ? stats : null };
    }
    if (![404, 405, 501].includes(overview.status)) {
        const data = await overview.json().catch(() => ({}));
        return apiFailure(data, 'Could not load your jobs. Please retry.');
    }
    // Earlier deployed builds expose recent-jobs but have no weekly metrics.
    const recent = await fetch(`${Vignova_API_BASE}/api/extension/recent-jobs`, { headers, cache: 'no-store' });
    const data = await recent.json().catch(() => ({}));
    if (!recent.ok) return apiFailure(data, 'Could not load your jobs. Please retry.');
    if (!Array.isArray(data.jobs)) throw new Error('Invalid job list returned by Vignova.');
    return { success: true, jobs: data.jobs, stats: null };
}
function routeDashboardMessage(message, sender, reply, epoch) {
    if (message.type === 'GET_CONTEXT_TAB') {
        (async () => reply({ success: true, tab: sender.tab || (await chrome.tabs.query({ active: true, currentWindow: true }))[0] }))()
            .catch(() => reply({ success: false, error: 'No application tab is available.' }));
        return true;
    }
    if (message.type === 'BEGIN_WEB_SIGN_IN') {
        (async () => {
            await queueAuth(() => chrome.storage.local.remove(['vignova_signed_out', 'vignova_web_session_key']));
            await syncWebSession({ adopt: true });
            reply({ success: true });
        })().catch(error => reply({ success: false, error: error.message }));
        return true;
    }
    if (message.type !== 'API_GET_OVERVIEW') return false;
    (async () => {
        const stored = await chrome.storage.local.get('vignova_token');
        if (epoch !== authEpoch || !stored.vignova_token) throw new Error('Please sign in to Vignova.');
        reply(await fetchDashboard(stored.vignova_token));
    })().catch(error => reply({ success: false, error: error.message }));
    return true;
}
