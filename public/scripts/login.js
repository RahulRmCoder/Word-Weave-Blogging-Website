document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form[action="/auth/login"]');
    
    if (!form) return; // Exit if not on login page
    
    const emailInput = form.querySelector('input[name="email"]');
    const passwordInput = form.querySelector('input[name="password"]');
    
    // Create validation message elements
    function createValidationMessage(input, message) {
        const validationMessage = document.createElement('div');
        validationMessage.className = 'validation-message';
        validationMessage.textContent = message;
        input.insertAdjacentElement('afterend', validationMessage);
        return validationMessage;
    }
    
    // Create validation messages
    const emailMessage = createValidationMessage(emailInput, 'Please enter a valid email address.');
    const passwordMessage = createValidationMessage(passwordInput, 'Please enter your password.');
    
    // Add a general error message area
    const generalErrorArea = document.createElement('div');
    generalErrorArea.className = 'general-error';
    generalErrorArea.style.display = 'none';
    form.insertAdjacentElement('afterbegin', generalErrorArea);
    
    // Email validation function
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Reset all validation messages
    function resetValidation() {
        emailMessage.classList.remove('visible');
        emailInput.classList.remove('error');
        passwordMessage.classList.remove('visible');
        passwordInput.classList.remove('error');
        generalErrorArea.style.display = 'none';
        generalErrorArea.textContent = '';
    }
    
    // Display error message
    function showError(field, message) {
        if (field === 'email') {
            emailMessage.textContent = message;
            emailMessage.classList.add('visible');
            emailInput.classList.add('error');
        } else if (field === 'password') {
            passwordMessage.textContent = message;
            passwordMessage.classList.add('visible');
            passwordInput.classList.add('error');
        } else {
            generalErrorArea.textContent = message;
            generalErrorArea.style.display = 'block';
        }
    }
    
    // Real-time email validation
    emailInput.addEventListener('input', function() {
        if (this.value.trim() === '') {
            emailMessage.classList.remove('visible');
            this.classList.remove('error');
        } else if (!validateEmail(this.value)) {
            emailMessage.textContent = 'Please enter a valid email address.';
            emailMessage.classList.add('visible');
            this.classList.add('error');
        } else {
            emailMessage.classList.remove('visible');
            this.classList.remove('error');
        }
    });
    
    // Real-time password validation (just checking if empty)
    passwordInput.addEventListener('input', function() {
        if (this.value.trim() === '') {
            passwordMessage.textContent = 'Please enter your password.';
            passwordMessage.classList.add('visible');
            this.classList.add('error');
        } else {
            passwordMessage.classList.remove('visible');
            this.classList.remove('error');
        }
    });
    
    // Form submission with fetch
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        resetValidation();
        
        let isValid = true;
        
        // Validate email
        if (!validateEmail(emailInput.value)) {
            showError('email', 'Please enter a valid email address.');
            isValid = false;
        }
        
        // Validate password (just checking if empty)
        if (passwordInput.value.trim() === '') {
            showError('password', 'Please enter your password.');
            isValid = false;
        }
        
        // If form is valid, submit via fetch
        if (isValid) {
            fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: emailInput.value,
                    password: passwordInput.value
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    window.location.href = data.redirect;
                } else {
                    // Display the appropriate error message
                    showError(data.field || 'general', data.message);
                }
            })
            .catch(error => {
                showError('general', 'Connection error. Please try again later.');
                console.error('Error:', error);
            });
        }
    });
});