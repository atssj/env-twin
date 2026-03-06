/**
 * env-twin Docs - Modern Interactive Experience
 * Enhanced UX with micro-interactions, accessibility, and performance
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    initTheme();
    initHeader();
    initReadingProgress();
    initBackToTop();
    initMobileNavigation();
    initTabs();
    initFAQ();
    initCodeBlocks();
    initScrollAnimations();
    initSmoothScroll();
    initMagneticButtons();
    initUtilities();
});

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Throttle function execution
 */
function throttle(func, limit) {
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
 * Theme Toggle with Persistence
 */
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    if (!themeToggle) return;

    const updateThemeIcon = (theme) => {
        const icon = themeToggle.querySelector('i');
        if (!icon) return;

        // Add rotation animation
        icon.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        icon.style.transform = 'rotate(180deg) scale(0.8)';
        icon.style.opacity = '0';

        setTimeout(() => {
            icon.className = theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
            icon.style.transform = 'rotate(0deg) scale(1)';
            icon.style.opacity = '1';
        }, 250);
    };

    // Initialize icon
    const currentTheme = htmlElement.getAttribute('data-theme') || 'light';
    updateThemeIcon(currentTheme);

    // Theme toggle click handler
    themeToggle.addEventListener('click', (e) => {
        // Add ripple effect
        addRippleEffect(themeToggle, e);

        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);

        // Announce theme change to screen readers
        announce(`Theme changed to ${newTheme} mode`);
    });
}

/**
 * Header scroll effects
 */
function initHeader() {
    const header = document.querySelector('header');
    if (!header) return;

    let lastScrollY = 0;
    let ticking = false;

    const updateHeader = () => {
        const scrollY = window.scrollY;

        // Add scrolled class for shadow
        if (scrollY > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Optional: Hide/show header on scroll direction (commented out by default)
        // if (scrollY > lastScrollY && scrollY > 100) {
        //     header.style.transform = 'translateY(-100%)';
        // } else {
        //     header.style.transform = 'translateY(0)';
        // }

        lastScrollY = scrollY;
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }, { passive: true });

    updateHeader();
}

/**
 * Reading Progress Indicator
 */
function initReadingProgress() {
    // Create progress bar element
    const progressBar = document.createElement('div');
    progressBar.className = 'reading-progress';
    progressBar.setAttribute('role', 'progressbar');
    progressBar.setAttribute('aria-label', 'Reading progress');
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
    progressBar.setAttribute('aria-valuenow', '0');
    document.body.appendChild(progressBar);

    let ticking = false;

    const updateProgress = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', Math.round(progress));

        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateProgress);
            ticking = true;
        }
    }, { passive: true });
}

/**
 * Back to Top Button
 */
function initBackToTop() {
    const button = document.createElement('button');
    button.className = 'back-to-top';
    button.innerHTML = '<i class="ri-arrow-up-line"></i>';
    button.setAttribute('aria-label', 'Back to top');
    button.setAttribute('title', 'Back to top');
    document.body.appendChild(button);

    const toggleVisibility = throttle(() => {
        const scrollY = window.scrollY;
        if (scrollY > 400) {
            button.classList.add('visible');
        } else {
            button.classList.remove('visible');
        }
    }, 100);

    window.addEventListener('scroll', toggleVisibility, { passive: true });

    button.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: prefersReducedMotion() ? 'auto' : 'smooth'
        });
        announce('Returned to top of page');
    });
}

/**
 * Mobile Navigation Toggle
 */
function initMobileNavigation() {
    const toggle = document.querySelector('.mobile-nav-toggle');
    const navActions = document.getElementById('nav-actions');

    if (!toggle || !navActions) return;

    const closeNav = () => {
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        navActions.classList.remove('active');
    };

    const openNav = () => {
        toggle.classList.add('active');
        toggle.setAttribute('aria-expanded', 'true');
        navActions.classList.add('active');
    };

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
            closeNav();
        } else {
            openNav();
        }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!toggle.contains(e.target) && !navActions.contains(e.target)) {
            closeNav();
        }
    });

    // Close when clicking a link inside nav-actions
    navActions.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeNav);
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
            closeNav();
        }
    });

    // Close on window resize if above mobile breakpoint
    window.addEventListener('resize', throttle(() => {
        if (window.innerWidth > 768 && toggle.getAttribute('aria-expanded') === 'true') {
            closeNav();
        }
    }, 100));
}

