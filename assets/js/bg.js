(function () {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity = '1'; // Full opacity, since they avoid text!
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width, height;
    let isMobile = window.innerWidth < 768;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        isMobile = width < 768;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    window.addEventListener('resize', resize);
    resize();

    const N_TYPES = 20; // 20 border colors
    const NUM_CELLS = isMobile ? 50 : 150; // Slightly fewer cells so it's not overcrowded

    // Matrix for particle life
    const matrix = [];
    for (let i = 0; i < N_TYPES; i++) {
        matrix[i] = [];
        for (let j = 0; j < N_TYPES; j++) {
            // Bias slightly towards repulsion and reduce overall force to prevent clumping
            matrix[i][j] = (Math.random() * 2 - 1.2) * 0.2;
        }
    }

    const colors = [];
    for (let i = 0; i < N_TYPES; i++) {
        let hue = (i * (360 / N_TYPES) + (Math.random() * 10 - 5)) % 360;
        let sat = 60 + Math.random() * 40;
        let light = 45 + Math.random() * 50;
        colors.push(`hsl(${hue}, ${sat}%, ${light}%)`);
    }

    const splats = [];
    class Splat {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            // Record scroll so they stay glued to the document text instead of the fixed viewport
            this.scrollY = window.scrollY;
            this.rotation = Math.random() * Math.PI;
        }
        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y - (window.scrollY - this.scrollY));
            ctx.rotate(this.rotation);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -8);
                ctx.rotate(Math.PI * 2 / 5);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    class Cell {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.vx = 0;
            this.vy = 0;
            this.type = type;
            this.organelleType = Math.floor(Math.random() * 50); // 50 shapes!
            this.radius = (isMobile ? 8 : 12) + Math.random() * (isMobile ? 10 : 14);
            this.timeOffset = Math.random() * 1000;

            this.nucleus = {
                x: (Math.random() - 0.5) * 0.5,
                y: (Math.random() - 0.5) * 0.5,
                r: 0.25 + Math.random() * 0.15
            };

            // Generate some random points to use for scattered organelle types (speckles)
            this.speckles = Array.from({ length: 6 }, () => ({
                x: (Math.random() - 0.5) * 1.5,
                y: (Math.random() - 0.5) * 1.5,
                r: 0.05 + Math.random() * 0.05
            }));
        }

        explode() {
            splats.push(new Splat(this.x, this.y, colors[this.type]));
            this.y = height + this.radius * 2;
            this.x = Math.random() * width;
            this.vx = 0;
            this.vy = 0;
            this.type = Math.floor(Math.random() * N_TYPES);
            this.organelleType = Math.floor(Math.random() * 50);
        }

        update(safeBoxes) {
            let fx = 0;
            let fy = 0;
            const maxR = 80;

            for (let i = 0; i < cells.length; i++) {
                const other = cells[i];
                if (other === this) continue;

                let dx = this.x - other.x;
                let dy = this.y - other.y;
                if (dx > width / 2) dx -= width;
                else if (dx < -width / 2) dx += width;

                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > 0 && d < maxR) {
                    const rBase = this.radius + other.radius + 10;
                    if (d < rBase) {
                        const force = (d - rBase) / rBase * 0.8;
                        fx -= (dx / d) * force;
                        fy -= (dy / d) * force;
                    } else {
                        const maxInteract = maxR;
                        const D = d - rBase;
                        const force = matrix[this.type][other.type] * (1 - Math.abs(2 * D - (maxInteract - rBase)) / (maxInteract - rBase));
                        fx -= (dx / d) * force;
                        fy -= (dy / d) * force;
                    }
                }
            }

            // Box collision (safe zone around text)
            for (let box of safeBoxes) {
                let strictLeft = box.left + box.padX;
                let strictRight = box.right - box.padX;
                let strictTop = box.top + box.padY;
                let strictBottom = box.bottom - box.padY;

                if (this.x > strictLeft && this.x < strictRight && this.y > strictTop && this.y < strictBottom) {
                    this.explode();
                    return; // Stop updating this cell
                }

                // Find closest point on AABB to cell center
                let testX = this.x;
                let testY = this.y;
                if (this.x < box.left) testX = box.left;
                else if (this.x > box.right) testX = box.right;
                if (this.y < box.top) testY = box.top;
                else if (this.y > box.bottom) testY = box.bottom;

                let dx = this.x - testX;
                let dy = this.y - testY;
                let distance = Math.sqrt(dx * dx + dy * dy);

                let repulseR = this.radius + 18; // Thin margin of 18px away from text rect
                if (distance < repulseR) {
                    if (distance === 0) {
                        // Dead center: force randomly
                        fx += (Math.random() - 0.5) * 3;
                        fy += (Math.random() - 0.5) * 3;
                    } else {
                        // Push cell strongly outward
                        let force = (repulseR - distance) / repulseR * 2.0;
                        fx += (dx / distance) * force;
                        fy += (dy / distance) * force;
                    }
                }
            }

            // Upward drift (buoyancy)
            fy -= (isMobile ? 0.08 : 0.05) + Math.random() * 0.03;

            this.vx = (this.vx + fx) * 0.85;
            this.vy = (this.vy + fy) * 0.85;

            this.x += this.vx;
            this.y += this.vy;

            // X-wraparound
            if (this.x < -this.radius * 2) this.x += width + this.radius * 4;
            if (this.x > width + this.radius * 2) this.x -= width + this.radius * 4;

            // Upward recycle
            if (this.y < -this.radius * 4) {
                this.y = height + this.radius * 2; // spawn offscreen below
                this.x = Math.random() * width;
                this.vx = 0;
                this.vy = 0;

                // Keep the type random
                this.type = Math.floor(Math.random() * N_TYPES);
                this.organelleType = Math.floor(Math.random() * 50);
            }
        }

        draw(ctx, time) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(Math.sin(time * 0.0005 + this.timeOffset) * 0.5);

            const pts = [];
            for(let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const t = time * 0.002 + this.timeOffset;
                const rad = this.radius + Math.sin(angle * 3 + t) * (this.radius * 0.15) + Math.cos(angle * 2 - t) * (this.radius * 0.1);
                pts.push({ x: Math.cos(angle) * rad, y: Math.sin(angle) * rad });
            }

            const buildBlobPath = () => {
                ctx.beginPath();
                const xc = (pts[0].x + pts[pts.length - 1].x) / 2;
                const yc = (pts[0].y + pts[pts.length - 1].y) / 2;
                ctx.moveTo(xc, yc);
                for (let i = 0; i < pts.length - 1; i++) {
                    ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
                }
                ctx.quadraticCurveTo(pts[pts.length - 1].x, pts[pts.length - 1].y, xc, yc);
                ctx.closePath();
            };

            buildBlobPath();
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.fill();
            
            ctx.save();
            ctx.clip(); // Mask ALL inner parts exactly within cell!
            
            const drawFluorescent = (pathFunc) => {
                ctx.save(); ctx.beginPath(); pathFunc(ctx);
                ctx.fillStyle = "rgba(57, 255, 20, 0.85)"; ctx.shadowColor = "rgba(57, 255, 20, 1)"; ctx.shadowBlur = 6; ctx.fill(); ctx.restore();
            };
            const drawFluorescentStroke = (pathFunc) => {
                ctx.save(); ctx.beginPath(); pathFunc(ctx);
                ctx.strokeStyle = "rgba(57, 255, 20, 0.85)"; ctx.shadowColor = "rgba(57, 255, 20, 1)"; ctx.shadowBlur = 6; ctx.stroke(); ctx.restore();
            };


            let r = this.radius;
            let sp = this.speckles;
            let nx = this.nucleus.x * r;
            let ny = this.nucleus.y * r;
            let nr = this.nucleus.r * r;
            
            ctx.save();
            ctx.translate(nx, ny);
            switch(this.organelleType) {
                case 0: drawFluorescent(c => c.arc(r*0.4, r*0.4, r*0.15, 0, Math.PI*2)); break;
                case 1: drawFluorescent(c => { c.arc(r*0.4, r*0.1, r*0.1, 0, Math.PI*2); c.closePath(); c.arc(-r*0.2, r*0.4, r*0.08, 0, Math.PI*2); }); break;
                case 2: drawFluorescent(c => { for(let i=0; i<3; i++) c.arc(r*0.4*Math.cos(i), r*0.4*Math.sin(i), r*0.06, 0, Math.PI*2); }); break;
                case 3: drawFluorescentStroke(c => { c.lineWidth = 1.5; c.arc(0, 0, nr + r*0.1, Math.PI, Math.PI*2); }); break;
                case 4: drawFluorescentStroke(c => { c.lineWidth = 1.5; c.arc(0, 0, nr + r*0.1, 0, Math.PI); }); break;
                case 5: drawFluorescentStroke(c => { c.lineWidth = 1.5; c.arc(0, 0, nr + r*0.15, 0, Math.PI*2); }); break;
                case 6: drawFluorescent(c => { sp.forEach(s => { c.moveTo(s.x*r, s.y*r); c.arc(s.x*r, s.y*r, s.r*r, 0, Math.PI*2); }); }); break;
                case 7: drawFluorescent(c => { c.arc(r*0.3, -r*0.1, r*0.15, 0, Math.PI); }); break;
                case 8: drawFluorescentStroke(c => { c.lineWidth = 1.5; c.setLineDash([3, 4]); c.arc(0, 0, nr + r*0.15, 0, Math.PI*2); }); break;
                case 9: drawFluorescentStroke(c => { c.lineWidth = 1.5; c.moveTo(r*0.2, r*0.3); c.quadraticCurveTo(r*0.5, 0, r*0.3, -r*0.4); }); break;
                case 10: drawFluorescentStroke(c => { c.lineWidth = 1; for(let i=0; i<4; i++) { c.moveTo(nr + r*0.05*i, 0); c.arc(0, 0, nr + r*0.05*i, 0, Math.PI*2); } }); break;
                case 11: drawFluorescent(c => { c.moveTo(nr, 0); c.lineTo(nr + r*0.3, r*0.2); c.lineTo(nr + r*0.1, -r*0.2); }); break;
                case 12: drawFluorescent(c => { sp.slice(0, 3).forEach(s => { c.rect(s.x*r, s.y*r, s.r*r*1.8, s.r*r*1.8); }); }); break;
                case 13: drawFluorescentStroke(c => { c.lineWidth = 1.5; c.moveTo(-nr, nr + r*0.1); c.lineTo(nr, nr + r*0.1); c.moveTo(-nr, nr + r*0.2); c.lineTo(nr, nr + r*0.2); }); break;
                case 14: drawFluorescent(c => { c.ellipse(r*0.4, r*0.1, r*0.2, r*0.05, Math.PI/3, 0, Math.PI*2); }); break;
                case 15: drawFluorescentStroke(c => { c.lineWidth = 1.5; c.arc(0, 0, nr + r*0.2, -Math.PI/6, Math.PI/6); c.moveTo(-Math.cos(Math.PI/6)*(nr + r*0.2), Math.sin(Math.PI/6)*(nr + r*0.2)); c.arc(0, 0, nr + r*0.2, Math.PI*5/6, Math.PI*7/6); }); break;
                case 16: drawFluorescent(c => { let t=time*0.002; c.arc(Math.cos(t)*(nr + r*0.15), Math.sin(t)*(nr + r*0.15), r*0.08, 0, Math.PI*2); }); break;
                case 17: drawFluorescentStroke(c => { c.lineWidth = 2; c.lineCap = "round"; c.moveTo(-nr - r*0.1, r*0.2); c.bezierCurveTo(-nr, r*0.6, nr*1.5, r*0.6, nr + r*0.1, 0); }); break;
                case 18: drawFluorescentStroke(c => { c.lineWidth = 1; let rot=time*0.001; for (let i=0; i<4; i++) { let a=(i/4)*Math.PI*2 + rot; c.moveTo(Math.cos(a)*nr*1.2, Math.sin(a)*nr*1.2); c.lineTo(Math.cos(a)*nr*2, Math.sin(a)*nr*2); } }); break;
                case 19: drawFluorescent(c => { c.arc(0, 0, nr*0.4, 0, Math.PI*2); }); break;
                case 20: drawFluorescent(c => { for (let i=0; i<6; i++) { c.ellipse(Math.cos(i)*nr*1.2, Math.sin(i)*nr*1.2, r*0.06, nr*0.5, i, 0, Math.PI * 2); } }); break;
                case 21: drawFluorescentStroke(c => { c.lineWidth = 1; let t=time*0.002; c.moveTo(nr + r*0.1, 0); for (let a=0; a<=Math.PI*2.1; a+=0.1) { let dr=Math.sin(a*8+t)*r*0.05 + nr + r*0.1; c.lineTo(Math.cos(a)*dr, Math.sin(a)*dr); } }); break;
                case 22: drawFluorescentStroke(c => { c.lineWidth = 1.5; let t=time*0.005; c.moveTo(0, 0); for (let a=0; a<Math.PI*4; a+=0.2) { c.lineTo(Math.cos(a-t)*a*r*0.1, Math.sin(a-t)*a*r*0.1); } }); break;
                case 23: drawFluorescent(c => { for (let x=-1; x<=1; x++) for (let ly=-1; ly<=1; ly++) c.rect(x*r*0.3, ly*r*0.3, r*0.05, r*0.05); }); break;
                case 24: drawFluorescentStroke(c => { c.lineWidth = 1; c.moveTo(-nr*2, -nr*2); c.lineTo(nr*2, nr*2); c.moveTo(nr*2, -nr*2); c.lineTo(-nr*2, nr*2); }); break;
                case 25: drawFluorescentStroke(c => { c.lineWidth = 1.5; for(let i=1; i<=3; i++) { c.moveTo(Math.cos(-Math.PI*0.75)*r*0.15*i, r*0.4+Math.sin(-Math.PI*0.75)*r*0.15*i); c.arc(0, r*0.4, r*0.15*i, -Math.PI*0.75, -Math.PI*0.25); } }); break;
                case 26: drawFluorescent(c => { [{ x: 0, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }].forEach(p => { c.moveTo(p.x*r*0.2, (p.y-0.5)*r*0.2); c.lineTo(p.x*r*0.2 - r*0.1, (p.y-0.5)*r*0.2 + r*0.2); c.lineTo(p.x*r*0.2 + r*0.1, (p.y-0.5)*r*0.2 + r*0.2); c.closePath(); }); }); break;
                case 27: drawFluorescentStroke(c => { c.lineWidth = 1.5; c.arc(-r*0.15, 0, r*0.2, 0, Math.PI*2); c.moveTo(r*0.15 + r*0.2, 0); c.arc(r*0.15, 0, r*0.2, 0, Math.PI*2); }); break;
                case 28: drawFluorescentStroke(c => { c.lineWidth = 1; c.moveTo(nr*1.2, 0); for(let a=0; a<=Math.PI*2.1; a+=0.2) { let dr=nr*1.2 + (Math.random()*r*0.1 - r*0.05); c.lineTo(Math.cos(a)*dr, Math.sin(a)*dr); } }); break;
                case 29: drawFluorescent(c => { for(let i=0; i<3; i++) { c.moveTo(Math.cos(i*2)*nr*1.5, Math.sin(i*2)*nr*1.5 + r*0.1); c.ellipse(Math.cos(i*2)*nr*1.5, Math.sin(i*2)*nr*1.5 + r*0.1, r*0.05, r*0.1, i*2, 0, Math.PI*2); } }); break;
                case 30: drawFluorescentStroke(c => { c.lineWidth = 1.5; for(let j=0; j<2; j++) { let cx=sp[j].x*r, cy=sp[j].y*r, hr=r*0.15; c.moveTo(cx+hr, cy); for(let i=1; i<=6; i++) c.lineTo(cx+Math.cos(i*Math.PI/3)*hr, cy+Math.sin(i*Math.PI/3)*hr); c.closePath(); } }); break;
                case 31: drawFluorescentStroke(c => { c.lineWidth = 1; let t=time*0.003; for(let ly=-r*0.6; ly<r*0.6; ly+=r*0.1) { let x1=Math.sin(ly*10+t)*r*0.15; let x2=Math.sin(ly*10+t+Math.PI)*r*0.15; c.moveTo(x1, ly); c.lineTo(x2, ly); c.rect(x1, ly, Math.random()*2, Math.random()*2); } }); break;
                case 32: drawFluorescentStroke(c => { c.lineWidth = 1.5; c.scale(r*0.03, r*0.03); for(let t=0; t<=Math.PI*2.1; t+=0.1){ let den=1+Math.sin(t)*Math.sin(t); let nxx=Math.cos(t)/den*10; let nyy=Math.sin(t)*Math.cos(t)/den*10; if(t===0) c.moveTo(nxx, nyy); else c.lineTo(nxx, nyy); } c.closePath(); }); break;
                case 33: drawFluorescentStroke(c => { c.lineWidth = 1.5; c.setLineDash([2, 3]); let t=time*0.002; c.save(); c.rotate(t); c.arc(0,0,nr+r*0.1,0,Math.PI*2); c.restore(); c.save(); c.rotate(-t*2); c.moveTo(nr+r*0.2,0); c.arc(0,0,nr+r*0.2,0,Math.PI*2); c.restore(); }); break;
                case 34: drawFluorescentStroke(c => { c.moveTo(0, -r*0.3); c.lineTo(r*0.2, 0); c.lineTo(0, r*0.3); c.lineTo(-r*0.2, 0); c.closePath(); }); break; 
                case 35: drawFluorescent(c => { sp.slice(0, 3).forEach(s => { c.save(); c.translate(s.x*r, s.y*r); c.rotate(s.r*100); c.roundRect(-r*0.1, -r*0.04, r*0.2, r*0.08, r*0.04); c.restore(); }); }); break;
                case 36: drawFluorescent(c => { for(let i=0; i<8; i++) { c.moveTo(Math.cos(i)*nr*0.8, Math.sin(i)*nr*0.8); c.arc(Math.cos(i)*nr*0.8, Math.sin(i)*nr*0.8, r*0.1, 0, Math.PI*2); } }); break;
                case 37: drawFluorescentStroke(c => { c.lineWidth=2; c.moveTo(-r*0.5, -r*0.3); c.lineTo(-r*0.1, Math.random()*r*0.2); c.lineTo(r*0.1, -Math.random()*r*0.2); c.lineTo(r*0.5, r*0.3); }); break; 
                case 38: drawFluorescent(c => { c.arc(r*0.3, -r*0.2, r*0.15, -Math.PI/2, Math.PI/2); c.arc(r*0.25, -r*0.2, r*0.15, Math.PI/2, -Math.PI/2, true); }); break;
                case 39: drawFluorescentStroke(c => { c.lineWidth=1.5; c.arc(-r*0.1, 0, r*0.1, 0, Math.PI*2); c.moveTo(r*0.2, 0); c.arc(r*0.1, 0, r*0.1, 0, Math.PI*2); }); break;
                case 40: drawFluorescentStroke(c => { c.lineWidth=1.5; for(let i=0; i<12; i++) { c.moveTo(Math.cos(i*Math.PI/6)*nr, Math.sin(i*Math.PI/6)*nr); c.lineTo(Math.cos(i*Math.PI/6)*nr*1.5, Math.sin(i*Math.PI/6)*nr*1.5); } }); break;
                case 41: drawFluorescentStroke(c => { c.lineWidth=1; c.ellipse(0,0,nr*2,nr*0.5,Math.PI/4,0,Math.PI*2); c.moveTo(Math.cos(-Math.PI/4)*nr*2, Math.sin(-Math.PI/4)*nr*0.5); c.ellipse(0,0,nr*2,nr*0.5,-Math.PI/4,0,Math.PI*2); }); break;
                case 42: drawFluorescentStroke(c => { c.lineWidth=1; sp.slice(0,3).forEach(s => { c.save(); c.translate(s.x*r, s.y*r); c.moveTo(0,-r*0.1); c.lineTo(r*0.08,r*0.08); c.lineTo(-r*0.08,r*0.08); c.closePath(); c.restore(); }); }); break;
                case 43: drawFluorescentStroke(c => { c.lineWidth=2; c.moveTo(-nr*2, 0); for(let lx=-nr*2; lx<=nr*2; lx+=2) c.lineTo(lx, Math.sin(lx/r*10)*r*0.1); }); break;
                case 44: drawFluorescentStroke(c => { c.lineWidth=1.5; let t=time*0.002; for(let i=0; i<3; i++) { let offset=i*(Math.PI*2/3); c.moveTo(0,0); for(let a=0; a<Math.PI*1.5; a+=0.2) c.lineTo(Math.cos(a-t+offset)*a*r*0.1, Math.sin(a-t+offset)*a*r*0.1); } }); break;
                case 45: drawFluorescent(c => { let t=time*0.005; c.moveTo(Math.cos(t)*nr*0.6, Math.sin(t)*nr*0.6); for(let i=0; i<=6; i++) { let a=(i/6)*Math.PI*2+t; let dr=nr*0.6+Math.sin(a*3+t)*nr*0.2; c.quadraticCurveTo(Math.cos(a+0.3)*dr, Math.sin(a+0.3)*dr, Math.cos(a)*dr, Math.sin(a)*dr); } c.closePath(); }); break;
                case 46: drawFluorescentStroke(c => { c.lineWidth=1; c.arc(0,0,nr*1.5,0,Math.PI*2); c.moveTo(0,-nr*2); c.lineTo(0,nr*2); c.moveTo(-nr*2,0); c.lineTo(nr*2,0); }); break;
                case 47: drawFluorescent(c => { sp.slice(0,3).forEach(s => { c.save(); c.translate(s.x*r, s.y*r); c.moveTo(r*0.05, 0); c.arc(0, 0, r*0.05, 0, Math.PI); c.lineTo(0, -r*0.15); c.closePath(); c.restore(); }); }); break;
                case 48: drawFluorescentStroke(c => { c.lineWidth=3; c.arc(0,0,r*0.8,-Math.PI/2,Math.PI/2); c.moveTo(0, r*0.8); c.arc(0,0,r*0.8,Math.PI/2,Math.PI*1.5); }); break;
                case 49: drawFluorescent(c => { for(let i=0; i<6; i++) { let a=(i/6)*Math.PI*2; let dr=nr+r*0.2; c.moveTo(Math.cos(a)*dr + r*0.04*Math.cos(a), Math.sin(a)*dr + r*0.02*Math.sin(a)); c.ellipse(Math.cos(a)*dr, Math.sin(a)*dr, r*0.04, r*0.02, a, 0, Math.PI*2); } }); break;
            }
            ctx.restore();

            // Nucleus
            ctx.save();
            ctx.translate(nx, ny);
            ctx.beginPath();
            ctx.ellipse(0, 0, nr, nr * 0.85, time * 0.001 + this.timeOffset, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 100, 255, 0.75)";
            ctx.fill();
            ctx.restore();
            
            ctx.restore(); // END CLIP

            buildBlobPath(); // VERY IMPORTANT: Re-build the blob path so ctx.stroke traces exactly the outer membrane!
            ctx.lineWidth = 1.5 + Math.sin(time * 0.001 + this.timeOffset) * 0.5;
            ctx.strokeStyle = colors[this.type];
            ctx.stroke();

            ctx.restore(); // END MAIN SAVE
        }
    }

    const cells = [];
    // Increase count slightly since they avoid text!
    for (let i = 0; i < NUM_CELLS + 20; i++) {
        cells.push(new Cell(
            Math.random() * width,
            height + Math.random() * (isMobile ? height * 0.5 : height * 2), // Start closer on mobile
            Math.floor(Math.random() * N_TYPES)
        ));
    }

    function animate(time) {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, width, height);

        // Fetch safe bounds of text dynamically to handle scrolling
        const safeBoxes = [];
        const landings = document.querySelectorAll('.landing');
        const padX = isMobile ? 10 : 30;
        const padY = isMobile ? 10 : 20;

        landings.forEach(el => {
            let rect = el.getBoundingClientRect();
            // Create a slightly expanded box to push cells away before they overlap text
            safeBoxes.push({
                padX: padX, padY: padY,
                left: rect.left - padX,
                right: rect.right + padX,
                top: rect.top - padY,
                bottom: rect.bottom + padY
            });
        });

        for (let i = 0; i < cells.length; i++) {
            cells[i].update(safeBoxes);
        }
        for (let i = 0; i < splats.length; i++) {
            splats[i].draw(ctx);
        }
        for (let i = 0; i < cells.length; i++) {
            cells[i].draw(ctx, time);
        }
    }

    requestAnimationFrame(animate);

})();
