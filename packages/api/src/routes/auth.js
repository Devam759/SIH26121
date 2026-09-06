import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import pool from '../db/pool.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM "user" WHERE email = $1', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '60m',
    });

    res.json({
      data: {
        access_token: accessToken,
        token_type: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
  try {
    const token = authHeader.split(' ')[1];
    const user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    res.json({ data: { user } });
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
  }
});

export default router;
