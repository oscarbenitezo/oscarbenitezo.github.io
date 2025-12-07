/* =========================================
   HELPER CLASS: VECTOR MATH
   ========================================= */
class Vec2 {
    constructor(x, y) { this.x = x || 0; this.y = y || 0; }
    lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; return this; }
    clone() { return new Vec2(this.x, this.y); }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    copy(v) { this.x = v.x; this.y = v.y; return this; }
}

/* =========================================
   CLASS: OVERLAY (Grid Transition)
   ========================================= */
class Cell {
    constructor(row, column) {
        this.DOM = { el: document.createElement('div') };
        this.DOM.el.style.willChange = 'opacity, transform';
        this.row = row; this.column = column;
    }
}
class Overlay {
    constructor(DOM_el, customOptions) {
        this.DOM = { el: DOM_el };
        this.options = Object.assign({ rows: 10, columns: 10 }, customOptions);
        this.DOM.el.style.setProperty('--columns', this.options.columns);
        this.cells = [];
        for (let i = 0; i < this.options.rows; ++i) {
            for (let j = 0; j < this.options.columns; ++j) {
                const cell = new Cell(i, j);
                this.cells.push(cell);
                this.DOM.el.appendChild(cell.DOM.el);
            }
        }
    }
    show(customConfig = {}) {
        return new Promise((resolve) => {
            const config = Object.assign({ transformOrigin: '50% 50%', duration: 0.2, ease: 'none', stagger: { grid: [this.options.rows, this.options.columns], from: 0, each: 0.005, ease: 'none' } }, customConfig);
            gsap.set(this.DOM.el, { opacity: 1, pointerEvents: 'auto' });
            gsap.fromTo(this.cells.map(cell => cell.DOM.el), { scale: 0, opacity: 0, transformOrigin: config.transformOrigin }, { duration: config.duration, ease: config.ease, scale: 1.01, opacity: 1, stagger: config.stagger, onComplete: resolve });
        });
    }
    hide(customConfig = {}) {
        return new Promise((resolve) => {
            const config = Object.assign({ transformOrigin: '50% 50%', duration: 0.2, ease: 'none', stagger: { grid: [this.options.rows, this.options.columns], from: 0, each: 0.005, ease: 'none' } }, customConfig);
            gsap.to(this.cells.map(cell => cell.DOM.el), { duration: config.duration, ease: config.ease, scale: 0, opacity: 0, transformOrigin: config.transformOrigin, stagger: config.stagger, onComplete: () => { gsap.set(this.DOM.el, { opacity: 0, pointerEvents: 'none' }); resolve(); } });
        });
    }
}

/* =========================================
   CLASS: STICKY CURSOR
   ========================================= */
class Cursor {
    constructor(targetEl) {
        this.el = targetEl;
        this.position = { previous: new Vec2(-100, -100), current: new Vec2(-100, -100), target: new Vec2(-100, -100), lerpAmount: 0.1 };
        this.scale = { previous: 1, current: 1, target: 1, lerpAmount: 0.1 };
        this.isHovered = false; this.hoverEl = null;
        this.addListeners();
    }
    update() {
        this.position.current.lerp(this.position.target, this.position.lerpAmount);
        this.scale.current = gsap.utils.interpolate(this.scale.current, this.scale.target, this.scale.lerpAmount);
        gsap.set(this.el, { x: this.position.current.x, y: this.position.current.y });
        if (!this.isHovered) {
            const delta = this.position.current.clone().sub(this.position.previous);
            this.position.previous.copy(this.position.current);
            const angle = Math.atan2(delta.y, delta.x) * (180 / Math.PI);
            const distance = Math.sqrt(delta.x * delta.x + delta.y * delta.y) * 0.04;
            gsap.set(this.el, { rotate: angle, scaleX: this.scale.current + Math.min(distance, 1), scaleY: this.scale.current - Math.min(distance, 0.3) });
        }
    }
    updateTargetPosition(x, y) {
        if (this.isHovered && this.hoverEl) {
            // Check for Cards OR Gallery Images
            const isCard = this.hoverEl.classList.contains('grid--item') || this.hoverEl.classList.contains('gallery-item');
            
            if (isCard) {
                // Low magnetism for cards
                this.position.target.x = x;
                this.position.target.y = y;
                this.scale.target = 1; 
                gsap.set(this.el, { rotate: 0 });
            } else {
                // High magnetism for buttons
                const bounds = this.hoverEl.getBoundingClientRect();
                const cx = bounds.x + bounds.width / 2;
                const cy = bounds.y + bounds.height / 2;
                const dx = x - cx; const dy = y - cy;
                this.position.target.x = cx + dx * 0.15;
                this.position.target.y = cy + dy * 0.15;
                this.scale.target = 2;
                gsap.to(this.el, { scaleX: 2, scaleY: 2, duration: 0.3, ease: "power2.out", overwrite: true });
            }
        } else {
            this.position.target.x = x; this.position.target.y = y; this.scale.target = 1;
            gsap.to(this.el, { scaleX: 1, scaleY: 1, duration: 0.3, overwrite: true });
        }
    }
    addListeners() {
        gsap.utils.toArray("[data-hover]").forEach((hoverEl) => {
            const isCard = hoverEl.classList.contains('grid--item') || hoverEl.classList.contains('gallery-item');
            const pullStrength = isCard ? 0.08 : 0.3; 
            const movementEase = isCard ? "power3.out" : "elastic.out(1, 0.3)";
            const movementDur = isCard ? 0.5 : 1;

            const xTo = gsap.quickTo(hoverEl, "x", { duration: movementDur, ease: movementEase });
            const yTo = gsap.quickTo(hoverEl, "y", { duration: movementDur, ease: movementEase });

            hoverEl.addEventListener("mouseenter", () => {
                this.isHovered = true;
                this.hoverEl = hoverEl;
            });
            hoverEl.addEventListener("mouseleave", () => {
                this.isHovered = false;
                this.hoverEl = null;
                xTo(0); yTo(0);
            });
            hoverEl.addEventListener("mousemove", (event) => {
                const { clientX: cx, clientY: cy } = event;
                const { height, width, left, top } = hoverEl.getBoundingClientRect();
                const x = cx - (left + width / 2);
                const y = cy - (top + height / 2);
                xTo(x * pullStrength); yTo(y * pullStrength);
            });
        });
    }
}

