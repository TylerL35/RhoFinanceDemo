export function shell({ route, body, footerRight = '' }) {
  const link = (href, label) => `<a href="#${href}" ${route === href ? 'aria-current="page"' : ''}>${label}</a>`;
  return `
  <div class="layout">
    <nav class="sidebar">
      ${link('/', 'Home')}
      ${link('/reveal', 'Raise-by')}
      <div class="group">Workflows</div>
      ${link('/bill/hubspot', 'Bill Pay')}
      ${link('/invoices', 'Invoicing')}
      ${link('/alerts/duplicate', 'Needs a look')}
      <div class="group">Demo</div>
      ${link('/trust', 'Trust')}
      ${link('/claude', 'Ask Rho')}
      ${link('/connect', 'Connected data')}
      ${link('/setup', 'Use my numbers')}
    </nav>
    <main class="main">${body}</main>
  </div>
  <div class="footer">
    <span>Synthetic data</span>
    <span>${footerRight}</span>
    <button class="btn ghost" style="padding:2px 8px;font-size:11px" onclick="app.reset()">Start over</button>
  </div>`;
}

export const eyebrow = (t) => `<div class="eyebrow">${t}</div>`;
