const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 900;
canvas.height = 600;

const cellSize = 100;
const cellGap = 3;

// --- PROMĚNNÉ ---
let score = 0;
let money = 300; 
let lives = 5;
let frame = 0;
let enemies = [];
let projectiles = [];
let defenders = [];
let chosenDefender = 1;
let isPaused = false; 
let isDeleteMode = false;

let currentWave = 1;
let enemiesToSpawn = 5;      
let enemiesSpawned = 0;      
let inWaveCooldown = false;  
let waveCooldownTimer = 0;
const waveDelay = 300; 

// --- AUDIO ---
// Útoky nepřátel (když ti ubírají životy)
const soundFist = new Audio('assets/fistHit.mp3');   // Tank
const soundKnife = new Audio('assets/knifeHit.mp3'); // Runner
const soundSword = new Audio('assets/swordHit.mp3'); // Basic

// Střelba tvých postav
const soundSoldierShot = new Audio('assets/gunHit.mp3');   // Voják
const soundTurretShot = new Audio('assets/turretHit.mp3'); // Věž

// Ostatní efekty
const soundHit = new Audio('assets/hitSound.mp3');   // Když trefíš enemy projektilem
const soundDeath = new Audio('assets/death.mp3');   // Když enemy umře

// Hlasitosti
soundFist.volume = 0.4;
soundKnife.volume = 0.2;
soundSword.volume = 0.1;
soundSoldierShot.volume = 0.25;
soundTurretShot.volume = 0.1;
soundHit.volume = 0.2;
soundDeath.volume = 0.2;

function playSnd(audio) {
    audio.currentTime = 0; 
    audio.play().catch(e => console.log("Audio soubor chybí v assets."));
}

// --- GRAFIKA ---
const imgTurret1 = new Image(); imgTurret1.src = 'assets/turret1.png';
const imgTurret2 = new Image(); imgTurret2.src = 'assets/turret2.png';
const imgVojak1 = new Image(); imgVojak1.src = 'assets/vojak1.png';
const imgVojak2 = new Image(); imgVojak2.src = 'assets/vojak2.png';
const imgWall1 = new Image(); imgWall1.src = 'assets/wall1.png';

const imgEnemyBasic1 = new Image(); imgEnemyBasic1.src = 'assets/enemyBasic1.png';
const imgEnemyBasic2 = new Image(); imgEnemyBasic2.src = 'assets/enemyBasic2.png';
const imgEnemyRunner1 = new Image(); imgEnemyRunner1.src = 'assets/enemyRunner1.png';
const imgEnemyRunner2 = new Image(); imgEnemyRunner2.src = 'assets/enemyRunner2.png';
const imgEnemyTank1 = new Image(); imgEnemyTank1.src = 'assets/enemyTank1.png';
const imgEnemyTank2 = new Image(); imgEnemyTank2.src = 'assets/enemyTank2.png';

// --- OVLÁDÁNÍ A UI ---
document.getElementById('pause-btn').addEventListener('click', togglePause);
function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById('pause-btn');
    const overlay = document.getElementById('pause-overlay');
    btn.innerHTML = isPaused ? '▶️' : '⏸️';
    isPaused ? overlay.classList.remove('hidden') : overlay.classList.add('hidden');
}

const deleteBtn = document.getElementById('delete-btn');
if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
        isDeleteMode = !isDeleteMode;
        if (isDeleteMode) {
            deleteBtn.classList.add('active');
            canvas.style.cursor = 'crosshair';
        } else {
            deleteBtn.classList.remove('active');
            canvas.style.cursor = 'default';
        }
    });
}

document.getElementById('restart-btn').addEventListener('click', () => { resetGame(); togglePause(); });

function getCost(type) {
    let count = defenders.filter(d => d.type === type).length;
    if (type === 1) return 50 + (count * 10);  
    if (type === 2) return 100 + (count * 20); 
    if (type === 3) return 20 + (count * 5);   
    return 50;
}

function updateUICosts() {
    document.getElementById('unit1').innerHTML = `Voják<br>${getCost(1)} 💎`;
    document.getElementById('unit2').innerHTML = `Věž<br>${getCost(2)} 💎`;
    document.getElementById('unit3').innerHTML = `Zeď<br>${getCost(3)} 💎`;
}

document.getElementById('unit1').addEventListener('click', () => changeSelection(1));
document.getElementById('unit2').addEventListener('click', () => changeSelection(2));
document.getElementById('unit3').addEventListener('click', () => changeSelection(3));

