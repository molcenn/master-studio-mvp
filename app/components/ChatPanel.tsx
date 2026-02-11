'use client'

import { useChat } from '@/lib/hooks/useChat'
import { useState, useRef, useEffect } from 'react'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderMarkdown(text: string): string {
  return text
    // Code blocks: ```lang\ncode\n``` → scrollable code card window
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const lines = code.trim().split('\n')
      const fullCode = escapeHtml(code.trim())
      const lineCount = lines.length
      const id = 'code-' + Math.random().toString(36).substr(2, 9)
      const codePreview = code.trim().substring(0, 30).replace(/'/g, "\\'")
      return `<div class="chat-code-card">
        <div class="chat-code-card-header">
          <span class="chat-code-lang">${lang || 'code'}</span>
          <span class="chat-code-lines">${lineCount} lines</span>
          <button class="chat-code-copy" onclick="navigator.clipboard.writeText(document.getElementById('${id}').textContent);this.textContent='✓ Copied';setTimeout(()=>this.textContent='Copy',1500)">Copy</button>
        </div>
        <div class="chat-code-scroll">
          <pre class="chat-code-content" id="${id}"><code>${fullCode}</code></pre>
        </div>
        <div class="code-card-actions">
          <button class="code-approve-btn" id="approve-${id}" onclick="
            this.textContent='✓ Approved';
            this.disabled=true;
            this.style.opacity='0.5';
            var actions = JSON.parse(localStorage.getItem('review-actions')||'[]');
            actions.push({id:'${id}',action:'approved',code:'${codePreview}',timestamp:Date.now()});
            localStorage.setItem('review-actions',JSON.stringify(actions));
            window.dispatchEvent(new Event('review-action'));
          ">✓ Approve</button>
          <button class="code-fix-btn" id="fix-${id}" onclick="
            this.textContent='✎ Fix Requested';
            this.disabled=true;
            this.style.opacity='0.5';
            var actions = JSON.parse(localStorage.getItem('review-actions')||'[]');
            actions.push({id:'${id}',action:'rejected',code:'${codePreview}',timestamp:Date.now()});
            localStorage.setItem('review-actions',JSON.stringify(actions));
            window.dispatchEvent(new Event('review-action'));
          ">✎ Request Fix</button>
        </div>
      </div>`
    })
    // Inline code: `code` → <code>
    .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')
    // Bold: **text** → <strong>
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic: *text* → <em>
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Headers: ### text → h3
    .replace(/^### (.+)$/gm, '<div class="chat-heading h3">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="chat-heading h2">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="chat-heading h1">$1</div>')
    // Bullet lists: - item → li
    .replace(/^- (.+)$/gm, '<div class="chat-list-item">• $1</div>')
    // Numbered lists: 1. item → li
    .replace(/^\d+\. (.+)$/gm, '<div class="chat-list-item-num">$1</div>')
    // Paragraphs: double newline
    .replace(/\n\n/g, '<div class="chat-paragraph-break"></div>')
    // Single newline → <br>
    .replace(/\n/g, '<br/>')
}

interface ChatPanelProps {
  projectId?: string
  onHtmlDetected?: () => void
}

interface ChatAgent {
  id: string
  name: string
  model: string
  description: string
  createdAt: string
  isDefault?: boolean
}

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  kimi: 'Kimi K2.5',
  sonnet: 'Sonnet 4.5',
  opus: 'Opus 4.6',
  'gpt-4o': 'GPT-4o',
}

