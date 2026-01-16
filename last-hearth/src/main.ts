import './style.css';
import Phaser from 'phaser';

class GameScene extends Phaser.Scene {
  // Переменные для игры
  private player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private monsters!: Phaser.GameObjects.Group;
  private bullets!: Phaser.GameObjects.Group;
  private tavernHP: number = 100;
  private waveNumber: number = 1;
  private score: number = 0;
  private gameOver: boolean = false;
  private lastShotTime: number = 0;
  private shootDelay: number = 250; // 250ms delay between shots
  
  // Переменные для героев и системы рогалика
  private heroes: any[] = [];
  private heroTypes = ['warrior', 'mage', 'archer'];
  private selectedHero: string | null = null;
  private availableUpgrades: string[] = [];
  private currentWaveMonstersKilled: number = 0;
  private totalMonstersKilled: number = 0;
  
  // Типы монстров
  private monsterTypes = [
    { type: 'normal', health: 1, speed: 100, color: 0xffffff },  // Белый
    { type: 'fast', health: 0.5, speed: 180, color: 0x00ff00 },   // Зеленый
    { type: 'tank', health: 3, speed: 60, color: 0xff0000 }      // Красный
  ];

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Загрузка ресурсов
    this.load.image('player', 'assets/player.svg');
    this.load.image('monster', 'assets/monster.svg');
    this.load.image('bullet', 'assets/bullet.svg');
    
