document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    /**
     * Updates the theme icon based on the current theme.
     * @param {string} theme - 'light' or 'dark'
     */
    const updateThemeIcon = (theme) => {
        const icon = themeToggle.querySelector('i');
        if (theme === 'dark') {
            icon.className = 'ri-sun-line';
        } else {
            icon.className = 'ri-moon-line';
        }
    };

    // Initialize icon based on current data-theme (set by head script)
    updateThemeIcon(htmlElement.getAttribute('data-theme'));

    // Theme Toggle Logic
    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    // Sticky Header Shadow on Scroll
    const header = document.querySelector('header');
    const handleScroll = () => {
        if (window.scrollY > 10) {
            header.style.boxShadow = 'var(--shadow)';
            header.style.borderBottomColor = 'transparent';
        } else {
            header.style.boxShadow = 'none';
            header.style.borderBottomColor = 'var(--border)';
        }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check on load

    // Tab Switching Logic (Installation Section)
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');

            // Update active tab button
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');

            // Update active tab content pane
            tabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Copy to Clipboard Logic for Code Blocks
    window.copyToClipboard = (button) => {
        const codeBlock = button.closest('.code-block');
        const code = codeBlock.querySelector('code').textContent;
        const originalContent = button.innerHTML;

        if (!navigator.clipboard) {
            fallbackCopyTextToClipboard(code, button, originalContent);
            return;
        }

        navigator.clipboard.writeText(code).then(() => {
            showCopiedState(button, originalContent);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            button.innerHTML = '<i class="ri-error-warning-line"></i> Error';
            setTimeout(() => {
                button.innerHTML = originalContent;
            }, 2000);
        });
    };

    function fallbackCopyTextToClipboard(text, button, originalContent) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showCopiedState(button, originalContent);
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
    }

    function showCopiedState(button, originalContent) {
        button.innerHTML = '<i class="ri-check-line"></i> Copied!';
        button.classList.add('copied');
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.classList.remove('copied');
        }, 2000);
    }

    // FAQ Accordion Logic
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        questionBtn.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            
            // Close other items for a cleaner accordion effect
            faqItems.forEach(i => {
                i.classList.remove('open');
                i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            });
            
            // Toggle the clicked item
            if (!isOpen) {
                item.classList.add('open');
                questionBtn.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // Smooth Scroll for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
