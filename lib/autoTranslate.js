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
  'Parguay': 'Paraguay', 'New Zealand': 'Yeni Zelanda', 'Australia': 'Avustralya',
  'Iran': 'İran', 'Uzbekistan': 'Özbekistan', 'South Korea': 'Güney Kore',
  'Jordan': 'Ürdün', 'Morocco': 'Fas', 'South Africa': 'Güney Afrika',
  'Senegal': 'Senegal', 'Ivory Coast': 'Fildişi Sahili', 'Ghana': 'Gana',
  'Egypt': 'Mısır', 'Algeria': 'Cezayir', 'Cape Verde': 'Cape Verde',
  'Qatar': 'Katar', 'Saudi Arabia': 'Suudi Arabistan', 'Scotland': 'İskoçya',
  'China': 'Çin', 'Russia': 'Rusya', 'Ukraine': 'Ukrayna',
  'Turkey': 'Türkiye', 'Israel': 'İsrail', 'Pakistan': 'Pakistan',
  'India': 'Hindistan', 'Greece': 'Yunanistan', 'Switzerland': 'İsviçre',
  'Austria': 'Avusturya', 'Sweden': 'İsveç', 'Denmark': 'Danimarka',
  'Finland': 'Finlandiya', 'Ireland': 'İrlanda', 'Poland': 'Polonya',
  'Czechia': 'Çekya', 'Hungary': 'Macaristan', 'Romania': 'Romanya',
  'Bulgaria': 'Bulgaristan', 'Croatia': 'Hırvatistan', 'Serbia': 'Sırbistan',
  'Norway': 'Norveç', 'Iceland': 'İzlanda', 'Lithuania': 'Litvanya',
  'Latvia': 'Letonya', 'Estonia': 'Estonya', 'Slovakia': 'Slovakya',
  'Slovenia': 'Slovenya', 'North Macedonia': 'Kuzey Makedonya',
  'Albania': 'Arnavutluk', 'Montenegro': 'Karadağ', 'Bosnia': 'Bosna-Hersek',
  'Luxembourg': 'Lüksemburg', 'Malta': 'Malta', 'Cyprus': 'Kıbrıs',
  'Armenia': 'Ermenistan', 'Azerbaijan': 'Azerbaycan', 'Georgia': 'Gürcistan',
  'Moldova': 'Moldova', 'Belarus': 'Belarus', 'Kazakhstan': 'Kazakistan',
  'Singapore': 'Singapur', 'Indonesia': 'Endonezya', 'Thailand': 'Tayland',
  'Vietnam': 'Vietnam', 'Philippines': 'Filipinler', 'Malaysia': 'Malezya',
  'Nigeria': 'Nijerya', 'Kenya': 'Kenya', 'South Africa': 'Güney Afrika',
  'Ethiopia': 'Etiyopya', 'Ghana': 'Gana', 'Cameroon': 'Kamerun',
  'Ivory Coast': 'Fildişi Sahili',
};

