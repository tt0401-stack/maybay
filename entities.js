/* ============================================
   NEBULA STRIKE — Game Entities
   Player, Enemies, Bullets, PowerUps, Boss
   ============================================ */

// ============ BULLET ============
class Bullet {
    constructor(x, y, vx, vy, config = {}) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = config.damage || 1;
        this.size = config.size || 3;
        this.color = config.color || '#00f5ff';
        this.isEnemy = config.isEnemy || false;
        this.alive = true;
        this.piercing = config.piercing || false;
        this.trail = config.trail !== false;
    }

    update(dt, canvasW, canvasH) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Out of bounds
        if (this.x < -20 || this.x > canvasW + 20 || this.y < -20 || this.y > canvasH + 20) {
            this.alive = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.size * 4;
        ctx.fillStyle = this.color;

        if (this.isEnemy) {
            // Enemy bullets - round
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Player bullets - elongated
            const angle = Math.atan2(this.vy, this.vx);
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size * 3, this.size, 0, 0, Math.PI * 2);
            ctx.fill();
            // Bright core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size * 1.5, this.size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// ============ PLAYER ============
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 50;
        this.speed = 5;
        this.baseSpeed = 5;
        this.health = 100;
        this.maxHealth = 100;
        this.alive = true;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.shootCooldown = 0;
        this.shootRate = 8; // frames between shots
        this.baseShootRate = 8;

        // Power-ups
        this.shield = false;
        this.shieldTimer = 0;
        this.shieldRadius = 45;
        this.multiShot = false;
        this.multiShotTimer = 0;
        this.laser = false;
        this.laserTimer = 0;
        this.speedBoost = false;
        this.speedBoostTimer = 0;

        // Visual
        this.engineFlicker = 0;
        this.tilt = 0;
        this.hitFlash = 0;
    }

    update(dt, keys, canvasW, canvasH) {
        // Movement
        let dx = 0, dy = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
        if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
        if (keys['ArrowDown'] || keys['KeyS']) dy += 1;

        // Normalize diagonal
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        const speed = this.speedBoost ? this.baseSpeed * 1.6 : this.baseSpeed;
        this.x += dx * speed * dt;
        this.y += dy * speed * dt;

        // Clamp to bounds
        this.x = Math.max(this.width / 2, Math.min(canvasW - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(canvasH - this.height / 2, this.y));

        // Visual tilt based on horizontal movement
        this.tilt += (dx * 0.3 - this.tilt) * 0.1 * dt;
        this.engineFlicker = Math.sin(Date.now() * 0.02) * 0.3 + 0.7;

        // Shoot cooldown
        if (this.shootCooldown > 0) this.shootCooldown -= dt;

        // Invulnerability
        if (this.invulnerable) {
            this.invulnerableTimer -= dt;
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
            }
        }

        // Hit flash decay
        if (this.hitFlash > 0) this.hitFlash -= 0.05 * dt;

        // Power-up timers
        this.updatePowerups(dt);
    }

    updatePowerups(dt) {
        if (this.shield) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) this.shield = false;
        }
        if (this.multiShot) {
            this.multiShotTimer -= dt;
            if (this.multiShotTimer <= 0) this.multiShot = false;
        }
        if (this.laser) {
            this.laserTimer -= dt;
            if (this.laserTimer <= 0) this.laser = false;
        }
        if (this.speedBoost) {
            this.speedBoostTimer -= dt;
            if (this.speedBoostTimer <= 0) this.speedBoost = false;
        }
    }

    shoot() {
        if (this.shootCooldown > 0) return [];
        this.shootCooldown = this.shootRate;
        
        const bullets = [];
        const bulletSpeed = -10;

        if (this.laser) {
            // Laser - powerful single beam
            bullets.push(new Bullet(this.x, this.y - this.height / 2, 0, bulletSpeed * 1.5, {
                damage: 3,
                size: 5,
                color: '#ff00e5',
                piercing: true,
            }));
            audio.shootLaser();
        } else if (this.multiShot) {
            // Multi-shot - 5 spread
            const angles = [-0.3, -0.15, 0, 0.15, 0.3];
            for (const angle of angles) {
                bullets.push(new Bullet(
                    this.x + Math.sin(angle) * 10,
                    this.y - this.height / 2,
                    Math.sin(angle) * 3,
                    bulletSpeed,
                    { damage: 1, size: 2.5, color: '#39ff14' }
                ));
            }
            audio.shootMulti();
        } else {
            // Normal double shot
            bullets.push(new Bullet(this.x - 8, this.y - this.height / 2, 0, bulletSpeed, {
                damage: 1, size: 3, color: '#00f5ff'
            }));
            bullets.push(new Bullet(this.x + 8, this.y - this.height / 2, 0, bulletSpeed, {
                damage: 1, size: 3, color: '#00f5ff'
            }));
            audio.shoot();
        }
        return bullets;
    }

    takeDamage(amount) {
        if (this.invulnerable) return false;
        
        if (this.shield) {
            audio.shieldHit();
            this.shieldTimer -= 60; // Reduce shield time on hit
            if (this.shieldTimer <= 0) this.shield = false;
            return false;
        }

        this.health -= amount;
        this.hitFlash = 1;
        this.invulnerable = true;
        this.invulnerableTimer = 30;
        audio.playerHit();

        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
            audio.playerDeath();
        }
        return true;
    }

    activatePowerup(type) {
        const duration = 600; // 10 seconds at 60fps
        switch (type) {
            case 'shield':
                this.shield = true;
                this.shieldTimer = duration;
                break;
            case 'multi':
                this.multiShot = true;
                this.multiShotTimer = duration;
                break;
            case 'laser':
                this.laser = true;
                this.laserTimer = duration;
                break;
            case 'speed':
                this.speedBoost = true;
                this.speedBoostTimer = duration;
                break;
            case 'health':
                this.health = Math.min(this.maxHealth, this.health + 30);
                break;
        }
        audio.powerUp();
    }

    draw(ctx) {
        if (!this.alive) return;
        
        // Invulnerability flicker
        if (this.invulnerable && Math.floor(this.invulnerableTimer) % 4 < 2) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.tilt);

        // Hit flash
        if (this.hitFlash > 0) {
            ctx.shadowColor = '#ff1744';
            ctx.shadowBlur = 30;
        }

        // Engine glow
        const engineGlow = ctx.createRadialGradient(0, this.height / 2 + 5, 0, 0, this.height / 2 + 5, 20 * this.engineFlicker);
        engineGlow.addColorStop(0, 'rgba(0, 245, 255, 0.8)');
        engineGlow.addColorStop(0.5, 'rgba(67, 97, 238, 0.3)');
        engineGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = engineGlow;
        ctx.beginPath();
        ctx.arc(0, this.height / 2 + 5, 20 * this.engineFlicker, 0, Math.PI * 2);
        ctx.fill();

        // Ship body
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = 15;

        // Main hull
        ctx.fillStyle = '#1a1a3e';
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);           // Nose
        ctx.lineTo(-this.width / 2, this.height / 3);  // Left wing
        ctx.lineTo(-this.width / 4, this.height / 2);  // Left engine
        ctx.lineTo(this.width / 4, this.height / 2);   // Right engine
        ctx.lineTo(this.width / 2, this.height / 3);   // Right wing
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cockpit
        const cockpitGrad = ctx.createLinearGradient(0, -this.height / 4, 0, this.height / 6);
        cockpitGrad.addColorStop(0, '#00f5ff');
        cockpitGrad.addColorStop(1, '#4361ee');
        ctx.fillStyle = cockpitGrad;
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 3);
        ctx.lineTo(-6, 0);
        ctx.lineTo(0, this.height / 6);
        ctx.lineTo(6, 0);
        ctx.closePath();
        ctx.fill();

        // Wing details
        ctx.strokeStyle = 'rgba(0, 245, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(-this.width / 2 + 5, this.height / 3 - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(5, -5);
        ctx.lineTo(this.width / 2 - 5, this.height / 3 - 3);
        ctx.stroke();

        ctx.restore();

        // Shield visualization
        if (this.shield) {
            ctx.save();
            ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.008) * 0.15;
            ctx.strokeStyle = '#4361ee';
            ctx.shadowColor = '#4361ee';
            ctx.shadowBlur = 20;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.shieldRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Shield hex pattern
            ctx.globalAlpha = 0.1 + Math.sin(Date.now() * 0.005) * 0.05;
            ctx.fillStyle = '#4361ee';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.shieldRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Speed boost trail effect
        if (this.speedBoost) {
            particles.emit(this.x + (Math.random() - 0.5) * 15, this.y + this.height / 2, 1, {
                color: '#ff6b35',
                vy: 3,
                spread: 0.5,
                size: 4,
                life: 0.2,
                decay: 0.05,
                type: 'trail',
            });
        }
    }

    getHitbox() {
        return {
            x: this.x - this.width / 3,
            y: this.y - this.height / 3,
            w: this.width * 0.66,
            h: this.height * 0.66,
        };
    }
}

