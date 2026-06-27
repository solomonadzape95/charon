// Charon content script: a floating "✦ Tip" button that tips the current page's
// creator via the Charon API (CORS-enabled). Config comes from the popup.
(() => {
  if (window.__charonInjected) return;
  window.__charonInjected = true;

  const S = (el, styles) => Object.assign(el.style, styles);
  let panel = null;

  async function cfg() {
    return new Promise((res) => chrome.storage.local.get(["baseUrl", "userId"], res));
  }

  async function api(base, path, body) {
    const r = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
    return j;
  }

  function closePanel() {
    if (panel) panel.remove();
    panel = null;
  }

  function makePanel() {
    closePanel();
    panel = document.createElement("div");
    S(panel, {
      position: "fixed", bottom: "76px", right: "20px", width: "300px", zIndex: 2147483647,
      background: "#0e0e10", color: "#ededed", border: "1px solid #2a2a2e", borderRadius: "12px",
      padding: "14px", font: "13px/1.5 system-ui, sans-serif", boxShadow: "0 10px 40px rgba(0,0,0,.5)",
    });
    document.body.appendChild(panel);
    return panel;
  }

  function html(node, s) { node.innerHTML = s; return node; }

  async function startTip(targetUrl) {
    const url = targetUrl || location.href;
    const c = await cfg();
    const p = makePanel();
    if (!c.baseUrl || !c.userId) {
      html(p, `<b>ⲭ Charon</b><p style="color:#9a9a9a">Open the extension and connect your reader ID first.</p>`);
      return;
    }
    html(p, `<b>ⲭ Charon</b><p style="color:#9a9a9a">🔎 Identifying the creator…</p>`);
    let res;
    try {
      res = await api(c.baseUrl, "/api/tip", { userId: c.userId, url });
    } catch (e) {
      html(p, `<b>ⲭ Charon</b><p style="color:#f87171">${e.message}</p>`);
      return;
    }
    const { proposal, creatorId } = res;
    if (!creatorId || !proposal || (!proposal.bestWallet && !proposal.bestEmail)) {
      html(p, `<b>ⲭ Charon</b><p style="color:#9a9a9a">Couldn't identify a payable creator here.<br>${(proposal && proposal.reasoning) || ""}</p>`);
      return;
    }
    const who = proposal.creatorName || proposal.bestWallet || "creator";
    html(p, `
      <b>ⲭ Tip ${who}</b>
      <div style="color:#9a9a9a;margin:6px 0">${proposal.platform} · ${proposal.confidence}% · 💡 ${proposal.reasoning}</div>
      <label style="font-size:11px;color:#9a9a9a">Amount (USD)</label>
      <input id="chAmt" type="number" min="0.01" max="10" step="0.01" value="${Number(proposal.suggestedAmount).toFixed(2)}"
        style="width:100%;box-sizing:border-box;padding:7px;border-radius:7px;border:1px solid #2a2a2e;background:#18181b;color:#ededed;margin-top:3px" />
      <button id="chSend" style="width:100%;margin-top:10px;padding:8px;border:0;border-radius:7px;background:#e8b339;color:#000;font-weight:600;cursor:pointer">Send tip</button>
      <div id="chMsg" style="color:#9a9a9a;margin-top:8px;font-size:11px"></div>
    `);
    p.querySelector("#chSend").addEventListener("click", async () => {
      const amount = Number(p.querySelector("#chAmt").value);
      const msg = p.querySelector("#chMsg");
      msg.textContent = "Sending…";
      try {
        const { result } = await api(c.baseUrl, "/api/tip", {
          userId: c.userId, url, creatorId, amount,
          confidence: proposal.confidence, reasoning: proposal.reasoning, execute: true,
        });
        msg.innerHTML = result.status === "sent"
          ? `<span style="color:#4ade80">✅ Sent $${amount.toFixed(2)} on Arc.</span>`
          : result.status === "escrowed"
            ? `<span style="color:#e8b339">📩 $${amount.toFixed(2)} held in escrow — creator notified.</span>`
            : `<span style="color:#f87171">${result.reason || "failed"}</span>`;
      } catch (e) {
        msg.innerHTML = `<span style="color:#f87171">${e.message}</span>`;
      }
    });
  }

  const btn = document.createElement("button");
  btn.textContent = "✦ Tip";
  S(btn, {
    position: "fixed", bottom: "20px", right: "20px", zIndex: 2147483647,
    padding: "10px 14px", border: "0", borderRadius: "999px", background: "#e8b339",
    color: "#000", fontWeight: "700", fontFamily: "system-ui, sans-serif", cursor: "pointer",
    boxShadow: "0 6px 20px rgba(0,0,0,.4)",
  });
  btn.addEventListener("click", () => (panel ? closePanel() : startTip()));
  document.documentElement.appendChild(btn);

  // Announce presence so a Charon profile page can prefer the extension over Telegram.
  document.documentElement.setAttribute("data-charon-ext", "1");

  // Let a Charon profile page hand us a specific creator URL to tip.
  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const d = e.data;
    if (d && d.type === "CHARON_TIP" && typeof d.url === "string") startTip(d.url);
  });
})();
