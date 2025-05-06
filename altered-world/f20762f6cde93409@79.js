// https://observablehq.com/@mbostock/altered-world@79
function* _canvas(Noise,DOM,width,height,period,length)
{
  const perlin = new Noise(3);
  const context = DOM.context2d(width, height);
  context.canvas.style.background = "#000";
  context.lineWidth = 0.5;
  context.globalAlpha = 0.05;
  for (let px = 0; px < width; ++px) {
    for (let i = 0; i < height / 6; ++i) {
      let x = px;
      let y = Math.random() * height;
      let n = perlin.noise(x * period, y * period);
      context.strokeStyle = `hsl(${-210 + n * 600}, 100%, ${800 * n * n * n}%)`;
      context.beginPath();
      context.moveTo(x, y);
      for (let m = 0; m < length && y >= 0 && y <= height; ++m) {
        n = perlin.noise(x * period, y * period);
        context.lineTo(x += Math.cos(n * 14), y += Math.sin(n * 14));
      }
      context.stroke();
    }
    yield context.canvas;
  }
}


function _period(){return(
0.01
)}

function _Noise(){return(
class Noise {
  static lerp(t, a, b) {
    return a + t * (b - a);
  }
  static grad2d(i, x, y) {
    const v = (i & 1) === 0 ? x : y;
    return (i & 2) === 0 ? -v : v;
  }
  constructor(octaves = 1) {
    this.p = new Uint8Array(512);
    this.octaves = octaves;
    this.init();
  }
  init() {
    for (let i = 0; i < 512; ++i) {
      this.p[i] = Math.random() * 256;
    }
  }
  noise2d(x2d, y2d) {
    const X = Math.floor(x2d) & 255;
    const Y = Math.floor(y2d) & 255;
    const x = x2d - Math.floor(x2d);
    const y = y2d - Math.floor(y2d);
    const fx = (3 - 2 * x) * x * x;
    const fy = (3 - 2 * y) * y * y;
    const p0 = this.p[X] + Y;
    const p1 = this.p[X + 1] + Y;
    return Noise.lerp(
      fy,
      Noise.lerp(
        fx,
        Noise.grad2d(this.p[p0], x, y),
        Noise.grad2d(this.p[p1], x - 1, y)
      ),
      Noise.lerp(
        fx,
        Noise.grad2d(this.p[p0 + 1], x, y - 1),
        Noise.grad2d(this.p[p1 + 1], x - 1, y - 1)
      )
    );
  }
  noise(x, y) {
    let e = 1,
        k = 1,
        s = 0;
    for (let i = 0; i < this.octaves; ++i) {
      e *= 0.5;
      s += e * (1 + this.noise2d(k * x, k * y)) / 2;
      k *= 2;
    }
    return s;
  }
}
)}

function _height(){return(
600
)}

function _length(){return(
400
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("canvas")).define("canvas", ["Noise","DOM","width","height","period","length"], _canvas);
  main.variable(observer("period")).define("period", _period);
  main.variable(observer("Noise")).define("Noise", _Noise);
  main.variable(observer("height")).define("height", _height);
  main.variable(observer("length")).define("length", _length);
  return main;
}
