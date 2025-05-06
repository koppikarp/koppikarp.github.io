// === theme toggle ===
const body=document.body;
const btn=document.getElementById('theme-toggle');

(function initTheme(){
  const t=localStorage.getItem('theme')||'dark';
  body.classList.add(t);
  btn.textContent=t==='dark'?'☀':'☾';
})();
btn.onclick=()=>{                       // flip classes + icon
  const dark=body.classList.toggle('dark');
  body.classList.toggle('light',!dark);
  btn.textContent=dark?'☀':'☾';
  localStorage.setItem('theme',dark?'dark':'light');
  setPalette();                         // refresh canvas colors
};

// === substrate‑style generative art ===
const canvas=document.getElementById('substrate');
const ctx=canvas.getContext('2d',{alpha:true});
let w,h,dark,colBG,colFG;

function resize(){
  canvas.width=w=window.innerWidth;
  canvas.height=h=window.innerHeight;
}
window.onresize=resize;

function setPalette(){
  dark=body.classList.contains('dark');
  colBG=dark?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.08)';  // faint fade
  colFG=dark?'#fff':'#000';
  ctx.strokeStyle=colFG;
}
resize();setPalette();

// walker objects
const N=350;
const walkers=Array.from({length:N},newWalker);
function newWalker(){
  return{
    x:Math.random()*w,
    y:Math.random()*h,
    a:Math.random()*Math.PI*2
  };
}
function step(p){
  p.a+=(Math.random()-.5)*0.4;      // jitter direction
  p.x+=Math.cos(p.a)*1.4;
  p.y+=Math.sin(p.a)*1.4;
  if(p.x<0||p.x>w||p.y<0||p.y>h) Object.assign(p,newWalker());
}

function frame(){
  // gently fade previous strokes
  ctx.fillStyle=colBG;
  ctx.fillRect(0,0,w,h);

  ctx.beginPath();
  for(const p of walkers){
    const {x,y}=p;
    step(p);
    ctx.moveTo(x,y);
    ctx.lineTo(p.x,p.y);
  }
  ctx.lineWidth=.7;
  ctx.stroke();
  requestAnimationFrame(frame);
}
frame();
