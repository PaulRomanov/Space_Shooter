const PLAYER_SCALE = 0.05;
const ENEMY_SCALE = 0.15;
const BULLET_SCALE = 0.4;

const COLLISION_TOLERANCE_PLAYER = 30;
const COLLISION_TOLERANCE_BULLET = 5;

let score = 0;

let bullets = [];
let enemies = [];
let enemySpawnTimer = 0;
const SPAWN_INTERVAL = 60;

let app;
let background; 
let player;     
let scoreText;  

const getTexture = (key) => PIXI.Assets.get(key);

class Player extends PIXI.Sprite {
    constructor() {
        super(getTexture('ship'));
        this.anchor.set(0.5);
        this.scale.set(PLAYER_SCALE);
        this.x = app.screen.width / 2;
        this.y = app.screen.height - 50;
        this.speed = 5;
        this.movingLeft = false;
        this.movingRight = false;
        this.update = function () {
            const playerWidth = this.texture.width * this.scale.x / 2;
            if (this.movingLeft) {
                this.x -= this.speed;
            }
            if (this.movingRight) {
                this.x += this.speed;
            }
            if (this.x < playerWidth) this.x = playerWidth;
            if (this.x > app.screen.width - playerWidth) this.x = app.screen.width - playerWidth;
        }
    }
}

class Bullet extends PIXI.Sprite {
    constructor(startX, startY) {
        super(getTexture('bullet'));
        this.anchor.set(0.5);
        this.scale.set(BULLET_SCALE);
        this.x = startX;
        this.y = startY;
        this.speed = 8;
        this.isDead = false;
    }
    update() {
        this.y -= this.speed;
        if (this.y < -20) {
            this.isDead = true;
        }
    }
}

class Enemy extends PIXI.Sprite {
    constructor(x) {
        super(getTexture('enemy'));
        this.anchor.set(0.5);
        this.scale.set(ENEMY_SCALE);
        this.x = x;
        this.y = -50;
        this.speed = Math.random() * 2 + 1;
        this.isDead = false;
    }
    update() {
        this.y += this.speed;
        if (this.y > app.screen.height + 50) {
            this.isDead = true;
        }
    }
}

function hitTestRectangle(r1, r2, tolerance) {
    const radius1 = r1.width / 2;
    const radius2 = r2.width / 2;
    const combinedRadius = radius1 + radius2;
    const dx = r1.x - r2.x;
    const dy = r1.y - r2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const safeDistance = combinedRadius - tolerance; 

    return distance < safeDistance;
}

function restartGame() {
    app.stage.removeChildren();
    score = 0;
    bullets = [];
    enemies = [];
    enemySpawnTimer = 0;
    setupGameAssets(); 
    app.ticker.start();
}

async function setupGameAssets() {
    const starTexture = getTexture('stars');
    background = new PIXI.TilingSprite(
        starTexture,
        app.screen.width,
        app.screen.height,
    );
    app.stage.addChild(background); 

    player = new Player();
    app.stage.addChild(player);

    scoreText = new PIXI.Text(`Счет: ${score}`, {
        fill: 0xffffff,
        fontSize: 20,
        fontFamily: 'Arial',
    });
    scoreText.x = 10;
    scoreText.y = 10;
    app.stage.addChild(scoreText);
}

function shoot() {
    if (app.ticker.started) {
        const bullet = new Bullet(player.x, player.y - player.height / 2);
        app.stage.addChild(bullet);
        bullets.push(bullet);
    }
}

function handleKeyDown(event) {
    if (app.ticker.started) {
        if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
            player.movingLeft = true;
        } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
            player.movingRight = true;
        } else if (event.code === 'Space') {
            shoot();
        }
    } 
    else if (event.code === 'Space') {
        restartGame();
    }
}

function handleKeyUp(event) {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        player.movingLeft = false;
    } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        player.movingRight = false;
    }
}

function handleTouchStart(event) {
    if (!app.ticker.started) {
        restartGame();
        return;
    }

    const touchX = event.changedTouches[0].clientX;
    const halfWidth = window.innerWidth / 2;

    if (touchX < halfWidth) {
        player.movingLeft = true;
        player.movingRight = false;
    } else {
        player.movingRight = true;
        player.movingLeft = false;
    }
    
    shoot(); 

    event.preventDefault(); 
}

function handleTouchEnd() {
    player.movingLeft = false;
    player.movingRight = false;
}

function resize() {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    app.renderer.resize(newWidth, newHeight);
    
    if (background) {
        background.width = newWidth;
        background.height = newHeight;
    }

    if (player) {
         player.x = newWidth / 2;
         player.y = newHeight - 50;
    }
}

async function initGame() {
    PIXI.Assets.add('ship', 'assets/ship.png');
    PIXI.Assets.add('bullet', 'assets/bullet.svg');
    PIXI.Assets.add('enemy', 'assets/enemy.png');
    PIXI.Assets.add('stars', 'assets/stars.png'); 

    await PIXI.Assets.load(['ship', 'bullet', 'enemy', 'stars']);

    if (!app) {
        app = new PIXI.Application({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x000000,
            resolution: window.devicePixelRatio || 1, 
            autoDensity: true,
        });
        document.body.appendChild(app.view);
    }
    
    window.addEventListener('resize', resize);
    resize(); 

    setupGameAssets();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);


    app.ticker.add(() => {
        
        background.tilePosition.y += 0.5;

        player.update();

        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            bullet.update();

            if (bullet.isDead) {
                app.stage.removeChild(bullet);
                bullets.splice(i, 1);
            }
        }

        enemySpawnTimer += 1;
        if (enemySpawnTimer >= SPAWN_INTERVAL) {
            const spawnX = Math.random() * (app.screen.width - 80) + 40;
            const enemy = new Enemy(spawnX);
            app.stage.addChild(enemy);
            enemies.push(enemy);
            enemySpawnTimer = 0;
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            enemy.update();
            if (enemy.isDead) {
                app.stage.removeChild(enemy);
                enemies.splice(i, 1);
            }
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];

            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];

                if (hitTestRectangle(bullet, enemy, COLLISION_TOLERANCE_BULLET)) {
                    
                    app.stage.removeChild(enemy);
                    enemies.splice(j, 1);

                    app.stage.removeChild(bullet);
                    bullets.splice(i, 1);

                    score += 10;
                    scoreText.text = `Счет: ${score}`;

                    break;
                }
            }
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];

            if (hitTestRectangle(player, enemy, COLLISION_TOLERANCE_PLAYER)) {
                app.ticker.stop();

                const gameOverText = new PIXI.Text('ИГРА ОКОНЧЕНА!', {
                    fill: 0xFF0000,
                    fontSize: 48,
                    fontFamily: 'Arial',
                    align: 'center',
                });
                gameOverText.x = app.screen.width / 2;
                gameOverText.y = app.screen.height / 2 - 40;
                gameOverText.anchor.set(0.5);
                app.stage.addChild(gameOverText);
                
                const restartButton = new PIXI.Text('Начать заново (Space/Touch)', {
                    fill: 0x00FF00,
                    fontSize: 28,
                    fontFamily: 'Arial',
                    align: 'center',
                });
                restartButton.x = app.screen.width / 2;
                restartButton.y = app.screen.height / 2 + 20;
                restartButton.anchor.set(0.5);
                
                restartButton.eventMode = 'static';
                restartButton.cursor = 'pointer'; 
                
                restartButton.on('pointerdown', restartGame); 

                app.stage.addChild(restartButton);

                return;
            }
        }
    });

}

initGame();