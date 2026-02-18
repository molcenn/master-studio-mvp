import fs from 'fs'
import path from 'path'

/**
 * Server-side file-based message store.
 * Persists messages to a JSON file so they survive server restarts.
 * 
 * For MVP/dev mode only — production should use Supabase.
 */

const DATA_DIR = path.join(process.cwd(), '.data')
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json')

// Default seed messages
const DEFAULT_MESSAGES: Record<string, any[]> = {
  '00000000-0000-0000-0000-000000000001': [
    {
      id: 'msg-1',
      project_id: '00000000-0000-0000-0000-000000000001',
      role: 'assistant',
      content: 'Welcome to Master Studio! How can I help you today?',
      type: 'text',
      created_at: new Date().toISOString(),
    },
  ],
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readStore(): Record<string, any[]> {
  ensureDataDir()
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const raw = fs.readFileSync(MESSAGES_FILE, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.error('[messageStore] Failed to read store, resetting:', err)
  }
  // Initialize with defaults
  writeStore(DEFAULT_MESSAGES)
  return { ...DEFAULT_MESSAGES }
}

function writeStore(data: Record<string, any[]>): void {
  ensureDataDir()
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

// ─── Public API ───────────────────────────────────────────

export function getMessages(projectId: string): any[] {
  const store = readStore()
  return store[projectId] || []
}

export function addMessage(projectId: string, message: any): void {
  const store = readStore()
  if (!store[projectId]) {
    store[projectId] = []
  }
  store[projectId].push(message)
  writeStore(store)
}

export function getAllMessages(): Record<string, any[]> {
  return readStore()
}
