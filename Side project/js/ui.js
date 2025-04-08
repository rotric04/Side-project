class UI {
    constructor() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.gameMenu = document.getElementById('game-menu');
        this.gameUI = document.getElementById('game-ui');
        this.healthFill = document.getElementById('health-fill');
        this.ammoCounter = document.getElementById('ammo-counter');
        this.scoreElement = document.getElementById('score');
        this.fpsCounter = document.getElementById('fps-counter');
        this.startSoloBtn = document.getElementById('start-solo');
        this.start1v1Btn = document.getElementById('start-1v1');

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.startSoloBtn) {
            this.startSoloBtn.addEventListener('click', () => {
                if (window.game) {
                    this.hideMenu();
                    this.showGameUI();
                    window.game.startGame('solo');
                } else {
                    console.error('Game instance not found');
                }
            });
        }

        if (this.start1v1Btn) {
            this.start1v1Btn.addEventListener('click', () => {
                if (window.game) {
                    this.hideMenu();
                    this.showGameUI();
                    window.game.startGame('1v1');
                } else {
                    console.error('Game instance not found');
                }
            });
        }
    }

    showLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('hidden');
        }
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
        }
    }

    showMenu() {
        if (this.gameMenu) {
            this.gameMenu.classList.remove('hidden');
        }
        this.hideGameUI();
    }

    hideMenu() {
        if (this.gameMenu) {
            this.gameMenu.classList.add('hidden');
        }
    }

    showGameUI() {
        if (this.gameUI) {
            this.gameUI.classList.remove('hidden');
        }
    }

    hideGameUI() {
        if (this.gameUI) {
            this.gameUI.classList.add('hidden');
        }
    }

    updateHealth(health, maxHealth) {
        if (this.healthFill) {
            const percentage = (health / maxHealth) * 100;
            this.healthFill.style.width = `${percentage}%`;
        }
    }

    updateAmmo(ammo, maxAmmo) {
        if (this.ammoCounter) {
            this.ammoCounter.textContent = `Ammo: ${ammo}/${maxAmmo}`;
        }
    }

    updateScore(score) {
        if (this.scoreElement) {
            this.scoreElement.textContent = `Score: ${score}`;
        }
    }

    updateFPS(fps) {
        if (this.fpsCounter) {
            this.fpsCounter.textContent = `FPS: ${Math.round(fps)}`;
        }
    }

    showGameOver(score) {
        this.hideGameUI();
        this.showMenu();
        alert(`Game Over! Your score: ${score}`);
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ui = new UI();
}); 