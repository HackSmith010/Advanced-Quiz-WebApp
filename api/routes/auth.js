import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database/schema.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUserResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists or is pending approval.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.query(
      `INSERT INTO users (name, email, password, status) VALUES ($1, $2, $3, 'pending')`,
      [name, email, hashedPassword]
    );

    console.log(`--- APPROVAL REQUEST ---`);
    console.log(`New user "${name}" (${email}) has requested access.`);
    console.log(`Admin should be notified at: ${process.env.ADMIN_EMAIL}`);
    console.log(`----------------------`);

    res.status(201).json({
      message: 'Registration successful! Your account is pending approval from an administrator.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.status !== 'approved') {
      return res.status(401).json({ error: 'Your account has not been approved yet.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/pending-users', authenticateToken, async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, created_at FROM users WHERE status = 'pending' ORDER BY created_at");
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching pending users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/approve-user/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await db.query(
            "UPDATE users SET status = 'approved' WHERE id = $1 RETURNING id",
            [userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ message: 'User approved successfully.' });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
