# Changelog

## v2.0.0 — Reference-Point Resolution (2026-06)

### Added
- **`EventType` enum** (SUBJECTIVE | PRICE_DIRECTION | PRICE_THRESHOLD) — event'ler artık tip ayrımıyla oluşturuluyor
- **`Comparator` enum** (GT | LT) — PRICE_THRESHOLD event'lerinde yön belirtmek için
- **`thresholdBps` field** — basis points cinsinden threshold (max 5000 = %50)
- **`finalValue` field** — objective resolution sonrası ölçülen değer kaydediliyor
- **`resolveEventWithProof(eventId, finalValue, proof)`** — EIP-712 oracle proof ile objective resolution
- **`previewResolution(eventId, finalValue)`** — frontend için "şu finalValue olsaydı ne olurdu?" sorgusu
- **`oracleDigest(eventId, finalValue, deadline)`** — view helper, off-chain signer'lar aynı digest'i üretebilsin
- **`isTrustedOracle` mapping** + `addTrustedOracle()` / `removeTrustedOracle()` — operator key yönetimi
- **`TrustedOracleAdded` / `TrustedOracleRemoved` events** — oracle değişiklikleri audit trail
- **`MAX_THRESHOLD_BPS = 5000`** constant — threshold üst sınırı
- **`EIP712_DOMAIN_TYPEHASH` + `ORACLE_TYPEHASH`** — EIP-712 typed data
- **`resolveSubjectiveEvent(eventId, resolvedYes, data)`** — EventResolver'dan gelen callback fonksiyonu
- **`ResolutionRecovered` event** — EventResolver'da CHALLENGED → PENDING geçişi

### Changed
- **`createEvent` signature** — 3 yeni parametre eklendi (eventType, comparator, thresholdBps)
- **`Event` struct** — 4 yeni alan eklendi (eventType, comparator, thresholdBps, finalValue)
- **`EventCreated` event** — 3 yeni parametre eklendi (eventType, comparator, thresholdBps)
- **`EventResolved` event** — 1 yeni parametre eklendi (finalValue)
- **`resolveEvent` semantics** — artık sadece SUBJECTIVE event'ler için; objective event'ler için revert
- **`resolveEvent` is now nonReentrant** — v1.0'da yoktu, v2.0'da eklendi
- **`withdraw` requires amount > 0** — explicit check eklendi
- **`EventResolver.submitResolution` hash** — `abi.encodePacked(reasoning, timestamp)` yerine `abi.encode(keccak256(reasoning), timestamp)` (collision-safe)
- **`EventResolver` challenge state machine** — CHALLENGED artık transitional marker, kalıcı stuck state değil

### Fixed
- **CHALLENGED resolution orphan bug** — v1.0'da 1 challenge sonrası resolution çöplüğe düşüyordu. v2.0'da majority confirm ile PENDING'e dönebiliyor, majority challenge ile REJECTED olabiliyor.
- **DRAW path missing resolutionHash** — v1.0'da DRAW event'lerde hash set edilmiyordu. v2.0'da audit trail tutarlı.
- **Vault ↔ Resolver bridge** — v1.0'da `// For now, the vault polls this contract` TODO'su vardı. v2.0'da `_finalizeResolution` vault'ı gerçekten çağırıyor.
- **No replay protection on resolution** — v1.0'da aynı resolution iki kez finalize edilebilir miydi? Test yoktu. v2.0'da `eventActive` modifier'ı ikinci çağrıyı engelliyor.
- **Subjective resolution always requires active signer** — v1.0'da `submitResolution` herkese açıktı. v2.0'da hâlâ açık (LLM backend için), ama vault'ın `resolveEvent`'i sadece SUBJECTIVE event'leri kabul ediyor + `isResolver` kontrolü var.

### Security
- **EIP-712 typed data** — replay protection (chainId + contract address)
- **`nonReentrant` on resolveEvent** — ileride callback eklense bile güvenli
- **`MAX_THRESHOLD_BPS` cap** — 50%'ten büyük threshold'lar engellendi (manipülasyon koruması)
- **Subjective event-only restriction on resolveEvent** — yanlışlıkla objective event'e bool resolution yazılamaz
- **CHALLENGED requires majority to recover** — tek signers artık resolution üzerinde tek başına hareket edemiyor

### Deprecated
- **`isResolver` mapping** — sadece SUBJECTIVE event'ler için kullanılıyor, gelecekte tamamen kaldırılabilir (v3.0?)
- **`setEventResolver` / `removeEventResolver`** — v2.0'da kullanılıyor ama `addResolver`'ı tercih edin

### Migration
Bkz. [MIGRATION.md](./MIGRATION.md). v1.0 storage layout'u v2.0 ile uyumsuz → yeni deploy gerekli.

---

## v1.0.0 — Initial Release (2026-04)

İlk production-ready sürüm. 66 test + 44 security test, %100 geçer.

### Components
- TRDEFIVault: deposit, withdraw, parimutuel betting
- EventResolver: LLM-driven + 2-of-N multisig
- TRDEFIDepositManager: MoonPay fiat onramp
- Frontend: Next.js + Wagmi/Viem + RainbowKit

### Test Coverage
- Deployment
- Deposit / Withdraw
- Event creation
- Betting
- Parimutuel payout (YES wins, NO wins, DRAW, multiple winners)
- Platform fees
- Security (44 tests)
