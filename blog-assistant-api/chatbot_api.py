from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import time
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("chatbot_api.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("blog_assistant")

# Load environment variables
load_dotenv()
groq_api_key = os.environ.get('GROQ_API_KEY')

if not groq_api_key:
    logger.error("GROQ_API_KEY not found in environment variables")

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable cross-origin requests

# Initialize Groq client
try:
    from groq import Groq
    client = Groq(api_key=groq_api_key)
    logger.info("Groq client initialized successfully")
except ImportError:
    logger.error("Failed to import Groq. Make sure it's installed: pip install groq")
    client = None
except Exception as e:
    logger.error(f"Failed to initialize Groq client: {str(e)}")
    client = None

# Store conversation history
conversations = {}

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat requests from the blog assistant chatbot"""
    start_time = time.time()
    
    try:
        # Parse request data
        data = request.json
        if not data:
            logger.warning("Received empty request data")
            return jsonify({
                "response": "I couldn't understand your request. Please try again.",
                "success": False
            }), 400
            
        user_message = data.get('message', '')
        session_id = data.get('sessionId', 'default')
        blog_context = data.get('context', {})  # Optional blog content for context
        
        logger.info(f"Received message for session {session_id}: {user_message[:50]}...")
        
        # Initialize conversation history for this session if it doesn't exist
        if session_id not in conversations:
            conversations[session_id] = []
            logger.info(f"Created new conversation session: {session_id}")
        
        # Add user message to conversation history
        conversations[session_id].append({"role": "user", "content": user_message})
        
        # Create system message with blog assistant context
        system_message = {
            "role": "system",
            "content": """You are an intelligent Blog Writing Assistant embedded in a blog creation platform. 
            Your role is to help users craft better blog content by:
            1. Suggesting improvements to their writing
            2. Offering ideas for content expansion
            3. Helping with research on their topics
            4. Answering questions about blogging best practices
            5. Assisting with SEO optimization
            
            Be concise, helpful, and focus on making their blog better. Provide specific, actionable suggestions.
            When possible, give examples that can be directly copied and used in the blog."""
        }
        
        # If blog content is provided, add it to the system message
        if blog_context:
            blog_title = blog_context.get('title', '')
            blog_content = blog_context.get('content', '')
            blog_category = blog_context.get('category', '')
            
            if any([blog_title, blog_content, blog_category]):
                context_message = f"""
                The user is currently working on a blog with the following details:
                """
                
                if blog_title:
                    context_message += f"\nTitle: {blog_title}"
                
                if blog_category:
                    context_message += f"\nCategory: {blog_category}"
                
                if blog_content:
                    # Truncate content if it's too long
                    truncated_content = blog_content[:1000] + "..." if len(blog_content) > 1000 else blog_content
                    context_message += f"\nContent: {truncated_content}"
                
                context_message += "\n\nProvide assistance relevant to this blog post."
                system_message["content"] += context_message
                
                logger.info(f"Added blog context: Title={blog_title}, Category={blog_category}, Content length={len(blog_content)}")
        
        # Prepare messages for the API call
        messages = [system_message] + conversations[session_id][-10:]  # Include system message and last 10 exchanges
        
        # Call Groq API
        if client:
            try:
                chat_completion = client.chat.completions.create(
                    messages=messages,
                    model="mixtral-8x7b-32768",  # Using Mixtral model for good performance
                    temperature=0.7,
                    max_tokens=1000,
                    top_p=1,
                    stream=False
                )
                
                # Extract the assistant's response
                assistant_response = chat_completion.choices[0].message.content
                
                # Add assistant response to conversation history
                conversations[session_id].append({"role": "assistant", "content": assistant_response})
                
                logger.info(f"Successfully generated response in {time.time() - start_time:.2f}s")
                
                return jsonify({
                    "response": assistant_response,
                    "success": True
                })
            except Exception as api_error:
                logger.error(f"Groq API error: {str(api_error)}")
                return jsonify({
                    "response": "I'm having trouble connecting to my knowledge base. Please try again in a moment.",
                    "success": False,
                    "error": str(api_error)
                }), 503
        else:
            # Fallback if Groq client is not available
            logger.warning("Groq client not available, using fallback response")
            fallback_response = "I'm your blog assistant. I can help with writing, editing, and improving your blog content. How can I assist you today?"
            
            # Add fallback response to conversation history
            conversations[session_id].append({"role": "assistant", "content": fallback_response})
            
            return jsonify({
                "response": fallback_response,
                "success": True
            })
    
    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        return jsonify({
            "response": "An error occurred while processing your request. Please try again.",
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    try:
        return jsonify({
            "status": "healthy", 
            "service": "blog-assistant-chatbot",
            "groq_client": "available" if client else "unavailable"
        })
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('CHATBOT_PORT', 5000))
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting Blog Assistant API on port {port}, debug mode: {debug_mode}")
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode)