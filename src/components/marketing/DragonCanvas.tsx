"use client";

import { useEffect, useRef } from "react";

interface Segment {
  x: number;
  y: number;
}

interface WingSpine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Wing {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  x4: number;
  y4: number;
  spines: {
    a: WingSpine;
    b: WingSpine;
    c: WingSpine;
    d: WingSpine;
  };
}

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

class Dragon {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  segments: Segment[];
  timer: number;
  speed: number;
  lift: number;
  showLegs: boolean;
  wing: Wing;
  nodes: number[];
  m: number;
  m2: number;
  diff: number;
  isBreathing: boolean;
  breathStartTime: number;
  fireParticles: FireParticle[];
  breathTriggered: boolean;
  colors: {
    spikes: string;
    black: string;
    body: string;
    wingArm: string;
    wingArmSpike: string;
    wingUpper: string;
    wingLower: string;
    wingSpines: string;
    legsBehind: string;
  };

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.w = 150;
    this.h = 100;
    this.vx = 0;
    this.vy = 0;
    this.segments = [];
    this.timer = 0;
    this.speed = 4;
    this.lift = 3;
    this.showLegs = true;
    this.wing = {
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      x3: 0,
      y3: 0,
      x4: 0,
      y4: 0,
      spines: {
        a: { x1: 0, y1: 0, x2: 0, y2: 0 },
        b: { x1: 0, y1: 0, x2: 0, y2: 0 },
        c: { x1: 0, y1: 0, x2: 0, y2: 0 },
        d: { x1: 0, y1: 0, x2: 0, y2: 0 },
      },
    };
    this.nodes = [
      10, 14, 12, 18, 23, 28, 37, 42, 50, 50, 46, 42, 35, 28, 22, 18, 15, 14,
      11, 9, 8, 7, 5, 3, 2, 1, 1, 1,
    ];
    this.m = 0;
    this.m2 = 0;
    this.diff = 0;
    this.isBreathing = false;
    this.breathStartTime = 0;
    this.fireParticles = [];
    this.breathTriggered = false;

    // Green theme colors
    this.colors = {
      spikes: "rgb(18, 46, 4)",
      black: "rgb(120, 110, 20)",
      body: "rgb(33, 82, 16)",
      wingArm: "rgb(39, 77, 10)",
      wingArmSpike: "rgb(76, 77, 76)",
      wingUpper: "rgb(44, 82, 15)",
      wingLower: "rgb(49, 110, 25)",
      wingSpines: "rgba(71, 70, 71, 0.59)",
      legsBehind: "rgb(30, 77, 14)",
    };

