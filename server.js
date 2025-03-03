import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;
const API_URL = "http://localhost:4000";

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

db.connect()
    .then(() => console.log("Connected to PostgreSQL ✅"))
    .catch((err) => console.error("Database connection error ❌", err.stack));

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session middleware
app.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: "YOUR_GOOGLE_CLIENT_ID",
    clientSecret: "YOUR_GOOGLE_CLIENT_SECRET",
    callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE google_id = $1", [profile.id]);
        if (result.rows.length > 0) {
            return done(null, result.rows[0]);
        } else {
            const newUser = await db.query(
                "INSERT INTO users (name, email, google_id) VALUES ($1, $2, $3) RETURNING *",
                [profile.displayName, profile.emails[0].value, profile.id]
            );
            return done(null, newUser.rows[0]);
        }
    } catch (error) {
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        done(null, result.rows[0]);
    } catch (error) {
        done(error, null);
    }
});

// Routes for Authentication
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback", passport.authenticate("google", {
    successRedirect: "/interests",
    failureRedirect: "/login"
}));

app.post("/auth/signup", async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;
    
    try {
        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({
                status: "error",
                field: "confirmPassword",
                message: "Passwords do not match"
            });
        }
        
        // Check if email already exists
        const existingUser = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                status: "error",
                field: "email",
                message: "This email is already registered. Please use a different email or try logging in."
            });
        }
        
        // Validate name
        if (!name || name.trim() === '') {
            return res.status(400).json({
                status: "error",
                field: "name",
                message: "Please enter your name"
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                status: "error",
                field: "email",
                message: "Please enter a valid email address"
            });
        }
        
        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                status: "error",
                field: "password",
                message: "Password must be at least 8 characters long"
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = await db.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
            [name, email, hashedPassword]
        );
        
        // Set session and redirect
        req.session.userId = newUser.rows[0].id;
        
        res.status(200).json({
            status: "success",
            redirect: "/interests"
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({
            status: "error",
            message: "An unexpected error occurred. Please try again later."
        });
    }
});

app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        
        // Check if user exists
        if (result.rows.length === 0) {
            return res.status(400).json({ 
                status: "error", 
                field: "email",
                message: "No account found with this email address. Please check your email or sign up." 
            });
        }
        
        // Check if password matches
        const isMatch = await bcrypt.compare(password, result.rows[0].password);
        if (!isMatch) {
            return res.status(400).json({ 
                status: "error", 
                field: "password",
                message: "Incorrect password. Please try again." 
            });
        }
        
        // Successful login
        req.session.userId = result.rows[0].id;
        return res.status(200).json({ 
            status: "success",
            redirect: "/home" 
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ 
            status: "error", 
            message: "Something went wrong. Please try again later." 
        });
    }
});
// Save Interests
app.post("/auth/interests", async (req, res) => {
    const { userId, interests } = req.body;
    await db.query("UPDATE users SET interests = $1 WHERE id = $2", [interests, userId]);
    res.redirect("/home");
});

// Landing Page
app.get("/", (req, res) => {
    res.render("index.ejs");
});
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

// Render Signup Page
app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

app.get("/about", (req, res) => {
    res.render("about.ejs");
});

app.get("/contact", (req, res) => {
    res.render("contact.ejs");
});

// Render Interests Page
// Save Interests
app.get("/interests", (req, res) => {
  if (!req.session.userId) {
      return res.redirect("/login?message=Please%20login%20first");
  }
  res.render("interests.ejs", { userId: req.session.userId });
});

app.post("/auth/interests", async (req, res) => {
  try {
      const userId = req.session.userId;

      if (!userId) {
          console.log("No user ID found when saving interests");
          return res.redirect('/login?message=Please%20login%20first');
      }

      let interests = req.body.interests;

      // Convert array to a comma-separated string
      if (!interests) {
          interests = ''; // No interests selected
      } else if (Array.isArray(interests)) {
          interests = interests.join(","); // Convert array to string
      }

      console.log("Processed interests string:", interests);

      // Save as TEXT (string) instead of an array
      await db.query(
          "UPDATE users SET interests = $1 WHERE id = $2", 
          [interests, userId]
      );

      console.log(`Successfully saved interests for user ${userId}`);
      res.redirect("/home");
  } catch (error) {
      console.error("Error saving interests:", error);
      res.status(500).send("Error saving interests. Please try again.");
  }
});



