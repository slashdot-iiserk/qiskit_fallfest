// ==================== NAVIGATION ==================== 
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// ==================== PLATFORM SELECTOR ==================== 
const platformButtons = document.querySelectorAll('.platform-btn');
const platformContents = document.querySelectorAll('.platform-content');

platformButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        platformButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Get platform name
        const platform = button.getAttribute('data-platform');
        
        // Hide all platform content
        platformContents.forEach(content => content.classList.remove('active'));
        
        // Show selected platform content
        const selectedContent = document.querySelector(`.${platform}-content`);
        if (selectedContent) {
            selectedContent.classList.add('active');
        }
    });
});

// ==================== METHOD TABS ==================== 
const methodTabs = document.querySelectorAll('.method-tab');

methodTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Get the parent guide-section
        const parentSection = tab.closest('.guide-section');
        if (!parentSection) return;
        
        // Get all tabs and contents in this section
        const sectionTabs = parentSection.querySelectorAll('.method-tab');
        const sectionContents = parentSection.querySelectorAll('.method-content');
        
        // Remove active class from all tabs in this section
        sectionTabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Get method name
        const method = tab.getAttribute('data-method');
        
        // Hide all method content in this section
        sectionContents.forEach(content => content.classList.remove('active'));
        
        // Show selected method content
        const selectedContent = parentSection.querySelector(`.${method}-content`);
        if (selectedContent) {
            selectedContent.classList.add('active');
        }
    });
});

// ==================== COPY CODE FUNCTIONALITY ==================== 
// Add copy buttons to code blocks
document.addEventListener('DOMContentLoaded', () => {
    const codeBlocks = document.querySelectorAll('pre code');
    
    codeBlocks.forEach(codeBlock => {
        const pre = codeBlock.parentElement;
        
        // Create copy button
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = '<i class="fas fa-copy"></i>';
        copyButton.title = 'Copy code';
        
        // Add copy button styling
        copyButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(99, 102, 241, 0.8);
            border: none;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
            opacity: 0;
            z-index: 10;
        `;
        
        // Make pre position relative for absolute positioning of button
        pre.style.position = 'relative';
        
        // Show button on hover
        pre.addEventListener('mouseenter', () => {
            copyButton.style.opacity = '1';
        });
        
        pre.addEventListener('mouseleave', () => {
            copyButton.style.opacity = '0';
        });
        
        // Copy functionality
        copyButton.addEventListener('click', async () => {
            const code = codeBlock.textContent;
            
            try {
                await navigator.clipboard.writeText(code);
                
                // Change button to show success
                copyButton.innerHTML = '<i class="fas fa-check"></i>';
                copyButton.style.background = 'rgba(16, 185, 129, 0.8)';
                
                // Reset after 2 seconds
                setTimeout(() => {
                    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                    copyButton.style.background = 'rgba(99, 102, 241, 0.8)';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = code;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                
                try {
                    document.execCommand('copy');
                    copyButton.innerHTML = '<i class="fas fa-check"></i>';
                    copyButton.style.background = 'rgba(16, 185, 129, 0.8)';
                    
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                        copyButton.style.background = 'rgba(99, 102, 241, 0.8)';
                    }, 2000);
                } catch (err2) {
                    console.error('Fallback copy failed:', err2);
                }
                
                document.body.removeChild(textarea);
            }
        });
        
        pre.appendChild(copyButton);
    });
});

// ==================== SMOOTH SCROLLING ==================== 
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        
        if (target) {
            const headerOffset = 100;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ==================== SCROLL ANIMATIONS ==================== 
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all guide sections
document.querySelectorAll('.guide-section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});

// ==================== PLATFORM AUTO-DETECTION ==================== 
function detectPlatform() {
    const userAgent = window.navigator.userAgent;
    const platform = window.navigator.platform;
    const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
    const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
    
    let detectedPlatform = 'linux'; // default
    
    if (macosPlatforms.indexOf(platform) !== -1) {
        detectedPlatform = 'macos';
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
        detectedPlatform = 'windows';
    }
    
    return detectedPlatform;
}

// Auto-select platform on page load
window.addEventListener('DOMContentLoaded', () => {
    const platform = detectPlatform();
    const platformButton = document.querySelector(`[data-platform="${platform}"]`);
    
    if (platformButton) {
        // Remove active from default
        document.querySelectorAll('.platform-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.platform-content').forEach(content => content.classList.remove('active'));
        
        // Activate detected platform
        platformButton.classList.add('active');
        const platformContent = document.querySelector(`.${platform}-content`);
        if (platformContent) {
            platformContent.classList.add('active');
        }
    }
});

// ==================== HIGHLIGHT CURRENT SECTION IN TOC ==================== 
// Add "Back to Top" button
const backToTopButton = document.createElement('button');
backToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
backToTopButton.className = 'back-to-top';
backToTopButton.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #ec4899);
    border: none;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    box-shadow: 0 5px 20px rgba(99, 102, 241, 0.3);
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    z-index: 1000;
`;

document.body.appendChild(backToTopButton);

// Show/hide back to top button
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        backToTopButton.style.opacity = '1';
        backToTopButton.style.visibility = 'visible';
    } else {
        backToTopButton.style.opacity = '0';
        backToTopButton.style.visibility = 'hidden';
    }
});

backToTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

backToTopButton.addEventListener('mouseenter', () => {
    backToTopButton.style.transform = 'translateY(-5px)';
});

backToTopButton.addEventListener('mouseleave', () => {
    backToTopButton.style.transform = 'translateY(0)';
});
