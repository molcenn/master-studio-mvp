# Master Studio MVP — Kimi Geliştirme Guide'ı

## Proje Durumu
Dashboard çalışıyor, chat entegrasyonu canlı (Gateway `/v1/chat/completions` üzerinden).
Temel yapı var ama çoğu şey statik/hardcoded. Gerçek fonksiyonelliğe kavuşturulacak.

## Teknik Altyapı
- **Stack:** Next.js 14 + TypeScript + Tailwind CSS + Supabase + NextAuth
- **Konum:** `/root/clawd/projects/master-studio-mvp/`
- **Port:** 3000 (systemd: `master-studio.service`)
- **Auth:** Credentials (şifre: env `STUDIO_PASSWORD`)
- **DB:** Supabase (tablolar: `projects`, `messages`, `files`)
- **AI Chat:** Gateway `/v1/chat/completions` (port 18789, token: env `OPENCLAW_TOKEN`)
- **Stil:** iOS glass morphism (blur 40px, dark theme, gradient accents)

## Dosya Yapısı
```
app/
├── page.tsx                    → Dashboard component render
├── layout.tsx                  → Root layout (Providers wrap)
├── globals.css                 → CSS variables, glass morphism
├── components/
│   ├── Dashboard.tsx           → 3 kolon grid (sidebar, main, chat)
│   ├── Sidebar.tsx             → Navigation, skills, projects listesi
│   ├── MainWorkspace.tsx       → Dashboard view (stats, cards, reviews)
│   ├── ChatPanel.tsx           → Chat + Agent Swarm tabs
│   └── Providers.tsx           → SessionProvider wrap
├── auth/signin/                → Login sayfası
├── api/
│   ├── ai/chat/route.ts        → Gateway'e POST, AI yanıt al
│   ├── chat/route.ts           → Mesaj GET/POST (Supabase)
│   ├── stream/route.ts         → SSE heartbeat (sadece heartbeat, mesaj push yok)
│   ├── upload/route.ts         → Dosya upload (Supabase Storage)
│   └── auth/[...nextauth]/     → NextAuth handler
lib/
├── auth.ts                     → NextAuth config (credentials)
├── db.ts                       → Supabase client
└── hooks/useChat.ts            → Chat hook (sendMessage, uploadFile, stopGeneration)
```

## Supabase Şeması
- `projects`: id (uuid), name (text)
- `messages`: id (uuid), project_id (uuid), user_id (uuid), role (text), content (text), type (text), file_info (jsonb), created_at
- `files`: Supabase Storage bucket

**Önemli:** Tüm ID'ler UUID formatında. Default user: `00000000-0000-0000-0000-000000000002`, system: `00000000-0000-0000-0000-000000000099`, default project: `00000000-0000-0000-0000-000000000001`

## Mevcut Sorunlar ve Yapılacaklar

### Görev 1: Sidebar Projects — Gerçek Veri
**Sorun:** Sidebar'daki projeler hardcoded array. Supabase'den çekilmiyor.
**Çözüm:**
- `Sidebar.tsx`'de Supabase'den projeleri çek (`/api/projects` endpoint yaz)
- "Yeni Proje" butonu çalışsın (modal/form + Supabase insert)
- Sidebar'daki diğer projeler (`lansman-videosu`, `deneyim-merkezi` vb.) UUID'leri yok — ya Supabase'e ekle ya da kaldır

### Görev 2: MainWorkspace — Dinamik İçerik
**Sorun:** Stats, proje kartları, review listesi tamamen statik.
**Çözüm:**
- Stats: Supabase'den gerçek sayıları çek (proje sayısı, mesaj sayısı vb.)
- Proje kartları: `projects` tablosundan çek
- Review listesi: Şimdilik boş göster veya placeholder bırak
- `activeProject` değiştiğinde main content da değişsin

### Görev 3: Chat Panel — SSE Streaming
**Sorun:** Chat yanıtları blok halinde geliyor, streaming yok.
**Çözüm:**
- `api/ai/chat/route.ts`'de Gateway'e `stream: true` gönder
- Yanıtı SSE olarak client'a aktar
- `useChat.ts`'de streaming parse et (delta chunks)
- Mesajlar karakter karakter görünsün

