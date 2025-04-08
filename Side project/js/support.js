// Browser feature detection and support
(function() {
    // Check for WebGL support
    window.hasWebGL = (function() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    })();

    // Check for Pointer Lock API support
    window.hasPointerLock = 'pointerLockElement' in document || 
                           'mozPointerLockElement' in document || 
                           'webkitPointerLockElement' in document;

    // Check for Audio support
    window.hasAudio = (function() {
        try {
            return !!(window.AudioContext || window.webkitAudioContext);
        } catch (e) {
            return false;
        }
    })();

    // Helper functions
    window.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Polyfills
    window.requestAnimFrame = (function() {
        return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            function(callback) {
                window.setTimeout(callback, 1000 / 60);
            };
    })();

    // Console fallback for older browsers
    if (!window.console) {
        window.console = {
            log: function() {},
            warn: function() {},
            error: function() {}
        };
    }
})(); 