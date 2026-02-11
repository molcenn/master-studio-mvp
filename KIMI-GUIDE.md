# Master Studio MVP — Kimi Sub-Agent Görev Yönergesi v2

**Tarih:** 2026-02-11
**Koordinatör:** Betsy (Opus) — review + birleştirme
**Uygulayıcı:** Kimi K2.5 sub-agent'ler (paralel)

## Proje Bilgisi
- **Konum:** `/root/clawd/projects/master-studio-mvp/`
- **Stack:** Next.js 14 + TypeScript + Tailwind + Supabase + NextAuth
- **Port:** 3000 (systemd: `master-studio.service`)
- **DB:** Supabase — tablolar: `projects`, `messages`, `files`
- **Gateway:** `http://localhost:18789` — token: env `OPENCLAW_TOKEN`
- **Stil:** iOS glass morphism (blur 40px, dark theme, gradient accents)

## Tamamlanan Görevler (DOKUNMA)
- ✅ Streaming chat (SSE buffer pattern)
- ✅ Sidebar projects (Supabase'den dinamik)
- ✅ MainWorkspace stats (gerçek veri)
- ✅ Force Stop butonu
- ✅ Dosya upload (chat içi)
- ✅ Yeni proje oluşturma (modal)
- ✅ `/api/projects/[id]` endpoint

## Mevcut Dosya Yapısı
```
app/components/
├── Dashboard.tsx      → 3 kolon grid, activeProject state, activeView YOK
├── Sidebar.tsx        → Nav items, skills, projects (nav tıklaması yok)
├── MainWorkspace.tsx  → Stats + proje kartları (tek view, view routing yok)
├── ChatPanel.tsx      → Chat + Swarm tab (swarm statik)
```

---

## GÖREV BLOKLARI (Paralel Sub-Agent'ler İçin)

### BLOK A: Sidebar Navigasyon + View Routing
**Dosyalar:** `Dashboard.tsx`, `Sidebar.tsx`, `MainWorkspace.tsx`

**Yapılacaklar:**
1. `Dashboard.tsx`'e `activeView` state ekle: `'dashboard' | 'workspace' | 'files' | 'milestones' | 'agents' | 'reviews'`
2. `Sidebar.tsx`'e `activeView` ve `setActiveView` prop'ları geçir
3. Sidebar nav item tıklamalarını `setActiveView` ile bağla
4. `MainWorkspace.tsx`'e `activeView` prop'u ekle
5. `activeView`'a göre farklı content render et:
   - `dashboard` → mevcut stats/kartlar view'ı (zaten var)
   - `files` → proje bazlı dosya listesi (aşağıda detay)
   - `agents` → agent listesi view'ı (aşağıda detay)
   - `reviews` → review listesi (şimdilik boş state)
   - `workspace` → proje detay view'ı (aşağıda detay)
   - `milestones` → milestone view (şimdilik boş state)
6. MainWorkspace'teki proje kartlarına `onClick` → `setActiveProject(project.id)` ekle

**Boş state örneği:**
```tsx
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
  <svg ...icon... />
  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Henüz milestone yok</div>
  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Proje milestone'ları burada görünecek</div>
</div>
```

**Kritik:** `activeView` değiştiğinde `MainWorkspace` header'ı da değişmeli (view adını göster).

---

### BLOK B: Files View
**Dosyalar:** `MainWorkspace.tsx` (içinde), `/api/files/route.ts` (yeni)

**Yapılacaklar:**
1. `/app/api/files/route.ts` oluştur:
   - `GET ?projectId=...` → Supabase Storage'dan dosya listesi
   - Response: `{ files: [{ name, size, type, url, created_at }] }`
2. MainWorkspace'te `activeView === 'files'` durumunda:
   - Dosya listesi tablosu göster (isim, boyut, tür, tarih)
   - Upload butonu (mevcut upload API'yi kullan: `/api/upload`)
   - Dosya tıklanınca yeni sekmede aç
   - Boş state: "Henüz dosya yüklenmedi"
3. Drag & drop desteği (bonus, opsiyonel)

**Supabase Storage sorgusu:**
```typescript
const { data, error } = await supabase.storage
  .from('files')
  .list(projectId, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
```

---

### BLOK C: Agents View + Swarm Tab
**Dosyalar:** `MainWorkspace.tsx` (içinde), `ChatPanel.tsx` (swarm tab)

**Yapılacaklar:**
1. MainWorkspace'te `activeView === 'agents'` durumunda:
   - Agent kartları göster: Kimi, Opus, Sonnet, DALL-E
   - Her kart: isim, model, durum (aktif/beklemede), son görev
   - Kartlar şimdilik statik AMA gerçekçi data ile (hardcoded mock kaldır, mantıklı placeholder koy)
2. ChatPanel Swarm tab'ını güncelle:
   - Model selector dropdown ekle (Kimi K2.5 / Claude Sonnet / Claude Opus)
   - Seçilen modele göre `x-openclaw-agent-id` header'ı değiştir
   - Mevcut hardcoded agent kartlarını koru ama "Son Görev" kısmını dinamik yap

**Model selector örneği:**
```tsx
<select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
  <option value="kimi">Kimi K2.5</option>
  <option value="sonnet">Claude Sonnet</option>
  <option value="opus">Claude Opus</option>
</select>
```

---

### BLOK D: Proje Detay (Workspace View)
**Dosyalar:** `MainWorkspace.tsx` (içinde)

**Yapılacaklar:**
1. `activeView === 'workspace'` durumunda:
   - Aktif projenin detayını göster
   - Proje adı (düzenlenebilir)
   - Proje dosyaları listesi (kısa)
   - Proje mesaj sayısı
   - Son mesajlar özeti (son 5)
   - Proje silme butonu (onay modalı ile)
2. Proje adı düzenleme: inline edit → PATCH `/api/projects/[id]`
3. Proje silme: DELETE `/api/projects/[id]` → sidebar'ı refresh

---

## KRİTİK KURALLAR

### Dosya Okuma
- **HER dosyayı düzenlemeden ÖNCE oku.** Stale cache kullanma.
- Proje dizini: `/root/clawd/projects/master-studio-mvp/`

### Stil
- Mevcut CSS variables kullan (`var(--glass-bg)`, `var(--accent-cyan)` vb.)
- Glass morphism temasını koru
- `<style jsx>` kullan (mevcut pattern)
- Yeni component oluşturma → mevcut dosyaların içine ekle

### Build
- Her görev sonunda: `cd /root/clawd/projects/master-studio-mvp && npm run build`
- Build başarısız → hatayı düzelt, tekrar dene
- Build başarılı → `git add -A && git commit -m "mesaj"`
- Service restart: `sudo systemctl restart master-studio`

### TypeScript
- `any` kullanmaktan kaçın, interface tanımla
- Props interface'lerini güncel tut

### Supabase
- UUID formatına dikkat
- `.env.local` değerlerini değiştirme
- Service Role Key ile çalışıyoruz (RLS bypass)

### Çakışma Önleme (Paralel Çalışma)
- **BLOK A** `Dashboard.tsx`, `Sidebar.tsx`, `MainWorkspace.tsx`'in yapısını değiştirir
- **BLOK B, C, D** MainWorkspace içine yeni view'lar ekler
- **ÖNEMLİ:** BLOK A önce tamamlanmalı, sonra B/C/D paralel çalışabilir
- Alternatif: BLOK A + B/C/D tek bir sub-agent'a verilir (çakışma riski sıfır)

## İş Akışı
1. Opus (ben): BLOK A'yı Kimi'ye gönder
2. BLOK A tamamlanınca → BLOK B, C, D'yi paralel Kimi'lere gönder
3. Her blok tamamlanınca → Opus review
4. Kritik fix varsa → düzelt
5. Final build + restart + commit
6. Murat'a teslim et

## Sonuç Formatı (Her Blok İçin)
```
✅ BLOK [X] Tamamlandı
- Değiştirilen dosyalar: [liste]
- Eklenen API: [varsa]
- Build: Başarılı/Başarısız
- Commit: [hash]
- Notlar: [varsa]
```
