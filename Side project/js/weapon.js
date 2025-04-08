import * as THREE from 'three';

export class Weapon {
    constructor(type) {
        this.type = type || 'pistol'; // 'pistol', 'rifle', 'shotgun'
        this.damage = this.getDamage();
        this.ammo = this.getMaxAmmo();
        this.maxAmmo = this.getMaxAmmo();
        this.fireRate = this.getFireRate();
        this.reloadTime = this.getReloadTime();
        this.lastFired = 0;
        this.isReloading = false;
        this.mesh = null;
        this.bulletSpeed = 50;
        this.bullets = [];
        
        try {
            this.createModel();
        } catch (error) {
            console.error('Failed to create weapon:', error);
        }
    }

    createModel() {
        // Create weapon model based on type
        let geometry, material;
        
        switch (this.type) {
            case 'pistol':
                geometry = new THREE.BoxGeometry(0.2, 0.2, 0.4);
                material = new THREE.MeshStandardMaterial({ color: 0x333333 });
                break;
            case 'rifle':
                geometry = new THREE.BoxGeometry(0.2, 0.2, 0.8);
                material = new THREE.MeshStandardMaterial({ color: 0x555555 });
                break;
            case 'shotgun':
                geometry = new THREE.BoxGeometry(0.3, 0.2, 0.6);
                material = new THREE.MeshStandardMaterial({ color: 0x777777 });
                break;
            default:
                geometry = new THREE.BoxGeometry(0.2, 0.2, 0.4);
                material = new THREE.MeshStandardMaterial({ color: 0x333333 });
        }
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
    }

    getDamage() {
        switch (this.type) {
            case 'pistol': return 10;
            case 'rifle': return 15;
            case 'shotgun': return 25;
            default: return 10;
        }
    }

    getMaxAmmo() {
        switch (this.type) {
            case 'pistol': return 12;
            case 'rifle': return 30;
            case 'shotgun': return 8;
            default: return 12;
        }
    }

    getFireRate() {
        // Fire rate in milliseconds
        switch (this.type) {
            case 'pistol': return 500;
            case 'rifle': return 100;
            case 'shotgun': return 1000;
            default: return 500;
        }
    }

    getReloadTime() {
        // Reload time in milliseconds
        switch (this.type) {
            case 'pistol': return 1000;
            case 'rifle': return 2000;
            case 'shotgun': return 2500;
            default: return 1000;
        }
    }

    createBullet() {
        // Check ammo first
        if (this.ammo <= 0) {
            console.log("No ammo!");
            return null;
        }

        if (this.isReloading) {
            console.log("Still reloading!");
            return null;
        }

        // Create the bullet mesh
        const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Set bullet properties
        bullet.userData.type = 'bullet';
        bullet.userData.damage = this.damage;
        bullet.userData.speed = this.bulletSpeed;
        
        // Decrease ammo
        this.ammo--;
        
        return bullet;
    }

    reload() {
        if (this.isReloading || this.ammo === this.maxAmmo) {
            console.log("Can't reload: ", this.isReloading ? "already reloading" : "ammo is full");
            return false;
        }
        
        console.log("Starting reload...");
        this.isReloading = true;
        this.playSound('reload');
        
        setTimeout(() => {
            this.ammo = this.maxAmmo;
            this.isReloading = false;
            console.log("Reload complete! Ammo:", this.ammo);
        }, this.reloadTime);

        return true;
    }

    playSound(type) {
        try {
            let audio;
            switch (type) {
                case 'shoot':
                    audio = new Audio('assets/sounds/shoot.mp3');
                    break;
                case 'reload':
                    audio = new Audio('assets/sounds/reload.mp3');
                    break;
                default:
                    console.warn('Unknown sound type:', type);
                    return;
            }
            
            if (audio) {
                audio.volume = 0.3;
                audio.play().catch(e => console.warn('Error playing sound:', e));
            }
        } catch (error) {
            console.warn('Error playing sound:', error);
        }
    }

    updateBullets(delta, scene, enemies) {
        const now = performance.now();
        const MAX_BULLET_LIFETIME = 2000; // 2 seconds
        const MAX_BULLET_DISTANCE = 100;
        
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            if (!bullet || !bullet.mesh) {
                console.warn('Invalid bullet at index', i);
                this.bullets.splice(i, 1);
                continue;
            }

            // Update position
            bullet.mesh.position.add(bullet.velocity.clone().multiplyScalar(delta));
            
            // Check for collisions with enemies
            if (enemies && enemies.length > 0) {
                for (const enemy of enemies) {
                    if (enemy && enemy.checkCollision && enemy.checkCollision(bullet.mesh)) {
                        enemy.takeDamage(bullet.mesh.userData.damage);
                        scene.remove(bullet.mesh);
                        this.bullets.splice(i, 1);
                        break;
                    }
                }
            }
            
            // Remove bullets that are too old or too far
            if (now - bullet.created > MAX_BULLET_LIFETIME || 
                bullet.mesh.position.length() > MAX_BULLET_DISTANCE) {
                scene.remove(bullet.mesh);
                this.bullets.splice(i, 1);
            }
        }
    }
} 