/* water-tools · GitHub / 邮箱验证码 登录墙（共用）
   会话策略：先静默恢复（含 OAuth 回跳 #access_token），成功则直接进站；
   仅在确认未登录时才显示登录墙。 */
(function () {
  if (document.documentElement.hasAttribute('data-auth-gate-off')) return;

  var SUPABASE_URL = 'https://vbrvfpoqgklezvykmzvn.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_HUsypDUn_0t3kyVhQZ5nrw_ESfLMZ3P';
  var sb = null;
  var user = null;
  var otpSent = false;
  var gateReady = false;

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
    // 清掉地址栏中的 token，避免收藏/分享泄露
    if (!location.hash) return;
    if (location.hash.indexOf('access_token') >= 0 ||
        location.hash.indexOf('refresh_token') >= 0 ||
        location.hash.indexOf('token_type') >= 0 ||
        location.hash.indexOf('provider_token') >= 0 ||
        location.hash.indexOf('type=signup') >= 0) {
      if (history.replaceState) {
        history.replaceState(null, '', location.pathname + location.search);
      } else {
        location.hash = '';
      }
    }
  }

  function mountGate() {
    if (document.getElementById('authGate')) return;
    var el = document.createElement('div');
    el.id = 'authGate';
    el.innerHTML =
      '<div class="ag-card">' +
      '<div class="ag-brand">CITEGLOW · WATER TOOLS</div>' +
      '<h1>计算工具需要登录</h1>' +
      '<div class="ag-sub">水利计算工具仅对已登录用户开放。可使用邮箱验证码或 GitHub 登录。</div>' +
      '<label for="agEmail">邮箱</label>' +
      '<input id="agEmail" type="email" autocomplete="email" placeholder="you@example.com">' +
      '<div id="agOtpWrap" style="display:none">' +
      '<label for="agCode">验证码</label>' +
      '<input id="agCode" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="6 位验证码">' +
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
    document.body.appendChild(el);
  }

  function showGate() {
    mountGate();
    var g = document.getElementById('authGate');
    if (g) g.classList.remove('hidden');
    document.body.classList.add('auth-gate-locked');
  }

  function hideGate() {
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

  function bind() {
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
    if (!sb) { setMsg('登录服务未就绪，请刷新页面', 'err'); return; }
    var email = (document.getElementById('agEmail').value || '').trim();
    if (!email || email.indexOf('@') < 0) { setMsg('请填写有效邮箱', 'err'); return; }
    setMsg('发送中…');
    try {
      var { error } = await sb.auth.signInWithOtp({
        email: email,
        options: { shouldCreateUser: true }
      });
      if (error) throw error;
      otpSent = true;
      document.getElementById('agOtpWrap').style.display = '';
      document.getElementById('agRow1').style.display = 'none';
      document.getElementById('agRow2').style.display = '';
      setMsg('验证码已发送，请查收邮箱（含垃圾箱）', 'ok');
    } catch (e) {
      setMsg('发送失败：' + (e.message || e), 'err');
    }
  }

  async function verifyOtp() {
    if (!sb) { setMsg('登录服务未就绪', 'err'); return; }
    var email = (document.getElementById('agEmail').value || '').trim();
    var code = (document.getElementById('agCode').value || '').trim();
    if (!email || !code) { setMsg('请填写邮箱和验证码', 'err'); return; }
    setMsg('验证中…');
    try {
      var { data, error } = await sb.auth.verifyOtp({
        email: email,
        token: code,
        type: 'email'
      });
      if (error) throw error;
      user = data && data.user;
      if (user) { hideGate(); return; }
      setMsg('验证成功但未取到用户，请刷新页面', 'err');
    } catch (e) {
      setMsg('验证失败：' + (e.message || e), 'err');
    }
  }

  async function loginGithub() {
    if (!sb) { setMsg('登录服务未就绪', 'err'); return; }
    try {
      await sb.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: location.href.split('#')[0] }
      });
    } catch (e) {
      setMsg('GitHub 登录失败：' + (e.message || e), 'err');
    }
  }

  async function restoreSession() {
    // 1) 让 supabase 解析 OAuth 回跳 hash / code
    try {
      if (sb.auth.getSession) {
        var s1 = await sb.auth.getSession();
        if (s1 && s1.data && s1.data.session && s1.data.session.user) {
          return s1.data.session.user;
        }
      }
    } catch (e) { /* continue */ }

    // 2) 若 URL 仍带 token 且未入会话，再等一小会儿重试
    if (location.hash && location.hash.indexOf('access_token') >= 0) {
      await new Promise(function (r) { setTimeout(r, 400); });
      try {
        var s2 = await sb.auth.getSession();
        if (s2 && s2.data && s2.data.session && s2.data.session.user) {
          return s2.data.session.user;
        }
      } catch (e) { /* continue */ }
      // 3) 显式从 hash 取 token 交给 supabase
      try {
        var hash = location.hash.replace(/^#/, '');
        var params = {};
        hash.split('&').forEach(function (pair) {
          var kv = pair.split('=');
          params[decodeURIComponent(kv[0] || '')] = decodeURIComponent(kv[1] || '');
        });
        if (params.access_token) {
          var s3 = await sb.auth.getSession();
          if (s3 && s3.data && s3.data.session) return s3.data.session.user;
        }
      } catch (e) { /* continue */ }
    }
    return null;
  }

  ready(async function () {
    // 未确认前先显示极简等待，避免闪登录框
    var boot = document.createElement('div');
    boot.id = 'authGate';
    boot.className = 'hidden';
    mountGate();
    var g = document.getElementById('authGate');
    if (g) {
      g.classList.remove('hidden');
      setMsg('正在恢复登录状态…');
      // 禁用按钮直到判定完成
      ['agSend','agVerify','agResend','agGithub'].forEach(function(id){
        var b = document.getElementById(id);
        if (b) b.disabled = true;
      });
    }

    try {
      if (typeof window.supabase === 'undefined') {
        await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js');
      }
      if (typeof window.supabase === 'undefined') {
        showGate();
        ['agSend','agGithub'].forEach(function(id){
          var b = document.getElementById(id); if (b) b.disabled = false;
        });
        setMsg('无法加载登录组件（网络受限）', 'err');
        return;
      }
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true }
      });

      user = await restoreSession();

      if (user) {
        hideGate();
      } else {
        showGate();
        ['agSend','agGithub'].forEach(function(id){
          var b = document.getElementById(id); if (b) b.disabled = false;
        });
        setMsg('');
      }
      gateReady = true;

      sb.auth.onAuthStateChange(function (event, session) {
        user = session && session.user;
        if (user) {
          hideGate();
        } else if (gateReady) {
          showGate();
          ['agSend','agGithub'].forEach(function(id){
            var b = document.getElementById(id); if (b) b.disabled = false;
          });
        }
      });
    } catch (e) {
      showGate();
      ['agSend','agGithub'].forEach(function(id){
        var b = document.getElementById(id); if (b) b.disabled = false;
      });
      setMsg('登录初始化失败：' + (e.message || e), 'err');
    }
  });
})();
