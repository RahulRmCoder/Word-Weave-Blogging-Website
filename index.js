import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const port = 4000;

// Database connection
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

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// GET all posts
app.get("/posts", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM posts ORDER BY date DESC");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving posts" });
  }
});

// GET a specific post by id
app.get("/posts/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM posts WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Post not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving post" });
  }
});

// POST a new post
app.post("/posts", async (req, res) => {
  try {
    const { title, content, author } = req.body;
    const result = await db.query(
      "INSERT INTO posts (title, content, author, date) VALUES ($1, $2, $3, NOW()) RETURNING *",
      [title, content, author]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding post" });
  }
});

// PATCH a post (update specific fields)
app.patch("/posts/:id", async (req, res) => {
  try {
    const { title, content, author } = req.body;
    const id = req.params.id;

    // Build dynamic query based on provided fields
    const fields = [];
    const values = [];
    let index = 1;

    if (title) {
      fields.push(`title = $${index}`);
      values.push(title);
      index++;
    }
    if (content) {
      fields.push(`content = $${index}`);
      values.push(content);
      index++;
    }
    if (author) {
      fields.push(`author = $${index}`);
      values.push(author);
      index++;
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    values.push(id); // Add id as last parameter

    const query = `UPDATE posts SET ${fields.join(", ")} WHERE id = $${index} RETURNING *`;
    const result = await db.query(query, values);

    if (result.rows.length === 0) return res.status(404).json({ message: "Post not found" });

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating post" });
  }
});

// DELETE a post
app.delete("/posts/:id", async (req, res) => {
  try {
    const result = await db.query("DELETE FROM posts WHERE id = $1 RETURNING *", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Post not found" });

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting post" });
  }
});

app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`);
});