    this.setup();
  }

  setup() {
    // Segment[0] is the head (leading edge), Segment[27] is the tail (trailing edge)
    // Head leads, tail follows when flying right
    // Head is at this.x, tail is at this.x - this.w
    for (let i = 0; i <= 27; i++) {
      this.segments.push({
        x: this.x - (this.w * i) / 27, // Head at x, tail at x - w (behind)
        y: this.y,
      });
    }
  }

  lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
  }

  update() {
    this.diff = this.segments[0].y - this.segments[1].y;

    this.timer += 0.018;
    this.m = Math.sin(this.timer * this.speed) * this.lift;
    this.m2 = Math.cos(this.timer * this.speed) * this.lift;

    // Update each segment
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];

      if (i === 0) {
        segment.y = this.y + this.m;
        segment.x = this.x;
      } else {
        segment.y = this.lerp(segment.y, this.segments[i - 1].y, 0.2);
        segment.x = this.lerp(segment.x, this.segments[i - 1].x, 0.2);
      }
    }

    // Move the wing (wings point backward/left when flying right)
    this.wing.x1 = this.segments[7].x;
    this.wing.y1 = this.segments[7].y + 10;
    this.wing.x2 = this.segments[7].x - 20; // Reversed: negative x offset
    this.wing.y2 = this.segments[7].y + 10 + this.m * 15;
    this.wing.x3 = this.segments[7].x - 40; // Reversed: more negative
    this.wing.y3 = this.segments[7].y + 10 + this.m * 30;
    this.wing.x4 = this.segments[7].x - 47; // Reversed: even more negative
    this.wing.y4 = this.segments[7].y + 10 + this.m * 35;

    // Wing spines (point backward/left)
    this.wing.spines.a.x1 = this.wing.x1;
    this.wing.spines.a.y1 =
      this.segments[7].y + 40 + this.m * 47 - this.m2 * 6;
    this.wing.spines.a.x2 = this.segments[7].x - 90; // Reversed: negative

    this.wing.spines.a.y2 =
      this.segments[7].y + 40 + this.m * 55 - this.m2 * 6;

    this.wing.spines.b.x1 = this.wing.x1 - 20; // Reversed
    this.wing.spines.b.y1 = this.segments[7].y + 40 + this.m * 42;
    this.wing.spines.b.x2 = this.segments[7].x - 95; // Reversed
    this.wing.spines.b.y2 = this.segments[7].y + 40 + this.m * 45;

    this.wing.spines.c.x1 = this.wing.x1 - 25; // Reversed
    this.wing.spines.c.y1 = this.segments[7].y + 40 + this.m * 35;
    this.wing.spines.c.x2 = this.segments[7].x - 100; // Reversed
    this.wing.spines.c.y2 = this.segments[7].y + 40 + this.m * 32;

    this.wing.spines.d.x1 = this.wing.x1 - 35; // Reversed
    this.wing.spines.d.y1 = this.segments[7].y + 40 + this.m * 17;
    this.wing.spines.d.x2 = this.segments[7].x - 80; // Reversed
    this.wing.spines.d.y2 = this.segments[7].y + 30 + this.m * 15;

    // Movement is handled in the animation loop
  }

  updateBreath(canvasWidth: number, currentTime: number) {
    // Trigger breath at 1/3 of screen width (robust range check)
    const triggerPoint = canvasWidth * 0.33;
    
    if (!this.breathTriggered && this.x > triggerPoint && this.x < triggerPoint + 100) {
      this.isBreathing = true;
      this.breathStartTime = currentTime;
      this.breathTriggered = true;
    }

    // Stop breathing after 1 second
    if (this.isBreathing && currentTime - this.breathStartTime > 1000) {
      this.isBreathing = false;
    }

    // Update existing particles and remove dead ones immediately
    this.fireParticles = this.fireParticles.filter((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 0.02; // Fade out
      return particle.life > 0;
    });
    
    // Hard limit: max 50 particles
    if (this.fireParticles.length > 50) {
      this.fireParticles = this.fireParticles.slice(0, 50);
    }
  }

  drawBreath(ctx: CanvasRenderingContext2D) {
    if (this.fireParticles.length === 0) return;

    // Reset transformation matrix to world coordinates (only once)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Simple color based on life (no expensive gradients)
    // Draw particles in world coordinates
    for (const particle of this.fireParticles) {
      const alpha = particle.life;
      const size = particle.size * particle.life;
      
      // Simple color: bright green with fading alpha (no shadows for performance)
      ctx.fillStyle = `rgba(57, 255, 20, ${alpha})`; // Neon green with alpha
      ctx.globalAlpha = alpha;
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
  }

  draw(ctx: CanvasRenderingContext2D, logoY: number) {
    ctx.save();
    
    // Scale down by 30% (0.7)
    const scaleFactor = 0.7;
    
    // Translate to head position (segment[0]) and scale
    const headX = this.segments[0].x;
    const headY = this.segments[0].y;
    
    ctx.translate(headX, headY);
    ctx.scale(scaleFactor, scaleFactor);
    ctx.translate(-headX, -headY);

    // Draw right wing
    ctx.save();
    ctx.translate(-20, 10);
    this.drawRightWing(ctx);
    ctx.restore();

    // Draw body spikes (on top of body, pointing up)
    ctx.fillStyle = this.colors.spikes;
    ctx.beginPath();
    for (let i = 2; i < this.segments.length - 5; i++) {
      const segment = this.segments[i];
      const prevSegment = this.segments[i - 1];
      const tx = segment.x - prevSegment.x;
      const ty = segment.y - prevSegment.y;
      const angle = Math.atan2(ty, tx) + Math.PI / 2; // Point upward

      ctx.moveTo(
        prevSegment.x,
        prevSegment.y - this.nodes[i] * 0.1
      );
      ctx.lineTo(segment.x, segment.y - this.nodes[i] * 0.1);
      ctx.lineTo(
        segment.x + Math.cos(angle) * 12,
        segment.y - this.nodes[i] * 0.4
      );
    }
    ctx.closePath();
    ctx.fill();

    // Draw lower body
    ctx.fillStyle = this.colors.black;
    ctx.beginPath();
    ctx.moveTo(this.segments[0].x, this.segments[0].y);
    for (let i = 1; i < this.segments.length; i += 3) {
      if (i + 2 < this.segments.length) {
        ctx.bezierCurveTo(
          this.segments[i].x,
          this.segments[i].y,
          this.segments[i + 1].x,
          this.segments[i + 1].y,
          this.segments[i + 2].x,
          this.segments[i + 2].y
        );
      }
    }
    for (let i = this.segments.length - 1; i >= 1; i -= 3) {
      if (i - 2 >= 0) {
        ctx.bezierCurveTo(
          this.segments[i].x,
          this.segments[i].y + this.nodes[i],
          this.segments[i - 1].x,
          this.segments[i - 1].y + this.nodes[i - 1],
          this.segments[i - 2].x,
          this.segments[i - 2].y + this.nodes[i - 2]
        );
      }
    }
    ctx.lineTo(this.segments[0].x, this.segments[0].y + this.nodes[1]);
    ctx.closePath();
    ctx.fill();

    // Draw scales
    ctx.strokeStyle = "rgba(40, 40, 40, 0.59)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = 1; i < this.segments.length - 10; i++) {
      const segment = this.segments[i];
      ctx.moveTo(segment.x, segment.y);
      ctx.bezierCurveTo(
        segment.x - 10,
        segment.y + this.nodes[i] * 0.3,
        segment.x - 10,
        segment.y + this.nodes[i] * 0.7,
        segment.x,
        segment.y + this.nodes[i] * 0.95
      );
    }
    ctx.stroke();

    // Draw upper body
    ctx.fillStyle = this.colors.body;
    ctx.beginPath();
    ctx.moveTo(this.segments[0].x, this.segments[0].y);
    for (let i = 1; i < this.segments.length; i += 3) {
      if (i + 2 < this.segments.length) {
        ctx.bezierCurveTo(
          this.segments[i].x,
          this.segments[i].y,
          this.segments[i + 1].x,
          this.segments[i + 1].y,
          this.segments[i + 2].x,
          this.segments[i + 2].y
        );
      }
    }
    for (let i = this.segments.length - 1; i >= 1; i -= 3) {
      if (i - 2 >= 0) {
        ctx.bezierCurveTo(
          this.segments[i].x,
          this.segments[i].y + this.nodes[i] * 0.6,
          this.segments[i - 1].x,
          this.segments[i - 1].y + this.nodes[i - 1] * 0.6,
          this.segments[i - 2].x,
          this.segments[i - 2].y + this.nodes[i - 2] * 0.6
        );
      }
    }
    ctx.closePath();
    ctx.fill();

    // Draw left wing
    this.drawLeftWing(ctx);

    // Draw tail
    ctx.fillStyle = this.colors.body;
    ctx.beginPath();
    const lastSeg = this.segments[this.segments.length - 1];
    const secondLastSeg = this.segments[this.segments.length - 2];
    ctx.moveTo(
      secondLastSeg.x - this.diff * 0.1,
      secondLastSeg.y - 5
    );
    ctx.lineTo(lastSeg.x, lastSeg.y);
    ctx.lineTo(
      secondLastSeg.x + this.diff * 0.1,
      secondLastSeg.y + 5
    );
    ctx.bezierCurveTo(
      secondLastSeg.x + this.diff * 0.1 + 3,
      secondLastSeg.y + 2,
      secondLastSeg.x - this.diff * 0.1 + 3,
      secondLastSeg.y - 2,
      secondLastSeg.x - this.diff * 0.1,
      secondLastSeg.y - 5
    );
    ctx.closePath();
    ctx.fill();

    // Draw head (emits particles if breathing)
    this.drawHead(ctx);

    ctx.restore();
  }

  drawRightWing(ctx: CanvasRenderingContext2D) {
    // Wing covering (wings point backward when flying right)
    ctx.fillStyle =
      this.wing.y2 < this.wing.y1
        ? this.colors.wingUpper
        : this.colors.wingLower;
    ctx.beginPath();
    ctx.moveTo(this.wing.x1, this.wing.y1);
    ctx.bezierCurveTo(
      this.wing.x2 + 10, // Reversed: + instead of -
      this.wing.y2,
      this.wing.x2 + 10,
      this.wing.y2,
      this.wing.x3,
      this.wing.y3
    );
    ctx.bezierCurveTo(
      this.wing.x3 + 5, // Reversed
      this.wing.y3 - this.m2 * 3,
      this.wing.spines.a.x1 + 5, // Reversed
      this.wing.spines.a.y1 + this.diff * 0.5 - this.m2 * 3,
      this.wing.spines.a.x1,
      this.wing.spines.a.y1 - this.m2 * 3
    );
    ctx.bezierCurveTo(
      this.wing.spines.a.x1 - 10, // Reversed
      this.wing.spines.a.y1 - this.diff * 0.5,
      this.wing.spines.a.x2 + 10, // Reversed
      this.wing.spines.a.y2 + this.diff * 0.5,
      this.wing.spines.a.x2,
      this.wing.spines.a.y2
    );
    ctx.lineTo(this.wing.spines.a.x2, this.wing.spines.a.y2);
    ctx.bezierCurveTo(
      this.wing.spines.a.x2 + 10, // Reversed
      this.wing.spines.a.y2,
      this.wing.spines.b.x2 + 15, // Reversed
      this.wing.spines.b.y2 - this.diff * 0.5,
      this.wing.spines.b.x2,
      this.wing.spines.b.y2
    );
    ctx.bezierCurveTo(
      this.wing.spines.b.x2 + 10, // Reversed
      this.wing.spines.b.y2,
      this.wing.spines.c.x2 + 15, // Reversed
      this.wing.spines.c.y2,
      this.wing.spines.c.x2,
      this.wing.spines.c.y2
    );
    ctx.bezierCurveTo(
      this.wing.spines.c.x2 + 10, // Reversed
      this.wing.spines.c.y2,
      this.wing.spines.d.x2 + 15, // Reversed
      this.wing.spines.d.y2,
      this.wing.spines.d.x2,
      this.wing.spines.d.y2
    );
    ctx.bezierCurveTo(
      this.wing.spines.d.x2 + 10, // Reversed
      this.wing.spines.d.y2,
      this.wing.x1 - 40 + 15, // Reversed
      this.segments[9].y + this.nodes[9] * 0.2,
      this.wing.x1 - 40, // Reversed
      this.segments[9].y + this.nodes[9] * 0.2
    );
    ctx.closePath();
    ctx.fill();

    // Wing arm
    ctx.strokeStyle = this.colors.wingArm;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(this.wing.x1, this.wing.y1);
    ctx.lineTo(this.wing.x2, this.wing.y2);
    ctx.lineTo(this.wing.x3, this.wing.y3);
    ctx.stroke();

    // Wing spines
    ctx.strokeStyle = this.colors.wingSpines;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.wing.x3, this.wing.y3);
    ctx.bezierCurveTo(
      this.wing.x3 - 5,
      this.wing.y3,
      this.wing.spines.a.x1 - 5,
      this.wing.spines.a.y1 + this.diff * 0.5 - this.m2 * 3,
      this.wing.spines.a.x1,
      this.wing.spines.a.y1 - this.m2 * 3
    );
    ctx.bezierCurveTo(
      this.wing.spines.a.x1 + 10,
      this.wing.spines.a.y1 - this.diff,
      this.wing.spines.a.x2 - 10,
      this.wing.spines.a.y2 + this.diff * 0.5,
      this.wing.spines.a.x2,
      this.wing.spines.a.y2
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.wing.x3, this.wing.y3);
    ctx.lineTo(this.wing.spines.b.x1, this.wing.spines.b.y1);
    ctx.lineTo(this.wing.spines.b.x2, this.wing.spines.b.y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.wing.x3, this.wing.y3);
    ctx.lineTo(this.wing.spines.c.x1, this.wing.spines.c.y1);
    ctx.lineTo(this.wing.spines.c.x2, this.wing.spines.c.y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.wing.x2, this.wing.y2);
    ctx.lineTo(this.wing.spines.d.x2, this.wing.spines.d.y2);
    ctx.stroke();
  }

  drawLeftWing(ctx: CanvasRenderingContext2D) {
    // Wing covering (wings point backward when flying right)
    ctx.fillStyle =
      this.wing.y2 >= this.wing.y1
        ? this.colors.wingUpper
        : this.colors.wingLower;
    ctx.beginPath();
    ctx.moveTo(this.wing.x1, this.wing.y1);
    ctx.bezierCurveTo(
      this.wing.x2 + 10, // Reversed
      this.wing.y2,
      this.wing.x2 + 10,
      this.wing.y2,
      this.wing.x3,
      this.wing.y3
    );
    ctx.bezierCurveTo(
      this.wing.x3 + 5, // Reversed
      this.wing.y3 - this.m2 * 3,
      this.wing.spines.a.x1 + 5, // Reversed
      this.wing.spines.a.y1 + this.diff * 0.5 - this.m2 * 3,
      this.wing.spines.a.x1,
      this.wing.spines.a.y1 - this.m2 * 3
    );
    ctx.bezierCurveTo(
      this.wing.spines.a.x1 - 10, // Reversed
      this.wing.spines.a.y1 - this.diff * 0.5,
      this.wing.spines.a.x2 + 10, // Reversed
      this.wing.spines.a.y2 + this.diff * 0.5,
      this.wing.spines.a.x2,
      this.wing.spines.a.y2
    );
    ctx.lineTo(this.wing.spines.a.x2, this.wing.spines.a.y2);
    ctx.bezierCurveTo(
      this.wing.spines.a.x2 + 10, // Reversed
      this.wing.spines.a.y2,
      this.wing.spines.b.x2 + 15, // Reversed
      this.wing.spines.b.y2 - this.diff * 0.5,
      this.wing.spines.b.x2,
      this.wing.spines.b.y2
    );
    ctx.bezierCurveTo(
      this.wing.spines.b.x2 + 10, // Reversed
      this.wing.spines.b.y2,
      this.wing.spines.c.x2 + 15, // Reversed
      this.wing.spines.c.y2,
      this.wing.spines.c.x2,
      this.wing.spines.c.y2
    );
    ctx.bezierCurveTo(
      this.wing.spines.c.x2 + 10, // Reversed
      this.wing.spines.c.y2,
      this.wing.spines.d.x2 + 15, // Reversed
      this.wing.spines.d.y2,
      this.wing.spines.d.x2,
      this.wing.spines.d.y2
    );
    ctx.bezierCurveTo(
      this.wing.spines.d.x2 + 10, // Reversed
      this.wing.spines.d.y2,
      this.wing.x1 - 40 + 15, // Reversed
      this.segments[9].y + this.nodes[9] * 0.2,
      this.wing.x1 - 40, // Reversed
      this.segments[9].y + this.nodes[9] * 0.2
    );
    ctx.closePath();
    ctx.fill();

    // Wing arm
    ctx.strokeStyle = this.colors.wingArm;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(this.wing.x1, this.wing.y1);
    ctx.lineTo(this.wing.x2, this.wing.y2);
    ctx.lineTo(this.wing.x3, this.wing.y3);
    ctx.stroke();

    // Wing spines (point backward)
    ctx.strokeStyle = this.colors.wingSpines;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.wing.x3, this.wing.y3);
    ctx.bezierCurveTo(
      this.wing.x3 + 5, // Reversed
      this.wing.y3,
      this.wing.spines.a.x1 + 5, // Reversed
      this.wing.spines.a.y1 + this.diff * 0.5 - this.m2 * 3,
      this.wing.spines.a.x1,
      this.wing.spines.a.y1 - this.m2 * 3
    );
    ctx.bezierCurveTo(
      this.wing.spines.a.x1 - 10, // Reversed
      this.wing.spines.a.y1 - this.diff,
      this.wing.spines.a.x2 + 10, // Reversed
      this.wing.spines.a.y2 + this.diff * 0.5,
      this.wing.spines.a.x2,
      this.wing.spines.a.y2
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.wing.x3, this.wing.y3);
    ctx.lineTo(this.wing.spines.b.x1, this.wing.spines.b.y1);
    ctx.lineTo(this.wing.spines.b.x2, this.wing.spines.b.y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.wing.x3, this.wing.y3);
    ctx.lineTo(this.wing.spines.c.x1, this.wing.spines.c.y1);
    ctx.lineTo(this.wing.spines.c.x2, this.wing.spines.c.y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.wing.x2, this.wing.y2);
    ctx.lineTo(this.wing.spines.d.x2, this.wing.spines.d.y2);
    ctx.stroke();
  }

  drawHead(ctx: CanvasRenderingContext2D): { x: number; y: number } {
    ctx.save();
    
    // 1. Reset & Move to Neck: Translate directly to segment[0] (neck connection point)
    ctx.translate(this.segments[0].x, this.segments[0].y);
    
    // 2. Physical Alignment: Rotate head to follow body movement
    const headRotation = (-this.m * 8 * Math.PI) / 180;
    ctx.rotate(headRotation);
    
    // 3. Mirror & Scale (Simplified)
    ctx.scale(0.5, 0.5); // Scale down
    ctx.scale(-1, 1); // Flip X-axis (original dragon faced left, now faces right)
    
    // 4. Critical Anchor Offset: Move head so neck connection point (135, 200) aligns with (0, 0)
    // After flipping, we need to offset by -135 in x and -200 in y to bring the connection point to origin
    ctx.translate(-135, -200);

    // Head shape (main body) - coordinates are now mirrored
    ctx.fillStyle = this.colors.body;
    ctx.beginPath();
    ctx.moveTo(135, 200);
    ctx.bezierCurveTo(141, 197, 149, 194, 156, 190);
    ctx.bezierCurveTo(153, 196, 153, 204, 156, 208);
    ctx.bezierCurveTo(150, 214, 148, 218, 150, 226);
    ctx.bezierCurveTo(144, 227, 141, 235, 144, 243);
    ctx.bezierCurveTo(142, 244, 136, 246, 135, 252);
    ctx.lineTo(130, 245);
    ctx.closePath();
    ctx.fill();

    // Head shape (snout/jaw)
    ctx.fillStyle = this.colors.body;
    ctx.beginPath();
    ctx.moveTo(72, 235);
    ctx.lineTo(73, 232);
    ctx.bezierCurveTo(76, 228, 80, 224, 84, 222);
    ctx.bezierCurveTo(90, 220, 94, 218, 98, 215);
    ctx.bezierCurveTo(105, 209, 114, 203, 122, 200);
    ctx.bezierCurveTo(130, 199, 136, 200, 138, 203);
    ctx.bezierCurveTo(138, 206, 140, 209, 140, 211);
    ctx.bezierCurveTo(137, 214, 136, 216, 138, 219);
    ctx.bezierCurveTo(137, 221, 137, 223, 138, 225);
    ctx.bezierCurveTo(136, 226, 134, 228, 136, 232);
    ctx.bezierCurveTo(137, 234, 136, 236, 134, 237);
    ctx.lineTo(136, 240);
    ctx.bezierCurveTo(132, 244, 125, 245, 113, 243);
    ctx.bezierCurveTo(106, 240, 98, 241, 88, 243);
    ctx.bezierCurveTo(80, 244, 74, 238, 72, 235);
    ctx.closePath();
    ctx.fill();

    // Horns (back of head)
    ctx.fillStyle = this.colors.black;
    ctx.beginPath();
    ctx.moveTo(138, 204);
    ctx.bezierCurveTo(157, 196, 176, 182, 184, 174);
    ctx.bezierCurveTo(172, 194, 155, 205, 138, 211);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(137, 221);
    ctx.bezierCurveTo(145, 221, 154, 218, 159, 215);
    ctx.bezierCurveTo(153, 222, 145, 225, 138, 226);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(135, 232);
    ctx.bezierCurveTo(138, 234, 142, 234, 149, 236);
    ctx.lineTo(145, 238);
    ctx.lineTo(140, 238);
    ctx.lineTo(134, 237);
    ctx.closePath();
    ctx.fill();

    // Mouth (front of snout)
    ctx.strokeStyle = this.colors.black;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(73, 236);
    ctx.bezierCurveTo(85, 236, 97, 229, 106, 228);
    ctx.stroke();

    // Eye (above mouth corner)
    ctx.fillStyle = "rgb(255, 255, 255)";
    ctx.beginPath();
    ctx.moveTo(104, 217);
    ctx.lineTo(107, 214);
    ctx.lineTo(118, 209);
    ctx.bezierCurveTo(116, 214, 111, 217, 104, 217);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = this.colors.black;
    ctx.beginPath();
    ctx.arc(111, 214, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = this.colors.black;
    ctx.beginPath();
    ctx.moveTo(77, 232);
    ctx.bezierCurveTo(78, 230, 79, 228, 81, 228);
    ctx.bezierCurveTo(81, 230, 79, 232, 76, 232);
    ctx.closePath();
    ctx.fill();

    // Lines across top of head
    ctx.strokeStyle = this.colors.black;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(86, 223);
    ctx.lineTo(89, 226);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(92, 220);
    ctx.lineTo(94, 222);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(98, 217);
    ctx.lineTo(100, 220);
    ctx.stroke();

    // Sockets (detail lines)
    ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(123, 205);
    ctx.bezierCurveTo(128, 204, 134, 203, 138, 203);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(128, 214);
    ctx.bezierCurveTo(132, 213, 136, 213, 139, 213);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(130, 219);
    ctx.bezierCurveTo(132, 218, 136, 220, 138, 220);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(130, 225);
    ctx.bezierCurveTo(132, 226, 134, 226, 137, 226);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(126, 228);
    ctx.bezierCurveTo(129, 229, 132, 230, 134, 232);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(124, 232);
    ctx.bezierCurveTo(128, 234, 130, 235, 134, 236);
    ctx.stroke();

    // Calculate muzzle position in world coordinates (always, for return value)
    // Mouth position in local head coordinates (after all transforms)
    // In the transformed space, mouth is approximately at (77, 232)
    const localMouthX = 77;
    const localMouthY = 232;
    
    // Get the current transformation matrix and transform local mouth position to world coordinates
    const transform = ctx.getTransform();
    const worldMouth = transform.transformPoint({ x: localMouthX, y: localMouthY });

    // Emit fire particles at mouth position (only when breathing)
    if (this.isBreathing) {
      // Add only 1-2 particles per frame for performance (max 50 total)
      const particlesToAdd = Math.min(2, 50 - this.fireParticles.length);
      for (let i = 0; i < particlesToAdd; i++) {
        this.fireParticles.push({
          x: worldMouth.x,
          y: worldMouth.y + (Math.random() - 0.5) * 10, // Small vertical spread
          vx: this.speed + 2 + Math.random() * 3, // Forward thrust + dragon speed
          vy: (Math.random() - 0.5) * 2, // Up/down spread
          life: 1.0,
          maxLife: 1.0,
          size: 3 + Math.random() * 4,
        });
      }
    }

    ctx.restore();
    
    // Return muzzle position in world coordinates
    return { x: worldMouth.x, y: worldMouth.y };
  }

  fly(ctx: CanvasRenderingContext2D, logoY: number, speed: number, canvasWidth: number, currentTime: number) {
    this.update();
    // Update breath system
    this.updateBreath(canvasWidth, currentTime);
    // Move dragon horizontally
    this.x += speed;
    this.draw(ctx, logoY);
  }
}

