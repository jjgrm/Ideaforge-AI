// Public browser configuration. Authorization is enforced by Supabase RLS.
window.IDEAFORGE_SUPABASE = Object.freeze({
    url: "https://wogyedpfuxqvsmxkyhlt.supabase.co",
    publishableKey: "sb_publishable_pkCFoK-m-HY6BkpJXGzlyw_xfHy_s5R"
});

// Public backend URL only. Never place AI keys in browser configuration.
// Leave empty on a server-hosted copy; GitHub Pages requires a separately hosted API.
window.IDEAFORGE_AI = Object.freeze({ endpoint: '' });
