// Browser fixtures modeled on the live Monster DOM inspected on September 11, 2026.
const assert = require('node:assert/strict');
const path = require('node:path');
module.exports = async ({browser, worker, artifacts}) => {
    const searchUrl='https://www.monster.com/jobs/search?q=AI+Engineer&where=Dublin&page=1';
    const jobUrl='https://www.monster.com/job-openings/lead-ai-engineer--test-job-id';
    const title='Lead AI Engineer';
    const description='Build machine learning systems with Python and SQL. Deploy and monitor models using Docker and Kubernetes. Collaborate with a team of software engineers.';
    const logoUrl='https://media.newjobs.com/example-labs-logo.png';
    const page=await browser.newPage();
    await page.setViewport({width:1000,height:860});
    await page.setRequestInterception(true);
    page.on('request',r=>r.url().startsWith('chrome-extension://')?r.continue():r.respond({status:200,contentType:'text/html',body:`<!doctype html><html><body><h1>AI Engineer Jobs in Dublin</h1><div role="search"><input type="search" name="q"><input name="where"></div><article><a href="${jobUrl}">${title}</a><button id="select-job">View job</button></article><p>Results are not a job description.</p></body></html>`}));
    await page.goto(searchUrl);
    await page.bringToFront();
    await worker.evaluate(async()=>{await chrome.storage.local.set({vignova_ui_state:'maximized'});const [tab]=await chrome.tabs.query({active:true,currentWindow:true});await chrome.tabs.sendMessage(tab.id,{type:'EVALUATE_MOUNT_DASHBOARD'});});
    await page.waitForSelector('#vignova-dashboard-iframe');
    const popup=await (await page.$('#vignova-dashboard-iframe')).contentFrame();
    const idle=()=>popup.waitForFunction(()=>document.getElementById('busyOverlay').hidden&&!document.getElementById('dashboardView').hidden,{polling:100});
    await idle();
    await popup.waitForFunction(()=>document.getElementById('personalSectionBody').children.length>0,{polling:100});
    // No toolbar click or extra Monster scripting permission: read through the existing content script.
    await popup.click('#extractJobBtn');
    await popup.waitForFunction(()=>document.getElementById('changeJobDialog').open&&document.getElementById('busyOverlay').hidden,{polling:100});
    assert.equal(await popup.$eval('#jobEditorView',e=>e.hidden),true);
    assert.match(await popup.$eval('#jobChoices',e=>e.textContent),/Select a Monster job/);
    assert.equal(await popup.$eval('#openSelectedJobBtn',e=>e.hidden),true);
    await (await page.$('#vignova-dashboard-iframe')).screenshot({path:path.join(artifacts,'monster-search-guidance.png')});
    await popup.click('#usePastedJobBtn');
    await popup.waitForFunction(()=>!document.getElementById('jobEditorView').hidden&&document.getElementById('busyOverlay').hidden,{polling:100});
    assert.equal(await popup.$eval('#jobEditorHeading',e=>e.textContent),'Extract Job Details');
    assert.equal(await popup.$eval('#jobTitleInput',e=>e.value),''); // Explicit Paste is the only empty editor.
    await popup.click('#jobEditorView [data-back]');
    await page.click('#select-job');
    await popup.click('#extractJobBtn');
    await popup.waitForFunction(()=>document.getElementById('changeJobDialog').open&&document.getElementById('busyOverlay').hidden,{polling:100});
    assert.equal(await popup.$eval('#openSelectedJobBtn',e=>e.hidden),false);
    await popup.evaluate(()=>{window.openedJob=null;chrome.tabs.create=async data=>{window.openedJob=data.url;return {id:900};};});
    await popup.click('#openSelectedJobBtn');assert.equal(await popup.evaluate(()=>window.openedJob),jobUrl);
    // Monster renders a selected detail pane without changing the search URL.
    await page.evaluate(({title,description,logoUrl})=>{
        const duplicate=document.createElement('a');duplicate.href='/job-openings/another-role--different-job-id';duplicate.textContent=title;document.body.prepend(duplicate);
        const pane=document.createElement('section');pane.dataset.testid='svx-job-view-wrapper';
        pane.innerHTML='<h1 data-testid="jobTitle"></h1><img data-testid="companyLogo" alt="" src=""><span data-testid="company">Example Labs</span><li data-testid="jobDetailLocation">Dublin, Ireland</li><div data-testid="description-clamp-wrapper"></div>';
        pane.querySelector('img').src=logoUrl;
        pane.querySelector('h1').textContent=title;pane.lastElementChild.textContent=description;document.body.prepend(pane);
    },{title,description,logoUrl});
    await popup.click('#extractJobBtn');
    await popup.waitForFunction(()=>!document.getElementById('jobEditorView').hidden&&document.getElementById('busyOverlay').hidden,{polling:100});
    assert.equal(await popup.$eval('#jobTitleInput',e=>e.value),title);
    assert.equal(await popup.$eval('#jobCompanyInput',e=>e.value),'Example Labs');
    assert.equal(await popup.$eval('#jobLocationInput',e=>e.value),'Dublin, Ireland');
    assert.equal(await popup.$eval('#jobDescriptionInput',e=>e.value),description);
    await (await page.$('#vignova-dashboard-iframe')).screenshot({path:path.join(artifacts,'monster-extracted-job.png')});
    await popup.click('#jobEditorSubmit');await idle();
    const saved=await worker.evaluate(()=>globalThis.uiCalls.filter(c=>c.url.endsWith('/save-job')).at(-1).body);
    assert.equal(saved.jobUrl,jobUrl);assert.equal(saved.jobTitle,title);
    assert.equal(saved.companyLogo,logoUrl);
    // A search input alone must not be mistaken for an application form.
    const noForm=await popup.evaluate(()=>chrome.runtime.sendMessage({type:'START_AGENT_ON_TAB'}));
    assert.equal(noForm.success,false);assert.match(noForm.error,/Open an application form/);
    // A real local form fills from the selected profile and never clicks Continue or Submit.
    await page.evaluate(()=>{
        window.formClicks=0;const form=document.createElement('form');form.id='application-form';
        form.innerHTML='<section><h2>Name <span>*</span></h2><div><input class="name-part"><small>First Name</small></div><div><input class="name-part"><small>Last Name</small></div></section><label>E-mail <input type="email" id="email" name="email"></label><label>Phone Number <input id="phone" name="phone"></label><label>Cover Letter <textarea id="coverLetter"></textarea></label><label>Upload Resume <input id="resumeUpload" type="file" accept=".pdf,application/pdf"></label><label>Any Other Documents to Upload <input id="otherUpload" type="file"></label><button type="button">Continue</button><button type="button">Submit</button>';
        form.querySelectorAll('button').forEach(b=>b.onclick=()=>window.formClicks++);document.body.prepend(form);
    });
    await popup.click('#startAgentBtn');
    await page.waitForFunction(()=>document.querySelector('.name-part').value&&document.getElementById('email').value,{polling:100,timeout:15000});
    const filledNames = await page.$$eval('.name-part',els=>els.map(e=>e.value));
    assert.ok(filledNames[0] && filledNames[0] !== filledNames[1]);
    assert.equal(filledNames[1],'Davis');
    assert.equal(await page.$eval('#email',e=>e.value),'premium@test.invalid');
    assert.equal(await page.$eval('#coverLetter',e=>e.value),'');
    assert.equal(await page.$eval('#resumeUpload',e=>e.files.length),0);
    assert.equal(await page.$eval('#otherUpload',e=>e.files.length),0);
    assert.equal(await page.evaluate(()=>window.formClicks),0);
    await popup.waitForFunction(()=>document.getElementById('agentBtnText').textContent==='Autofill'&&document.getElementById('busyOverlay').hidden,{polling:100});
    assert.equal(await worker.evaluate(()=>globalThis.uiCalls.some(c=>c.body?.source==='extension-autofill')),false);
    // The same form in an iframe is discovered and targeted, not lost to a top-frame response race.
    await page.evaluate(()=>{const form=document.getElementById('application-form'),iframe=document.createElement('iframe');iframe.id='application-frame';iframe.srcdoc='<!doctype html><html><body>'+form.outerHTML+'</body></html>';form.remove();document.body.prepend(iframe);});
    const frame=await (await page.waitForSelector('#application-frame')).contentFrame();
    await frame.waitForSelector('#email');
    await popup.click('#startAgentBtn');
    await frame.waitForFunction(()=>document.getElementById('email').value==='premium@test.invalid',{polling:100,timeout:15000});
    await popup.waitForFunction(()=>document.getElementById('agentBtnText').textContent==='Autofill'&&document.getElementById('busyOverlay').hidden,{polling:100});
    // Structured data fallback on a dedicated posting, with malformed unrelated schema present.
    await page.evaluate(({jobUrl,title,description,logoUrl})=>{
        history.pushState({}, '', jobUrl);document.body.replaceChildren();
        for(const content of ['not JSON',JSON.stringify({'@context':'https://schema.org','@type':'JobPosting',title,hiringOrganization:{name:'Schema Company',logo:logoUrl},description:'<p>'+description+'</p>',jobLocation:{address:{addressLocality:'Dublin',addressCountry:'Ireland'}}})]){
            const schema=document.createElement('script');schema.type='application/ld+json';schema.textContent=content;document.body.append(schema);
        }
    },{jobUrl,title,description,logoUrl});
    const structured=await worker.evaluate(async()=>{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});return chrome.tabs.sendMessage(tab.id,{type:'EXTRACT_JOB_DETAILS'},{frameId:0});});
    assert.equal(structured.job.title,title);assert.equal(structured.job.company,'Schema Company');assert.equal(structured.job.description,description);assert.equal(structured.job.jobUrl,jobUrl);assert.equal(structured.job.companyLogo,logoUrl);
    console.log('PASS: Monster search guidance, explicit paste, selected-job link, populated details, saved company logo, canonical saved URL, no-form rejection, screenshot-style first/last labels, no automatic paid document generation, real top-frame and iframe autofill with no submission.');
    await page.close();
};