// ============ ENEMY BASE ============
class Enemy {
    constructor(x, y, type = 'scout') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.alive = true;
        this.hitFlash = 0;
        this.angle = 0;
        this.spawnTime = 0;

        this.configure(type);
    }

    configure(type) {
        switch (type) {
            case 'scout':
                this.width = 28;
                this.height = 28;
                this.health = 2;
                this.maxHealth = 2;
                this.speed = 2.5;
                this.score = 100;
                this.color = '#ff6b35';
                this.shootRate = 120;
                this.shootTimer = Math.random() * 60;
                this.pattern = 'straight';
                this.bulletSpeed = 4;
                this.bulletDamage = 10;
                break;
            case 'fighter':
                this.width = 32;
                this.height = 35;
                this.health = 4;
                this.maxHealth = 4;
                this.speed = 2;
                this.score = 200;
                this.color = '#ff00e5';
                this.shootRate = 80;
                this.shootTimer = Math.random() * 40;
                this.pattern = 'zigzag';
                this.zigzagAmplitude = 2;
                this.zigzagFrequency = 0.03;
                this.bulletSpeed = 5;
                this.bulletDamage = 15;
                break;
            case 'tank':
                this.width = 40;
                this.height = 40;
                this.health = 8;
                this.maxHealth = 8;
                this.speed = 1;
                this.score = 350;
                this.color = '#b347ea';
                this.shootRate = 60;
                this.shootTimer = Math.random() * 30;
                this.pattern = 'straight';
                this.bulletSpeed = 3;
                this.bulletDamage = 20;
                break;
            case 'kamikaze':
                this.width = 24;
                this.height = 24;
                this.health = 1;
                this.maxHealth = 1;
                this.speed = 4;
                this.score = 150;
                this.color = '#ff1744';
                this.shootRate = Infinity; // doesn't shoot
                this.shootTimer = Infinity;
                this.pattern = 'chase';
                this.bulletSpeed = 0;
                this.bulletDamage = 25;
                break;
            case 'orbiter':
                this.width = 30;
                this.height = 30;
                this.health = 3;
                this.maxHealth = 3;
                this.speed = 1.5;
                this.score = 250;
                this.color = '#ffe600';
                this.shootRate = 90;
                this.shootTimer = Math.random() * 45;
                this.pattern = 'orbit';
                this.orbitRadius = 100 + Math.random() * 100;
                this.orbitSpeed = 0.02 + Math.random() * 0.01;
                this.orbitCenterX = this.x;
                this.orbitCenterY = 150 + Math.random() * 100;
                this.bulletSpeed = 4;
                this.bulletDamage = 12;
                break;
        }
    }

    update(dt, playerX, playerY, canvasW, canvasH) {
        this.spawnTime += dt;
        this.shootTimer += dt;

        switch (this.pattern) {
            case 'straight':
                this.y += this.speed * dt;
                break;
            case 'zigzag':
                this.y += this.speed * dt;
                this.x += Math.sin(this.spawnTime * this.zigzagFrequency) * this.zigzagAmplitude * dt;
                break;
            case 'chase':
                const dx = playerX - this.x;
                const dy = playerY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    this.x += (dx / dist) * this.speed * dt;
                    this.y += (dy / dist) * this.speed * dt;
                }
                this.angle = Math.atan2(dy, dx) + Math.PI / 2;
                break;
            case 'orbit':
                if (this.y < this.orbitCenterY) {
                    this.y += this.speed * dt;
                } else {
                    this.angle += this.orbitSpeed * dt;
                    this.x = this.orbitCenterX + Math.cos(this.angle) * this.orbitRadius;
                    this.y = this.orbitCenterY + Math.sin(this.angle) * this.orbitRadius * 0.4;
                }
                break;
        }

        // Hit flash
        if (this.hitFlash > 0) this.hitFlash -= 0.08 * dt;

        // Remove if below screen
        if (this.y > canvasH + 60) this.alive = false;
    }

    tryShoot(playerX, playerY) {
        if (this.shootTimer >= this.shootRate) {
            this.shootTimer = 0;
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return null;
            
            return new Bullet(this.x, this.y + this.height / 2,
                (dx / dist) * this.bulletSpeed,
                (dy / dist) * this.bulletSpeed,
                { damage: this.bulletDamage, size: 4, color: this.color, isEnemy: true }
            );
        }
        return null;
    }

    takeDamage(amount) {
        this.health -= amount;
        this.hitFlash = 1;
        if (this.health <= 0) {
            this.alive = false;
            return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.pattern === 'chase') {
            ctx.rotate(this.angle);
        }

        // Hit flash
        if (this.hitFlash > 0) {
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 20;
        } else {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
        }

        const flashColor = this.hitFlash > 0.5 ? '#ffffff' : this.color;

        // Draw based on type
        switch (this.type) {
            case 'scout':
                this.drawScout(ctx, flashColor);
                break;
            case 'fighter':
                this.drawFighter(ctx, flashColor);
                break;
            case 'tank':
                this.drawTank(ctx, flashColor);
                break;
            case 'kamikaze':
                this.drawKamikaze(ctx, flashColor);
                break;
            case 'orbiter':
                this.drawOrbiter(ctx, flashColor);
                break;
        }

        // Health bar for multi-hit enemies
        if (this.maxHealth > 2 && this.health < this.maxHealth) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(-this.width / 2, -this.height / 2 - 8, this.width, 3);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width / 2, -this.height / 2 - 8, this.width * (this.health / this.maxHealth), 3);
        }

        ctx.restore();
    }

    drawScout(ctx, color) {
        ctx.fillStyle = '#1a0a2e';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, this.height / 2);
        ctx.lineTo(-this.width / 2, -this.height / 3);
        ctx.lineTo(0, -this.height / 2);
        ctx.lineTo(this.width / 2, -this.height / 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Eye
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawFighter(ctx, color) {
        ctx.fillStyle = '#1a0a2e';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, this.height / 2);
        ctx.lineTo(-this.width / 2, 0);
        ctx.lineTo(-this.width / 3, -this.height / 2);
        ctx.lineTo(0, -this.height / 3);
        ctx.lineTo(this.width / 3, -this.height / 2);
        ctx.lineTo(this.width / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Core
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawTank(ctx, color) {
        ctx.fillStyle = '#1a0a2e';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        // Hexagonal shape
        const size = this.width / 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = Math.cos(angle) * size;
            const py = Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Inner detail
        ctx.strokeStyle = `${color}88`;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * size * 0.7, Math.sin(angle) * size * 0.7);
        }
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    drawKamikaze(ctx, color) {
        // Pulsing danger circle
        const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.15;
        ctx.fillStyle = `${color}33`;
        ctx.beginPath();
        ctx.arc(0, 0, this.width * pulse, 0, Math.PI * 2);
        ctx.fill();
        // Core
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Warning symbol
        ctx.fillStyle = '#1a0a2e';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, 0);
    }

    drawOrbiter(ctx, color) {
        // Rotating diamond
        const rot = Date.now() * 0.003;
        ctx.rotate(rot);
        ctx.fillStyle = '#1a0a2e';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        const s = this.width / 2;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Inner ring
        ctx.strokeStyle = `${color}66`;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    getHitbox() {
        const shrink = 0.7;
        return {
            x: this.x - (this.width * shrink) / 2,
            y: this.y - (this.height * shrink) / 2,
            w: this.width * shrink,
            h: this.height * shrink,
        };
    }
}

