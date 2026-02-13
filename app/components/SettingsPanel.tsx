'use client'

import { useState, useEffect } from 'react'

type Theme = 'dark' | 'light' | 'system'
type ModelProvider = 'openai' | 'anthropic' | 'google' | 'minimax'

interface NotificationSettings {
  email: boolean
  browser: boolean
  sound: boolean
  agentUpdates: boolean
  reviewAlerts: boolean
  dailyDigest: boolean
}

interface UserSettings {
  theme: Theme
  modelProvider: ModelProvider
  defaultModel: string
  notifications: NotificationSettings
  language: string
  autoSave: boolean
  compactMode: boolean
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  modelProvider: 'minimax',
  defaultModel: 'MiniMax-M2.5',
  notifications: {
    email: true,
    browser: true,
    sound: false,
    agentUpdates: true,
    reviewAlerts: true,
    dailyDigest: false,
  },
  language: 'tr',
  autoSave: true,
  compactMode: false,
}

const MODEL_OPTIONS: Record<ModelProvider, { id: string; name: string; description: string }[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'En güçlü çok modlu model' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Hızlı ve ekonomik' },
    { id: 'o3-mini', name: 'o3-mini', description: 'Reasoning optimizasyonlu' },
  ],
  anthropic: [
    { id: 'claude-opus', name: 'Claude Opus', description: 'Karmaşık görevler için' },
    { id: 'claude-sonnet', name: 'Claude Sonnet', description: 'Dengeli performans' },
    { id: 'claude-haiku', name: 'Claude Haiku', description: 'Hızlı yanıtlar' },
  ],
  google: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Hızlı ve verimli' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Gelişmiş yetenekler' },
  ],
  minimax: [
    { id: 'MiniMax-M2.5', name: 'MiniMax M2.5', description: 'Varsayılan - Dengeli' },
    { id: 'MiniMax-Text', name: 'MiniMax Text', description: 'Metin odaklı' },
  ],
}

