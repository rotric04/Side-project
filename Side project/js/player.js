import * as THREE from 'three';
import { Weapon } from './weapon.js';

export class Player {
    constructor(scene, camera, controls) {
        if (!scene || !camera || !controls) {
            throw new Error('Scene, camera, and controls are required for Player');
        }

        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.health = 100;
        this.maxHealth = 100;
        this.speed = 10;
        this.jumpForce = 7;
        this.isOnGround = true;
        this.velocity = new THREE.Vector3();
        this.position = new THREE.Vector3(0, 1, 0);
        this.weapon = new Weapon('pistol');
        this.powerups = {
            speed: 0,
            damage: 0,
            invincibility: 0
        };

        // Cache DOM elements
        this.healthFill = document.getElementById('health-fill');
        this.ammoCounter = document.getElementById('ammo-counter');
        
        if (!this.healthFill || !this.ammoCounter) {
            console.warn('UI elements not found');
        }

        // Create optimized player model
        this.createModel();
        
        // Setup shooting and reload listeners
        this.setupShootingAndReload();

        // Cache frequently used values
        this.groundY = 1;
        this.gravity = 30;
        this.friction = 0.9;
        this.airControlFactor = 0.3;

        this.bounds = {
            minX: -45,
            maxX: 45,
            minZ: -45,
            maxZ: 45
        };

        // Initialize audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.loadSounds();

        // Set initial camera position relative to player mesh
        this.updateCameraPosition();
    }

    loadSounds() {
        this.sounds = {
            shoot: new Audio('assets/sounds/shoot.mp3'),
            reload: new Audio('assets/sounds/reload.mp3'),
            powerup: new Audio('assets/sounds/powerup.mp3')
        };

        // Preload sounds
        Object.values(this.sounds).forEach(sound => {
            sound.preload = 'auto';
            sound.load();
        });
    }

    playSound(soundName) {
        if (this.sounds[soundName]) {
            const sound = this.sounds[soundName].cloneNode();
            sound.volume = 0.5;
            sound.play().catch(error => {
                console.warn(`Failed to play sound ${soundName}:`, error);
            });
        }
    }

    createModel() {
        try {
            // Create optimized player model with lower poly count
            const geometry = new THREE.BoxGeometry(0.8, 1.8, 0.8, 1, 1, 1);
            const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
            
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.copy(this.position);
            this.mesh.castShadow = true;
            this.scene.add(this.mesh);

            // Create collision box
            this.hitbox = new THREE.Box3().setFromObject(this.mesh);
            
            // Create bounding sphere for quick distance checks
            this.boundingSphere = new THREE.Sphere();
            this.mesh.geometry.computeBoundingSphere();
            this.boundingSphere.copy(this.mesh.geometry.boundingSphere);
        } catch (error) {
            console.error('Failed to create player model:', error);
            throw error;
        }
    }

    setupShootingAndReload() {
        this.canShoot = true;
        this.shootCooldown = 0.5;
        this.currentCooldown = 0;

        // Click listener is now handled globally by Controls.js for pointer lock.
        // We use a separate handler for shooting logic triggered by mousedown.
        this._onKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this._onKeyDown);