// ============ BOSS ============
class Boss {
    constructor(x, y, level = 1) {
        this.x = x;
        this.y = y;
        this.targetY = 100;
        this.width = 80 + level * 10;
        this.height = 70 + level * 8;
        this.level = level;
        this.health = 50 + level * 30;
        this.maxHealth = this.health;
        this.alive = true;
        this.hitFlash = 0;
        this.score = 2000 + level * 1000;
        this.color = '#ff1744';

        // Movement
        this.phase = 0;
        this.moveSpeed = 1.5 + level * 0.2;
        this.entered = false;

        // Attacks
        this.attackTimer = 0;
        this.attackPattern = 0;
        this.attackCooldown = 90 - level * 5;
        this.bulletDamage = 15 + level * 5;

        // Visual
        this.pulsePhase = 0;
        this.coreRotation = 0;
    }

    update(dt, playerX, playerY, canvasW) {
        // Entry
        if (!this.entered) {
            this.y += 1 * dt;
            if (this.y >= this.targetY) {
                this.entered = true;
            }
            return;
        }

        // Movement pattern
        this.phase += 0.01 * dt;
        this.x = canvasW / 2 + Math.sin(this.phase) * (canvasW / 3);
        this.y = this.targetY + Math.sin(this.phase * 1.5) * 30;

        // Attack
        this.attackTimer += dt;

        // Visual
        this.hitFlash = Math.max(0, this.hitFlash - 0.05 * dt);
        this.pulsePhase += 0.05 * dt;
        this.coreRotation += 0.02 * dt;
    }

