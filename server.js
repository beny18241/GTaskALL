import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database('./gtaskall.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  db.serialize(() => {
    // Table for storing main user accounts
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      picture TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Table for storing user account connections
    db.run(`CREATE TABLE IF NOT EXISTS user_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      main_user_email TEXT NOT NULL,
      gtask_account_email TEXT NOT NULL,
      gtask_account_name TEXT NOT NULL,
      gtask_account_picture TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(main_user_email, gtask_account_email),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Table for storing refresh tokens (in production, use proper encryption)
    db.run(`CREATE TABLE IF NOT EXISTS account_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      main_user_email TEXT NOT NULL,
      gtask_account_email TEXT NOT NULL,
      encrypted_token TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(main_user_email, gtask_account_email),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Migration: Check if encrypted_token column exists, if not add it
    db.get("PRAGMA table_info(account_tokens)", (err, rows) => {
      if (!err) {
        db.all("PRAGMA table_info(account_tokens)", (err, columns) => {
          if (!err) {
            const hasEncryptedToken = columns.some(col => col.name === 'encrypted_token');
            if (!hasEncryptedToken) {
              console.log('Adding encrypted_token column to account_tokens table...');
              db.run("ALTER TABLE account_tokens ADD COLUMN encrypted_token TEXT", (err) => {
                if (err) {
                  console.error('Error adding encrypted_token column:', err);
                } else {
                  console.log('Successfully added encrypted_token column');
                }
              });
            }
          }
        });
      }
    });

    // Migration: Add user_id column to existing tables if they don't exist
    db.all("PRAGMA table_info(user_connections)", (err, columns) => {
      if (!err) {
        const hasUserId = columns.some(col => col.name === 'user_id');
        if (!hasUserId) {
          console.log('Adding user_id column to user_connections table...');
          db.run("ALTER TABLE user_connections ADD COLUMN user_id INTEGER", (err) => {
            if (err) {
              console.error('Error adding user_id column to user_connections:', err);
            } else {
              console.log('Successfully added user_id column to user_connections');
            }
          });
        }
      }
    });

    db.all("PRAGMA table_info(account_tokens)", (err, columns) => {
      if (!err) {
        const hasUserId = columns.some(col => col.name === 'user_id');
        if (!hasUserId) {
          console.log('Adding user_id column to account_tokens table...');
          db.run("ALTER TABLE account_tokens ADD COLUMN user_id INTEGER", (err) => {
            if (err) {
              console.error('Error adding user_id column to account_tokens:', err);
            } else {
              console.log('Successfully added user_id column to account_tokens');
            }
          });
        }
      }
    });
  });
}

// API Routes

// User Management Endpoints

// Create or update user account
app.post('/api/users', (req, res) => {
  const { email, name, picture } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
  }

  db.run(
    `INSERT OR REPLACE INTO users (email, name, picture, last_login) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [email, name, picture],
    function(err) {
      if (err) {
        console.error('Error creating/updating user:', err);
        res.status(500).json({ error: 'Failed to create/update user' });
      } else {
        res.json({ 
          success: true, 
          message: 'User created/updated successfully',
          userId: this.lastID 
        });
      }
    }
  );
});

// Get user by email
app.get('/api/users/:email', (req, res) => {
  const { email } = req.params;

  db.get(
    `SELECT id, email, name, picture, created_at, last_login 
     FROM users 
     WHERE email = ?`,
    [email],
    (err, row) => {
      if (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ error: 'Failed to fetch user' });
      } else if (row) {
        res.json({ user: row });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    }
  );
});

// Update user last login
app.put('/api/users/:email/login', (req, res) => {
  const { email } = req.params;

  db.run(
    `UPDATE users 
     SET last_login = CURRENT_TIMESTAMP 
     WHERE email = ?`,
    [email],
    function(err) {
      if (err) {
        console.error('Error updating user login:', err);
        res.status(500).json({ error: 'Failed to update user login' });
      } else if (this.changes > 0) {
        res.json({ 
          success: true, 
          message: 'User login updated successfully' 
        });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    }
  );
});

// Get all connected Google Tasks accounts for a main user
app.get('/api/connections/:mainUserEmail', (req, res) => {
  const { mainUserEmail } = req.params;
  
  db.all(
    `SELECT 
      uc.gtask_account_email,
      uc.gtask_account_name,
      uc.gtask_account_picture,
      uc.created_at
     FROM user_connections uc
     JOIN users u ON uc.user_id = u.id
     WHERE u.email = ?`,
    [mainUserEmail],
    (err, rows) => {
      if (err) {
        console.error('Error fetching connections:', err);
        res.status(500).json({ error: 'Failed to fetch connections' });
      } else {
        res.json({ connections: rows });
      }
    }
  );
});

// Add a new Google Tasks account connection
app.post('/api/connections', (req, res) => {
  const { 
    mainUserEmail, 
    gtaskAccountEmail, 
    gtaskAccountName, 
    gtaskAccountPicture,
    token 
  } = req.body;

  if (!mainUserEmail || !gtaskAccountEmail || !gtaskAccountName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.serialize(() => {
    // First, get or create the user
    db.get(
      `SELECT id FROM users WHERE email = ?`,
      [mainUserEmail],
      (err, userRow) => {
        if (err) {
          console.error('Error fetching user:', err);
          return res.status(500).json({ error: 'Failed to fetch user' });
        }

        if (!userRow) {
          return res.status(404).json({ error: 'User not found. Please login first.' });
        }

        const userId = userRow.id;

        // Insert connection record
        db.run(
          `INSERT OR REPLACE INTO user_connections 
           (user_id, main_user_email, gtask_account_email, gtask_account_name, gtask_account_picture) 
           VALUES (?, ?, ?, ?, ?)`,
          [userId, mainUserEmail, gtaskAccountEmail, gtaskAccountName, gtaskAccountPicture],
          function(err) {
            if (err) {
              console.error('Error inserting connection:', err);
              return res.status(500).json({ error: 'Failed to save connection' });
            }

            // Insert/update token
            if (token) {
              db.run(
                `INSERT OR REPLACE INTO account_tokens 
                 (user_id, main_user_email, gtask_account_email, encrypted_token, updated_at) 
                 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [userId, mainUserEmail, gtaskAccountEmail, token],
                function(err) {
                  if (err) {
                    console.error('Error saving token:', err);
                    return res.status(500).json({ error: 'Failed to save token' });
                  }
                  res.json({ 
                    success: true, 
                    message: 'Connection saved successfully',
                    connectionId: this.lastID 
                  });
                }
              );
            } else {
              res.json({ 
                success: true, 
                message: 'Connection saved successfully',
                connectionId: this.lastID 
              });
            }
          }
        );
      }
    );
  });
});

