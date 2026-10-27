// Executes the real compiled ps.js against a small in-memory DOM and SDK contract.
// These are application logic tests, not browser rendering or live Supabase Auth tests.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const root = resolve(__dirname, '..');

class Element {
    constructor(tag = 'div') {
        this.tagName = tag.toLowerCase(); this.childNodes = []; this.parent = null;
        this.attributes = {}; this.dataset = {}; this.listeners = {}; this.hidden = false;
        this.disabled = false; this.value = ''; this.checked = false; this.open = false;
        this._text = ''; this.className = '';
        this.classList = { add: c => { this.className = [...new Set([...this.className.split(' '), c])].join(' '); },
            remove: c => { this.className = this.className.split(' ').filter(v => v !== c).join(' '); } };
    }
    get children() { return this.childNodes.filter(n => n.tagName !== '#text'); }
    get textContent() { return this._text + this.childNodes.map(n => n.textContent).join(''); }
    set textContent(text) { this._text = String(text); this.childNodes = []; }
    append(...nodes) { for (let n of nodes) { if (typeof n === 'string') { const t = new Element('#text'); t._text = n; n = t; } n.parent = this; this.childNodes.push(n); } }
    replaceChildren(...nodes) { this._text = ''; this.childNodes = []; this.append(...nodes); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    addEventListener(name, fn) { (this.listeners[name] ??= []).push(fn); }
    async emit(name) { const event = { currentTarget: this, target: this, preventDefault() {} }; await Promise.all((this.listeners[name] ?? []).map(fn => fn(event))); }
    click() { if (!this.disabled) return this.emit('click'); }
    focus() {}
    showModal() { this.open = true; }
    close() { this.open = false; void this.emit('close'); }
    reportValidity() { return true; }
    matches(selector) { return selector.startsWith('.') ? this.className.split(/\s+/).includes(selector.slice(1)) : this.tagName === selector; }
    closest(selector) { for (let n = this; n; n = n.parent) if (n.matches(selector)) return n; return null; }
    querySelectorAll(selector) {
        const parts = selector.split(' '), all = [];
        const visit = node => { for (const child of node.children) { all.push(child); visit(child); } };
        visit(this);
        return all.filter(node => {
            if (!node.matches(parts.at(-1))) return false;
            let parent = node.parent;
            for (let i = parts.length - 2; i >= 0; i--) { while (parent && !parent.matches(parts[i])) parent = parent.parent; if (!parent) return false; parent = parent.parent; }
            return true;
        });
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}
class Input extends Element {}
class TextArea extends Element {}
class Select extends Element {}
class Progress extends Element {}
class Form extends Element {}
class Dialog extends Element {}
function dom() {
    const document = new Element('#document'), ids = new Map(), stack = [document];
    const classes = { input: Input, textarea: TextArea, select: Select, progress: Progress, form: Form, dialog: Dialog };
    const html = readFileSync(resolve(root, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    for (const token of html.match(/<[^>]+>|[^<]+/g)) {
        if (token.startsWith('<!')) continue;
        if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
        if (token.startsWith('<')) {
            const tag = token.match(/^<([\w-]+)/)?.[1]; if (!tag) continue;
            const node = new (classes[tag] ?? Element)(tag);
            for (const match of token.slice(tag.length + 1, -1).matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
                const [, name, a, b, c] = match, value = a ?? b ?? c ?? '';
                node.attributes[name] = value;
                if (name === 'class') node.className = value;
                if (name === 'id') ids.set(value, node);
                if (['value', 'type', 'name'].includes(name)) node[name] = value;
                if (['hidden', 'disabled', 'required', 'checked'].includes(name)) node[name] = true;
            }
            stack.at(-1).append(node);
            if (!['input', 'img', 'meta', 'link', 'br', 'hr'].includes(tag)) stack.push(node);
        } else stack.at(-1).append(token);
    }
    for (const select of document.querySelectorAll('select')) select.value = (select.children.find(n => 'selected' in n.attributes) ?? select.children[0])?.value ?? '';
    document.getElementById = id => ids.get(id) ?? null;
    document.createElement = tag => new (classes[tag] ?? Element)(tag);
    document.body = document.querySelector('body');
    return { document, ids };
}
const user = id => ({ user: { id, user_metadata: { display_name: 'Metadata ' + id } } });
function backend(initial = null) {
    const state = { session: initial, callback: null, calls: [], failTask: false, failReport: false,
        holdReadA: null, heldReads: [], holdReport: false, heldReports: [], signup: null };
    const tables = {
        site_updates: [],
        profiles: ['A', 'B'].map(id => ({ id, display_name: 'User ' + id })),
        projects: ['A', 'B'].map(id => ({ id: 'project-' + id, owner_id: id, title: 'Project ' + id,
            description: 'Description ' + id, source_card: 1, archived: false, created_at: '2026-10-22T00:00:00Z' })),
        project_tasks: ['A', 'B'].flatMap(id => Array.from({ length: 5 }, (_, i) => ({ id: `task-${id}-${i}`, project_id: 'project-' + id, owner_id: id, position: i + 1, title: 'Task ' + i, is_completed: i === 1 || i === 2 }))),
        code_reports: ['A', 'B'].map(id => ({ id: 'report-' + id, owner_id: id, project_id: 'project-' + id, title: 'Report ' + id,
            code_snippet: '<script>not executed</script>', change_request: '', results_text: 'Note ' + id, created_at: '2026-10-22T00:00:00Z' }))
    };
    let sequence = 1;
    class Query {
        constructor(table) { this.table = table; this.filters = []; this.operation = 'select'; this.start = 0; this.end = Infinity; }
        select() { return this; }
        insert(value) { this.operation = 'insert'; this.value = value; return this; }
        update(value) { this.operation = 'update'; this.value = value; return this; }
        eq(key, value) { this.filters.push([key, value]); return this; }
        order() { return this; }
        range(a, b) { this.start = a; this.end = b; return this; }
        single() { this.one = true; return this; }
        then(resolvePromise, reject) { return Promise.resolve().then(async () => {
            state.calls.push({ table: this.table, operation: this.operation, filters: this.filters, value: this.value });
            if (this.operation === 'select' && this.table === 'projects' && this.filters.some(([k, v]) => k === 'owner_id' && v === 'A') && state.holdReadA) await new Promise(resolve => state.heldReads.push(resolve));
            if (this.operation === 'insert' && this.table === 'code_reports' && state.holdReport) await new Promise(resolve => state.heldReports.push(resolve));
            if ((this.table === 'project_tasks' && this.operation === 'update' && state.failTask) || (this.table === 'code_reports' && this.operation === 'insert' && state.failReport)) return { data: null, error: { code: '42501', message: 'permission denied' } };
            let rows = tables[this.table].filter(row => this.filters.every(([k, v]) => row[k] === v));
            if (this.operation === 'insert') {
                const row = { id: 'new-' + sequence++, owner_id: state.session?.user.id, title: 'تقرير تطوير الكود', created_at: new Date().toISOString(), ...this.value };
                if (this.table === 'projects') { row.archived = false; tables.project_tasks.push(...Array.from({ length: 5 }, (_, i) => ({ id: 'new-task-' + sequence++, owner_id: row.owner_id, project_id: row.id, position: i + 1, title: 'New task ' + i, is_completed: false }))); }
                tables[this.table].unshift(row); rows = [row];
            }
            if (this.operation === 'update') for (const row of rows) Object.assign(row, this.value);
            rows = structuredClone(rows.slice(this.start, this.end + 1));
            return { data: this.one ? rows[0] ?? null : rows, error: null };
        }).then(resolvePromise, reject); }
    }
    const auth = {
        getSession: async () => ({ data: { session: state.session }, error: null }),
        onAuthStateChange: callback => { state.callback = callback; queueMicrotask(() => {
            callback('INITIAL_SESSION', state.session);
            if (state.burstSession) { state.session = user(state.burstSession); callback('SIGNED_IN', state.session); }
        }); },
        signInWithPassword: async () => { state.session = user('A'); state.callback('SIGNED_IN', state.session); return { data: { session: state.session }, error: null }; },
        signUp: async credentials => { state.signup = credentials; return { data: { session: null }, error: null }; },
        signOut: async () => { state.session = null; state.callback('SIGNED_OUT', null); return { error: null }; }
    };
    state.events=[];
    return { state, tables, auth, rpc(name,args) { if(name==='if_start_classified_project'){const previous=tables.projects.find(p=>p.owner_id===state.session?.user.id&&!p.archived);if(previous&&args.p_previous!==previous.id)return Promise.resolve({data:null,error:{message:'active_project_exists'}});if(previous){tables.projects=tables.projects.filter(p=>p.id!==previous.id);tables.project_tasks=tables.project_tasks.filter(t=>t.project_id!==previous.id);}return new Query('projects').insert({title:args.p_title,description:args.p_description,source_card:args.p_source}).select().single();}if(name==='if_save_development'){return new Query('code_reports').insert({title:'تطوير محفوظ',project_id:args.p_project,code_snippet:args.p_code,results_text:args.p_rendered,results:{kind:'gemini_review',workflow_state:'active',data:args.p_output}}).select().single();}if(name==='if_finish_development'){const row=tables.code_reports.find(r=>r.id===args.p_report&&r.owner_id===state.session?.user.id);if(!row)return Promise.resolve({data:null,error:{message:'denied'}});row.results.workflow_state='completed';return Promise.resolve({data:structuredClone(row),error:null});}if(name==='if_complete_project'){const p=tables.projects.find(p=>p.id===args.p_project);const tasks=tables.project_tasks.filter(t=>t.project_id===p?.id);if(!p||tasks.length!==5||tasks.some(t=>!t.is_completed))return Promise.resolve({data:null,error:{message:'project_steps_incomplete'}});p.archived=true;return Promise.resolve({data:structuredClone(p),error:null});}return {then(resolve) {state.events.push({name,args});return Promise.resolve({data:null,error:null}).then(resolve);}};}, from: table => new Query(table), emit(id) { state.session = id ? user(id) : null; state.callback(id ? 'SIGNED_IN' : 'SIGNED_OUT', state.session); } };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 15));
async function app(initial = null, sdk = true, suppliedBackend = null) {
    const tree = dom(), api = suppliedBackend ?? backend(initial);
    const sessionValues=new Map();let redirected='';
    const context = { document: tree.document, HTMLElement: Element, HTMLInputElement: Input,
        HTMLTextAreaElement: TextArea, HTMLSelectElement: Select, HTMLProgressElement: Progress,
        TextEncoder, URL, URLSearchParams, setTimeout, console,fetch:(...args)=>api.state.fetch(...args),confirm:()=>!!api.state.confirmReplace,
        sessionStorage:{getItem(key){return sessionValues.get(key)??null;},setItem(key,value){sessionValues.set(key,value);},removeItem(key){sessionValues.delete(key);}},crypto:{randomUUID:()=> '1b45d9c2-0ba7-48d7-8da5-165ac00f5831'},
        location: { protocol: 'http:', origin: 'http://127.0.0.1:3000', pathname: '/', search: '', hash: '',assign(value){redirected=value;} },
        localStorage: { getItem() { return null; }, setItem() {} } };
    context.window = context;
    if (sdk) context.supabase = { createClient: () => api };
    vm.createContext(context);
    vm.runInContext(readFileSync(resolve(root, 'supabase-config.js'), 'utf8'), context);
    vm.runInContext(readFileSync(resolve(root, 'ps.js'), 'utf8'), context);
    await settle();
    return { ...tree, api, context, ai:context.IdeaForgeAI, sessionValues,redirect:()=>redirected, get: id => tree.ids.get(id), buttons: tree.document.querySelectorAll('.choose-idea') };
}

test('guest can analyze but cannot persist a report', async () => {
    const a = await app(); a.get('code-snippet').value = 'var x = 1;';
    await a.get('analyze-code').click();
    assert.match(a.get('code-results').textContent, /var/);
    assert.equal(a.api.state.calls.filter(call => call.table !== 'site_updates').length, 0);
    await a.get('save-report').click(); assert.equal(a.get('auth-dialog').open, true);
});

test('SDK RPC thenables record only categorical events without interrupting session restoration',async()=>{
    const a=await app(user('A'));assert.equal(a.get('account-name').textContent,'User A');assert.equal(a.api.state.events[0].args.p_event,'page_view');assert.deepEqual(Object.keys(a.api.state.events[0].args).sort(),['p_event','p_page','p_visit_id']);
});

test('ordinary login automatically recognizes admin credentials without a visible admin choice',async()=>{
    const api=backend(),base=api.rpc;api.rpc=(name,args)=>name==='if_admin_login'?Promise.resolve({data:{ok:true,token:'opaque-test-admin-token'},error:null}):base(name,args);
    api.auth.signInWithPassword=async()=>({data:null,error:{message:'Invalid login credentials'}});
    const a=await app(null,true,api);await a.get('open-auth').click();assert.equal(a.get('auth-email').type,'text');assert.equal(a.get('auth-admin'),undefined);
    a.get('auth-email').value='A.N';a.get('auth-password').value='temporary-test-input';await a.get('auth-form').emit('submit');assert.equal(a.redirect(),'admin.html');assert.equal(a.sessionValues.get('ideaforge:admin-session'),'opaque-test-admin-token');assert.equal(a.get('auth-password').value,'');assert.equal(api.state.session,null);
});

test('rejected automatic admin login cannot create a token or redirect and signup requires email',async()=>{
    const api=backend(),base=api.rpc;api.rpc=(name,args)=>name==='if_admin_login'?Promise.resolve({data:{ok:false,code:'invalid_credentials'},error:null}):base(name,args);
    api.auth.signInWithPassword=async()=>({data:null,error:{message:'Invalid login credentials'}});
    const a=await app(null,true,api);a.get('auth-email').value='A.N';a.get('auth-password').value='temporary-test-input';await a.get('auth-form').emit('submit');assert.equal(a.redirect(),'');assert.equal(a.sessionValues.has('ideaforge:admin-session'),false);assert.equal(a.get('auth-password').value,'');await a.get('auth-signup').click();assert.equal(a.get('auth-email').type,'email');
});

test('public login exposes no owner creation form', async()=>{ const a=await app();assert.equal(a.get('inline-owner-form'),undefined);assert.equal(a.get('owner-setup-trigger'),undefined); });

test('normal account login opens administration only when the authenticated server grants its role',async()=>{
 const api=backend(),base=api.rpc;api.rpc=(name,args)=>name==='if_admin_login_with_account'?Promise.resolve({data:{ok:true,token:'normal-account-admin-session'},error:null}):base(name,args);
 const a=await app(null,true,api);a.get('auth-email').value='owner@ideaforge.invalid';a.get('auth-password').value='existing-normal-account-password';await a.get('auth-form').emit('submit');assert.equal(a.redirect(),'admin.html');assert.equal(api.state.session.user.id,'A');assert.equal(a.sessionValues.get('ideaforge:admin-session'),'normal-account-admin-session');assert.equal(a.get('auth-password').value,'');
});

test('typing an owner-like email does not elevate a regular account without a server role',async()=>{
 const api=backend(),base=api.rpc;api.rpc=(name,args)=>name==='if_admin_login_with_account'?Promise.resolve({data:{ok:false},error:null}):base(name,args);
 const a=await app(null,true,api);a.get('auth-email').value='owner@ideaforge.invalid';a.get('auth-password').value='existing-normal-account-password';await a.get('auth-form').emit('submit');assert.equal(a.redirect(),'');assert.equal(a.sessionValues.has('ideaforge:admin-session'),false);assert.equal(api.state.session.user.id,'A');
});



test('public published updates render as text without exposing private data', async () => {
    const api=backend(); api.tables.site_updates.push({id:'public-update',title:'<script>plain title</script>',body:'<img src=x onerror=alert(1)>',published:true},{id:'draft',title:'Private draft',body:'Hidden',published:false});
    const a=await app(null,true,api); assert.equal(a.get('site-updates').hidden,false);assert.match(a.get('site-updates-list').textContent,/<script>plain title<\/script>/);assert.doesNotMatch(a.get('site-updates-list').textContent,/Private draft/);
});
test('restores profile, projects, tasks and reports from the SDK session', async () => {
    const a = await app(user('A'));
    assert.equal(a.get('account-name').textContent, 'User A');
    assert.equal(a.get('workspace-title').textContent, 'Project A');
    assert.equal(a.get('workspace-tasks').children.length, 5);
    assert.match(a.get('workspace-progress-text').textContent, /^2 من 5/);
    assert.match(a.get('workspace-reports').textContent, /Report A/);
    assert.doesNotMatch(a.get('workspace-reports').textContent, /Report B/);
    assert.equal(a.get('workspace-reports').querySelectorAll('script').length, 0);
});
test('reselecting a saved idea reuses it; a new idea inserts one project only', async () => {
    const api=backend(user('A'));api.tables.projects[0].archived=true;const a = await app(null,true,api); await a.buttons[0].click(); await settle();
    assert.equal(a.api.state.calls.filter(c => c.operation === 'insert').length, 0);
    const first = a.buttons[1].click(), repeated = a.buttons[1].click(); await Promise.all([first, repeated]); await settle();
    assert.equal(a.api.state.calls.filter(c => c.table === 'projects' && c.operation === 'insert').length, 1);
    assert.equal(a.api.state.calls.filter(c => c.table === 'project_tasks' && c.operation === 'insert').length, 0);
    assert.equal(a.get('workspace-tasks').children.length, 5);
});
test('task progress changes only after success and rolls back on failure', async () => {
    const a = await app(user('A')), box = a.get('workspace-tasks').querySelector('input');
    box.checked = true; await box.emit('change'); await settle();
    assert.match(a.get('workspace-progress-text').textContent, /^3 من 5/);
    a.api.state.failTask = true; box.checked = false; await box.emit('change'); await settle();
    assert.equal(box.checked, true); assert.match(a.get('workspace-progress-text').textContent, /^3 من 5/);
    assert.equal(a.get('workspace-status').dataset.error, 'true');
});
test('analysis saves one report and duplicate analysis does not insert again', async () => {
    const a = await app(user('A')); a.get('code-snippet').value = 'var x = 1;';
    await a.get('analyze-code').click(); await settle();
    assert.match(a.get('report-save-status').textContent, /تم حفظ/);
    await a.get('analyze-code').click(); await settle();
    assert.equal(a.api.state.calls.filter(c => c.table === 'code_reports' && c.operation === 'insert').length, 1);
    assert.equal(a.get('save-report').hidden, true);
});
test('failed report write keeps the result and offers a working retry', async () => {
    const a = await app(user('A')); a.api.state.failReport = true;
    a.get('code-snippet').value = 'console.log(1)'; await a.get('analyze-code').click(); await settle();
    assert.equal(a.get('save-report').hidden, false); assert.equal(a.get('code-results').hidden, false);
    assert.equal(a.get('report-save-status').dataset.error, 'true');
    a.api.state.failReport = false; await a.get('save-report').click(); await settle();
    assert.match(a.get('report-save-status').textContent, /تم حفظ/);
});
test('a delayed response from the previous account cannot overwrite the new account', async () => {
    const api = backend(user('A')); api.state.holdReadA = true;
    const a = await app(null, true, api); api.emit('B'); await settle();
    for (const release of api.state.heldReads) release(); await settle();
    assert.equal(a.get('account-name').textContent, 'User B');
    assert.equal(a.get('workspace-title').textContent, 'Project B');
    assert.doesNotMatch(a.get('workspace-reports').textContent, /Report A/);
});
test('sign out clears private content even when a report response arrives late', async () => {
    const a = await app(user('A')); a.api.state.holdReport = true;
    a.get('code-snippet').value = 'var privateCode = 1;'; await a.get('analyze-code').click(); await settle();
    await a.get('sign-out').click();
    for (const release of a.api.state.heldReports) release(); await settle();
    assert.equal(a.get('workspace-title').textContent, ''); assert.equal(a.get('workspace-description').textContent, '');
    assert.equal(a.get('workspace-reports').children.length, 0); assert.equal(a.get('code-snippet').value, '');
    assert.equal(a.get('account-name').textContent, 'زائر');
});
test('an account switch before scheduled loading cannot block the new workspace', async () => {
    const api = backend(user('A')); api.state.burstSession = 'B';
    const a = await app(null, true, api);
    assert.equal(a.get('account-name').textContent, 'User B');
    assert.equal(a.get('workspace-title').textContent, 'Project B');
    assert.equal(a.buttons[0].disabled, false);
    assert.equal(api.state.calls.filter(c => c.table === 'projects' && c.filters.some(([k,v]) => k === 'owner_id' && v === 'A')).length, 0);
});
test('signup without a session cannot fabricate login if automatic sign-in also fails', async () => {
    const api=backend();api.auth.signInWithPassword=async()=>({data:null,error:{code:'invalid_credentials',message:'Invalid login credentials'}});const a = await app(null,true,api); await a.get('auth-signup').click();
    a.get('auth-name').value = 'Example'; a.get('auth-email').value = 'example@example.invalid'; a.get('auth-password').value = 'example-only';
    await a.get('auth-form').emit('submit');
    assert.equal(a.get('account-name').textContent, 'زائر'); assert.equal(a.get('auth-password').value, '');
    assert.match(a.get('auth-message').textContent, /غير صحيحة/);
    assert.equal(a.api.state.signup.options.emailRedirectTo, 'http://127.0.0.1:3000/');
});
test('missing SDK fails visibly while local analysis still works', async () => {
    const a = await app(null, false); assert.equal(a.get('account-status').dataset.error, 'true');
    a.get('code-snippet').value = 'var x = 1;'; await a.get('analyze-code').click();
    assert.match(a.get('code-results').textContent, /var/); assert.equal(a.api.state.calls.length, 0);
});
test('50 KB limit counts UTF-8 bytes', async () => {
    const a = await app(user('A')); a.get('code-snippet').value = 'ع'.repeat(30000);
    await a.get('analyze-code').click(); await settle(); assert.match(a.get('code-results').textContent, /50/);
    assert.equal(a.api.state.calls.filter(c => c.operation === 'insert').length, 0);
});
test('editing a snippet invalidates the earlier report before saving', async () => {
    const a = await app(); a.get('code-snippet').value = 'var x = 1;'; await a.get('analyze-code').click();
    a.get('code-snippet').value = 'different code'; await a.get('code-snippet').emit('input');
    assert.equal(a.get('code-results').hidden, true); assert.equal(a.get('save-report').hidden, true);
});

test('restored normal admin session offers navigation without redirecting until clicked',async()=>{
 const api=backend(user('A')),base=api.rpc;api.rpc=(name,args)=>name==='if_admin_account_access'?Promise.resolve({data:{is_admin:true},error:null}):name==='if_admin_login_with_account'?Promise.resolve({data:{ok:true,token:'restored-test-token'},error:null}):base(name,args);
 const a=await app(null,true,api);await settle();assert.equal(a.get('open-admin-panel').hidden,false);assert.equal(a.redirect(),'');assert.equal(a.sessionValues.has('ideaforge:admin-session'),false);await a.get('open-admin-panel').click();assert.equal(a.redirect(),'admin.html');assert.equal(a.sessionValues.get('ideaforge:admin-session'),'restored-test-token');
});

test('signup session opens account directly without an email-confirmation screen',async()=>{const api=backend();api.auth.signUp=async()=>({data:{session:user('A')},error:null});const a=await app(null,true,api);await a.get('auth-signup').click();a.get('auth-name').value='Example';a.get('auth-email').value='example@example.invalid';a.get('auth-password').value='example-only';await a.get('auth-form').emit('submit');await settle();assert.equal(a.get('account-name').textContent,'User A');assert.equal(a.get('auth-dialog').open,false);assert.equal(a.get('resend-confirmation'),undefined);});

test('signup automatically signs in when creation succeeds without returning a session',async()=>{const a=await app();await a.get('auth-signup').click();a.get('auth-name').value='Example';a.get('auth-email').value='example@example.invalid';a.get('auth-password').value='example-only';await a.get('auth-form').emit('submit');await settle();assert.equal(a.get('account-name').textContent,'User A');assert.equal(a.get('auth-dialog').open,false);assert.equal(a.get('sign-out').hidden,false);assert.equal(a.get('auth-password').value,'');});

test('phase accordions use saved plan details, independent checkboxes and language direction',async()=>{const api=backend(user('A'));api.tables.code_reports[0].results={kind:'gemini_plan',data:{tools:[{name:'Editor',setup:'Install editor'}],phases:Array.from({length:5},(_,i)=>({title:i===0?'Setup tools':'مرحلة '+i,steps:['Detailed action'],test:'Check result'}))}};const a=await app(null,true,api);const rows=a.get('workspace-tasks');assert.equal(rows.querySelectorAll('details').length,5);assert.equal(rows.querySelector('summary').dir,'ltr');assert.match(rows.textContent,/Install editor/);const box=rows.querySelector('input');box.checked=true;await box.emit('change');await settle();assert.match(a.get('workspace-progress-text').textContent,/3 من 5/);});
test('finishing stores history and hides the active project only after all steps',async()=>{const api=backend(user('A'));api.tables.project_tasks.filter(t=>t.owner_id==='A').forEach(t=>t.is_completed=true);const a=await app(null,true,api);assert.equal(a.get('finish-project').disabled,false);await a.get('finish-project').click();await settle();assert.equal(a.get('workspace-project').hidden,true);assert.match(a.get('project-history-list').textContent,/Project A/);assert.equal(api.tables.projects.find(p=>p.id==='project-A').archived,true);});
test('replacing an active project requires explicit confirmation',async()=>{const api=backend(user('A'));const a=await app(null,true,api);await a.buttons[1].click();await settle();assert.equal(api.tables.projects.filter(p=>p.owner_id==='A').length,1);assert.equal(api.tables.projects.some(p=>p.id==='project-A'),true);api.state.confirmReplace=true;await a.buttons[1].click();await settle();assert.equal(api.tables.projects.filter(p=>p.owner_id==='A').length,1);assert.equal(api.tables.projects.some(p=>p.id==='project-A'),false);});

test('autosaved development lives in workspace, finishes there, and restores as a collapsed history title',async()=>{const a=await app(user('A'));await a.ai.saveDevelopment({summary:'تقرير محفوظ',correctedCode:'const x=1;'},'Saved review','source','Improve','1b45d9c2-0ba7-48d7-8da5-165ac00f5831',null);assert.equal(a.get('workspace-active-developments').hidden,false);const active=a.get('active-development-list').children[0];assert.equal(active.open,true);const finish=active.querySelectorAll('button').find(b=>b.textContent==='تم الانتهاء');await finish.click();await settle();assert.equal(a.get('workspace-active-developments').hidden,true);const saved=a.get('workspace-reports').children.find(d=>d.querySelector('summary')?.textContent==='تطوير محفوظ');assert.ok(saved);assert.equal(saved.open,false);const b=await app(user('A'),true,a.api);assert.equal(b.get('workspace-active-developments').hidden,true);assert.ok(b.get('workspace-reports').textContent.includes('تطوير محفوظ'));});

test('signup confirmation returns to the GitHub Pages project path',async()=>{const a=await app();a.context.location.pathname='/Ideaforge-AI/index.html';await a.get('auth-signup').click();a.get('auth-name').value='Test';a.get('auth-email').value='test@example.invalid';a.get('auth-password').value='test-password-only';await a.get('auth-form').emit('submit');assert.equal(a.api.state.signup.options.emailRedirectTo,'http://127.0.0.1:3000/Ideaforge-AI/');});

test('GitHub Pages without an AI backend gives an explicit error without transmitting project content',async()=>{const a=await app(user('A'));a.context.location.hostname='jjgrm.github.io';let calls=0;a.api.state.fetch=async()=>{calls++;throw Error('Unexpected request');};await assert.rejects(a.ai.request('review',{code:'private project draft'}),/غير مربوطة/);assert.equal(calls,0);});

test('a configured HTTPS AI backend receives the session token and HTML 404 is handled clearly',async()=>{const a=await app(user('A'));a.context.location.hostname='jjgrm.github.io';a.context.IDEAFORGE_AI={endpoint:'https://backend.example/api/ai'};a.api.auth.getSession=async()=>({data:{session:{...user('A'),access_token:'test-token-only'}},error:null});let sent;a.api.state.fetch=async(url,options)=>{sent={url,options};return Response.json({data:{summary:'review'}});};assert.equal((await a.ai.request('review',{code:'const x=1'})).summary,'review');assert.equal(sent.url,'https://backend.example/api/ai');assert.equal(sent.options.headers.authorization,'Bearer test-token-only');a.api.state.fetch=async()=>new Response('<html>Not found</html>',{status:404,headers:{'content-type':'text/html'}});await assert.rejects(a.ai.request('review',{code:'x'}),/تعذر الوصول/);a.context.IDEAFORGE_AI={endpoint:'http://insecure.example/api/ai'};await assert.rejects(a.ai.request('review',{code:'x'}),/غير صالح/);});