/* =========================================
   CLASS: THEME TOGGLE
   ========================================= */
class ThemeToggle {
    constructor(buttonSelector) {
        this.button = document.querySelector(buttonSelector);
        if (this.button) { this.button.addEventListener("click", this.toggleTheme.bind(this)); }
    }
    toggleTheme() {
        const isConnected = this.button.getAttribute("aria-pressed") === "true";
        const newState = !isConnected;
        this.button.setAttribute("aria-pressed", newState);
        const isDarkMode = !newState; 
        document.documentElement.setAttribute("data-dark", isDarkMode);
    }
}

/* =========================================
   SMOOTH SCROLL & PARALLAX
   ========================================= */
const body = document.body;
const scrollContent = document.querySelector('.scroll-content');
const cards = document.querySelectorAll('.grid--item'); 
const easing = 0.08; 
let startY = 0; let endY = 0; let raf;
const lerp = (start, end, t) => start * (1 - t) + end * t;

function parallax(card) {
    const wrapper = card.querySelector('.preview-image');
    if (!wrapper) return;
    const { top, height } = card.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    if (top + height > 0 && top < windowHeight) {
        const movementRange = card.offsetHeight * 0.2; 
        const progress = (top + height) / (windowHeight + height); 
        const yPos = movementRange * (progress - 0.5); 
        wrapper.style.transform = `translate3d(0, ${yPos}px, 0)`;
    }
}

const activateParallax = () => cards.forEach(parallax);
function setBodyHeight() { 
    // FIX: Ensure scrollContent exists before checking height
    if(scrollContent) body.style.height = `${scrollContent.clientHeight}px`; 
}
function startScroll() { endY = window.scrollY; }
function updateScroll() {
    startY = lerp(startY, endY, easing);
    if(scrollContent) scrollContent.style.transform = `translate3d(0, -${startY}px, 0)`;
    activateParallax();
    raf = requestAnimationFrame(updateScroll);
}

// 2. INIT ALL
// Initialize Cursor & Theme (These exist on all pages)
const cursor = new Cursor(document.querySelector(".cursor"));
const toggle = new ThemeToggle(".theme-toggle");

// Initialize Overlay (Exists on all pages)
const overlayEl = document.querySelector('.overlay');
const overlay = new Overlay(overlayEl, { rows: 8, columns: 14 });

// PAGE LOAD TRANSITION: Animate IN on every page load
window.addEventListener('load', () => { 
    setBodyHeight(); 
    updateScroll();
    
    // Reveal Page Logic
    if (overlayEl) { gsap.set(overlayEl, { opacity: 1 }); }
    overlay.hide({ transformOrigin: '50% 100%', duration: 0.5, ease: 'power2', stagger: index => 0.005 * index });
});

window.addEventListener('scroll', startScroll, false);
const observer = new ResizeObserver(() => { setBodyHeight(); });
if(scrollContent) observer.observe(scrollContent);

