# Master Studio MVP - Deploy Rehberi

## Özet
Tüm kritik fix'ler uygulandı:
- ✅ .gitignore oluşturuldu (node_modules, .env.local, dist hariç)
- ✅ Role injection fix (POST /api/chat role='user' hardcoded)
- ✅ File upload validation (max 50MB, content-type whitelist)
- ✅ lib/db.ts ile tek client kullanımı
- ✅ DB migration script (`npm run db:migrate`)
- ✅ NEXTAUTH_SECRET placeholder eklendi

## Deploy Adımları

### 1. GitHub OAuth Secret Rotate (Manuel)
GitHub'da yeni secret oluştur:
1. GitHub Settings → Developer settings → OAuth Apps
2. Master Studio app'i bul → "Reset client secret"
3. Yeni secret'i `.env.local`'e kopyala
4. Eski secret zaten git history'de kaldı (önemli değil, yeni secret aktif olunca)

### 2. Turso Cloud DB Kurulumu
```bash
# Turso CLI kurulumu (eğer yoksa)
npm install -g @tursodatabase/cli
turso auth login

# DB oluştur
turso db create master-studio

# Connection URL al
turso db show master-studio

# Token oluştur
turso db tokens create master-studio
```

Alınan değerleri Vercel env variables'a ekle:
- `TURSO_DATABASE_URL`: `libsql://your-db.turso.io`
- `TURSO_AUTH_TOKEN`: token

### 3. Cloudflare R2 Kurulumu
1. Cloudflare dashboard → R2
2. Bucket oluştur: `master-studio`
3. API token oluştur (Object Read & Write)
4. Vercel env:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME=master-studio`
   - `R2_PUBLIC_URL`: pub-xxx.r2.dev

### 4. Vercel Deploy
```bash
# Vercel CLI (opsiyonel)
npm i -g vercel
vercel

# Veya GitHub repo bağla, otomatik deploy
```

**Gerekli Environment Variables:**
```
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=openssl-rand-base64-32-ile-olustur
GITHUB_CLIENT_ID=Ov23liIlew77wkk1aUUM
GITHUB_CLIENT_SECRET=yeni-secret-buraya
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=master-studio
R2_PUBLIC_URL=pub-xxx.r2.dev
OPENCLAW_URL=https://your-openclaw-instance.com (varsa)
OPENCLAW_TOKEN=...
```

### 5. DB Migration (İlk deploy sonrası)
```bash
# Local'de çalıştır (Vercel'de migration çalışmaz, CLI gerekiyor)
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:migrate
```

## Post-Deploy Yapılacaklar
- [ ] SSE mesaj push mekanizması (Redis/WebSocket ile)
- [ ] Rate limiting middleware
- [ ] Error monitoring (Sentry vb.)
- [ ] Analytics