const LANGUAGES = [
  { id: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { id: 'en', name: 'English', flag: '🇬🇧' },
]

export default function SettingsPanel() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'notifications'>('general')

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('master-studio-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      } catch (e) {
        console.error('Error parsing settings:', e)
      }
    }
  }, [])

  const saveSettings = () => {
    localStorage.setItem('master-studio-settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const updateNotification = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }))
  }

  const handleThemeChange = (theme: Theme) => {
    updateSetting('theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else if (theme === 'light') {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        document.documentElement.classList.add('dark')
        document.documentElement.classList.remove('light')
      } else {
        document.documentElement.classList.add('light')
        document.documentElement.classList.remove('dark')
      }
    }
  }

  const TabButton = ({ id, label, icon }: { id: typeof activeTab; label: string; icon: React.ReactNode }) => (
    <button
      className={`settings-tab ${activeTab === id ? 'active' : ''}`}
      onClick={() => setActiveTab(id)}
    >
      {icon}
      <span>{label}</span>
    </button>
  )

  const SettingRow = ({ 
    title, 
    description, 
    children,
    icon
  }: { 
    title: string
    description?: string
    children: React.ReactNode
    icon?: React.ReactNode
  }) => (
    <div className="setting-row">
      <div className="setting-info">
        {icon && <div className="setting-icon">{icon}</div>}
        <div>
          <div className="setting-title">{title}</div>
          {description && <div className="setting-desc">{description}</div>}
        </div>
      </div>
      <div className="setting-control">{children}</div>
    </div>
  )

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      className={`toggle ${checked ? 'active' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="toggle-thumb" />
    </button>
  )

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div className="settings-tabs">
          <TabButton 
            id="general" 
            label="Genel" 
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 4 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-4 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 4 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>}
          />
          <TabButton 
            id="ai" 
            label="AI Modelleri" 
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>}
          />
          <TabButton 
            id="notifications" 
            label="Bildirimler" 
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
          />
        </div>
        <button 
          className={`save-btn ${saved ? 'saved' : ''}`} 
          onClick={saveSettings}
        >
          {saved ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Kaydedildi
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Kaydet
            </>
          )}
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'general' && (
          <div className="settings-section">
            <h3 className="section-heading">Görünüm</h3>
            
            <SettingRow
              title="Tema"
              description="Arayüz tema tercihinizi seçin"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>}
            >
              <div className="theme-selector">
                {(['dark', 'light', 'system'] as Theme[]).map((theme) => (
                  <button
                    key={theme}
                    className={`theme-option ${settings.theme === theme ? 'active' : ''}`}
                    onClick={() => handleThemeChange(theme)}
                  >
                    {theme === 'dark' && <span>🌙</span>}
                    {theme === 'light' && <span>☀️</span>}
                    {theme === 'system' && <span>💻</span>}
                    <span className="theme-label">
                      {theme === 'dark' && 'Koyu'}
                      {theme === 'light' && 'Açık'}
                      {theme === 'system' && 'Sistem'}
                    </span>
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow
              title="Kompakt Mod"
              description="Daha kompakt arayüz ile daha fazla içerik görün"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>}
            >
              <Toggle 
                checked={settings.compactMode} 
                onChange={(v) => updateSetting('compactMode', v)} 
              />
            </SettingRow>

            <SettingRow
              title="Otomatik Kaydetme"
              description="Değişiklikleri otomatik olarak kaydet"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>}
            >
              <Toggle 
                checked={settings.autoSave} 
                onChange={(v) => updateSetting('autoSave', v)} 
              />
            </SettingRow>

            <h3 className="section-heading" style={{ marginTop: '32px' }}>Dil & Bölge</h3>

            <SettingRow
              title="Dil"
              description="Arayüz dilini seçin"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
            >
              <select 
                className="settings-select"
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.id} value={lang.id}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </SettingRow>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="settings-section">
            <h3 className="section-heading">Varsayılan Model</h3>

            <SettingRow
              title="AI Sağlayıcı"
              description="Varsayılan AI model sağlayıcısını seçin"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>}
            >
              <select 
                className="settings-select"
                value={settings.modelProvider}
                onChange={(e) => {
                  const provider = e.target.value as ModelProvider
                  updateSetting('modelProvider', provider)
                  updateSetting('defaultModel', MODEL_OPTIONS[provider][0].id)
                }}
              >
                <option value="minimax">🚀 MiniMax</option>
                <option value="openai">🤖 OpenAI</option>
                <option value="anthropic">🧠 Anthropic</option>
                <option value="google">✨ Google</option>
              </select>
            </SettingRow>

            <SettingRow
              title="Varsayılan Model"
              description="Sohbet için varsayılan model"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
            >
              <select 
                className="settings-select"
                value={settings.defaultModel}
                onChange={(e) => updateSetting('defaultModel', e.target.value)}
              >
                {MODEL_OPTIONS[settings.modelProvider].map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </SettingRow>

            <div className="model-info">
              <div className="model-card">
                <div className="model-card-header">
                  <span className="model-provider-badge">
                    {settings.modelProvider === 'minimax' && '🚀'}
                    {settings.modelProvider === 'openai' && '🤖'}
                    {settings.modelProvider === 'anthropic' && '🧠'}
                    {settings.modelProvider === 'google' && '✨'}
                    {' '}{settings.modelProvider.toUpperCase()}
                  </span>
                </div>
                <div className="model-card-body">
                  {MODEL_OPTIONS[settings.modelProvider].find(m => m.id === settings.defaultModel)?.description}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="settings-section">
            <h3 className="section-heading">Bildirim Kanalları</h3>

            <SettingRow
              title="E-posta Bildirimleri"
              description="Önemli güncellemeleri e-posta ile al"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
            >
              <Toggle 
                checked={settings.notifications.email} 
                onChange={(v) => updateNotification('email', v)} 
              />
            </SettingRow>

            <SettingRow
              title="Tarayıcı Bildirimleri"
              description="Masaüstü bildirimlerini etkinleştir"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
            >
              <Toggle 
                checked={settings.notifications.browser} 
                onChange={(v) => updateNotification('browser', v)} 
              />
            </SettingRow>

            <SettingRow
              title="Ses Bildirimleri"
              description="Yeni mesajlarda ses çal"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
            >
              <Toggle 
                checked={settings.notifications.sound} 
                onChange={(v) => updateNotification('sound', v)} 
              />
            </SettingRow>

            <h3 className="section-heading" style={{ marginTop: '32px' }}>Bildirim Tercihleri</h3>

            <SettingRow
              title="Agent Güncellemeleri"
              description="Agent işlemleri tamamlandığında bildir"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            >
              <Toggle 
                checked={settings.notifications.agentUpdates} 
                onChange={(v) => updateNotification('agentUpdates', v)} 
              />
            </SettingRow>

            <SettingRow
              title="Review Uyarıları"
              description="Bekleyen review'lar olduğunda bildir"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
            >
              <Toggle 
                checked={settings.notifications.reviewAlerts} 
                onChange={(v) => updateNotification('reviewAlerts', v)} 
              />
            </SettingRow>

            <SettingRow
              title="Günlük Özet"
              description="Her gün aktivite özetini gönder"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            >
              <Toggle 
                checked={settings.notifications.dailyDigest} 
                onChange={(v) => updateNotification('dailyDigest', v)} 
              />
            </SettingRow>
          </div>
        )}
      </div>

      <style jsx>{`
        .settings-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        
        .settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--glass-border);
          background: rgba(0,0,0,0.1);
        }
        
        .settings-tabs {
          display: flex;
          gap: 8px;
        }
        
        .settings-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .settings-tab:hover {
          background: rgba(255,255,255,0.04);
          color: var(--text-primary);
        }
        
        .settings-tab.active {
          background: linear-gradient(135deg, rgba(0,212,255,0.1), rgba(168,85,247,0.1));
          border-color: rgba(0,212,255,0.2);
          color: var(--text-primary);
        }
        
        .save-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .save-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .save-btn.saved {
          background: var(--accent-green);
        }
        
        .settings-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        
        .settings-section {
          max-width: 700px;
        }
        
        .section-heading {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          margin: 0 0 20px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        
        .setting-row:last-child {
          border-bottom: none;
        }
        
        .setting-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        
        .setting-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }
        
        .setting-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        
        .setting-desc {
          font-size: 12px;
          color: var(--text-tertiary);
        }
        
        .setting-control {
          display: flex;
          align-items: center;
        }
        
        .toggle {
          width: 48px;
          height: 26px;
          border-radius: 13px;
          background: rgba(255,255,255,0.1);
          border: none;
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
          padding: 0;
        }
        
        .toggle.active {
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
        }
        
        .toggle-thumb {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          transition: transform 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .toggle.active .toggle-thumb {
          transform: translateX(22px);
        }
        
        .settings-select {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          background: rgba(0,0,0,0.3);
          color: var(--text-primary);
          font-size: 13px;
          cursor: pointer;
          outline: none;
          min-width: 180px;
          transition: all 0.15s ease;
        }
        
        .settings-select:hover {
          border-color: var(--glass-border-hover);
        }
        
        .settings-select:focus {
          border-color: var(--accent-cyan);
        }
        
        .theme-selector {
          display: flex;
          gap: 8px;
        }
        
        .theme-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid var(--glass-border);
          background: rgba(0,0,0,0.2);
          color: var(--text-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .theme-option:hover {
          border-color: var(--glass-border-hover);
          color: var(--text-primary);
        }
        
        .theme-option.active {
          border-color: var(--accent-cyan);
          background: rgba(0,212,255,0.1);
          color: var(--text-primary);
        }
        
        .theme-label {
          font-size: 12px;
          font-weight: 500;
        }
        
        .model-info {
          margin-top: 24px;
          padding: 20px;
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
        }
        
        .model-card-header {
          margin-bottom: 10px;
        }
        
        .model-provider-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(168,85,247,0.15);
          color: var(--accent-purple);
        }
        
        .model-card-body {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        
        @media (max-width: 640px) {
          .settings-header {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }
          
          .setting-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          
          .theme-selector {
            flex-direction: column;
            width: 100%;
          }
          
          .theme-option {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
