import { Request, Response } from "express";

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Amwal SmartBox — Test Page</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 720px; margin: 32px auto; padding: 0 16px; color: #222; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    .muted { color: #888; font-size: 13px; margin-bottom: 24px; }
    fieldset { border: 1px solid #ddd; border-radius: 6px; padding: 16px 20px; margin: 16px 0; }
    legend { font-weight: 600; padding: 0 6px; }
    label { display: block; font-size: 13px; margin-top: 10px; }
    input { width: 100%; padding: 8px 10px; border: 1px solid #ccc; border-radius: 4px; font: inherit; box-sizing: border-box; }
    button { background: #5b3df5; color: #fff; border: 0; border-radius: 4px; padding: 10px 16px; font-size: 14px; cursor: pointer; margin-top: 12px; }
    button[disabled] { opacity: .6; cursor: not-allowed; }
    pre { background: #f6f6fa; padding: 12px; border-radius: 4px; font-size: 12px; overflow-x: auto; max-height: 280px; }
    .ok { color: #1a7f37; }
    .err { color: #b3261e; }
  </style>
</head>
<body>
  <h1>Amwal SmartBox — Test Page</h1>
  <p class="muted">Step 1 integration check. Login, initiate, then click Pay.</p>

  <fieldset>
    <legend>1. Login</legend>
    <label>Email <input id="email" value="restaurant@gmail.com" /></label>
    <label>Password <input id="password" type="password" value="password123" /></label>
    <button id="loginBtn">Login</button>
    <pre id="loginOut">(not logged in)</pre>
  </fieldset>

  <fieldset>
    <legend>2. Subscription</legend>
    <label>Restaurant ID <input id="restaurantId" value="3cGftA4U57LM7KcjUvisIsiwfZzZFV7l" /></label>
    <label>Plan ID <input id="planId" value="be8f1a43-c53a-49af-9f82-60423e26561b" /></label>
    <button id="payBtn" disabled>Pay with SmartBox</button>
    <pre id="initOut">(not initiated)</pre>
  </fieldset>

  <fieldset>
    <legend>3. SmartBox callback</legend>
    <pre id="resultOut">(no callback yet)</pre>
  </fieldset>

  <script>
    const $ = (id) => document.getElementById(id);
    const setOut = (el, text, cls) => { el.textContent = text; el.className = cls || ''; };
    let scriptLoaded = false;

    async function loadScript(url) {
      if (scriptLoaded) return;
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = url;
        s.onload = () => { scriptLoaded = true; resolve(); };
        s.onerror = () => reject(new Error('Failed to load ' + url));
        document.head.appendChild(s);
      });
    }

    $('loginBtn').onclick = async () => {
      try {
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: $('email').value, password: $('password').value }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || JSON.stringify(data));
        setOut($('loginOut'), 'Logged in: ' + (data.user?.email || 'ok'), 'ok');
        $('payBtn').disabled = false;
      } catch (e) {
        setOut($('loginOut'), 'Login failed: ' + e.message, 'err');
      }
    };

    $('payBtn').onclick = async () => {
      $('payBtn').disabled = true;
      setOut($('initOut'), 'Initiating...');
      setOut($('resultOut'), '(no callback yet)');
      try {
        const r = await fetch('/api/payments/amwal/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ restaurantId: $('restaurantId').value, planId: $('planId').value }),
        });
        const data = await r.json();
        if (!r.ok || !data.success) throw new Error(data.error || JSON.stringify(data));
        setOut($('initOut'), JSON.stringify(data, null, 2), 'ok');

        await loadScript(data.scriptUrl);

        if (typeof SmartBox === 'undefined' || !SmartBox.Checkout) {
          throw new Error('SmartBox SDK did not load on window');
        }

        SmartBox.Checkout.configure = {
          ...data.smartbox,
          completeCallback: (resp) => {
            setOut($('resultOut'), 'COMPLETE\\n' + JSON.stringify(resp, null, 2), 'ok');
          },
          errorCallback: (resp) => {
            setOut($('resultOut'), 'ERROR\\n' + JSON.stringify(resp, null, 2), 'err');
          },
          cancelCallback: (resp) => {
            setOut($('resultOut'), 'CANCEL\\n' + JSON.stringify(resp, null, 2));
          },
        };

        SmartBox.Checkout.showSmartBox();
      } catch (e) {
        setOut($('initOut'), 'Initiate failed: ' + e.message, 'err');
      } finally {
        $('payBtn').disabled = false;
      }
    };
  </script>
</body>
</html>`;

export const renderAmwalTestPage = (_req: Request, res: Response) => {
  res.type("html").send(html);
};
