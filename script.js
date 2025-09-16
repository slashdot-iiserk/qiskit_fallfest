// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}));

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Header background change on scroll
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(15, 23, 42, 0.98)';
    } else {
        header.style.background = 'rgba(15, 23, 42, 0.95)';
    }
});

// Registration button functionality
function openRegistration() {
    // For now, show an alert. In a real implementation, this would open a registration form or redirect
    alert('Registration form will open here! 🚀\n\nThis is a demo - in the real implementation, this would redirect to the registration page or open a modal with the registration form.');
    
    // Optional: Add some visual feedback
    const btn = document.querySelector('.register-btn');
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        btn.style.transform = 'scale(1)';
    }, 150);
}

// Intersection Observer for animations
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

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    // Add animation classes to elements
    const animateElements = document.querySelectorAll('.feature, .organizer-card, .schedule-day, .stat');
    
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Schedule day hover effects
document.querySelectorAll('.schedule-day').forEach(day => {
    day.addEventListener('mouseenter', () => {
        day.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    
    day.addEventListener('mouseleave', () => {
        day.style.background = 'rgba(255, 255, 255, 0.05)';
    });
});

// Quantum particle animation on mouse move (for hero section)
document.addEventListener('mousemove', (e) => {
    const particles = document.querySelector('.quantum-particles');
    if (particles) {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        particles.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
    }
});

// Add typing effect to hero title
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Initialize typing effect when page loads
window.addEventListener('load', () => {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.innerHTML;
        typeWriter(heroTitle, originalText, 150);
    }
});

// Add floating animation to organizer cards
document.querySelectorAll('.organizer-card').forEach((card, index) => {
    card.style.animationDelay = `${index * 0.2}s`;
    card.classList.add('float-animation');
});

// CSS for floating animation (added dynamically)
const style = document.createElement('style');
style.textContent = `
    .float-animation {
        animation: float 6s ease-in-out infinite;
    }
    
    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
    }
    
    .organizer-card:nth-child(even) {
        animation-direction: reverse;
    }
`;
document.head.appendChild(style);

// Add parallax effect to sections
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.quantum-circuit, .quantum-visual');
    
    parallaxElements.forEach(element => {
        const speed = 0.5;
        element.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// Add click effect to feature cards
document.querySelectorAll('.feature').forEach(feature => {
    feature.addEventListener('click', () => {
        feature.style.transform = 'translateY(-5px) scale(1.02)';
        setTimeout(() => {
            feature.style.transform = 'translateY(-5px) scale(1)';
        }, 200);
    });
});

// Add ripple effect to buttons
function createRipple(event) {
    const button = event.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
    circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
    circle.classList.add('ripple');
    
    const ripple = button.getElementsByClassName('ripple')[0];
    if (ripple) {
        ripple.remove();
    }
    
    button.appendChild(circle);
}

// Add ripple styles
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    .register-btn {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

// Apply ripple effect to register button
document.querySelector('.register-btn').addEventListener('click', createRipple);

// Add dynamic quantum particle generation
function generateQuantumParticles() {
    const container = document.querySelector('.quantum-particles');
    if (!container) return;
    
    setInterval(() => {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animation = `fadeOut 3s ease-out forwards`;
        
        container.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 3000);
    }, 500);
}

// Add fadeOut animation
const fadeOutStyle = document.createElement('style');
fadeOutStyle.textContent = `
    @keyframes fadeOut {
        0% { opacity: 1; transform: scale(0); }
        50% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(0); }
    }
`;
document.head.appendChild(fadeOutStyle);

// Initialize quantum particles
document.addEventListener('DOMContentLoaded', () => {
    generateQuantumParticles();
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

console.log('🚀 IBM Qiskit Fall Fest 2024 website loaded successfully!');
console.log('🔬 Ready to explore the quantum realm!');

// ==================== ARCHIVE PAGE FUNCTIONALITY ====================

// Gallery filtering functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the archive page
    if (window.location.pathname.includes('archive.html') || document.querySelector('.photo-gallery')) {
        initializeGalleryFilters();
    }
});

function initializeGalleryFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    if (filterButtons.length === 0 || galleryItems.length === 0) {
        return; // Exit if elements don't exist
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter gallery items
            galleryItems.forEach(item => {
                const category = item.getAttribute('data-category');
                
                if (filter === 'all' || category === filter) {
                    item.style.display = 'block';
                    item.classList.remove('hidden');
                    // Add entrance animation
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'scale(1)';
                    }, 100);
                } else {
                    item.classList.add('hidden');
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.8)';
                    // Hide after animation
                    setTimeout(() => {
                        item.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
}

// Material download tracking (for analytics)
function trackDownload(materialName, type) {
    console.log(`📥 Download tracked: ${materialName} (${type})`);
    // In a real implementation, this would send analytics data
    
    // Visual feedback
    const button = event.target.closest('.material-item');
    if (button) {
        button.style.transform = 'translateX(10px)';
        setTimeout(() => {
            button.style.transform = 'translateX(5px)';
        }, 200);
    }
}

// Gallery image viewer (basic implementation)
function openImageViewer(imageSrc, title, description) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'image-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.style.cssText = `
        max-width: 90vw;
        max-height: 90vh;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 2rem;
        text-align: center;
        position: relative;
        transform: scale(0.8);
        transition: transform 0.3s ease;
    `;
    
    modal.innerHTML = `
        <button class="close-modal" style="
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            font-size: 1.2rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.3s ease;
        ">&times;</button>
        <img src="${imageSrc}" alt="${title}" style="
            max-width: 100%;
            max-height: 70vh;
            border-radius: 10px;
            margin-bottom: 1rem;
        ">
        <h3 style="color: white; margin-bottom: 0.5rem; font-size: 1.5rem;">${title}</h3>
        <p style="color: #cbd5e1; font-size: 1rem;">${description}</p>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Animate in
    setTimeout(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1)';
    }, 10);
    
    // Close functionality
    function closeModal() {
        overlay.style.opacity = '0';
        modal.style.transform = 'scale(0.8)';
        setTimeout(() => {
            document.body.removeChild(overlay);
        }, 300);
    }
    
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeModal();
        }
    });
    
    modal.querySelector('.close-modal').addEventListener('click', closeModal);
    
    // ESC key support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// Add click handlers to gallery view buttons
