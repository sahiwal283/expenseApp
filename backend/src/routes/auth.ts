import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await query(
      'SELECT id, username, password, name, email, role FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Prevent login if account is pending role assignment
    if (user.role === 'pending') {
      return res.status(403).json({ 
        error: 'Account pending approval',
        message: 'Your account is awaiting administrator approval. Please contact an administrator to activate your account.'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
      { expiresIn: '20m' } // 20 minutes - aligns with 15min inactivity + 5min buffer
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password validation helper
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return { valid: errors.length === 0, errors };
}

// Check for duplicate username or email
router.post('/check-availability', async (req, res) => {
  try {
    const { username, email } = req.body;
    
    const usernameCheck = username ? await query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    ) : { rows: [] };
    
    const emailCheck = email ? await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    ) : { rows: [] };
    
    res.json({
      usernameAvailable: usernameCheck.rows.length === 0,
      emailAvailable: emailCheck.rows.length === 0
    });
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User registration endpoint - NO ROLE REQUIRED
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, email } = req.body;

    // Validate required fields
    if (!username || !password || !name || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors
      });
    }

    // Check for duplicates
    const duplicateCheck = await query(
      'SELECT username, email FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (duplicateCheck.rows.length > 0) {
      const duplicate = duplicateCheck.rows[0];
      if (duplicate.username === username) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      if (duplicate.email === email) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get client IP
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    // Insert new user with 'pending' role (awaiting admin assignment)
    const result = await query(
      `INSERT INTO users (username, password, name, email, role, registration_ip, registration_date) 
       VALUES ($1, $2, $3, $4, 'pending', $5, CURRENT_TIMESTAMP) 
       RETURNING id, username, name, email, role, created_at`,
      [username, hashedPassword, name, email, clientIp]
    );

    const user = result.rows[0];

    // Log the new registration
    console.log(`[REGISTRATION] New user registered: ${username} (${email}) from IP: ${clientIp}`);

    // Return success WITHOUT auto-login (user needs admin to assign role first)
    res.status(201).json({
      success: true,
      message: 'Registration successful! An administrator will review your account and assign your role. You will be able to log in once your account is activated.',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        status: 'pending_approval'
      }
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Token refresh endpoint
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify current token (even if expired, we'll still check it's valid)
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
        { ignoreExpiration: true } // Allow expired tokens for refresh
      ) as any;

      // Get fresh user data from database
      const result = await query(
        'SELECT id, username, role FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const user = result.rows[0];

      // Issue new token
      const newToken = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
        { expiresIn: '20m' }
      );

      console.log(`[Auth] Token refreshed for user: ${user.username}`);

      res.json({ token: newToken });
    } catch (jwtError) {
      console.error('[Auth] Token refresh failed - invalid token:', jwtError);
      return res.status(403).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('[Auth] Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
