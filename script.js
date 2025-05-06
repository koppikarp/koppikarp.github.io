// ==== theme toggle ====
const body=document.body;
const btn=document.getElementById("theme-toggle");

(function init(){
  const saved=localStorage.getItem("theme")||"dawn";
  body.classList.add(saved);
  btn.textContent=saved==="dawn"?"☾":"☀";
})();
btn.onclick=()=>{
  const dawn=body.classList.toggle("dawn");
  body.classList.toggle("twilight",!dawn);
  btn.textContent=dawn?"☾":"☀";
  localStorage.setItem("theme",dawn?"dawn":"twilight");
};

// ==== altered‑world background ====
import define from "./altered‑world/index.js";
import {Runtime, Inspector} from "./altered‑world/runtime.js";

const runtime=new Runtime();
const mount=document.getElementById("altered-bg");
runtime.module(define, Inspector.into(mount));
