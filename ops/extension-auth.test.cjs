const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
const root = path.resolve(__dirname, '../Browser_Extension');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function event() { const listeners = []; return { addListener: fn => listeners.push(fn), emit: (...args) => listeners.forEach(fn => fn(...args)), listeners }; }

function harness() {
    const state = {}, calls = [], broadcasts = [], notifications = {};
    let cookies = [], sessionFailure = false, statusFailure = false, override = null;
    const plans = { premium: 'PREMIUM', free: 'FREE' };
    const account = id => ({ user: { email: `${id}@example.test`, name: id }, plan_type: plans[id], credits_remaining: 20 });
    const storageChanged = event(), cookieChanged = event(), messages = event();
    const respond = (value, callback) => { const copy = structuredClone(value); if (callback) queueMicrotask(() => callback(copy)); return Promise.resolve(copy); };
    const chrome = {
        storage: { onChanged: storageChanged, local: {
            get(keys, cb) { return respond(keys === null ? state : Object.fromEntries((typeof keys === 'string' ? [keys] : keys).filter(k => k in state).map(k => [k, state[k]])), cb); },
            set(values, cb) { const changes = {}; for (const [key, value] of Object.entries(values)) {
                if (JSON.stringify(state[key]) !== JSON.stringify(value)) changes[key] = { oldValue: state[key], newValue: value };
                state[key] = structuredClone(value);
            } if (Object.keys(changes).length) storageChanged.emit(changes, 'local'); return respond(undefined, cb); },
            remove(keys, cb) { const changes = {}; for (const key of typeof keys === 'string' ? [keys] : keys) {
                if (key in state) { changes[key] = { oldValue: state[key] }; delete state[key]; }
            } if (Object.keys(changes).length) storageChanged.emit(changes, 'local'); return respond(undefined, cb); },
        } },
        cookies: { getAll: async () => structuredClone(cookies), onChanged: cookieChanged },
        tabs: { query: (_, cb) => cb([{ id: 1 }, { id: 2 }]), sendMessage: async (id, data) => { broadcasts.push({ id, ...data }); }, onUpdated: event() },
        permissions: { contains: async () => true },
        alarms: { create: async () => {}, onAlarm: event() },
        notifications: { onClicked: event(), getAll: async () => ({...notifications}), clear: async id => { delete notifications[id]; }, create: async (id, data) => { notifications[id]=data; } },
        runtime: { onMessage: messages, onInstalled: event(), getURL: file => 'chrome-extension://fixture/'+file, getManifest: () => ({ version: '1.4.0' }) },
        action: { onClicked: event() },
    };
    const result = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
    const context = vm.createContext({ chrome, console, crypto: webcrypto, TextEncoder, Uint8Array, setTimeout, clearTimeout, queueMicrotask,
        fetch: async (url, options = {}) => {
            const token = options.headers?.Authorization;
            calls.push({ url, token });
            if (override) { const answer = override(url, options); if (answer) return answer; }
            if (url.endsWith('/session-token')) {
                if (sessionFailure) throw Error('offline');
                const id = cookies[0]?.value;
                return id ? result({ token: id, user: account(id).user }) : result({}, 401);
            }
            const id = token?.replace('Bearer ', '');
            if (url.endsWith('/status')) return result(account(id), statusFailure ? 503 : 200);
            if (url.endsWith('/agent-profile')) return result({ profile: { owner: id } });
            if (url.endsWith('/recent-jobs')) return result({ jobs: [{ owner: id }] });
            if (url.endsWith('/config')) return result({ config: {} });
            if (url.endsWith('/generate')) return plans[id] === 'FREE' ? result({ upgradeRequired: true, plan: 'FREE' }, 402) : result({ success: true });
            return result({});
        },
    });
    context.importScripts = (...names) => names.forEach(name => vm.runInContext(read(`background/${name}`), context));
    vm.runInContext(read('background/service-worker.js'), context);
    const run = code => vm.runInContext(code, context);
    const settle = async () => { for (let i = 0; i < 12; i++) { await tick(); await run('authQueue'); } };
    const request = message => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(Error(`No reply: ${message.type}`)), 2500);
        messages.listeners[0](message, {}, value => { clearTimeout(timeout); resolve(value); });
    });
    function changeAccount(id, { emit = true, chunked = false } = {}) {
        const old = cookies[0];
        cookies = id ? [{ domain: '.app.vignova.io', name: `__Secure-next-auth.session-token${chunked ? '.0' : ''}`, value: id }] : [];
        if (emit && (cookies[0] || old)) cookieChanged.emit({ cookie: cookies[0] || old, removed: !id });
    }
    return { state, calls, broadcasts, notifications, chrome, context, plans, result, run, settle, request, changeAccount,
        override: fn => { override = fn; }, failSession: () => { sessionFailure = true; }, failStatus: () => { statusFailure = true; } };
}