document.addEventListener('DOMContentLoaded', function() {
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const galleryItem = this.closest('.gallery-item');
            const img = galleryItem.querySelector('img');
            const title = galleryItem.querySelector('.gallery-info h3').textContent;
            const description = galleryItem.querySelector('.gallery-info p').textContent;
            
            openImageViewer(img.src, title, description);
        });
    });
});

// Organizer card hover effects
document.addEventListener('DOMContentLoaded', function() {
    const organizerCards = document.querySelectorAll('.organizer-card');
    
    organizerCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            // Add subtle animation to other cards
            organizerCards.forEach(otherCard => {
                if (otherCard !== card) {
                    otherCard.style.opacity = '0.7';
                    otherCard.style.transform = 'scale(0.95)';
                }
            });
        });
        
        card.addEventListener('mouseleave', function() {
            // Reset all cards
            organizerCards.forEach(otherCard => {
                otherCard.style.opacity = '1';
                otherCard.style.transform = 'scale(1)';
            });
        });
    });
});

// Stats animation on scroll
function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalValue = parseInt(target.textContent.replace(/\D/g, ''));
                const suffix = target.textContent.replace(/[\d]/g, '');
                let currentValue = 0;
                const increment = finalValue / 50;
                
                const timer = setInterval(() => {
                    currentValue += increment;
                    if (currentValue >= finalValue) {
                        target.textContent = finalValue + suffix;
                        clearInterval(timer);
                    } else {
                        target.textContent = Math.floor(currentValue) + suffix;
                    }
                }, 40);
                
                observer.unobserve(target);
            }
        });
    });
    
    statNumbers.forEach(stat => observer.observe(stat));
}

// Initialize stats animation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.archive-stats')) {
        animateStats();
    }
});

console.log('📸 Archive page functionality loaded successfully!');