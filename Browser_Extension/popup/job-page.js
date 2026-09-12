async function extractJobData(tab) {
    const message = { type: 'EXTRACT_JOB_DETAILS' };
    let response;
    try {
        // Reading through the already installed content script works on Monster
        // even when an automatically restored panel has no activeTab grant.
        response = await chrome.tabs.sendMessage(tab.id, message, { frameId: 0 });
    } catch {
        try {
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/jobExtractor.js'] });
            response = await chrome.tabs.sendMessage(tab.id, message, { frameId: 0 });
        } catch {
            throw new Error('Reload this job page once to connect the updated extension, then try Extract Job Details again.');
        }
    }
    if (!response?.success || !response.job) throw new Error(response?.error || 'The job page could not be read. Open a specific job and try again.');
    return response.job;
}