test('premium to free updates two open tabs without a page or popup refresh', async () => {
    const h = harness(); h.changeAccount('premium'); await h.settle();
    assert.equal(h.state.vignova_user.plan, 'PREMIUM');
    h.state['https://www.linkedin.com/jobs/view/123/'] = { tailored: true };
    h.changeAccount('free'); await h.settle();
    assert.equal(h.state.vignova_token, 'free');
    assert.equal(h.state.vignova_user.plan, 'FREE');
    assert.equal(h.state.vignova_agent_profile.owner, 'free');
    assert.equal(h.state['https://www.linkedin.com/jobs/view/123/'], undefined);
    assert.ok([1, 2].every(id => h.broadcasts.some(b => b.id === id && b.type === 'AUTH_STATE_CHANGED')));
    const response = await h.request({ type: 'API_GENERATE_RESUME', data: {} });
    assert.equal(response.upgradeRequired, true);
    assert.equal(h.calls.filter(c => c.url.endsWith('/generate')).at(-1).token, 'Bearer free');
});

test('website logout clears premium token, user, profile, jobs and saved URL state', async () => {
    const h = harness(); h.changeAccount('premium'); await h.settle();
    h.changeAccount(null); await h.settle();
    for (const key of ['vignova_token', 'vignova_user', 'vignova_agent_profile', 'vignova_recent_jobs']) assert.equal(h.state[key], undefined);
    assert.equal((await h.request({ type: 'GET_AUTH_STATUS' })).isLoggedIn, false);
});

test('request reconciles missed cookie events after worker suspension', async () => {
    const h = harness(); h.changeAccount('premium'); await h.settle();
    h.changeAccount('free', { emit: false });
    const response = await h.request({ type: 'API_GENERATE_RESUME', data: {} });
    assert.equal(response.upgradeRequired, true);
    assert.equal(h.state.vignova_token, 'free');
});

test('chunked NextAuth cookies work and unrelated cookie events are ignored', async () => {
    const h = harness(); h.changeAccount('premium', { chunked: true }); await h.settle();
    assert.equal(h.state.vignova_token, 'premium');
    const epoch = h.run('authEpoch');
    h.chrome.cookies.onChanged.emit({ cookie: { domain: 'linkedin.com', name: 'next-auth.session-token', value: 'x' } });
    assert.equal(h.run('authEpoch'), epoch);
});

test('explicit extension logout survives website updates until Continue as is chosen', async () => {
    const h = harness(); h.changeAccount('premium'); await h.settle();
    await h.request({ type: 'SIGN_OUT' });
    h.changeAccount('free'); await h.settle();
    assert.equal(h.state.vignova_token, undefined);
    assert.equal((await h.request({ type: 'WEB_SESSION_ADOPT' })).success, true);
    assert.equal(h.state.vignova_token, 'free');
});

test('password-only extension login stays usable with no website session', async () => {
    const h = harness(); await h.run('signInWithToken("premium", {}, "password")');
    assert.equal((await h.request({ type: 'GET_AUTH_STATUS' })).isLoggedIn, true);
    h.changeAccount('free'); await h.settle();
    assert.equal(h.state.vignova_token, 'free');
});

test('session lookup failure after account switch never falls back to premium', async () => {
    const h = harness(); h.changeAccount('premium'); await h.settle();
    h.failSession(); h.changeAccount('free'); await h.settle();
    const response = await h.request({ type: 'API_GENERATE_RESUME', data: {} });
    assert.equal(response.success, false);
    assert.equal(h.state.vignova_token, undefined);
    assert.equal(h.calls.filter(c => c.url.endsWith('/generate')).length, 0);
});

test('late premium generation response cannot update the free user or reach the UI', async () => {
    const h = harness(); h.changeAccount('premium'); await h.settle();
    const pending = deferred(), started = deferred();
    h.override(url => { if (url.endsWith('/generate')) { started.resolve(); return pending.promise; } });
    const request = h.request({ type: 'API_GENERATE_RESUME', data: {} }); await started.promise;
    h.changeAccount('free'); await h.settle();
    pending.resolve(h.result({ success: true, credits_remaining: 999, privateResume: 'old account' }));
    const response = await request; await h.settle();
    assert.equal(response.authChanged, true);
    assert.equal(response.privateResume, undefined);
    assert.equal(h.state.vignova_user.credits_remaining, 20);
});

test('late cache warm cannot repopulate the previous account profile', async () => {
    const h = harness(); const pending = deferred(), started = deferred();
    h.override((url, options) => { if (url.endsWith('/agent-profile') && options.headers.Authorization === 'Bearer premium') { started.resolve(); return pending.promise; } });
    h.changeAccount('premium'); await started.promise;
    h.changeAccount('free'); await h.settle();
    pending.resolve(h.result({ profile: { owner: 'premium' } })); await h.settle();
    assert.equal(h.state.vignova_agent_profile.owner, 'free');
});

test('paid local features verify current plan and fail closed on status errors', async () => {
    const h = harness(); h.changeAccount('premium'); await h.settle();
    assert.equal((await h.request({ type: 'CHECK_AUTOFILL_ACCESS' })).success, true);
    h.plans.premium = 'FREE';
    assert.equal((await h.request({ type: 'CHECK_AUTOFILL_ACCESS' })).success, false);
    assert.equal((await h.request({ type: 'CHECK_PAID_ACCESS' })).success, false);
    h.failStatus();
    assert.equal((await h.request({ type: 'CHECK_AUTOFILL_ACCESS' })).success, false);
    assert.equal(h.state.vignova_token, undefined);
});

