const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const helmet = require('helmet');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2/promise');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  waitForConnections: true
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'development-only-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const requireAuth = (request, response, next) => {
  if (!request.session.userId) return response.status(401).json({ error: 'Authentication required.' });
  next();
};

app.post('/api/auth/signup', authLimiter, async (request, response) => {
  const { name, email, password } = request.body;
  if (!name || !email || !password || password.length < 8) {
    return response.status(400).json({ error: 'Name, email, and a password of at least 8 characters are required.' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), normalizedEmail, passwordHash]
    );
    request.session.userId = result.insertId;
    response.status(201).json({ message: 'Account created.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return response.status(409).json({ error: 'An account with that email already exists.' });
    console.error(error);
    response.status(500).json({ error: 'Unable to create the account right now.' });
  }
});

app.post('/api/auth/login', authLimiter, async (request, response) => {
  const { email, password } = request.body;
  if (!email || !password) return response.status(400).json({ error: 'Email and password are required.' });

  try {
    const [users] = await pool.execute('SELECT id, name, email, password_hash FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    const user = users[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return response.status(401).json({ error: 'Invalid email or password.' });
    }
    request.session.userId = user.id;
    response.json({ message: 'Signed in.' });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Unable to sign in right now.' });
  }
});

app.post('/api/auth/logout', requireAuth, (request, response) => {
  request.session.destroy(() => response.status(204).end());
});

app.get('/api/projects', requireAuth, async (request, response) => {
  try {
    const [projects] = await pool.execute(
      'SELECT name, progress, status_label AS statusLabel FROM projects WHERE user_id = ? ORDER BY id',
      [request.session.userId]
    );
    response.json({ projects });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Unable to load projects right now.' });
  }
});

app.use(express.static(path.join(__dirname)));

app.listen(port, () => {
  console.log(`Portfolio portal running at http://localhost:${port}`);
});
