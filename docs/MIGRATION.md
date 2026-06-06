# Migration Guide: v1.0 → v2.0 (Reference-Point Resolution)

## Özet

v1.0 → v2.0 ana değişiklikler:

1. **Resolution artık iki yollu**: Objective (sayısal imza) + Subjective (LLM + multisig)
2. **`openingPrice` artık kullanılıyor** (v1.0'da kaydediliyor ama hiç bakılmıyordu)
3. **`resolveEventWithProof()` eklendi** — EIP-712 oracle proof ile objective resolve
4. **`resolveEvent()` daraltıldı** — sadece SUBJECTIVE event'ler için
5. **EventResolver CHALLENGED bug'ı düzeltildi** — artık çöplüğe düşmüyor
6. **EventResolver → Vault callback artık implement** — manuel bot gerekmiyor

---

## ⚠️ Breaking Changes

### 1. `createEvent` signature değişti

**Eski (v1.0):**
```solidity
function createEvent(
    string calldata question,
    string calldata category,
    uint256 deadline,
    uint256 openingPrice
) external onlyOwner returns (uint256)
```

**Yeni (v2.0):**
```solidity
function createEvent(
    string calldata question,
    string calldata category,
    uint256 deadline,
    uint256 openingPrice,
    EventType eventType,    // ← YENİ
    Comparator comparator,  // ← YENİ
    uint256 thresholdBps    // ← YENİ
) external onlyOwner returns (uint256)
```

**Migration:** Tüm `createEvent` çağrılarını güncelleyin. Subjective event'ler için son 3 argüman `0, 0, 0` olabilir.

### 2. `Event` struct storage layout değişti

Yeni alanlar eklendi (`eventType`, `comparator`, `thresholdBps`, `finalValue`). Bu **breaking** — v1.0 storage'i v2.0 ile aynı kontratta kullanamazsınız. Yeni deploy gerekir.

### 3. `EventCreated` event signature değişti

Eski: `EventCreated(eventId, question, category, deadline, openingPrice)`
Yeni: `EventCreated(eventId, question, category, deadline, openingPrice, eventType, comparator, thresholdBps)`

**Migration:** Indexer'lar (subgraph, backend) güncellenmeli.

### 4. `EventResolved` event yeni parametre aldı

Eski: `EventResolved(eventId, resolvedYes, totalYesBets, totalNoBets, platformFee, resolutionHash)`
Yeni: `EventResolved(eventId, resolvedYes, totalYesBets, totalNoBets, platformFee, resolutionHash, finalValue)`

**Migration:** Indexer'lar güncellenmeli. `finalValue = 0` olan event'ler subjective path'ten geliyor demek.

### 5. `resolveEvent` artık sadece SUBJECTIVE

Objective event'i `resolveEvent` ile çözmeye çalışmak revert eder. Onun yerine `resolveEventWithProof` kullanın.

---

## 📋 Deploy Checklist

### A. Yeni kontratları deploy et

```bash
# 1. Yeni vault deploy
npx hardhat run scripts/deploy.js --network polygonAmoy
# 2. Yeni resolver deploy
npx hardhat run scripts/deploy-resolver.js --network polygonAmoy
# 3. Birbirine bağla
#    vault.setEventResolver(resolver.address)
#    resolver.setVault(vault.address)
# 4. Trusted oracle ekle (operator EOA veya multisig)
#    vault.addTrustedOracle(ORACLE_ADDRESS)
# 5. Subjective resolver'ları ekle (legacy)
#    vault.addResolver(LLM_BACKEND_ADDRESS)
# 6. Resolver multisig signers ekle
#    resolver.addSigner(...)
```

### B. Migration stratejisi

**Seçenek 1 — Sıfırdan (basit, küçük protokol için):**
- Yeni vault deploy et
- Eski vault'ı `pause` et
- Kullanıcılara "withdraw & redeposit" dönemi aç
- Eski kontrat archived

**Seçenek 2 — Proxy upgrade (karmaşık, aktif kullanıcı varsa):**
- Eğer ileride storage layout'unu değiştirmezsen OpenZeppelin `UUPS` veya `Transparent` proxy kullan
- Ama bu sefer **yeni alanlar eklendi** → upgrade'de storage layout dikkat edilmeli (initialize'da yeni alanları default değerle set et)
- Şu an v1.0 storage layout'una yeni alanlar eklemek layout'u bozar → bu yüzden **sıfırdan deploy önerilir**

### C. Oracle kurulumu

**Minimum viable:** Tek bir EOA trusted oracle olarak. Küçük hacimli event'ler için yeterli.

**Önerilen (production):** Safe (Gnosis) multisig 2-of-3 trusted oracle olarak. Tek bir anahtarın çalınması tüm pazarı bozamaz.

**İleri (high-value):** Chainlink CRE (Chainlink Runtime Environment) workflow'u ile off-chain data → on-chain signed report. Tek trusted oracle key'i yok, Chainlink DON imza atıyor.

### D. Operator script

Off-chain bot'un artık yapması gerekenler:

```javascript
// 1. Deadline geçmiş objective event'leri bul
// 2. Her biri için ilgili data source'dan finalValue çek:
//    - Kripto: CoinGecko / Binance public API
//    - Forex: ECB / TCMB
//    - Hava durumu: OpenWeather (ama bu subjectif mi? — evet, muhtemelen SUBJECTIVE)
// 3. EIP-712 imzala
// 4. resolveEventWithProof çağır
// 5. Tx bekleyip log'la

// Subjective event'ler için: LLM'e sor, EventResolver'a submit et,
// 24 saat bekle, finalizeAfterTimeout çağır (veya otomatik multisig confirm'ı bekle)
```

