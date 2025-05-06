const body=document.body;
const btn=document.getElementById("theme-toggle");

(function init(){
  const stored=localStorage.getItem("theme")||"dark";
  body.classList.add(stored);
  btn.textContent=stored==="dark"?"☀️":"🌙";
})();

btn.addEventListener("click",()=>{
  const isDark=body.classList.toggle("dark");
  body.classList.toggle("light",!isDark);
  btn.textContent=isDark?"☀️":"🌙";
  localStorage.setItem("theme",isDark?"dark":"light");
});
