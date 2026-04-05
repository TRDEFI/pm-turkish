// Auto-translate: Replaces English question and event title keywords with Turkish on the client.
// Runs once per render — NO API calls, NO server load, NO performance impact.

// ── Event title translations ──
export function translateEventTitle(text) {
  if (!text) return text;
  const titles = {
    "2026 FIFA World Cup Winner ": "2026 FIFA Dünya Kupası Şampiyonu",
    "2026 NBA Champion": "2026 NBA Şampiyonu",
    "2026 NHL Stanley Cup Champion ": "2026 NHL Stanley Kupası Şampiyonu",
    "Putin out as President of Russia by December 31, 2026?": "Putin 31 Aralık 2026'ya kadar Rusya devlet başkanı görevinden ayrılır mı?",
    "Democratic Presidential Nominee 2028": "2028 Demokrat Parti Başkanlık Adayı",
    "Presidential Election Winner 2028": "2028 Başkanlık Seçimi Kazananı",
    "Xi Jinping out before 2027?": "Xi Jinping 2027'den önce görevinden ayrılır mı?",
    "2026 NBA Champion": "2026 NBA Şampiyonu",
    "NBA Rookie of the Year ": "2026 NBA Yılın Çaylağı",
    "What will happen before GTA VI?": "GTA VI'dan önce ne olacak?",
    "GTA VI released before June 2026?": "GTA VI Haziran 2026'dan önce çıkar mı?",
    "MegaETH market cap (FDV) one day after launch?": "MegaETH piyasa değeri lansmandan 1 gün sonra?",
    "MegaETH airdrop by...?": "MegaETH airdrop ne zaman?",
    "Harvey Weinstein prison time?": "Harvey Weinstein hapis cezası?",
  };
  if (titles[text]) return titles[text];
  return text
    .replace(/ NHL Stanley Cup Champion /g, " NHL Stanley Kupası Şampiyonu")
    .replace(/ FIFA World Cup Winner /g, " FIFA Dünya Kupası Şampiyonu")
    .replace(/ NBA Champion$/g, " NBA Şampiyonu")
    .replace(/prison time\?/g, "hapis cezası?")
    .replace(/airdrop by/g, "airdrop:")
    .replace(/market cap \(FDV\) one day after launch\?/g, "piyasa değeri lansmandan 1 gün sonra?")
    .replace(/one day after launch\?/g, "lansmandan 1 gün sonra?")
    .replace(/before GTA VI\?/g, "GTA VI'dan önce?")
    .replace(/before June \d{4}\?/g, "Haziran'dan önce?");
}

// ── Country name mappings ──
const COUNTRY_NAMES = {
  'Spain': 'İspanya', 'England': 'İngiltere', 'France': 'Fransa',
  'Brazil': 'Brezilya', 'Argentina': 'Arjantin', 'Germany': 'Almanya',
  'Portugal': 'Portekiz', 'Netherlands': 'Hollanda', 'USA': 'ABD',
  'Uruguay': 'Uruguay', 'Mexico': 'Meksika', 'Belgium': 'Belçika',
  'Colombia': 'Kolombiya', 'Japan': 'Japonya', 'Norway': 'Norveç',
  'Canada': 'Kanada', 'Tunisia': 'Tunus', 'Ecuador': 'Ekvador',
  'Paraguay': 'Paraguay', 'New Zealand': 'Yeni Zelanda', 'Australia': 'Avustralya',
  'Iran': 'İran', 'Uzbekistan': 'Özbekistan', 'South Korea': 'Güney Kore',
  'Jordan': 'Ürdün', 'Morocco': 'Fas', 'South Africa': 'Güney Afrika',
  'Senegal': 'Senegal', 'Ivory Coast': 'Fildişi Sahili', 'Ghana': 'Gana',
  'Egypt': 'Mısır', 'Algeria': 'Cezayir', 'Cape Verde': 'Cape Verde',
  'Qatar': 'Katar', 'Saudi Arabia': 'Suudi Arabistan', 'Scotland': 'İskoçya',
  'China': 'Çin', 'Russia': 'Rusya', 'Ukraine': 'Ukrayna',
  'Turkey': 'Türkiye', 'Israel': 'İsrail', 'Pakistan': 'Pakistan',
  'India': 'Hindistan'
};

