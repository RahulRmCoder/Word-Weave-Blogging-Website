document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form[action="/auth/signup"]');
    
    if (!form) return; // Exit if not on signup page
    
    const nameInput = form.querySelector('input[name="name"]');
    const emailInput = form.querySelector('input[name="email"]');
    const passwordInput = form.querySelector('input[name="password"]');
    const confirmPasswordInput = form.querySelector('input[name="confirmPassword"]');
    
    // Create validation message elements
    function createValidationMessage(input, message) {
        const validationMessage = document.createElement('div');
        validationMessage.className = 'validation-message';
        validationMessage.textContent = message;
        input.insertAdjacentElement('afterend', validationMessage);
        return validationMessage;
    }
    
    // Create validation messages
    const nameMessage = createValidationMessage(nameInput, 'Please enter your name.');
    const emailMessage = createValidationMessage(emailInput, 'Please enter a valid email address.');
    const passwordMessage = createValidationMessage(passwordInput, 
        'Password must be at least 8 characters and include letters, numbers, and special characters.');
    const confirmPasswordMessage = createValidationMessage(confirmPasswordInput, 'Passwords do not match.');
    
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
    
    // Password validation function
    function validatePassword(password) {
        // At least 8 characters, containing letters, numbers, and special characters
        const lengthRegex = /.{8,}/;
        const letterRegex = /[a-zA-Z]/;
        const numberRegex = /[0-9]/;
        const specialRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
        
        return lengthRegex.test(password) && 
               letterRegex.test(password) && 
               numberRegex.test(password) && 
               specialRegex.test(password);
    }
    
    // Reset all validation messages
    function resetValidation() {
        nameMessage.classList.remove('visible');
        nameInput.classList.remove('error');
        emailMessage.classList.remove('visible');
        emailInput.classList.remove('error');
        passwordMessage.classList.remove('visible');
        passwordInput.classList.remove('error');
        confirmPasswordMessage.classList.remove('visible');
        confirmPasswordInput.classList.remove('error');
        generalErrorArea.style.display = 'none';
        generalErrorArea.textContent = '';
        
        // Reset success classes too
        passwordMessage.classList.remove('validation-success');
    }
    
    // Display error message
    function showError(field, message) {
        if (field === 'name') {
            nameMessage.textContent = message;
            nameMessage.classList.add('visible');
            nameInput.classList.add('error');
        } else if (field === 'email') {
            emailMessage.textContent = message;
            emailMessage.classList.add('visible');
            emailInput.classList.add('error');
        } else if (field === 'password') {
            passwordMessage.textContent = message;
            passwordMessage.classList.add('visible');
            passwordMessage.classList.remove('validation-success');
            passwordInput.classList.add('error');
        } else if (field === 'confirmPassword') {
            confirmPasswordMessage.textContent = message;
            confirmPasswordMessage.classList.add('visible');
            confirmPasswordInput.classList.add('error');
        } else {
            generalErrorArea.textContent = message;
            generalErrorArea.style.display = 'block';
        }
    }
    
    // Real-time name validation
    nameInput.addEventListener('input', function() {
        if (this.value.trim() === '') {
            nameMessage.classList.add('visible');
            this.classList.add('error');
        } else {
            nameMessage.classList.remove('visible');
            this.classList.remove('error');
        }
    });
    
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
    
    // Real-time password validation with strength indicator
    passwordInput.addEventListener('input', function() {
        if (this.value.trim() === '') {
            passwordMessage.classList.remove('visible');
            passwordMessage.classList.remove('validation-success');
            this.classList.remove('error');
        } else if (!validatePassword(this.value)) {
            passwordMessage.classList.add('visible');
            passwordMessage.classList.remove('validation-success');
            passwordMessage.textContent = 'Password must be at least 8 characters and include letters, numbers, and special characters.';
            this.classList.add('error');
        } else {
            passwordMessage.classList.add('visible');
            passwordMessage.textContent = 'Password strength: Good';
            passwordMessage.classList.add('validation-success');
            this.classList.remove('error');
        }
        
        // Check password confirmation if it has a value
        if (confirmPasswordInput.value.trim() !== '') {
            if (this.value !== confirmPasswordInput.value) {
                confirmPasswordMessage.classList.add('visible');
                confirmPasswordInput.classList.add('error');
            } else {
                confirmPasswordMessage.classList.remove('visible');
                confirmPasswordInput.classList.remove('error');
            }
        }
    });
    
    // Real-time confirm password validation
    confirmPasswordInput.addEventListener('input', function() {
        if (this.value.trim() === '') {
            confirmPasswordMessage.classList.remove('visible');
            this.classList.remove('error');
        } else if (this.value !== passwordInput.value) {
            confirmPasswordMessage.classList.add('visible');
            this.classList.add('error');
        } else {
            confirmPasswordMessage.classList.remove('visible');
            this.classList.remove('error');
        }
    });
    
    // Form submission handling with fetch
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        resetValidation();
        
        let isValid = true;
        
        // Validate name
        if (nameInput.value.trim() === '') {
            showError('name', 'Please enter your name.');
            isValid = false;
        }
        
        // Validate email
        if (!validateEmail(emailInput.value)) {
            showError('email', 'Please enter a valid email address.');
            isValid = false;
        }
        
        // Validate password
        if (!validatePassword(passwordInput.value)) {
            showError('password', 'Password must be at least 8 characters and include letters, numbers, and special characters.');
            isValid = false;
        }
        
        // Validate password confirmation
        if (passwordInput.value !== confirmPasswordInput.value) {
            showError('confirmPassword', 'Passwords do not match.');
            isValid = false;
        }
        
        // If form is valid, submit via fetch
        if (isValid) {
            fetch('/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: nameInput.value,
                    email: emailInput.value,
                    password: passwordInput.value,
                    confirmPassword: confirmPasswordInput.value
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