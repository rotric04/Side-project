class Powerup {
    constructor(type) {
        this.type = type; // 'health', 'speed', 'damage'
        this.value = this.getValue();
        this.mesh = null;
        this.rotationSpeed = 0.01;
        this.floatSpeed = 0.005;
        this.floatAmplitude = 0.2;
        this.initialY = 1;
        this.floatOffset = Math.random() * Math.PI * 2;
        
        try {
            this.createModel();
        } catch (error) {
            console.error('Failed to create powerup:', error);
        }
    }

    createModel() {
        // Create powerup model based on type
        let geometry, material;
        
        switch (this.type) {
            case 'health':
                geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red for health
                break;
            case 'speed':
                geometry = new THREE.ConeGeometry(0.5, 1, 8);
                material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green for speed
                break;
            case 'damage':
                geometry = new THREE.SphereGeometry(0.5, 16, 16);
                material = new THREE.MeshStandardMaterial({ color: 0x0000ff }); // Blue for damage
                break;
            default:
                geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        }
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = this.initialY;
        this.mesh.castShadow = true;
    }

    getValue() {
        // Determine value based on type
        switch (this.type) {
            case 'health':
                return 25; // Health points
            case 'speed':
                return 1.5; // Speed multiplier
            case 'damage':
                return 2; // Damage multiplier
            default:
                return 10;
        }
    }

    update(delta) {
        if (!this.mesh) return;
        
        // Rotate the powerup
        this.mesh.rotation.y += this.rotationSpeed;
        
        // Float up and down
        this.mesh.position.y = this.initialY + Math.sin(this.floatOffset + performance.now() * this.floatSpeed) * this.floatAmplitude;
    }

    collect() {
        // Remove powerup from scene
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
} 