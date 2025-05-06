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

// === altered‑world generative art (no extra crud) ===
(async () => {
  try {
    const [{ default: define }, { Runtime, Inspector }] = await Promise.all([
      import('./altered-world/index.js'),
      import('./altered-world/runtime.js')
    ]);

    const mount   = document.getElementById('altered-bg');
    const runtime = new Runtime();

    // show *only* the canvas cell; ignore everything else
    runtime.module(define, name =>
      name === 'canvas' ? new Inspector(mount) : null
    );

  } catch (err) {
    console.error('altered‑world failed:', err);
  }
})();
