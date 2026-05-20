# TRDEFI Prediction Market — Method of Statement

**Versiyon:** 1.0  
**Tarih:** 2026-04-05  
**Durum:** Draft

---

## 1. Platform Tanımı

TRDEFI Prediction Market, Türkiye odaklı bir tahmin platformudur. Kullanıcılar günlük olaylar (hava durumu, döviz kuru, spor sonuçları, teknoloji haberleri vb.) hakkında EVET/HAYIR tahmin yapar. Platform bir bilgi/trivia oyunudur — kumar veya bahis değildir.

**Prensip:** Kullanıcılar birbirine karşı oynar. Platform sadece altyapı, güvenlik ve adillik sağlar.

---

## 2. Temel Kurallar (Parimutuel Sistemi)

### 2.1 Bahis Mekanizması
- Her event **EVET** veya **HAYIR** seçeneğine sahiptir.
- Dinamik fiyatlandırma yok — sabit havuz sistemi.
- Event süresi **maksimum 24 saat** ile sınırlıdır.

### 2.2 Kazanç Hesaplama
Event bittiğinde:
1. Kaybeden tarafın toplam bahis miktarından **%10 platform komisyonu** kesilir.
2. Kalan **%90** kaybeden havuz, kazanan tarafın bahis havuzuna eklenir.
3. Kazananlar, kendi bahislerinin ağırlığına orantılı olarak dağıtım alır.

```
Kazanç = (KullanıcıBahisi / KazananToplamBahis) × (KazananToplamBahis + KaybedenToplamBahis × 0.90)
```

### 2.3 Örnek
| Taraf | Bahis Toplamı |
|-------|--------------|
| EVET | 500 USDC |
| HAYIR | 300 USDC |
| **Sonuç** | EVET Kazandı |

- Kaybeden (HAYIR): 300 USDC
  - Platform komisyonu (%10): **30 USDC**
  - Kazanan havuza eklenen: **270 USDC**
- Kazanan (EVET) toplam dağıtım: 500 + 270 = **770 USDC**
- Alice (100 USDC EVET): 100 + (100/500) × 270 = **154 USDC** (+54 kar)
- Bob (400 USDC EVET): 400 + (400/500) × 270 = **616 USDC** (+216 kar)

### 2.4 Likidite Riski Kuralı ⚠️
Eğer event boyunca **tüm kullanıcılar aynı tarafı** seçmişse (sadece EVET veya sadece HAYIR):
- Eğer o taraf **kaybederse** → platform tüm fonları alır (normal işleyiş).
- Eğer o taraf **kazanırsa** → **event iptal edilir**, tüm bahisler iade edilir.
- **Sebep:** Ödenecek kaybeden havuzu yoktur. Platform kendi cebinden ödeme yapmaz.

Bu kural hem platform korur hem de kullanıcıya adil davranır.

---

## 3. LLM — 4 Rol

### 3.1 Event Generator (Olay Üretici)
**Görev:** Gerçek zamanlı verilerden tahmin edilebilir event'ler oluşturur.

**Veri Kaynakları:**
- Google Trends (Türkiye, 5dk aralık)
- Haber siteleri RSS (NTV, Hürriyet, T24, Sözcü, Bianet)
- Twitter/X Trends API
- MGM (Meteoroloji Genel Müdürlüğü) API
- Borsa İstanbul RSS
- Döviz kuru API'leri

**Filtrasyon Kriterleri (LLM Decision Matrix):**
- ✅ Mantıklı ve açık uçlu mu?
- ✅ 24 saat içinde çözülebilir mi?
- ✅ Kanıtlanabilir kaynak var mı?
- ✅ Manipüle edilmesi zor mu?
- ✅ En az 2 bağımsız doğrulanabilir kaynak var mı?
- ❌ "Kıyamet gelecek" → Reddet (kanıtlanamaz)
- ❌ "X ünlüsü boşanacak" → Reddet (kaynak belirsiz)
- ❌ "Seçimde hile var" → Reddet (kanıtlanamaz, subjektif)

### 3.2 Fact Checker (Doğrulayıcı)
**Görev:** Her event için oluşturulurken çoklu kaynak doğrulaması yapar.

- En az 3 bağımsız kaynak karşılaştırması
- Timestamp doğrulama (haber tarihi event tarihinden önce olmalı)
- Çelişkili bilgi varsa → event reddedilir

### 3.3 Arbiter (Hakem)
**Görev:** Event süresi dolunca sonucu belirler ve referans linkleri sunar.

