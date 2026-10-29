/* ============================================
   NEBULA STRIKE — Particle System
   High-performance canvas particle effects
   ============================================ */

class Particle {
    constructor(x, y, config = {}) {
        this.x = x;
        this.y = y;
        this.vx = config.vx || (Math.random() - 0.5) * 4;
        this.vy = config.vy || (Math.random() - 0.5) * 4;
        this.life = config.life || 1;
        this.maxLife = this.life;
        this.decay = config.decay || 0.02;
        this.size = config.size || 3;
        this.color = config.color || '#00f5ff';
        this.type = config.type || 'circle'; // circle, spark, trail, ring
        this.gravity = config.gravity || 0;
        this.friction = config.friction || 0.98;
        this.glow = config.glow !== undefined ? config.glow : true;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.alive = true;
    }

    update(dt) {
        this.life -= this.decay * dt;
        if (this.life <= 0) {
            this.alive = false;
            return;
        }
        this.vy += this.gravity * dt;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += this.rotationSpeed * dt;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        const size = this.size * (0.5 + alpha * 0.5);

        ctx.save();
        ctx.globalAlpha = alpha;

        if (this.glow) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = size * 3;
        }

        switch (this.type) {
            case 'circle':
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'spark':
                ctx.strokeStyle = this.color;
                ctx.lineWidth = Math.max(1, size * 0.5);
                ctx.beginPath();
                const len = size * 3;
                const angle = Math.atan2(this.vy, this.vx);
                ctx.moveTo(this.x - Math.cos(angle) * len, this.y - Math.sin(angle) * len);
                ctx.lineTo(this.x + Math.cos(angle) * len * 0.3, this.y + Math.sin(angle) * len * 0.3);
                ctx.stroke();
                break;

            case 'trail':
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size * 2);
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size * 2, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'ring':
                ctx.strokeStyle = this.color;
                ctx.lineWidth = Math.max(1, size * 0.3);
                const ringSize = size * (1 + (1 - alpha) * 5);
                ctx.beginPath();
                ctx.arc(this.x, this.y, ringSize, 0, Math.PI * 2);
                ctx.stroke();
                break;

            case 'star':
                ctx.fillStyle = this.color;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                this.drawStar(ctx, 0, 0, 4, size, size * 0.4);
                ctx.fill();
                break;

            case 'debris':
                ctx.fillStyle = this.color;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.fillRect(-size, -size * 0.4, size * 2, size * 0.8);
                break;
        }

        ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerR, innerR) {
        ctx.beginPath();
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
            rot += step;
        }
        ctx.closePath();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 800;
    }

    add(particle) {
        if (this.particles.length < this.maxParticles) {
            this.particles.push(particle);
        }
    }

    emit(x, y, count, config = {}) {
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;
            this.particles.push(new Particle(x, y, {
                ...config,
                vx: config.vx !== undefined ? config.vx + (Math.random() - 0.5) * (config.spread || 2) : (Math.random() - 0.5) * (config.spread || 4),
                vy: config.vy !== undefined ? config.vy + (Math.random() - 0.5) * (config.spread || 2) : (Math.random() - 0.5) * (config.spread || 4),
                size: config.size ? config.size * (0.5 + Math.random() * 0.5) : 2 + Math.random() * 3,
                life: config.life ? config.life * (0.7 + Math.random() * 0.3) : 0.5 + Math.random() * 0.5,
            }));
        }
    }

    // Preset effects
    explosion(x, y, color = '#ff6b35', size = 1) {
        const count = Math.floor(20 * size);
        // Core particles
        this.emit(x, y, count, {
            color: color,
            spread: 6 * size,
            size: 4 * size,
            life: 0.6,
            decay: 0.025,
            type: 'circle',
        });
        // Sparks
        this.emit(x, y, Math.floor(count * 0.8), {
            color: '#ffffff',
            spread: 10 * size,
            size: 2,
            life: 0.4,
            decay: 0.03,
            type: 'spark',
        });
        // Ring
        this.add(new Particle(x, y, {
            color: color,
            size: 5 * size,
            life: 0.4,
            decay: 0.03,
            type: 'ring',
            vx: 0,
            vy: 0,
        }));
        // Debris
        this.emit(x, y, Math.floor(count * 0.4), {
            color: '#888',
            spread: 5 * size,
            size: 3 * size,
            life: 0.8,
            decay: 0.02,
            type: 'debris',
            gravity: 0.05,
        });
    }

    bigExplosion(x, y, color = '#ff1744') {
        this.explosion(x, y, color, 2.5);
        // Extra rings
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.add(new Particle(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30, {
                    color: color,
                    size: 10 + i * 5,
                    life: 0.5,
                    decay: 0.02,
                    type: 'ring',
                    vx: 0,
                    vy: 0,
                }));
            }, i * 100);
        }
        // Stars
        this.emit(x, y, 15, {
            color: '#ffe600',
            spread: 8,
            size: 4,
            life: 0.8,
            decay: 0.02,
            type: 'star',
        });
    }

    engineTrail(x, y, color = '#00f5ff') {
        this.emit(x, y, 2, {
            color: color,
            vx: (Math.random() - 0.5) * 0.5,
            vy: 2 + Math.random() * 2,
            spread: 0.5,
            size: 3,
            life: 0.3,
            decay: 0.04,
            type: 'trail',
        });
    }

    bulletTrail(x, y, color = '#00f5ff') {
        this.emit(x, y, 1, {
            color: color,
            vx: 0,
            vy: 0,
            spread: 0.3,
            size: 2,
            life: 0.15,
            decay: 0.06,
            type: 'trail',
        });
    }

    shieldEffect(x, y, radius) {
        const angle = Math.random() * Math.PI * 2;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        this.emit(px, py, 1, {
            color: '#4361ee',
            vx: Math.cos(angle) * 0.5,
            vy: Math.sin(angle) * 0.5,
            spread: 0.2,
            size: 2,
            life: 0.3,
            decay: 0.04,
            type: 'circle',
        });
    }

    powerupPickup(x, y, color = '#39ff14') {
        this.emit(x, y, 25, {
            color: color,
            spread: 6,
            size: 3,
            life: 0.6,
            decay: 0.025,
            type: 'star',
        });
        this.add(new Particle(x, y, {
            color: color,
            size: 8,
            life: 0.5,
            decay: 0.025,
            type: 'ring',
            vx: 0,
            vy: 0,
        }));
    }

    damageEffect(x, y) {
        this.emit(x, y, 8, {
            color: '#ff1744',
            spread: 3,
            size: 2,
            life: 0.3,
            decay: 0.04,
            type: 'spark',
        });
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (!this.particles[i].alive) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            p.draw(ctx);
        }
    }

    clear() {
        this.particles = [];
    }
}

// Global particle system
const particles = new ParticleSystem();
