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
    const pythonComfort = document.querySelector('input[name="entry.2233445566"]:checked');
    if (!pythonComfort) {
        showError('pythonError', 'Please select your Python comfort level');
        isValid = false;
    } else {
        clearFieldError(document.getElementById('pythonError'));
    }

    // Validate quantum knowledge
    const quantumKnowledge = document.querySelector('input[name="entry.3344556677"]:checked');
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

    // Show loading state
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
    submitBtn.disabled = true;

    // Submit the form to Google Forms
    form.submit();

    // Note: Since we're submitting to Google Forms, the page will redirect
    // The success message won't be shown, but the form will be submitted
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