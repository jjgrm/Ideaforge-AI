const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
// Reuse the small DOM already used by the public app tests, without registering its tests.
const domSource = fs.readFileSync(path.join(__dirname, 'frontend.test.cjs'), 'utf8').split('const user =')[0]
    .replace("resolve(root, 'index.html')", "resolve(root, 'admin.html')")
    .replace("if (name === 'id') ids.set(value, node);", "if (name === 'id') ids.set(value, node); if (name.startsWith('data-')) node.dataset[name.slice(5)] = value;");
const helper = { require, __dirname, TextEncoder, setTimeout };
vm.runInNewContext(domSource + '\nthis.makeDOM=dom; this.TestElement=Element;', helper);
const settle = () => new Promise(resolve => setTimeout(resolve, 10));
const account = (role = 'owner', permissions = []) => ({ id: 'test-account', username: '<img src=x onerror=alert(1)>', email: 'test@ideaforge.invalid', role, permissions });
function dashboard(role = 'owner', permissions = []) { return { account: account(role, permissions), expires_at: new Date(Date.now()+60000).toISOString(), metrics: role==='owner' ? { visits:0,users:1,projects:0,reports:0 } : null, users:role==='owner'?[{email:'<script>not executable</script>',confirmed:true}]:[], admins:[], updates:[], daily:[] }; }
async function app(initialToken = '', response = dashboard()) {
    const tree = helper.makeDOM();
    const matches = helper.TestElement.prototype.matches;
    const allNodes=[]; const visit=node=>{allNodes.push(node);node.children.forEach(visit);};visit(tree.document);
    for (const node of allNodes) {
        node.classList.toggle = (name, enabled) => enabled ? node.classList.add(name) : node.classList.remove(name);
    }
    helper.TestElement.prototype.matches = function(selector) {
        if (selector.startsWith('[data-')) return selector.slice(6,-1) in this.dataset;
        if (selector==='input[type=password]') return this.tagName==='input'&&this.type==='password';
        if (selector==='input:checked') return this.tagName==='input'&&this.checked;
        return matches.call(this,selector);
    };
    const calls=[], store=new Map(initialToken?[['ideaforge:admin-session',initialToken]]:[]), timers=[];
    let held=null;
    const api={ rpc:async(name,args)=>{calls.push({name,args}); if(name==='if_admin_dashboard'){if(held)return await new Promise(resolve=>held.resolve=resolve);return {data:response,error:null};} if(name==='if_admin_login')return {data:{ok:true,token:'new-test-token'},error:null};return {data:{ok:true},error:null};},auth:{}};
    const window={confirm:()=>true,IDEAFORGE_SUPABASE:{url:'https://test.invalid',publishableKey:'public'},supabase:{createClient:()=>api},setTimeout:(fn)=>{timers.push(fn);return timers.length;}};
    tree.document.createTextNode=s=>{const node=new helper.TestElement('#text');node.textContent=s;return node;};
    tree.document.createElementNS=(_ns,tag)=>tree.document.createElement(tag);
    const create=tree.document.createElement;
    tree.document.createElement=tag=>{const node=create(tag);node.classList.toggle=(name,enabled)=>enabled?node.classList.add(name):node.classList.remove(name);return node;};
    for(const node of tree.document.querySelectorAll('form'))node.reset=()=>{node.querySelectorAll('input').forEach(x=>{if(x.type!=='checkbox')x.value='';});};
    const context={window,document:tree.document,sessionStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},location:{protocol:'http:',origin:'http://localhost:3000'},clearTimeout:()=>{},Date,console};
    vm.runInNewContext(fs.readFileSync(path.join(root,'admin.js'),'utf8'),context);
    await settle();
    return {...tree,calls,store,timers,get:id=>tree.ids.get(id),hold(){held={};return held;},response};
}
test('admin gate does not reveal a dashboard without a validated session',async()=>{
    const a=await app();assert.equal(a.get('admin-shell').hidden,true);assert.equal(a.calls.length,0);
});
test('validated dashboard treats account and user text as text, then logout clears data and revokes token',async()=>{
    const a=await app('test-token');assert.equal(a.get('admin-status').textContent,'');assert.equal(a.get('admin-shell').hidden,false);assert.equal(a.get('admin-label').textContent,account().username);assert.match(a.get('users-table').textContent,/<script>/);
    await a.get('admin-logout').click();await settle();assert.equal(a.get('admin-shell').hidden,true);assert.equal(a.get('users-table').textContent,'');assert.equal(a.store.size,0);assert.equal(a.calls.at(-1).name,'if_admin_logout');
});