function changeSelection(type) {
    chosenDefender = type;
    document.querySelectorAll('.card').forEach(card => card.classList.remove('selected'));
    document.getElementById('unit' + type).classList.add('selected');
    
    if (isDeleteMode) {
        isDeleteMode = false;
        if(deleteBtn) deleteBtn.classList.remove('active');
        canvas.style.cursor = 'default';
    }
}

const mouse = { x: undefined, y: undefined };
let canvasPosition = canvas.getBoundingClientRect();

canvas.addEventListener('mousemove', e => {
    mouse.x = e.x - canvasPosition.left;
    mouse.y = e.y - canvasPosition.top;
    if (!isDeleteMode) canvas.style.cursor = 'pointer';
});

canvas.addEventListener('mouseleave', () => {
    mouse.x = undefined;
    mouse.y = undefined;
    if (!isDeleteMode) canvas.style.cursor = 'default';
});

canvas.addEventListener('click', () => {
    if (isPaused) return; 
    const gridX = mouse.x - (mouse.x % cellSize);
    const gridY = mouse.y - (mouse.y % cellSize);
    
    if (isDeleteMode) {
        for (let i = 0; i < defenders.length; i++) {
            if (defenders[i].x === gridX && defenders[i].y === gridY) {
                defenders.splice(i, 1);
                updateUICosts(); 
                isDeleteMode = false;
                if(deleteBtn) deleteBtn.classList.remove('active');
                canvas.style.cursor = 'default';
                return;
            }
        }
        return; 
    }

    for (let d of defenders) if (d.x === gridX && d.y === gridY) return;
    
    let cost = getCost(chosenDefender);
    if (money >= cost) {
        defenders.push(new Defender(gridX, gridY, chosenDefender));
        money -= cost;
        updateUICosts(); 
    }
});

// --- TŘÍDY ---
class Defender {
    constructor(x, y, type) {
        this.x = x; this.y = y;
        this.type = type;
        this.timer = 0;
        this.isReloading = false;
        this.activeProjectile = null;
        this.shootEffectTimer = 0;
        this.color = '#555';

        let scale = 1.0; 
        if (this.type === 1) { this.health = 100; this.img1 = imgVojak1; this.img2 = imgVojak2; scale = 1.0; }
        else if (this.type === 2) { this.health = 150; this.img1 = imgTurret1; this.img2 = imgTurret2; scale = 1.2; }
        else if (this.type === 3) { this.health = 500; this.img1 = imgWall1; this.img2 = null; scale = 1.0; }

        this.width = cellSize * scale;
        this.height = cellSize * scale;
        this.currentImage = this.img1;
    }

    draw() {
        if (this.currentImage && this.currentImage.complete && this.currentImage.width > 0) {
            let offset = (cellSize - this.width) / 2;
            ctx.drawImage(this.currentImage, this.x + offset, this.y + offset, this.width, this.height);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x + cellGap, this.y + cellGap, cellSize - cellGap * 2, cellSize - cellGap * 2);
        }
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(Math.floor(this.health), this.x + cellSize / 2, this.y + 85);
        ctx.textAlign = 'left'; 
    }

    update() {
        if (this.img2 && this.currentImage === this.img2) {
            this.shootEffectTimer++;
            if (this.shootEffectTimer >= 10) { this.currentImage = this.img1; this.shootEffectTimer = 0; }
        }
        
        if (this.type === 3) return; 
        
        if (this.activeProjectile && !projectiles.includes(this.activeProjectile)) {
            this.activeProjectile = null; this.isReloading = true; this.timer = 0;
        }
        if (this.isReloading) {
            this.timer++;
            if (this.timer >= 90) this.isReloading = false;
        }
        
        if (!this.isReloading && !this.activeProjectile) {
            let enemyInRow = enemies.some(enemy => enemy.y === this.y);
            if (enemyInRow) {
                let projColor = this.type === 1 ? '#ffff00' : '#ff9900';
                let p = new Projectile(this.x + 80, this.y + 50, this.type === 1 ? 10 : 20, projColor, this.y);
                
                projectiles.push(p);
                this.activeProjectile = p;
                
                // Zvuk střelby podle typu postavy
                if (this.type === 1) playSnd(soundSoldierShot);
                else if (this.type === 2) playSnd(soundTurretShot);

                if (this.img2) { this.currentImage = this.img2; this.shootEffectTimer = 0; }
            }
        }
    }
}

