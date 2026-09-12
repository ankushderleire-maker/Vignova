// Isolated Chrome for Testing; synthetic pages/accounts, no production login or API writes.
const puppeteer = require('../resume-saas-v4/node_modules/puppeteer-core');
const path = require('node:path');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = path.resolve(__dirname, '../Browser_Extension');

(async () => {
    const executablePath = process.env.CHROME_TEST_BINARY ||
        'C:/Users/hp/.cache/puppeteer/chrome/win64-145.0.7632.46/chrome-win64/chrome.exe';
    const profile = fs.mkdtempSync(path.resolve(__dirname, '../.extension-smoke-'));
    let browser;
    try {
        console.log('Launching isolated Chrome for Testing');
        browser = await puppeteer.launch({ executablePath, headless: true,
            args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`, '--disable-gpu'],
            ignoreDefaultArgs: ['--disable-extensions'], userDataDir: profile, timeout: 20000 });
        console.log('Browser launched; waiting for extension worker');
        const target = await browser.waitForTarget(t => t.type() === 'service_worker' && t.url().endsWith('/background/service-worker.js'));
        const worker = await target.worker();
        const extensionUrl = new URL(target.url());
        const extensionOrigin = `${extensionUrl.protocol}//${extensionUrl.host}`;
        console.log('Extension worker loaded');
        await worker.evaluate(() => {
            globalThis.activeProfile = 'profile-main'; globalThis.overviewAvailable = false; globalThis.uiCalls=[];
            globalThis.fetch = async (url, options = {}) => {
                const respond = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
                const id = options.headers?.Authorization?.replace('Bearer ', '');
                const body=options.body?JSON.parse(options.body):{};globalThis.uiCalls.push({url:String(url),id,body});
                if (url.includes('/session-token')) {
                    const cookies = await chrome.cookies.getAll({ url: 'https://app.vignova.io' });
                    const user = cookies.find(c => c.name === '__Secure-next-auth.session-token')?.value;
                    return user ? respond({ token: user, user: { email: user + '@test.invalid' } }) : respond({}, 401);
                }
                if (url.endsWith('/status')) return respond({ user: { email: id + '@test.invalid', name: id }, plan_type: id === 'premium' ? 'PREMIUM' : 'FREE', credits_remaining: 20, credits_total: 20, allProfiles: [] });
                if (url.endsWith('/agent-profile')) return respond({profileName:'Main Profile',profile:{first_name:activeProfile==='profile-main'?'Avery':'Taylor',last_name:'Davis',email:id+'@test.invalid',phone:'+353 01 555 0100',city:'Dublin',country:'Ireland',linkedin:'https://linkedin.com/in/avery-example',portfolio:'https://example.com',current_title:'Software Engineer',years_experience:3,work_authorized:'Yes',needs_sponsorship:'No',skills:['Python','Machine Learning','SQL','Docker'],education:[{degree:'BSc Computer Science',school:'Example University',start_date:'2018',end_date:'2022'}],experience:[{title:'Software Engineer',company:'Example Labs'}]}});
                if (url.endsWith('/profiles'))return respond({profiles:[{id:'profile-main',name:'Main Profile',is_default:activeProfile==='profile-main'},{id:'profile-alt',name:'Data Science Profile',is_default:activeProfile==='profile-alt'}]});
                if (url.endsWith('/set-profile')){globalThis.activeProfile=body.profileId;return respond({success:true});}
                if (url.endsWith('/overview')&&!globalThis.overviewAvailable)return new Response('<!doctype html>Not found',{status:404});
                if (url.endsWith('/overview'))return respond({jobs:[{id:'job1',jobTitle:'Machine Learning Engineer',company:'Example Labs',location:'Dublin, Ireland',description:'Build machine learning systems with Python and SQL. Work with Docker, Kubernetes, and model evaluation in a collaborative engineering team.',createdAt:new Date(Date.now()-7200000).toISOString(),status:'SAVED'},{id:'job2',jobTitle:'AI Research Engineer',company:'Research Studio',location:'Remote',createdAt:new Date(Date.now()-18000000).toISOString(),status:'SAVED',analyzed:true},{id:'job3',jobTitle:'Software Engineer',company:'Cloud Systems',location:'London',createdAt:new Date(Date.now()-86400000).toISOString(),hasResume:true,status:'SAVED'}],stats:{saved:12,applications:8,resumes:5,interviews:3,since:'2026-09-07T00:00:00.000Z',timezone:'UTC'}});
                if(url.endsWith('/score'))return respond({success:true,score:86,breakdown:{matching_keywords:['Python','Machine Learning','Deep Learning','NLP','LLMs','RAG','Data Analysis','SQL','AWS','Docker','FastAPI','Model Deployment','PyTorch','Scikit-learn','Pandas','NumPy','TensorFlow','Git','Linux','REST APIs','Statistics','Transformers','Embeddings','Data Pipelines','Testing','Monitoring','Communication','Problem Solving'],missing_keywords:['MLOps','Kubernetes','Snowflake','Airflow','Vector Database','LangChain','Prompt Engineering','Evaluation Metrics']}});
                if(url.endsWith('/documents'))return respond({success:true,documents:[{id:'doc1',type:'resume',name:'Software Engineer Resume',jobId:'job1',createdAt:new Date().toISOString()}]});
                if(url.includes('/documents/download'))return respond({success:true,pdfBase64:btoa('%PDF-1.4 test fixture'),filename:'Vignova-test.pdf'});
                if(url.endsWith('/save-job'))return respond({success:true,jobId:'job1'});
                if(['/generate','/cover-letter','/interview-prep','/outreach'].some(p=>url.endsWith(p))){if(id!=='premium')return respond({upgradeRequired:true,error:'Upgrade required'},402);return respond({success:true,jobId:'job1',pdfBase64:url.endsWith('/generate')?btoa('%PDF-1.4 test fixture'):undefined,coverLetter:url.endsWith('/cover-letter')?'Dear Hiring Team,\nI bring relevant Python and machine learning experience.':undefined,body:'Hello, I am interested in this role.',questions:[{question:'Describe how you would deploy and monitor a machine learning model.',tip:'Discuss validation, rollout, metrics and rollback.'}]});}
                if (url.endsWith('/recent-jobs')) return respond({ jobs: [{id:'job1',jobTitle:'Machine Learning Engineer',company:'Example Labs',createdAt:new Date().toISOString()}] });
                if (url.includes('/version')) return respond({ blocked: false });
                return respond({ success: true, profiles: [], documents: [] });
            };
        });
        const changeAccount = value => worker.evaluate(async value => {
            if (value) await chrome.cookies.set({ url: 'https://app.vignova.io', name: '__Secure-next-auth.session-token', value, secure: true, httpOnly: true });
            else await chrome.cookies.remove({ url: 'https://app.vignova.io', name: '__Secure-next-auth.session-token' });
        }, value);
        const boards = [];
        for (const [name, url, html] of [
            ['linkedin', 'https://www.linkedin.com/jobs/view/123/', '<div class="job-details-jobs-unified-top-card__title-container"><h1>Machine Learning Engineer</h1></div><div class="company-name">Example Labs</div><div class="location">Dublin, Ireland</div><div class="jobs-description__content">Build machine learning systems with Python and SQL. Work with Docker, Kubernetes, and model evaluation in a collaborative engineering team.</div>'],
            ['indeed', 'https://www.indeed.com/viewjob?jk=123', '<div class="jobsearch-JobInfoHeader-title-container"><h1>Engineer</h1></div><div id="jobDescriptionText">JavaScript developer</div>'],
        ]) {
            const page = await browser.newPage();
            page.on('pageerror', error => console.log(name + ' page error:', error.message));
            page.on('console', message => { if (message.type() === 'error') console.log(name + ' console:', message.text()); });
            await page.setRequestInterception(true);
            page.on('request', request => request.url().startsWith('chrome-extension://') ? request.continue() : request.respond({ status: 200, contentType: 'text/html', body: `<!doctype html><html><body>${html}</body></html>` }));
            await page.goto(url);
            await page.evaluate(() => { window.accountSmokeMarker = 'page was not refreshed'; });
            boards.push({ name, page });
        }
        await changeAccount('premium');
        console.log('Cookie set; awaiting paid buttons');
        console.log('Worker state:', await worker.evaluate(() => chrome.storage.local.get(['vignova_user', 'vignova_auth_source', 'vignova_web_session_key'])));
        for (const { name, page } of boards) await page.waitForFunction(name => {
            const button = document.getElementById(`vignova-${name}-tailor-btn`);
            return button && !button.classList.contains('vignova-btn-locked');
        }, { timeout: 15000, polling: 100 }, name).catch(async error => {
            console.log('Failure worker state:', await worker.evaluate(async () => ({ stored: await chrome.storage.local.get(null), probe: await probeWebSession(), cookies: await chrome.cookies.getAll({ url: 'https://app.vignova.io' }) })));
            console.log(name + ' fixture HTML:', await page.content());
            throw error;
        });

        console.log('Checking keyword badge');
        await boards[0].page.bringToFront();
        await boards[0].page.waitForFunction(()=>document.querySelector('.vignova-score-badge')?.textContent.includes('keywords'),{polling:100});
        await boards[0].page.hover('.vignova-score-badge');
        await boards[0].page.waitForSelector('.vg-mp-open');
        assert.equal(await boards[0].page.$eval('.vg-mp-title',e=>e.textContent),'Keyword Score');
        assert.equal((await boards[0].page.$$('.vg-mp-metric')).length,1);
        await boards[0].page.mouse.move(0,0);
        console.log('Keyword badge passed; checking panel');
        const host=boards[0].page;
        await host.setViewport({width:1000,height:860,deviceScaleFactor:1});
        await host.bringToFront();
        await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({active:true,currentWindow:true});await chrome.tabs.sendMessage(tabs[0].id,{type:'TOGGLE_DASHBOARD'});});
        await host.waitForSelector('#vignova-dashboard-iframe');
        const popup=await (await host.$('#vignova-dashboard-iframe')).contentFrame();
        const ready=async()=>popup.waitForFunction(()=>!document.getElementById('dashboardView').hidden&&!document.getElementById('busyOverlay').hidden===false&&document.getElementById('recentJobsList').querySelector('.recent-job')&&document.getElementById('personalSectionBody').children.length,{polling:100});
        await ready();
        const artifacts=path.resolve(__dirname,'artifacts/extension-v2');fs.mkdirSync(artifacts,{recursive:true});
        const screenshot=async name=>{await (await host.$('#vignova-dashboard-iframe')).screenshot({path:path.join(artifacts,name+'.png')});};
        assert.equal(await popup.$('#autoApplyBtn'),null);assert.equal(await popup.$('#jobAlertsBtn'),null);
        assert.equal(await popup.$eval('#weeklyCard',e=>e.hidden),true);
        assert.equal(await popup.$eval('#checkKeywordBtn strong',e=>e.textContent),'Keyword Score');
        assert.equal(await popup.$eval('#agentStatusText',e=>e.hidden),true);
        await screenshot('autofill-premium');
        await popup.click('#startAgentBtn');
        await popup.waitForFunction(()=>document.getElementById('busyOverlay').hidden&&!document.getElementById('panelError').hidden,{polling:100});
        assert.match(await popup.$eval('#panelError',e=>e.textContent),/Open an application form/);
        assert.equal(await popup.$eval('#agentBtnText',e=>e.textContent),'Autofill');
        await popup.click('#keywordsTab');
        await popup.waitForFunction(()=>document.getElementById('matchScore').textContent==='78%',{polling:100});
        assert.equal(await popup.$eval('#keywordJobTitle',e=>e.textContent),'Machine Learning Engineer');
        await popup.waitForFunction(()=>getComputedStyle(document.getElementById('copyToast')).opacity === '0',{polling:100});
        await screenshot('keywords');
        await popup.click('[data-keyword-filter="missing"]');
        assert.equal(await popup.$eval('#matchedCard',e=>e.hidden),true);
        await popup.click('[data-keyword-filter="all"]');
        assert.equal((await popup.$$('#matchedKeywords .keyword-chip')).length,28);
        await popup.click('[data-keyword-filter="match"]');
        await popup.click('#profileTab');
        await screenshot('profile');
        await host.$eval('#vignova-dashboard-iframe',el=>el.style.width='326px');
        assert.ok(await popup.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
        await screenshot('profile-326');
        await host.$eval('#vignova-dashboard-iframe',el=>el.style.width='100%');
        await popup.click('#copyAllBtn');
        await popup.waitForFunction(()=>document.getElementById('copyToast').textContent==='Copied to clipboard',{polling:100});
        await popup.select('#profileSelect','profile-alt');
        await popup.waitForFunction(()=>document.getElementById('personalSectionBody').textContent.includes('Taylor Davis')&&document.getElementById('busyOverlay').hidden,{polling:100});
        assert.equal(await popup.$eval('#keywordResultState',e=>e.hidden),true);
        await popup.click('#documentsSection summary');
        await popup.waitForSelector('#documentsSectionBody .document-row');
        assert.equal((await popup.$$('#documentsSectionBody .document-row')).length,1);
        await popup.click('#autofillTab');
        await popup.click('#extractJobBtn');
        await popup.waitForFunction(()=>!document.getElementById('jobEditorView').hidden&&document.getElementById('busyOverlay').hidden,{polling:100});
        assert.equal(await popup.$eval('#jobTitleInput',e=>e.value),'Machine Learning Engineer');
        await popup.click('#jobEditorSubmit');await ready();
        for(const [button,title] of [['tailorResumeBtn','Tailor Resume'],['coverLetterBtn','Cover Letter']]){
            await popup.click('#'+button);await popup.waitForFunction(()=>!document.getElementById('jobEditorView').hidden&&document.getElementById('busyOverlay').hidden,{polling:100});
            await popup.click('#jobEditorSubmit');await popup.waitForFunction(()=>!document.getElementById('resultView').hidden&&document.getElementById('busyOverlay').hidden,{polling:100});
            assert.equal(await popup.$eval('#resultTitle',e=>e.textContent),title+' ready');
            if(button==='coverLetterBtn')assert.match(await popup.$eval('#resultBody',e=>e.value),/Dear Hiring Team/);
            await popup.click('#resultView [data-back]');
        }
        await popup.click('#showAllToolsBtn');await popup.click('#applyEmailBtn');
        await popup.waitForFunction(()=>!document.getElementById('jobEditorView').hidden&&document.getElementById('busyOverlay').hidden,{polling:100});
        await popup.click('#jobEditorSubmit');await popup.waitForFunction(()=>!document.getElementById('resultView').hidden&&document.getElementById('busyOverlay').hidden,{polling:100});
        assert.match(await popup.$eval('#resultBody',e=>e.value),/interested in this role/);
        await popup.click('#resultView [data-back]');await popup.click('#showAllToolsBtn');
        await popup.evaluate(()=>{window.testOpenedTabs=[];chrome.tabs.create=async data=>{window.testOpenedTabs.push(data.url);return {id:999};};});
        await popup.click('#interviewPrepBtn');
        await popup.waitForFunction(()=>window.testOpenedTabs.length>0,{polling:100});
        assert.equal(await popup.evaluate(()=>window.testOpenedTabs.at(-1)),'https://app.vignova.io/dashboard/interview-prep');
        await popup.click('#linkedinOptimizerBtn');await popup.waitForFunction(()=>window.testOpenedTabs.length===2,{polling:100});
        assert.equal(await popup.evaluate(()=>window.testOpenedTabs.at(-1)),'https://app.vignova.io/dashboard/linkedin-optimizer');
        // When the overview backend is deployed, show its real activity metrics.
        await worker.evaluate(()=>{globalThis.overviewAvailable=true;});
        await popup.evaluate(()=>location.reload());
        await ready();
        await popup.waitForFunction(()=>!document.getElementById('weeklyCard').hidden&&document.getElementById('busyOverlay').hidden,{polling:100});
        await popup.click('#analyticsBtn');assert.equal((await popup.$$('#analyticsRows .metric-row')).length,4);
        await popup.click('#analyticsView [data-back]');
        await popup.waitForFunction(()=>document.getElementById('planBadge').textContent==='PREMIUM',{polling:100});
        await require('./extension-monster-smoke.cjs')({browser,worker,artifacts});
        await host.bringToFront();
        await worker.evaluate(()=>{globalThis.overviewAvailable=false;});
        await changeAccount('free');
        for (const { name, page } of boards) {
            await page.waitForFunction(name => document.getElementById(`vignova-${name}-tailor-btn`)?.classList.contains('vignova-btn-locked'), { timeout: 15000, polling: 100 }, name);
            assert.equal(await page.evaluate(() => window.accountSmokeMarker), 'page was not refreshed');
        }
        await popup.waitForFunction(() => document.getElementById('planBadge')?.textContent === 'FREE', { polling: 100 });
        await popup.waitForFunction(()=>document.getElementById('busyOverlay').hidden,{polling:100});
        await popup.click('#tailorResumeBtn');
        await popup.waitForFunction(()=>document.getElementById('upgradeDialog').open,{polling:100});
        await popup.click('#upgradeCloseBtn');
        await screenshot('autofill-free');
        const uiCalls=await worker.evaluate(()=>globalThis.uiCalls);
        assert.ok(!uiCalls.some(c=>c.url.endsWith('/interview-prep')||c.url.includes('/job-alerts')));
        assert.ok(uiCalls.some(c=>c.url.endsWith('/save-job')&&c.body.jobUrl==='https://www.linkedin.com/jobs/view/123/'));
        await popup.click('#profileTab');await popup.click('#documentsSection summary');await popup.waitForSelector('#documentsSectionBody .document-row');
        await popup.click('#documentsSectionBody .copy-button');
        await popup.waitForFunction(()=>document.getElementById('busyOverlay').hidden,{polling:100});
        assert.ok((await worker.evaluate(()=>globalThis.uiCalls)).some(c=>c.id==='free'&&c.url.includes('/documents/download')));
        assert.equal(uiCalls.filter(c=>c.id==='free'&&c.url.endsWith('/generate')).length,0);
        assert.equal(await popup.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'CHECK_AUTOFILL_ACCESS' })).success), false);
        await changeAccount(null);
        for (const { name, page } of boards) await page.waitForFunction(name => document.getElementById(`vignova-${name}-container`)?.textContent.includes('Login to Vignova'), { timeout: 15000, polling: 100 }, name);
        console.log('PASS: all three redesigned tabs, keyword filters, profile switching/copy, extraction/save, resume/letter/email actions, dashboard links, legacy job-list fallback, optional weekly activity and free document download passed with fixture APIs; real Chromium loaded the extension; Monster extraction, top-frame/iframe autofill and both open job-board fixtures locked paid buttons without navigation; the open panel changed PREMIUM -> FREE; logout cleared both boards; free autofill was denied.');
    } finally {
        if (browser) {
            const forceClose=setTimeout(()=>browser.process()?.kill(),5000);
            try { await browser.close(); } finally { clearTimeout(forceClose); }
        }
        // Only remove the unique test profile created directly under this workspace.
        if (path.dirname(profile) === path.resolve(__dirname, '..') && path.basename(profile).startsWith('.extension-smoke-')) {
            try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); }
            catch (_) { console.log('Temporary browser profile remains:', profile); }
        }
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