    tryShoot(playerX, playerY) {
        if (!this.entered) return [];
        
        const bullets = [];
        if (this.attackTimer >= this.attackCooldown) {
            this.attackTimer = 0;
            this.attackPattern = (this.attackPattern + 1) % 3;

            switch (this.attackPattern) {
                case 0: // Spread shot
                    const spreadCount = 5 + this.level;
                    for (let i = 0; i < spreadCount; i++) {
                        const angle = (Math.PI / (spreadCount - 1)) * i;
                        bullets.push(new Bullet(
                            this.x, this.y + this.height / 2,
                            Math.cos(angle) * 3.5 - 1.75,
                            Math.sin(angle) * 3 + 1,
                            { damage: this.bulletDamage, size: 5, color: '#ff1744', isEnemy: true }
                        ));
                    }
                    break;

                case 1: // Aimed burst
                    const dx = playerX - this.x;
                    const dy = playerY - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    for (let i = 0; i < 3; i++) {
                        setTimeout(() => {
                            if (!this.alive) return;
                            const spread = (Math.random() - 0.5) * 0.5;
                            const bx = (dx / dist) * 5;
                            const by = (dy / dist) * 5;
                            bullets.push(new Bullet(
                                this.x, this.y + this.height / 2,
                                bx + spread, by + spread,
                                { damage: this.bulletDamage, size: 4, color: '#ff6b35', isEnemy: true }
                            ));
                        }, i * 100);
                    }
                    break;

                case 2: // Ring shot
                    const ringCount = 8 + this.level * 2;
                    for (let i = 0; i < ringCount; i++) {
                        const angle = (Math.PI * 2 / ringCount) * i + this.coreRotation;
                        bullets.push(new Bullet(
                            this.x + Math.cos(angle) * 20,
                            this.y + Math.sin(angle) * 20,
                            Math.cos(angle) * 3,
                            Math.sin(angle) * 3,
                            { damage: this.bulletDamage * 0.8, size: 4, color: '#b347ea', isEnemy: true }
                        ));
                    }
                    break;
            }
        }
        return bullets;
    }

