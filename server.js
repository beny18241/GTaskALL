console.log('Starting server.js...')
import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Add cache control middleware for API routes
app.use('/api', (req, res, next) => {
  // Prevent caching of API responses
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

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
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Table for storing user settings
    db.run(`CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      setting_key TEXT NOT NULL,
      setting_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, setting_key)
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

    // Table for storing API keys for AI features
    db.run(`CREATE TABLE IF NOT EXISTS account_api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      main_user_email TEXT NOT NULL,
      gtask_account_email TEXT NOT NULL,
      encrypted_api_key TEXT NOT NULL,
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
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, row) => {
      if (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ error: 'Failed to fetch user' });
      } else {
        res.json({ user: row });
      }
    }
  );
});

// Update user's last login
app.put('/api/users/:email/login', (req, res) => {
  const { email } = req.params;
  
  db.run(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE email = ?',
    [email],
    function(err) {
      if (err) {
        console.error('Error updating user login:', err);
        res.status(500).json({ error: 'Failed to update user login' });
      } else {
        res.json({ success: true, message: 'Login time updated' });
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
      uc.created_at,
      uc.status
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

// User Settings Endpoints

// Get user settings
app.get('/api/users/:email/settings', (req, res) => {
  const { email } = req.params;
  
  db.all(
    `SELECT s.setting_key, s.setting_value 
     FROM user_settings s
     JOIN users u ON s.user_id = u.id
     WHERE u.email = ?`,
    [email],
    (err, rows) => {
      if (err) {
        console.error('Error fetching user settings:', err);
        res.status(500).json({ error: 'Failed to fetch user settings' });
      } else {
        const settings = rows.reduce((acc, row) => {
          acc[row.setting_key] = row.setting_value;
          return acc;
        }, {});
        res.json({ settings });
      }
    }
  );
});

// Update user setting
app.put('/api/users/:email/settings', (req, res) => {
  const { email } = req.params;
  const { setting_key, setting_value } = req.body;
  
  if (!setting_key) {
    return res.status(400).json({ error: 'Setting key is required' });
  }
  
  db.run(
    `INSERT OR REPLACE INTO user_settings (user_id, setting_key, setting_value, updated_at)
     SELECT id, ?, ?, CURRENT_TIMESTAMP FROM users WHERE email = ?`,
    [setting_key, setting_value, email],
    function(err) {
      if (err) {
        console.error('Error updating user setting:', err);
        res.status(500).json({ error: 'Failed to update user setting' });
      } else {
        res.json({ success: true, message: 'Setting updated successfully' });
      }
    }
  );
});

// AI Summary Endpoint

// Generate AI summary for tasks
app.post('/api/ai/summary', async (req, res) => {
  const { email, tasks, gtaskAccountEmail } = req.body;

  if (!email || !tasks) {
    return res.status(400).json({ error: 'Email and tasks are required' });
  }

  try {
    // Get user's Gemini API key from the new persistent storage
    const accountEmail = gtaskAccountEmail || email; // Use provided account email or fall back to main user email
    db.get(
      `SELECT ak.encrypted_api_key 
       FROM account_api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE u.email = ? AND ak.gtask_account_email = ?`,
      [email, accountEmail],
      async (err, row) => {
        if (err) {
          console.error('Error fetching API key:', err);
          return res.status(500).json({ error: 'Failed to fetch API key' });
        }

        if (!row || !row.encrypted_api_key) {
          return res.status(400).json({ error: 'Gemini API key not configured' });
        }

        // Decrypt the API key
        let apiKey;
        try {
          apiKey = Buffer.from(row.encrypted_api_key, 'base64').toString('utf8');
        } catch (decryptError) {
          console.error('Error decrypting API key:', decryptError);
          return res.status(500).json({ error: 'Failed to decrypt API key' });
        }

        try {
          // Initialize Google AI
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

          // Prepare tasks data for analysis
          const tasksData = tasks.map(task => ({
            title: task.content,
            status: task.status,
            dueDate: task.dueDate,
            notes: task.notes,
            account: task.accountName || 'Unknown'
          }));

          const prompt = `
            Przeanalizuj poniższe zadania na dzisiaj i podaj odpowiedź w języku polskim:
            1. Krótkie podsumowanie tego, co należy wykonać
            2. 3-5 kluczowych spostrzeżeń lub rekomendacji dotyczących produktywności
            3. Potencjalne konflikty lub nakładające się priorytety
            
            Dane zadań:
            ${JSON.stringify(tasksData, null, 2)}
            
            Proszę podać odpowiedź w dokładnie tym formacie JSON:
            {
              "summary": "Krótkie podsumowanie zadań na dzisiaj",
              "insights": ["Spostrzeżenie 1", "Spostrzeżenie 2", "Spostrzeżenie 3"]
            }
            
            Odpowiedź musi być w języku polskim.
          `;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          // Try to parse the JSON response
          try {
            const parsedResponse = JSON.parse(text);
            res.json({
              summary: parsedResponse.summary || 'Unable to generate summary',
              insights: parsedResponse.insights || []
            });
          } catch (parseError) {
            // If JSON parsing fails, extract summary from text
            const lines = text.split('\n');
            const summary = lines.find(line => line.includes('summary') || line.includes('Summary')) || 
                           lines.slice(0, 2).join(' ');
            
            res.json({
              summary: summary.replace(/^.*?:/, '').trim() || 'AI summary generated',
              insights: lines.filter(line => line.includes('•') || line.includes('-')).map(line => line.replace(/^[•\-]\s*/, '').trim())
            });
          }
        } catch (aiError) {
          console.error('Error calling Gemini API:', aiError);
          res.status(500).json({ error: 'Failed to generate AI summary' });
        }
      }
    );
  } catch (error) {
    console.error('Error in AI summary endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Chat Endpoint
app.post('/api/ai/chat', async (req, res) => {
  const { email, tasks, message, gtaskAccountEmail } = req.body;

  if (!email || !tasks || !message) {
    return res.status(400).json({ error: 'Email, tasks, and message are required' });
  }

  try {
    // Get user's Gemini API key from the new persistent storage
    const accountEmail = gtaskAccountEmail || email; // Use provided account email or fall back to main user email
    db.get(
      `SELECT ak.encrypted_api_key 
       FROM account_api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE u.email = ? AND ak.gtask_account_email = ?`,
      [email, accountEmail],
      async (err, row) => {
        if (err) {
          console.error('Error fetching API key:', err);
          return res.status(500).json({ error: 'Failed to fetch API key' });
        }

        if (!row || !row.encrypted_api_key) {
          return res.status(400).json({ error: 'Gemini API key not configured' });
        }

        // Decrypt the API key
        let apiKey;
        try {
          apiKey = Buffer.from(row.encrypted_api_key, 'base64').toString('utf8');
        } catch (decryptError) {
          console.error('Error decrypting API key:', decryptError);
          return res.status(500).json({ error: 'Failed to decrypt API key' });
        }

        try {
          // Initialize Google AI
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

          // Prepare tasks data for analysis
          const tasksData = tasks.map(task => ({
            title: task.content,
            status: task.status,
            dueDate: task.dueDate,
            notes: task.notes,
            account: task.accountName || 'Unknown'
          }));

          const prompt = `
            Jesteś asystentem pomagającym w zarządzaniu zadaniami. Masz dostęp do poniższych zadań użytkownika.
            
            Zadania użytkownika:
            ${JSON.stringify(tasksData, null, 2)}
            
            Pytanie użytkownika: "${message}"
            
            Odpowiedz na pytanie użytkownika w języku polskim, bazując na dostępnych zadaniach. 
            Bądź pomocny, konkretny i praktyczny. Jeśli pytanie nie dotyczy zadań, możesz odpowiedzieć ogólnie.
            
            Odpowiedz bezpośrednio w języku polskim, bez formatowania JSON. Używaj markdown dla lepszego formatowania:
            - Używaj **pogrubienia** dla ważnych informacji
            - Używaj list z * lub - dla list zadań
            - Używaj > dla cytatów lub ważnych uwag
            - Używaj ### dla nagłówków sekcji
          `;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          // Return the text directly since we're not using JSON format anymore
          res.json({
            response: text || 'Nie udało się wygenerować odpowiedzi'
          });
        } catch (aiError) {
          console.error('Error calling Gemini API:', aiError);
          res.status(500).json({ error: 'Failed to generate AI response' });
        }
      }
    );
  } catch (error) {
    console.error('Error in AI chat endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- API Key Management Endpoints ---

// Store or update an API key
app.post('/api/api-keys', (req, res) => {
  const { mainUserEmail, gtaskAccountEmail, apiKey } = req.body;
  if (!mainUserEmail || !gtaskAccountEmail || !apiKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // Simple encryption (in production, use proper encryption)
  const encryptedApiKey = Buffer.from(apiKey).toString('base64');
  db.run(
    `INSERT OR REPLACE INTO account_api_keys 
     (main_user_email, gtask_account_email, encrypted_api_key, updated_at) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [mainUserEmail, gtaskAccountEmail, encryptedApiKey],
    function(err) {
      if (err) {
        console.error('Error saving API key:', err);
        return res.status(500).json({ error: 'Failed to save API key' });
      }
      res.json({ success: true, message: 'API key saved successfully' });
    }
  );
});

// Retrieve an API key
app.get('/api/api-keys/:mainUserEmail/:gtaskAccountEmail', (req, res) => {
  const { mainUserEmail, gtaskAccountEmail } = req.params;
  db.get(
    `SELECT encrypted_api_key 
     FROM account_api_keys
     WHERE main_user_email = ? AND gtask_account_email = ?`,
    [mainUserEmail, gtaskAccountEmail],
    (err, row) => {
      if (err) {
        console.error('Error fetching API key:', err);
        return res.status(500).json({ error: 'Failed to fetch API key' });
      } else if (row) {
        // Decrypt the API key
        try {
          const decryptedApiKey = Buffer.from(row.encrypted_api_key, 'base64').toString('utf8');
          res.json({ apiKey: decryptedApiKey });
        } catch (decryptError) {
          console.error('Error decrypting API key:', decryptError);
          return res.status(500).json({ error: 'Failed to decrypt API key' });
        }
      } else {
        res.status(404).json({ error: 'API key not found' });
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

// Instead of deleting expired connections, mark them as expired
app.put('/api/connections/:mainUserEmail/:gtaskAccountEmail/expire', (req, res) => {
  const { mainUserEmail, gtaskAccountEmail } = req.params;
  db.run(
    `UPDATE user_connections SET status = 'expired' WHERE main_user_email = ? AND gtask_account_email = ?`,
    [mainUserEmail, gtaskAccountEmail],
    function(err) {
      if (err) {
        console.error('Error expiring connection:', err);
        return res.status(500).json({ error: 'Failed to expire connection' });
      }
      res.json({ success: true });
    }
  );
});

// When a token is refreshed, set status back to active
app.put('/api/connections/:mainUserEmail/:gtaskAccountEmail/activate', (req, res) => {
  const { mainUserEmail, gtaskAccountEmail } = req.params;
  db.run(
    `UPDATE user_connections SET status = 'active' WHERE main_user_email = ? AND gtask_account_email = ?`,
    [mainUserEmail, gtaskAccountEmail],
    function(err) {
      if (err) {
        console.error('Error activating connection:', err);
        return res.status(500).json({ error: 'Failed to activate connection' });
      }
      res.json({ success: true });
    }
  );
});

