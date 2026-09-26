/* water-tools · 登录墙（GitHub + 邮箱）
   AUTH_GATE_ENABLED=false 时整段关闭（临时开放工具） */
var AUTH_GATE_ENABLED = false;

(function () {
  if (!AUTH_GATE_ENABLED) return;
  if (document.documentElement.hasAttribute('data-auth-gate-off')) return;

  var SUPABASE_URL = 'https://vbrvfpoqgklezvykmzvn.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_HUsypDUn_0t3kyVhQZ5nrw_ESfLMZ3P';
  var sb = null;
  var otpSent = false;
  var LOGIN_HTML =
    '<div class="ag-card">' +
    '<div class="ag-brand">CITEGLOW · WATER TOOLS</div>' +
    '<h1>计算工具需要登录</h1>' +
    '<div class="ag-sub">水利计算工具仅对已登录用户开放。可用邮箱验证码或 GitHub 登录。</div>' +
    '<label for="agEmail">邮箱</label>' +
    '<input id="agEmail" type="email" autocomplete="email" placeholder="you@example.com">' +
    '<div id="agOtpWrap" style="display:none">' +
    '<label for="agCode">验证码</label>' +
    '<input id="agCode" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="邮箱中的数字码">' +
    '</div>' +
    '<div class="ag-msg" id="agMsg"></div>' +
    '<div class="ag-row" id="agRow1">' +
    '<button type="button" class="ag-btn" id="agSend">发送验证码</button>' +
    '</div>' +
    '<div class="ag-row" id="agRow2" style="display:none">' +
    '<button type="button" class="ag-btn" id="agVerify">登录</button>' +
    '<button type="button" class="ag-btn ghost" id="agResend">重新发送</button>' +
    '</div>' +
    '<div class="ag-div">或</div>' +
    '<button type="button" class="ag-btn ghost" id="agGithub">使用 GitHub 登录</button>' +
    '<div class="ag-foot">登录后同域保持会话。未登录无法使用计算功能。</div>' +
    '</div>';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function cleanAuthHash() {
    if (!location.hash) return;
    var h = location.hash;
    if (h.indexOf('access_token') >= 0 || h.indexOf('refresh_token') >= 0 ||
        h.indexOf('token_type') >= 0 || h.indexOf('provider_token') >= 0 ||
        h.indexOf('type=signup') >= 0 || h.indexOf('error_description') >= 0) {
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
      else location.hash = '';
    }
  }

  function removeBoot() {
    var b = document.getElementById('authGateBoot');
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  function showBoot(text) {
    removeBoot();
    var el = document.createElement('div');
    el.id = 'authGateBoot';
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#FAF7F5;display:flex;align-items:center;justify-content:center;font-family:inherit;color:#666;font-size:14px;';
    el.textContent = text || 'Restoring session...';
    document.body.appendChild(el);
    document.body.classList.add('auth-gate-locked');
  }

  function ensureLoginUI() {
    removeBoot();
    if (!document.getElementById('authGate')) {
      var el = document.createElement('div');
      el.id = 'authGate';
      el.innerHTML = LOGIN_HTML;
      document.body.appendChild(el);
      bindLoginUI();
    }
    var g = document.getElementById('authGate');
    if (g) g.classList.remove('hidden');
    document.body.classList.add('auth-gate-locked');
  }

  function hideAllGate() {
    removeBoot();
    var g = document.getElementById('authGate');
    if (g) g.classList.add('hidden');
    document.body.classList.remove('auth-gate-locked');
    cleanAuthHash();
  }

  function setMsg(text, kind) {
    var m = document.getElementById('agMsg');
    if (!m) return;
    m.textContent = text || '';
    m.className = 'ag-msg' + (kind ? ' ' + kind : '');
  }

  function bindLoginUI() {
    var send = document.getElementById('agSend');
    var verify = document.getElementById('agVerify');
    var resend = document.getElementById('agResend');
    var gh = document.getElementById('agGithub');
    if (send) send.addEventListener('click', sendOtp);
    if (verify) verify.addEventListener('click', verifyOtp);
    if (resend) resend.addEventListener('click', sendOtp);
    if (gh) gh.addEventListener('click', loginGithub);
    var code = document.getElementById('agCode');
    if (code) code.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') verifyOtp();
    });
    var email = document.getElementById('agEmail');
    if (email) email.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !otpSent) sendOtp();
    });
  }

  async function sendOtp() {
    if (!sb) { ensureLoginUI(); setMsg('Login service not ready. Refresh.', 'err'); return; }
    var email = (document.getElementById('agEmail').value || '').trim();
    if (!email || email.indexOf('@') < 0) { setMsg('Invalid email', 'err'); return; }
    setMsg('Sending...');
    try {
      var res = await sb.auth.signInWithOtp({
        email: email,
        options: { shouldCreateUser: true }
      });
      if (res && res.error) throw res.error;
      otpSent = true;
      var wrap = document.getElementById('agOtpWrap');
      if (wrap) wrap.style.display = '';
      var r1 = document.getElementById('agRow1'); if (r1) r1.style.display = 'none';
      var r2 = document.getElementById('agRow2'); if (r2) r2.style.display = '';
      setMsg('Email sent. Click the link in the mail, or enter the code above.', 'ok');
    } catch (e) {
      setMsg('Send failed: ' + (e.message || e), 'err');
    }
  }

  async function verifyOtp() {
    if (!sb) return;
    var email = (document.getElementById('agEmail').value || '').trim();
    var code = (document.getElementById('agCode').value || '').trim();
    if (!email || !code) { setMsg('Email and code required', 'err'); return; }
    setMsg('Verifying...');
    try {
      var res = await sb.auth.verifyOtp({ email: email, token: code, type: 'email' });
      if (res && res.error) throw res.error;
      if (res && res.data && res.data.user) { hideAllGate(); return; }
      await wait(300);
      var s = await sb.auth.getSession();
      if (s && s.data && s.data.session) { hideAllGate(); return; }
      setMsg('No session after verify. Refresh the page.', 'err');
    } catch (e) {
      setMsg('Verify failed: ' + (e.message || e), 'err');
    }
  }

  async function loginGithub() {
    if (!sb) return;
    try {
      await sb.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: location.href.split('#')[0].split('?')[0] }
      });
    } catch (e) {
      ensureLoginUI();
      setMsg('GitHub login failed: ' + (e.message || e), 'err');
    }
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function exchangeCodeIfNeeded() {
    try {
      var u = new URL(location.href);
      var code = u.searchParams.get('code');
      if (!code || !sb || !sb.auth || !sb.auth.exchangeCodeForSession) return;
      await sb.auth.exchangeCodeForSession({ authCode: code });
      if (history.replaceState) history.replaceState(null, '', u.pathname + (u.search || ''));
    } catch (e) { /* ignore */ }
  }

  async function restoreSession() {
    await exchangeCodeIfNeeded();
    for (var i = 0; i < 6; i++) {
      try {
        var s = await sb.auth.getSession();
        if (s && s.data && s.data.session && s.data.session.user) return s.data.session.user;
      } catch (e) { /* retry */ }
      await wait(150);
    }
    try {
      if (sb.auth.getUser) {
        var u = await sb.auth.getUser();
        if (u && u.data && u.data.user) return u.data.user;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  ready(async function () {
    showBoot('Restoring session...');
    try {
      if (typeof window.supabase === 'undefined') {
        await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js');
      }
      if (!window.supabase || !window.supabase.createClient) {
        ensureLoginUI();
        setMsg('Login component failed to load', 'err');
        return;
      }
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
          autoRefreshToken: true
        }
      });

      var user = await restoreSession();
      if (user) hideAllGate();
      else {
        ensureLoginUI();
        setMsg('');
      }

      if (sb.auth && sb.auth.onAuthStateChange) {
        sb.auth.onAuthStateChange(function (event, session) {
          if (session && session.user) hideAllGate();
          else if (event === 'SIGNED_OUT') {
            ensureLoginUI();
            setMsg('');
          }
        });
      }
    } catch (e) {
      ensureLoginUI();
      setMsg('Init failed: ' + (e.message || e), 'err');
    }
  });
})();
