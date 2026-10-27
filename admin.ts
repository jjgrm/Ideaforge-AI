(() => {
type Row = Record<string, unknown>;
interface Account { id: string; email: string; username: string; role: string; permissions: string[]; account_code?: string; created_at?: string; last_login_at?: string; }
interface Dashboard { account: Account; expires_at: string; metrics?: Record<string, number> | null; daily?: Row[]; interests?: Row[]; users?: Row[]; projects?: Row[]; reports?: Row[]; updates?: Row[]; activity?: Row[]; admins?: Row[]; }
interface Result<T> { data: T | null; error: { message: string; code?: string } | null; }
interface Client {
 rpc<T>(name: string, args?: Record<string, unknown>): PromiseLike<Result<T>>;
 auth: {
  getSession(): Promise<Result<{ session: { user: { id: string } } | null }>>;
  signInWithPassword(args: { email: string; password: string }): Promise<Result<unknown>>;
  resend(args: { type: 'signup'; email: string; options: { emailRedirectTo: string } }): Promise<Result<unknown>>;
 };
}
const env = window as unknown as { IDEAFORGE_SUPABASE?: { url: string; publishableKey: string }; supabase?: { createClient(url: string, key: string, options: object): Client } };
const el = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const value = (id: string): string => el<HTMLInputElement>(id).value.trim();
const raw = (id: string): string => el<HTMLInputElement>(id).value;
const permissions: Record<string, string> = { analytics: 'الإحصائيات', users: 'المستخدمون', projects: 'المشاريع', reports: 'التقارير', content: 'محتوى الموقع', activity: 'سجل الإدارة' };
const titles: Record<string, string> = { overview: 'نظرة عامة', ...permissions, admins: 'المشرفون والصلاحيات', account: 'حسابي' };
const events: Record<string, string> = { owner_setup: 'تهيئة المالك', admin_login: 'دخول الإدارة', admin_login_failed: 'محاولة دخول غير ناجحة', admin_created: 'إضافة معاون', admin_access_changed: 'تغيير صلاحيات معاون', content_saved: 'حفظ محتوى الموقع', content_deleted:'حذف منشور' };
const labels: Record<string, string> = { choose: 'اختر مشروعي', develop: 'طور مشروعي', workspace: 'مساحة العمل', idea_1: 'الفكرة الأولى', idea_2: 'الفكرة الثانية', idea_3: 'الفكرة الثالثة' };
let client: Client | null = null, token = '', data: Dashboard | null = null, version = 0, panel = 'overview', expiryTimer = 0;
const storageKey = 'ideaforge:admin-session';
function status(id: string, message: string, error = false): void { el(id).textContent = message; el(id).classList.toggle('error', error); }
function text(tag: string, content: unknown, className = ''): HTMLElement { const node = document.createElement(tag); node.textContent = String(content ?? '—'); node.className = className; return node; }
function date(input: unknown): string { return input ? new Date(String(input)).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) : 'لم يسجل دخولًا'; }
function errorText(error: unknown): string {
 const m = String((error as { message?: string })?.message ?? '');
 if (m.includes('Email not confirmed')) return 'أكّد البريد من رسالة Supabase أولًا، ثم حاول مرة أخرى.';
 if (m.includes('Invalid login credentials')) return 'بيانات الحساب العادي غير صحيحة.';
 if (m.includes('admin_setup_not_allowed')) return 'التهيئة متاحة فقط للمالك المعتمد بعد تأكيد البريد، ولمرة واحدة.';
 if (m.includes('admin_permission_denied') || m.includes('owner_only')) return 'لا تملك صلاحية تنفيذ هذه العملية.';
 if (m.includes('23505') || m.includes('duplicate')) return 'البريد أو اسم الدخول مستخدم من قبل.';
 if (m.includes('admin_credentials_invalid')) return 'راجع اسم الدخول وكلمة المرور: 8 أحرف على الأقل، وبحد أقصى 72 بايت.';
 return 'لم تكتمل العملية. تحقق من الاتصال والبيانات ثم أعد المحاولة.';
}
async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> { if (!client) throw new Error('unavailable'); const result = await client.rpc<T>(name, args); if (result.error) throw result.error; return result.data as T; }
function checkedPermissions(container: HTMLElement): string[] { return Array.from(container.querySelectorAll<HTMLInputElement>('input:checked')).map(x => x.value); }
function permissionFields(container: HTMLElement, selected: string[]): void {
 container.replaceChildren(); Object.entries(permissions).forEach(([key, label]) => { const item = text('label', '', 'check'); const input = document.createElement('input'); input.type = 'checkbox'; input.value = key; input.checked = selected.includes(key); item.append(input, document.createTextNode(label)); container.append(item); });
}
function can(name: string): boolean { return data?.account.role === 'owner' || !!data?.account.permissions.includes(name); }
function clearSession(message = ''): void {
 ++version; token = ''; data = null; clearTimeout(expiryTimer); try { sessionStorage.removeItem(storageKey); } catch { /* memory session still clears */ }
 el('admin-shell').hidden = true; el('admin-gate').hidden = false;
 for (const id of ['users-table','projects-table','reports-table','activity-table','admins-list','updates-list','account-details','metric-cards','visits-chart','interests-list','access-stats','live-stats']) el(id).replaceChildren();
 el<HTMLFormElement>('update-form').reset(); el<HTMLFormElement>('new-admin-form').reset(); status('gate-status', message);
}
function selectPanel(next: string): void {
 if (next === 'admins' && data?.account.role !== 'owner') next = 'overview';
 if (permissions[next] && !can(next)) next = 'overview';
 panel = next; document.querySelectorAll<HTMLElement>('.panel').forEach(x => x.hidden = x.id !== 'panel-' + next);
 document.querySelectorAll<HTMLElement>('[data-panel]').forEach(x => x.classList.toggle('active', x.dataset.panel === next)); el('panel-title').textContent = titles[next];
}
function table(id: string, columns: [string, (row: Row) => unknown][], rows: Row[]): void {
 const host = el(id); host.replaceChildren(); if (!rows.length) { host.append(text('p', 'لا توجد بيانات حتى الآن.', 'muted')); return; }
 const table = document.createElement('table'), head = document.createElement('thead'), body = document.createElement('tbody'), tr = document.createElement('tr');
 columns.forEach(([label]) => tr.append(text('th', label))); head.append(tr);
 rows.forEach(row => { const tr = document.createElement('tr'); columns.forEach(([, render]) => tr.append(text('td', render(row)))); body.append(tr); }); table.append(head, body); host.append(table);
}
function stats(id: string, entries: [string, unknown][]): void { const host = el(id); host.replaceChildren(); entries.forEach(([label, n]) => { const row = text('div', '', 'stat-row'); row.append(text('span', label), text('strong', n)); host.append(row); }); }
function renderAnalytics(): void {
 const m = data?.metrics; el('analytics-content').hidden = !m; el('overview-limited').hidden = !!m; el('period-label').hidden = !m;
 if (!m) return;
 const host = el('metric-cards'); host.replaceChildren();
 [['زيارات مرصودة',m.visits],['حسابات مسجلة',m.users],['مشاريع محفوظة',m.projects],['تقارير محفوظة',m.reports]].forEach(([label,n]) => { const card = text('article','','card metric'); card.append(text('span',label),text('strong',n)); host.append(card); });
 stats('access-stats', [['مشاهدات صفحات من أعضاء',m.member_views],['مشاهدات صفحات من زوار',m.guest_views],['حسابات لم تؤكد البريد',m.unconfirmed],['حسابات لم تسجل دخولًا',m.never_signed_in],['دخول الإدارة خلال الفترة',m.admin_signins],['محاولات إدارة غير ناجحة خلال الفترة',m.admin_failed]]);
 stats('live-stats', [['زوار خلال آخر 5 دقائق',m.active],['مشاهدات خلال الفترة',m.views],['مهام مكتملة إجمالًا',m.completed_tasks]]);
 const daily = data?.daily ?? [], chart = el('visits-chart'); chart.replaceChildren();
 if (!daily.length) chart.append(text('p','لا توجد بيانات لهذه الفترة.','empty'));
 else {
  const ns='http://www.w3.org/2000/svg',width=Math.max(720,daily.length*48),left=48,right=width-24,bottom=195;
  const scroll=text('div','','chart-scroll'),svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${width} 255`);svg.setAttribute('style',`min-width:${width}px`);svg.setAttribute('role','group');svg.setAttribute('aria-label','مشاهدات الموقع يومًا بيوم');
  const maximum=Math.max(1,...daily.map(x=>Number(x.views)||0));
  const tooltip=text('p','مرّر على نقطة أو اخترها لعرض التاريخ وعدد المشاهدات.','chart-tooltip');tooltip.setAttribute('role','status');
  const dayLabel=(day:unknown,full=false)=>new Date(String(day)+'T12:00:00').toLocaleDateString('ar-SA-u-ca-gregory',{day:'numeric',month:full?'long':'numeric',...(full?{weekday:'long' as const,year:'numeric' as const}:{})});
  for(let i=0;i<5;i++){const y=15+i*45,line=document.createElementNS(ns,'line');line.setAttribute('x1',String(left));line.setAttribute('x2',String(right));line.setAttribute('y1',String(y));line.setAttribute('y2',String(y));line.setAttribute('stroke','currentColor');line.setAttribute('opacity','.12');svg.append(line);const label=document.createElementNS(ns,'text');label.setAttribute('x','35');label.setAttribute('y',String(y+4));label.setAttribute('text-anchor','end');label.textContent=String(Math.round(maximum*(1-i/4)));svg.append(label);}
  const points=daily.map((row,i)=>({row,x:left+i*(right-left)/Math.max(1,daily.length-1),y:bottom-(Number(row.views)||0)/maximum*180}));
  const path=document.createElementNS(ns,'polyline');path.setAttribute('points',points.map(p=>`${p.x},${p.y}`).join(' '));path.setAttribute('stroke','#ef9725');path.setAttribute('stroke-width','3');path.setAttribute('fill','none');svg.append(path);
  points.forEach(({row,x,y})=>{const label=document.createElementNS(ns,'text');label.setAttribute('x',String(x));label.setAttribute('y','225');label.setAttribute('text-anchor','middle');label.textContent=dayLabel(row.day);svg.append(label);const point=document.createElementNS(ns,'circle');point.setAttribute('cx',String(x));point.setAttribute('cy',String(y));point.setAttribute('r','6');point.setAttribute('fill','#ef9725');point.setAttribute('tabindex','0');point.setAttribute('role','button');const message=dayLabel(row.day,true)+' — مشاهدات الموقع: '+String(Number(row.views)||0);point.setAttribute('aria-label',message);const title=document.createElementNS(ns,'title');title.textContent=message;point.append(title);for(const event of ['pointerenter','focus','click'])point.addEventListener(event,()=>{tooltip.textContent=message;});svg.append(point);});
  scroll.append(svg);chart.append(scroll,tooltip,text('small','الأرقام تمثل مشاهدات الصفحات المسجلة، وليست عدد الأشخاص الفريدين.','muted'));
 }
 const details=document.createElement('details');details.append(text('summary','عرض القيم اليومية'));daily.forEach(x=>details.append(text('p',`${x.day}: ${x.views}`)));chart.append(details);
 const interests = el('interests-list'); interests.replaceChildren(); if (!data?.interests?.length) interests.append(text('p','تظهر الاختيارات بعد استخدام أقسام الموقع.','empty'));
 data?.interests?.forEach(x => { const row = text('div','','stat-row'); row.append(text('span',labels[String(x.page)] ?? x.page),text('strong',x.count)); interests.append(row); });
}
function renderUpdates(): void {
 const host = el('updates-list'); host.replaceChildren();
 if (!data?.updates?.length) host.append(text('p','لا توجد منشورات بعد.','empty'));
 data?.updates?.forEach(row => { const card = text('article','','list-item'); card.append(text('h3',row.title),text('p',row.body),text('small',row.published ? 'منشور' : 'مسودة')); const button = text('button','تعديل') as HTMLButtonElement; button.type='button'; button.addEventListener('click',() => { el<HTMLInputElement>('update-id').value=String(row.id); el<HTMLInputElement>('update-title').value=String(row.title); el<HTMLTextAreaElement>('update-body').value=String(row.body); el('publish-update').textContent='نشر التعديل'; el('update-title').focus(); }); const actions=text('div','','form-actions');actions.append(button);
 const remove=text('button','حذف') as HTMLButtonElement;remove.type='button';remove.className='danger';remove.addEventListener('click',()=>{if(!window.confirm('حذف هذا المنشور من الموقع ومن المنشورات والمسودات نهائيًا؟'))return;void submit(actions as HTMLFormElement,'admin-status',async()=>{await rpc('if_admin_delete_update',{p_token:token,p_id:row.id});if(value('update-id')===String(row.id)){el<HTMLFormElement>('update-form').reset();el<HTMLInputElement>('update-id').value='';}await loadDashboard();status('admin-status','حُذف المنشور.');});});actions.append(remove);card.append(actions);host.append(card); });
}
function renderAdmins(): void {
 const host=el('admins-list'); host.replaceChildren();
 data?.admins?.forEach(row => {
  const form=document.createElement('form'); form.className='list-item form'; form.append(text('h3',row.username),text('p',row.email),text('small','المعرف: '+String(row.account_code??'—')),text('small','إنشاء الحساب: '+(row.created_at?date(row.created_at):'—')),text('small','آخر دخول: '+date(row.last_login_at)));
  if (row.role==='owner') form.append(text('p','المالك · جميع الصلاحيات'));
  else {
   const grid=text('div','','permission-grid'); permissionFields(grid,row.permissions as string[]); const active=document.createElement('input'); active.type='checkbox'; active.checked=!!row.active; const label=text('label','','check'); label.append(active,document.createTextNode('حساب نشط')); const button=text('button','حفظ الصلاحيات') as HTMLButtonElement; button.type='submit'; const feedback=text('p',''); feedback.setAttribute('role','status'); form.append(grid,label,button,feedback);
   form.addEventListener('submit',async event => { event.preventDefault(); button.disabled=true; try { await rpc('if_admin_save_account',{p_token:token,p_id:row.id,p_email:null,p_username:null,p_password:null,p_permissions:checkedPermissions(grid),p_active:active.checked}); feedback.textContent='حُفظت الصلاحيات.'; await loadDashboard(); } catch(error) { feedback.textContent=errorText(error); } finally { button.disabled=false; } });
  } host.append(form);
 });
}
function render(): void {
 if (!data) return; el('admin-gate').hidden=true; el('admin-shell').hidden=false;
 el('admin-label').textContent=data.account.username; el('admin-role').textContent=data.account.role==='owner'?'المالك':'مشرف معاون';
 document.querySelectorAll<HTMLElement>('[data-permission]').forEach(x => x.hidden=!can(x.dataset.permission ?? ''));
 el('admins-nav').hidden=data.account.role!=='owner'; renderAnalytics();
 table('users-table',[['معرف الحساب',r=>r.account_code],['الاسم',r=>r.name],['البريد',r=>r.email],['كلمة المرور',r=>r.has_password?'محفوظة · لا تُعرض':'لم تُضبط'],['تأكيد البريد',r=>r.confirmed?'مؤكد':'غير مؤكد'],['آخر دخول',r=>date(r.last_sign_in_at)],['إنشاء الحساب',r=>date(r.created_at)]],data.users??[]);
 table('projects-table',[['المشروع',r=>r.title],['الوصف',r=>r.description],['البريد',r=>r.email],['التقدم',r=>`${r.completed} / ${r.total}`],['الإنشاء',r=>date(r.created_at)]],data.projects??[]);
 table('reports-table',[['التقرير',r=>String(r.title??'').replace(/ — Gemini/g,'')],['طلب التغيير',r=>r.change_request],['المشروع',r=>r.project],['البريد',r=>r.email],['التاريخ',r=>date(r.created_at)]],data.reports??[]);
 table('activity-table',[['العملية',r=>events[String(r.action)]??r.action],['المشرف',r=>r.username],['التاريخ',r=>date(r.created_at)]],data.activity??[]);
 renderUpdates(); renderAdmins(); stats('account-details',[['معرف الحساب',data.account.account_code??'—'],['اسم الدخول',data.account.username],['البريد',data.account.email],['إنشاء الحساب',data.account.created_at?date(data.account.created_at):'—'],['آخر دخول',date(data.account.last_login_at)],['الدور',data.account.role==='owner'?'المالك':'معاون'],['انتهاء الجلسة',date(data.expires_at)]]);
 selectPanel(panel); el('admin-updated').textContent='آخر تحديث: '+new Date().toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'});
 clearTimeout(expiryTimer); expiryTimer=window.setTimeout(()=>clearSession('انتهت جلسة الإدارة. سجّل الدخول مجددًا.'),Math.max(0,new Date(data.expires_at).getTime()-Date.now()));
}
async function loadDashboard(): Promise<void> {
 if (!token) return; const current=++version, credential=token; el<HTMLButtonElement>('admin-refresh').disabled=true;
 try { const next=await rpc<Dashboard>('if_admin_dashboard',{p_token:credential,p_days:Number(value('admin-period'))}); if(current!==version||credential!==token)return; data=next; render(); status('admin-status',''); }
 catch(error) { if(current!==version)return; if(String((error as {message?:string})?.message).includes('admin_session_invalid')) clearSession('انتهت الجلسة أو أُلغي وصولك. سجّل الدخول مجددًا.'); else status(data?'admin-status':'gate-status',errorText(error),true); }
 finally { if(current===version)el<HTMLButtonElement>('admin-refresh').disabled=false; }
}
async function submit(form: HTMLFormElement, feedback: string, action: () => Promise<void>): Promise<void> {
 const buttons=Array.from(form.querySelectorAll<HTMLButtonElement>('button')); buttons.forEach(x=>x.disabled=true); status(feedback,'جارٍ تنفيذ العملية…');
 try { await action(); } catch(error) { status(feedback,errorText(error),true); } finally { buttons.forEach(x=>x.disabled=false); form.querySelectorAll<HTMLInputElement>('input[type=password]').forEach(x=>x.value=''); }
}
el('new-admin-form').addEventListener('submit',event=>{event.preventDefault();void submit(event.currentTarget as HTMLFormElement,'admin-status',async()=>{await rpc('if_admin_save_account',{p_token:token,p_id:null,p_email:value('new-admin-email'),p_username:value('new-admin-username'),p_password:raw('new-admin-password'),p_permissions:checkedPermissions(el('new-admin-permissions')),p_active:true});el<HTMLFormElement>('new-admin-form').reset();await loadDashboard();status('admin-status','أُضيف المعاون. يستطيع الدخول ببيانات الإدارة التي اخترتها له.');});});
el('update-form').addEventListener('submit',event=>{event.preventDefault();void submit(event.currentTarget as HTMLFormElement,'admin-status',async()=>{await rpc('if_admin_save_update',{p_token:token,p_id:value('update-id')||null,p_title:value('update-title'),p_body:value('update-body'),p_published:true});el<HTMLFormElement>('update-form').reset();el<HTMLInputElement>('update-id').value='';await loadDashboard();el('publish-update').textContent='منشور جديد';status('admin-status','نُشر المحتوى على الموقع.');});});

document.querySelectorAll<HTMLElement>('[data-panel]').forEach(button=>button.addEventListener('click',()=>selectPanel(button.dataset.panel??'overview')));
el('admin-period').addEventListener('change',()=>{void loadDashboard();}); el('admin-refresh').addEventListener('click',()=>{void loadDashboard();});
el('admin-logout').addEventListener('click',async()=>{const old=token;clearSession('تم تسجيل خروج الإدارة.');try{await rpc('if_admin_logout',{p_token:old});}catch{status('gate-status','أُزيلت الجلسة من هذا المتصفح. تعذر تأكيد إلغائها في الخادم؛ تنتهي خلال ساعة.',true);}});
function setTheme(dark:boolean):void{document.body.classList.toggle('admin-dark',dark);el('admin-light').setAttribute('aria-pressed',String(!dark));el('admin-dark').setAttribute('aria-pressed',String(dark));try{localStorage.setItem('ideaforge:admin-theme',dark?'dark':'light');}catch{}}
let savedDark=false;try{savedDark=localStorage.getItem('ideaforge:admin-theme')==='dark';}catch{}setTheme(savedDark);
el('admin-light').addEventListener('click',()=>setTheme(false));el('admin-dark').addEventListener('click',()=>setTheme(true));
permissionFields(el('new-admin-permissions'),['analytics']);
try { const config=env.IDEAFORGE_SUPABASE;if(!config||!env.supabase||!/^https?:$/.test(location.protocol))throw new Error();client=env.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});try{token=sessionStorage.getItem(storageKey)??'';}catch{/* unavailable storage */}if(token)void loadDashboard();else status('gate-status','سجّل الدخول من الموقع للوصول إلى لوحة الإدارة.'); }
catch{status('gate-status','تعذر تحميل خدمة الإدارة. افتح الصفحة من عنوان الموقع وتحقق من الإنترنت.',true);}
})();
