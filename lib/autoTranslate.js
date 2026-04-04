// Auto-translate: Replaces English question keywords with Turkish on the client.
// Runs once per render — NO API calls, NO server load, NO performance impact.

const DICT = {
  // --- Countries & places ---
  'Russia': 'Rusya', 'Ukraine': 'Ukrayna', 'China': 'Çin',
  'Taiwan': 'Tayvan', 'Turkey': 'Türkiye', 'Israel': 'İsrail',
  'Pakistan': 'Pakistan', 'India': 'Hindistan', 'Japan': 'Japonya',
  'Syria': 'Suriye', 'Iran': 'İran', 'USA': 'ABD', 'US': 'ABD',
  'United States': 'ABD', 'United Kingdom': 'İngiltere',
  'Britain': 'İngiltere', 'UK': 'İngiltere', 'France': 'Fransa',
  'Germany': 'Almanya', 'North Korea': 'Kuzey Kore',

  // --- People ---
  'Trump': 'Trump', 'Putin': 'Putin', 'Zelensky': 'Zelensky',
  'Biden': 'Biden', 'Harvey Weinstein': 'Harvey Weinstein',
  'Jesus Christ': 'Hz. İsa', 'Rihanna': 'Rihanna',
  'Playboi Carti': 'Playboi Carti',

  // --- Sports ---
  'Stanley Cup': 'Stanley Kupası', 'NHL': 'NHL', 'NBA': 'NBA',
  'Carolina Hurricanes': 'Carolina Hurricanes', 'Florida Panthers': 'Florida Panthers',
  'Edmonton Oilers': 'Edmonton Oilers', 'Dallas Stars': 'Dallas Stars',
  'Colorado Avalanche': 'Colorado Avalanche', 'Vegas Golden Knights': 'Vegas Golden Knights',
  'GTA VI': 'GTA VI',

  // --- Sentence patterns ---
  'Will the ': '', 'Will ': '', ' will ': ' ',
  ' win the ': ' kazanır mı? ', ' win ': ' kazanır mı? ', ' the ': ' ',

  // --- Common words -> Turkish ---
  'will': 'olacak mı', 'hit': 'ulaşacak', 'before': 'öncesinde',
  'released': 'yayınlanacak', 'ceasefire': 'ateşkes',
  'new': 'yeni', 'album': 'albüm', 'return': 'dönecek',
  'out as President': 'başkanlıktan ayrılacak',
  'invades': 'işgal edecek', 'sentenced to': 'hükmü',
  'no prison time': 'hapis cezası yok',
  'less than': 'daha az', 'between': 'arası',
  'more than': 'daha fazla', 'years in prison': 'yıl hapis',
  'm': 'M', 'k': 'K',
};

/**
 * Translate a Polymarket question string to Turkish.
 * Checks exact-match cache first, then falls back to word-by-word.
 */
