# Word Weave Blogging Website

Word Weave is a modern blogging platform designed to provide a seamless writing experience with powerful analytics tools for content creators. The platform features a clean, dark-themed interface, intuitive post creation, social engagement features, and a comprehensive dashboard to track content performance.

![Word Weave Logo](screenshots/logo.png)

## Features

### Content Creation
- Intuitive post editor with a clean, distraction-free interface
- Category tagging for better content organization
- Rich text formatting

### Social Engagement
- Like/unlike posts with visual indicators
- Comment system with expandable comment threads
- User engagement tracking

### User Dashboard
- Comprehensive analytics dashboard
- Posting activity tracking
- Category distribution visualization
- Engagement metrics by day of week
- Top performing posts analysis
- Audience engagement metrics

### Additional Features
- Responsive design for mobile and desktop
- User authentication (local and Google OAuth)
- Interest-based content filtering
- Real-time content updates
- AI-powered blog writing assistant

## Screenshots

### Home Page
![Home Page](screenshots/home.png)

### Post Creation
![Post Creation](screenshots/create-post.png)

### Post with Comments
![Post with Comments](screenshots/post-comments.png)

### User Profile Dashboard
![Profile Dashboard](screenshots/profile-dashboard.png)

### Analytics Charts
![Analytics Charts](screenshots/analytics.png)

## Tech Stack

### Frontend
- **EJS** - Templating engine for generating HTML
- **CSS** - Custom styling with responsive design
- **JavaScript** - Client-side interactivity
- **Chart.js** - Data visualization library
- **Moment.js** - Date handling
- **DateRangePicker** - Date filtering component

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **PostgreSQL** - Relational database
- **Passport.js** - Authentication middleware
- **bcrypt.js** - Password hashing
- **Express-session** - Session management

### APIs and Services
- **Groq API** - AI-powered chatbot assistant for blog writing
- **Google OAuth** - Alternative authentication method

## Database Schema

The application uses PostgreSQL with the following main tables:
- **users** - User account information
- **posts** - Blog post content and metadata
- **comments** - User comments on posts
- **post_likes** - Tracks which users liked which posts

## Installation and Setup

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL
- Groq API key (for chatbot functionality)

### Installation Steps

1. Clone the repository
```bash
git clone https://github.com/RahulRmCoder/Word-Weave-Blogging-Website.git
cd Word-Weave-Blogging-Website
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory with the following variables:
```
DB_USER=your_db_user
DB_HOST=your_db_host
DB_DATABASE=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=5432
GROQ_API_KEY=your_groq_api_key
```

4. Set up the database
```bash
psql -U your_db_user -d your_db_name -f queries.sql
```

5. Start the server
```bash
node server.js
```

6. Access the application at `http://localhost:3000`

## Usage

1. **Sign up or log in** to your account
2. **Create a new post** by clicking the "New Post" button
3. **Interact with posts** by liking or commenting
4. **View your profile dashboard** to track content performance
5. **Use the blog assistant** for writing help by clicking the chat icon

## Future Enhancements

- Content recommendation system based on user interests
- Advanced text editor with more formatting options
- Enhanced analytics with content reach metrics
- Email notification system
- Social media sharing integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

RahulRmCoder - [GitHub Profile](https://github.com/RahulRmCoder)

Project Link: [https://github.com/RahulRmCoder/Word-Weave-Blogging-Website](https://github.com/RahulRmCoder/Word-Weave-Blogging-Website)

## Acknowledgements

- [Express.js](https://expressjs.com/)
- [Chart.js](https://www.chartjs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Groq](https://groq.com/)
