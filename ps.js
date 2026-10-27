"use strict";
(() => {
    const lightButton = document.getElementById("light-mode");
    const darkButton = document.getElementById("dark-mode");
    lightButton?.addEventListener("click", () => {
        document.body.classList.remove("dark-mode");
    });
    darkButton?.addEventListener("click", () => {
        document.body.classList.add("dark-mode");
    });
    function celestPest(id) {
        const container = document.getElementById('project');
        if (!container)
            return;
        const project = container.querySelector('.projectdetail');
        if (!project)
            return;
        project.style.display = 'flex';
    }
    const tabs = document.querySelectorAll(".project-tabs button");
    const panels = document.querySelectorAll(".project-panel");
    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => {
            tabs.forEach((button) => {
                button.classList.remove("active");
            });
            tab.classList.add("active");
            recordEvent('tab_view', ['choose', 'develop', 'workspace'][index] ?? 'home');
            panels.forEach((panel, panelIndex) => {
                panel.hidden = panelIndex !== index;
            });
        });
    });
    // Numeric duration remains a number input with browser validation; visual steppers are hidden in CSS.
    const durationInput = document.getElementById('time');
    durationInput?.addEventListener('keydown', event => { if (!event.ctrlKey && !event.metaKey && event.key.length === 1 && !/^[0-9]$/.test(event.key))
        event.preventDefault(); });
    durationInput?.addEventListener('paste', event => { const raw = event.clipboardData?.getData('text') ?? ''; if (!/^[0-9]+$/.test(raw))
        event.preventDefault(); });
    // تعبئة نموذج «اختر مشروعي»
    const demoDataButton = document.getElementById("demo-data");
    demoDataButton?.addEventListener("click", () => {
        const skills = document.getElementById("skills");
        const goal = document.getElementById("goal");
        const time = document.getElementById("time");
        const budget = document.getElementById("budget");
        if (skills instanceof HTMLInputElement) {
            skills.value = "JavaScript، HTML، CSS";
        }
        if (goal instanceof HTMLSelectElement) {
            goal.value = "development";
        }
        if (time instanceof HTMLInputElement) {
            time.value = "4";
        }
        if (budget instanceof HTMLInputElement) {
            budget.value = "0";
        }
    });
    const demoCodeButton = document.getElementById("demo-code");
    demoCodeButton?.addEventListener("click", () => {
        const snippet = document.getElementById("code-snippet");
        const request = document.getElementById("code-request");
        if (snippet instanceof HTMLTextAreaElement) {
            snippet.value = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تجربة مشروعي</title>
</head>
<body>
    <h1>مشروعي</h1>
    <p>اختر نوع المشروع من القائمة.</p>
</body>
</html>`;
        }
        if (request instanceof HTMLTextAreaElement) {
            request.value = "أبغى أضيف قائمة منسدلة لاختيار نوع المشروع.";
        }
    });
    // نتائج تجريبية لواجهة «اختر مشروعي»
    const ideaForm = document.getElementById("idea-form");
    ideaForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const results = document.getElementById("idea-results");
        if (results instanceof HTMLElement) {
            results.hidden = false;
        }
    });
    demoCodeButton?.addEventListener('click', () => { const field = document.getElementById('specialty'); const content = document.getElementById('code-snippet'); const request = document.getElementById('code-request'); if (field?.value === 'medicine') {
        content.value = 'مشروع تخرج: تصميم مادة توعوية تعليمية عن الوقاية من العدوى لطلاب الجامعة، مع استبانة مجهولة قبل النشاط وبعده. لا توجد بيانات مرضى.';
        request.value = 'حسّن أهداف المشروع ومنهجيته ومؤشرات التقييم واذكر حدود الدراسة.';
    } if (field?.value === 'engineering') {
        content.value = 'مشروع هندسي تعليمي: نموذج مصغر لترشيد استهلاك المياه في حديقة، باستخدام مستشعر رطوبة وخزان منخفض الجهد.';
        request.value = 'راجع المتطلبات وخطة الاختبار وحدود النموذج والمخاطر التي تحتاج اعتماد مختص.';
    } });
    const analyzeButton = document.getElementById("analyze-code");
    function analyzeCode() {
        const snippet = document.getElementById("code-snippet");
        const results = document.getElementById("code-results");
        if (!(snippet instanceof HTMLTextAreaElement) ||
            !(results instanceof HTMLElement)) {
            return false;
        }
        results.replaceChildren();
        results.hidden = false;
        if (!snippet.value.trim()) {
            results.textContent = "أضف محتوى المشروع أولًا ثم اضغط طوّر مشروعي.";
            return false;
        }
        if (new TextEncoder().encode(snippet.value).length > 51200) {
            results.textContent = "حد المقتطف 50 كيلوبايت.";
            return false;
        }
        const requestField = document.getElementById("code-request");
        if (requestField instanceof HTMLTextAreaElement &&
            requestField.value.trim()) {
            const request = requestField.value.trim();
            const title = document.createElement("h3");
            const explanation = document.createElement("p");
            if (request.includes("منسدلة")) {
                title.textContent = "مثال تجريبي: إضافة قائمة منسدلة";
                explanation.textContent =
                    "إذا كان الكود المدخل ملف HTML كاملًا، ضع المثال داخل body " +
                        "في المكان الذي تريد ظهور القائمة فيه، وقبل وسم إغلاق body. " +
                        "هذا المثال قائمة اختيار بسيطة، وليس قائمة تنقل. " +
                        "لم نحدد رقم سطر لأن مكان الإضافة يعتمد على بنية ملفك.";
                const example = document.createElement("pre");
                example.dir = "ltr";
                example.textContent = `<label for="project-category">نوع المشروع</label>
<select id="project-category" name="project-category">
    <option value="">اختر النوع</option>
    <option value="website">موقع إلكتروني</option>
    <option value="app">تطبيق</option>
</select>`;
                results.append(title, explanation, example);
            }
            else {
                title.textContent = "الطلب غير مدعوم في التجربة الحالية";
                explanation.textContent =
                    "جرّب كتابة: أبغى أضيف قائمة منسدلة. " +
                        "فهم الطلبات الأخرى لم يُربط بعد.";
                results.append(title, explanation);
            }
            return true;
        }
        const rules = [
            {
                pattern: /\bvar\b/,
                title: "راجع استخدام var",
                advice: "استخدم const إذا لم تتغير القيمة، أو let إذا تغيرت."
            },
            {
                pattern: /(^|[^=!<>])==(?!=)/,
                title: "راجع المقارنة غير الصارمة",
                advice: "إذا تقصد مقارنة النوع والقيمة، استخدم ===."
            },
            {
                pattern: /\.innerHTML\b/,
                title: "راجع إدخال HTML",
                advice: "للنص العادي استخدم textContent، وراجع مصدر المحتوى إذا احتجت HTML."
            },
            {
                pattern: /\bconsole\.log\s*\(/,
                title: "راجع رسائل التصحيح",
                advice: "تأكد أن الرسائل مناسبة للنشر ولا تعرض بيانات حساسة."
            }
        ];
        const heading = document.createElement("h3");
        results.append(heading);
        let count = 0;
        snippet.value.split("\n").forEach((line, index) => {
            rules.forEach((rule) => {
                if (!rule.pattern.test(line)) {
                    return;
                }
                count++;
                const card = document.createElement("article");
                card.className = "analysis-note";
                const title = document.createElement("h4");
                title.textContent = `${rule.title} — السطر ${index + 1}`;
                const code = document.createElement("pre");
                code.dir = "auto";
                code.textContent = line.trim();
                const advice = document.createElement("p");
                advice.textContent = rule.advice;
                card.append(title, code, advice);
                results.append(card);
            });
        });
        heading.textContent = `نتيجة الفحص الأولي: ${count} ملاحظات`;
        if (count === 0) {
            const message = document.createElement("p");
            message.textContent =
                "لم تظهر ملاحظات ضمن القواعد الحالية؛ هذا لا يعني أن الكود خالٍ من الأخطاء.";
            results.append(message);
        }
        return true;
    }
    const executionPlans = new Map();
    const environment = window;
    const element = (id) => {
        const result = document.getElementById(id);
        if (!result)
            throw new Error("Missing element: " + id);
        return result;
    };
    const authDialog = element("auth-dialog");
    const authForm = element("auth-form");
    const authEmail = element("auth-email");
    const authPassword = element("auth-password");
    const authName = element("auth-name");
    const openAuth = element("open-auth");
    const signOut = element("sign-out");
    const projectPicker = element("saved-projects");
    const saveReport = element("save-report");
    const moreReports = element("more-reports");
    let client = null;
    let visitId = '';
    let pageTracked = false;
    function recordEvent(event, page) {
        if (!client?.rpc || !visitId)
            return;
        void Promise.resolve(client.rpc('if_record_event', { p_visit_id: visitId, p_event: event, p_page: page })).catch(() => undefined);
    }
    async function loadSiteUpdates() {
        if (!client)
            return;
        const host = document.getElementById('site-updates-list');
        const section = document.getElementById('site-updates');
        if (!host || !section)
            return;
        try {
            const result = await client.from('site_updates').select('id,title,body,published,created_at').eq('published', true).order('created_at', { ascending: false }).range(0, 4);
            if (result.error || !result.data?.length)
                return;
            host.replaceChildren();
            result.data.forEach(row => { const card = document.createElement('article'); const title = document.createElement('h3'); const body = document.createElement('p'); title.textContent = row.title; body.textContent = row.body; card.append(title, body); host.append(card); });
            section.hidden = false;
        }
        catch { /* Published updates never block the project workspace. */ }
    }
    let session = null;
    let authReady = false;
    let workspaceReady = false;
    let loadingWorkspace = false;
    let pendingTasks = 0;
    let identityVersion = 0;
    let projectVersion = 0;
    let projects = [];
    let activeProjectId = null;
    let taskRows = [];
    let reportRows = [];
    let authMode = "login";
    let authBusy = false;
    let creatingProject = false;
    let reportBusy = false;
    let moreBusy = false;
    let hasMoreReports = false;
    let lastSavedFingerprint = "";
    function message(id, text, error = false) {
        const node = element(id);
        node.textContent = text;
        node.dataset.error = String(error);
    }
    function errorText(error) {
        const value = error;
        const code = value?.code ?? "";
        const text = value?.message ?? "";
        if (text.includes('active_project_exists') || text.includes('projects_one_active_per_owner'))
            return 'أكمل مشروعك الحالي أو أكّد استبداله قبل بدء مشروع جديد.';
        if (text.includes('project_steps_incomplete'))
            return 'أكمل جميع الخطوات قبل الضغط على تم الانتهاء.';
        if (text.includes('completed_project_read_only'))
            return 'هذا مشروع محفوظ؛ خطواته للعرض فقط.';
        if (code === "invalid_credentials")
            return "البريد أو كلمة المرور غير صحيحة.";
        if (code === "email_not_confirmed")
            return "أكّد بريدك الإلكتروني قبل تسجيل الدخول.";
        if (code === "over_email_send_rate_limit" || /rate limit/i.test(text))
            return "محاولات كثيرة الآن. انتظر قليلًا ثم حاول مجددًا.";
        if (/email.*(not authorized|not allowed)|smtp|error sending/i.test(text))
            return "تعذر إرسال بريد التأكيد. تواصل مع مسؤول الموقع لإكمال إعداد إرسال البريد.";
        if (/fetch|network|timeout/i.test(text))
            return "تعذر الاتصال. تحقق من الإنترنت ثم أعد المحاولة.";
        if (code === "42501" || code.startsWith("PGRST"))
            return "تعذر الوصول إلى بيانات الحساب. أعد تسجيل الدخول، وإن استمرت المشكلة تواصل مع مسؤول الموقع.";
        if (code === "23514")
            return "بعض البيانات تتجاوز الحدود المسموحة. راجع طول النص والقيم المدخلة.";
        if (value?.status === 401 || code === "refresh_token_not_found")
            return "انتهت الجلسة. سجّل الدخول مجددًا.";
        return "تعذر إكمال العملية. حاول مرة أخرى؛ لم نعتبر البيانات محفوظة.";
    }
    function db() {
        if (!client)
            throw new Error("Network client unavailable");
        return client;
    }
    function showAuth() {
        if (!client || !authReady)
            return;
        if (!authDialog.open)
            authDialog.showModal();
        setAuthMode('login');
        authEmail.focus();
    }
    function requireAccount() {
        if (session)
            return session.user.id;
        message("account-status", "سجّل الدخول أولًا لحفظ بياناتك واستعادتها.");
        showAuth();
        return null;
    }
    function isCurrent(owner, version) {
        return session?.user.id === owner && identityVersion === version;
    }
    function updatePrivateControls() {
        document.querySelectorAll(".choose-idea").forEach(button => {
            button.disabled = !authReady || creatingProject || (!!session && !workspaceReady);
        });
        saveReport.disabled = reportBusy || !authReady || (!!session && !workspaceReady);
        projectPicker.disabled = loadingWorkspace || creatingProject || pendingTasks > 0 || reportBusy;
        element("reload-workspace").disabled = loadingWorkspace || creatingProject || pendingTasks > 0 || reportBusy;
        element("analyze-code").disabled = reportBusy;
        element("demo-code").disabled = reportBusy;
        for (const id of ["code-snippet", "code-request", "code-file"]) {
            element(id).disabled = reportBusy;
        }
        moreReports.disabled = moreBusy || loadingWorkspace;
        const current = projects.find(p => p.id === activeProjectId);
        element('finish-project').disabled = !current || current.archived || pendingTasks > 0 || loadingWorkspace || taskRows.length !== 5 || taskRows.some(t => !t.is_completed);
        element('finish-project').hidden = !current || current.archived;
    }
    function clearWorkspace() {
        window.IdeaForgeResetAI?.();
        executionPlans.clear();
        projects = [];
        taskRows = [];
        reportRows = [];
        activeProjectId = null;
        projectVersion++;
        projectPicker.replaceChildren();
        element("saved-projects-field").hidden = true;
        element("workspace-project").hidden = true;
        element("workspace-title").textContent = "";
        element("workspace-description").textContent = "";
        element("workspace-progress").value = 0;
        element("workspace-progress-text").textContent = "0 من 5 خطوات مكتملة";
        element("workspace-empty").hidden = false;
        element("workspace-tasks").replaceChildren();
        element("workspace-reports").replaceChildren();
        element("active-development-list").replaceChildren();
        element("workspace-active-developments").hidden = true;
        element("workspace-no-reports").hidden = false;
        element("workspace-no-reports").textContent = "سجّل الدخول لاستعادة تقاريرك المحفوظة.";
        moreReports.hidden = true;
        message("workspace-status", "");
    }
    function storageKey(owner) { return "ideaforge:active-project:" + owner; }
    function rememberProject(owner, id) {
        // هذا مؤشر للمشروع فقط، وليس مصدرًا للجلسة أو لبيانات المستخدم.
        try {
            localStorage.setItem(storageKey(owner), id);
        }
        catch { /* يعمل الحفظ دون تفضيل محلي. */ }
    }
    function preferredProject(owner) {
        try {
            return localStorage.getItem(storageKey(owner));
        }
        catch {
            return null;
        }
    }
    async function updateAdminNavigation(owner, version) {
        if (!client?.rpc || !isCurrent(owner, version))
            return;
        try {
            const result = await client.rpc('if_admin_account_access', {});
            if (!isCurrent(owner, version))
                return;
            element('open-admin-panel').hidden = !!result.error || !result.data?.is_admin;
        }
        catch {
            if (isCurrent(owner, version))
                element('open-admin-panel').hidden = true;
        }
    }
    function applySession(next, reloadProfile = false) {
        if (!pageTracked) {
            pageTracked = true;
            recordEvent('page_view', 'home');
        }
        const previousId = session?.user.id ?? null;
        const nextId = next?.user.id ?? null;
        session = next;
        authReady = true;
        openAuth.disabled = false;
        openAuth.hidden = !!next;
        signOut.hidden = !next;
        if (previousId === nextId && !reloadProfile) {
            if (!next)
                element("account-name").textContent = "زائر";
            updatePrivateControls();
            return;
        }
        identityVersion++;
        element('open-admin-panel').hidden = true;
        if (previousId && previousId !== nextId) {
            try {
                const oldToken = sessionStorage.getItem('ideaforge:admin-session');
                sessionStorage.removeItem('ideaforge:admin-session');
                if (oldToken && client?.rpc)
                    setTimeout(() => { void Promise.resolve(client?.rpc?.('if_admin_logout', { p_token: oldToken })).catch(() => undefined); }, 0);
            }
            catch { /* UI is already hidden if storage is blocked. */ }
        }
        if (next) {
            const owner = next.user.id, version = identityVersion;
            setTimeout(() => { void updateAdminNavigation(owner, version); }, 0);
        }
        workspaceReady = false;
        loadingWorkspace = false;
        pendingTasks = 0;
        creatingProject = false;
        reportBusy = false;
        moreBusy = false;
        lastSavedFingerprint = "";
        clearWorkspace();
        // لا نترك محتوى تقرير حساب سابق معروضًا بعد تبديل الحساب.
        element("code-results").replaceChildren();
        element("code-results").hidden = true;
        element("code-snippet").value = "";
        element("code-request").value = "";
        saveReport.hidden = true;
        message("report-save-status", "");
        element("reload-workspace").hidden = !next;
        element("account-name").textContent = next
            ? String(next.user.user_metadata.display_name || next.user.user_metadata.full_name || "حسابي")
            : "زائر";
        message("account-status", next ? "جارٍ استعادة بيانات حسابك…" : "تم تسجيل الخروج. بياناتك محفوظة في حسابك.");
        updatePrivateControls();
        if (next) {
            const version = identityVersion;
            // نخرج من callback المصادقة قبل أي طلب آخر إلى Supabase.
            setTimeout(() => { void loadWorkspace(version); }, 0);
        }
    }
    async function allProjects(owner) {
        const rows = [];
        for (let offset = 0;; offset += 100) {
            const result = await db().from("projects").select("*").eq("owner_id", owner)
                .order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 99);
            if (result.error)
                throw result.error;
            const page = result.data ?? [];
            rows.push(...page);
            if (page.length < 100)
                return rows;
        }
    }
    async function loadWorkspace(version = identityVersion) {
        const owner = session?.user.id;
        if (!owner || !isCurrent(owner, version) || loadingWorkspace)
            return;
        loadingWorkspace = true;
        workspaceReady = false;
        updatePrivateControls();
        message("workspace-status", "جارٍ تحميل المشاريع والتقارير…");
        try {
            const [profile, projectRows, reports] = await Promise.all([
                db().from("profiles").select("id,display_name").eq("id", owner).single(),
                allProjects(owner),
                db().from("code_reports").select("*").eq("owner_id", owner)
                    .order("created_at", { ascending: false }).order("id", { ascending: false }).range(0, 19)
            ]);
            if (!isCurrent(owner, version))
                return;
            if (profile.error)
                throw profile.error;
            if (reports.error)
                throw reports.error;
            element("account-name").textContent = profile.data?.display_name.trim() || "حسابي";
            projects = projectRows;
            reportRows = reports.data ?? [];
            hasMoreReports = reportRows.length === 20;
            renderProjectPicker();
            renderReports();
            const preferred = preferredProject(owner);
            const selected = projects.find(project => project.id === preferred && !project.archived) ?? projects.find(project => !project.archived);
            if (selected)
                await selectProject(selected.id, version);
            if (!isCurrent(owner, version))
                return;
            workspaceReady = true;
            message("account-status", "");
            message("workspace-status", projects.length ? "" : "اختر فكرة لحفظ أول مشروع في حسابك.");
        }
        catch (error) {
            if (isCurrent(owner, version)) {
                message("workspace-status", errorText(error), true);
                message("account-status", "لم تكتمل استعادة البيانات. استخدم «إعادة تحميل بياناتي».", true);
            }
        }
        finally {
            if (isCurrent(owner, version)) {
                loadingWorkspace = false;
                updatePrivateControls();
            }
        }
    }
    function renderProjectPicker() {
        projectPicker.replaceChildren();
        for (const project of projects) {
            const option = document.createElement("option");
            option.value = project.id;
            option.textContent = project.title + (project.archived ? ' — محفوظ' : ' — جارٍ التنفيذ');
            projectPicker.append(option);
        }
        element("saved-projects-field").hidden = true;
        const history = element('project-history-list');
        history.replaceChildren();
        for (const project of projects.filter(p => p.archived)) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = project.title;
            button.addEventListener('click', () => { void selectProject(project.id).catch(e => message('workspace-status', errorText(e), true)); });
            history.append(button);
        }
        if (!history.children.length) {
            const note = document.createElement('p');
            note.textContent = 'لا توجد مشاريع محفوظة بعد.';
            history.append(note);
        }
    }
    function renderProgress() {
        const done = taskRows.filter(task => task.is_completed).length;
        const progress = element("workspace-progress");
        progress.max = taskRows.length || 5;
        progress.value = done;
        element("workspace-progress-text").textContent = `${done} من ${taskRows.length} خطوات مكتملة`;
    }
    function currentExecutionPlan() {
        if (!activeProjectId)
            return null;
        const temporary = executionPlans.get(activeProjectId);
        if (temporary)
            return temporary;
        const saved = reportRows.find(r => r.project_id === activeProjectId && r.results?.kind === 'gemini_plan');
        return saved?.results?.data?.phases?.length === 5 ? saved.results.data : null;
    }
    function renderTasks() {
        const container = element('workspace-tasks');
        container.replaceChildren();
        const plan = currentExecutionPlan(), project = projects.find(p => p.id === activeProjectId);
        const add = (host, tag, value) => { const n = document.createElement(tag); n.textContent = String(value ?? ''); host.append(n); return n; };
        const list = (host, items) => { if (!items?.length)
            return; const ul = document.createElement('ul'); items.forEach(value => add(ul, 'li', value)); host.append(ul); };
        for (const task of taskRows) {
            const phase = plan?.phases[task.position - 1], title = phase?.title ?? task.title, row = document.createElement('article');
            row.className = 'workspace-task phase-row';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.is_completed;
            checkbox.disabled = !!project?.archived;
            checkbox.setAttribute('aria-label', 'إنجاز ' + title);
            checkbox.addEventListener('change', () => { void updateTask(task, checkbox); });
            const details = document.createElement('details');
            details.className = 'phase-details';
            const summary = document.createElement('summary');
            const first = title.match(/[A-Za-z\u0600-\u06FF]/)?.[0];
            summary.dir = first && /[A-Za-z]/.test(first) ? 'ltr' : 'rtl';
            add(summary, 'span', title);
            const arrow = add(summary, 'span', '‹');
            arrow.className = 'phase-arrow';
            arrow.setAttribute('aria-hidden', 'true');
            details.append(summary);
            const content = document.createElement('div');
            content.className = 'phase-content';
            if (phase) {
                if (task.position === 1) {
                    add(content, 'h4', 'الأدوات وتجهيز المشروع');
                    for (const tool of plan?.tools ?? []) {
                        add(content, 'h5', tool.name);
                        add(content, 'p', tool.setup);
                        try {
                            const url = new URL(tool.url ?? '');
                            if (url.protocol === 'https:' && ['www.who.int', 'who.int', 'www.cdc.gov', 'cdc.gov', 'www.nih.gov', 'nih.gov', 'pubmed.ncbi.nlm.nih.gov', 'www.mathworks.com', 'mathworks.com', 'www.autodesk.com', 'code.visualstudio.com', 'git-scm.com', 'nodejs.org', 'python.org', 'www.python.org', 'developer.mozilla.org', 'flutter.dev', 'docs.flutter.dev', 'developer.android.com', 'dotnet.microsoft.com', 'github.com', 'docs.github.com', 'pages.github.com'].includes(url.hostname)) {
                                const link = document.createElement('a');
                                link.href = url.href;
                                link.textContent = 'رابط الأداة';
                                link.target = '_blank';
                                link.rel = 'noopener noreferrer';
                                content.append(link);
                            }
                        }
                        catch { }
                    }
                    add(content, 'h4', 'المعارف والتقنيات');
                    list(content, plan?.languages);
                    add(content, 'h4', 'تنظيم الملفات');
                    list(content, plan?.files);
                }
                list(content, phase.steps);
                if (phase.deliverable)
                    add(content, 'p', 'الناتج: ' + phase.deliverable);
                if (phase.test)
                    add(content, 'p', 'اختبار المرحلة: ' + phase.test);
                if (task.position === 5) {
                    add(content, 'h4', 'قبل إنهاء المشروع');
                    list(content, plan?.launchChecklist);
                    add(content, 'h4', 'تعلّم لاحقًا');
                    list(content, plan?.nextLearning);
                }
            }
            else
                add(content, 'p', task.title);
            details.append(content);
            row.append(checkbox, details);
            container.append(row);
        }
        renderProgress();
        updatePrivateControls();
    }
    async function selectProject(id, version = identityVersion) {
        const owner = session?.user.id;
        const project = projects.find(item => item.id === id);
        if (!owner || !project)
            return;
        const selectionVersion = ++projectVersion;
        activeProjectId = id;
        window.IdeaForgeProjectChanged?.();
        projectPicker.value = id;
        element("workspace-title").textContent = project.title;
        element("workspace-description").textContent = project.description;
        element("workspace-project").hidden = false;
        element("workspace-empty").hidden = true;
        taskRows = [];
        renderTasks();
        message("workspace-status", "جارٍ تحميل مهام المشروع…");
        const result = await db().from("project_tasks").select("*").eq("owner_id", owner)
            .eq("project_id", id).order("position", { ascending: true });
        if (!isCurrent(owner, version) || selectionVersion !== projectVersion)
            return;
        if (result.error)
            throw result.error;
        taskRows = result.data ?? [];
        renderTasks();
        rememberProject(owner, id);
        message("workspace-status", taskRows.length === 5 ? "" : "لم تكتمل مهام المشروع. أعد تحميل البيانات.", taskRows.length !== 5);
    }
    async function updateTask(task, checkbox) {
        const owner = session?.user.id;
        if (!owner) {
            checkbox.checked = task.is_completed;
            return;
        }
        const version = identityVersion;
        const selected = projectVersion;
        const nextValue = checkbox.checked;
        pendingTasks++;
        updatePrivateControls();
        checkbox.disabled = true;
        message("workspace-status", "جارٍ حفظ التقدم…");
        try {
            const result = await db().from("project_tasks").update({ is_completed: nextValue })
                .eq("id", task.id).eq("owner_id", owner).select("*").single();
            if (!isCurrent(owner, version) || selected !== projectVersion)
                return;
            if (result.error)
                throw result.error;
            if (!result.data)
                throw new Error("Missing saved task");
            task.is_completed = result.data.is_completed;
            checkbox.checked = task.is_completed;
            renderProgress();
            updatePrivateControls();
            message("workspace-status", "تم حفظ التقدم.");
        }
        catch (error) {
            if (isCurrent(owner, version) && selected === projectVersion) {
                checkbox.checked = task.is_completed;
                message("workspace-status", errorText(error), true);
            }
        }
        finally {
            checkbox.disabled = false;
            if (isCurrent(owner, version)) {
                pendingTasks--;
                updatePrivateControls();
            }
        }
    }
    document.querySelectorAll(".choose-idea").forEach((chooseButton, index) => {
        chooseButton.addEventListener("click", async () => {
            recordEvent('idea_select', 'idea_' + (index + 1));
            const owner = requireAccount();
            const card = chooseButton.closest(".idea-card");
            if (!owner || !card || !workspaceReady || creatingProject)
                return;
            const version = identityVersion;
            creatingProject = true;
            updatePrivateControls();
            message("account-status", "جارٍ حفظ المشروع…");
            try {
                let selected = projects.find(project => project.source_card === index + 1 && (!card.dataset.aiGenerated || project.title === (card.querySelector("h3")?.textContent?.trim() ?? "")));
                if (!selected) {
                    const active = projects.find(p => !p.archived);
                    if (active && !window.confirm('يوجد مشروع جارٍ: ' + active.title + '\nبدء مشروع جديد سيحذف المشروع الحالي وخطته وتقاريره نهائيًا. هل تريد الاستبدال؟'))
                        return;
                    const result = await db().rpc?.('if_start_classified_project', { p_previous: active?.id ?? null, p_title: card.querySelector('h3')?.textContent?.trim() ?? '', p_description: card.querySelectorAll('p')[1]?.textContent?.trim() ?? '', p_source: index + 1, p_skills: card.dataset.skills ?? element('skills').value.trim(), p_goal: card.dataset.goal ?? element('goal').value, p_duration: Number(card.dataset.duration ?? element('time').value), p_unit: card.dataset.unit ?? element('time-unit').value, p_specialty: card.dataset.specialty ?? element('specialty').value, p_subspecialty: card.dataset.subspecialty ?? element('subspecialty').value });
                    if (!result)
                        throw new Error('Project service unavailable');
                    if (!isCurrent(owner, version))
                        return;
                    if (result.error)
                        throw result.error;
                    if (!result.data)
                        throw new Error("Missing saved project");
                    selected = result.data;
                    if (active) {
                        projects = projects.filter(p => p.id !== active.id);
                        reportRows = reportRows.filter(r => r.project_id !== active.id);
                        executionPlans.delete(active.id);
                        renderReports();
                    }
                    projects.unshift(selected);
                    renderProjectPicker();
                }
                await selectProject(selected.id, version);
                if (!isCurrent(owner, version))
                    return;
                message("account-status", "مشروعك وخطواته محفوظة في حسابك.");
                tabs[2]?.click();
                window.IdeaForgeEnsurePlan?.();
            }
            catch (error) {
                if (isCurrent(owner, version))
                    message("account-status", errorText(error), true);
            }
            finally {
                if (isCurrent(owner, version)) {
                    creatingProject = false;
                    updatePrivateControls();
                }
            }
        });
    });
    projectPicker.addEventListener("change", () => {
        void selectProject(projectPicker.value).catch(error => message("workspace-status", errorText(error), true));
    });
    element("reload-workspace").addEventListener("click", () => { void loadWorkspace(); });
    function renderReports() {
        const container = element("workspace-reports");
        container.replaceChildren();
        const activeContainer = element("active-development-list");
        activeContainer.replaceChildren();
        const developments = reportRows.filter(r => r.results?.kind !== 'gemini_plan');
        for (const report of developments) {
            const article = document.createElement("details");
            article.className = "workspace-report development-record";
            const working = report.results?.workflow_state === 'active';
            article.open = working;
            const title = document.createElement("summary");
            title.textContent = report.title.includes('Gemini') ? (report.title.includes('خطة') ? 'خطة تنفيذ المشروع' : 'تقرير التطوير') : report.title === 'تقرير تطوير الكود' ? 'تقرير التطوير' : report.title;
            const date = document.createElement("time");
            date.dateTime = report.created_at;
            date.textContent = new Date(report.created_at).toLocaleString("ar-SA");
            const request = document.createElement("p");
            request.textContent = report.change_request ? 'الطلب: ' + report.change_request : '';
            const code = document.createElement("pre");
            code.dir = "auto";
            code.textContent = report.code_snippet;
            const notes = document.createElement("pre");
            notes.textContent = report.results_text.replace(/^مراجعة Gemini/, "تقرير التطوير");
            article.append(title, date, request, code, notes);
            const saved = report.results?.data?.correctedCode;
            if (saved) {
                const download = document.createElement('button');
                download.type = 'button';
                download.textContent = 'تنزيل التطوير المحفوظ كاملًا';
                download.onclick = () => { const url = URL.createObjectURL(new Blob([saved], { type: 'text/plain;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'project-development.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
                article.append(download);
            }
            if (working) {
                const finish = document.createElement('button');
                finish.type = 'button';
                finish.textContent = 'تم الانتهاء';
                finish.addEventListener('click', async () => { const owner = session?.user.id, version = identityVersion; if (!owner)
                    return; finish.disabled = true; try {
                    const result = await db().rpc?.('if_finish_development', { p_report: report.id });
                    if (!isCurrent(owner, version))
                        return;
                    if (!result || result.error)
                        throw result?.error ?? new Error('Missing report');
                    const index = reportRows.findIndex(r => r.id === report.id);
                    if (index >= 0)
                        reportRows[index] = result.data;
                    renderReports();
                    window.IdeaForgeDevelopmentFinished?.(report.id);
                    message('workspace-status', 'تم الانتهاء. التقرير محفوظ في «تطويراتي».');
                }
                catch (error) {
                    message('workspace-status', errorText(error), true);
                    finish.disabled = false;
                } });
                article.append(finish);
                activeContainer.append(article);
            }
            else
                container.append(article);
        }
        element('workspace-active-developments').hidden = !developments.some(r => r.results?.workflow_state === 'active');
        element("workspace-no-reports").hidden = developments.some(r => r.results?.workflow_state !== 'active');
        element("workspace-no-reports").textContent = "لا توجد تقارير محفوظة في حسابك بعد.";
        moreReports.hidden = !hasMoreReports;
    }
    async function saveCurrentReport() {
        const owner = requireAccount();
        const results = element("code-results");
        const snippet = element("code-snippet").value;
        const request = element("code-request").value.trim();
        if (!owner) {
            message("report-save-status", "التحليل ظاهر هنا فقط. سجّل الدخول ثم أعد التحليل لحفظه.");
            return;
        }
        if (reportBusy || results.hidden || !snippet.trim() || !results.textContent?.trim())
            return;
        if (!workspaceReady) {
            message("report-save-status", "انتظر اكتمال استعادة بياناتك، ثم أعد محاولة الحفظ.");
            return;
        }
        if (new TextEncoder().encode(snippet).length > 51200 || request.length > 10000) {
            message("report-save-status", "حد المقتطف 50 كيلوبايت وحد الطلب 10000 حرف.", true);
            return;
        }
        const version = identityVersion;
        const projectId = activeProjectId;
        const notes = Array.from(results.children).map(node => node.textContent ?? "").join("\n\n");
        const fingerprint = JSON.stringify([owner, projectId, snippet, request, notes]);
        if (lastSavedFingerprint === fingerprint) {
            saveReport.hidden = true;
            message("report-save-status", "هذا التقرير محفوظ بالفعل في حسابك.");
            return;
        }
        reportBusy = true;
        saveReport.hidden = false;
        updatePrivateControls();
        message("report-save-status", "جارٍ حفظ التقرير…");
        try {
            const result = await db().from("code_reports").insert({
                project_id: projectId, code_snippet: snippet, change_request: request,
                results: { kind: request ? "request_example" : "regex_review", text: notes, version: 1 },
                results_text: notes
            }).select("*").single();
            if (!isCurrent(owner, version))
                return;
            if (result.error)
                throw result.error;
            if (!result.data)
                throw new Error("Missing saved report");
            reportRows.unshift(result.data);
            lastSavedFingerprint = fingerprint;
            renderReports();
            saveReport.hidden = true;
            message("report-save-status", "تم حفظ التقرير في حسابك.");
            tabs[2]?.click();
        }
        catch (error) {
            if (isCurrent(owner, version))
                message("report-save-status", errorText(error) + " يمكنك إعادة محاولة الحفظ.", true);
        }
        finally {
            if (isCurrent(owner, version)) {
                reportBusy = false;
                updatePrivateControls();
            }
        }
    }
    element('finish-project').addEventListener('click', async () => {
        const current = projects.find(p => p.id === activeProjectId), owner = session?.user.id, version = identityVersion;
        if (!current || !owner || current.archived || taskRows.length !== 5 || taskRows.some(t => !t.is_completed))
            return;
        const button = element('finish-project');
        button.disabled = true;
        try {
            const result = await db().rpc?.('if_complete_project', { p_project: current.id });
            if (!isCurrent(owner, version))
                return;
            if (!result || result.error)
                throw result?.error ?? new Error('Missing result');
            current.archived = true;
            activeProjectId = null;
            taskRows = [];
            element('workspace-project').hidden = true;
            element('workspace-empty').hidden = false;
            window.IdeaForgeProjectChanged?.();
            renderProjectPicker();
            renderTasks();
            message('workspace-status', 'تم الانتهاء. مشروعك وخطته وتقاريره محفوظة في «مشاريعي» و«تطويراتي». يمكنك بدء مشروع جديد.');
        }
        catch (error) {
            message('workspace-status', errorText(error), true);
        }
        finally {
            if (isCurrent(owner, version))
                updatePrivateControls();
        }
    });
    saveReport.addEventListener("click", () => { void saveCurrentReport(); });
    moreReports.addEventListener("click", async () => {
        const owner = session?.user.id;
        if (!owner || moreBusy)
            return;
        const version = identityVersion;
        moreBusy = true;
        updatePrivateControls();
        try {
            const result = await db().from("code_reports").select("*").eq("owner_id", owner)
                .order("created_at", { ascending: false }).order("id", { ascending: false }).range(reportRows.length, reportRows.length + 19);
            if (!isCurrent(owner, version))
                return;
            if (result.error)
                throw result.error;
            const rows = result.data ?? [];
            const known = new Set(reportRows.map(row => row.id));
            reportRows.push(...rows.filter(row => !known.has(row.id)));
            hasMoreReports = rows.length === 20;
            renderReports();
        }
        catch (error) {
            if (isCurrent(owner, version))
                message("workspace-status", errorText(error), true);
        }
        finally {
            if (isCurrent(owner, version)) {
                moreBusy = false;
                updatePrivateControls();
            }
        }
    });
    analyzeButton?.addEventListener("click", () => {
        if (!analyzeCode())
            return;
        recordEvent('analysis', 'develop');
        saveReport.hidden = false;
        message("report-save-status", "");
        // تحليل الزائر متاح، لكن الحفظ يتطلب جلسة حقيقية.
        if (session)
            void saveCurrentReport();
        else
            message("report-save-status", "لم يُحفظ التقرير. سجّل الدخول ثم أعد التحليل لحفظه.");
    });
    element("code-file").addEventListener("change", async (event) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (!file)
            return;
        if (!/\.(js|ts|jsx|tsx|html|css|py|java|c|cpp|cs|php|json|txt|md|csv)$/i.test(file.name) || file.size > 1048576) {
            message("report-save-status", "اختر ملفًا نصيًا بحجم لا يتجاوز واحد ميجابايت.", true);
            input.value = "";
            return;
        }
        try {
            element("code-snippet").value = await file.text();
            element("code-results").hidden = true;
            saveReport.hidden = true;
            message("report-save-status", "تم تحميل المحتوى. اضغط طوّر مشروعي.");
        }
        catch {
            message("report-save-status", "تعذرت قراءة الملف.", true);
        }
    });
    for (const id of ["code-snippet", "code-request"]) {
        element(id).addEventListener("input", () => {
            element("code-results").hidden = true;
            saveReport.hidden = true;
            message("report-save-status", "تغيّر المقتطف أو الطلب. أعد التحليل قبل الحفظ.");
        });
    }
    demoCodeButton?.addEventListener("click", () => {
        element("code-results").hidden = true;
        saveReport.hidden = true;
        message("report-save-status", "تمت تعبئة المثال. اضغط طوّر مشروعي.");
    });
    function setAuthMode(mode) {
        if (authBusy)
            return;
        authMode = mode;
        authForm.hidden = false;
        element('auth-modes').hidden = false;
        element("auth-title").textContent = mode === "signup" ? "إنشاء حساب" : "تسجيل الدخول";
        authEmail.type = mode === "signup" ? "email" : "text";
        authEmail.autocomplete = mode === "signup" ? "email" : "username";
        element("auth-identity-label").textContent = mode === "signup" ? "البريد الإلكتروني" : "البريد الإلكتروني أو اسم المستخدم";
        authPassword.value = "";
        element("auth-name-field").hidden = mode !== "signup";
        authName.required = mode === "signup";
        authPassword.autocomplete = mode === "signup" ? "new-password" : "current-password";
        element("auth-submit").textContent = mode === "signup" ? "إنشاء حساب" : "دخول";
        element("auth-login").setAttribute("aria-pressed", String(mode === "login"));
        element("auth-signup").setAttribute("aria-pressed", String(mode === "signup"));
        message("auth-message", "");
    }
    openAuth.addEventListener("click", showAuth);
    element("auth-login").addEventListener("click", () => setAuthMode("login"));
    element("auth-signup").addEventListener("click", () => setAuthMode("signup"));
    element("close-auth").addEventListener("click", () => { authDialog.close(); authPassword.value = ""; });
    authDialog.addEventListener("close", () => { authPassword.value = ""; });
    authForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!client || authBusy || !authForm.reportValidity())
            return;
        if (authMode === "signup" && !authName.value.trim()) {
            message("auth-message", "اكتب اسمًا ظاهرًا للحساب.", true);
            return;
        }
        authBusy = true;
        for (const button of authForm.querySelectorAll("button"))
            button.disabled = true;
        element("auth-login").disabled = true;
        element("auth-signup").disabled = true;
        const mode = authMode;
        message("auth-message", mode === "signup" ? "جارٍ إنشاء الحساب…" : "جارٍ تسجيل الدخول…");
        try {
            const credentials = { email: authEmail.value.trim(), password: authPassword.value };
            let result = mode === "signup"
                ? await client.auth.signUp({ ...credentials, options: {
                        data: { display_name: authName.value.trim() },
                        emailRedirectTo: new URL("./", location.origin + location.pathname).href
                    } })
                : await client.auth.signInWithPassword(credentials);
            if (mode === 'signup' && !result.error && !result.data?.session) {
                result = await client.auth.signInWithPassword(credentials);
            }
            if (result.error && (result.error.code === 'email_not_confirmed' || result.error.message.includes('Email not confirmed'))) {
                message('auth-message', 'تعذر دخول هذا الحساب القديم. تواصل مع مسؤول الموقع لمراجعة حالته.', true);
                return;
            }
            if (mode === "login" && result.error && client.rpc) {
                const response = await client.rpc('if_admin_login', { p_username: credentials.email, p_password: credentials.password });
                if (response.error)
                    throw response.error;
                const admin = response.data;
                if (admin?.ok && admin.token) {
                    sessionStorage.setItem('ideaforge:admin-session', admin.token);
                    authPassword.value = "";
                    location.assign('admin.html');
                    return;
                }
                if (admin?.code === 'rate_limited') {
                    message('auth-message', 'توقفت محاولات هذا الحساب مؤقتًا. حاول بعد عشر دقائق.', true);
                    return;
                }
            }
            if (result.error)
                throw result.error;
            authPassword.value = "";
            if (result.data?.session) {
                applySession(result.data.session);
                if (client.rpc) {
                    const access = await client.rpc('if_admin_login_with_account', {});
                    const admin = access.data;
                    if (access.error)
                        message('account-status', 'اكتمل دخول الحساب، لكن تعذر التحقق من صلاحياته. أعد المحاولة لاحقًا.', true);
                    if (!access.error && admin?.ok && admin.token) {
                        sessionStorage.setItem('ideaforge:admin-session', admin.token);
                        location.assign('admin.html');
                        return;
                    }
                }
                authDialog.close();
            }
            else {
                message("auth-message", "لم تبدأ جلسة دخول. جرّب «لدي حساب» أو تواصل مع مسؤول الموقع.");
            }
        }
        catch (error) {
            message("auth-message", errorText(error), true);
        }
        finally {
            authPassword.value = "";
            authBusy = false;
            for (const button of authForm.querySelectorAll("button"))
                button.disabled = false;
            element("auth-login").disabled = false;
            element("auth-signup").disabled = false;
        }
    });
    element('open-admin-panel').addEventListener('click', async (event) => {
        if (!session || !client?.rpc)
            return;
        event.preventDefault();
        try {
            const response = await client.rpc('if_admin_login_with_account', {});
            if (response.error)
                throw response.error;
            const result = response.data;
            if (!result?.ok || !result.token) {
                element('open-admin-panel').hidden = true;
                message('account-status', 'لا توجد صلاحية إدارة مفعّلة لهذا الحساب.', true);
                return;
            }
            sessionStorage.setItem('ideaforge:admin-session', result.token);
            location.assign('admin.html');
        }
        catch (error) {
            message('account-status', errorText(error), true);
        }
    });
    signOut.addEventListener("click", async () => {
        if (!client)
            return;
        signOut.disabled = true;
        try {
            try {
                const adminToken = sessionStorage.getItem('ideaforge:admin-session');
                sessionStorage.removeItem('ideaforge:admin-session');
                element('open-admin-panel').hidden = true;
                if (adminToken && client.rpc)
                    await client.rpc('if_admin_logout', { p_token: adminToken });
            }
            catch { /* Normal sign out remains available if the admin endpoint is offline. */ }
            const result = await client.auth.signOut({ scope: "local" });
            if (result.error)
                throw result.error;
            applySession(null);
        }
        catch (error) {
            message("account-status", errorText(error), true);
        }
        finally {
            signOut.disabled = false;
        }
    });
    try {
        const config = environment.IDEAFORGE_SUPABASE;
        if (!config || !config.publishableKey.startsWith("sb_publishable_") || !environment.supabase) {
            throw new Error("Network client unavailable");
        }
        if (!/^https?:$/.test(location.protocol)) {
            throw new Error("Open the app over HTTP");
        }
        client = environment.supabase.createClient(config.url, config.publishableKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" }
        });
        try {
            visitId = sessionStorage.getItem('ideaforge:visit') ?? crypto.randomUUID();
            sessionStorage.setItem('ideaforge:visit', visitId);
            element('open-admin-panel').hidden = !sessionStorage.getItem('ideaforge:admin-session');
        }
        catch { /* Measurement is optional when browser storage is blocked. */ }
        void loadSiteUpdates();
        let observedSession = false;
        client.auth.onAuthStateChange((event, next) => {
            observedSession = true;
            applySession(next, event === "USER_UPDATED");
        });
        void client.auth.getSession().then(result => {
            if (result.error) {
                message("account-status", errorText(result.error), true);
                return;
            }
            if (!observedSession)
                applySession(result.data?.session ?? null);
        }).catch(error => message("account-status", errorText(error), true));
        const callbackError = new URLSearchParams(location.search).get("error_description")
            ?? new URLSearchParams(location.hash.slice(1)).get("error_description");
        if (callbackError) {
            message("account-status", "لم يكتمل تأكيد البريد أو انتهت صلاحية الرابط. سجّل الدخول أو اطلب المساعدة.", true);
        }
    }
    catch {
        message("account-status", location.protocol === "file:"
            ? "افتح الموقع من عنوان الخادم المحلي لتفعيل الحساب والحفظ."
            : "تعذر تحميل خدمة الحساب. تحقق من الإنترنت وأعد تحميل الصفحة.", true);
        element("account-name").textContent = "خدمة الحساب غير متاحة";
    }
    updatePrivateControls();
    // The browser never receives the Gemini key; all AI requests use the authenticated server route.
    window.IdeaForgeAI = {
        project: () => projects.find(p => p.id === activeProjectId) ?? null,
        setPlan: (plan, id) => { if (activeProjectId === id && plan.phases?.length === 5) {
            executionPlans.set(id, plan);
            renderTasks();
        } },
        async loadPlan(id) { const owner = session?.user.id, version = identityVersion; if (!owner)
            return null; const result = await db().from('code_reports').select('*').eq('owner_id', owner).eq('project_id', id).eq('results->>kind', 'gemini_plan').order('created_at', { ascending: false }).range(0, 0); if (!isCurrent(owner, version) || activeProjectId !== id)
            return null; if (result.error)
            throw new Error(errorText(result.error)); const saved = result.data?.[0]; if (saved && !reportRows.some(r => r.id === saved.id))
            reportRows.unshift(saved); return saved?.results?.data ?? null; },
        plans: () => reportRows.filter(r => r.results?.kind === 'gemini_plan'),
        async request(kind, payload) {
            const configuredEndpoint = environment.IDEAFORGE_AI?.endpoint?.trim();
            if (!configuredEndpoint && location.hostname?.endsWith('.github.io'))
                throw new Error('خدمة الذكاء الاصطناعي غير مربوطة بهذه النسخة بعد. يلزم ربط خادم الخدمة من إعدادات الموقع.');
            const endpoint = new URL(configuredEndpoint || '/api/ai', location.origin + location.pathname);
            if (endpoint.protocol !== 'https:' && endpoint.origin !== location.origin)
                throw new Error('عنوان خدمة الذكاء غير صالح.');
            if (!client)
                throw new Error('خدمة الحساب غير متاحة.');
            const current = await client.auth.getSession();
            const credential = current.data?.session;
            if (!credential?.access_token) {
                showAuth();
                throw new Error('سجّل الدخول لاستخدام الذكاء الاصطناعي.');
            }
            const owner = credential.user.id, version = identityVersion;
            const response = await fetch(endpoint.href, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + credential.access_token }, body: JSON.stringify({ kind, payload }) });
            if (!isCurrent(owner, version))
                throw new Error('تغيّر الحساب. أعد المحاولة.');
            if (response.status === 404 || !response.headers.get('content-type')?.includes('application/json'))
                throw new Error('تعذر الوصول إلى خدمة الذكاء الاصطناعي. راجع ربط خادم الخدمة من إعدادات الموقع.');
            let result;
            try {
                result = await response.json();
            }
            catch {
                throw new Error('وصل رد غير مكتمل من خدمة الذكاء. حاول مرة أخرى لاحقًا.');
            }
            const errors = { no_unique_ideas: 'لم تتوفر ثلاث أفكار مختلفة هذه المرة. غيّر المهارات أو الهدف وحاول مجددًا.', ideas_history_unavailable: 'تعذر التحقق من سجل الأفكار؛ لم نعرض أفكارًا قد تتكرر. أعد المحاولة لاحقًا.', provider_key_rejected: 'تعذر اعتماد مفتاح المزوّد. راجع إعداد الربط مع مسؤول الموقع.', ai_not_configured: 'خدمة المساعد تنتظر إضافة المفتاح السري من مالك الموقع.', sign_in_required: 'انتهت الجلسة. سجّل الدخول مجددًا.', provider_busy: 'خدمة المساعد مشغولة مؤقتًا بعد إعادة المحاولة. جرّب مرة أخرى لاحقًا.', provider_limit: 'وصلت الخدمة إلى حد الاستخدام. حاول لاحقًا.', rate_limited: 'محاولات كثيرة خلال دقيقة. انتظر قليلًا.', code_limit: 'أدخل محتوى لا يتجاوز واحد ميجابايت.', incomplete_response: 'لم تكتمل الإجابة. جرّب ملفًا أصغر أو طلبًا أدق.', timeout: 'استغرق الطلب وقتًا طويلًا. حاول مجددًا.' };
            if (!response.ok || !result.data) {
                const failure = new Error(errors[result.error ?? ''] ?? 'لم تكتمل استجابة المساعد. تحقق من الاتصال أو حاول لاحقًا.');
                if (result.error === 'provider_limit') {
                    const scope = result.quotaScope;
                    failure.message = scope === 'daily' ? 'نفدت الحصة اليومية لدى مزوّد الذكاء الاصطناعي. الانتظار دقيقة لن يجدّدها.' : scope === 'minute' ? 'وصل المزوّد إلى حد الطلبات أو النصوص بالدقيقة. انتظر قليلًا ثم حاول.' : 'وصل مزوّد الذكاء الاصطناعي إلى حد الاستخدام. راجع الحصة في حساب المزوّد.';
                }
                failure.code = result.error;
                failure.retryAfterSeconds = result.retryAfterSeconds;
                throw failure;
            }
            return result.data;
        },
        async saveDevelopment(output, rendered, code, request, key, projectId) {
            const owner = requireAccount();
            if (!owner || !workspaceReady)
                throw new Error('انتظر استعادة بيانات الحساب ثم حاول الحفظ.');
            const version = identityVersion;
            const result = await db().rpc?.('if_save_development', { p_key: key, p_project: projectId, p_output: output, p_rendered: rendered, p_code: code, p_request: request });
            if (!isCurrent(owner, version))
                throw new Error('تغيّر الحساب.');
            if (!result || result.error)
                throw result?.error ?? new Error('لم يكتمل الحفظ التلقائي.');
            const report = result.data;
            if (!report?.id)
                throw new Error('لم يكتمل الحفظ التلقائي.');
            const index = reportRows.findIndex(r => r.id === report.id);
            if (index >= 0)
                reportRows[index] = report;
            else
                reportRows.unshift(report);
            renderReports();
            tabs[2]?.click();
            return report.id;
        },
        async save(kind, output, rendered, code = 'خطة مشروع', request = '') {
            const owner = requireAccount();
            if (!owner || !workspaceReady)
                throw new Error('انتظر استعادة بيانات الحساب ثم حاول الحفظ.');
            const version = identityVersion;
            const snippet = new TextEncoder().encode(code).length <= 51200 ? code : 'محتوى يتجاوز حد التخزين؛ النص الأصلي غير مخزن. المحفوظ هو التقرير فقط.';
            const result = await db().from('code_reports').insert({ project_id: activeProjectId, title: kind === 'gemini_plan' ? 'خطة تنفيذ المشروع' : 'تقرير التطوير', code_snippet: snippet || 'خطة مشروع', change_request: request, results: { kind, data: output }, results_text: rendered.slice(0, 100000) }).select('*').single();
            if (!isCurrent(owner, version))
                throw new Error('تغيّر الحساب.');
            if (result.error)
                throw new Error(errorText(result.error));
            if (!result.data)
                throw new Error('لم يكتمل الحفظ.');
            reportRows.unshift(result.data);
            renderReports();
        }
    };
})();