export function translateQuestion(text) {
  if (!text) return text;

  // Exact match cache for known questions
  const exact = {
    "Russia-Ukraine Ceasefire before GTA VI?": "Rusya-Ukrayna Ateşkesi GTA VI'dan önce?",
    "New Rihanna Album before GTA VI?": "Rihanna'dan Yeni Albüm GTA VI'dan önce?",
    "New Playboi Carti Album before GTA VI?": "Playboi Carti'den Yeni Albüm GTA VI'dan önce?",
    "Will Jesus Christ return before GTA VI?": "Hz. İsa GTA VI'dan önce döner mi?",
    "Trump out as President before GTA VI?": "Trump GTA VI'dan önce başkanlıktan ayrılır mı?",
    "Will China invade Taiwan before GTA VI?": "Çin GTA VI'dan önce Tayvan'ı işgal eder mi?",
    "Will China invades Taiwan before GTA VI?": "Çin GTA VI'dan önce Tayvan'ı işgal eder mi?",
    "Will Bitcoin hit $1m before GTA VI?": "Bitcoin GTA VI'dan önce $1M'ye ulaşır mı?",
    "Will bitcoin hit $1m before GTA VI?": "Bitcoin GTA VI'dan önce $1M'ye ulaşır mı?",
    "GTA VI released before June 2026?": "GTA VI Haziran 2026'dan önce çıkar mı?",
    // NHL Stanley Cup
    "Will the Carolina Hurricanes win the 2026 NHL Stanley Cup?": "Carolina Hurricanes 2026 NHL Stanley Kupası'nı kazanır mı?",
    "Will the Florida Panthers win the 2026 NHL Stanley Cup?": "Florida Panthers 2026 NHL Stanley Kupası'nı kazanır mı?",
    "Will the Edmonton Oilers win the 2026 NHL Stanley Cup?": "Edmonton Oilers 2026 NHL Stanley Kupası'nı kazanır mı?",
    "Will the Dallas Stars win the 2026 NHL Stanley Cup?": "Dallas Stars 2026 NHL Stanley Kupası'nı kazanır mı?",
    "Will the Colorado Avalanche win the 2026 NHL Stanley Cup?": "Colorado Avalanche 2026 NHL Stanley Kupası'nı kazanır mı?",
    "Will the Vegas Golden Knights win the 2026 NHL Stanley Cup?": "Vegas Golden Knights 2026 Stanley Kupası'nı kazanır mı?",
    // Weinstein
    "Will Harvey Weinstein be sentenced to no prison time?": "Harvey Weinstein hapis cezası alır mı?",
    "Will Harvey Weinstein be sentenced to less than 5 years in prison?": "Weinstein 5 yıldan az hapis alır mı?",
    "Will Harvey Weinstein be sentenced to between 5 and 10 years in prison?": "Weinstein 5-10 yıl arası hapis alır mı?",
    "Will Harvey Weinstein be sentenced to between 10 and 20 years in prison?": "Weinstein 10-20 yıl arası hapis alır mı?",
    "Will Harvey Weinstein be sentenced to between 20 and 30 years in prison?": "Weinstein 20-30 yıl arası hapis alır mı?",
    "Will Harvey Weinstein be sentenced to more than 30 years in prison?": "Weinstein 30 yıldan fazla hapis alır mı?",
    // NHL
    "Will the Carolina Hurricanes win the 2026 NHL Stanley Cup?": "Carolina Hurricanes 2026 NHL Stanley Kupası'nı kazanır mı?",
    "Will the Florida Panthers win the 2026 NHL Stanley Cup?": "Florida Panthers 2026 NHL Stanley Kupası'nı kazanır mı?",
    "Will the Edmonton Oilers win the 2026 NHL Stanley Cup?": "Edmonton Oilers 2026 NHL Stanley Kupası'nı kazanır mı?",
    "Will the Dallas Stars win the 2026 NHL Stanley Cup?": "Dallas Stars 2026 NHL Stanley Kupası'nı kazanır mı?",
    "Will the Colorado Avalanche win the 2026 NHL Stanley Cup?": "Colorado Avalanche 2026 Stanley Kupası'nı kazanır mı?",
    "Will the Vegas Golden Knights win the 2026 NHL Stanley Cup?": "Vegas Golden Knights 2026 Stanley Kupası'nı kazanır mı?",
  };
  if (exact[text]) return exact[text];

  // Pattern: "Will the <Team> win the <Year> NHL Stanley Cup?"
  const nhlPattern = /^Will the (.+?) win the (\d{4}) NHL Stanley Cup\?$/;
  const nhlMatch = text.match(nhlPattern);
  if (nhlMatch) {
    return `${nhlMatch[1]} ${nhlMatch[2]} NHL Stanley Kupası'nı kazanır mı?`;
  }

  // Fallback: word-by-word replacement
  let result = text;
  // Sort keys longest first to avoid partial matches
  const keys = Object.keys(DICT).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    result = result.split(key).join(DICT[key]);
  }
  return result;
}
