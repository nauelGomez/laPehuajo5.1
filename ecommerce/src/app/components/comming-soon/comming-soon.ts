import { Component, ElementRef, HostListener, NgZone, ViewChild } from '@angular/core';

@Component({
  selector: 'app-comming-soon',
  imports: [],
  templateUrl: './comming-soon.html',
  styleUrl: './comming-soon.css'
})
export class CommingSoon {
@ViewChild('bee', { static: true }) beeRef!: ElementRef<HTMLImageElement>;
  beeSrc = '/abeja.png'; // si la pasás a assets usa: 'assets/abeja.png'

  // estado
  private x = 0;
  private y = 0;
  private vx = 0;           // velocidad x
  private vy = 0;           // velocidad y
  private speed = 140;      // px/seg máx
  private wander = 40;      // “ruido” direccional
  private repelRadius = 120;
  private repelForce = 600; // cuanto “huye” del mouse

  private lastTs = 0;
  private rafId = 0;

  // mouse
  private mx = -9999;
  private my = -9999;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    // arranque aleatorio
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.x = Math.random() * (w * 0.8) + w * 0.1;
    this.y = Math.random() * (h * 0.8) + h * 0.1;

    // velocidad inicial random
    const a = Math.random() * Math.PI * 2;
    this.vx = Math.cos(a) * (this.speed * 0.5);
    this.vy = Math.sin(a) * (this.speed * 0.5);

    // correr animación fuera de Angular para mejor perf
    this.zone.runOutsideAngular(() => {
      this.lastTs = performance.now();
      const tick = (ts: number) => {
        const dt = Math.min((ts - this.lastTs) / 1000, 0.033); // clamp ~30fps
        this.lastTs = ts;
        this.update(dt);
        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  @HostListener('window:mousemove', ['$event'])
  onMouse(e: MouseEvent) {
    this.mx = e.clientX;
    this.my = e.clientY;
  }

  @HostListener('window:resize')
  onResize() {
    // por las dudas, mantenemos dentro de viewport
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.x = Math.max(0, Math.min(w, this.x));
    this.y = Math.max(0, Math.min(h, this.y));
  }

  private update(dt: number) {
    const bee = this.beeRef.nativeElement;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // 1) Wander (ruido direccional)
    this.vx += (Math.random() - 0.5) * this.wander;
    this.vy += (Math.random() - 0.5) * this.wander;

    // 2) Repelencia del mouse
    const dx = this.x - this.mx;
    const dy = this.y - this.my;
    const dist = Math.hypot(dx, dy);
    if (dist < this.repelRadius) {
      const force = (this.repelForce / Math.max(dist, 20));
      this.vx += (dx / dist) * force;
      this.vy += (dy / dist) * force;
    }

    // 3) Limitar velocidad
    const v = Math.hypot(this.vx, this.vy);
    if (v > this.speed) {
      const s = this.speed / v;
      this.vx *= s;
      this.vy *= s;
    }

    // 4) Integración posición
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 5) Rebotar en bordes (dejamos margen de 40px)
    const pad = 40;
    if (this.x < pad) { this.x = pad; this.vx = Math.abs(this.vx); }
    if (this.x > w - pad) { this.x = w - pad; this.vx = -Math.abs(this.vx); }
    if (this.y < pad) { this.y = pad; this.vy = Math.abs(this.vy); }
    if (this.y > h - pad) { this.y = h - pad; this.vy = -Math.abs(this.vy); }

    // 6) Rotación “mirando” a la velocidad
    const angle = Math.atan2(this.vy, this.vx) * 180 / Math.PI;
    // un poco de batido de alas sutil con scaleY
    const flap = 0.04 * Math.sin(performance.now() / 60);

    // 7) Aplicar transform
    bee.style.transform =
      `translate3d(${this.x}px, ${this.y}px, 0) rotate(${angle}deg) scale(1, ${1 + flap})`;
  }
}
