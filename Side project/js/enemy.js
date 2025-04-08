import * as THREE from 'three';

// Export the Enemy class
export class Enemy {
    constructor() {
        this.health = 100;
        this.maxHealth = 100;
        this.speed = 3;
        this.damage = 10;
        this.attackRange = 5;
        this.detectionRange = 20;
        this.attackCooldown = 1;
        this.currentCooldown = 0;
        this.state = 'patrol';
        this.patrolPoints = [];
        this.currentPatrolPoint = 0;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.lastStateChange = 0;
        this.stateChangeCooldown = 1;
        this.mesh = null;
        this.collisionBox = null;
        this.boundingSphere = null;

        try {
            this.createModel();
            this.setupPatrolPoints();
        } catch (error) {
            console.error('Failed to create enemy:', error);
            throw error;
        }
    }

    createModel() {
        // Create optimized enemy model
        const geometry = new THREE.BoxGeometry(1, 2, 1, 1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            roughness: 0.8,
            metalness: 0.2
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = 1;
        this.mesh.castShadow = true;

        // Create collision detection
        this.collisionBox = new THREE.Box3().setFromObject(this.mesh);
        this.boundingSphere = new THREE.Sphere();
        this.mesh.geometry.computeBoundingSphere();
        this.boundingSphere.copy(this.mesh.geometry.boundingSphere);
    }

    setupPatrolPoints() {
        // Create optimized patrol points
        const numPoints = 4;
        const minDistance = 10;
        const maxDistance = 30;

        for (let i = 0; i < numPoints; i++) {
            let point;
            let attempts = 0;
            const maxAttempts = 10;

            do {
                point = new THREE.Vector3(
                    Math.random() * 80 - 40,
                    0,
                    Math.random() * 80 - 40
                );
                attempts++;
            } while (attempts < maxAttempts && 
                    this.patrolPoints.some(p => p.distanceTo(point) < minDistance));

            this.patrolPoints.push(point);
        }
    }

    update(delta, player) {
        if (!this.mesh || !player) return;

        // Update attack cooldown
        if (this.currentCooldown > 0) {
            this.currentCooldown -= delta;
        }

        // Update state based on distance to player
        this.updateState(player);

        // Execute behavior based on state
        switch (this.state) {
            case 'patrol':
                this.patrol(delta);
                break;
            case 'chase':
                this.chase(player, delta);
                break;
            case 'attack':
                this.attack(player, delta);
                break;
        }

        // Update collision detection
        this.updateCollision();
    }

    updateState(player) {
        const currentTime = performance.now();
        if (currentTime - this.lastStateChange < this.stateChangeCooldown * 1000) {
            return;
        }

        const distanceToPlayer = this.mesh.position.distanceTo(player.mesh.position);
        let newState = this.state;

        if (distanceToPlayer <= this.attackRange) {
            newState = 'attack';
        } else if (distanceToPlayer <= this.detectionRange) {
            newState = 'chase';
        } else {
            newState = 'patrol';
        }

        if (newState !== this.state) {
            this.state = newState;
            this.lastStateChange = currentTime;
        }
    }

    patrol(delta) {
        if (this.patrolPoints.length === 0) return;

        const targetPoint = this.patrolPoints[this.currentPatrolPoint];
        const direction = new THREE.Vector3().subVectors(targetPoint, this.mesh.position);
        
        if (direction.length() < 1) {
            // Reached patrol point, move to next
            this.currentPatrolPoint = (this.currentPatrolPoint + 1) % this.patrolPoints.length;
        } else {
            // Move towards patrol point
            direction.normalize();
            this.velocity.copy(direction).multiplyScalar(this.speed * delta);
            this.mesh.position.add(this.velocity);
            this.mesh.lookAt(targetPoint);
        }
    }

    chase(player, delta) {
        const direction = new THREE.Vector3().subVectors(player.mesh.position, this.mesh.position);
        direction.normalize();
        this.velocity.copy(direction).multiplyScalar(this.speed * delta);
        this.mesh.position.add(this.velocity);
        this.mesh.lookAt(player.mesh.position);
    }

    attack(player, delta) {
        // Face the player
        this.mesh.lookAt(player.mesh.position);

        // Attack if cooldown is ready
        if (this.currentCooldown <= 0) {
            player.takeDamage(this.damage);
            this.currentCooldown = this.attackCooldown;
        }
    }

    updateCollision() {
        if (!this.mesh) return;

        // Update bounding sphere position
        this.boundingSphere.center.copy(this.mesh.position);
        
        // Update collision box
        this.collisionBox.setFromObject(this.mesh);
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        // Remove enemy from scene
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        
        // Update score
        if (window.game) {
            window.game.score += 100;
            const scoreElement = document.getElementById('score');
            if (scoreElement) {
                scoreElement.textContent = `Score: ${window.game.score}`;
            }
        }
    }

    checkCollision(object) {
        if (!object || !this.collisionBox) return false;
        
        const objectBox = new THREE.Box3().setFromObject(object);
        return this.collisionBox.intersectsBox(objectBox);
    }

    cleanup() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}