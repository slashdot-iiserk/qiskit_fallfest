// Registration Form JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    const successMessage = document.getElementById('successMessage');

    // Form validation
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        if (validateForm()) {
            // Simulate form submission
            submitForm();
        }
    });

    // Real-time validation
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });

        input.addEventListener('input', function() {
            clearFieldError(this);
        });
    });

    // Rating scale interaction
    const ratingOptions = document.querySelectorAll('.rating-option');
    ratingOptions.forEach(option => {
        option.addEventListener('click', function() {
            const ratingContainer = this.closest('.rating-container');
            ratingContainer.querySelectorAll('.rating-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
        });
    });
});

function validateForm() {
    let isValid = true;

    // Validate required fields
    const requiredFields = [
        { id: 'name', errorId: 'nameError', message: 'Name is required' },
        { id: 'email', errorId: 'emailError', message: 'Valid email is required' },
        { id: 'rollNo', errorId: 'rollNoError', message: 'Roll number is required' },
        { id: 'phone', errorId: 'phoneError', message: 'Phone number is required' }
    ];

    requiredFields.forEach(field => {
        if (!validateField(document.getElementById(field.id))) {
            isValid = false;
        }
    });

    // Validate email format
    const email = document.getElementById('email');
    if (email.value && !isValidEmail(email.value)) {
        showError('emailError', 'Please enter a valid email address');
        isValid = false;
    }

    // Validate phone format
    const phone = document.getElementById('phone');
    if (phone.value && !isValidPhone(phone.value)) {
        showError('phoneError', 'Please enter a valid phone number');
        isValid = false;
    }

    // Validate Python comfort level
    const pythonComfort = document.querySelector('input[name="entry.1978928870"]:checked');
    if (!pythonComfort) {
        showError('pythonError', 'Please select your Python comfort level');
        isValid = false;
    } else {
        clearFieldError(document.getElementById('pythonError'));
    }

    // Validate quantum knowledge
    const quantumKnowledge = document.querySelector('input[name="entry.949802710"]:checked');
    if (!quantumKnowledge) {
        showError('quantumError', 'Please select your quantum computing knowledge level');
        isValid = false;
    } else {
        clearFieldError(document.getElementById('quantumError'));
    }

    return isValid;
}

function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;

    if (field.hasAttribute('required') && !value) {
        showError(`${fieldName}Error`, `${field.placeholder || fieldName} is required`);
        return false;
    }

    clearFieldError(field);
    return true;
}

function showError(errorId, message) {
    const errorElement = document.getElementById(errorId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function clearFieldError(field) {
    const errorId = field.name + 'Error';
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    // Check if it's a valid Indian phone number (10 digits)
    return cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone);
}

function submitForm() {
    const form = document.getElementById('registrationForm');

    // Add timestamp to prevent draft conflicts
    const timestampInput = form.querySelector('input[name="submissionTimestamp"]');
    if (timestampInput) {
        timestampInput.value = Date.now().toString();
    }

    // Show loading state
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting to Google Forms...';
    submitBtn.disabled = true;

    // Add a message before redirect
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        text-align: center;
        border: 2px solid #6366f1;
    `;
    messageDiv.innerHTML = `
        <i class="fas fa-paper-plane" style="color: #6366f1; font-size: 24px; margin-bottom: 10px;"></i>
        <h3 style="color: #1f2937; margin: 0 0 10px 0;">Submitting Registration...</h3>
        <p style="color: #6b7280; margin: 0;">Redirecting to Google Forms to complete submission.</p>
    `;
    document.body.appendChild(messageDiv);

    // Submit the form after a short delay to show the message
    setTimeout(() => {
        form.submit();
    }, 1000);
}

function resetForm() {
    const form = document.getElementById('registrationForm');
    const successMessage = document.getElementById('successMessage');

    // Reset form
    form.reset();

    // Clear all errors
    const errorElements = form.querySelectorAll('.form-error');
    errorElements.forEach(error => {
        error.style.display = 'none';
    });

    // Clear rating selections
    const ratingOptions = form.querySelectorAll('.rating-option');
    ratingOptions.forEach(option => {
        option.classList.remove('selected');
    });

    // Hide success message and show form
    successMessage.style.display = 'none';
    form.style.display = 'block';

    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth' });
}

// Phone number formatting
document.getElementById('phone').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 10) {
        value = value.slice(0, 10);
    }
    e.target.value = value;
});

// Name validation (only letters and spaces)
document.getElementById('name').addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    e.target.value = value;
});

// Roll number validation (alphanumeric)
document.getElementById('rollNo').addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
    e.target.value = value;
});

// Google Sign-in helper
function openGoogleSignIn() {
    // Use a simpler continue URL to avoid 400 errors
    const signInUrl = 'https://accounts.google.com/AccountChooser';

    // Open in new tab
    const signInTab = window.open(signInUrl, '_blank');

    // Check if popup blocker prevented opening
    if (!signInTab || signInTab.closed || typeof signInTab.closed == 'undefined') {
        alert('Popup blocked! Please allow popups for this site and try again, or sign in manually at: https://accounts.google.com');
        return;
    }

    // Show instructions
    alert('A new tab has opened for sign-in. Please select your institute email and sign in. You can close the tab after signing in and return here to submit the registration form.');

    // Monitor the tab - when it closes, user has completed sign-in
    const checkClosed = setInterval(() => {
        if (signInTab.closed) {
            clearInterval(checkClosed);
            // Update the UI to show user is ready to submit
            const reminder = document.querySelector('.signin-reminder');
            if (reminder) {
                reminder.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-check-circle" style="color: #059669; font-size: 20px;"></i>
                        <div>
                            <h4 style="color: #059669; margin: 0; font-size: 16px; font-weight: 600;">Signed In Successfully!</h4>
                            <p style="color: #059669; margin: 4px 0 0 0; font-size: 14px;">You can now submit the registration form below.</p>
                        </div>
                    </div>
                `;
                reminder.style.background = 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)';
                reminder.style.borderColor = '#059669';
            }
        }
    }, 1000);
}

// Hamburger Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
});