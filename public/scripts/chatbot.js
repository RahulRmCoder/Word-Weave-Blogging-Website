// Blog Assistant Chatbot - Client-side JavaScript

class BlogAssistantChatbot {
    constructor(options = {}) {
        // Configuration options
        this.apiUrl = options.apiUrl || 'http://localhost:5000/api/chat';
        this.sessionId = options.sessionId || `session_${Date.now()}`;
        this.containerSelector = options.containerSelector || 'body';
        
        // DOM elements
        this.chatbotContainer = null;
        this.messagesContainer = null;
        this.inputField = null;
        this.sendButton = null;
        this.chatbotPopup = null;
        
        // State
        this.isOpen = false;
        this.messages = [];
        this.isWaitingForResponse = false;
        
        // Initialize chatbot
        this.init();
    }
    
    init() {
        // Create chatbot HTML structure
        this.createChatbotHTML();
        
        // Add event listeners
        this.addEventListeners();
        
        // Show initial greeting message
        this.addMessage('assistant', 'Hi there! I\'m your blog writing assistant. How can I help you today?');
    }
    
    createChatbotHTML() {
        const chatbotHTML = `
            <div class="chatbot-container">
                <div class="chatbot-button">
                    <span class="chatbot-icon">💬</span>
                </div>
                <div class="chatbot-popup">
                    <div class="chatbot-header">
                        <span>Weave Bot</span>
                        <button class="chatbot-close">✕</button>
                    </div>
                    <div class="chatbot-messages"></div>
                    <div class="chatbot-input-container">
                        <textarea class="chatbot-input" placeholder="Type your message..."></textarea>
                        <button class="chatbot-send">➤</button>
                    </div>
                </div>
                <div class="chatbot-notification">Copied to clipboard</div>
            </div>
        `;
        
        // Append to container
        const container = document.querySelector(this.containerSelector);
        container.insertAdjacentHTML('beforeend', chatbotHTML);
        
        // Store references to DOM elements
        this.chatbotContainer = document.querySelector('.chatbot-container');
        this.chatbotPopup = document.querySelector('.chatbot-popup');
        this.messagesContainer = document.querySelector('.chatbot-messages');
        this.inputField = document.querySelector('.chatbot-input');
        this.sendButton = document.querySelector('.chatbot-send');
        this.notification = document.querySelector('.chatbot-notification');
    }
    
    addEventListeners() {
        // Toggle chatbot on button click
        const chatbotButton = document.querySelector('.chatbot-button');
        chatbotButton.addEventListener('click', () => this.toggleChatbot());
        
        // Close chatbot on close button click
        const closeButton = document.querySelector('.chatbot-close');
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleChatbot(false);
        });
        
        // Send message on button click
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter key (but allow Shift+Enter for new lines)
        this.inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }
    
    toggleChatbot(forceState) {
        this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
        
        if (this.isOpen) {
            this.chatbotPopup.classList.add('active');
            this.inputField.focus();
        } else {
            this.chatbotPopup.classList.remove('active');
        }
    }
    
    addMessage(role, content) {
        // Add to internal messages array
        this.messages.push({ role, content });
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.classList.add('chatbot-message');
        messageElement.classList.add(role);
        messageElement.textContent = content;
        
        // Add copy button for assistant messages
        if (role === 'assistant') {
            const copyButton = document.createElement('button');
            copyButton.classList.add('chatbot-copy-btn');
            copyButton.innerHTML = '📋';
            copyButton.title = 'Copy to clipboard';
            copyButton.addEventListener('click', () => this.copyToClipboard(content, copyButton));
            messageElement.appendChild(copyButton);
        }
        
        // Add to messages container
        this.messagesContainer.appendChild(messageElement);
        
        // Scroll to bottom
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    copyToClipboard(text, button) {
        // Copy the text to clipboard
        navigator.clipboard.writeText(text)
            .then(() => {
                // Show visual feedback
                button.classList.add('copied');
                button.innerHTML = '✓';
                
                // Show notification
                this.showNotification('Copied to clipboard');
                
                // Reset button after 2 seconds
                setTimeout(() => {
                    button.classList.remove('copied');
                    button.innerHTML = '📋';
                }, 2000);
                
                // Also try to copy directly to the blog content
                this.copyToBlogContent(text);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
                this.showNotification('Failed to copy');
            });
    }
    
    copyToBlogContent(text) {
        // Try to find blog content textarea
        const contentTextarea = document.querySelector('textarea[name="content"]');
        
        if (contentTextarea && confirm('Would you like to append this text to your blog content?')) {
            // Append the text to the current content
            const currentContent = contentTextarea.value;
            const newContent = currentContent + (currentContent ? '\n\n' : '') + text;
            
            contentTextarea.value = newContent;
            
            // Trigger an input event to update any listeners
            const inputEvent = new Event('input', { bubbles: true });
            contentTextarea.dispatchEvent(inputEvent);
            
            this.showNotification('Added to blog content');
        }
    }
    
    showNotification(message) {
        // Update notification message
        this.notification.textContent = message;
        
        // Show notification
        this.notification.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            this.notification.classList.remove('show');
        }, 3000);
    }
    
    showTypingIndicator() {
        const typingElement = document.createElement('div');
        typingElement.classList.add('chatbot-typing');
        typingElement.innerHTML = `
            <div class="chatbot-dot"></div>
            <div class="chatbot-dot"></div>
            <div class="chatbot-dot"></div>
        `;
        typingElement.id = 'chatbot-typing-indicator';
        
        this.messagesContainer.appendChild(typingElement);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    hideTypingIndicator() {
        const typingElement = document.getElementById('chatbot-typing-indicator');
        if (typingElement) {
            typingElement.remove();
        }
    }
    
    sendMessage() {
        const message = this.inputField.value.trim();
        
        if (!message || this.isWaitingForResponse) {
            return;
        }
        
        // Add user message to chat
        this.addMessage('user', message);
        
        // Clear input field
        this.inputField.value = '';
        
        // Get blog context (if available)
        const blogContext = this.getBlogContext();
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Set waiting flag
        this.isWaitingForResponse = true;
        
        // Send to the server
        fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                sessionId: this.sessionId,
                context: blogContext
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Add assistant response
            if (data.success) {
                this.addMessage('assistant', data.response);
            } else {
                this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
            }
            
            // Reset waiting flag
            this.isWaitingForResponse = false;
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Add error message
            this.addMessage('assistant', 'Sorry, there was a problem connecting to the assistant. Please try again later.');
            
            // Reset waiting flag
            this.isWaitingForResponse = false;
        });
    }
    
    getBlogContext() {
        // Try to extract blog content from the page
        const blogContext = {};
        
        // Check for title input
        const titleInput = document.querySelector('input[name="title"]') || document.querySelector('#title');
        if (titleInput) {
            blogContext.title = titleInput.value;
        }
        
        // Check for content textarea
        const contentTextarea = document.querySelector('textarea[name="content"]') || document.querySelector('#content');
        if (contentTextarea) {
            blogContext.content = contentTextarea.value;
        }
        
        // Check for category input/select
        const categoryInput = document.querySelector('input[name="category"]') || 
                             document.querySelector('select[name="category"]') ||
                             document.querySelector('#category');
        if (categoryInput) {
            blogContext.category = categoryInput.value;
        }
        
        return blogContext;
    }
}

// Initialize chatbot when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the chatbot
    window.blogAssistant = new BlogAssistantChatbot({
        apiUrl: 'http://localhost:5000/api/chat'
    });
});