### E. Eski bot'ları kapat

v1.0'daki "resolver polls EventResolver, then calls vault.resolveEvent" bot'u artık çalışmamalı. Onun yerine:
- Objective event'ler → trusted oracle operator
- Subjective event'ler → EventResolver (zaten vault'a callback yapıyor)

---

## 🧪 Test Edilmesi Gerekenler

Production'a geçmeden önce:

1. ✅ EIP-712 proof valid → resolve başarılı (test'te var)
2. ✅ EIP-712 proof invalid signer → revert (test'te var)
3. ✅ EIP-712 proof wrong chain → revert (test'te var)
4. ✅ EIP-712 proof tampered finalValue → revert (test'te var)
5. ✅ PRICE_DIRECTION UP/DOWN/EQUAL → doğru outcome (test'te var)
6. ✅ PRICE_THRESHOLD GT/LT + boundary cases (test'te var)
7. ✅ Cross-path rejection (test'te var)
8. ✅ EventResolver CHALLENGED recovery (test'te var)
9. ⚠️ **Mainnet'te küçük bir USDC miktarı ile end-to-end test** (test'te yok, mainnet/Polygon Amoy'da simüle edilmeli)
10. ⚠️ **Replay attack**: aynı proof iki kez kullanılabilir mi? Cevap: hayır, çünkü `eventActive` modifier'ı ikinci çağrıda revert eder. **Ama testte explicit olarak yok, ekleyin.**

Eklenmesi önerilen ek test:
```javascript
it("replay: same proof cannot resolve the same event twice", async function () {
  // ... setup, resolve once
  await expect(
    vault.connect(oracle).resolveEventWithProof(eventId, finalValue, proof)
  ).to.be.revertedWith("TRDEFI: event not active");
});
```

---

## 🚨 Dikkat Edilecek Tuzaklar

1. **Subjective vs Objective karışması**: Bir event'i yanlış tipte oluşturursan (örn. "BTC yükselecek mi?" sorusu için SUBJECTIVE), resolve edemezsin. Frontend'de kategori seçimi net olmalı.

2. **Threshold floating point yok**: 500 bps = %5.00. 50 bps = %0.50. Ondalık sayı yok; hepsi bps cinsinden integer.

3. **Eşit finalValue (PRICE_DIRECTION) → DRAW**: Kullanıcılar refund alır ama hiçbir fee alınmaz. Bu kasıtlı (deadline anı ile opening aynıysa) ama frontend'in bunu net göstermesi lazım.

4. **Threshold ile opening aynı → mantıksız event**: `openingPrice=100, threshold=0, comparator=GT` → "finalValue > 100?" anlamına gelir. Bu mutlak threshold. Eğer amacın mutlak threshold ise bu yeterli; değilse threshold'u pozitif yap.

5. **Trusted oracle key rotation**: Anahtar sızarsa, sahip `removeTrustedOracle` çağırıp eski anahtarı disable edebilir. **AMA**: Sızan anahtar sızma anından önce imzaladığı proof'lar hâlâ geçerli. Çözüm: `removeTrustedOracle` ayrıca bir "oracle nonce" veya "deadline < X" filtresi eklersin. v2.0'da yok; v2.1'de düşün.

6. **Signature replay between events**: Aynı oracle aynı `(finalValue, deadline)` ile iki farklı eventId'yi imzalayabilir — bu sorun değil çünkü digest eventId'yi içeriyor. Ama aynı eventId farklı chainId'de kullanılabilir mi? **HAYIR** — domain separator chainId içeriyor. Güvenli.

7. **`addResolver` eski sisteme ait**: v1.0'da `isResolver` mapping'i tek auth noktasıydı. v2.0'da hâlâ var ama sadece SUBJECTIVE event'ler için. **Eğer yeni deploy ediyorsan `addResolver` çağırmana gerek yok** — sadece `addTrustedOracle` yeterli (çoğu event objective olacaksa).

---

## 📊 Gas Karşılaştırması

| İşlem | v1.0 Gas | v2.0 Gas | Not |
|---|---|---|---|
| `createEvent` (subjective) | ~120k | ~130k | +10k (3 yeni alan) |
| `createEvent` (objective) | ~120k | ~135k | +15k (type/comparator/threshold validation) |
| `resolveEvent` (subjective) | ~95k | ~100k | küçük artış |
| `resolveEventWithProof` (objective) | yok | ~115k | EIP-712 recover ~30k maliyet |
| `claimWinnings` | ~110k | ~110k | değişmedi |
| `resolveEvent` (objective, yanlış yol) | revert | revert | kullanıcı error |

**Yorum:** v2.0 ~5-15k gas daha pahalı per işlem. Polygon'da bu ~$0.0001-0.0003 ek maliyet. Kabul edilebilir.

---

## 🎯 v1.0 → v2.0 Checklist (Operatör için)

- [ ] Yeni kontratları Polygon Amoy'a deploy et
- [ ] Testnet'te tüm test'leri çalıştır (`npx hardhat test`)
- [ ] Trusted oracle EOA'sı oluştur (production'da multisig kullan)
- [ ] `addTrustedOracle` ile vault'a ekle
- [ ] EventResolver'ı vault'a bağla
- [ ] Off-chain operator script'i yaz (mevcut README'deki "Off-Chain Services" diyagramına göre)
- [ ] Frontend'de `createEvent` çağrılarını yeni signature'a güncelle
- [ ] Indexer'ları (subgraph, backend) yeni event signature'larına güncelle
- [ ] Eski v1.0 kontratını `pause` et
- [ ] Mainnet'te deploy et
- [ ] Eski kullanıcılara duyuru: "Yeni kontrat, lütfen withdraw edip yeni vault'a deposit edin"