### Görev 4: SSE Real-time Messages
**Sorun:** `api/stream/route.ts` sadece heartbeat gönderiyor, yeni mesaj push etmiyor.
**Çözüm:**
- Supabase Realtime subscription kullan VEYA
- Polling ile yeni mesajları kontrol et (her 3 saniye)
- Yeni mesaj geldiğinde chat'e ekle

### Görev 5: Dosya Upload UI İyileştirme
**Sorun:** Upload çalışıyor ama progress bar yok, preview yok.
**Çözüm:**
- Upload progress göster
- Resim dosyaları için thumbnail preview
- Drag & drop desteği

### Görev 6: Proje Detay Sayfası
**Sorun:** Sidebar'dan proje seçince sadece chat projectId değişiyor, main workspace aynı kalıyor.
**Çözüm:**
- `activeProject` değişince MainWorkspace'i güncelle
- Proje bazlı dosyalar, notlar, timeline göster
- Her proje için ayrı chat geçmişi (zaten var, projectId ile)

### Görev 7: Agent Swarm Tab
**Sorun:** Swarm tab tamamen statik/hardcoded.
**Çözüm:**
- Şimdilik statik bırakılabilir (gerçek agent swarm entegrasyonu ileri faz)
- Alternatif: Gateway'den session listesi çek, aktif sub-agent'ları göster

### Görev 8: Mobil Responsive
**Sorun:** 3 kolon grid mobilde çalışmıyor.
**Çözüm:**
- Mobilde tek kolon, tab navigation
- Sidebar drawer (swipe ile açılır)
- Chat full-screen mode

## Öncelik Sırası
1. **Görev 3** (Streaming chat) — En kritik, kullanıcı deneyimi
2. **Görev 1** (Sidebar projects) — Temel fonksiyon
3. **Görev 2** (Dinamik MainWorkspace) — İçerik
4. **Görev 6** (Proje detay) — Navigasyon
5. **Görev 4** (SSE real-time) — Nice to have
6. **Görev 5** (Upload UI) — Nice to have
7. **Görev 8** (Mobil) — Nice to have
8. **Görev 7** (Agent Swarm) — İleri faz

## Teknik Notlar

### Gateway Chat API
```bash
# Non-streaming
curl -sS http://localhost:18789/v1/chat/completions \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"model":"openclaw:main","messages":[{"role":"user","content":"merhaba"}]}'

# Streaming (SSE)
curl -N http://localhost:18789/v1/chat/completions \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"model":"openclaw:main","stream":true,"messages":[{"role":"user","content":"merhaba"}]}'
```

Streaming SSE format:
```
data: {"id":"...","choices":[{"delta":{"content":"token"},"index":0}]}
data: {"id":"...","choices":[{"delta":{"content":" token2"},"index":0}]}
data: [DONE]
```

### Stil Kuralları
- Glass morphism: `rgba(20,20,30,0.6)` bg, `blur(40px)`, `rgba(255,255,255,0.08)` border
- Accent renkler: cyan `#00d4ff`, purple `#a855f7`, pink `#ec4899`, green `#22c55e`, amber `#f59e0b`
- Font: system font stack (-apple-system, BlinkMacSystemFont, ...)
- Border radius: 8px (nav items), 12px (cards), 16px (chat bubbles)
- Gradient: `linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))`

### Build & Deploy
```bash
cd /root/clawd/projects/master-studio-mvp
npm run build
sudo systemctl restart master-studio
```
Her değişiklikten sonra: `git add -A && git commit -m "mesaj"`

### .env.local Değerleri
```
SUPABASE_URL=https://ljxeklszfipdpcucxeoa.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXTAUTH_URL=http://77.42.86.22:3000
NEXTAUTH_SECRET=bsy-secure-random-32-char-secret-key
STUDIO_PASSWORD=murat2026studio
OPENCLAW_URL=http://localhost:18789
OPENCLAW_TOKEN=TjYqXyEx9uvADPH0LBRGc15otgnlaWUm
```

## İş Akışı
1. Her görevi sırayla yap
2. Her görev sonunda: build + restart + git commit
3. Tüm görevler bitince: Opus'u sub-agent olarak çalıştır, review yaptır
4. Opus onay verirse teslim et

## KRİTİK KURALLAR
- Mevcut çalışan kodu bozma
- Her dosyayı okumadan düzenleme yapma
- UUID formatlarına dikkat (Supabase UUID bekliyor)
- .env.local'deki token/secret'ları değiştirme
- Stil değişikliği yaparken mevcut glass morphism temasını koru