// ── Person / Celebrity / Politician name mappings ──
const PERSON_NAMES = {
  // US Politics
  'Oprah Winfrey': 'Oprah Winfrey',
  'LeBron James': 'LeBron James',
  'MrBeast': 'MrBeast',
  'Bernie Sanders': 'Bernie Sanders',
  'Barack Obama': 'Barack Obama',
  'Hillary Clinton': 'Hillary Clinton',
  'Kamala Harris': 'Kamala Harris',
  'Joe Biden': 'Joe Biden',
  'Gavin Newsom': 'Gavin Newsom',
  'Alexandria Ocasio-Cortez': 'Alexandria Ocasio-Cortez',
  'AOC': 'AOC',
  'Jon Ossoff': 'Jon Ossoff',
  'Josh Shapiro': 'Josh Shapiro',
  'Pete Buttigieg': 'Pete Buttigieg',
  'Mark Kelly': 'Mark Kelly',
  'Andy Beshear': 'Andy Beshear',
  'James Talarico': 'James Talarico',
  'Jon Stewart': 'Jon Stewart',
  'J.B. Pritzker': 'J.B. Pritzker',
  'Ro Khanna': 'Ro Khanna',
  'Gretchen Whitmer': 'Gretchen Whitmer',
  'Rahm Emanuel': 'Rahm Emanuel',
  'Wes Moore': 'Wes Moore',
  'Stephen A. Smith': 'Stephen A. Smith',
  'Michelle Obama': 'Michelle Obama',
  "Dwayne 'The Rock' Johnson": "Dwayne 'The Rock' Johnson",
  'Dwayne Johnson': "Dwayne 'The Rock' Johnson",
  'John Fetterman': 'John Fetterman',
  'Ruben Gallego': 'Ruben Gallego',
  'Mark Cuban': 'Mark Cuban',
  'Roy Cooper': 'Roy Cooper',
  'Cory Booker': 'Cory Booker',
  'Liz Cheney': 'Liz Cheney',
  'Chelsea Clinton': 'Chelsea Clinton',
  'Chris Murphy': 'Chris Murphy',
  'Raphael Warnock': 'Raphael Warnock',
  'George Clooney': 'George Clooney',
  'Tim Walz': 'Tim Walz',
  'Zohran Mamdani': 'Zohran Mamdani',
  'Andrew Yang': 'Andrew Yang',
  'Jared Polis': 'Jared Polis',
  'Kim Kardashian': 'Kim Kardashian',
  'Phil Murphy': 'Phil Murphy',
  'Hunter Biden': 'Hunter Biden',
  'Jasmine Crockett': 'Jasmine Crockett',
  'Beto O\'Rourke': 'Beto O\'Rourke',
  'J.D. Vance': 'J.D. Vance',
  'JD Vance': 'J.D. Vance',
  'Nikki Haley': 'Nikki Haley',
  'Ron DeSantis': 'Ron DeSantis',
  'John Thune': 'John Thune',
  'Tom Brady': 'Tom Brady',
  'Erika Kirk': 'Erika Kirk',
  'Katie Britt': 'Katie Britt',
  'Gina Raimondo': 'Gina Raimondo',
  'Will Ferrell': 'Will Ferrell',
  'Rihanna': 'Rihanna',
  'Playboi Carti': 'Playboi Carti',

  // Sports
  'Novak Djokovic': 'Novak Djokovic',
  'Rafael Nadal': 'Rafael Nadal',
  'Jannik Sinner': 'Jannik Sinner',
  'Carlos Alcaraz': 'Carlos Alcaraz',
  'Grigor Dimitrov': 'Grigor Dimitrov',
  'Aryna Sabalenka': 'Aryna Sabalenka',
  'Iga Swiatek': 'Iga Swiatek',
  'Coco Gauff': 'Coco Gauff',

  // World leaders
  'Netanyahu': 'Netanyahu',
  'Benjamin Netanyahu': 'Benjamin Netanyahu',
  'Putin': 'Putin',
  'Vladimir Putin': 'Vladimir Putin',
  'Xi Jinping': 'Xi Jinping',
  'Trump': 'Trump',
  'Elon Musk': 'Elon Musk',

  // Others
  'Harvey Weinstein': 'Harvey Weinstein',
  'Tom Cruise': 'Tom Cruise',
  'Taylor Swift': 'Taylor Swift',
  'Brad Pitt': 'Brad Pitt',
  'Angelina Jolie': 'Angelina Jolie',
  'Beyoncé': 'Beyoncé',
  'Cristiano Ronaldo': 'Cristiano Ronaldo',
  'Lionel Messi': 'Lionel Messi',
  'Kylian Mbappé': 'Kylian Mbappé',
  'Novak Djokovic': 'Novak Djokovic',
  'Rafael Nadal': 'Rafael Nadal',
  'George Russell': 'George Russell',
  'Max Verstappen': 'Max Verstappen',
  'Lewis Hamilton': 'Lewis Hamilton',
  'Lando Norris': 'Lando Norris',
  'Keiko Fujimori': 'Keiko Fujimori',
};

