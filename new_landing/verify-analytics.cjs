/* Offline behavior checks. No browser, cookies, or Google requests are used. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'analytics.js'), 'utf8');
const consentKey = 'vignova.consent.analytics';
const id = 'G-Z5QX5FCT9J';

function simulate({ hostname = 'vignova.io', stored, unavailableStorage = false } = {}) {
  const storage = new Map(stored ? [[consentKey, stored]] : []);
  const created = [];
  function element(tag) {
    const item = {
      tag, listeners: {}, children: [], dataset: {}, hidden: false,
      setAttribute(name, value) { this[name] = value; },
      addEventListener(name, fn) { this.listeners[name] = fn; },
      append(child) { this.children.push(child); },
      focus() { this.focused = true; },
      querySelectorAll() { return this.buttons || []; },
      querySelector() { return this.buttons?.[0]; },
    };
    if (tag === 'section') {
      item.buttons = ['denied', 'granted'].map(value => {
        const button = element('button');
        button.dataset.consent = value;
        return button;
      });
    }
    created.push(item);
    return item;
  }
  const footer = element('footer');
  const document = {
    title: 'Example guide | Vignova', head: element('head'), body: element('body'), listeners: {},
    createElement: element,
    querySelector: selector => selector === 'footer' ? footer : null,
    addEventListener(name, handler) { this.listeners[name] = handler; },
  };
  const window = {
    location: new URL(`https://${hostname}/blog/?utm_source=example`), listeners: {},
    addEventListener(name, handler) { this.listeners[name] = handler; },
  };
  const context = vm.createContext({
    window, document, URL, Date,
    localStorage: {
      getItem(key) { if (unavailableStorage) throw Error('Blocked'); return storage.get(key) ?? null; },
      setItem(key, value) { if (unavailableStorage) throw Error('Blocked'); storage.set(key, value); },
    },
  });
  vm.runInContext(source, context);
  const banner = created.find(item => item.tag === 'section');
  const commands = () => (window.dataLayer || []).map(args => Array.from(args));
  const events = name => commands().filter(args => args[0] === 'event' && args[1] === name);
  const choose = value => banner.buttons.find(button => button.dataset.consent === value).listeners.click();
  const click = (href, selector) => {
    const link = { href, closest: test => test === selector ? { id: 'extension' } : null };
    document.listeners.click({ target: { closest: () => link } });
  };
  return { window, document, banner, storage, commands, events, choose, click, context,
    scripts: () => document.head.children.filter(item => item.tag === 'script') };
}

const fresh = simulate();
assert.equal(fresh.scripts().length, 0);
assert.equal(fresh.commands().length, 0);
assert.equal(fresh.banner.hidden, false);
fresh.choose('denied');
assert.equal(fresh.storage.get(consentKey), 'denied');
assert.equal(fresh.scripts().length, 0);
fresh.choose('granted');
assert.equal(fresh.scripts().length, 1);
assert.equal(fresh.scripts()[0].src, `https://www.googletagmanager.com/gtag/js?id=${id}`);
const commands = fresh.commands();
assert.equal(commands[0][0], 'consent');
assert.equal(commands[0][1], 'default');
for (const key of ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization']) {
  assert.equal(commands[0][2][key], 'denied');
}
assert.equal(commands[1][2].analytics_storage, 'granted');
assert.equal(commands.find(args => args[0] === 'config')[2].send_page_view, false);
assert.equal(fresh.events('page_view').length, 1);
fresh.click('https://app.vignova.io/register', '.hero');
assert.equal(fresh.events('sign_up_click')[0][2].location, 'hero');
fresh.click('https://chromewebstore.google.com/detail/example', '#extension');
assert.equal(fresh.events('extension_install_click')[0][2].location, 'extension_section');
fresh.choose('denied');
assert.equal(fresh.window['ga-disable-' + id], true);
fresh.click('https://app.vignova.io/register', '.hero');
assert.equal(fresh.events('sign_up_click').length, 1);
fresh.choose('granted');
assert.equal(fresh.scripts().length, 1);
assert.equal(fresh.events('page_view').length, 1);
vm.runInContext(source, fresh.context);
assert.equal(fresh.scripts().length, 1, 'Repeated script inclusion must not duplicate tracking');

const returning = simulate({ stored: 'granted' });
assert.equal(returning.banner.hidden, true);
assert.equal(returning.events('page_view').length, 1);
assert.equal(returning.scripts().length, 1);
assert.equal(simulate({ stored: 'denied' }).scripts().length, 0);
const local = simulate({ hostname: '127.0.0.1', stored: 'granted' });
assert.equal(local.scripts().length, 0);
assert.equal(local.events('page_view').length, 0);
assert.equal(simulate({ hostname: 'preview.vignova.io', stored: 'granted' }).scripts().length, 0);
const blocked = simulate({ unavailableStorage: true });
blocked.choose('granted');
assert.equal(blocked.scripts().length, 1);
returning.storage.set(consentKey, 'denied');
returning.window.listeners.storage({ key: consentKey });
returning.click('https://app.vignova.io/register', '.hero');
assert.equal(returning.events('sign_up_click').length, 0);
console.log('Analytics verified: consent, persisted choices, revocation, event names, no duplicate page views, blocked storage and production-only loading. No network calls.');