// ── Question translations ──
export function translateQuestion(text) {
  if (!text) return text;

  const q = text.trim();

  // ── Pattern 1: FIFA World Cup ──
  const fifaPattern = /^Will (.+?) win the (\d{4}) FIFA World Cup\?$/;
  const fifaMatch = q.match(fifaPattern);
  if (fifaMatch) {
    const country = COUNTRY_NAMES[fifaMatch[1]] || fifaMatch[1];
    return `${country} ${fifaMatch[2]} FIFA Dünya Kupası\u0027nı kazanır mı?`;
  }

  // ── Pattern 2: NBA Finals ──
  const nbaPattern = /^Will the (.+?) win the (\d{4}) NBA Finals\?$/;
  const nbaMatch = q.match(nbaPattern);
  if (nbaMatch) {
    return `${nbaMatch[1]} ${nbaMatch[2]} NBA Finali\u0027ni kazanır mı?`;
  }

  // ── Pattern 3: NHL Stanley Cup ──
  const nhlPattern = /^Will the (.+?) win the (\d{4}) NHL Stanley Cup\?$/;
  const nhlMatch = q.match(nhlPattern);
  if (nhlMatch) {
    return `${nhlMatch[1]} ${nhlMatch[2]} NHL Stanley Kupası\u0027nı kazanır mı?`;
  }

  // ── Pattern 4: MegaETH market cap ──
  if (q.includes('MegaETH market cap')) {
    const dollarMatch = q.match(/>\$([0-9.]+)B/);
    const amount = dollarMatch ? dollarMatch[1] : '?';
    return `MegaETH lansmandan 1 gün sonra piyasa değeri $${amount}B\u0027yi geçer mi?`;
  }

  // ── Pattern 5: MegaETH airdrop ──
  if (/megaeth.+airdrop/i.test(q)) {
    return "MegaETH 30 Haziran\u0027a kadar airdrop yapar mı?";
  }

  // ── Exact translations ──
  const exact = {
    "Russia-Ukraine Ceasefire before GTA VI?": "Rusya-Ukrayna Ateşkesi GTA VI\u0027dan önce?",
    "New Rihanna Album before GTA VI?": "Rihanna\u0027dan GTA VI\u0027dan önce yeni albüm çıkar mı?",
    "New Playboi Carti Album before GTA VI?": "Playboi Carti\u0027den GTA VI\u0027dan önce yeni albüm çıkar mı?",
    "Will Jesus Christ return before GTA VI?": "Hz. İsa GTA VI\u0027dan önce döner mi?",
    "Trump out as President before GTA VI?": "Trump GTA VI\u0027dan önce başkanlıktan ayrılır mı?",
    "Will China invades Taiwan before GTA VI?": "Çin GTA VI\u0027dan önce Tayvan\u0027ı işgal eder mi?",
    "Will China invade Taiwan before GTA VI?": "Çin GTA VI\u0027dan önce Tayvan\u0027ı işgal eder mi?",
    "Will bitcoin hit $1m before GTA VI?": "Bitcoin GTA VI\u0027dan önce $1M\u0027ye ulaşır mı?",
    "Will Bitcoin hit $1m before GTA VI?": "Bitcoin GTA VI\u0027dan önce $1M\u0027ye ulaşır mı?",
    "GTA VI released before June 2026?": "GTA VI Haziran 2026\u0027dan önce çıkar mı?",
    "Will Harvey Weinstein be sentenced to no prison time?": "Harvey Weinstein hapis cezası alır mı?",
    "Will Harvey Weinstein be sentenced to less than 5 years in prison?": "Weinstein 5 yıldan az hapis alır mı?",
    "Will Harvey Weinstein be sentenced to between 5 and 10 years in prison?": "Weinstein 5-10 yıl arası hapis alır mı?",
    "Will Harvey Weinstein be sentenced to between 10 and 20 years in prison?": "Weinstein 10-20 yıl arası hapis alır mı?",
    "Will Harvey Weinstein be sentenced to between 20 and 30 years in prison?": "Weinstein 20-30 yıl arası hapis alır mı?",
    "Will Harvey Weinstein be sentenced to more than 30 years in prison?": "Weinstein 30 yıldan fazla hapis alır mı?",
    "MegaETH market cap (FDV) >$2B one day after launch?": "MegaETH lansmandan 1 gün sonra piyasa değeri $2B\u0027yi geçer mi?",
    "MegaETH market cap (FDV) >$6B one day after launch?": "MegaETH lansmandan 1 gün sonra piyasa değeri $6B\u0027yi geçer mi?",
  };

  if (exact[q]) return exact[q];

  // ── Fallback: pattern-based word replacement ──
  let result = q;
  result = result.replace(/^Will the /, '').replace(/^Will /, '');
  
  const countries = Object.keys(COUNTRY_NAMES).sort((a, b) => b.length - a.length);
  for (const country of countries) {
    result = result.replace(new RegExp(country, 'g'), COUNTRY_NAMES[country]);
  }
  
  result = result
    .replace(/win the /g, 'kazanır mı? ')
    .replace(/FIFA World Cup/g, 'FIFA Dünya Kupası')
    .replace(/NBA Finals/g, 'NBA Finali')
    .replace(/NHL Stanley Cup/g, 'NHL Stanley Kupası')
    .replace(/ before /g, ' öncesinde ')
    .replace(/ released /g, ' yayınlansın ')
    .replace(/ ceases to be /g, ' bırakır ')
    .replace(/invades/g, 'işgal eder')
    .replace(/hit /g, 'ulaşır ')
    .replace(/Ceasefire/g, 'Ateşkes')
    .replace(/return/ig, 'döner')
    .replace(/President/g, 'başkan')
    .replace(/bitcoin/gi, 'Bitcoin')
    .replace(/GTA VI/g, 'GTA VI');
  
  return result;
}