const MODEL_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  kimi: { bg: 'rgba(0,212,255,0.15)', text: '#00d4ff' },
  sonnet: { bg: 'rgba(236,72,153,0.15)', text: '#ec4899' },
  opus: { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
  'gpt-4o': { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
}

export default function ChatPanel({ projectId = '00000000-0000-0000-0000-000000000001', onHtmlDetected }: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'swarm'>('chat')
  const [selectedModel, setSelectedModel] = useState('kimi')
  const { messages, streamingContent, sendMessage, uploadFile, stopGeneration, isLoading } = useChat({ projectId, model: selectedModel })
  const [input, setInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Agent management
  const [agents, setAgents] = useState<ChatAgent[]>([])
  const [activeAgentId, setActiveAgentId] = useState('main')
  const [showAgentForm, setShowAgentForm] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentModel, setNewAgentModel] = useState('kimi')
  const [newAgentDesc, setNewAgentDesc] = useState('')

  // Load agents from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('master-studio-agents')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setAgents(parsed)
      } catch (e) {
        console.error('Failed to parse agents:', e)
      }
    }
  }, [])

  // Save agents to localStorage when changed
  useEffect(() => {
    localStorage.setItem('master-studio-agents', JSON.stringify(agents))
  }, [agents])

  const handleCreateAgent = () => {
    if (!newAgentName.trim()) return
    const newAgent: ChatAgent = {
      id: 'agent-' + Date.now(),
      name: newAgentName.trim(),
      model: newAgentModel,
      description: newAgentDesc.trim(),
      createdAt: new Date().toISOString(),
    }
    setAgents([...agents, newAgent])
    setNewAgentName('')
    setNewAgentModel('kimi')
    setNewAgentDesc('')
    setShowAgentForm(false)
  }

  const handleDeleteAgent = (id: string) => {
    setAgents(agents.filter(a => a.id !== id))
    if (activeAgentId === id) {
      setActiveAgentId('main')
    }
  }

  const getAgentInitials = (name: string) => {
    return name.slice(0, 1).toUpperCase()
  }

  const getModelDisplayName = (model: string) => {
    return MODEL_DISPLAY_NAMES[model] || model
  }

  // Auto-scroll to bottom when messages or streaming content changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Auto-detect HTML in agent messages and notify parent
  useEffect(() => {
    if (!onHtmlDetected || messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role !== 'user' && /```html/i.test(lastMsg.content)) {
      onHtmlDetected()
    }
  }, [messages, onHtmlDetected])

  const handleSend = async () => {
    if (!input.trim()) return

    const msg = input.trim()
    setInput('') // Clear immediately for better UX

    // Model command sync
    if (msg.startsWith('/model ')) {
      const model = msg.split(' ')[1]
      if (['kimi', 'sonnet', 'opus', 'gpt-4o'].includes(model)) {
        setSelectedModel(model)
      }
    }

    // Spawn command
    if (msg.startsWith('/spawn ')) {
      const task = msg.substring(7)
      await sendMessage(msg)

      // Send to spawn API in background
      try {
        const res = await fetch('/api/ai/spawn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task,
            model: selectedModel === 'kimi' ? 'moonshot/kimi-k2.5' :
                   selectedModel === 'sonnet' ? 'anthropic/claude-sonnet-4-5-20250929' :
                   selectedModel === 'opus' ? 'anthropic/claude-opus-4-6' :
                   selectedModel === 'gpt-4o' ? 'openai/gpt-4o' : 'moonshot/kimi-k2.5'
          })
        })
        const data = await res.json()
        console.log('Spawn result:', data)
      } catch (err) {
        console.error('Spawn error:', err)
      }
      return
    }

    await sendMessage(msg)
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      await uploadFile(file)
    } catch (err) {
      console.error('File upload error:', err)
    }
    
    e.target.value = ''
  }

  return (
    <aside className="panel chat" style={{ borderLeft: '1px solid var(--glass-border)' }}>
      {/* Chat Tabs */}
      <div className="chat-tabs">
        <button 
          className={`chat-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button 
          className={`chat-tab ${activeTab === 'swarm' ? 'active' : ''}`}
          onClick={() => setActiveTab('swarm')}
        >
          Agents
        </button>
      </div>

      {activeTab === 'chat' ? (
        <>
          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="message system">
                <div className="message-header">
                  <span className="message-agent-name">Betsy</span>
                  <span className="message-model">{MODEL_DISPLAY_NAMES[selectedModel]}</span>
                  <span className="message-time">now</span>
                </div>
                Hello! How can I help you with your project today? ✦
              </div>
            ) : (
              messages.map((msg: any) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  {msg.role === 'agent' && (
                    <div className="message-header">
                      <span className="message-agent-name">Betsy</span>
                      <span className="message-model">{MODEL_DISPLAY_NAMES[selectedModel]}</span>
                      <span className="message-time">
                        {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  
                  {msg.type === 'file' && msg.file_info && (
                    <div className="file-preview-card">
                      <div className="file-preview-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <div className="file-preview-info">
                        <div className="file-preview-name">
                          {typeof msg.file_info === 'string' 
                            ? JSON.parse(msg.file_info).name 
                            : msg.file_info.name}
                        </div>
                        <div className="file-preview-meta">
                          {typeof msg.file_info === 'string'
                            ? JSON.parse(msg.file_info).type
                            : msg.file_info.type}
                        </div>
                      </div>
                      <button className="file-preview-action">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {streamingContent && (
              <div className="message agent">
                <div className="message-header">
                  <span className="message-agent-name">Betsy</span>
                  <span className="message-model">{MODEL_DISPLAY_NAMES[selectedModel]}</span>
                  <span className="message-time">now</span>
                </div>
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }} />
              </div>
            )}
            
            {isLoading && !streamingContent && (
              <div className="thinking-indicator">
                <div className="thinking-dots">
                  <div className="thinking-dot"></div>
                  <div className="thinking-dot"></div>
                  <div className="thinking-dot"></div>
                </div>
                <span className="thinking-text">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="chat-input-header">
            <span className="model-badge-simple">Betsy</span>
          </div>
          <div className="chat-input-area" style={{ position: 'relative' }}>
            {input.startsWith('/') && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                background: 'rgba(10,10,20,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '8px',
                marginBottom: '4px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                zIndex: 100,
              }}>
                <div style={{ padding: '4px 8px', cursor: 'pointer' }} onClick={() => setInput('/model ')}>
                  <span style={{ color: 'var(--accent-cyan)' }}>/model</span> kimi|sonnet|opus|gpt-4o — Switch model
                </div>
                <div style={{ padding: '4px 8px', cursor: 'pointer' }} onClick={() => setInput('/spawn ')}>
                  <span style={{ color: 'var(--accent-purple)' }}>/spawn</span> [task] — Start sub-agent
                </div>
              </div>
            )}
            <div className="chat-input-wrapper">
              <div className="chat-input-actions">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="*/*"
                />
                <button className="chat-action-btn" onClick={handleFileClick} title="Upload file">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>
                <button className="chat-action-btn" title="Record voice">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </button>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Type a message... (/model, /spawn)"
                className="chat-input"
                rows={2}
                disabled={isLoading}
              />
              {isLoading ? (
                <button 
                  onClick={stopGeneration}
                  className="stop-btn"
                  title="Stop"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                </button>
              ) : (
                <button 
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="send-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              )}
            </div>
            {/* Bottom Model Selector */}
            <div style={{ padding: '6px 0 0', display: 'flex', justifyContent: 'flex-end' }}>
              <select 
                value={selectedModel} 
                onChange={(e) => {
                  const newModel = e.target.value
                  setSelectedModel(newModel)
                  sendMessage('/model ' + newModel)
                }}
                style={{ 
                  height: '24px', 
                  padding: '2px 8px', 
                  borderRadius: '4px', 
                  border: '1px solid var(--glass-border)', 
                  background: 'rgba(0,0,0,0.25)', 
                  color: 'var(--text-secondary)', 
                  fontSize: '11px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="kimi">Kimi K2.5</option>
                <option value="sonnet">Sonnet 4.5</option>
                <option value="opus">Opus 4.6</option>
                <option value="gpt-4o">GPT-4o</option>
              </select>
            </div>
          </div>
        </>
      ) : (
        /* Agents Tab Content */
        <div className="agents-content">
          <div className="agents-section-title">Agents</div>
          
          {/* Main Agent (Betsy) - Always first, cannot be deleted */}
          <div 
            className={`agent-item ${activeAgentId === 'main' ? 'active' : ''}`}
            onClick={() => setActiveAgentId('main')}
          >
            <div className="agent-avatar">B</div>
            <div className="agent-info">
              <div className="agent-name">Betsy</div>
              <div className="agent-model">{getModelDisplayName(selectedModel)}</div>
            </div>
            <div className="agent-status-dot active"></div>
          </div>

          {/* User-created agents */}
          {agents.map((agent) => (
            <div 
              key={agent.id}
              className={`agent-item ${activeAgentId === agent.id ? 'active' : ''}`}
              onClick={() => setActiveAgentId(agent.id)}
            >
              <div className="agent-avatar">{getAgentInitials(agent.name)}</div>
              <div className="agent-info">
                <div className="agent-name">{agent.name}</div>
                <div className="agent-model">{getModelDisplayName(agent.model)}</div>
              </div>
              <div className="agent-status-dot idle"></div>
              <button 
                className="agent-delete-btn"
                onClick={(e) => { e.stopPropagation(); handleDeleteAgent(agent.id); }}
                title="Delete agent"
              >
                ×
              </button>
            </div>
          ))}

          {/* New Agent Button / Form */}
          {!showAgentForm ? (
            <button 
              className="new-agent-btn"
              onClick={() => setShowAgentForm(true)}
            >
              <span>+</span> New Agent
            </button>
          ) : (
            <div className="agent-form">
              <div className="agent-form-field">
                <label>Name</label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Agent name"
                  autoFocus
                />
              </div>
              <div className="agent-form-field">
                <label>Model</label>
                <select 
                  value={newAgentModel} 
                  onChange={(e) => setNewAgentModel(e.target.value)}
                >
                  <option value="kimi">Kimi K2.5</option>
                  <option value="sonnet">Sonnet 4.5</option>
                  <option value="opus">Opus 4.6</option>
                  <option value="gpt-4o">GPT-4o</option>
                </select>
              </div>
              <div className="agent-form-field">
                <label>Description</label>
                <textarea
                  value={newAgentDesc}
                  onChange={(e) => setNewAgentDesc(e.target.value)}
                  placeholder="What does this agent do?"
                  rows={2}
                />
              </div>
              <div className="agent-form-actions">
                <button 
                  className="agent-form-cancel"
                  onClick={() => {
                    setShowAgentForm(false)
                    setNewAgentName('')
                    setNewAgentModel('kimi')
                    setNewAgentDesc('')
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="agent-form-create"
                  onClick={handleCreateAgent}
                  disabled={!newAgentName.trim()}
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .panel {
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .chat-tabs {
          display: flex; gap: 0; border-bottom: 1px solid var(--glass-border);
        }
        .chat-tab {
          flex: 1; padding: 10px; text-align: center;
          font-size: 11px; font-weight: 500; letter-spacing: 0.5px;
          text-transform: uppercase; color: var(--text-tertiary);
          border: none; background: none; cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.15s ease;
        }
        .chat-tab.active { color: var(--text-primary); border-bottom-color: var(--accent-cyan); }
        .chat-tab:hover:not(.active) { color: var(--text-secondary); }
        .chat-messages {
          flex: 1; overflow-y: auto; overflow-x: hidden; padding: 16px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .message {
          max-width: 88%; padding: 10px 14px;
          border-radius: 16px; font-size: 13px;
          line-height: 1.55;
        }
        .message.user {
          align-self: flex-end;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          border-bottom-right-radius: 4px;
        }
        .message.agent {
          align-self: flex-start;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--glass-border);
          border-bottom-left-radius: 4px;
        }
        .message.system {
          align-self: center; max-width: 100%;
          background: rgba(168,85,247,0.08);
          border: 1px solid rgba(168,85,247,0.15);
          border-radius: 8px;
          font-size: 11px; color: var(--text-secondary);
          text-align: center; padding: 8px 14px;
        }
        .message-header {
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 4px;
        }
        .message-agent-name { font-size: 11px; font-weight: 600; color: var(--accent-cyan); }
        .message-model { font-size: 9px; color: var(--text-tertiary); }
        .message-time { font-size: 9px; color: var(--text-tertiary); margin-left: auto; }
        .thinking-indicator {
          display: flex; align-items: center; gap: 6px;
          align-self: flex-start; padding: 8px 14px;
        }
        .thinking-dots { display: flex; gap: 4px; }
        .thinking-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--accent-cyan); opacity: 0.3;
          animation: thinking 1.4s infinite;
        }
        .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
        .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes thinking {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .thinking-text { font-size: 11px; color: var(--text-tertiary); }
        .chat-input-header {
          padding: 8px 14px 0;
          display: flex;
          justify-content: flex-end;
        }
        .model-badge {
          font-size: 10px;
          font-weight: 500;
          padding: 3px 8px;
          border-radius: 10px;
          border: 1px solid currentColor;
          opacity: 0.8;
        }
        .model-badge-simple {
          font-size: 10px;
          font-weight: 500;
          padding: 3px 8px;
          border-radius: 10px;
          border: 1px solid var(--accent-cyan);
          color: var(--accent-cyan);
          opacity: 0.8;
        }
        .chat-input-area {
          padding: 8px 14px 12px; border-top: none;
          flex-shrink: 0;
        }
        .chat-input-wrapper {
          display: flex; align-items: flex-end; gap: 8px;
          background: rgba(0,0,0,0.25); border-radius: 16px;
          padding: 6px 6px 6px 14px; border: 1px solid var(--glass-border);
          transition: border-color 0.15s ease;
        }
        .chat-input-wrapper:focus-within { border-color: rgba(0,212,255,0.3); }
        .chat-input {
          flex: 1; background: transparent; border: none;
          color: var(--text-primary); font-size: 13px; resize: none;
          outline: none; min-height: 40px; max-height: 100px;
          font-family: inherit; line-height: 1.4;
        }
        .chat-input::placeholder { color: var(--text-tertiary); }
        .chat-input-actions {
          display: flex; align-items: center; gap: 2px;
          flex-shrink: 0;
        }
        .chat-action-btn {
          width: 30px; height: 30px; border-radius: 50%;
          border: none; background: transparent;
          color: var(--text-tertiary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s ease; flex-shrink: 0;
        }
        .chat-action-btn:hover {
          color: var(--accent-cyan); background: rgba(0,212,255,0.08);
        }
        .send-btn {
          width: 30px; height: 30px; border-radius: 50%; border: none;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          color: white; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.15s ease, opacity 0.15s ease;
          flex-shrink: 0; opacity: 0.7;
        }
        .send-btn:hover { transform: scale(1.05); opacity: 1; }
        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .stop-btn {
          width: 30px; height: 30px; border-radius: 50%; border: none;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.15s ease, opacity 0.15s ease;
          flex-shrink: 0;
          animation: pulse 1.5s infinite;
        }
        .stop-btn:hover { transform: scale(1.05); opacity: 1; animation: none; }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
        .agents-content { padding: 14px; display: flex; flex-direction: column; gap: 6px; flex: 1; overflow-y: auto; }
        .agents-section-title { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .agent-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
          position: relative;
        }
        .agent-item:hover { background: rgba(255,255,255,0.05); }
        .agent-item.active { background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.2); }
        .agent-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 600;
          background: rgba(0,212,255,0.15); color: var(--accent-cyan);
          flex-shrink: 0;
        }
        .agent-info { flex: 1; min-width: 0; }
        .agent-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .agent-model { font-size: 10px; color: var(--text-tertiary); margin-top: 2px; }
        .agent-status-dot { width: 8px; height: 8px; border-radius: 50%; margin-left: auto; flex-shrink: 0; }
        .agent-status-dot.active { background: #22c55e; }
        .agent-status-dot.idle { background: rgba(255,255,255,0.2); }
        .agent-delete-btn {
          width: 18px; height: 18px; border-radius: 50%;
          border: none; background: rgba(239,68,68,0.2);
          color: #ef4444; font-size: 14px; line-height: 1;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.15s; margin-left: 6px; flex-shrink: 0;
        }
        .agent-item:hover .agent-delete-btn { opacity: 1; }
        .agent-delete-btn:hover { background: rgba(239,68,68,0.4); }
        .new-agent-btn {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 10px 12px; margin-top: 8px;
          border: 1px dashed var(--glass-border);
          border-radius: 8px; background: transparent;
          color: var(--text-secondary); font-size: 12px;
          cursor: pointer; transition: all 0.15s;
        }
        .new-agent-btn:hover {
          border-color: var(--accent-cyan);
          color: var(--accent-cyan);
          background: rgba(0,212,255,0.05);
        }
        .agent-form {
          padding: 12px;
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          background: rgba(0,0,0,0.2);
          margin-top: 8px;
        }
        .agent-form-field { margin-bottom: 10px; }
        .agent-form-field label {
          display: block;
          font-size: 10px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .agent-form-field input,
        .agent-form-field select,
        .agent-form-field textarea {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--glass-border);
          border-radius: 6px;
          background: rgba(0,0,0,0.25);
          color: var(--text-primary);
          font-size: 12px;
          font-family: inherit;
          outline: none;
        }
        .agent-form-field input:focus,
        .agent-form-field select:focus,
        .agent-form-field textarea:focus {
          border-color: rgba(0,212,255,0.3);
        }
        .agent-form-field textarea { resize: none; }
        .agent-form-actions {
          display: flex; gap: 8px; justify-content: flex-end;
        }
        .agent-form-cancel {
          padding: 6px 12px;
          border: 1px solid var(--glass-border);
          border-radius: 6px;
          background: transparent;
          color: var(--text-secondary);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .agent-form-cancel:hover {
          background: rgba(255,255,255,0.05);
          color: var(--text-primary);
        }
        .agent-form-create {
          padding: 6px 14px;
          border: none;
          border-radius: 6px;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          color: white;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .agent-form-create:hover:not(:disabled) { opacity: 0.9; }
        .agent-form-create:disabled { opacity: 0.4; cursor: not-allowed; }
        .file-preview-card {
          background: rgba(0,0,0,0.25); border: 1px solid var(--glass-border);
          border-radius: 12px; padding: 10px 12px;
          margin-top: 8px; display: flex; align-items: center; gap: 10px;
        }
        .file-preview-icon {
          width: 36px; height: 36px; border-radius: 8px;
          background: linear-gradient(135deg, rgba(0,212,255,0.15), rgba(168,85,247,0.15));
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .file-preview-info { flex: 1; min-width: 0; }
        .file-preview-name {
          font-size: 12px; font-weight: 500; color: var(--text-primary);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .file-preview-meta {
          font-size: 10px; color: var(--text-tertiary); margin-top: 2px;
        }
        .file-preview-action {
          width: 28px; height: 28px; border-radius: 6px;
          border: 1px solid var(--glass-border); background: transparent;
          color: var(--text-tertiary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s ease; flex-shrink: 0;
        }
        .file-preview-action:hover {
          border-color: var(--accent-cyan); color: var(--accent-cyan);
        }
        .hidden { display: none; }
        .chat-code-card {
          background: rgba(10, 10, 20, 0.85);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          margin: 6px 0;
          max-width: 95%;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .chat-code-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(0,0,0,0.4);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .chat-code-lang {
          font-size: 10px;
          padding: 2px 8px;
          background: var(--accent-purple);
          color: white;
          border-radius: 4px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .chat-code-lines {
          font-size: 10px;
          color: var(--text-tertiary);
          margin-left: auto;
        }
        .chat-code-copy {
          font-size: 10px;
          padding: 3px 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .chat-code-copy:hover {
          background: rgba(255,255,255,0.1);
          color: var(--text-primary);
        }
        .chat-code-scroll {
          max-height: 150px;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .code-card-actions {
          display: flex;
          gap: 8px;
          padding: 8px 12px;
          border-top: 1px solid rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.2);
        }
        .code-approve-btn {
          flex: 1;
          padding: 5px 10px;
          border: 1px solid rgba(74,222,128,0.3);
          background: rgba(74,222,128,0.1);
          color: #4ade80;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .code-approve-btn:hover { background: rgba(74,222,128,0.2); }
        .code-fix-btn {
          flex: 1;
          padding: 5px 10px;
          border: 1px solid rgba(251,191,36,0.3);
          background: rgba(251,191,36,0.1);
          color: #fbbf24;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .code-fix-btn:hover { background: rgba(251,191,36,0.2); }
        .chat-code-content {
          margin: 0;
          padding: 12px;
          font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;
          font-size: 11px;
          line-height: 1.6;
          color: #e0e0e0;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .chat-inline-code {
          background: rgba(255,255,255,0.08);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 12px;
        }
        .chat-heading.h1 { font-size: 16px; font-weight: 700; margin: 8px 0 4px; }
        .chat-heading.h2 { font-size: 14px; font-weight: 600; margin: 6px 0 4px; }
        .chat-heading.h3 { font-size: 13px; font-weight: 600; margin: 4px 0 2px; color: var(--accent-cyan); }
        .chat-list-item, .chat-list-item-num { padding-left: 8px; margin: 2px 0; }
        .chat-paragraph-break { height: 8px; }
      `}</style>
    </aside>
  )
}
