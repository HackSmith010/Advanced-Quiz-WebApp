import { Router } from 'express';
import pkg from 'bcryptjs';
const { compare, hash } = pkg;
import pkg2 from 'jsonwebtoken';
const { sign } = pkg2;
import {db} from '../database/schema.js';
const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register teacher
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Insert user
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, 'teacher')
    `);
    const result = stmt.run(name, email, hashedPassword);

    const token = sign({ userId: result.lastInsertRowid }, JWT_SECRET);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: result.lastInsertRowid, name, email, role: 'teacher' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = sign({ userId: user.id }, JWT_SECRET);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;