class Enemy {
    constructor(verticalPosition){
        this.x = canvas.width;
        this.y = verticalPosition;
        this.visualYOffset = Math.random() * 30 - 15; 

        this.timer = 0;
        this.isAttacking = false;
        this.attackTimer = 0;

        let rand = Math.random();
        let chanceTank = Math.min(0.05 + (currentWave * 0.02), 0.25); 
        let chanceRunner = Math.min(0.15 + (currentWave * 0.02), 0.35); 

        if (rand < chanceTank) {
            this.enemyType = "tank"; 
            this.speed = Math.random() * 0.15 + 0.1; 
            this.health = 250 + (currentWave * 15); 
            this.color = '#cc0066'; this.rewardMoney = 50; 
            this.imgIdle = imgEnemyTank1; this.imgAttack = imgEnemyTank2;
            this.scale = 2.0; this.attackDamage = 20; this.attackCooldown = 150; 
        } else if (rand < chanceTank + chanceRunner) {
            this.enemyType = "runner"; 
            this.speed = Math.random() * 0.4 + 0.6;
            this.health = 40 + (currentWave * 5);
            this.color = '#ffff00'; this.rewardMoney = 15; 
            this.imgIdle = imgEnemyRunner1; this.imgAttack = imgEnemyRunner2;
            this.scale = 1.0; this.attackDamage = 2; this.attackCooldown = 30; 
        } else {
            this.enemyType = "basic"; 
            this.speed = Math.random() * 0.25 + 0.2; 
            this.health = 100 + (currentWave * 10);
            this.color = '#ff3333'; this.rewardMoney = 20; 
            this.imgIdle = imgEnemyBasic1; this.imgAttack = imgEnemyBasic2;
            this.scale = 1.0; this.attackDamage = 5; this.attackCooldown = 60; 
        }

        this.width = cellSize * this.scale;
        this.height = cellSize * this.scale;
        this.baseMovement = this.speed;
        this.movement = this.speed;
        this.currentImage = this.imgIdle;
    }

    update(){
        this.x -= this.movement;

        if (this.isAttacking && this.imgAttack) {
            if (this.attackTimer > this.attackCooldown - 15) {
                this.currentImage = this.imgAttack;
            } else {
                this.currentImage = this.imgIdle;
            }
        } else {
            this.currentImage = this.imgIdle;
        }
    }

    draw(){
        let offsetX = 0;
        let offsetY = this.visualYOffset;

        if (this.scale > 1.0) { 
            offsetX = -50; 
            offsetY += (cellSize - this.height); 
        }

        ctx.shadowBlur = 10;
        ctx.shadowColor = "black";

        if (this.currentImage && this.currentImage.complete && this.currentImage.width > 0) {
            ctx.drawImage(this.currentImage, this.x + offsetX, this.y + offsetY, this.width, this.height);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x + offsetX, this.y + offsetY, this.width, this.height);
        }
        
        ctx.shadowBlur = 0;

        let hpText = Math.floor(this.health);
        ctx.font = 'bold 18px Arial';
        let textWidth = ctx.measureText(hpText).width;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(this.x + 50 - (textWidth/2) - 4, this.y + 68 + this.visualYOffset, textWidth + 8, 22);

        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(hpText, this.x + 50, this.y + 85 + this.visualYOffset);
        ctx.textAlign = 'left'; 
    }
}

class Projectile {
    constructor(x, y, power, color, rowY){
        this.x = x; this.y = y; this.width = 10; this.height = 10;
        this.speed = 4; this.power = power; this.color = color;
        this.rowY = rowY; 
    }
    update(){ this.x += this.speed; }
    draw(){ 
        ctx.fillStyle = this.color; 
        ctx.beginPath(); 
        ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2); 
        ctx.fill(); 
    }
}