        // Add mousedown listener to trigger shooting specifically
        this._onMouseDown = this.handleMouseDown.bind(this);
        document.addEventListener('mousedown', this._onMouseDown);
    }

    handleKeyDown(e) {
        // Handle reload key
        if (e.key.toLowerCase() === 'r') {
            this.reload();
        }
        // Other keydown logic specific to player could go here
    }

    handleMouseDown(e) {
        // Check if pointer is locked AND it's a left click (button 0)
        if (this.controls.isPointerLocked() && e.button === 0) {
           this.shoot(); // Attempt to shoot
        }
    }

    update(delta) {
        if (!this.mesh || !this.controls) return;

        // Get current input state from Controls class
        const movementState = this.controls.getMovementState();

        // Update player physics and position based on input
        this.updateMovement(delta, movementState);
        
        // Update shooting cooldown
        if (!this.canShoot) {
            this.currentCooldown -= delta;
            if (this.currentCooldown <= 0) {
                this.canShoot = true;
                this.currentCooldown = 0; // Reset cooldown
            }
        }

        // Update powerup timers and effects
        this.updatePowerups(delta);
        
        // Update UI elements (health, ammo)
        this.updateUI();
        
        // Update collision detection structures
        this.updateCollision();
        
        // Ensure camera position follows the player mesh
        this.updateCameraPosition();
    }

    updateMovement(delta, movementState) {
        const speedMultiplier = 1 + (this.powerups.speed > 0 ? 0.5 : 0); // Speed bonus if powerup active
        const currentSpeed = this.speed * speedMultiplier;
        const controlFactor = this.isOnGround ? 1.0 : this.airControlFactor;

        // --- Calculate Movement Direction ---
        const moveDirection = new THREE.Vector3();
        if (movementState.forward) moveDirection.z -= 1;
        if (movementState.backward) moveDirection.z += 1;
        if (movementState.left) moveDirection.x -= 1;
        if (movementState.right) moveDirection.x += 1;

        // Prevent diagonal movement being faster
        if (moveDirection.lengthSq() > 0) { // Check length squared for efficiency
             moveDirection.normalize();
        }
        
        // --- Apply Camera Rotation to Direction ---
        // Get camera's horizontal rotation (yaw) from controls
        const cameraQuaternion = new THREE.Quaternion();
        // Use controls yaw directly, ignore pitch for horizontal movement
        cameraQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.controls.mouseState.yaw); 
        moveDirection.applyQuaternion(cameraQuaternion);

        // --- Calculate Target Velocity ---
        const targetVelocityX = moveDirection.x * currentSpeed;
        const targetVelocityZ = moveDirection.z * currentSpeed;
        
        // --- Apply Acceleration/Deceleration (Lerp) ---
        // Smoothly approach the target velocity based on control factor
        const lerpFactor = 0.15 * controlFactor; // Adjust lerp factor based on air/ground
        this.velocity.x += (targetVelocityX - this.velocity.x) * lerpFactor;
        this.velocity.z += (targetVelocityZ - this.velocity.z) * lerpFactor;

        // --- Apply Friction ---
        if (this.isOnGround) {
             this.velocity.x *= this.friction; // Apply friction only on ground
             this.velocity.z *= this.friction;
        }

        // --- Apply Gravity ---
        this.velocity.y -= this.gravity * delta;

        // --- Handle Jumping ---
        if (movementState.jump && this.isOnGround) {
            this.velocity.y = this.jumpForce;
            this.isOnGround = false;
            // Controls class already handles setting jump state back to false on keyup
        }

        // --- Apply Final Velocity to Position ---
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.position.z += this.velocity.z * delta;

        // --- Ground Collision ---
        if (this.position.y < this.groundY) {
            this.position.y = this.groundY;
            this.velocity.y = 0; // Stop vertical movement
            this.isOnGround = true;
        }

        // --- Boundary Clamping ---
        this.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.position.x));
        this.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.position.z));

        // --- Update Visual Mesh ---
        this.mesh.position.copy(this.position);
    }

    updateCameraPosition() {
         // Camera position follows the player mesh position
         // Adjust Y for eye level (relative to the mesh's base at this.position.y)
         this.camera.position.set(
             this.mesh.position.x,
             this.mesh.position.y + 0.8, // Eye height offset (adjust as needed)
             this.mesh.position.z
         ); 
         // Camera ROTATION is handled entirely by Controls.js based on mouse input
    }

    updateCollision() {
        // Update bounding sphere position
        this.boundingSphere.center.copy(this.position);
        
        // Update collision box
        this.hitbox.setFromObject(this.mesh);
    }

    shoot() {
        // Check if we can shoot
        if (!this.canShoot || !this.weapon) {
            console.log("Cannot shoot. Cooldown or no weapon.");
            return;
        }

        // Create bullet using weapon
        const bullet = this.weapon.createBullet();
        if (!bullet) {
            console.log("Failed to create bullet");
            return;
        }

        // Get camera direction for bullet trajectory
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        direction.normalize();

        // Set bullet position slightly in front of camera
        const bulletStartPos = this.camera.position.clone();
        bulletStartPos.add(direction.clone().multiplyScalar(1)); // 1 unit in front
        bullet.position.copy(bulletStartPos);

        // Add bullet to scene and track it
        this.scene.add(bullet);
        if (!this.weapon.bullets) this.weapon.bullets = [];
        this.weapon.bullets.push({
            mesh: bullet,
            velocity: direction.clone().multiplyScalar(bullet.userData.speed),
            created: performance.now()
        });

        // Play sound and start cooldown
        this.playSound('shoot');
        this.canShoot = false;
        this.currentCooldown = this.shootCooldown;

        // Update UI
        this.updateUI();

        console.log("Shot fired! Bullet:", bullet.position.toArray(), "Direction:", direction.toArray());
    }

    takeDamage(amount) {
        if (this.powerups.invincibility > 0) return;
        
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.die();
        }
        this.updateUI();
    }

    die() {
        if (game) {
            game.gameOver();
        }
    }

    applyPowerup(type) {
        console.log(`Applying powerup: ${type}`);
        let duration = 10; // Default duration in seconds
        let playSound = true; // Play sound by default

        switch (type) {
            case 'health':
                const healthGain = 25;
                this.health = Math.min(this.maxHealth, this.health + healthGain);
                duration = 0; // Instant effect
                playSound = false; // Maybe no sound for health pickup? Or a different one?
                 console.log(`Health increased to ${this.health}`);
                break;
            case 'speed':
                this.powerups.speed = Math.max(this.powerups.speed, duration); // Reset or extend timer
                console.log(`Speed boost activated for ${duration}s`);
                break;
            case 'damage':
                this.powerups.damage = Math.max(this.powerups.damage, duration); // Reset or extend timer
                 console.log(`Damage boost activated for ${duration}s`);
                break;
            case 'invincibility':
                 this.powerups.invincibility = Math.max(this.powerups.invincibility, duration);
                 console.log(`Invincibility activated for ${duration}s`);
                 break;
            default:
                console.warn(`Unknown powerup type: ${type}`);
                playSound = false;
                break;
        }

        if (playSound) {
             this.playSound('powerup');
        }
        this.updateUI(); // Update UI if health changed
    }

    updatePowerups(delta) {
        // Decrease timers for active powerups
        if (this.powerups.speed > 0) {
            this.powerups.speed = Math.max(0, this.powerups.speed - delta);
        }
        if (this.powerups.damage > 0) {
            this.powerups.damage = Math.max(0, this.powerups.damage - delta);
        }
        if (this.powerups.invincibility > 0) {
             this.powerups.invincibility = Math.max(0, this.powerups.invincibility - delta);
        }
        // Potential place to reset effects when timer hits 0, e.g., player material change for invincibility
    }

    updateUI() {
        if (this.healthFill) {
            const healthPercent = (this.health / this.maxHealth) * 100;
            this.healthFill.style.width = `${healthPercent}%`;
        }
        if (this.ammoCounter && this.weapon) {
            this.ammoCounter.textContent = `Ammo: ${this.weapon.ammo}/${this.weapon.maxAmmo}`;
        }
    }

    checkCollision(object) {
        if (!object || !this.hitbox) return false;
        
        const objectBox = new THREE.Box3().setFromObject(object);
        return this.hitbox.intersectsBox(objectBox);
    }

    reload() {
        if (this.weapon && this.weapon.reload) { // Check if reload method exists
            console.log("Attempting reload...");
            const success = this.weapon.reload(); // Assume reload() returns true/false or handles internally
            if (success !== false) { // Play sound unless reload explicitly failed
                 this.playSound('reload'); 
                 this.updateUI(); // Update ammo display
                 console.log("Reload successful (or initiated).");
            } else {
                 console.log("Reload failed (e.g., already full).");
            }
        } else {
             console.warn("Cannot reload: No weapon or weapon has no reload method.");
        }
    }

    cleanup() {
        // Remove event listeners
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('mousedown', this._onMouseDown);
        
        // Remove mesh from scene
        if (this.mesh && this.scene) {
            this.scene.remove(this.mesh);
            // Dispose geometry and material if no longer needed elsewhere
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
        }
        console.log("Player cleaned up.");
    }
} 