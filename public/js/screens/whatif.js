const HINT = 'Try: hire 2 more in March · the raise takes 3 months longer · cancel hubspot';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
));

// The box is stateless markup: app.applyWhatIf() owns the parse, the echo, and
// the snapshot. mountWhatIf() only prints the state the app already decided on.
export function mountWhatIf(el, state = globalThis.app?.state) {
  if (!el) return;

  const s = state ?? {};
  const intents = s.appliedIntents ?? [];
  const echo = s.lastEcho ?? HINT;
  const color = s.lastEchoOk === false ? '#08A68A' : '#747D79';
  const undo = intents.length
    ? `<button class="btn ghost" style="padding:10px 14px" onclick="app.undoWhatIf()">Undo</button>`
    : '';

  el.innerHTML = `
    <div class="card">
      <h2>What if…</h2>
      <div class="row">
        <input id="whatif" autocomplete="off" style="flex:1;min-width:240px;padding:10px;border:1px solid #D7E0DE;border-radius:6px;background:#fff"
          placeholder="hire 2 more in March" />
        <button class="btn" onclick="app.applyWhatIf()">Try it</button>
        ${undo}
      </div>
      <p class="muted" id="whatif-echo" aria-live="polite" style="margin-top:10px;color:${color}">${esc(echo)}</p>
    </div>`;
}
