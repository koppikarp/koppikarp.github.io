// ========= dawn / twilight toggle =========
const body = document.body;
const btn  = document.getElementById('theme-toggle');

(function init() {
  const t = localStorage.getItem('theme') || 'dawn';
  body.classList.add(t);
  btn.textContent = t === 'dawn' ? '☾' : '☀';
})();

btn.onclick = () => {
  const dawn = body.classList.toggle('dawn');
  body.classList.toggle('twilight', !dawn);
  btn.textContent = dawn ? '☾' : '☀';
  localStorage.setItem('theme', dawn ? 'dawn' : 'twilight');
};

// ========= altered‑world generative art =========
(async () => {
  try {
    // dynamic import so a 404 doesn’t kill the rest of the file
    const [{ default: define }, { Runtime, Inspector }] = await Promise.all([
      import('./altered-world/index.js'),
      import('./altered-world/runtime.js')
    ]);

    const runtime = new Runtime();
    const mount   = document.getElementById('altered-bg');
    runtime.module(define, Inspector.into(mount));
  } catch (err) {
    console.error('altered‑world failed to load:', err);
  }
})();
