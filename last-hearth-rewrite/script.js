// Last Hearth - Rewritten version using vanilla JS
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.tavernHP = 100;
        this.waveNumber = 1;
        this.score = 0;
        this.gameOver = false;
        this.inUpgradeScreen = false;
        this.inSunriseScreen = false;
        
        // Player (defender at the bottom)
        this.player = {
            x: this.width / 2,
            y: this.height - 50,
            width: 40,
            height: 40,
            speed: 5,
            lastShot: 0,
            shootDelay: 250
        };
        
        // Arrays for game objects
        this.monsters = [];
        this.bullets = [];
        this.heroes = [];
        
        // Monster types
        this.monsterTypes = [
            { type: 'normal', health: 1, speed: 1, color: '#FFFFFF', size: 20 }, // White
            { type: 'fast', health: 0.5, speed: 1.8, color: '#00FF00', size: 15 },   // Green
            { type: 'tank', health: 3, speed: 0.6, color: '#FF0000', size: 30 }      // Red
        ];
        
        // Upgrade options
        this.availableUpgrades = [];
        
        // Initialize heroes
        this.initializeHeroes();
        
        // Load saved progress
        this.loadProgress();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start game loop
        this.gameLoop();
    }
    
    initializeHeroes() {
        if (this.heroes.length === 0) {
            this.heroes = [
                {
                    id: 'warrior',
                    name: 'Воин',
                    damage: 1,
                    health: 10,
                    description: 'Ближний боец с высоким здоровьем',
                    perks: [],
                    level: 1
                },
                {
                    id: 'mage',
                    name: 'Маг',
                    damage: 2,
                    health: 5,
                    description: 'Дальний боец с мощной магией',
                    perks: [],
                    level: 1
                },
                {
                    id: 'archer',
                    name: 'Лучник',
                    damage: 1.5,
                    health: 7,
                    description: 'Стрелок со средней дальностью',
                    perks: [],
                    level: 1
                }
            ];
        }
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.gameOver || this.inUpgradeScreen || this.inSunriseScreen) return;
            
            // Shooting with spacebar
            if (e.code === 'Space') {
                e.preventDefault();
                this.shoot();
            }
        });
        
        // Mouse movement for aiming
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.gameOver || this.inUpgradeScreen || this.inSunriseScreen) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            
            // Player can only move horizontally along the bottom
            this.player.x = Math.max(this.player.width/2, Math.min(this.width - this.player.width/2, mouseX));
        });
        
        // Mouse click for shooting
        this.canvas.addEventListener('click', () => {
            if (this.gameOver || this.inUpgradeScreen || this.inSunriseScreen) return;
            this.shoot();
        });
        
        // Button event listeners
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('next-wave-btn').addEventListener('click', () => {
            this.startNextWave();
        });
        
        // Upgrade buttons
        document.getElementById('upgrade1').addEventListener('click', () => {
            this.applyUpgrade(0);
            this.startNextWave();
        });
        
        document.getElementById('upgrade2').addEventListener('click', () => {
            this.applyUpgrade(1);
            this.startNextWave();
        });
        
        document.getElementById('upgrade3').addEventListener('click', () => {
            this.applyUpgrade(2);
            this.startNextWave();
        });
    }
    
    shoot() {
        const now = Date.now();
        if (now - this.player.lastShot > this.player.shootDelay) {
            // Create a bullet
            this.bullets.push({
                x: this.player.x,
                y: this.player.y,
                width: 5,
                height: 10,
                speed: 8,
                damage: 1
            });
            
            this.player.lastShot = now;
        }
    }
    
    spawnMonsters(count) {
        for (let i = 0; i < count; i++) {
            // Determine monster type based on wave number
            let monsterTypeIndex = 0;
            
            if (this.waveNumber >= 3) {
                // 50% normal, 30% fast, 20% tank
                const rand = Math.random();
                if (rand < 0.5) {
                    monsterTypeIndex = 0; // normal
                } else if (rand < 0.8) {
                    monsterTypeIndex = 1; // fast
                } else {
                    monsterTypeIndex = 2; // tank
                }
            } else if (this.waveNumber >= 2) {
                // 70% normal, 30% fast
                monsterTypeIndex = Math.random() < 0.7 ? 0 : 1;
            }
            
            const type = this.monsterTypes[monsterTypeIndex];
            
            // Spawn monster at random position near top
            const x = Math.random() * (this.width - 50) + 25;
            const y = Math.random() * 100 + 20;
            
            this.monsters.push({
                x: x,
                y: y,
                width: type.size,
                height: type.size,
                health: type.health,
                maxHealth: type.health,
                speed: type.speed * 0.8, // Adjusted for canvas movement
                color: type.color,
                type: type.type
            });
        }
    }
    
    update() {
        if (this.gameOver || this.inUpgradeScreen || this.inSunriseScreen) return;
        
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.y -= bullet.speed;
            
            // Remove bullets that go off screen
            if (bullet.y < 0) {
                this.bullets.splice(i, 1);
                continue;
            }
            
            // Check collision with monsters
            for (let j = this.monsters.length - 1; j >= 0; j--) {
                const monster = this.monsters[j];
                
                if (this.checkCollision(bullet, monster)) {
                    // Hit monster
                    monster.health -= bullet.damage;
                    
                    // Remove bullet
                    this.bullets.splice(i, 1);
                    
                    if (monster.health <= 0) {
                        // Monster died
                        this.monsters.splice(j, 1);
                        this.score += 10;
                        this.updateUI();
                    }
                    break; // Bullet is destroyed, so stop checking
                }
            }
        }
        
        // Update monsters
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];
            
            // Move towards player
            const dx = this.player.x - monster.x;
            const dy = this.player.y - monster.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                monster.x += (dx / distance) * monster.speed;
                monster.y += (dy / distance) * monster.speed;
            }
            
            // Check collision with player/tavern
            if (this.checkCollision(monster, {
                x: this.player.x - this.player.width/2,
                y: this.player.y - this.player.height/2,
                width: this.player.width,
                height: this.player.height
            })) {
                // Monster reached the tavern
                this.tavernHP -= 10;
                this.monsters.splice(i, 1);
                this.updateUI();
                
                if (this.tavernHP <= 0) {
                    this.endGame();
                }
            }
        }
        
        // Check if wave is complete
        if (this.monsters.length === 0 && !this.inUpgradeScreen && !this.inSunriseScreen) {
            this.completeWave();
        }
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw tavern (bottom area)
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(this.width/2 - 100, this.height - 30, 200, 30);
        
        // Draw tavern window
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(this.width/2 - 75, this.height - 25, 150, 20);
        
        // Draw player
        this.ctx.fillStyle = '#4169E1';
        this.ctx.fillRect(
            this.player.x - this.player.width/2,
            this.player.y - this.player.height/2,
            this.player.width,
            this.player.height
        );
        
        // Draw bullets
        this.ctx.fillStyle = '#FFFF00';
        this.bullets.forEach(bullet => {
            this.ctx.fillRect(bullet.x - bullet.width/2, bullet.y - bullet.height/2, bullet.width, bullet.height);
        });
        
        // Draw monsters
        this.monsters.forEach(monster => {
            this.ctx.fillStyle = monster.color;
            this.ctx.fillRect(
                monster.x - monster.width/2,
                monster.y - monster.height/2,
                monster.width,
                monster.height
            );
            
            // Draw health bar above monster
            const healthPercent = monster.health / monster.maxHealth;
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillRect(
                monster.x - monster.width/2,
                monster.y - monster.height/2 - 8,
                monster.width,
                4
            );
            this.ctx.fillStyle = '#00FF00';
            this.ctx.fillRect(
                monster.x - monster.width/2,
                monster.y - monster.height/2 - 8,
                monster.width * healthPercent,
                4
            );
        });
    }
    
    completeWave() {
        // Show upgrade screen
        this.showUpgradeSelection();
    }
    
    showUpgradeSelection() {
        this.inUpgradeScreen = true;
        this.generateRandomUpgrades();
        
        // Update UI
        document.getElementById('upgrade-screen').classList.remove('hidden');
        document.getElementById('upgrade1').textContent = this.availableUpgrades[0];
        document.getElementById('upgrade2').textContent = this.availableUpgrades[1];
        document.getElementById('upgrade3').textContent = this.availableUpgrades[2];
    }
    
    generateRandomUpgrades() {
        const upgradeOptions = [
            'Урон героя +1',
            'Здоровье героя +5',
            'Скорость стрельбы +10%',
            'Дополнительный снаряд',
            'Броня таверны +10',
            'Больше очков за убийства (+5)',
            'Новый герой: воин',
            'Новый герой: маг',
            'Новый герой: лучник'
        ];
        
        // Select 3 random upgrades
        this.availableUpgrades = [];
        const tempOptions = [...upgradeOptions];
        
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * tempOptions.length);
            this.availableUpgrades.push(tempOptions[randomIndex]);
            tempOptions.splice(randomIndex, 1);
        }
    }
    
    applyUpgrade(index) {
        const upgrade = this.availableUpgrades[index];
        
        switch(upgrade) {
            case 'Урон героя +1':
                const randomHero = this.heroes[Math.floor(Math.random() * this.heroes.length)];
                randomHero.damage += 1;
                randomHero.level += 1;
                break;
                
            case 'Здоровье героя +5':
                const randomHero2 = this.heroes[Math.floor(Math.random() * this.heroes.length)];
                randomHero2.health += 5;
                randomHero2.level += 1;
                break;
                
            case 'Скорость стрельбы +10%':
                this.player.shootDelay = Math.max(50, this.player.shootDelay * 0.9);
                break;
                
            case 'Дополнительный снаряд':
                // This would require more complex bullet logic
                break;
                
            case 'Броня таверны +10':
                this.tavernHP += 10;
                break;
                
            case 'Больше очков за убийства (+5)':
                // This would modify scoring system
                break;
                
            case 'Новый герой: воин':
                if (!this.heroes.some(hero => hero.id === 'warrior')) {
                    this.heroes.push({
                        id: 'warrior',
                        name: 'Воин',
                        damage: 1,
                        health: 10,
                        description: 'Ближний боец с высоким здоровьем',
                        perks: [],
                        level: 1
                    });
                }
                break;
                
            case 'Новый герой: маг':
                if (!this.heroes.some(hero => hero.id === 'mage')) {
                    this.heroes.push({
                        id: 'mage',
                        name: 'Маг',
                        damage: 2,
                        health: 5,
                        description: 'Дальний боец с мощной магией',
                        perks: [],
                        level: 1
                    });
                }
                break;
                
            case 'Новый герой: лучник':
                if (!this.heroes.some(hero => hero.id === 'archer')) {
                    this.heroes.push({
                        id: 'archer',
                        name: 'Лучник',
                        damage: 1.5,
                        health: 7,
                        description: 'Стрелок со средней дальностью',
                        perks: [],
                        level: 1
                    });
                }
                break;
        }
        
        // Hide upgrade screen
        document.getElementById('upgrade-screen').classList.add('hidden');
        this.inUpgradeScreen = false;
        
        // Save progress
        this.saveProgress();
    }
    
    startNextWave() {
        // Hide any screens
        document.getElementById('upgrade-screen').classList.add('hidden');
        document.getElementById('sunrise-screen').classList.add('hidden');
        this.inUpgradeScreen = false;
        this.inSunriseScreen = false;
        
        // Increment wave number
        this.waveNumber++;
        
        // Spawn monsters for next wave
        this.spawnMonsters(this.waveNumber * 2);
        
        // Update UI
        this.updateUI();
        
        // Save progress
        this.saveProgress();
    }
    
    showSunriseScreen() {
        this.inSunriseScreen = true;
        document.getElementById('sunrise-screen').classList.remove('hidden');
        
        // Add 1 light shard to score
        this.score += 1; // Representing 1 light shard
        
        // Update UI
        this.updateUI();
        
        // Save progress
        this.saveProgress();
    }
    
    endGame() {
        this.gameOver = true;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }
    
    restartGame() {
        // Reset game state
        this.tavernHP = 100;
        this.waveNumber = 1;
        this.score = 0;
        this.gameOver = false;
        this.inUpgradeScreen = false;
        this.inSunriseScreen = false;
        this.monsters = [];
        this.bullets = [];
        
        // Reset player
        this.player.x = this.width / 2;
        this.player.y = this.height - 50;
        this.player.lastShot = 0;
        this.player.shootDelay = 250;
        
        // Reinitialize heroes
        this.heroes = [];
        this.initializeHeroes();
        
        // Hide screens
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('upgrade-screen').classList.add('hidden');
        document.getElementById('sunrise-screen').classList.add('hidden');
        
        // Start first wave
        this.spawnMonsters(5);
        
        // Update UI
        this.updateUI();
        
        // Save progress
        this.saveProgress();
    }
    
    updateUI() {
        document.getElementById('tavernHP').textContent = this.tavernHP;
        document.getElementById('waveNumber').textContent = this.waveNumber;
        document.getElementById('score').textContent = this.score;
        document.getElementById('monsterCount').textContent = this.monsters.length;
    }
    
    saveProgress() {
        const gameData = {
            score: this.score,
            waveNumber: this.waveNumber,
            tavernHP: this.tavernHP,
            heroes: this.heroes
        };
        
        localStorage.setItem('lastHearthSave', JSON.stringify(gameData));
    }
    
    loadProgress() {
        const savedData = localStorage.getItem('lastHearthSave');
        
        if (savedData) {
            const gameData = JSON.parse(savedData);
            this.score = gameData.score || 0;
            this.waveNumber = gameData.waveNumber || 1;
            this.tavernHP = gameData.tavernHP || 100;
            
            // Load heroes if they exist in save
            if (gameData.heroes) {
                this.heroes = gameData.heroes;
            } else {
                this.initializeHeroes();
            }
        } else {
            this.initializeHeroes();
        }
        
        this.updateUI();
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    const game = new Game();
});