    // Загрузка дополнительных ресурсов для героев и разных типов монстров
    this.load.image('warrior', 'assets/player.svg'); // временно используем тот же ресурс
    this.load.image('mage', 'assets/player.svg');    // временно используем тот же ресурс
    this.load.image('archer', 'assets/player.svg');  // временно используем тот же ресурс
  }

  create() {
    // Загружаем сохраненный прогресс
    this.loadProgress();
    
    // Инициализируем героев если их нет
    if (this.heroes.length === 0) {
      // Создаем базовых героев при первом запуске
      this.initializeHeroes();
    }
    
    // Создание игрока (основной стрелок в окне)
    this.player = this.physics.add.image(400, 500, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setImmovable(true);
    
    // Настройка клавиш управления
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // Создание группы монстров
    this.monsters = this.physics.add.group();
    
    // Создание группы пуль
    this.bullets = this.physics.add.group();

    // Добавление столкновений
    this.physics.add.overlap(this.bullets, this.monsters, this.hitMonster, undefined, this);
    this.physics.add.overlap(this.player, this.monsters, this.hitTavern, undefined, this);

    // Создание первых монстров
    this.spawnMonsters(5);
    
    // Добавление текста с информацией
    this.add.text(16, 16, 'HP: ' + this.tavernHP, { fontSize: '24px', fill: '#ffffff' });
    this.add.text(16, 48, 'Wave: ' + this.waveNumber, { fontSize: '24px', fill: '#ffffff' });
    this.add.text(16, 80, 'Score: ' + this.score, { fontSize: '24px', fill: '#ffffff' });
    this.add.text(16, 112, 'Monsters: ' + this.monsters.getLength(), { fontSize: '24px', fill: '#ffffff' });
    
    // Отображение информации о героях
    this.displayHeroInfo();
  }

  spawnMonsters(count: number) {
    for (let i = 0; i < count; i++) {
      // Случайный выбор типа монстра в зависимости от номера волны
      let monsterTypeIndex = 0;
      
      // С увеличением волн появляются более сложные типы монстров
      if (this.waveNumber >= 3) {
        // 50% шанс на нормального, 30% на быстрого, 20% на танка
        const rand = Math.random();
        if (rand < 0.5) {
          monsterTypeIndex = 0; // normal
        } else if (rand < 0.8) {
          monsterTypeIndex = 1; // fast
        } else {
          monsterTypeIndex = 2; // tank
        }
      } else if (this.waveNumber >= 2) {
        // 70% шанс на нормального, 30% на быстрого
        monsterTypeIndex = Math.random() < 0.7 ? 0 : 1;
      }
      
      const monsterData = this.monsterTypes[monsterTypeIndex];
      const x = Phaser.Math.Between(50, 750);
      const y = Phaser.Math.Between(50, 200); // Монстры появляются сверху
      
      const monster = this.physics.add.image(x, y, 'monster');
      monster.setBounce(0.2);
      monster.setCollideWorldBounds(true);
      
      // Устанавливаем здоровье и скорость монстра в зависимости от его типа
      (monster as any).health = monsterData.health;
      (monster as any).maxHealth = monsterData.health;
      (monster as any).type = monsterData.type;
      
      // Устанавливаем цвет монстра в зависимости от типа
      monster.setTint(monsterData.color);
      
      // Добавляем физику движения к таверне (к игроку)
      this.physics.add.existing(monster);
      monster.setInteractive();
      
      this.monsters.add(monster);
      
      // Направляем монстра к игроку с учетом его скорости
      const direction = new Phaser.Math.Vector2(
        this.player.x - monster.x,
        this.player.y - monster.y
      ).normalize();
      
      monster.setVelocity(direction.x * monsterData.speed, direction.y * monsterData.speed);
    }
  }

  // Метод для инициализации героев
  initializeHeroes() {
    // Создаем базовых героев
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

  // Метод для отображения информации о героях
  displayHeroInfo() {
    // Показываем информацию о героях в правом верхнем углу
    let yPos = 16;
    for (let i = 0; i < this.heroes.length; i++) {
      const hero = this.heroes[i];
      const heroText = this.add.text(600, yPos, `${hero.name} (Lvl ${hero.level})`, { 
        fontSize: '16px', 
        fill: '#ffffff' 
      });
      yPos += 24;
    }
  }

  hitMonster(bullet: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, monster: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) {
    // Уменьшаем здоровье монстра вместо немедленного уничтожения
    (monster as any).health -= 1;
    
    // Уничтожаем пулю
    bullet.destroy();
    
    // Если здоровье монстра стало 0 или меньше, уничтожаем его
    if ((monster as any).health <= 0) {
      monster.destroy();
      
      // Увеличиваем счет
      this.score += 10;
      
      // Увеличиваем счетчик убитых монстров
      this.currentWaveMonstersKilled++;
      this.totalMonstersKilled++;
      
      // Проверяем, все ли монстры уничтожены
      if (this.monsters.getLength() - 1 === 0) { // -1 потому что один монстр уже удален
        this.nextWave();
      }
    }
  }

  hitTavern(player: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, monster: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) {
    // Уменьшаем HP таверны при контакте с монстром
    monster.destroy();
    this.tavernHP -= 10;
    
    // Обновляем отображение HP
    const hpText = this.children.list.find(obj => obj['text'] && obj['text'].startsWith('HP:')) as Phaser.GameObjects.Text;
    if (hpText) {
      hpText.setText('HP: ' + this.tavernHP);
    }
    
    // Проверяем, закончилась ли игра
    if (this.tavernHP <= 0) {
      this.endGame();
    } else {
      // Спауним нового монстра взамен уничтоженного
      setTimeout(() => {
        this.spawnMonsters(1);
      }, 1000);
    }
  }

  nextWave() {
    this.waveNumber++;
    
    // Обновляем текст волны
    const waveText = this.children.list.find(obj => obj['text'] && obj['text'].startsWith('Wave:')) as Phaser.GameObjects.Text;
    if (waveText) {
      waveText.setText('Wave: ' + this.waveNumber);
    }
    
    // Обновляем текст счета
    const scoreText = this.children.list.find(obj => obj['text'] && obj['text'].startsWith('Score:')) as Phaser.GameObjects.Text;
    if (scoreText) {
      scoreText.setText('Score: ' + this.score);
    }
    
    // Если все монстры убиты, показываем экран выбора улучшений
    if (this.monsters.getLength() === 0) {
      this.showUpgradeSelection();
    } else {
      // Спауним больше монстров в следующей волне
      this.spawnMonsters(this.waveNumber * 2);
    }
  }

  // Метод для отображения экрана выбора улучшений
  showUpgradeSelection() {
    // Очищаем всех монстров
    this.monsters.clear(true, true);
    
    // Показываем экран выбора улучшений
    const titleText = this.add.text(400, 100, 'Выберите улучшение:', { 
      fontSize: '36px', 
      fill: '#FFFFFF' 
    }).setOrigin(0.5);
    
    // Генерируем 3 случайных улучшения
    this.generateRandomUpgrades();
    
    // Показываем варианты улучшений
    const upgrade1 = this.add.text(400, 200, this.availableUpgrades[0], { 
      fontSize: '24px', 
      fill: '#FFD700' 
    }).setOrigin(0.5).setInteractive();
    
    const upgrade2 = this.add.text(400, 260, this.availableUpgrades[1], { 
      fontSize: '24px', 
      fill: '#FFD700' 
    }).setOrigin(0.5).setInteractive();
    
    const upgrade3 = this.add.text(400, 320, this.availableUpgrades[2], { 
      fontSize: '24px', 
      fill: '#FFD700' 
    }).setOrigin(0.5).setInteractive();
    
    // Добавляем обработчики кликов
    upgrade1.on('pointerdown', () => {
      this.applyUpgrade(0);
      this.startNextWave();
    });
    
    upgrade2.on('pointerdown', () => {
      this.applyUpgrade(1);
      this.startNextWave();
    });
    
    upgrade3.on('pointerdown', () => {
      this.applyUpgrade(2);
      this.startNextWave();
    });
    
    // Сохраняем прогресс
    this.saveProgress();
  }

  // Метод для генерации случайных улучшений
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
    
    // Выбираем 3 случайных улучшения
    this.availableUpgrades = [];
    const tempOptions = [...upgradeOptions];
    
    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * tempOptions.length);
      this.availableUpgrades.push(tempOptions[randomIndex]);
      tempOptions.splice(randomIndex, 1);
    }
  }

  // Метод для применения выбранного улучшения
  applyUpgrade(index: number) {
    const upgrade = this.availableUpgrades[index];
    
    switch(upgrade) {
      case 'Урон героя +1':
        // Повышаем уровень случайного героя
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
        this.shootDelay = Math.max(50, this.shootDelay * 0.9); // Увеличиваем скорость на 10%
        break;
        
      case 'Дополнительный снаряд':
        // Временно увеличиваем количество пуль за выстрел
        // Это можно реализовать как временное улучшение
        break;
        
      case 'Броня таверны +10':
        this.tavernHP += 10;
        break;
        
      case 'Больше очков за убийства (+5)':
        // В реальной игре это бы изменяло систему начисления очков
        break;
        
      case 'Новый герой: воин':
        // Проверяем, есть ли уже такой герой
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
  }

  // Метод для начала следующей волны
  startNextWave() {
    // Удаляем тексты улучшений
    this.children.removeAll();
    
    // Обновляем интерфейс
    this.add.text(16, 16, 'HP: ' + this.tavernHP, { fontSize: '24px', fill: '#ffffff' });
    this.add.text(16, 48, 'Wave: ' + this.waveNumber, { fontSize: '24px', fill: '#ffffff' });
    this.add.text(16, 80, 'Score: ' + this.score, { fontSize: '24px', fill: '#ffffff' });
    
    // Отображаем информацию о героях
    this.displayHeroInfo();
    
    // Спауним монстров для новой волны
    this.spawnMonsters(this.waveNumber * 2);
    
    // Сбрасываем счетчик убитых монстров в текущей волне
    this.currentWaveMonstersKilled = 0;
  }

  showSunriseScreen() {
    // Очищаем всех монстров
    this.monsters.clear(true, true);
    
    // Показываем экран рассвета
    const sunriseText = this.add.text(400, 250, 'РАССВЕТ!', { 
      fontSize: '64px', 
      fill: '#FFD700' 
    }).setOrigin(0.5);
    
    const scoreText = this.add.text(400, 320, `+1 Осколок Света`, { 
      fontSize: '32px', 
      fill: '#FFFFFF' 
    }).setOrigin(0.5);
    
    const nextWaveText = this.add.text(400, 370, 'Нажмите ПРОБЕЛ для продолжения', { 
      fontSize: '24px', 
      fill: '#CCCCCC' 
    }).setOrigin(0.5);
    
    // Сохраняем прогресс
    this.saveProgress();
    
    // Добавляем возможность перейти к следующей волне
    this.input.keyboard.once('keydown-SPACE', () => {
      // Убираем текст рассвета
      sunriseText.destroy();
      scoreText.destroy();
      nextWaveText.destroy();
      
      // Спауним больше монстров в следующей волне
      this.spawnMonsters(this.waveNumber * 2);
    });
  }

  saveProgress() {
    // Сохраняем прогресс в localStorage
    const gameData = {
      score: this.score,
      waveNumber: this.waveNumber,
      tavernHP: this.tavernHP,
      heroes: this.heroes,
      totalMonstersKilled: this.totalMonstersKilled
    };
    
    localStorage.setItem('lastHearthSave', JSON.stringify(gameData));
  }

  loadProgress() {
    // Загружаем сохраненные данные
    const savedData = localStorage.getItem('lastHearthSave');
    
    if (savedData) {
      const gameData = JSON.parse(savedData);
      this.score = gameData.score;
      this.waveNumber = gameData.waveNumber;
      this.tavernHP = gameData.tavernHP;
      this.totalMonstersKilled = gameData.totalMonstersKilled || 0;
      
      // Загружаем героев, если они есть в сохранении
      if (gameData.heroes) {
        this.heroes = gameData.heroes;
      } else {
        // Инициализируем героев если их нет в сохранении
        this.initializeHeroes();
      }
    } else {
      // Инициализируем героев если это первый запуск
      this.initializeHeroes();
    }
  }

  endGame() {
    this.gameOver = true;
    
    // Отображаем экран "рассвета" и сообщение о завершении волны
    const gameOverText = this.add.text(400, 300, 'GAME OVER', { 
      fontSize: '64px', 
      fill: '#ff0000' 
    }).setOrigin(0.5);
    
    const restartText = this.add.text(400, 370, 'Press SPACE to restart', { 
      fontSize: '24px', 
      fill: '#ffffff' 
    }).setOrigin(0.5);
    
    // Добавляем возможность перезапуска
    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.restart();
    });
  }

  update(time: number, delta: number) {
    if (this.gameOver) return;
    
    // Обновление позиции игрока только по оси X (он сидит в "окне")
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-200);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(200);
    } else {
      this.player.setVelocityX(0);
    }

    // Стрельба по пробелу или клику мыши
    const currentTime = time;
    if ((this.input.activePointer.isDown || this.cursors.space.isDown) && currentTime - this.lastShotTime > this.shootDelay) {
      // Создаем пулю
      const bullet = this.physics.add.image(this.player.x, this.player.y, 'bullet');
      this.bullets.add(bullet);
      
      // Направляем пулю вверх
      bullet.setVelocityY(-300);
      bullet.allowGravity = false;
      
      this.lastShotTime = currentTime;
    }
    
    // Ограничения движения игрока (он должен быть в нижней части экрана)
    if (this.player.y < 450) {
      this.player.setY(450);
    }
    
    // Обновляем монстров
    this.monsters.children.entries.forEach((monster: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) => {
      if (!monster.active) return;
      
      // Направляем монстра к игроку с учетом его типа и скорости
      const monsterData = this.monsterTypes.find(m => m.type === (monster as any).type);
      if (monsterData) {
        const direction = new Phaser.Math.Vector2(
          this.player.x - monster.x,
          this.player.y - monster.y
        ).normalize();
        
        monster.setVelocity(direction.x * monsterData.speed, direction.y * monsterData.speed);
      }
    });
    
    // Удаляем пули, которые вышли за границы
    this.bullets.children.entries.forEach((bullet: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) => {
      if (bullet.y < 0) {
        bullet.destroy();
      }
    });
    
    // Проверяем, нужно ли усиливать монстров каждые 5 волн
    if (this.waveNumber % 5 === 0 && this.waveNumber > 1) {
      // Усиление монстров каждые 5 волн
      // Это будет реализовано через улучшенную систему спауна
    }
  }
}

// Конфигурация Phaser-игры для MVP
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'app',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: GameScene
};

// Создание экземпляра игры
const game = new Phaser.Game(config);