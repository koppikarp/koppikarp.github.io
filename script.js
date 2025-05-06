// ========== dawn / twilight toggle ==========
const body = document.body;
const btn  = document.getElementById('theme-toggle');

(function initTheme(){
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

// ========== altered‑world generative background ==========
import define                 from './altered-world/index.js';      // ← normal hyphen
import { Runtime, Inspector } from './altered-world/runtime.js';    // ← normal hyphen

const runtime = new Runtime();
const mount   = document.getElementById('altered-bg');              // <div id="altered-bg">
runtime.module(define, Inspector.into(mount));