/**
 * Tab Switching with Enhanced Animations
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    if (!tabButtons.length) return;

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            const newPane = document.getElementById(tabId);
            const currentPane = document.querySelector('.tab-pane.active');

            if (!newPane || newPane === currentPane) return;

            // Update active states for buttons
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });

            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');

            // Handle pane transition
            if (currentPane) {
                // Fade out current pane
                currentPane.style.opacity = '0';
                currentPane.style.transform = 'translateY(-10px)';

                // Wait for fade out to complete before switching
                setTimeout(() => {
                    currentPane.classList.remove('active');
                    currentPane.hidden = true;

                    // Activate new pane
                    newPane.classList.add('active');
                    newPane.hidden = false;

                    // Trigger reflow to ensure transition works
                    void newPane.offsetHeight;

                    // Fade in new pane
                    newPane.style.opacity = '1';
                    newPane.style.transform = 'translateY(0)';
                }, prefersReducedMotion() ? 0 : 150);
            } else {
                // No current pane, just show the new one
                newPane.classList.add('active');
                newPane.hidden = false;
                newPane.style.opacity = '1';
                newPane.style.transform = 'translateY(0)';
            }
        });
    });

    // Initialize hidden attribute for accessibility
    tabPanes.forEach(pane => {
        if (!pane.classList.contains('active')) {
            pane.hidden = true;
        }
    });
}

/**
 * FAQ Accordion with Spring Physics
 */
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        if (!questionBtn) return;

        questionBtn.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');

            // Close all other items (accordion behavior)
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('open')) {
                    otherItem.classList.remove('open');
                    const otherBtn = otherItem.querySelector('.faq-question');
                    if (otherBtn) {
                        otherBtn.setAttribute('aria-expanded', 'false');
                    }
                }
            });

            // Toggle current item
            if (isOpen) {
                item.classList.remove('open');
                questionBtn.setAttribute('aria-expanded', 'false');
            } else {
                item.classList.add('open');
                questionBtn.setAttribute('aria-expanded', 'true');

                // Announce to screen readers
                const answer = item.querySelector('.faq-answer p');
                if (answer) {
                    announce(`Expanded: ${questionBtn.textContent.trim()}`);
                }
            }
        });

        // Keyboard support
        questionBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                questionBtn.click();
            }
        });
    });
}

/**
 * Enhanced Code Blocks with Terminal Chrome
 */
function initCodeBlocks() {
    const codeBlocks = document.querySelectorAll('.code-block');

    codeBlocks.forEach(block => {
        const code = block.querySelector('code');
        const copyBtn = block.querySelector('.copy-btn');

        if (!code || !copyBtn) return;

        // Add terminal chrome
        if (!block.querySelector('.code-header')) {
            const header = document.createElement('div');
            header.className = 'code-header';

            const dots = document.createElement('div');
            dots.className = 'code-dots';
            dots.innerHTML = '<span></span><span></span><span></span>';

            const title = document.createElement('span');
            title.className = 'code-title';
            title.textContent = 'terminal';

            header.appendChild(dots);
            header.appendChild(title);

            // Wrap code content
            const content = document.createElement('div');
            content.className = 'code-content';
            content.appendChild(code);

            block.insertBefore(header, block.firstChild);
            block.appendChild(content);
        }

        // Enhance copy button
        copyBtn.addEventListener('click', async (e) => {
            const codeText = code.textContent;
            const originalHTML = copyBtn.innerHTML;

            // Add ripple effect
            addRippleEffect(copyBtn, e, 'rgba(16, 185, 129, 0.3)');

            try {
                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(codeText);
                } else {
                    // Fallback
                    const textArea = document.createElement('textarea');
                    textArea.value = codeText;
                    textArea.style.cssText = 'position:fixed;left:-9999px;';
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                }

                // Show success state
                copyBtn.innerHTML = '<i class="ri-check-line"></i> Copied!';
                copyBtn.classList.add('copied');
                announce('Code copied to clipboard');

                setTimeout(() => {
                    copyBtn.innerHTML = originalHTML;
                    copyBtn.classList.remove('copied');
                }, 2000);

            } catch (err) {
                console.error('Copy failed:', err);
                copyBtn.innerHTML = '<i class="ri-error-warning-line"></i> Failed';
                setTimeout(() => {
                    copyBtn.innerHTML = originalHTML;
                }, 2000);
            }
        });
    });

    // Expose copy function globally for inline handlers
    window.copyToClipboard = async function(button) {
        const codeBlock = button.closest('.code-block');
        const code = codeBlock?.querySelector('code');
        if (!code) return;

        button.click();
    };
}