// Home Page
// Home Page - Fixed version
app.get("/home", async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.userId && !req.user) {
            return res.redirect("/login?message=Please%20login%20first");
        }

        // Get user ID from either session or passport user object
        const userId = req.user ? req.user.id : req.session.userId;
        
        // Log the authenticated user
        console.log("Authenticated user ID:", userId);
        
        // Fetch ALL posts first without filtering by interests (for debugging)
        const allPostsResult = await db.query(
            "SELECT posts.*, users.name AS author FROM posts JOIN users ON posts.author_id = users.id ORDER BY posts.created_at DESC"
        );
        
        console.log("Total posts in database:", allPostsResult.rows.length);
        
        // Fetch user interests
        const userResult = await db.query("SELECT interests FROM users WHERE id = $1", [userId]);
        
        if (userResult.rows.length === 0) {
            return res.redirect("/interests");
        }
        
        // Parse interests - handle both string and array formats
        let interestsArray;
        const interests = userResult.rows[0].interests;
        
        if (!interests) {
            interestsArray = ["general"]; // Default category if no interests
        } else if (typeof interests === 'string') {
            interestsArray = interests.split(',').filter(i => i.trim().length > 0);
            if (interestsArray.length === 0) {
                interestsArray = ["general"];
            }
        } else if (Array.isArray(interests)) {
            interestsArray = interests;
        } else {
            interestsArray = ["general"];
        }
        
        // Process each post to include comments and likes
        const postsWithData = await Promise.all(allPostsResult.rows.map(async (post) => {
            // Get comments for this post
            const comments = await db.query(
                "SELECT comments.*, users.name AS user FROM comments JOIN users ON comments.user_id = users.id WHERE post_id = $1 ORDER BY comments.created_at DESC",
                [post.id]
            );
            
            // Get likes for this post
            const likes = await db.query(
                "SELECT post_likes.*, users.name AS user_name FROM post_likes JOIN users ON post_likes.user_id = users.id WHERE post_id = $1",
                [post.id]
            );
            
            return {
                ...post,
                comments: comments.rows,
                post_likes: likes.rows,
                authorId: post.author_id
            };
        }));
        
        // Fetch user data for the template
        const userData = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
        const user = userData.rows[0];

        res.render("home.ejs", { 
            posts: postsWithData, 
            user: user,
            userInterests: interestsArray 
        });
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).send("Server Error: " + error.message);
    }
});
app.get("/blogs", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect("/login");
        }

        // Fetch user interests safely
        const userResult = await db.query("SELECT interests FROM users WHERE id = $1", [req.session.userId]);
        if (userResult.rowCount === 0) {
            return res.status(404).send("User not found");
        }

        let interests = userResult.rows[0].interests;
        if (!Array.isArray(interests) || interests.length === 0) {
            interests = ["general"]; // Default category if no interests
        }

        // Fetch blogs matching user interests
        const blogs = await db.query(
            "SELECT * FROM blogs WHERE category = ANY($1::text[])",
            [interests]
        );

        res.render("home", { blogs: blogs.rows, user: req.session.userId });

    } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).send("Internal Server Error");
    }
});



app.post("/api/posts", async (req, res) => {
    try {
        // Check if user is authenticated
        const userId = req.user ? req.user.id : req.session.userId;
        if (!userId) {
            return res.status(401).json({ 
                status: "error", 
                message: "You must be logged in to create a post" 
            });
        }
        
        // Get post data from request body
        const { title, content, category } = req.body;
        
        // Validate required fields
        if (!title || !content || !category) {
            return res.status(400).json({
                status: "error",
                message: "Title, content, and category are required"
            });
        }
        
        // Insert the new post into the database
        const newPost = await db.query(
            "INSERT INTO posts (title, content, author_id, category, likes) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [title, content, userId, category, 0]
        );
        
        // Return the newly created post
        res.status(201).json({
            status: "success",
            data: newPost.rows[0],
            redirect: "/home"
        });
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ 
            status: "error", 
            message: "An error occurred while creating your post. Please try again." 
        });
    }
});
// Edit/Delete Blog Permissions
// Edit/Delete Blog Permissions
// Edit/Delete Blog Permissions
app.get("/edit/:id", async (req, res) => {
    try {
        const postId = req.params.id;
        // Get user ID from either session or passport user object
        const userId = req.user ? req.user.id : req.session.userId;
        
        if (!userId) {
            return res.redirect("/login?message=Please%20login%20first");
        }

        const post = await db.query("SELECT * FROM posts WHERE id = $1 AND author_id = $2", [postId, userId]);

        if (post.rowCount === 0) {
            return res.status(403).send("Unauthorized to edit this post");
        }

        // Make sure to use .ejs extension
        res.render("edit.ejs", { post: post.rows[0] });
    } catch (error) {
        console.error("Error fetching post:", error);
        res.status(500).send("Server Error");
    }
});