- LLM 24 saat sonunda tüm kaynakları tekrar tarar
- Sonuç belirlenir (EVET veya HAYIR)
- Referans linkleri event kartında gösterilir:
  - 📰 Haber başlığı + URL
  - 📊 Veri kaynağı + timestamp
  - 🔗 Doğrulama linki

### 3.4 Wallet Manager (Cüzdan Yöneticisi)
**Görev:** Event sonucu sonrası kullanıcı bakiyelerini yönetir.

- Event bittiğinde:
  - Kaybedenlerin bakiyesinden bahis tutarı düşülür
  - Kazananların bakiyesine kazanç eklenir
  - Platform komisyonu platform wallet'ına aktarılır
  - Tüm işlemlerin log'u tutulur (audit purpose)
- Kullanıcı withdrawal talep ederse → blockchain üzerinden on-chain transfer yapılır

---

## 4. Mimari

```
┌──────────────────────────────────────────────┐
│  VERİ KAYNAKLARI (5dk cron)                  │
│  Google Trends │ TR Haber RSS │ MGM │ Borsa  │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  LLM (Qwen/GPT-4 + Fine-tune)                │
│  1. Event Generator → Event JSON             │
│  2. Fact Checker → Multi-source validation   │
│  3. Arbiter (24s sonra) → Sonuç + Referans   │
│  4. Wallet Manager → Bakiye güncelleme        │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  BACKEND (Node.js + PostgreSQL)               │
│  → Event kayıt yönetimi                       │
│  → Bahis kayıtları (off-chain)               │
│  → Havuz hesaplama                           │
│  → Wallet balance (görsel)                   │
│  → Likidite riski kontrolü (kural 2.4)       │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  BLOCKCHAIN (Polygon — TRDEFI Vault)          │
│  Smart Contract:                              │
│  → deposit() — Kullanıcı USDC yatırır        │
│  → withdraw() — Kullanıcı USDC çeker         │
│  → allocateToEvent() — Event'e fon ayır      │
│  → distributeWinnings() — Kazananlara dağıt  │
│                                              │
│  Güvenlik: onlyOwner, pause, timelock        │
└──────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  FRONTEND (Next.js — pm-turkish)              │
│  → Event kartları (referans linkleri dahil)  │
│  → EVET / HAYIR bahis butonları              │
│  → Wallet balance gösterimi                  │
│  → Transaction history                       │
│  → Deposit / Withdrawal                      │
└──────────────────────────────────────────────┘
```

---

## 5. Yasal Çerçeve

- Platform bir **tahmin platformudur** — kumar veya bahis değildir.
- Kullanıcılar bilgiye dayalı tahmin yapar, şans eseri değil.
- Spor Toto, İddaa — bunlar Türkiye'de yasal olan benzer sistemlerdir.
- Ana sayfada disclaimer: "Bu bir tahmin platformudur. Kumar değildir."
- İleride offshore entity (Curacao/BVI) değerlendirilebilir.
- 18+ yaş sınırlaması (ileride uygulanabilir).

---

## 6. Güvenlik

- **Smart Contract Audit** — Deployment öncesi zorunlu
- **Timelock** — Büyük withdrawal'lar için 24s gecikme
- **Pause mekanizması** — Acil durumda platform durdurulabilir
- **Multisig** — Vault contract owner adresi multisig olmalı (2/3 veya 3/5)
- **Rate limiting** — Kullanıcı başına günlük bahis limiti
- **Audit log** — Tüm işlemler PostgreSQL'de saklanır

---

## 7. Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 16 + TailwindCSS + pm-turkish codebase |
| Backend | Node.js + Express + PostgreSQL |
| LLM | Qwen / GPT-4 + Fine-tune (custom prompt) |
| Blockchain | Polygon (Chain ID: 137) |
| Token | USDC (ERC-20) |
| Smart Contract | Solidity (Vault pattern) |
| Veri Kaynakları | Google Trends API, RSS Feeds, MGM API |
| Hosting | Netlify (Frontend) + VPS/Cloud (Backend + DB) |

---

## 8. Geliştirme Fazları

| Faz | Süre | İçerik |
|-----|------|--------|
| **1** | Hafta 1-2 | Off-chain MVP: Fake crypto, event generator, bahis UI |
| **2** | Hafta 3-4 | Polygon vault contract (deposit/withdrawal) |
| **3** | Hafta 5-6 | LLM arbitrage + multi-source fact checking |
| **4** | Hafta 7-8 | Beta launch (kullanıcı testi + feedback) |
| **5** | Hafta 9-10 | Audit + production hardening |
| **6** | Hafta 11+ | Public launch |

---

*Kaydedildi: 2026-04-05 22:23 GMT+3*
