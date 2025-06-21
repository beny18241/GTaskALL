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
    // Table for storing user account connections
    db.run(`CREATE TABLE IF NOT EXISTS user_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      main_user_email TEXT NOT NULL,
      gtask_account_email TEXT NOT NULL,
      gtask_account_name TEXT NOT NULL,
      gtask_account_picture TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(main_user_email, gtask_account_email)
    )`);

    // Table for storing refresh tokens (in production, use proper encryption)
    db.run(`CREATE TABLE IF NOT EXISTS account_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      main_user_email TEXT NOT NULL,
      gtask_account_email TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(main_user_email, gtask_account_email)
    )`);
  });
}

// API Routes

// Get all connected Google Tasks accounts for a main user
app.get('/api/connections/:mainUserEmail', (req, res) => {
  const { mainUserEmail } = req.params;
  
  db.all(
    `SELECT 
      gtask_account_email,
      gtask_account_name,
      gtask_account_picture,
      created_at
     FROM user_connections 
     WHERE main_user_email = ?`,
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
    // Insert connection record
    db.run(
      `INSERT OR REPLACE INTO user_connections 
       (main_user_email, gtask_account_email, gtask_account_name, gtask_account_picture) 
       VALUES (?, ?, ?, ?)`,
      [mainUserEmail, gtaskAccountEmail, gtaskAccountName, gtaskAccountPicture],
      function(err) {
        if (err) {
          console.error('Error inserting connection:', err);
          return res.status(500).json({ error: 'Failed to save connection' });
        }

        // Insert/update token
        if (token) {
          db.run(
            `INSERT OR REPLACE INTO account_tokens 
             (main_user_email, gtask_account_email, refresh_token, updated_at) 
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [mainUserEmail, gtaskAccountEmail, token],
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
  });
});

// Remove a Google Tasks account connection
app.delete('/api/connections/:mainUserEmail/:gtaskAccountEmail', (req, res) => {
  const { mainUserEmail, gtaskAccountEmail } = req.params;

  db.serialize(() => {
    // Remove connection record
    db.run(
      `DELETE FROM user_connections 
       WHERE main_user_email = ? AND gtask_account_email = ?`,
      [mainUserEmail, gtaskAccountEmail],
      function(err) {
        if (err) {
          console.error('Error removing connection:', err);
          return res.status(500).json({ error: 'Failed to remove connection' });
        }

        // Remove token
        db.run(
          `DELETE FROM account_tokens 
           WHERE main_user_email = ? AND gtask_account_email = ?`,
          [mainUserEmail, gtaskAccountEmail],
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
  });
});

// Get stored token for a specific connection
app.get('/api/tokens/:mainUserEmail/:gtaskAccountEmail', (req, res) => {
  const { mainUserEmail, gtaskAccountEmail } = req.params;

  db.get(
    `SELECT refresh_token FROM account_tokens 
     WHERE main_user_email = ? AND gtask_account_email = ?`,
    [mainUserEmail, gtaskAccountEmail],
    (err, row) => {
      if (err) {
        console.error('Error fetching token:', err);
        res.status(500).json({ error: 'Failed to fetch token' });
      } else if (row) {
        res.json({ token: row.refresh_token });
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

  db.run(
    `INSERT OR REPLACE INTO account_tokens 
     (main_user_email, gtask_account_email, refresh_token, updated_at) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [mainUserEmail, gtaskAccountEmail, token],
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