export function DragonCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dragonRef = useRef<Dragon | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastFlightTimeRef = useRef<number>(0);
  const logoYRef = useRef<number>(200);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Logo is typically around 25% from top
      logoYRef.current = window.innerHeight * 0.25;
    };

    resizeCanvas();
    const handleResize = () => {
      resizeCanvas();
    };
    window.addEventListener("resize", handleResize);

    let flightStartTime = 0;
    let isFlying = false;
    const dragonSpeed = 3; // pixels per frame

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const timeSinceLastFlight = currentTime - lastFlightTimeRef.current;

      // Start first flight after 2 seconds
      if (elapsed < 2000) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Check if we need to start a new flight
      if (!isFlying || (dragonRef.current && dragonRef.current.x > canvas.width + 500)) {
        if (timeSinceLastFlight >= 5000 || !isFlying) {
          // Start from left side
          dragonRef.current = new Dragon(-500, logoYRef.current);
          lastFlightTimeRef.current = currentTime;
          flightStartTime = currentTime;
          isFlying = true;
        }
      }

      // Clear canvas at the start of each frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw and update dragon
      if (dragonRef.current && isFlying) {
        // Add sinusoidal vertical movement during flight
        const flightTime = currentTime - flightStartTime;
        const sinOffset = Math.sin(flightTime * 0.003) * 25;
        dragonRef.current.y = logoYRef.current + sinOffset;
        
        // Update and draw dragon (this will move x position)
        dragonRef.current.fly(ctx, logoYRef.current, dragonSpeed, canvas.width, currentTime);

        // Draw breath particles in global loop (AFTER dragon is drawn)
        if (dragonRef.current.fireParticles.length > 0) {
          dragonRef.current.drawBreath(ctx);
        }

        // Check if dragon has left the screen on the right side
        if (dragonRef.current.x > canvas.width + 500) {
          isFlying = false;
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[50]"
      style={{ background: "transparent" }}
    />
  );
}
