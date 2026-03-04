/**
 * Utility functions for env-twin docs
 * Modern helper utilities for animations, accessibility, and performance
 */

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function}
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function}
 */
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Calculate scroll progress (0-100)
 * @returns {number}
 */
export function getScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    return docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
}

/**
 * Intersection Observer factory with default options
 * @param {Function} callback - Callback when element intersects
 * @param {Object} options - IntersectionObserver options
 * @returns {IntersectionObserver}
 */
export function createObserver(callback, options = {}) {
    const defaultOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1,
        ...options
    };

    if (prefersReducedMotion()) {
        // If reduced motion is preferred, immediately call callback for all elements
        return {
            observe: (element) => callback([{ target: element, isIntersecting: true }]),
            unobserve: () => {},
            disconnect: () => {}
        };
    }

    return new IntersectionObserver(callback, defaultOptions);
}

/**
 * Animate elements when they come into view
 * @param {string} selector - CSS selector for elements to animate
 * @param {string} animationClass - Class to add when visible
 * @param {Object} options - Observer options
 */
export function animateOnScroll(selector, animationClass = 'is-visible', options = {}) {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;

    const observer = createObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add(animationClass);
                // Optionally unobserve after animation
                if (options.once !== false) {
                    observer.unobserve(entry.target);
                }
            } else if (options.once === false) {
                entry.target.classList.remove(animationClass);
            }
        });
    }, options);

    elements.forEach(el => observer.observe(el));
    return observer;
}

/**
 * Stagger animation delays for child elements
 * @param {NodeList} elements - Elements to stagger
 * @param {number} baseDelay - Base delay in ms
 * @param {number} increment - Delay increment in ms
 */
export function staggerAnimations(elements, baseDelay = 100, increment = 100) {
    elements.forEach((el, index) => {
        el.style.animationDelay = `${baseDelay + (index * increment)}ms`;
    });
}

/**
 * Trap focus within a modal/container
 * @param {HTMLElement} container - Container element
 * @param {HTMLElement} [focusAfterClose] - Element to focus when closing
 */
export function trapFocus(container, focusAfterClose = null) {
    const focusableElements = container.querySelectorAll(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleTabKey(e) {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    }

    container.addEventListener('keydown', handleTabKey);
    firstFocusable?.focus();

    return () => {
        container.removeEventListener('keydown', handleTabKey);
        focusAfterClose?.focus();
    };
}

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} [priority='polite'] - Announcement priority
 */
export function announce(message, priority = 'polite') {
    let liveRegion = document.getElementById(`aria-live-${priority}`);

    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = `aria-live-${priority}`;
        liveRegion.setAttribute('aria-live', priority);
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(liveRegion);
    }

    liveRegion.textContent = message;
    setTimeout(() => {
        liveRegion.textContent = '';
    }, 1000);
}

/**
 * Magnetic button effect - CSS-based approach
 * @param {HTMLElement} button - Button element
 * @param {number} strength - Pull strength (0-1)
 */
export function addMagneticEffect(button, strength = 0.3) {
    if (prefersReducedMotion() || window.matchMedia('(pointer: coarse)').matches) {
        return; // Skip on touch devices or reduced motion
    }

    let rafId = null;
    let isHovering = false;

    const handleMouseMove = (e) => {
        if (!isHovering) return;

        if (rafId) cancelAnimationFrame(rafId);

        rafId = requestAnimationFrame(() => {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            button.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
        });
    };

    const handleMouseEnter = () => {
        isHovering = true;
        button.style.transition = 'transform 0.1s ease-out';
    };

    const handleMouseLeave = () => {
        isHovering = false;
        button.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        button.style.transform = 'translate(0, 0)';
    };

    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);
    button.addEventListener('mousemove', handleMouseMove);

    return () => {
        button.removeEventListener('mouseenter', handleMouseEnter);
        button.removeEventListener('mouseleave', handleMouseLeave);
        button.removeEventListener('mousemove', handleMouseMove);
        if (rafId) cancelAnimationFrame(rafId);
    };
}

/**
 * Smooth scroll to element
 * @param {string|HTMLElement} target - Target element or selector
 * @param {Object} options - Scroll options
 */
export function smoothScrollTo(target, options = {}) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) return;

    const defaultOptions = {
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
        offset: 80, // Account for sticky header
        ...options
    };

    const targetPosition = element.getBoundingClientRect().top + window.scrollY - defaultOptions.offset;

    window.scrollTo({
        top: targetPosition,
        behavior: defaultOptions.behavior
    });
}

/**
 * Copy text to clipboard with fallback
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }

        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            opacity: 0;
        `;
        document.body.appendChild(textArea);
        textArea.select();

        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
    } catch (err) {
        console.error('Copy failed:', err);
        return false;
    }
}

/**
 * Add ripple effect to button click
 * @param {HTMLElement} button - Button element
 * @param {MouseEvent} event - Click event
 * @param {string} color - Ripple color
 */
export function addRippleEffect(button, event, color = 'rgba(255, 255, 255, 0.3)') {
    if (prefersReducedMotion()) return;

    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: ${color};
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
    `;

    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
}

// Add ripple keyframe if not present
if (!document.getElementById('ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(2);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Initialize all utility enhancements
 * Call this after DOM is ready
 */
export function initUtilities() {
    // Add will-change to animated elements for GPU acceleration
    document.querySelectorAll('[class*="animate"]').forEach(el => {
        el.classList.add('will-animate');
    });

    // Add contain-layout to cards for performance
    document.querySelectorAll('.feature-card, .faq-item').forEach(el => {
        el.classList.add('contain-layout');
    });
}