// Remove a Google Tasks account connection
app.delete('/api/connections/:mainUserEmail/:gtaskAccountEmail', (req, res) => {
  const { mainUserEmail, gtaskAccountEmail } = req.params;

  db.serialize(() => {
    // Get user ID first
    db.get(
      `SELECT id FROM users WHERE email = ?`,
      [mainUserEmail],
      (err, userRow) => {
        if (err) {
          console.error('Error fetching user:', err);
          return res.status(500).json({ error: 'Failed to fetch user' });
        }

        if (!userRow) {
          return res.status(404).json({ error: 'User not found' });
        }

        const userId = userRow.id;

        // Remove connection record
        db.run(
          `DELETE FROM user_connections 
           WHERE user_id = ? AND main_user_email = ? AND gtask_account_email = ?`,
          [userId, mainUserEmail, gtaskAccountEmail],
          function(err) {
            if (err) {
              console.error('Error removing connection:', err);
              return res.status(500).json({ error: 'Failed to remove connection' });
            }

            // Remove token
            db.run(
              `DELETE FROM account_tokens 
               WHERE user_id = ? AND main_user_email = ? AND gtask_account_email = ?`,
              [userId, mainUserEmail, gtaskAccountEmail],
              function(err) {
                if (err) {
                  console.error('Error removing token:', err);
                  return res.status(500).json({ error: 'Failed to remove token' });
                }
                res.json({ 
                  success: true, 
                  message: 'Connection removed successfully' 
                });
              }
            );
          }
        );
      }
    );
  });
});

// Get stored token for a specific connection
app.get('/api/tokens/:mainUserEmail/:gtaskAccountEmail', (req, res) => {
  const { mainUserEmail, gtaskAccountEmail } = req.params;

  db.get(
    `SELECT at.encrypted_token 
     FROM account_tokens at
     JOIN users u ON at.user_id = u.id
     WHERE u.email = ? AND at.gtask_account_email = ?`,
    [mainUserEmail, gtaskAccountEmail],
    (err, row) => {
      if (err) {
        console.error('Error fetching token:', err);
        res.status(500).json({ error: 'Failed to fetch token' });
      } else if (row) {
        res.json({ token: row.encrypted_token });
      } else {
        res.status(404).json({ error: 'Token not found' });
      }
    }
  );
});

// Update token for a connection
app.put('/api/tokens/:mainUserEmail/:gtaskAccountEmail', (req, res) => {
  const { mainUserEmail, gtaskAccountEmail } = req.params;
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  db.serialize(() => {
    // Get user ID first
    db.get(
      `SELECT id FROM users WHERE email = ?`,
      [mainUserEmail],
      (err, userRow) => {
        if (err) {
          console.error('Error fetching user:', err);
          return res.status(500).json({ error: 'Failed to fetch user' });
        }

        if (!userRow) {
          return res.status(404).json({ error: 'User not found' });
        }

        const userId = userRow.id;

        db.run(
          `INSERT OR REPLACE INTO account_tokens 
           (user_id, main_user_email, gtask_account_email, encrypted_token, updated_at) 
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [userId, mainUserEmail, gtaskAccountEmail, token],
          function(err) {
            if (err) {
              console.error('Error updating token:', err);
              res.status(500).json({ error: 'Failed to update token' });
            } else {
              res.json({ 
                success: true, 
                message: 'Token updated successfully' 
              });
            }
          }
        );
      }
    );
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Database initialized');
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
}); 