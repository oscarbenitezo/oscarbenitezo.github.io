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
            gsap.set(this.DOM.el, { opacity: 1 });
            gsap.fromTo(this.cells.map(cell => cell.DOM.el), { scale: 0, opacity: 0, transformOrigin: config.transformOrigin }, { duration: config.duration, ease: config.ease, scale: 1.01, opacity: 1, stagger: config.stagger, onComplete: resolve });
        });
    }
    hide(customConfig = {}) {
        return new Promise((resolve) => {
            const config = Object.assign({ transformOrigin: '50% 50%', duration: 0.2, ease: 'none', stagger: { grid: [this.options.rows, this.options.columns], from: 0, each: 0.005, ease: 'none' } }, customConfig);
            gsap.to(this.cells.map(cell => cell.DOM.el), { duration: config.duration, ease: config.ease, scale: 0, opacity: 0, transformOrigin: config.transformOrigin, stagger: config.stagger, onComplete: () => { gsap.set(this.DOM.el, { opacity: 0 }); resolve(); } });
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
        if (this.isHovered) {
            const bounds = this.hoverEl.getBoundingClientRect();
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            const dx = x - cx; const dy = y - cy;
            this.position.target.x = cx + dx * 0.15;
            this.position.target.y = cy + dy * 0.15;
            this.scale.target = 2;
            gsap.to(this.el, { scaleX: 2, scaleY: 2, duration: 0.3, ease: "power2.out", overwrite: true });
        } else {
            this.position.target.x = x; this.position.target.y = y; this.scale.target = 1;
            gsap.to(this.el, { scaleX: 1, scaleY: 1, duration: 0.3, overwrite: true });
        }
    }
    addListeners() {
        gsap.utils.toArray("[data-hover]").forEach((hoverEl) => {
            const hoverBoundsEl = hoverEl.querySelector("[data-hover-bounds]");
            const targetEl = hoverBoundsEl || hoverEl;
            targetEl.addEventListener("pointerover", () => { this.isHovered = true; this.hoverEl = targetEl; });
            targetEl.addEventListener("pointerout", () => { this.isHovered = false; this.hoverEl = null; });
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

// 1. PARALLAX
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
function setBodyHeight() { body.style.height = `${scrollContent.clientHeight}px`; }
function startScroll() { endY = window.scrollY; }
function updateScroll() {
    startY = lerp(startY, endY, easing);
    scrollContent.style.transform = `translate3d(0, -${startY}px, 0)`;
    activateParallax();
    raf = requestAnimationFrame(updateScroll);
}

// 2. INIT ALL
const cursor = new Cursor(document.querySelector(".cursor"));
const toggle = new ThemeToggle(".theme-toggle");
const overlayEl = document.querySelector('.overlay');
const overlay = new Overlay(overlayEl, { rows: 8, columns: 14 });
const landingView = document.querySelector('.landing-view');
const portfolioView = document.querySelector('.portfolio-view');
const triggers = document.querySelectorAll('.trigger-transition');
const backButton = document.querySelectorAll('.back-to-home-trigger');
let isAnimating = false;

// 3. BURGER MENU LOGIC
const burgerBtn = document.querySelector('.burger-menu');
const nav = document.querySelector('.header-nav');
const navLinks = document.querySelectorAll('.nav-item');

if (burgerBtn) {
    burgerBtn.addEventListener('click', () => {
        burgerBtn.classList.toggle('open');
        nav.classList.toggle('nav-open');
    });
}

// Close menu when clicking links
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        burgerBtn.classList.remove('open');
        nav.classList.remove('nav-open');
    });
});

// 4. TRANSITIONS
triggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isAnimating) return;
        isAnimating = true;
        overlay.show({ transformOrigin: '50% 0%', duration: 0.2, ease: 'power3.inOut', stagger: index => 0.005 * index }).then(() => {
            landingView.classList.add('view--hidden');
            portfolioView.classList.add('view--active');
            setBodyHeight();
            window.scrollTo(0, 0); endY = 0; startY = 0; 
            overlay.hide({ transformOrigin: '50% 100%', duration: 0.2, ease: 'power2', stagger: index => 0.005 * index }).then(() => isAnimating = false);
        });
    });
});

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

window.addEventListener("pointermove", (event) => {
    const x = event.clientX; const y = event.clientY;
    cursor.updateTargetPosition(x, y);
});
gsap.ticker.add(() => { cursor.update(); });

window.addEventListener('load', () => { setBodyHeight(); updateScroll(); });
window.addEventListener('scroll', startScroll, false);
const observer = new ResizeObserver(() => { setBodyHeight(); });
observer.observe(scrollContent);