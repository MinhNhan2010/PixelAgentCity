/**
 * mobile-controls.js — PixelAgent City Mobile Controller
 * Handles: bottom nav, swipe drawer, touch gestures, viewport scaling
 */
(function () {
    'use strict';

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth <= 768;

    if (!isMobile && window.innerWidth > 768) return;

    console.log('📱 Mobile mode activated');

    // ═══ INJECT MOBILE NAV ═══
    function createMobileNav() {
        const nav = document.createElement('div');
        nav.className = 'mobile-nav';
        nav.id = 'mobileNav';
        nav.innerHTML = `
            <div class="mobile-nav-inner">
                <button class="mobile-nav-btn active" data-panel="office" id="mnOffice">
                    <span class="mobile-nav-icon">🏢</span>
                    <span class="mobile-nav-label">Office</span>
                </button>
                <button class="mobile-nav-btn" data-panel="agents" id="mnAgents">
                    <span class="mobile-nav-icon">👤</span>
                    <span class="mobile-nav-label">Agents</span>
                </button>
                <button class="mobile-nav-btn" data-panel="contracts" id="mnContracts">
                    <span class="mobile-nav-icon">📋</span>
                    <span class="mobile-nav-label">Tasks</span>
                </button>
                <button class="mobile-nav-btn" data-panel="hire" id="mnHire">
                    <span class="mobile-nav-icon">➕</span>
                    <span class="mobile-nav-label">Hire</span>
                </button>
                <button class="mobile-nav-btn" data-panel="more" id="mnMore">
                    <span class="mobile-nav-icon">⚙️</span>
                    <span class="mobile-nav-label">More</span>
                </button>
            </div>
        `;
        document.body.appendChild(nav);

        // Create overlay for drawer
        const overlay = document.createElement('div');
        overlay.className = 'mobile-panel-overlay';
        overlay.id = 'mobilePanelOverlay';
        document.body.appendChild(overlay);

        return nav;
    }

    // ═══ PANEL MANAGEMENT ═══
    let drawerOpen = false;

    function openDrawer() {
        const panel = document.querySelector('.management-panel');
        const overlay = document.getElementById('mobilePanelOverlay');
        if (!panel) return;
        panel.classList.add('mobile-open');
        if (overlay) overlay.style.display = 'block';
        drawerOpen = true;
    }

    function closeDrawer() {
        const panel = document.querySelector('.management-panel');
        const overlay = document.getElementById('mobilePanelOverlay');
        if (!panel) return;
        panel.classList.remove('mobile-open');
        if (overlay) overlay.style.display = 'none';
        drawerOpen = false;
        // Reset active nav
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
        const officeBtn = document.getElementById('mnOffice');
        if (officeBtn) officeBtn.classList.add('active');
    }

    function switchTab(tabName) {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === 'tab-' + tabName);
        });
    }

    // ═══ NAV BUTTON HANDLERS ═══
    function handleNavClick(e) {
        const btn = e.target.closest('.mobile-nav-btn');
        if (!btn) return;

        const panel = btn.dataset.panel;

        // Update active state
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        switch (panel) {
            case 'office':
                closeDrawer();
                break;
            case 'agents':
                switchTab('agents');
                openDrawer();
                break;
            case 'contracts':
                // Trigger contracts modal
                const btnContracts = document.getElementById('btnContracts');
                if (btnContracts) btnContracts.click();
                break;
            case 'hire':
                const btnHire = document.getElementById('btnAddAgent');
                if (btnHire) btnHire.click();
                break;
            case 'more':
                switchTab('stats');
                openDrawer();
                break;
        }
    }

    // ═══ SWIPE GESTURE FOR DRAWER ═══
    let touchStartY = 0;
    let touchDeltaY = 0;

    function handleTouchStart(e) {
        const panel = document.querySelector('.management-panel');
        if (!panel) return;
        const header = panel.querySelector('.mp-header');
        if (!header || !header.contains(e.target)) return;
        touchStartY = e.touches[0].clientY;
    }

    function handleTouchMove(e) {
        if (touchStartY === 0) return;
        touchDeltaY = e.touches[0].clientY - touchStartY;
    }

    function handleTouchEnd() {
        if (touchStartY === 0) return;
        // Swipe down to close
        if (touchDeltaY > 60 && drawerOpen) {
            closeDrawer();
        }
        // Swipe up to open
        if (touchDeltaY < -60 && !drawerOpen) {
            openDrawer();
        }
        touchStartY = 0;
        touchDeltaY = 0;
    }

    // ═══ PINCH TO ZOOM ON CANVAS ═══
    let lastPinchDist = 0;

    function handleCanvasPinch(e) {
        if (e.touches.length < 2) return;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (lastPinchDist > 0) {
            const delta = dist - lastPinchDist;
            if (delta > 5) {
                const zoomIn = document.getElementById('btnZoomIn');
                if (zoomIn) zoomIn.click();
            } else if (delta < -5) {
                const zoomOut = document.getElementById('btnZoomOut');
                if (zoomOut) zoomOut.click();
            }
        }
        lastPinchDist = dist;
        e.preventDefault();
    }

    function handleCanvasPinchEnd() {
        lastPinchDist = 0;
    }

    // ═══ DOUBLE TAP ON CANVAS TO INTERACT ═══
    let lastTapTime = 0;

    function handleDoubleTap(e) {
        const now = Date.now();
        if (now - lastTapTime < 300) {
            // Double tap — trigger click on canvas (interaction)
            const canvas = document.getElementById('officeCanvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const clickEvent = new MouseEvent('click', {
                    clientX: e.changedTouches[0].clientX,
                    clientY: e.changedTouches[0].clientY,
                    bubbles: true
                });
                canvas.dispatchEvent(clickEvent);
            }
        }
        lastTapTime = now;
    }

    // ═══ VIEWPORT FIX ═══
    function fixViewport() {
        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (e) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // Fix 100vh on mobile
        function setVH() {
            document.documentElement.style.setProperty('--real-vh', window.innerHeight + 'px');
        }
        setVH();
        window.addEventListener('resize', setVH);
    }

    // ═══ INIT ═══
    function init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setup);
        } else {
            setup();
        }
    }

    function setup() {
        fixViewport();

        const nav = createMobileNav();
        nav.addEventListener('click', handleNavClick);

        // Overlay click to close
        const overlay = document.getElementById('mobilePanelOverlay');
        if (overlay) overlay.addEventListener('click', closeDrawer);

        // Swipe gestures
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd);

        // Canvas pinch zoom
        const viewport = document.getElementById('officeViewport');
        if (viewport) {
            viewport.addEventListener('touchmove', handleCanvasPinch, { passive: false });
            viewport.addEventListener('touchend', handleCanvasPinchEnd);
        }

        // Double tap interaction
        const canvas = document.getElementById('officeCanvas');
        if (canvas) {
            canvas.addEventListener('touchend', handleDoubleTap);
        }

        console.log('📱 Mobile controls ready');
    }

    init();
})();
