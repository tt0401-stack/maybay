/* ============================================
   NEBULA STRIKE — Main Game Engine
   Core game loop, state management, rendering
   ============================================ */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // State
        this.state = 'menu'; // menu, playing, paused, gameover
        this.running = false;

        // Game objects
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.powerups = [];
        this.boss = null;

        // Background
        this.stars = [];
        this.nebulaClouds = [];

        // Game state
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('nebulaStrike_highScore')) || 0;
        this.wave = 1;
        this.waveTimer = 0;
        this.waveDelay = 180; // frames between waves
        this.enemiesSpawned = 0;
        this.enemiesInWave = 0;
        this.waveComplete = false;
        this.bossWave = false;
        this.combo = 0;
        this.maxCombo = 0;
        this.comboTimer = 0;
        this.comboTimeout = 90; // frames
        this.totalKills = 0;

        // Screen effects
        this.screenShake = 0;
        this.screenFlash = 0;
        this.screenFlashColor = '#ffffff';
        this.slowMotion = false;
        this.slowMotionTimer = 0;

        // Input
        this.keys = {};

        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') e.preventDefault();
            
            if (e.code === 'KeyP' && this.state === 'playing') {
                this.pause();
            } else if (e.code === 'KeyP' && this.state === 'paused') {
                this.resume();
            }
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // UI Buttons
        document.getElementById('start-btn').addEventListener('click', () => {
            audio.init();
            audio.menuSelect();
            this.startGame();
        });
        document.getElementById('controls-btn').addEventListener('click', () => {
            audio.init();
            audio.menuSelect();
            this.showScreen('controls-screen');
        });
        document.getElementById('back-btn').addEventListener('click', () => {
            audio.menuSelect();
            this.showScreen('start-screen');
        });
        document.getElementById('resume-btn').addEventListener('click', () => {
            audio.menuSelect();
            this.resume();
        });
        document.getElementById('quit-btn').addEventListener('click', () => {
            audio.menuSelect();
            this.quitToMenu();
        });
        document.getElementById('retry-btn').addEventListener('click', () => {
            audio.menuSelect();
            this.startGame();
        });
        document.getElementById('menu-btn').addEventListener('click', () => {
            audio.menuSelect();
            this.quitToMenu();
        });

        // Hover sounds
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => audio.menuHover());
        });

        // Generate background
        this.generateStars();
        this.generateNebula();

        // Start render loop
        this.lastTime = performance.now();
        this.gameLoop();

        // Update highscore display
        document.getElementById('highscore').textContent = this.highScore.toLocaleString();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvasW = this.canvas.width;
        this.canvasH = this.canvas.height;
    }

    generateStars() {
        this.stars = [];
        for (let i = 0; i < 200; i++) {
            this.stars.push({
                x: Math.random() * this.canvasW,
                y: Math.random() * this.canvasH,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 1 + 0.3,
                brightness: Math.random() * 0.5 + 0.3,
                twinkle: Math.random() * Math.PI * 2,
            });
        }
    }

    generateNebula() {
        this.nebulaClouds = [];
        const colors = [
            'rgba(67, 97, 238, 0.03)',
            'rgba(179, 71, 234, 0.03)',
            'rgba(255, 0, 229, 0.02)',
            'rgba(0, 245, 255, 0.02)',
        ];
        for (let i = 0; i < 8; i++) {
            this.nebulaClouds.push({
                x: Math.random() * this.canvasW,
                y: Math.random() * this.canvasH,
                radius: 150 + Math.random() * 200,
                color: colors[Math.floor(Math.random() * colors.length)],
                speed: 0.1 + Math.random() * 0.2,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    }

    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.wave = 1;
        this.waveTimer = 0;
        this.enemiesSpawned = 0;
        this.enemiesInWave = 0;
        this.waveComplete = false;
        this.bossWave = false;
        this.combo = 0;
        this.maxCombo = 0;
        this.comboTimer = 0;
        this.totalKills = 0;
        this.screenShake = 0;
        this.screenFlash = 0;
        this.slowMotion = false;

        this.player = new Player(this.canvasW / 2, this.canvasH - 100);
        this.enemies = [];
        this.bullets = [];
        this.powerups = [];
        this.boss = null;
        particles.clear();

        this.showScreen('none');
        document.getElementById('hud').classList.remove('hidden');
        this.updateHUD();

        // Announce wave
        this.announceWave(1);
        this.setupWave(1);
    }

    setupWave(waveNum) {
        this.waveComplete = false;
        this.enemiesSpawned = 0;
        this.waveTimer = 0;

        // Boss every 5 waves
        if (waveNum % 5 === 0) {
            this.bossWave = true;
            this.enemiesInWave = 0;
            // Boss will spawn after announce
            setTimeout(() => {
                if (this.state === 'playing') {
                    this.boss = new Boss(this.canvasW / 2, -100, Math.floor(waveNum / 5));
                    this.announceBoss();
                    audio.bossWarning();
                }
            }, 1500);
        } else {
            this.bossWave = false;
            this.enemiesInWave = 5 + waveNum * 2;
        }
    }

    announceWave(num) {
        const waveAnnounce = document.getElementById('wave-announce');
        const waveNumber = document.getElementById('wave-number');
        waveNumber.textContent = num;
        waveAnnounce.classList.remove('hidden');
        audio.waveStart();

        setTimeout(() => {
            waveAnnounce.classList.add('hidden');
        }, 2000);
    }

    announceBoss() {
        const bossAnnounce = document.getElementById('boss-announce');
        bossAnnounce.classList.remove('hidden');

        setTimeout(() => {
            bossAnnounce.classList.add('hidden');
        }, 2500);
    }

    spawnEnemy() {
        const types = ['scout', 'fighter', 'tank', 'kamikaze', 'orbiter'];
        const weights = this.getEnemyWeights();
        
        // Weighted random selection
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let roll = Math.random() * totalWeight;
        let typeIndex = 0;
        for (let i = 0; i < weights.length; i++) {
            roll -= weights[i];
            if (roll <= 0) {
                typeIndex = i;
                break;
            }
        }

        const x = 50 + Math.random() * (this.canvasW - 100);
        const enemy = new Enemy(x, -40, types[typeIndex]);
        this.enemies.push(enemy);
        this.enemiesSpawned++;
    }

    getEnemyWeights() {
        // Adjust enemy type distribution based on wave
        const w = this.wave;
        return [
            Math.max(1, 5 - w * 0.3),     // scout - less common as waves progress
            Math.min(4, 1 + w * 0.3),      // fighter
            Math.min(3, w * 0.2),           // tank
            Math.min(3, w * 0.25),          // kamikaze
            Math.min(2, w * 0.15),          // orbiter
        ];
    }

    spawnPowerup(x, y) {
        if (Math.random() > 0.2) return; // 20% drop chance
        
        const types = ['shield', 'multi', 'laser', 'speed', 'health'];
        const weights = [1, 2, 1.5, 1.5, this.player.health < 50 ? 3 : 1];
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let roll = Math.random() * totalWeight;
        let typeIndex = 0;
        for (let i = 0; i < weights.length; i++) {
            roll -= weights[i];
            if (roll <= 0) { typeIndex = i; break; }
        }

        this.powerups.push(new PowerUp(x, y, types[typeIndex]));
    }

    addCombo() {
        this.combo++;
        this.comboTimer = this.comboTimeout;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        if (this.combo >= 3) audio.combo();
    }

    getComboMultiplier() {
        if (this.combo < 3) return 1;
        if (this.combo < 5) return 1.5;
        if (this.combo < 10) return 2;
        if (this.combo < 20) return 3;
        return 5;
    }

    addScore(base) {
        const multiplier = this.getComboMultiplier();
        const points = Math.floor(base * multiplier);
        this.score += points;
        
        // Floating score text
        this.showFloatingText(`+${points}`, this.player.x, this.player.y - 40, 
            multiplier > 1 ? '#ff00e5' : '#00f5ff');
    }

    showFloatingText(text, x, y, color = '#00f5ff') {
        // Use particles system for floating text effect
        const count = text.length;
        particles.emit(x, y, 3, {
            color: color,
            spread: 2,
            size: 2,
            life: 0.5,
            decay: 0.02,
            type: 'circle',
            vy: -2,
        });
    }

    // ============ COLLISION DETECTION ============
    checkCollisions() {
        if (!this.player || !this.player.alive) return;

        const playerBox = this.player.getHitbox();

        // Player bullets vs enemies
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet.isEnemy || !bullet.alive) continue;

            // Check vs enemies
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (!enemy.alive) continue;
                const enemyBox = enemy.getHitbox();

                if (this.boxCollision(
                    bullet.x - bullet.size, bullet.y - bullet.size, bullet.size * 2, bullet.size * 2,
                    enemyBox.x, enemyBox.y, enemyBox.w, enemyBox.h
                )) {
                    const killed = enemy.takeDamage(bullet.damage);
                    if (!bullet.piercing) bullet.alive = false;
                    
                    if (killed) {
                        this.onEnemyKilled(enemy);
                    } else {
                        audio.enemyHit();
                        particles.damageEffect(bullet.x, bullet.y);
                    }
                }
            }

            // Check vs boss
            if (this.boss && this.boss.alive) {
                const bossBox = this.boss.getHitbox();
                if (this.boxCollision(
                    bullet.x - bullet.size, bullet.y - bullet.size, bullet.size * 2, bullet.size * 2,
                    bossBox.x, bossBox.y, bossBox.w, bossBox.h
                )) {
                    const killed = this.boss.takeDamage(bullet.damage);
                    if (!bullet.piercing) bullet.alive = false;
                    
                    if (killed) {
                        this.onBossKilled();
                    }
                    particles.damageEffect(bullet.x, bullet.y);
                }
            }
        }

        // Enemy bullets vs player
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet.isEnemy || !bullet.alive) continue;

            if (this.player.shield) {
                // Check shield collision
                const dx = bullet.x - this.player.x;
                const dy = bullet.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.player.shieldRadius) {
                    bullet.alive = false;
                    this.player.takeDamage(0); // triggers shield hit
                    particles.damageEffect(bullet.x, bullet.y);
                    continue;
                }
            }

            if (this.boxCollision(
                bullet.x - bullet.size, bullet.y - bullet.size, bullet.size * 2, bullet.size * 2,
                playerBox.x, playerBox.y, playerBox.w, playerBox.h
            )) {
                this.player.takeDamage(bullet.damage);
                bullet.alive = false;
                particles.damageEffect(this.player.x, this.player.y);
                this.screenShake = 5;

                if (!this.player.alive) {
                    this.onPlayerDeath();
                }
            }
        }

        // Enemy body collision with player
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            const enemyBox = enemy.getHitbox();
            
            if (this.player.shield) {
                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.player.shieldRadius + enemy.width / 2) {
                    enemy.takeDamage(enemy.maxHealth); // instant kill on shield contact
                    this.onEnemyKilled(enemy);
                    continue;
                }
            }

            if (this.boxCollision(
                playerBox.x, playerBox.y, playerBox.w, playerBox.h,
                enemyBox.x, enemyBox.y, enemyBox.w, enemyBox.h
            )) {
                this.player.takeDamage(enemy.type === 'kamikaze' ? 30 : 20);
                enemy.alive = false;
                particles.explosion(enemy.x, enemy.y, enemy.color);
                this.screenShake = 8;

                if (!this.player.alive) {
                    this.onPlayerDeath();
                }
            }
        }

        // Player vs powerups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const pu = this.powerups[i];
            if (!pu.alive) continue;
            const puBox = pu.getHitbox();

            if (this.boxCollision(
                playerBox.x, playerBox.y, playerBox.w, playerBox.h,
                puBox.x, puBox.y, puBox.w, puBox.h
            )) {
                this.player.activatePowerup(pu.type);
                particles.powerupPickup(pu.x, pu.y, pu.color);
                pu.alive = false;
            }
        }
    }

    boxCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    onEnemyKilled(enemy) {
        this.totalKills++;
        this.addCombo();
        this.addScore(enemy.score);
        audio.enemyDestroy();
        particles.explosion(enemy.x, enemy.y, enemy.color);
        this.spawnPowerup(enemy.x, enemy.y);
        this.screenShake = 3;
    }

    onBossKilled() {
        this.totalKills++;
        this.addScore(this.boss.score);
        audio.bossDestroy();
        particles.bigExplosion(this.boss.x, this.boss.y);
        this.screenShake = 15;
        this.screenFlash = 1;
        this.screenFlashColor = '#ff1744';
        this.slowMotion = true;
        this.slowMotionTimer = 60;

        // Drop multiple powerups
        for (let i = 0; i < 3; i++) {
            const type = ['shield', 'multi', 'laser', 'speed', 'health'][Math.floor(Math.random() * 5)];
            this.powerups.push(new PowerUp(
                this.boss.x + (Math.random() - 0.5) * 80,
                this.boss.y + (Math.random() - 0.5) * 40,
                type
            ));
        }

        this.boss = null;
        this.bossWave = false;
        this.waveComplete = true;
    }

    onPlayerDeath() {
        particles.bigExplosion(this.player.x, this.player.y, '#00f5ff');
        this.screenShake = 20;
        this.screenFlash = 1;
        this.screenFlashColor = '#ff1744';

        setTimeout(() => {
            this.gameOver();
        }, 1500);
    }

    gameOver() {
        this.state = 'gameover';

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('nebulaStrike_highScore', this.highScore);
        }

        // Update UI
        document.getElementById('final-score').textContent = this.score.toLocaleString();
        document.getElementById('final-wave').textContent = this.wave;
        document.getElementById('final-combo').textContent = `x${this.maxCombo}`;
        document.getElementById('final-kills').textContent = this.totalKills;
        document.getElementById('final-highscore').textContent = this.highScore.toLocaleString();

        document.getElementById('hud').classList.add('hidden');
        this.showScreen('gameover-screen');
    }

    pause() {
        this.state = 'paused';
        this.showScreen('pause-screen');
    }

    resume() {
        this.state = 'playing';
        this.showScreen('none');
        document.getElementById('hud').classList.remove('hidden');
        this.lastTime = performance.now();
    }

    quitToMenu() {
        this.state = 'menu';
        document.getElementById('hud').classList.add('hidden');
        this.showScreen('start-screen');
        document.getElementById('highscore').textContent = this.highScore.toLocaleString();
    }

    // ============ UPDATE ============
    update(dt) {
        if (this.state !== 'playing') return;
        if (!this.player || !this.player.alive) {
            // Still update particles for death animation
            particles.update(dt);
            return;
        }

        // Slow motion
        let gameDt = dt;
        if (this.slowMotion) {
            gameDt = dt * 0.3;
            this.slowMotionTimer -= dt;
            if (this.slowMotionTimer <= 0) this.slowMotion = false;
        }

        // Player
        this.player.update(gameDt, this.keys, this.canvasW, this.canvasH);

        // Auto-shoot when holding space
        if (this.keys['Space']) {
            const newBullets = this.player.shoot();
            this.bullets.push(...newBullets);
        }

        // Engine trail
        if (this.player.alive) {
            particles.engineTrail(
                this.player.x - 8 + (Math.random() - 0.5) * 4,
                this.player.y + this.player.height / 2
            );
            particles.engineTrail(
                this.player.x + 8 + (Math.random() - 0.5) * 4,
                this.player.y + this.player.height / 2
            );
        }

        // Shield particles
        if (this.player.shield) {
            particles.shieldEffect(this.player.x, this.player.y, this.player.shieldRadius);
        }

        // Wave spawning
        if (!this.bossWave && !this.waveComplete) {
            this.waveTimer += gameDt;
            const spawnInterval = Math.max(20, 60 - this.wave * 2);
            if (this.waveTimer >= spawnInterval && this.enemiesSpawned < this.enemiesInWave) {
                this.waveTimer = 0;
                this.spawnEnemy();
            }

            // Check if wave is complete
            if (this.enemiesSpawned >= this.enemiesInWave && this.enemies.length === 0) {
                this.waveComplete = true;
            }
        }

        // Boss update
        if (this.boss && this.boss.alive) {
            this.boss.update(gameDt, this.player.x, this.player.y, this.canvasW);
            const bossBullets = this.boss.tryShoot(this.player.x, this.player.y);
            this.bullets.push(...bossBullets);
        }

        // Next wave
        if (this.waveComplete) {
            this.waveDelay -= gameDt;
            if (this.waveDelay <= 0) {
                this.wave++;
                this.waveDelay = 180;
                this.setupWave(this.wave);
                this.announceWave(this.wave);
            }
        }

        // Enemies
        for (const enemy of this.enemies) {
            enemy.update(gameDt, this.player.x, this.player.y, this.canvasW, this.canvasH);
            const bullet = enemy.tryShoot(this.player.x, this.player.y);
            if (bullet) this.bullets.push(bullet);
        }

        // Bullets
        for (const bullet of this.bullets) {
            bullet.update(gameDt, this.canvasW, this.canvasH);
            if (bullet.alive && bullet.trail && !bullet.isEnemy) {
                particles.bulletTrail(bullet.x, bullet.y, bullet.color);
            }
        }

        // Powerups
        for (const pu of this.powerups) {
            pu.update(gameDt, this.canvasH);
        }

        // Combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= gameDt;
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }

        // Collisions
        this.checkCollisions();

        // Clean up dead objects
        this.enemies = this.enemies.filter(e => e.alive);
        this.bullets = this.bullets.filter(b => b.alive);
        this.powerups = this.powerups.filter(p => p.alive);

        // Particles
        particles.update(gameDt);

        // Screen effects decay
        if (this.screenShake > 0) this.screenShake *= 0.9;
        if (this.screenFlash > 0) this.screenFlash -= 0.03 * dt;

        // Update HUD
        this.updateHUD();
    }

    updateHUD() {
        document.getElementById('score').textContent = this.score.toLocaleString();
        document.getElementById('wave').textContent = this.wave;
        document.getElementById('highscore').textContent = this.highScore.toLocaleString();

        if (this.player) {
            const healthPct = (this.player.health / this.player.maxHealth) * 100;
            const healthBar = document.getElementById('health-bar');
            healthBar.style.width = `${healthPct}%`;
            healthBar.className = 'health-bar-inner';
            if (healthPct <= 25) healthBar.classList.add('critical');
            else if (healthPct <= 50) healthBar.classList.add('warning');
            document.getElementById('health-text').textContent = Math.ceil(this.player.health);

            // Combo
            const comboDisplay = document.getElementById('combo-display');
            if (this.combo >= 3) {
                comboDisplay.style.opacity = '1';
                document.getElementById('combo-count').textContent = `x${this.combo}`;
                comboDisplay.style.transform = `scale(${1 + Math.min(this.combo * 0.02, 0.3)})`;
            } else {
                comboDisplay.style.opacity = '0';
            }

            // Powerup indicators
            this.updatePowerupUI('powerup-shield', this.player.shield, this.player.shieldTimer, 600);
            this.updatePowerupUI('powerup-multi', this.player.multiShot, this.player.multiShotTimer, 600);
            this.updatePowerupUI('powerup-laser', this.player.laser, this.player.laserTimer, 600);
            this.updatePowerupUI('powerup-speed', this.player.speedBoost, this.player.speedBoostTimer, 600);
        }
    }

    updatePowerupUI(id, active, timer, maxTimer) {
        const el = document.getElementById(id);
        const timerBar = el.querySelector('.powerup-timer');
        if (active) {
            el.classList.add('active');
            const pct = timer / maxTimer;
            timerBar.style.transform = `scaleX(${pct})`;
        } else {
            el.classList.remove('active');
            timerBar.style.transform = 'scaleX(0)';
        }
    }

    // ============ RENDER ============
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvasW, this.canvasH);

        // Apply screen shake
        ctx.save();
        if (this.screenShake > 0.5) {
            const shakeX = (Math.random() - 0.5) * this.screenShake * 2;
            const shakeY = (Math.random() - 0.5) * this.screenShake * 2;
            ctx.translate(shakeX, shakeY);
        }

        // Background
        this.drawBackground(ctx);

        if (this.state === 'playing' || this.state === 'paused') {
            // Powerups
            for (const pu of this.powerups) {
                pu.draw(ctx);
            }

            // Enemies
            for (const enemy of this.enemies) {
                enemy.draw(ctx);
            }

            // Boss
            if (this.boss && this.boss.alive) {
                this.boss.draw(ctx);
            }

            // Player
            if (this.player) {
                this.player.draw(ctx);
            }

            // Bullets
            for (const bullet of this.bullets) {
                bullet.draw(ctx);
            }

            // Particles
            particles.draw(ctx);
        } else {
            // Menu background particles
            particles.draw(ctx);
        }

        // Screen flash
        if (this.screenFlash > 0) {
            ctx.globalAlpha = this.screenFlash * 0.4;
            ctx.fillStyle = this.screenFlashColor;
            ctx.fillRect(0, 0, this.canvasW, this.canvasH);
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // Vignette
        this.drawVignette(ctx);
    }

    drawBackground(ctx) {
        // Deep space background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, this.canvasH);
        bgGrad.addColorStop(0, '#030312');
        bgGrad.addColorStop(0.5, '#0a0a20');
        bgGrad.addColorStop(1, '#050518');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.canvasW, this.canvasH);

        // Nebula clouds
        for (const cloud of this.nebulaClouds) {
            cloud.y += cloud.speed;
            cloud.x += Math.sin(cloud.phase + Date.now() * 0.0001) * 0.3;
            
            if (cloud.y > this.canvasH + cloud.radius) {
                cloud.y = -cloud.radius;
                cloud.x = Math.random() * this.canvasW;
            }

            const grad = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.radius);
            grad.addColorStop(0, cloud.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Stars
        for (const star of this.stars) {
            star.y += star.speed;
            if (star.y > this.canvasH) {
                star.y = 0;
                star.x = Math.random() * this.canvasW;
            }

            star.twinkle += 0.02;
            const brightness = star.brightness + Math.sin(star.twinkle) * 0.2;

            ctx.fillStyle = `rgba(200, 210, 255, ${brightness})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawVignette(ctx) {
        const grad = ctx.createRadialGradient(
            this.canvasW / 2, this.canvasH / 2, this.canvasW * 0.3,
            this.canvasW / 2, this.canvasH / 2, this.canvasW * 0.7
        );
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvasW, this.canvasH);
    }

    // ============ GAME LOOP ============
    gameLoop(timestamp = 0) {
        const elapsed = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        // Cap delta to prevent spiral of death
        const dt = Math.min(elapsed / 16.667, 3); // normalize to ~60fps, cap at 3x

        if (this.state === 'menu') {
            // Menu ambient particles
            if (Math.random() < 0.05) {
                particles.emit(
                    Math.random() * this.canvasW,
                    Math.random() * this.canvasH,
                    1,
                    {
                        color: Math.random() > 0.5 ? '#00f5ff' : '#ff00e5',
                        spread: 0.5,
                        size: 2,
                        life: 1,
                        decay: 0.01,
                        type: 'circle',
                        vy: -0.5,
                    }
                );
            }
            particles.update(dt);
        }

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

// ============ INITIALIZE ============
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});
