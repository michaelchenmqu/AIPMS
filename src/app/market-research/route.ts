// Serves the "Built for Both" partner & client market research briefing as a
// same-origin page, so the landing page never links out to claude.ai. Static
// HTML returned verbatim (own inline styles/fonts) rather than a React page —
// this is a single reference document, not an interactive multi-slide deck
// like /introduction.

export async function GET() {
  return new Response(HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

const HTML = `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>
<title>Built for Both — AIPMS Market Research</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;0,700;1,500&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">

<style>
  :root {
    --bg: #f5f2ea; --surface: #ffffff; --surface-2: #f0ece3; --border: #d8d0bd; --border-soft: #e9e3d7;
    --text: #14232e; --muted: #5c6a76; --muted-2: #8a95a0; --navy: #0b2b33;
    --accent: #128577; --accent-strong: #0f6e62; --accent-tint: #e3f3f1;
    --good: #137a4f; --good-bg: #e4f4ec; --bad: #a3450f; --bad-bg: #fbe9e0;
    --gap: #a3690f; --gap-bg: #fbf0dc; --info: #2f7d94; --info-bg: #e7f2f5;
    --short: #7d5fd6; --short-bg: #efe9fb; --sale: #b8863f; --cost: #2f7d94; --ops: #128577;
    --shadow: 0 1px 2px rgba(11,43,51,0.05), 0 10px 28px rgba(11,43,51,0.07);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0b2b33; --surface: #123039; --surface-2: #16404b; --border: #24515c; --border-soft: #1c3f49;
      --text: #eef3ee; --muted: #a9c0c9; --muted-2: #7d97a1; --navy: #eef3ee;
      --accent: #3fd9c7; --accent-strong: #6ee6d8; --accent-tint: #133b3c;
      --good: #5fd6a3; --good-bg: #123a2f; --bad: #f0a07e; --bad-bg: #3a2415;
      --gap: #e8b25c; --gap-bg: #3a2c11; --info: #7fc4da; --info-bg: #123742;
      --short: #b6a3ec; --short-bg: #211a3a; --sale: #e0b273; --cost: #7fc4da; --ops: #6ee6d8;
      --shadow: 0 1px 2px rgba(0,0,0,0.2), 0 14px 36px rgba(0,0,0,0.4);
    }
  }
  :root[data-theme="dark"] {
    --bg: #0b2b33; --surface: #123039; --surface-2: #16404b; --border: #24515c; --border-soft: #1c3f49;
    --text: #eef3ee; --muted: #a9c0c9; --muted-2: #7d97a1; --navy: #eef3ee;
    --accent: #3fd9c7; --accent-strong: #6ee6d8; --accent-tint: #133b3c;
    --good: #5fd6a3; --good-bg: #123a2f; --bad: #f0a07e; --bad-bg: #3a2415;
    --gap: #e8b25c; --gap-bg: #3a2c11; --info: #7fc4da; --info-bg: #123742;
    --short: #b6a3ec; --short-bg: #211a3a; --sale: #e0b273; --cost: #7fc4da; --ops: #6ee6d8;
    --shadow: 0 1px 2px rgba(0,0,0,0.2), 0 14px 36px rgba(0,0,0,0.4);
  }

  * { box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: "IBM Plex Sans", system-ui, sans-serif; line-height: 1.6; }
  h1, h2, h3 { font-family: "Spectral", Georgia, serif; color: var(--navy); text-wrap: balance; }
  a { color: var(--accent-strong); }
  code { font-family: "IBM Plex Mono", monospace; font-size: 0.85em; background: var(--surface-2); padding: 0.1em 0.35em; border-radius: 4px; }
  .wrap { max-width: 940px; margin: 0 auto; padding: 3.5rem 1.5rem 5rem; }

  header.doc-head { margin-bottom: 2.4rem; }
  .eyebrow { font-family: "IBM Plex Mono", monospace; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent-strong); margin-bottom: 0.9rem; }
  h1.title { font-size: 2.35rem; font-weight: 700; line-height: 1.14; margin: 0 0 0.9rem; }
  .dek { font-size: 1.03rem; color: var(--muted); max-width: 68ch; margin: 0 0 1.5rem; }
  .stat-row { display: flex; flex-wrap: wrap; gap: 0.6rem; }
  .stat-chip { display: inline-flex; align-items: baseline; gap: 0.4rem; background: var(--surface); border: 1px solid var(--border-soft); border-radius: 999px; padding: 0.4rem 0.9rem 0.4rem 0.7rem; font-size: 0.77rem; color: var(--muted); }
  .stat-chip b { font-family: "IBM Plex Mono", monospace; color: var(--navy); font-size: 0.88rem; }

  nav.toc { display: flex; flex-wrap: wrap; gap: 0.4rem 0; border-top: 1px solid var(--border-soft); border-bottom: 1px solid var(--border-soft); padding: 0.9rem 0; margin: 2.2rem 0; }
  nav.toc a { font-size: 0.76rem; font-weight: 600; color: var(--muted); text-decoration: none; padding: 0.3rem 0.55rem; border-right: 1px solid var(--border-soft); }
  nav.toc a:last-child { border-right: none; }
  nav.toc a:hover { color: var(--accent-strong); }

  section { margin-bottom: 3.2rem; scroll-margin-top: 1.5rem; }
  .section-kicker { font-family: "IBM Plex Mono", monospace; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted-2); margin-bottom: 0.5rem; }
  h2 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5rem; }
  h3.sub { font-size: 1rem; font-weight: 700; font-family: "IBM Plex Sans", sans-serif; color: var(--navy); margin: 1.6rem 0 0.6rem; }
  .section-intro { color: var(--muted); font-size: 0.93rem; max-width: 70ch; margin: 0 0 1.2rem; }
  p.body { font-size: 0.89rem; color: var(--text); max-width: 72ch; margin: 0 0 0.85rem; }

  .split3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
  @media (max-width: 820px) { .split3 { grid-template-columns: 1fr; } }
  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem; margin-bottom: 1rem; }
  @media (max-width: 680px) { .split { grid-template-columns: 1fr; } }
  .panel { background: var(--surface); border: 1px solid var(--border-soft); border-radius: 14px; padding: 1.15rem 1.25rem; box-shadow: var(--shadow); }
  .panel.bad { border-top: 3px solid var(--bad); }
  .panel.good { border-top: 3px solid var(--good); }
  .panel.warn { border-top: 3px solid var(--gap); }
  .panel.win { border-top: 3px solid var(--good); }
  .panel-label { font-family: "IBM Plex Mono", monospace; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 0.75rem; }
  .panel.bad .panel-label { color: var(--bad); }
  .panel.good .panel-label { color: var(--good); }
  .panel.warn .panel-label { color: var(--gap); }
  .panel.win .panel-label { color: var(--good); }
  .plist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
  .plist li { font-size: 0.83rem; padding-left: 1rem; position: relative; color: var(--muted); }
  .plist li b { color: var(--text); font-weight: 600; }
  .plist li::before { content: "—"; position: absolute; left: 0; color: var(--muted-2); }
  .cite { display: block; font-size: 0.68rem; color: var(--muted-2); margin-top: 0.1rem; }

  .checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1.5rem; margin: 0 0 1rem; }
  @media (max-width: 640px) { .checklist { grid-template-columns: 1fr; } }
  .checklist div { font-size: 0.86rem; color: var(--text); padding-left: 1.3rem; position: relative; }
  .checklist div::before { content: "✓"; position: absolute; left: 0; color: var(--good); font-weight: 700; }

  .tbl-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid var(--border-soft); box-shadow: var(--shadow); margin-bottom: 1.1rem; }
  table.grid { width: 100%; border-collapse: collapse; background: var(--surface); font-size: 0.81rem; }
  table.grid th { text-align: left; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-2); background: var(--surface-2); padding: 0.68rem 0.85rem; white-space: nowrap; }
  table.grid td { padding: 0.72rem 0.85rem; border-top: 1px solid var(--border-soft); vertical-align: top; }
  table.grid tr:first-child td { border-top: none; }
  table.grid td.seg { font-size: 0.66rem; font-weight: 700; text-transform: uppercase; color: var(--muted-2); letter-spacing: 0.04em; white-space: nowrap; }
  table.grid td.k { font-weight: 700; color: var(--navy); }
  table.grid td.muted { color: var(--muted); }
  .pill { display: inline-block; font-family: "IBM Plex Mono", monospace; font-size: 0.66rem; font-weight: 600; letter-spacing: 0.03em; padding: 0.2rem 0.55rem; border-radius: 999px; white-space: nowrap; }
  .pill.solved { background: var(--good-bg); color: var(--good); }
  .pill.partial { background: var(--info-bg); color: var(--info); }
  .pill.gap { background: var(--gap-bg); color: var(--gap); }

  .pillar { border: 1px solid var(--border-soft); border-radius: 14px; overflow: hidden; box-shadow: var(--shadow); background: var(--surface); margin-bottom: 1.1rem; }
  .pillar-head { padding: 0.95rem 1.3rem; display: flex; align-items: center; gap: 0.6rem; }
  .pillar-head .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .pillar-head .name { font-weight: 700; color: var(--navy); font-size: 0.98rem; font-family: "IBM Plex Sans", sans-serif; }
  .pillar-body { padding: 0 1.3rem 1.1rem; display: flex; flex-direction: column; gap: 0.7rem; }
  .idea { border-left: 3px solid var(--border-soft); padding-left: 0.9rem; }
  .idea .t { font-weight: 700; font-size: 0.87rem; color: var(--navy); margin-bottom: 0.15rem; }
  .idea .d { font-size: 0.84rem; color: var(--muted); }

  .brainstorm { display: flex; flex-direction: column; gap: 0.7rem; }
  .bidea { background: var(--surface); border: 1px solid var(--border-soft); border-radius: 12px; padding: 0.9rem 1.1rem; box-shadow: var(--shadow); display: flex; gap: 0.8rem; align-items: flex-start; }
  .bidea .num { font-family: "IBM Plex Mono", monospace; font-weight: 700; color: var(--accent-strong); background: var(--accent-tint); border-radius: 8px; height: 1.7rem; width: 1.7rem; min-width: 1.7rem; display: flex; align-items: center; justify-content: center; font-size: 0.82rem; }
  .bidea .t { font-weight: 700; font-size: 0.87rem; color: var(--navy); margin-bottom: 0.15rem; }
  .bidea .d { font-size: 0.83rem; color: var(--muted); }

  .position { border: 1px solid var(--border-soft); border-radius: 14px; overflow: hidden; box-shadow: var(--shadow); background: var(--surface); margin-bottom: 1rem; display: flex; }
  .position .bar { width: 6px; flex-shrink: 0; }
  .position .body2 { padding: 1.1rem 1.3rem; }
  .position .lead { font-weight: 700; color: var(--navy); font-size: 0.95rem; margin-bottom: 0.3rem; font-family: "IBM Plex Sans", sans-serif; }
  .position p { margin: 0; font-size: 0.86rem; color: var(--muted); }

  .callout { background: var(--navy); color: #f4f7f4; border-radius: 16px; padding: 1.6rem 1.8rem; margin: 0 0 2.5rem; }
  :root[data-theme="dark"] .callout, :root:not([data-theme="light"]) .callout { background: var(--surface-2); border: 1px solid var(--border-soft); }
  .callout .k { font-family: "IBM Plex Mono", monospace; font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: #6ee6d8; margin-bottom: 0.5rem; }
  .callout p { margin: 0; font-size: 0.92rem; opacity: 0.92; max-width: 68ch; }
  .callout p + p { margin-top: 0.6rem; }

  .sources { font-size: 0.76rem; color: var(--muted-2); columns: 2; column-gap: 2rem; list-style: none; padding: 0; margin: 0; }
  @media (max-width: 640px) { .sources { columns: 1; } }
  .sources li { margin-bottom: 0.45rem; break-inside: avoid; position: relative; padding-left: 1rem; }
  .sources li::before { content: "—"; position: absolute; left: 0; color: var(--muted-2); }
  .sources a { color: var(--muted-2); font-family: "IBM Plex Mono", monospace; }

  footer.doc-foot { text-align: center; font-size: 0.75rem; color: var(--muted-2); margin-top: 3.2rem; letter-spacing: 0.04em; }
  @media (max-width: 560px) { h1.title { font-size: 1.8rem; } .wrap { padding: 2.4rem 1.1rem 3.5rem; } }
</style>

<div class="wrap">

  <header class="doc-head">
    <div class="eyebrow">AIPMS · Partner &amp; Client Briefing</div>
    <h1 class="title">Built for Both</h1>
    <p class="dek">
      Short-term letting and long-term leasing are researched, sold and run as two different products by
      almost every incumbent in the market. AIPMS treats them as one property that can be either — and that
      difference compounds, from the pain points it removes on day one to where its AI genuinely gets ahead,
      not just even.
    </p>
    <div class="stat-row">
      <span class="stat-chip"><b>81%</b>&nbsp;of guests rank cleanliness #1</span>
      <span class="stat-chip"><b>300%</b>&nbsp;incumbent leasing-software price rise, real review</span>
      <span class="stat-chip"><b>48%</b>&nbsp;of agents juggle 4+ disconnected tools</span>
      <span class="stat-chip"><b>$50–300/mo</b>&nbsp;lost to duplicate subscriptions</span>
    </div>
  </header>

  <nav class="toc">
    <a href="#segments">Three customers</a>
    <a href="#coverage">Coverage map</a>
    <a href="#standard">Table stakes</a>
    <a href="#commodity">Honest baseline</a>
    <a href="#advantage">The advantage</a>
    <a href="#data">Market data</a>
    <a href="#roadmap">What's next</a>
    <a href="#position">The position</a>
    <a href="#sources">Sources</a>
  </nav>

  <!-- ============ THREE CUSTOMERS ============ -->
  <section id="segments">
    <div class="section-kicker">01 — Three Customers, One Platform</div>
    <h2>Short-Term, Long-Term, and Running Both</h2>
    <p class="section-intro">
      Short-term letting and long-term leasing are genuinely different businesses, with different
      customers and different pain points — so we researched them separately. But a third segment sits
      underneath both, and it's the one most vendors don't address at all: the agency running both at once.
    </p>

    <h3 class="sub">Short-term: guests, owners &amp; managers</h3>
    <div class="split3">
      <div class="panel bad">
        <div class="panel-label">Guests</div>
        <ul class="plist">
          <li>Slow host communication — response now expected under 5 minutes<span class="cite">Enso Connect</span></li>
          <li>Cleanliness is the #1 driver of negative reviews<span class="cite">iGMS</span></li>
          <li>"Not as described" causes 40% of bad reviews<span class="cite">Minut</span></li>
        </ul>
      </div>
      <div class="panel bad">
        <div class="panel-label">Owners</div>
        <ul class="plist">
          <li>Fee/commission opacity, figures given verbally not in writing<span class="cite">Classic Cottages</span></li>
          <li>No visible growth strategy from the manager<span class="cite">SuiteOp</span></li>
          <li>Trust-account risk they can't verify — 79 AU fines, H1 2025<span class="cite">GB Advisers</span></li>
        </ul>
      </div>
      <div class="panel bad">
        <div class="panel-label">Managers</div>
        <ul class="plist">
          <li>Cleaning-staff shortages concentrated in weekend turnover windows<span class="cite">RentalScaleUp</span></li>
          <li>Double bookings from channel-sync failures<span class="cite">Uplisting</span></li>
          <li>Incumbent vendors: undisclosed fees, poor support<span class="cite">Capterra</span></li>
        </ul>
      </div>
    </div>
    <p class="body"><b>AIPMS today:</b> AI concierge + WhatsApp inbox, AI clean-check, real-time channel-manager sync, itemised owner statements, three-way trust reconciliation. All shipped, not roadmap.</p>

    <h3 class="sub">Long-term: tenants, owners &amp; managers</h3>
    <div class="split3">
      <div class="panel bad">
        <div class="panel-label">Tenants</div>
        <ul class="plist">
          <li>Poor communication — unanswered emails/calls create uncertainty around arrears, rent reviews and key dates<span class="cite">Time Conti</span></li>
          <li>Slow maintenance response, directly affecting living conditions and safety<span class="cite">MRI Software</span></li>
          <li>Bond-refund delays — a typical property manager runs 150–200 properties at once, and that caseload shows up as processing delay<span class="cite">REIA data</span></li>
        </ul>
      </div>
      <div class="panel bad">
        <div class="panel-label">Owners</div>
        <ul class="plist">
          <li>Same fee/reporting opacity as short-stay owners — arguably worse, since a lease runs for years</li>
          <li>Their own incumbent software just got PE-acquired (PropertyMe, EQT, Dec 2025) with a new CEO installed weeks later<span class="cite">EQT</span></li>
          <li>One real reviewer: 300% price rise over 7 years, no tier for small operators under 20 properties<span class="cite">Capterra</span></li>
        </ul>
      </div>
      <div class="panel bad">
        <div class="panel-label">Managers</div>
        <ul class="plist">
          <li>No Planned Preventative Maintenance program → reactive maintenance, compliance risk, asset wear<span class="cite">industry sources</span></li>
          <li>Eight separate state tenancy acts and bond authorities — no single national rulebook</li>
          <li>Rising compliance load: AUSTRAC Tranche 2 AML/CTF lands 1 July 2026 on top of existing trust-account audits<span class="cite">REB</span></li>
        </ul>
      </div>
    </div>
    <p class="body"><b>AIPMS's answer:</b> the same trust-reconciliation engine, extended to a lease/tenant model; the AI clean-check pipeline repurposed for legally-required condition reports; the WhatsApp reminders engine repurposed for rent-due nudges, arrears warnings and inspection notices. Full technical detail available on request.</p>

    <h3 class="sub">Running both, on two systems</h3>
    <p class="body">
      This is the segment the first two don't reach on their own — and per the research, it's a growing
      one: mixed short/long portfolios are now described as a mainstream operating pattern, not an edge
      case.
    </p>
    <div class="split">
      <div class="panel warn">
        <div class="panel-label">What running two systems actually costs</div>
        <ul class="plist">
          <li>Manual month-end reconciliation: export bookings to Excel, pull the numbers into a separate accounting tool, assemble each owner statement by hand<span class="cite">industry sources</span></li>
          <li>Duplicate subscriptions — $50–300/month in overlapping tools is typical even for a small operator, before counting the labour to reconcile them<span class="cite">TenantCloud, ManageCasa</span></li>
          <li>48% of agents already run 4+ disconnected tools just for their core workflow — a second full PMS is not a marginal addition<span class="cite">TransUnion</span></li>
          <li>"The accounting requirements for each are different enough that most software handles one well and ignores the other" — the exact gap a mixed-portfolio operator lives with today<span class="cite">Rental-Network.com</span></li>
        </ul>
      </div>
      <div class="panel good">
        <div class="panel-label">What the market is already saying</div>
        <ul class="plist">
          <li>"Traditional landlords are evolving, with many now managing mixed portfolios... A unified, software-driven dashboard is now essential."<span class="cite">Key Data Dashboard</span></li>
          <li>The 2026 trend is explicitly toward single-dashboard platforms that "eliminate data silos and minimise errors caused by manual entry"<span class="cite">UnitConnect</span></li>
          <li>Integrated platforms save money (one subscription, not several) <em>and</em> the operational headache of juggling systems<span class="cite">ManageCasa</span></li>
        </ul>
      </div>
    </div>
    <p class="body">
      This is exactly the gap AIPMS's dual-mode architecture is built to close — not just tidy engineering,
      but a direct answer to a documented, worsening pain point, for the customer profile the market
      research says is becoming the norm, not the exception: an agency running both.
    </p>
  </section>

  <!-- ============ COVERAGE MAP ============ -->
  <section id="coverage">
    <div class="section-kicker">02 — Reality Check</div>
    <h2>All Three Segments, Checked Against What's Built</h2>
    <div class="tbl-wrap">
      <table class="grid">
        <tr><th>Segment</th><th>Pain point</th><th>AIPMS answer</th><th></th></tr>
        <tr><td class="seg">Short-term</td><td class="k">Slow guest response</td><td class="muted">AI concierge + WhatsApp inbox, instant</td><td><span class="pill solved">Solved</span></td></tr>
        <tr><td class="seg">Short-term</td><td class="k">Cleanliness disputes</td><td class="muted">AI clean-check, photo-verified before a job is marked done</td><td><span class="pill solved">Solved</span></td></tr>
        <tr><td class="seg">Short-term</td><td class="k">Owner fee opacity</td><td class="muted">Itemised statements, usage-based billing</td><td><span class="pill solved">Solved</span></td></tr>
        <tr><td class="seg">Long-term</td><td class="k">Tenant communication gaps</td><td class="muted">Tenant portal + WhatsApp rent/arrears/inspection reminders</td><td><span class="pill partial">Designed</span></td></tr>
        <tr><td class="seg">Long-term</td><td class="k">Bond &amp; condition-report disputes</td><td class="muted">AI clean-check pipeline repurposed as the condition-report engine</td><td><span class="pill partial">Designed</span></td></tr>
        <tr><td class="seg">Long-term</td><td class="k">Trust/compliance risk</td><td class="muted">Same three-way reconciliation engine, extended to lease transactions</td><td><span class="pill partial">Designed</span></td></tr>
        <tr><td class="seg">Running both</td><td class="k">Manual month-end reconciliation across two systems</td><td class="muted">One trust ledger — both branches post into it, nothing to reconcile between them</td><td><span class="pill solved">Structural</span></td></tr>
        <tr><td class="seg">Running both</td><td class="k">Duplicate subscriptions &amp; tool-switching</td><td class="muted">One login, one platform, one AI assistant for both letting types</td><td><span class="pill solved">Structural</span></td></tr>
        <tr><td class="seg">Running both</td><td class="k">A property "stuck" in the wrong mode</td><td class="muted">The dual-mode switch — same property, same history, no migration between systems</td><td><span class="pill partial">Designed</span></td></tr>
        <tr><td class="seg">Running both</td><td class="k">Inspection scheduling &amp; review not scaling past ~100 properties</td><td class="muted">AI inspection scheduler + QA engine, portfolio compliance dashboard</td><td><span class="pill partial">Designed</span></td></tr>
      </table>
    </div>
  </section>

  <!-- ============ TABLE STAKES ============ -->
  <section id="standard">
    <div class="section-kicker">03 — Standardised Functions</div>
    <h2>What Every Leasing PMS Already Does</h2>
    <p class="section-intro">
      From the feature sets of PropertyMe, Console Cloud, PropertyTree and VaultRE — the baseline any
      prospect will simply assume exists.
    </p>
    <div class="checklist">
      <div>Trust accounting &amp; compliance reporting</div>
      <div>Arrears detection, reminders &amp; reconciliation</div>
      <div>Routine &amp; entry/exit inspections</div>
      <div>Maintenance &amp; vendor/bill management</div>
      <div>Owner and tenant portals + mobile apps</div>
      <div>Lease/document management &amp; e-signature</div>
      <div>Bill scanning / OCR for vendor invoices</div>
      <div>Owner &amp; portfolio reporting</div>
    </div>
    <p class="body">
      Every one of these is already part of AIPMS's build roadmap for leasing — none of it is a gap, it's
      the entry ticket. The question worth asking isn't "do we have this," it's "does AI make ours
      meaningfully less manual than theirs."
    </p>
  </section>

  <!-- ============ COMMODITISED AI ============ -->
  <section id="commodity">
    <div class="section-kicker">04 — Honest Baseline</div>
    <h2>What "AI" Already Means in This Category</h2>
    <p class="section-intro">
      Worth being direct about: these are no longer differentiators anywhere in the category by late
      2026 — they're the new baseline. AIPMS needs equivalents, not because they're exciting, but because
      their absence would now read as a gap.
    </p>
    <div class="tbl-wrap">
      <table class="grid">
        <tr><th>Already-standard AI feature</th><th>Vendor-claimed effect</th><th>Source</th></tr>
        <tr><td class="k">Dynamic rent pricing</td><td class="muted">+8–15% revenue, vacancies filled ~25% faster</td><td class="cite">Revela</td></tr>
        <tr><td class="k">Arrears risk prediction</td><td class="muted">50% less time on collections, 22% fewer arrears</td><td class="cite">Revela</td></tr>
        <tr><td class="k">AI chatbots for tenant inquiries</td><td class="muted">Handle 60–80% of routine inquiries unattended</td><td class="cite">Grosvenor Systems</td></tr>
      </table>
    </div>
    <p class="body">
      The honest 2026 critique of the category is worth being clear-eyed about: most PropTech "AI" is a
      chatbot bolted onto an otherwise unchanged system — interface polish, not structural change. AIPMS's
      edge isn't having a chatbot too; it's that the whole platform — trust ledger, reminders engine, photo
      pipeline, staff AI assistant — was built AI-native from the first line of code, for a different
      product (short-stay) that now transfers wholesale into leasing.
    </p>
  </section>

  <!-- ============ THE ADVANTAGE ============ -->
  <section id="advantage">
    <div class="section-kicker">05 — Where AIPMS Actually Gets Ahead</div>
    <h2>Maximise Sales · Reduce Costs · Efficient Operations</h2>
    <p class="section-intro">The same three pillars AIPMS already sells short-stay on — each one has a leasing-specific answer that's genuinely new, not a re-skin of the commoditised list above.</p>

    <div class="pillar">
      <div class="pillar-head"><span class="dot" style="background:var(--sale)"></span><span class="name">Maximise Sales</span></div>
      <div class="pillar-body">
        <div class="idea"><div class="t">The cross-mode yield advisor</div><div class="d">No incumbent runs both short-stay and long-term in one system, so none of them can ask "is this property actually earning more as a holiday let, or would it earn more leased?" — AIPMS can, by comparing real booking history against suburb rent data (§06).</div></div>
        <div class="idea"><div class="t">AI rent-review copilot</div><div class="d">At each lease's review window, AI pulls the current suburb median from the market-data feed, compares it to the current rent, and drafts both the suggested figure and the state-compliant notice letter — one click for staff, not a spreadsheet exercise.</div></div>
        <div class="idea"><div class="t">The vacancy-marketing engine, reused</div><div class="d">The AI-drafted campaign writer already built for short-stay vacancy gaps generates listing copy for a vacant long-term rental too — same engine, a new template, effectively free to build.</div></div>
      </div>
    </div>

    <div class="pillar">
      <div class="pillar-head"><span class="dot" style="background:var(--cost)"></span><span class="name">Reduce Costs</span></div>
      <div class="pillar-body">
        <div class="idea"><div class="t">AI-drafted bond-claim evidence</div><div class="d">Reusing the AI clean-check photo pipeline for exit vs. entry condition reports, with a plain-English discrepancy summary attached — turns a legally time-boxed, dispute-prone chore into a one-click draft instead of a lost-bond risk.</div></div>
        <div class="idea"><div class="t">Retention-first renewal nudges</div><div class="d">A lease that doesn't renew costs re-letting fees, marketing, screening and vacancy days — all avoidable cost. AI drafts a personalised renewal offer ahead of expiry, weighted by payment history and tenure, instead of a generic reminder or nothing at all.</div></div>
        <div class="idea"><div class="t">Usage-based maintenance costing</div><div class="d">The same "bill what actually happened, not a flat guess" discipline already applied to cleaning/linen extends to vendor jobs — catching overcharging patterns the same way AI clean-check catches under-delivered cleans.</div></div>
      </div>
    </div>

    <div class="pillar">
      <div class="pillar-head"><span class="dot" style="background:var(--ops)"></span><span class="name">Efficient Operations</span></div>
      <div class="pillar-body">
        <div class="idea"><div class="t">A friendly nudge before the legal one</div><div class="d">The existing WhatsApp reminders engine sends a warm rent-due reminder the day after a missed payment — before any formal arrears notice clock starts — catching the honest-mistake cases without staff chasing, and without it ever becoming a tribunal matter.</div></div>
        <div class="idea"><div class="t">AI maintenance triage</div><div class="d">A tenant-submitted request with a photo gets classified for urgency (flagging statutory "urgent repair" cases) and routed with a suggested trade type — first-time-right routing instead of a staff member reading every ticket cold.</div></div>
        <div class="idea"><div class="t">One assistant, two products</div><div class="d">AI Trainer answers leasing SOP questions the same way it answers short-stay ones today — staff never learn a second tool for a second product line.</div></div>
        <div class="idea"><div class="t">AI inspection scheduling</div><div class="d">A single manager running 100+ properties isn't beaten by the inspection-cadence math, they're beaten by driving to the same suburb three times in a month. Once a month, AIPMS proposes a geographically-clustered inspection run for every lease entering its compliant window; staff approve the batch in one click, which books the calendar slots and auto-sends the statutory notice via the existing reminders engine.</div></div>
        <div class="idea"><div class="t">AI inspection QA &amp; a compliance dashboard</div><div class="d">The clean-check pipeline, repointed: each routine inspection's photos are compared against the entry baseline rather than reviewed fresh, and only genuine changes get flagged with a drafted report. No flags → auto-archived, no manual review — the time saved at scale is not reviewing what didn't change. The same data rolls up into one portfolio view: due this month, overdue, clear, flagged.</div></div>
      </div>
    </div>
  </section>

  <!-- ============ MARKET DATA ============ -->
  <section id="data">
    <div class="section-kicker">06 — Rental Market Data</div>
    <h2>A Real Source for the Trend Chart</h2>
    <p class="section-intro">Checked against what's actually reachable today, not just what's comprehensive on paper — the same discipline applied to every third-party integration in AIPMS.</p>
    <div class="tbl-wrap">
      <table class="grid">
        <tr><th>Source</th><th>Access model</th><th>Fit for AIPMS</th></tr>
        <tr><td class="k">Domain API</td><td class="muted">Self-serve developer sign-up (GitHub/Google login), rental estimates included</td><td class="muted">Best fit — the only major AU property API that issues keys without a sales conversation</td></tr>
        <tr><td class="k">NSW Fair Trading Rental Bond Data</td><td class="muted">Free, open government data (data.nsw.gov.au) — postcode-level median rent, dwelling type, bedrooms, monthly</td><td class="muted">Free starter source, zero commercial negotiation</td></tr>
        <tr><td class="k">SQM Research</td><td class="muted">Current national/city vacancy free; suburb-level history and detail behind a paid subscription</td><td class="muted">Good for a free vacancy-rate headline stat; revisit the paid tier once revenue justifies it</td></tr>
        <tr><td class="k">Cotality (CoreLogic) / PropTrack</td><td class="muted">Docs published, access gated behind direct sales contact; pricing not public</td><td class="muted">Not a v1 candidate — enterprise sales cycle, unclear cost</td></tr>
      </table>
    </div>
    <h3 class="sub">The feature this enables</h3>
    <p class="body">
      A <b>Market pulse</b> card on the property detail page and Owner portal — a rent-trend chart for the
      property's suburb/postcode, sourced from Domain and/or the NSW open bond data, with one AI-written
      paragraph underneath: <em>"Rents in Huskisson rose 4.2% over the past quarter; this lease is
      currently $25/week under the new median — worth flagging for the next rent-review window."</em> Built
      the same gated-with-fallback way as every other live integration — configured, it's real data;
      unconfigured, the card simply doesn't render.
    </p>
  </section>

  <!-- ============ WHAT'S NEXT ============ -->
  <section id="roadmap">
    <div class="section-kicker">07 — What's Next</div>
    <h2>Beyond the Current Build</h2>
    <p class="section-intro">
      None of this is built yet. It's included here because a partner or a prospective client evaluating
      AIPMS should see where the platform is headed, not just where it stands today.
    </p>
    <div class="brainstorm">
      <div class="bidea"><div class="num">1</div><div><div class="t">Portfolio digest, sent not requested</div><div class="d">A monthly AI-written summary per owner — market movement, any lease under-market, any maintenance pattern worth a heads-up — pushed via WhatsApp/email rather than waiting for the owner to open the portal and ask.</div></div></div>
      <div class="bidea"><div class="num">2</div><div><div class="t">Tenant-sentiment early warning</div><div class="d">Tone/frequency shifts in tenant portal messages or maintenance requests as a soft signal for "this tenancy may be heading somewhere" — flagged to staff well before it becomes a formal issue, not a replacement for judgement.</div></div></div>
      <div class="bidea"><div class="num">3</div><div><div class="t">AI-assisted tenant/owner matching</div><div class="d">When an owner's short-stay property is chronically under-occupied, surface it as a same-portfolio candidate for the tenant-screening queue instead of a cold vacancy listing — connecting the two sides of the dual-mode design directly.</div></div></div>
      <div class="bidea"><div class="num">4</div><div><div class="t">A compliance-clock dashboard</div><div class="d">Every open statutory deadline across the portfolio in one view — inspection notice due, bond-evidence window, rent-review notice period — the thing a busy small agency is most likely to miss, made impossible to miss.</div></div></div>
      <div class="bidea"><div class="num">5</div><div><div class="t">Voice-note intake</div><div class="d">A tenant or housekeeper sends a WhatsApp voice note instead of typing a maintenance report; AI transcribes and classifies it the same way a photo does today — lower friction than a form, especially for older tenants or non-native English speakers.</div></div></div>
    </div>
  </section>

  <!-- ============ POSITIONING ============ -->
  <section id="position">
    <div class="section-kicker">08 — The Position</div>
    <h2>Three Sentences, Three Customers</h2>
    <div class="position"><div class="bar" style="background:var(--short)"></div><div class="body2"><div class="lead">To a pure short-term operator</div><p>"We know what makes or breaks a guest review — speed and cleanliness — and we built AI directly into both, not bolted on top."</p></div></div>
    <div class="position"><div class="bar" style="background:var(--accent)"></div><div class="body2"><div class="lead">To a pure long-term manager</div><p>"We know why owners fire their property manager — fee opacity and trust risk — and why tenants complain — silence and slow maintenance. Both get fixed by the same reconciliation engine and the same WhatsApp-first communication we already proved on the short-stay side."</p></div></div>
    <div class="position"><div class="bar" style="background:var(--gap)"></div><div class="body2"><div class="lead">To an agency running both</div><p>"We know what it costs to run two systems: the manual month-end reconciliation, the duplicate subscriptions, the staff who have to learn two tools instead of one. We didn't bolt a leasing module onto a booking platform — we built one property record that can be either, so there was never a second system to reconcile against in the first place."</p></div></div>
  </section>

  <div class="callout">
    <div class="k">Bottom line</div>
    <p>
      The category's own AI features — dynamic pricing, arrears prediction, chatbots — are table stakes to
      match, not a strategy to copy. AIPMS's real advantage is structural: one AI-native platform, one
      trust ledger, one reminders engine, one photo pipeline, reused across short-stay and extended into
      leasing without ever building a second system.
    </p>
    <p>
      The first two customer segments were researched separately because they're genuinely different
      products with different buyers. The third — the cost of running them on two different systems — only
      exists because every other vendor treats them as separate products. That's the gap this platform was
      built to close.
    </p>
  </div>

  <!-- ============ SOURCES ============ -->
  <section id="sources">
    <div class="section-kicker">Sources</div>
    <h2>References</h2>
    <ul class="sources mono">
      <li><a href="https://www.getapp.com.au/compare/124175/129891/propertyme/vs/console-cloud" target="_blank" rel="noopener">GetApp AU — PropertyMe vs Console Cloud</a></li>
      <li><a href="https://slashdot.org/software/comparison/PropertyMe-vs-PropertyTree/" target="_blank" rel="noopener">Slashdot — PropertyMe vs PropertyTree</a></li>
      <li><a href="https://www.revela.co/resources/best-ai-property-management-software" target="_blank" rel="noopener">Revela — Best AI property management software 2026</a></li>
      <li><a href="https://www.grosvenorsystems.com/blog/how-to-use-ai-in-property-management" target="_blank" rel="noopener">Grosvenor Systems — How to use AI in property management</a></li>
      <li><a href="https://www.entrepreneur.com/starting-a-business/everyone-says-proptech-is-revolutionary-so-why-does/499707" target="_blank" rel="noopener">Entrepreneur — Why PropTech still looks the same</a></li>
      <li><a href="https://developer.domain.com.au/" target="_blank" rel="noopener">Domain Developer Portal</a></li>
      <li><a href="https://proptrack.com/property-data/property-data-apis" target="_blank" rel="noopener">PropTrack — Property data APIs</a></li>
      <li><a href="https://www.13labs.au/guides/australian-property-data-apis-compared" target="_blank" rel="noopener">13Labs — Australian property data APIs compared</a></li>
      <li><a href="https://www.nsw.gov.au/housing-and-construction/rental-forms-surveys-and-data/rental-bond-data" target="_blank" rel="noopener">NSW Government — Rental bond data</a></li>
      <li><a href="https://data.nsw.gov.au/data/dataset/rental-bond-lodgement" target="_blank" rel="noopener">Data.NSW — Rental Bond Lodgement dataset</a></li>
      <li><a href="https://www.nsw.gov.au/rent-check" target="_blank" rel="noopener">NSW Government — Rent Check</a></li>
      <li><a href="https://sqmresearch.com.au/property" target="_blank" rel="noopener">SQM Research — Property data</a></li>
      <li><a href="https://www.cotality.com/au/resources/downloads/quarterly-rental-review-report" target="_blank" rel="noopener">Cotality (CoreLogic) — Quarterly rental review</a></li>
      <li><a href="https://www.timeconti.com.au/handling-tenant-complaints/" target="_blank" rel="noopener">Time Conti — Handling tenant complaints</a></li>
      <li><a href="https://www.mrisoftware.com/au/blog/4-common-tenant-complaints-and-what-to-do/" target="_blank" rel="noopener">MRI Software AU — 4 common tenant complaints</a></li>
      <li><a href="https://propertymanageraustraliamedia.com.au/common-tenant-complaints-and-how-to-handle-them/" target="_blank" rel="noopener">Property Manager Australia — Common tenant complaints</a></li>
      <li><a href="https://mashmagazine.com.au/bond-refund-rights-australia/" target="_blank" rel="noopener">Mash Magazine — Bond refund rights Australia</a></li>
      <li><a href="https://www.rental-network.com/resource/short-term-rental-accounting-software" target="_blank" rel="noopener">Rental-Network.com — Short-term rental accounting software</a></li>
      <li><a href="https://eliteagent.com/inside-the-proptech-push-to-kill-the-fragmented-real-estate-tech-stack/" target="_blank" rel="noopener">Elite Agent — Killing the fragmented real estate tech stack</a></li>
      <li><a href="https://www.transunion.com/blog/fragmentation-real-estate-tech" target="_blank" rel="noopener">TransUnion — Fragmentation in real estate tech</a></li>
      <li><a href="https://www.keydatadashboard.com/blog/driving-property-management-growth-with-short-term-rental-trends" target="_blank" rel="noopener">Key Data Dashboard — Mixed portfolio growth trends</a></li>
      <li><a href="https://www.unitconnect.com/rental-property-management-software-trends-for-2026/" target="_blank" rel="noopener">UnitConnect — PM software trends 2026</a></li>
      <li><a href="https://managecasa.com/articles/property-management-software-pricing-what-it-actually-costs-for-under-100-doors" target="_blank" rel="noopener">ManageCasa — What PM software actually costs</a></li>
      <li><a href="https://www.tenantcloud.com/property-management/property-management-software-costs" target="_blank" rel="noopener">TenantCloud — PM software costs 2026</a></li>
    </ul>
    <p style="font-size:0.72rem;color:var(--muted-2);margin-top:0.8rem;">
      Full sourcing detail, including the short-term-only and regulatory-compliance research this document
      draws on, is available on request.
    </p>
  </section>

  <footer class="doc-foot">AIPMS · Prepared for partner &amp; prospective client review</footer>

</div>

</body></html>`;
