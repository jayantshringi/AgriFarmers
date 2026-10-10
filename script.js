/**
 * AgriFarmers Root Script (Backward Compatibility Wrapper)
 * Automatically delegates to modular core at js/app.js.
 */
(function () {
    if (typeof window !== 'undefined' && !window.__AGRIFARMERS_APP_LOADED__) {
        const script = document.createElement('script');
        script.src = 'js/app.js';
        script.async = false;
        document.head.appendChild(script);
    }
})();