test('free account never reaches local autofill actions even with a cached premium profile', async () => {
    let profileRead = false, executed = false;
    const context = vm.createContext({ console, setTimeout, chrome: { runtime: { sendMessage: async () => ({ success: false }) },
        storage: { local: { get: () => { profileRead = true; } } } },
        window: { Vignova_Executor: { executeAll: () => { executed = true; } } },
    });
    vm.runInContext(read('agent/agentLoop.js'), context);
    await vm.runInContext('AgentLoop.start(() => {})', context);
    assert.equal(profileRead, false); assert.equal(executed, false);
});

test('executor stops the remaining batch when the session is invalidated', async () => {
    const context = vm.createContext({ console, setTimeout, window: {} });
    vm.runInContext(read('agent/executor.js'), context);
    const result = await vm.runInContext('ActionExecutor.executeAll([{ action: "unknown" }], 0, () => false)', context);
    assert.equal(result.success, 0); assert.equal(result.failed, 0);
});


test('profile switching discards a late response from the former profile',async()=>{
    const h=harness();h.changeAccount('premium');await h.settle();
    const pending=deferred();let started=false;
    h.override(url=>{if(url.endsWith('/agent-profile')){started=true;return pending.promise;}});
    const old=h.request({type:'API_AGENT_GET_PROFILE'});while(!started)await tick();
    h.run('++profileCacheVersion');pending.resolve(h.result({profile:{owner:'old-profile'}}));
    assert.equal((await old).success,false);assert.notEqual(h.state.vignova_agent_profile?.owner,'old-profile');
});
test('overview falls back to the deployed recent-jobs route without inventing stats', async()=>{
    const h=harness();h.changeAccount('free');await h.settle();
    h.override(url=>url.endsWith('/overview')?h.result({},404):null);
    const r=await h.request({type:'API_GET_OVERVIEW'});
    assert.equal(r.success,true);assert.equal(r.jobs[0].owner,'free');assert.equal(r.stats,null);
});
test('overview auth failure never falls back to a cached or older job list', async()=>{
    const h=harness();h.changeAccount('premium');await h.settle();const before=h.calls.length;
    h.override(url=>url.endsWith('/overview')?h.result({error:'Expired session'},401):null);
    const r=await h.request({type:'API_GET_OVERVIEW'});assert.equal(r.success,false);
    assert.equal(h.calls.slice(before).filter(c=>c.url.endsWith('/recent-jobs')).length,0);
});
test('overview response from a previous account never reaches the new account', async()=>{
    const h=harness();h.changeAccount('premium');await h.settle();const pending=deferred(),started=deferred();
    h.override(url=>{if(url.endsWith('/overview')){started.resolve();return pending.promise;}});
    const request=h.request({type:'API_GET_OVERVIEW'});await started.promise;h.changeAccount('free');await h.settle();
    pending.resolve(h.result({jobs:[{owner:'premium'}]}));const r=await request;
    assert.equal(r.authChanged,true);assert.equal(r.jobs,undefined);
});
test('autofill accepts field values but ignores remote submit and navigation commands',async()=>{
    const executed=[],clicked=[],statuses=[];
    const fields=[{selector:'#first',tag:'input',type:'text'}];
    const context=vm.createContext({console,setTimeout,chrome:{runtime:{sendMessage:async(message,cb)=>{const r=message.type==='API_AGENT_GET_PROFILE'?{success:true,profile:{first_name:'Avery'}}:{success:true};if(cb)cb(r);return r;}},storage:{local:{get:(keys,cb)=>{const value={};if(cb)cb(value);return Promise.resolve(value);}}}},window:{
        Vignova_Observer:{observe:()=>({fields,buttons:[{text:'Continue',selector:'#continue'},{text:'Submit',selector:'#submit'}],url:'https://example.test/apply'})},
        Vignova_ATSDetector:{detect:()=>null},Vignova_RuleEngine:{match:()=>({matched:[],unmatched:fields})},
        Vignova_Planner:{getBatchActions:async()=>[{action:'fill_input',selector:'#first',value:'Avery'},{action:'submit_form',selector:'#submit'},{action:'click_button',selector:'#continue'},{action:'fill_input',selector:'#unobserved',value:'private'}]},
        Vignova_Executor:{executeAll:async actions=>{executed.push(...actions);return {success:actions.length,failed:0};},clickButton:s=>clicked.push(s)}
    }});
    vm.runInContext(read('agent/agentLoop.js'),context);
    context.statuses=statuses;await vm.runInContext('AgentLoop.start(event=>statuses.push(event))',context);
    assert.equal(executed.length,1);assert.equal(executed[0].selector,'#first');assert.equal(clicked.length,0);
    assert.ok(statuses.some(s=>s.status==='done'&&s.message.includes('yourself')));
});