    takeDamage(amount) {
        this.health -= amount;
        this.hitFlash = 1;
        audio.bossHit();
        
        if (this.health <= 0) {
            this.alive = false;
            return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Danger aura
        const auraSize = this.width * 0.8 + Math.sin(this.pulsePhase) * 10;
        const aura = ctx.createRadialGradient(0, 0, this.width * 0.3, 0, 0, auraSize);
        aura.addColorStop(0, 'rgba(255, 23, 68, 0.15)');
        aura.addColorStop(1, 'transparent');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, auraSize, 0, Math.PI * 2);
        ctx.fill();

        // Hit flash
        if (this.hitFlash > 0.5) {
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 30;
        } else {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15;
        }

        const flashColor = this.hitFlash > 0.5 ? '#ffffff' : this.color;

        // Main body - aggressive angular shape
        ctx.fillStyle = '#1a0a1e';
        ctx.strokeStyle = flashColor;
        ctx.lineWidth = 2;
        
        const w = this.width / 2;
        const h = this.height / 2;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(-w * 0.6, -h * 0.4);
        ctx.lineTo(-w, 0);
        ctx.lineTo(-w * 0.8, h * 0.6);
        ctx.lineTo(-w * 0.3, h);
        ctx.lineTo(w * 0.3, h);
        ctx.lineTo(w * 0.8, h * 0.6);
        ctx.lineTo(w, 0);
        ctx.lineTo(w * 0.6, -h * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wing extensions
        ctx.beginPath();
        ctx.moveTo(-w * 0.8, -h * 0.2);
        ctx.lineTo(-w * 1.3, h * 0.3);
        ctx.lineTo(-w * 0.9, h * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(w * 0.8, -h * 0.2);
        ctx.lineTo(w * 1.3, h * 0.3);
        ctx.lineTo(w * 0.9, h * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Rotating core
        ctx.save();
        ctx.rotate(this.coreRotation);
        ctx.strokeStyle = `${flashColor}88`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 5, Math.sin(angle) * 5);
            ctx.lineTo(Math.cos(angle) * 18, Math.sin(angle) * 18);
            ctx.stroke();
        }
        ctx.restore();

        // Core eye
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.4, flashColor);
        coreGrad.addColorStop(1, `${flashColor}00`);
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        ctx.shadowBlur = 0;
        const barWidth = this.width;
        const barHeight = 6;
        const barY = -h - 20;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
        
        const healthPct = this.health / this.maxHealth;
        const healthColor = healthPct > 0.5 ? '#ff1744' : healthPct > 0.25 ? '#ff6b35' : '#ffe600';
        ctx.fillStyle = healthColor;
        ctx.fillRect(-barWidth / 2, barY, barWidth * healthPct, barHeight);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);