// Update post
app.put("/api/posts/update/:id", async (req, res) => {
    try {
        const postId = req.params.id;
        const { title, content, category } = req.body;
        
        // Get user ID from either session or passport user object
        const userId = req.user ? req.user.id : req.session.userId;
        
        if (!userId) {
            return res.status(401).json({ error: "Please login first" });
        }
        
        // Validate required fields
        if (!title || !content || !category) {
            return res.status(400).json({
                status: "error",
                message: "Title, content, and category are required"
            });
        }
        
        // Update the post if the user is the author
        const result = await db.query(
            "UPDATE posts SET title = $1, content = $2, category = $3 WHERE id = $4 AND author_id = $5 RETURNING *",
            [title, content, category, postId, userId]
        );
        
        if (result.rowCount === 0) {
            return res.status(403).json({ error: "Unauthorized to update this post" });
        }
        
        res.json({ 
            status: "success", 
            message: "Post updated successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.delete("/api/posts/delete/:id", async (req, res) => {
    try {
        const postId = req.params.id;
        // Get user ID from either session or passport user object
        const userId = req.user ? req.user.id : req.session.userId;
        
        if (!userId) {
            return res.status(401).json({ error: "Please login first" });
        }

        const result = await db.query("DELETE FROM posts WHERE id = $1 AND author_id = $2 RETURNING id", [postId, userId]);

        if (result.rowCount === 0) {
            return res.status(403).json({ error: "Unauthorized to delete this post" });
        }

        res.json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Error deleting post:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/posts/:id/like', async (req, res) => {
    try {
        const postId = req.params.id;
        // Get user ID from either session or passport user object
        const userId = req.user ? req.user.id : req.session.userId;
        
        if (!userId) {
            return res.status(401).json({ error: "Please login first" });
        }
        
        // Check if user already liked this post
        const existingLike = await db.query(
            "SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2",
            [postId, userId]
        );
        
        let liked = false;
        
        if (existingLike.rowCount > 0) {
            // User already liked, so unlike
            await db.query(
                "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2",
                [postId, userId]
            );
            
            // Decrease like count
            await db.query(
                "UPDATE posts SET likes = likes - 1 WHERE id = $1",
                [postId]
            );
        } else {
            // User hasn't liked, so add like
            await db.query(
                "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)",
                [postId, userId]
            );
            
            // Increase like count
            await db.query(
                "UPDATE posts SET likes = likes + 1 WHERE id = $1",
                [postId]
            );
            
            liked = true;
        }
        
        // Get updated like count
        const updatedPost = await db.query(
            "SELECT likes FROM posts WHERE id = $1",
            [postId]
        );
        
        // Get the most recent liker's name
        let recentLiker = null;
        if (liked) {
            const userData = await db.query(
                "SELECT name FROM users WHERE id = $1",
                [userId]
            );
            recentLiker = userData.rows[0].name;
        } else {
            const recentLikerData = await db.query(
                "SELECT users.name FROM post_likes JOIN users ON post_likes.user_id = users.id WHERE post_id = $1 ORDER BY post_likes.created_at DESC LIMIT 1",
                [postId]
            );
            
            if (recentLikerData.rowCount > 0) {
                recentLiker = recentLikerData.rows[0].name;
            }
        }
        
        res.json({
            success: true,
            likes: updatedPost.rows[0].likes,
            liked: liked,
            recentLiker: recentLiker
        });
    } catch (error) {
        console.error("Error toggling like:", error);
        res.status(500).json({ error: "Server error" });
    }
});
app.get('/api/posts/:id/likes', async (req, res) => {
    try {
        const postId = req.params.id;
        
        // Get all users who liked this post
        const likes = await db.query(
            "SELECT post_likes.*, users.name as user_name FROM post_likes JOIN users ON post_likes.user_id = users.id WHERE post_id = $1 ORDER BY post_likes.created_at DESC",
            [postId]
        );
        
        res.json({
            success: true,
            likes: likes.rows
        });
    } catch (error) {
        console.error("Error fetching likes:", error);
        res.status(500).json({ error: "Server error" });
    }
});
app.post('/api/posts/:id/comment', async (req, res) => {
    try {
        const postId = req.params.id;
        const { text } = req.body;
        
        // Get user ID from either session or passport user object
        const userId = req.user ? req.user.id : req.session.userId;
        
        if (!userId) {
            return res.status(401).json({ error: "Please login first" });
        }
        
        // Validate comment text
        if (!text || text.trim() === '') {
            return res.status(400).json({
                status: "error",
                message: "Comment text is required"
            });
        }
        
        // Add comment to database
        const newComment = await db.query(
            "INSERT INTO comments (post_id, user_id, text) VALUES ($1, $2, $3) RETURNING *",
            [postId, userId, text]
        );
        
        // Get user name for the response
        const userData = await db.query(
            "SELECT name FROM users WHERE id = $1",
            [userId]
        );
        
        // Get total comments count
        const commentsCount = await db.query(
            "SELECT COUNT(*) FROM comments WHERE post_id = $1",
            [postId]
        );
        
        res.json({
            success: true,
            id: newComment.rows[0].id,
            text: newComment.rows[0].text,
            created_at: newComment.rows[0].created_at,
            user: userData.rows[0].name,
            totalComments: parseInt(commentsCount.rows[0].count)
        });
    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ error: "Server error" });
    }
});
app.get('/api/posts/:id/comments', async (req, res) => {
    try {
        const postId = req.params.id;
        
        // Get all comments for this post
        const comments = await db.query(
            "SELECT comments.*, users.name as user FROM comments JOIN users ON comments.user_id = users.id WHERE post_id = $1 ORDER BY comments.created_at DESC",
            [postId]
        );
        
        res.json({
            success: true,
            comments: comments.rows
        });
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Render new post page
app.get("/new", (req, res) => {
    res.render("modify.ejs", { heading: "New Post", submit: "Create Post" });
});


// Handle Contact Form Submission
app.post("/send-message", (req, res) => {
    const { name, email, message } = req.body;
    console.log(`Message from ${name} (${email}): ${message}`);
    res.send("Your message has been received. We will contact you soon!");
});
// Updated logout route that works with newer versions of Passport.js
app.get("/logout", (req, res) => {
    // Check if using Passport.js
    if (req.logout) {
        // Modern Passport.js requires a callback
        req.logout(function(err) {
            if (err) {
                console.error("Error during logout:", err);
                return res.status(500).send("Error logging out");
            }
            
            // Clear the session after successful logout
            req.session.destroy((err) => {
                if (err) {
                    console.error("Error destroying session:", err);
                    return res.status(500).send("Error logging out");
                }
                
                // Redirect to the login page
                res.redirect("/login");
            });
        });
    } else {
        // If not using Passport.js, just destroy the session
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).send("Error logging out");
            }
            
            // Redirect to the login page
            res.redirect("/login");
        });
    }
});
// Add this to your server.js file

// Profile Page Route
app.get("/profile", async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.userId && !req.user) {
            return res.redirect("/login?message=Please%20login%20first");
        }

        // Get user ID from either session or passport user object
        const userId = req.user ? req.user.id : req.session.userId;
        
        // Fetch user data
        const userData = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
        const user = userData.rows[0];
        
        if (!user) {
            return res.status(404).send("User not found");
        }
        
        // Fetch user posts
        const userPosts = await db.query(
            "SELECT * FROM posts WHERE author_id = $1 ORDER BY created_at DESC",
            [userId]
        );
        
        // Fetch total likes received
        const likesQuery = await db.query(
            "SELECT SUM(likes) as total_likes FROM posts WHERE author_id = $1",
            [userId]
        );
        const totalLikes = likesQuery.rows[0].total_likes || 0;
        
        // Fetch total comments received
        const commentsQuery = await db.query(
            "SELECT COUNT(*) as total_comments FROM comments JOIN posts ON comments.post_id = posts.id WHERE posts.author_id = $1",
            [userId]
        );
        const totalComments = parseInt(commentsQuery.rows[0].total_comments) || 0;
        
        // Fetch top performing posts
        const topPostsQuery = await db.query(
            `SELECT posts.*, 
                (SELECT COUNT(*) FROM comments WHERE post_id = posts.id) as comment_count 
            FROM posts 
            WHERE author_id = $1 
            ORDER BY likes DESC, comment_count DESC 
            LIMIT 5`,
            [userId]
        );
        
        // Calculate engagement rate (percentage of posts that received likes or comments)
        const postsWithEngagement = userPosts.rows.filter(post => 
            post.likes > 0 || 
            topPostsQuery.rows.find(p => p.id === post.id)?.comment_count > 0
        ).length;
        
        const totalPosts = userPosts.rows.length;
        const engagementRate = totalPosts > 0 
            ? Math.round((postsWithEngagement / totalPosts) * 100) 
            : 0;
        
        // Prepare stats object
        const stats = {
            totalPosts,
            totalLikes,
            totalComments,
            engagementRate
        };
        
        // Prepare data for charts
        
        // 1. Activity Chart - Last 6 months of posting
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const months = [];
        const postsByMonth = [];
        
        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
            months.unshift(monthYear);
            
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            const monthlyPosts = userPosts.rows.filter(post => {
                const postDate = new Date(post.created_at);
                return postDate >= startOfMonth && postDate <= endOfMonth;
            }).length;
            
            postsByMonth.unshift(monthlyPosts);
        }
        
        // 2. Category Distribution
        const categoriesMap = {};
        userPosts.rows.forEach(post => {
            if (post.category) {
                categoriesMap[post.category] = (categoriesMap[post.category] || 0) + 1;
            }
        });
        
        const categoryLabels = Object.keys(categoriesMap);
        const categoryValues = Object.values(categoriesMap);
        
        // 3. Engagement breakdown
        const engagement = {
            likes: totalLikes,
            comments: totalComments,
            none: Math.max(0, totalPosts - postsWithEngagement)
        };
        
        // 4. Audience engagement over time (weekly)
        const audienceLabels = [];
        const audienceLikes = [];
        const audienceComments = [];
        
        // Last 4 weeks
        for (let i = 0; i < 4; i++) {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() - (i * 7));
            
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 7);
            
            audienceLabels.unshift(`Week ${4-i}`);
            
            // Get posts from this week
            const weekPosts = userPosts.rows.filter(post => {
                const postDate = new Date(post.created_at);
                return postDate >= startDate && postDate <= endDate;
            });
            
            // Sum likes
            const weekLikes = weekPosts.reduce((sum, post) => sum + (post.likes || 0), 0);
            audienceLikes.unshift(weekLikes);
            
            // Count comments
            const postIds = weekPosts.map(post => post.id);
            
            if (postIds.length > 0) {
                const commentsCountQuery = await db.query(
                    "SELECT COUNT(*) as count FROM comments WHERE post_id = ANY($1::int[])",
                    [postIds]
                );
                audienceComments.unshift(parseInt(commentsCountQuery.rows[0].count) || 0);
            } else {
                audienceComments.unshift(0);
            }
        }
        
        // Compile charts data
        const chartsData = {
            activity: {
                labels: months,
                values: postsByMonth
            },
            categories: {
                labels: categoryLabels,
                values: categoryValues
            },
            engagement: engagement,
            audience: {
                labels: audienceLabels,
                likes: audienceLikes,
                comments: audienceComments
            }
        };
        
        res.render("profile.ejs", {
            user,
            stats,
            topPosts: topPostsQuery.rows,
            chartsData
        });
        
    } catch (error) {
        console.error("Error loading profile:", error);
        res.status(500).send("Server Error: " + error.message);
    }
});
app.listen(port, () => {
    console.log(`Backend server is running on http://localhost:${port}`);
});