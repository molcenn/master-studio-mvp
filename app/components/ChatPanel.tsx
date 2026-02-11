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
      return `<div class="chat-code-card">
        <div class="chat-code-card-header">
          <span class="chat-code-lang">${lang || 'code'}</span>
          <span class="chat-code-lines">${lineCount} satır</span>
          <button class="chat-code-copy" onclick="navigator.clipboard.writeText(document.getElementById('${id}').textContent);this.textContent='✓ Kopyalandı';setTimeout(()=>this.textContent='Kopyala',1500)">Kopyala</button>
        </div>
        <div class="chat-code-scroll">
          <pre class="chat-code-content" id="${id}"><code>${fullCode}</code></pre>
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

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  kimi: 'Kimi K2.5',
  sonnet: 'Claude Sonnet',
  opus: 'Claude Opus',
}

const MODEL_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  kimi: { bg: 'rgba(0,212,255,0.15)', text: '#00d4ff' },
  sonnet: { bg: 'rgba(236,72,153,0.15)', text: '#ec4899' },
  opus: { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
}

export default function ChatPanel({ projectId = '00000000-0000-0000-0000-000000000001', onHtmlDetected }: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'swarm'>('chat')
  const [selectedModel, setSelectedModel] = useState('kimi')
  const { messages, streamingContent, sendMessage, uploadFile, stopGeneration, isLoading } = useChat({ projectId, model: selectedModel })
  const [input, setInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    // Model command sync
    if (input.trim().startsWith('/model ')) {
      const model = input.trim().split(' ')[1]
      if (['kimi', 'sonnet', 'opus'].includes(model)) {
        setSelectedModel(model)
      }
    }
    await sendMessage(input)
    setInput('')
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
          Sohbet
        </button>
        <button 
          className={`chat-tab ${activeTab === 'swarm' ? 'active' : ''}`}
          onClick={() => setActiveTab('swarm')}
        >
          Agent Swarm
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
                  <span className="message-time">şimdi</span>
                </div>
                Merhaba Murat! AI Agent Dashboard projesinde sana nasıl yardımcı olabilirim? ✦
              </div>
            ) : (
              messages.map((msg: any) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  {msg.role === 'agent' && (
                    <div className="message-header">
                      <span className="message-agent-name">Betsy</span>
                      <span className="message-model">{MODEL_DISPLAY_NAMES[selectedModel]}</span>
                      <span className="message-time">
                        {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
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
                  <span className="message-time">şimdi</span>
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
                <span className="thinking-text">Düşünüyor...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="chat-input-header">
            <span className="model-badge-simple">Betsy</span>
          </div>
          <div className="chat-input-area">
            <div className="chat-input-wrapper">
              <div className="chat-input-actions">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="*/*"
                />
                <button className="chat-action-btn" onClick={handleFileClick} title="Dosya ekle">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>
                <button className="chat-action-btn" title="Ses kaydet">
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
                placeholder="Mesaj yaz..."
                className="chat-input"
                rows={2}
                disabled={isLoading}
              />
              {isLoading ? (
                <button 
                  onClick={stopGeneration}
                  className="stop-btn"
                  title="Durdur"
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
          </div>
        </>
      ) : (
        /* Swarm Tab Content */
        <div className="swarm-content">
          <select value={selectedModel} onChange={(e) => {
              const newModel = e.target.value
              setSelectedModel(newModel)
              // Otomatik model değiştirme komutu gönder
              sendMessage('/model ' + newModel)
            }}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.25)', color: 'var(--text-primary)', fontSize: '13px', marginBottom: '12px' }}>
            <option value="kimi">Kimi K2.5 — Hızlı, günlük görevler</option>
            <option value="sonnet">Claude Sonnet — UI/UX, coding</option>
            <option value="opus">Claude Opus — Derin analiz, review</option>
          </select>
          <div className="swarm-section-title">Aktif Agent'lar</div>
          <div className="swarm-agent-card">
            <div className="swarm-agent-header">
              <div className="swarm-avatar cyan">K</div>
              <div>
                <div className="swarm-agent-name">Kimi</div>
                <div className="swarm-agent-model">Kimi K2.5</div>
              </div>
              <div className="swarm-status">
                <div className="swarm-status-dot working"></div>
                <span>Çalışıyor</span>
              </div>
            </div>
            <div className="swarm-task">Dashboard layout refactoring</div>
            <div className="swarm-progress">
              <div className="swarm-progress-bar">
                <div className="swarm-progress-fill cyan" style={{ width: '75%' }}></div>
              </div>
            </div>
          </div>

          <div className="swarm-agent-card">
            <div className="swarm-agent-header">
              <div className="swarm-avatar purple">O</div>
              <div>
                <div className="swarm-agent-name">Opus</div>
                <div className="swarm-agent-model">Claude Opus</div>
              </div>
              <div className="swarm-status">
                <div className="swarm-status-dot idle"></div>
                <span>Bekliyor</span>
              </div>
            </div>
            <div className="swarm-task">Review queue'da görev bekliyor</div>
          </div>

          <div className="swarm-agent-card">
            <div className="swarm-agent-header">
              <div className="swarm-avatar pink">C</div>
              <div>
                <div className="swarm-agent-name">Claude</div>
                <div className="swarm-agent-model">Claude Sonnet</div>
              </div>
              <div className="swarm-status">
                <div className="swarm-status-dot working"></div>
                <span>Çalışıyor</span>
              </div>
            </div>
            <div className="swarm-task">Wireframe alternatifleri hazırlıyor</div>
            <div className="swarm-progress">
              <div className="swarm-progress-bar">
                <div className="swarm-progress-fill pink" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>

          <div className="swarm-agent-card">
            <div className="swarm-agent-header">
              <div className="swarm-avatar green">S</div>
              <div>
                <div className="swarm-agent-name">Sonnet</div>
                <div className="swarm-agent-model">Claude Sonnet 3.5</div>
              </div>
              <div className="swarm-status">
                <div className="swarm-status-dot waiting"></div>
                <span>Review Bekliyor</span>
              </div>
            </div>
            <div className="swarm-task">API endpoint testleri tamamlandı</div>
          </div>
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
        .swarm-content { padding: 14px; display: flex; flex-direction: column; gap: 10px; flex: 1; overflow-y: auto; }
        .swarm-section-title { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .swarm-agent-card {
          background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border);
          border-radius: 12px; padding: 12px; transition: all 0.15s ease;
        }
        .swarm-agent-card:hover { border-color: var(--glass-border-hover); }
        .swarm-agent-header {
          display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
        }
        .swarm-avatar {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
        }
        .swarm-avatar.cyan { background: linear-gradient(135deg, var(--accent-cyan), #0ea5e9); }
        .swarm-avatar.purple { background: linear-gradient(135deg, var(--accent-purple), #7c3aed); }
        .swarm-avatar.pink { background: linear-gradient(135deg, var(--accent-pink), #f43f5e); }
        .swarm-avatar.green { background: linear-gradient(135deg, var(--accent-green), #16a34a); }
        .swarm-agent-name { font-size: 12px; font-weight: 600; }
        .swarm-agent-model { font-size: 9px; color: var(--text-tertiary); margin-top: 1px; }
        .swarm-status {
          margin-left: auto; display: flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 500;
        }
        .swarm-status-dot { width: 6px; height: 6px; border-radius: 50%; }
        .swarm-status-dot.working { background: var(--accent-green); }
        .swarm-status-dot.idle { background: var(--text-tertiary); }
        .swarm-status-dot.waiting { background: var(--accent-amber); }
        .swarm-status-dot.error { background: var(--accent-red); }
        .swarm-task {
          font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;
          padding-left: 38px;
        }
        .swarm-progress {
          padding-left: 38px;
        }
        .swarm-progress-bar {
          width: 100%; height: 3px; border-radius: 2px;
          background: rgba(255,255,255,0.06);
        }
        .swarm-progress-fill {
          height: 100%; border-radius: 2px;
          transition: width 0.6s ease;
        }
        .swarm-progress-fill.cyan { background: var(--accent-cyan); }
        .swarm-progress-fill.purple { background: var(--accent-purple); }
        .swarm-progress-fill.pink { background: var(--accent-pink); }
        .swarm-progress-fill.green { background: var(--accent-green); }
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
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          margin: 10px 0;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
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
          max-height: 200px;
          overflow-y: auto;
          overflow-x: hidden;
        }
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
