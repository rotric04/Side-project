import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Enemy } from './enemy.js';
// These imports may need to be adjusted depending on your file structure
// Commented out until you confirm these files exist
// import { Controls } from './controls.js';
// import { Player } from './player.js';
// import { Weapon } from './weapon.js';

// Create a global game instance
window.game = null;

class Game {
    constructor() {
        if (window.game) {
            console.warn('Game instance already exists!');
            return window.game;
        }
        window.game = this;

        // Check if Three.js is loaded
        if (typeof THREE === 'undefined') {
            console.error('Three.js is not loaded!');
            this.showError('Three.js failed to load. Please refresh the page.');
            return;
        }

        // Initialize properties
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.player = null;
        this.clock = new THREE.Clock();
        this.gameState = 'menu'; // menu, playing, gameOver
        this.score = 0;
        this.enemies = [];
        this.bullets = [];
        this.powerups = [];
        this.obstacles = [];
        this.arenaSize = 100;
        this.obstacleCount = 20;
        this.enemyCount = 5;
        this.powerupSpawnInterval = 10; // seconds
        this.lastPowerupSpawn = 0;
        this.isLoading = true;
        this.lastTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            space: false
        };
        this.isLocked = false; // Track if pointer lock is active

        // Initialize the game
        this.init();
    }

    init() {
        try {
            // Create scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background

            // Create camera
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.set(0, 1, 0);

            // Create renderer with performance settings
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                powerPreference: "high-performance"
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            document.getElementById('game-container').appendChild(this.renderer.domElement);

            // Setup lighting
            this.setupLighting();

            // Create arena floor and walls
            this.createArena();

            // For now, use OrbitControls as a placeholder
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            
            // Create a temporary player placeholder
            this.createTemporaryPlayer();

            // Create initial enemies
            this.createEnemies();

            // Setup event listeners
            this.setupEventListeners();

            // Start animation loop
            this.animate();

            console.log("Game initialized successfully");
            
            // Finish loading process
            this.finishLoading();
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showError('Failed to initialize game. Please check console for details.');
        }
    }

    // Create a temporary player until Player class is available
    createTemporaryPlayer() {
        // Create a simple box as player
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        const playerMesh = new THREE.Mesh(geometry, material);
        playerMesh.position.y = 1;
        playerMesh.castShadow = true;
        this.scene.add(playerMesh);
        
        // Create a simple player object
        this.player = {
            mesh: playerMesh,
            health: 100,
            maxHealth: 100,
            takeDamage: function(amount) {
                this.health -= amount;
                if (this.health <= 0) {
                    window.game.gameOver();
                }
                // Update health bar
                const healthFill = document.getElementById('health-fill');
                if (healthFill) {
                    healthFill.style.width = (this.health / this.maxHealth * 100) + '%';
                }
            }
        };
    }

    finishLoading() {
        setTimeout(() => {
            this.isLoading = false;
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }
            const gameMenu = document.getElementById('game-menu');
            if (gameMenu) {
                gameMenu.classList.remove('hidden');
            }
        }, 500);
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);
    }

    createArena() {
        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Create walls
        const wallHeight = 5;
        const wallGeometry = new THREE.BoxGeometry(this.arenaSize, wallHeight, 1);
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.7,
            metalness: 0.3
        });

        // North wall
        const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
        northWall.position.set(0, wallHeight/2, -this.arenaSize/2);
        northWall.castShadow = true;
        northWall.receiveShadow = true;
        this.scene.add(northWall);

        // South wall
        const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
        southWall.position.set(0, wallHeight/2, this.arenaSize/2);
        southWall.castShadow = true;
        southWall.receiveShadow = true;
        this.scene.add(southWall);

        // East wall
        const eastWall = new THREE.Mesh(wallGeometry, wallMaterial);
        eastWall.rotation.y = Math.PI / 2;
        eastWall.position.set(this.arenaSize/2, wallHeight/2, 0);
        eastWall.castShadow = true;
        eastWall.receiveShadow = true;
        this.scene.add(eastWall);

        // West wall
        const westWall = new THREE.Mesh(wallGeometry, wallMaterial);
        westWall.rotation.y = Math.PI / 2;
        westWall.position.set(-this.arenaSize/2, wallHeight/2, 0);
        westWall.castShadow = true;
        westWall.receiveShadow = true;
        this.scene.add(westWall);
    }

    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Prevent context menu on right click
        this.renderer.domElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Menu buttons
        const startSoloBtn = document.getElementById('start-solo');
        const start1v1Btn = document.getElementById('start-1v1');

        if (startSoloBtn) {
            startSoloBtn.addEventListener('click', () => this.startGame('solo'));
        }
        if (start1v1Btn) {
            start1v1Btn.addEventListener('click', () => this.startGame('1v1'));
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 5px;
            z-index: 1000;
        `;
        errorDiv.textContent = `Error: ${message}`;
        document.body.appendChild(errorDiv);
    }

    createEnemies() {
        for (let i = 0; i < this.enemyCount; i++) {
            try {
                const enemy = new Enemy();
                if (enemy && enemy.mesh) {
                    enemy.mesh.position.set(
                        Math.random() * 80 - 40,
                        1,
                        Math.random() * 80 - 40
                    );
                    this.scene.add(enemy.mesh);
                    this.enemies.push(enemy);
                }
            } catch (error) {
                console.error('Failed to create enemy:', error);
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        // Update controls
        if (this.controls) {
            this.controls.update();
        }

        // Update enemies
        this.enemies.forEach(enemy => {
            if (enemy && enemy.update) {
                enemy.update(delta, this.player);
            }
        });

        // Calculate FPS
        this.updateFPS();

        // Render
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    updateFPS() {
        this.frameCount++;
        const currentTime = performance.now();

        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            
            const fpsCounter = document.getElementById('fps-counter');
            if (fpsCounter) {
                fpsCounter.textContent = `FPS: ${this.fps}`;
            }
            
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }
    }

    startGame(mode) {
        this.gameState = 'playing';
        console.log("Game started in " + mode + " mode!");
        document.getElementById('game-menu').classList.add('hidden');
        document.getElementById('game-ui').style.display = 'block';
    }

    gameOver() {
        this.gameState = 'gameOver';
        console.log("Game Over!");
        document.getElementById('game-menu').classList.remove('hidden');
        document.getElementById('game-ui').style.display = 'none';
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        new Game();
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
});