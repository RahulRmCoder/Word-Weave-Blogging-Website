document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    
    form.addEventListener('submit', function(event) {
        const checkboxes = document.querySelectorAll('input[name="interests"]:checked');
        
        if (checkboxes.length === 0) {
            event.preventDefault();
            alert('Please select at least one interest to continue.');
        }
    });
});