        // Boss name
        ctx.fillStyle = this.color;
        ctx.font = '10px "Share Tech Mono"';
        ctx.textAlign = 'center';
        ctx.fillText(`OVERLORD MK.${this.level}`, 0, barY - 6);

        ctx.restore();
    }

    getHitbox() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            w: this.width,
            h: this.height,
        };
    }
}

// ============ POWERUP ============
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = 16;
        this.alive = true;
        this.speed = 1.5;
        this.bobPhase = Math.random() * Math.PI * 2;

        switch (type) {
            case 'shield': this.color = '#4361ee'; this.icon = '🛡'; break;
            case 'multi': this.color = '#39ff14'; this.icon = '🔱'; break;
            case 'laser': this.color = '#ff00e5'; this.icon = '⚡'; break;
            case 'speed': this.color = '#ff6b35'; this.icon = '🚀'; break;
            case 'health': this.color = '#ff1744'; this.icon = '❤'; break;
        }
    }

    update(dt, canvasH) {
        this.y += this.speed * dt;
        this.bobPhase += 0.05 * dt;
        if (this.y > canvasH + 30) this.alive = false;
    }

    draw(ctx) {
        ctx.save();
        const bob = Math.sin(this.bobPhase) * 3;
        ctx.translate(this.x, this.y + bob);

        // Glow
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 2);
        glow.addColorStop(0, `${this.color}44`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Container
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(10, 10, 30, 0.8)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        const rotation = Date.now() * 0.002;
        ctx.rotate(rotation);
        
        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Icon
        ctx.rotate(-rotation);
        ctx.shadowBlur = 0;
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, 0, 0);

        ctx.restore();
    }

    getHitbox() {
        return {
            x: this.x - this.size,
            y: this.y - this.size,
            w: this.size * 2,
            h: this.size * 2,
        };
    }
}