// --- LOGIKA HRY ---
function handleEnemies(){
    for (let i = 0; i < enemies.length; i++){
        let isBlocked = false;
        if (enemies[i].attackTimer > 0) enemies[i].attackTimer--;

        for (let j = 0; j < defenders.length; j++) {
            if (enemies[i].y === defenders[j].y && collision(enemies[i], defenders[j])) {
                isBlocked = true;
                
                if (enemies[i].attackTimer <= 0) {
                    defenders[j].health -= enemies[i].attackDamage;
                    enemies[i].attackTimer = enemies[i].attackCooldown;
                    
                    // Zvuky útoku nepřátel
                    if (enemies[i].enemyType === "tank") playSnd(soundFist);
                    else if (enemies[i].enemyType === "runner") playSnd(soundKnife);
                    else playSnd(soundSword);
                }
                
                if (defenders[j].health <= 0) { defenders.splice(j, 1); j--; updateUICosts(); }
            }
        }
        
        enemies[i].isAttacking = isBlocked; 
        enemies[i].movement = isBlocked ? 0 : enemies[i].baseMovement;
        enemies[i].update(); enemies[i].draw();

        if (enemies[i].x < 0){
            lives--; enemies.splice(i, 1); i--;
            if (lives <= 0) { lives = 0; alert("GAME OVER! Vlna: " + currentWave); resetGame(); return; }
        }
    }
    
    // Logika vln
    if (inWaveCooldown) {
        waveCooldownTimer--;
        ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 30px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('VLNA ' + (currentWave + 1) + " ZA: " + Math.ceil(waveCooldownTimer/60), canvas.width/2, canvas.height/2);
        ctx.textAlign = 'left';
        if (waveCooldownTimer <= 0) {
            inWaveCooldown = false; currentWave++;
            enemiesToSpawn += 1 + Math.floor(currentWave * 0.3); 
            enemiesSpawned = 0; document.getElementById('wave').innerText = currentWave;
        }
    } else {
        if (enemiesSpawned < enemiesToSpawn) {
            let spawnRate = Math.max(120, 240 - (currentWave * 12)); 
            if (frame % Math.floor(spawnRate) === 0){
                let vPos;
                if (currentWave <= 3) vPos = (Math.floor(Math.random() * 2) + 2) * cellSize;
                else if (currentWave <= 7) vPos = (Math.floor(Math.random() * 4) + 1) * cellSize;
                else vPos = Math.floor(Math.random() * 6) * cellSize;
                enemies.push(new Enemy(vPos));
                enemiesSpawned++;
            }
        } else if (enemies.length === 0) { inWaveCooldown = true; waveCooldownTimer = waveDelay; }
    }
}

function handleProjectiles(){
    for (let i = 0; i < projectiles.length; i++){
        projectiles[i].update(); projectiles[i].draw();
        for (let j = 0; j < enemies.length; j++){
            if (enemies[j] && projectiles[i] && enemies[j].y === projectiles[i].rowY && collision(projectiles[i], enemies[j])){
                enemies[j].health -= projectiles[i].power;
                playSnd(soundHit); // Zvuk zásahu
                projectiles.splice(i, 1); i--;
                
                if (enemies[j] && enemies[j].health <= 0) { 
                    score += 10;
                    money += enemies[j].rewardMoney;
                    playSnd(soundDeath); // Zvuk smrti
                    enemies.splice(j, 1); j--; 
                }
                break;
            }
        }
        if (projectiles[i] && projectiles[i].x > canvas.width){ projectiles.splice(i, 1); i--; }
    }
}

function handleDefenders(){ for (let d of defenders) { d.draw(); d.update(); } }

function handleGameGrid(){
    for (let y = 0; y < canvas.height; y += cellSize){
        for (let x = 0; x < canvas.width; x += cellSize){
            ctx.strokeStyle = 'rgba(0, 255, 204, 0.1)';
            ctx.strokeRect(x, y, cellSize, cellSize);
        }
    }

    if (mouse.x !== undefined && mouse.y !== undefined) {
        const gridX = mouse.x - (mouse.x % cellSize);
        const gridY = mouse.y - (mouse.y % cellSize);
        if (gridX >= 0 && gridX < canvas.width && gridY >= 0 && gridY < canvas.height) {
            ctx.fillStyle = isDeleteMode ? 'rgba(255, 51, 51, 0.2)' : 'rgba(0, 255, 204, 0.15)';
            ctx.fillRect(gridX, gridY, cellSize, cellSize);
        }
    }
}

function collision(a, b){ return !(a.x > b.x+b.width || a.x+a.width < b.x || a.y > b.y+b.height || a.y+a.height < b.y); }

function resetGame(){
    enemies = []; defenders = []; projectiles = []; score = 0; money = 300; lives = 5; frame = 0;
    currentWave = 1; enemiesToSpawn = 5; enemiesSpawned = 0; inWaveCooldown = false; waveCooldownTimer = 0;
    isDeleteMode = false;
    if(deleteBtn) deleteBtn.classList.remove('active');
    canvas.style.cursor = 'default';
    document.getElementById('wave').innerText = currentWave;
    document.getElementById('lives').innerText = lives;
    updateUICosts(); 
}

function animate(){
    if (!isPaused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        handleGameGrid(); 
        document.getElementById('score').innerText = score;
        document.getElementById('money').innerText = money;
        document.getElementById('lives').innerText = lives;
        handleDefenders(); handleProjectiles(); handleEnemies();
        frame++;
    }
    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => { canvasPosition = canvas.getBoundingClientRect(); });
updateUICosts();
animate();