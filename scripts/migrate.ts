import { turso } from './lib/db'

const schema = `
-- Turso Database Schema for Master Studio MVP

-- Users table (managed by NextAuth, but we need to reference)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  image TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT CHECK(role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK(type IN ('text', 'file', 'audio')),
  file_info TEXT, -- JSON for file metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER,
  type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Insert sample project
INSERT OR IGNORE INTO projects (id, name, description, user_id) 
VALUES ('ai-agent-dashboard', 'AI Agent Dashboard', 'MVP Development', 'temp-user');
`

async function migrate() {
  console.log('Running migration...')
  
  try {
    // Split and execute each statement
    const statements = schema.split(';').filter(s => s.trim())
    
    for (const statement of statements) {
      await turso.execute(statement)
    }
    
    console.log('✅ Migration completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrate()