test('account directory shows short IDs and dates, and only a password state',async()=>{
 const d=dashboard();d.users=[{account_code:'IF-ABC234',name:'Test account',email:'test@ideaforge.invalid',created_at:'2026-10-20T10:00:00Z',last_sign_in_at:'2026-10-22T10:00:00Z',confirmed:true,has_password:true}];const a=await app('test-token',d);const rendered=a.get('users-table').textContent;assert.match(rendered,/IF-ABC234/);assert.match(rendered,/Test account/);assert.match(rendered,/محفوظة/);assert.doesNotMatch(rendered,/password_hash|encrypted_password/);
});
test('helper sidebar and overview reflect granted sections only',async()=>{
    const a=await app('test-token',dashboard('admin',['projects']));assert.equal(a.get('admins-nav').hidden,true);assert.equal(a.get('analytics-content').hidden,true);
    const nav=a.document.querySelectorAll('[data-permission]');assert.equal(nav.find(x=>x.dataset.permission==='users').hidden,true);assert.equal(nav.find(x=>x.dataset.permission==='projects').hidden,false);
});
test('a pending dashboard response cannot restore private content after logout',async()=>{
    const a=await app('test-token'),held=a.hold();void a.get('admin-refresh').click();await settle();await a.get('admin-logout').click();held.resolve({data:dashboard(),error:null});await settle();assert.equal(a.get('admin-shell').hidden,true);assert.equal(a.get('users-table').textContent,'');
});
test('dashboard has no separate login or owner registration form',async()=>{const a=await app();assert.equal(a.get('admin-login-form'),undefined);assert.equal(a.get('owner-create-form'),undefined);});
test('expiry clears the dashboard and local token',async()=>{
    const a=await app('test-token');a.timers.at(-1)();assert.equal(a.get('admin-shell').hidden,true);assert.equal(a.store.size,0);assert.equal(a.get('users-table').textContent,'');
});

test('daily chart labels every date including zero views and reveals values on focus',async()=>{const d=dashboard();d.daily=[{day:'2026-10-21',views:0},{day:'2026-10-22',views:3}];const a=await app('test-token',d);const chart=a.get('visits-chart');assert.equal(chart.querySelectorAll('circle').length,2);assert.equal(chart.querySelectorAll('text').length,7);await chart.querySelectorAll('circle')[1].emit('focus');assert.match(chart.querySelector('.chart-tooltip').textContent,/3/);assert.match(chart.querySelector('.chart-tooltip').textContent,/مشاهدات/);});

test('content controls offer edit and delete only and theme toggles',async()=>{const d=dashboard();d.updates=[{id:'post-test',title:'Test',body:'Body',published:true}];const a=await app('test-token',d);const buttons=a.get('updates-list').querySelectorAll('button');assert.equal(buttons.map(x=>x.textContent).join('|'),'تعديل|حذف');await buttons[1].click();await settle();assert.equal(a.calls.find(x=>x.name==='if_admin_delete_update').args.p_id,'post-test');await a.get('admin-dark').click();assert.match(a.document.body.className,/admin-dark/);await a.get('admin-light').click();assert.doesNotMatch(a.document.body.className,/admin-dark/);});


test('single new-post button submits publication rather than clearing the form',async()=>{const a=await app('test-token');a.get('update-title').value='Announcement';a.get('update-body').value='Text to publish';assert.equal(a.get('update-new'),undefined);assert.equal(a.get('publish-update').textContent,'منشور جديد');await a.get('update-form').emit('submit');await settle();const call=a.calls.find(x=>x.name==='if_admin_save_update');assert.equal(call.args.p_title,'Announcement');assert.equal(call.args.p_body,'Text to publish');assert.equal(call.args.p_published,true);assert.equal(call.args.p_id,null);});