// GSAP Ticker for Cursor
window.addEventListener("pointermove", (event) => {
    const x = event.clientX; const y = event.clientY;
    cursor.updateTargetPosition(x, y);
});
gsap.ticker.add(() => { cursor.update(); });

/* =========================================
   SPA LOGIC (Conditional)
   ========================================= */
const landingView = document.querySelector('.landing-view');
const portfolioView = document.querySelector('.portfolio-view');
const triggers = document.querySelectorAll('.trigger-transition');
const backButton = document.querySelectorAll('.back-to-home-trigger');
let isAnimating = false;

// BURGER MENU LOGIC
const burgerBtn = document.querySelector('.burger-menu');
const nav = document.querySelector('.header-nav');
const navLinks = document.querySelectorAll('.nav-item');

if (burgerBtn && nav) {
    burgerBtn.addEventListener('click', () => {
        burgerBtn.classList.toggle('open');
        nav.classList.toggle('nav-open');
    });
    
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            burgerBtn.classList.remove('open');
            nav.classList.remove('nav-open');
        });
    });
}

// PAGE-LEVEL TRANSITIONS (navigate to other pages with overlay)
const pageTransitionLinks = document.querySelectorAll('[data-page-transition]');
if (overlay && pageTransitionLinks.length) {
    pageTransitionLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const target = link.dataset.pageTransition;
            if (!target || target === '#') return;
            e.preventDefault();
            if (isAnimating) return;
            isAnimating = true;
            overlay.show({ transformOrigin: '50% 50%', duration: 0.25, ease: 'power2.inOut', stagger: index => 0.005 * index }).then(() => {
                window.location.href = target;
            });
        });
    });
}

// Make preview images act like their title links
const previewLinks = document.querySelectorAll('.grid--item .preview--container');
previewLinks.forEach(preview => {
    preview.addEventListener('click', () => {
        const card = preview.closest('.grid--item');
        const link = card ? card.querySelector('.title--container a') : null;
        if (link) { link.click(); }
    });
});

// Process Book modal (project pages)
const processBookTrigger = document.querySelector('.process-book-trigger');
const pdfModal = document.getElementById('pdfModal');
const pdfClose = pdfModal ? pdfModal.querySelector('.pdf-modal__close') : null;
if (processBookTrigger && pdfModal) {
    processBookTrigger.addEventListener('click', () => {
        pdfModal.hidden = false;
        pdfModal.classList.add('is-open');
    });
}
if (pdfClose && pdfModal) {
    pdfClose.addEventListener('click', () => {
        pdfModal.classList.remove('is-open');
        pdfModal.hidden = true;
    });
    pdfModal.addEventListener('click', (e) => {
        if (e.target === pdfModal) {
            pdfModal.classList.remove('is-open');
            pdfModal.hidden = true;
        }
    });
}

// SPA TRANSITIONS (Only run if we have the views)
if (landingView && portfolioView) {

    const sections = document.querySelectorAll('.portfolio-section');

    const showSection = (targetId) => {
        // Hide non-target sections when a target is provided; show all if none.
        sections.forEach(section => {
            const shouldShow = !targetId || `#${section.id}` === targetId;
            section.classList.toggle('is-hidden', !shouldShow);
        });
    };

    // 1. HOME -> PORTFOLIO
    triggers.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (isAnimating) return;
            isAnimating = true;
            const targetId = btn.dataset.target;
            overlay.show({ transformOrigin: '50% 0%', duration: 0.2, ease: 'power3.inOut', stagger: index => 0.005 * index }).then(() => {
                landingView.classList.add('view--hidden');
                portfolioView.classList.add('view--active');
                showSection(targetId);
                setBodyHeight();
                // Stay at the top so the header is visible when the portfolio loads
                window.scrollTo(0, 0);
                startY = 0;
                endY = 0;
                overlay.hide({ transformOrigin: '50% 100%', duration: 0.2, ease: 'power2', stagger: index => 0.005 * index }).then(() => isAnimating = false);
            });
        });
    });

    // 2. PORTFOLIO -> HOME
    backButton.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (isAnimating) return;
            isAnimating = true;
            overlay.show({ transformOrigin: '50% 100%', duration: 0.2, ease: 'power3.inOut', stagger: index => 0.005 * index }).then(() => {
                portfolioView.classList.remove('view--active');
                landingView.classList.remove('view--hidden');
                setBodyHeight();
                window.scrollTo(0, 0); endY = 0; startY = 0;
                overlay.hide({ transformOrigin: '50% 0%', duration: 0.2, ease: 'power2', stagger: index => 0.005 * index }).then(() => isAnimating = false);
            });
        });
    });
}