// ── Question translations ──
export function translateQuestion(text) {
  if (!text) return text;

  const q = text.trim();

  // ── Exact translations ──
  const exact = {
    "Russia-Ukraine Ceasefire before GTA VI?": "Rusya-Ukrayna Ateşkesi GTA VI'dan önce?",
    "New Rihanna Album before GTA VI?": "Rihanna'dan GTA VI'dan önce yeni albüm çıkar mı?",
    "New Playboi Carti Album before GTA VI?": "Playboi Carti'den GTA VI'dan önce yeni albüm çıkar mı?",
    "Will Jesus Christ return before GTA VI?": "Hz. İsa GTA VI'dan önce döner mi?",
    "Trump out as President before GTA VI?": "Trump GTA VI'dan önce başkanlıktan ayrılır mı?",
    "Will China invades Taiwan before GTA VI?": "Çin GTA VI'dan önce Tayvan'ı işgal eder mi?",
    "Will China invade Taiwan before GTA VI?": "Çin GTA VI'dan önce Tayvan'ı işgal eder mi?",
    "Will bitcoin hit $1m before GTA VI?": "Bitcoin GTA VI'dan önce $1M'ye ulaşır mı?",
    "Will Bitcoin hit $1m before GTA VI?": "Bitcoin GTA VI'dan önce $1M'ye ulaşır mı?",
    "GTA VI released before June 2026?": "GTA VI Haziran 2026'dan önce çıkar mı?",
    "Will Harvey Weinstein be sentenced to no prison time?": "Harvey Weinstein hapis cezası alır mı?",
    "Will Harvey Weinstein be sentenced to less than 5 years in prison?": "Weinstein 5 yıldan az hapis alır mı?",
    "Will Harvey Weinstein be sentenced to between 5 and 10 years in prison?": "Weinstein 5-10 yıl arası hapis alır mı?",
    "Will Harvey Weinstein be sentenced to between 10 and 20 years in prison?": "Weinstein 10-20 yıl arası hapis alır mı?",
    "Will Harvey Weinstein be sentenced to between 20 and 30 years in prison?": "Weinstein 20-30 yıl arası hapis alır mı?",
    "Will Harvey Weinstein be sentenced to more than 30 years in prison?": "Weinstein 30 yıldan fazla hapis alır mı?",
    "MegaETH market cap (FDV) >$2B one day after launch?": "MegaETH lansmandan 1 gün sonra piyasa değeri $2B'yi geçer mi?",
    "MegaETH market cap (FDV) >$6B one day after launch?": "MegaETH lansmandan 1 gün sonra piyasa değeri $6B'yi geçer mi?",
  };
  if (exact[q]) return exact[q];

  // ── Pattern 1: "Will [person] win [award/competition]?" ──
  const personWinMatch = q.match(/^Will ([A-Za-z][A-Za-z\s\'.]+?) (?:win|lose|be nominated|be elected|be selected)(.+)\?$/i);
  if (personWinMatch) {
    const name = personWinMatch[1].trim();
    const rest = personWinMatch[2].trim();
    const turkishName = PERSON_NAMES[name] || name;
    return `${turkishName} ${translateFragment(rest)} mı?`;
  }

  // ── Pattern 2: "Will [person] [verb phrase]?" (general person patterns) ──
  const personGeneralMatch = q.match(/^Will ([A-Za-z][A-Za-z\s\'.]+?) (.+)\?$/i);
  if (personGeneralMatch) {
    const name = personGeneralMatch[1].trim();
    const action = personGeneralMatch[2].trim();
    // Check if it's a known person
    const turkishName = PERSON_NAMES[name];
    if (turkishName || Object.keys(PERSON_NAMES).some(p => name.includes(p) || p.includes(name))) {
      const matchedKey = Object.keys(PERSON_NAMES).find(p => name.includes(p) || p.includes(name));
      const resolvedName = PERSON_NAMES[matchedKey] || turkishName || name;
      return `${resolvedName} ${translateFragment(action)} mı?`;
    }
  }

  // ── Pattern 3: FIFA World Cup ──
  const fifaPattern = /^Will (.+?) win the (\d{4}) FIFA World Cup\?$/;
  const fifaMatch = q.match(fifaPattern);
  if (fifaMatch) {
    const country = COUNTRY_NAMES[fifaMatch[1]] || PERSON_NAMES[fifaMatch[1]] || fifaMatch[1];
    return `${country} ${fifaMatch[2]} FIFA Dünya Kupası'nı kazanır mı?`;
  }

  // ── Pattern 4: NBA Finals ──
  const nbaPattern = /^Will the (.+?) win the (\d{4}) NBA Finals\?$/;
  const nbaMatch = q.match(nbaPattern);
  if (nbaMatch) {
    return `${nbaMatch[1]} ${nbaMatch[2]} NBA Finali'ni kazanır mı?`;
  }

  // ── Pattern 5: NHL Stanley Cup ──
  const nhlPattern = /^Will the (.+?) win the (\d{4}) NHL Stanley Cup\?$/;
  const nhlMatch = q.match(nhlPattern);
  if (nhlMatch) {
    return `${nhlMatch[1]} ${nhlMatch[2]} NHL Stanley Kupası'nı kazanır mı?`;
  }

  // ── Pattern 6: MegaETH ──
  if (q.includes('MegaETH market cap')) {
    const dollarMatch = q.match(/([<>])?\$([0-9.]+)([BM])/);
    const amount = dollarMatch ? `$${dollarMatch[2]}${dollarMatch[3]}` : '?';
    return `MegaETH lansmandan 1 gün sonra piyasa değeri ${amount}'yi geçer mi?`;
  }

  // ── Pattern 7: [Person] win 2028 ──
  const pres2028Match = q.match(/^Will (.+?) win the 2028 Democratic presidential nomination\?$/i);
  if (pres2028Match) {
    const name = pres2028Match[1].trim();
    const turkishName = PERSON_NAMES[name] || name;
    return `${turkishName} 2028 Demokrat Başkanlık Adaylığı'nı kazanır mı?`;
  }

  const pres2028RepMatch = q.match(/^Will (.+?) win the 2028 Republican presidential nomination\?$/i);
  if (pres2028RepMatch) {
    const name = pres2028RepMatch[1].trim();
    const turkishName = PERSON_NAMES[name] || name;
    return `${turkishName} 2028 Cumhuriyetçi Başkanlık Adaylığı'nı kazanır mı?`;
  }

  const presGen2028Match = q.match(/^Will (.+?) win the 2028 US Presidential Election\?$/i);
  if (presGen2028Match) {
    const name = presGen2028Match[1].trim();
    const turkishName = PERSON_NAMES[name] || name;
    return `${turkishName} 2028 ABD Başkanlık Seçimi'ni kazanır mı?`;
  }

  // ── Fallback: word-by-word replacement ──
  let result = q;

  // Replace person names first (before country names)
  const sortedPersons = Object.keys(PERSON_NAMES).sort((a, b) => b.length - a.length);
  for (const person of sortedPersons) {
    result = result.replace(new RegExp(person, 'gi'), PERSON_NAMES[person]);
  }

  // Replace country names
  const sortedCountries = Object.keys(COUNTRY_NAMES).sort((a, b) => b.length - a.length);
  for (const country of sortedCountries) {
    result = result.replace(new RegExp(country, 'g'), COUNTRY_NAMES[country]);
  }

  // Pattern-based replacements
  result = result
    .replace(/^Will the /, '')
    .replace(/^Will /, '')
    .replace(/win the /g, 'kazanır mı? ')
    .replace(/lose the /g, 'kaybeder mi? ')
    .replace(/be nominated for the /g, '')
    .replace(/be nominated$/g, 'aday gösterilir mi?')
    .replace(/be elected$/g, 'seçilir mi?')
    .replace(/ FIFA World Cup/g, ' FIFA Dünya Kupası')
    .replace(/ NBA Finals/g, ' NBA Finalleri')
    .replace(/ NHL Stanley Cup/g, ' NHL Stanley Kupası')
    .replace(/ before /g, ' öncesinde ')
    .replace(/ after /g, ' sonrasında ')
    .replace(/ released /g, ' yayınlansın ')
    .replace(/ ceases to be /g, ' bırakır ')
    .replace(/invades Taiwan/g, 'Tayvan\'ı işgal eder')
    .replace(/invade Taiwan/g, 'Tayvan\'ı işgal eder')
    .replace(/hit \$/g, '$')
    .replace(/surpass \$/g, '$')
    .replace(/reach \$/g, '$')
    .replace(/reach €/g, '€')
    .replace(/surpass €/g, '€')
    .replace(/Ceasefire/g, 'Ateşkes')
    .replace(/return/ig, 'döner')
    .replace(/President/g, 'Başkan')
    .replace(/president/gi, 'başkan')
    .replace(/bitcoin/gi, 'Bitcoin')
    .replace(/GTA VI/g, 'GTA VI')
    .replace(/Bitcoin/gi, 'Bitcoin');

  // Fix double spaces / question marks
  result = result.replace(/\s+/g, ' ').replace(/\s+\?/, ' mı?').trim();
  if (!result.endsWith('?')) result += '?';

  return result;
}

// ── Helper: translate action fragments ──
function translateFragment(text) {
  return text
    .replace(/^win the /g, 'kazanır ')
    .replace(/^lose the /g, 'kaybeder ')
    .replace(/be nominated for /g, '')
    .replace(/be elected /g, 'seçilir ')
    .replace(/^win /g, 'kazanır ')
    .replace(/ 2028 Democratic presidential nomination$/, '2028 Demokrat Başkanlık Adaylığı')
    .replace(/ 2028 Republican presidential nomination$/, '2028 Cumhuriyetçi Başkanlık Adaylığı')
    .replace(/ 2028 US Presidential Election$/, '2028 ABD Başkanlık Seçimi');
}