/**
 * Scroll-Triggered Animations with Intersection Observer
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll(
        '.feature-card, section h2, .process-card, .faq-item'
    );

    if (!animatedElements.length) return;

    // If reduced motion is preferred, show all elements immediately
    if (prefersReducedMotion()) {
        animatedElements.forEach(el => {
            el.classList.add('animate-visible');
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
        return;
    }

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -20px 0px',
        threshold: 0.05
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                el.classList.add('animate-visible');
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';

                // Stagger children if it's a container
                const children = el.querySelectorAll('.feature-icon, h3, p');
                children.forEach((child, index) => {
                    child.style.animationDelay = `${index * 100}ms`;
                    child.classList.add('animate-in');
                });

                observer.unobserve(el);
            }
        });
    }, observerOptions);

    animatedElements.forEach((el, index) => {
        // Check if element is already in viewport
        const rect = el.getBoundingClientRect();
        const isInViewport = rect.top <= (window.innerHeight || document.documentElement.clientHeight) && rect.bottom >= 0;

        if (isInViewport && rect.top < window.innerHeight) {
            // Element is already visible, animate immediately
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            el.classList.add('animate-visible');
        } else {
            // Set initial state for elements not yet in viewport
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 50}ms,
                                   transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 50}ms`;
            observer.observe(el);
        }
    });

    // Fallback: Ensure all elements become visible after a timeout in case observer fails
    setTimeout(() => {
        animatedElements.forEach(el => {
            if (!el.classList.contains('animate-visible')) {
                el.classList.add('animate-visible');
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }
        });
    }, 3000);
}

/**
 * Smooth Scroll for Anchor Links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || !href) return;

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();

            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.scrollY - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: prefersReducedMotion() ? 'auto' : 'smooth'
            });

            // Update URL without jump
            history.pushState(null, null, href);
        });
    });
}

/**
 * Magnetic Button Effects
 */
function initMagneticButtons() {
    if (prefersReducedMotion() || window.matchMedia('(pointer: coarse)').matches) {
        return;
    }

    const magneticElements = document.querySelectorAll('.btn, .icon-btn');

    magneticElements.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
}

/**
 * Add Ripple Effect to Buttons
 */
function addRippleEffect(button, event, color = 'rgba(255, 255, 255, 0.3)') {
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

/**
 * Screen Reader Announcements
 */
function announce(message, priority = 'polite') {
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
 * Initialize Utility Enhancements
 */
function initUtilities() {
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
            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            .animate-in {
                animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }
        `;
        document.head.appendChild(style);
    }

    // Add will-change to animated elements
    document.querySelectorAll('.feature-card, .faq-item').forEach(el => {
        el.style.willChange = 'transform, opacity';
    });
}

/**
 * Handle reduced motion preference changes
 */
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    if (e.matches) {
        // Disable animations
        document.querySelectorAll('.animate-visible').forEach(el => {
            el.style.transition = 'none';
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
    }
});
