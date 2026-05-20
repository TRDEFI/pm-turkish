// Auto-translate: Replaces English question/event keywords with Turkish on the client.
// NO API calls — instant, zero latency.

// ── Person / Celebrity / Politician name mappings ──
// MUST be checked BEFORE any other pattern (sorted by length descending)
const PERSON_NAMES = {
  // US Politics — 2028 Presidential
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
  "Beto O'Rourke": "Beto O'Rourke",
  'J.D. Vance': 'J.D. Vance',
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
  'J.B. Pritzker': 'J.B. Pritzker',
  'Joe Biden': 'Joe Biden',
  'J.D. Vance': 'J.D. Vance',
  'Bernie Sanders': 'Bernie Sanders',

  // Sports
  'Novak Djokovic': 'Novak Djokovic',
  'Rafael Nadal': 'Rafael Nadal',
  'Jannik Sinner': 'Jannik Sinner',
  'Carlos Alcaraz': 'Carlos Alcaraz',
  'Grigor Dimitrov': 'Grigor Dimitrov',
  'Aryna Sabalenka': 'Aryna Sabalenka',
  'Iga Swiatek': 'Iga Swiatek',
  'Coco Gauff': 'Coco Gauff',
  'George Russell': 'George Russell',
  'Max Verstappen': 'Max Verstappen',
  'Lewis Hamilton': 'Lewis Hamilton',
  'Lando Norris': 'Lando Norris',
  'Keiko Fujimori': 'Keiko Fujimori',
  'Oklahoma City Thunder': 'Oklahoma City Thunder',
  'Golden State Warriors': 'Golden State Warriors',
  'Boston Celtics': 'Boston Celtics',
  'Los Angeles Lakers': 'Los Angeles Lakers',
  'Denver Nuggets': 'Denver Nuggets',
  'Miami Heat': 'Miami Heat',
  'Dallas Mavericks': 'Dallas Mavericks',
  'Phoenix Suns': 'Phoenix Suns',
  'Philadelphia 76ers': 'Philadelphia 76ers',
  'Milwaukee Bucks': 'Milwaukee Bucks',
  'Toronto Raptors': 'Toronto Raptors',
  'Brooklyn Nets': 'Brooklyn Nets',
  'Minnesota Timberwolves': 'Minnesota Timberwolves',
  'Cleveland Cavaliers': 'Cleveland Cavaliers',
  'Atlanta Hawks': 'Atlanta Hawks',
  'Charlotte Hornets': 'Charlotte Hornets',
  'Detroit Pistons': 'Detroit Pistons',
  'Houston Rockets': 'Houston Rockets',
  'Indiana Pacers': 'Indiana Pacers',
  'LA Clippers': 'LA Clippers',
  'Memphis Grizzlies': 'Memphis Grizzlies',
  'New Orleans Pelicans': 'New Orleans Pelicans',
  'New York Knicks': 'New York Knicks',
  'Orlando Magic': 'Orlando Magic',
  'Portland Trail Blazers': 'Portland Trail Blazers',
  'Sacramento Kings': 'Sacramento Kings',
  'San Antonio Spurs': 'San Antonio Spurs',
  'Utah Jazz': 'Utah Jazz',
  'Washington Wizards': 'Washington Wizards',

  // World leaders
  'Benjamin Netanyahu': 'Benjamin Netanyahu',
  'Netanyahu': 'Netanyahu',
  'Vladimir Putin': 'Vladimir Putin',
  'Putin': 'Putin',
  'Xi Jinping': 'Xi Jinping',
  'Donald Trump': 'Donald Trump',
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
  'Kevin De Bruyne': 'Kevin De Bruyne',
  'Mohamed Salah': 'Mohamed Salah',
  'Erling Haaland': 'Erling Haaland',
  'Neymar': 'Neymar',
  'Kobe Bryant': 'Kobe Bryant',
  'Michael Jordan': 'Michael Jordan',
  'Stephen Curry': 'Stephen Curry',
  'Kevin Durant': 'Kevin Durant',
  'Giannis Antetokounmpo': 'Giannis Antetokounmpo',
  'Luka Doncic': 'Luka Dončić',
  'Zion Williamson': 'Zion Williamson',
  'Ja Morant': 'Ja Morant',
  'Paul George': 'Paul George',
  'Jimmy Butler': 'Jimmy Butler',
  'Donovan Mitchell': 'Donovan Mitchell',
  'De\'Aaron Fox': "De'Aaron Fox",
  'Jaylen Brown': 'Jaylen Brown',
  'Jayson Tatum': 'Jayson Tatum',
  'Damian Lillard': 'Damian Lillard',
  'Bradley Beal': 'Bradley Beal',
  'Devin Booker': 'Devin Booker',
  'Trae Young': 'Trae Young',
  'Zach LaVine': 'Zach LaVine',
  'Julius Randle': 'Julius Randle',
  'Bam Adebayo': 'Bam Adebayo',
  'Karl-Anthony Towns': 'Karl-Anthony Towns',
  'Nikola Jokic': 'Nikola Jokić',
  'Joel Embiid': 'Joel Embiid',
  'Kyrie Irving': 'Kyrie Irving',
  'James Harden': 'James Harden',
  'Russell Westbrook': 'Russell Westbrook',
  'Anthony Davis': 'Anthony Davis',
  'Austin Reaves': 'Austin Reaves',
  'Victor Wembanyama': 'Victor Wembanyama',

  // FIFA teams
  'Spain': 'İspanya', 'England': 'İngiltere', 'France': 'Fransa',
  'Brazil': 'Brezilya', 'Argentina': 'Arjantin', 'Germany': 'Almanya',
  'Portugal': 'Portekiz', 'Netherlands': 'Hollanda', 'Uruguay': 'Uruguay',
  'Mexico': 'Meksika', 'Belgium': 'Belçika', 'Colombia': 'Kolombiya',
  'Japan': 'Japonya', 'Norway': 'Norveç', 'Canada': 'Kanada',
  'Tunisia': 'Tunus', 'Ecuador': 'Ekvador', 'Paraguay': 'Paraguay',
  'New Zealand': 'Yeni Zelanda', 'Australia': 'Avustralya', 'Iran': 'İran',
  'Uzbekistan': 'Özbekistan', 'South Korea': 'Güney Kore', 'Jordan': 'Ürdün',
  'Morocco': 'Fas', 'South Africa': 'Güney Afrika', 'Senegal': 'Senegal',
  'Ivory Coast': 'Fildişi Sahili', 'Egypt': 'Mısır', 'Algeria': 'Cezayir',
  'Cape Verde': 'Cape Verde', 'Qatar': 'Katar', 'Saudi Arabia': 'Suudi Arabistan',
  'Scotland': 'İskoçya', 'China': 'Çin', 'Russia': 'Rusya', 'Ukraine': 'Ukrayna',
  'Turkiye': 'Türkiye', 'Turkey': 'Türkiye', 'Israel': 'İsrail',
  'Pakistan': 'Pakistan', 'India': 'Hindistan', 'Greece': 'Yunanistan',
  'Switzerland': 'İsviçre', 'Austria': 'Avusturya', 'Sweden': 'İsveç',
  'Denmark': 'Danimarka', 'Finland': 'Finlandiya', 'Ireland': 'İrlanda',
  'Poland': 'Polonya', 'Czechia': 'Çekya', 'Hungary': 'Macaristan',
  'Romania': 'Romanya', 'Bulgaria': 'Bulgaristan', 'Croatia': 'Hırvatistan',
  'Serbia': 'Sırbistan', 'Iceland': 'İzlanda', 'Lithuania': 'Litvanya',
  'Latvia': 'Letonya', 'Estonia': 'Estonya', 'Slovakia': 'Slovakya',
  'Slovenia': 'Slovenya', 'North Macedonia': 'Kuzey Makedonya',
  'Albania': 'Arnavutluk', 'Montenegro': 'Karadağ', 'Bosnia': 'Bosna-Hersek',
  'Luxembourg': 'Lüksemburg', 'Malta': 'Malta', 'Cyprus': 'Kıbrıs',
  'Armenia': 'Ermenistan', 'Azerbaijan': 'Azerbaycan', 'Georgia': 'Gürcistan',
  'Moldova': 'Moldova', 'Belarus': 'Belarus', 'Kazakhstan': 'Kazakistan',
  'Singapore': 'Singapur', 'Indonesia': 'Endonezya', 'Thailand': 'Tayland',
  'Vietnam': 'Vietnam', 'Philippines': 'Filipinler', 'Malaysia': 'Malezya',
  'Nigeria': 'Nijerya', 'Kenya': 'Kenya', 'Ethiopia': 'Etiyopya', 'Ghana': 'Gana',
  'Cameroon': 'Kamerun', 'USA': 'ABD',
  'Cezchia': 'Çekya', 'Bosnia-Herzegovina': 'Bosna-Hersek',
  'Congo DR': 'Kongo DC',

  // Crypto
  'Bitcoin': 'Bitcoin', 'Ethereum': 'Ethereum', 'BTC': 'BTC', 'ETH': 'ETH',
  'XRP': 'XRP', 'Solana': 'Solana', 'SOL': 'SOL', 'Dogecoin': 'Dogecoin',
  'DOGE': 'DOGE', 'Avalanche': 'Avalanche', 'AVAX': 'AVAX',

  // NBA teams in questions
  'Timberwolves': 'Timberwolves', 'Nuggets': 'Nuggets',
  'Raptors': 'Raptors', 'Cavaliers': 'Cavaliers',
  'Lakers': 'Lakers', 'Warriors': 'Warriors',
  'Celtics': 'Celtics', 'Heat': 'Heat',
  'Bucks': 'Bucks', 'Thunder': 'Thunder',
  'Mavericks': 'Mavericks', 'Suns': 'Suns',
  'Kings': 'Kings', 'Clippers': 'Clippers',

  // LoL teams
  'JD Gaming': 'JD Gaming', 'Weibo Gaming': 'Weibo Gaming',
  'Bilibili Gaming': 'Bilibili Gaming', 'Invictus Gaming': 'Invictus Gaming',
  'Team Spirit': 'Team Spirit', 'Vici Gaming': 'Vici Gaming',
  'FURIA': 'FURIA', 'Vitality': 'Vitality',
};

// Sort by length (longest first) so multi-word names match before single words
const PERSON_KEYS = Object.keys(PERSON_NAMES).sort((a, b) => b.length - a.length);

// ── Event title translations ──
export function translateEventTitle(text) {
  if (!text) return text;
  // Exact title matches
  const titles = {
    "2026 FIFA World Cup Winner ": "2026 FIFA Dünya Kupası Şampiyonu",
    "2026 NBA Champion": "2026 NBA Şampiyonu",
    "2026 NHL Stanley Cup Champion ": "2026 NHL Stanley Kupası Şampiyonu",
    "Putin out as President of Russia by December 31, 2026?": "Putin 31 Aralık 2026'ya kadar Rusya Devlet Başkanı olarak kalır mı?",
    "Democratic Presidential Nominee 2028": "2028 Demokrat Başkanlık Adayı",
    "Presidential Election Winner 2028": "2028 Başkanlık Seçimi Kazananı",
    "Xi Jinping out before 2027?": "Xi Jinping 2027'den önce görevinden ayrılır mı?",
    "NBA Rookie of the Year ": "2026 NBA Yılın Çaylağı",
    "GTA VI released before June 2026?": "GTA VI Haziran 2026'dan önce çıkar mı?",
    "MegaETH market cap (FDV) one day after launch?": "MegaETH Piyasa Değeri (FDV) Lansmandan 1 Gün Sonra?",
    "MegaETH airdrop by...?": "MegaETH Airdrop Ne Zaman?",
    "Harvey Weinstein prison time?": "Harvey Weinstein Hapis Cezası?",
    "Donald Trump out as President before 2027?": "Trump 2027'den önce Başkanlık görevinden ayrılır mı?",
  };
  if (titles[text]) return titles[text];
  return text;
}

// ── Question translations ──
export function translateQuestion(text) {
  if (!text) return text;
  const q = text.trim();

  // Step 1: Exact matches (handles all variations)
  const exactMatches = {
    "Russia-Ukraine Ceasefire before GTA VI?": "Rusya-Ukrayna Ateşkesi GTA VI'dan önce sağlanır mı?",
    "New Rihanna Album before GTA VI?": "Rihanna GTA VI'dan önce Yeni Albüm Çıkarır mı?",
    "New Playboi Carti Album before GTA VI?": "Playboi Carti GTA VI'dan Önce Yeni Albüm Çıkarır mı?",
    "Will Jesus Christ return before GTA VI?": "Hz. İsa GTA VI'dan Önce Döner mi?",
    "Trump out as President before GTA VI?": "Trump GTA VI'dan Önce Başkanlıktan Ayrılır mı?",
    "Will Trump out as President before GTA VI?": "Trump GTA VI'dan Önce Başkanlıktan Ayrılır mı?",
    "Will China invades Taiwan before GTA VI?": "Çin GTA VI'dan Önce Tayvan'ı İşgal Eder mi?",
    "Will China invade Taiwan before GTA VI?": "Çin GTA VI'dan Önce Tayvan'ı İşgal Eder mi?",
    "Will bitcoin hit $1m before GTA VI?": "Bitcoin GTA VI'dan Önce 1 Milyon Dolara Ulaşır mı?",
    "Will Bitcoin hit $1m before GTA VI?": "Bitcoin GTA VI'dan Önce 1 Milyon Dolara Ulaşır mı?",
    "GTA VI released before June 2026?": "GTA VI Haziran 2026'dan Önce Çıkar mı?",
    "Will Harvey Weinstein be sentenced to no prison time?": "Harvey Weinstein Hapis Cezası Almaz mı?",
    "Will Harvey Weinstein be sentenced to less than 5 years in prison?": "Harvey Weinstein 5 Yıldan Az Hapis Cezası Alır mı?",
    "Will Harvey Weinstein be sentenced to between 5 and 10 years in prison?": "Harvey Weinstein 5-10 Yıl Arası Hapis Cezası Alır mı?",
    "Will Harvey Weinstein be sentenced to between 10 and 20 years in prison?": "Harvey Weinstein 10-20 Yıl Arası Hapis Cezası Alır mı?",
    "Will Harvey Weinstein be sentenced to between 20 and 30 years in prison?": "Harvey Weinstein 20-30 Yıl Arası Hapis Cezası Alır mı?",
    "Will Harvey Weinstein be sentenced to more than 30 years in prison?": "Harvey Weinstein 30 Yıldan Fazla Hapis Cezası Alır mı?",
    "MegaETH market cap (FDV) >$2B one day after launch?": "MegaETH Piyasa Değeri (FDV) Lansmandan 1 Gün Sonra 2 Milyar Doları Geçer mi?",
    "MegaETH market cap (FDV) >$6B one day after launch?": "MegaETH Piyasa Değeri (FDV) Lansmandan 1 Gün Sonra 6 Milyar Doları Geçer mi?",
    "MegaETH market cap (FDV) >$10B one day after launch?": "MegaETH Piyasa Değeri (FDV) Lansmandan 1 Gün Sonra 10 Milyar Doları Geçer mi?",
    "MegaETH market cap (FDV) one day after launch?": "MegaETH Piyasa Değeri (FDV) Lansmandan 1 Gün Sonra?",
    "Will MegaETH market cap (FDV) exceed $2B one day after launch?": "MegaETH Piyasa Değeri (FDV) Lansmandan 1 Gün Sonra 2 Milyar Doları Geçer mi?",
    "Will MegaETH market cap (FDV) exceed $6B one day after launch?": "MegaETH Piyasa Değeri (FDV) Lansmandan 1 Gün Sonra 6 Milyar Doları Geçer mi?",
    "Will MegaETH market cap (FDV) exceed $10B one day after launch?": "MegaETH Piyasa Değeri (FDV) Lansmandan 1 Gün Sonra 10 Milyar Doları Geçer mi?",
    "Will MegaETH airdrop before June 2026?": "MegaETH Airdrop Haziran 2026'dan Önce Yapılır mı?",
    "Will MegaETH launch before June 2026?": "MegaETH Haziran 2026'dan Önce Lansman Yapar mı?",
    "Fed decision in April?": "Fed Nisan Ayında Karar Verir mi?",
    "US x Iran permanent peace deal by June 30?": "ABD-İran Kalıcı Barış Anlaşması 30 Haziran'a Kadar Yapılır mı?",
    "US x Iran permanent peace deal by...?": "ABD-İran Kalıcı Barış Anlaşması Ne Zaman Yapılır?",
    "Israel x Hezbollah ceasefire by April 18?": "İsrail-Hezbollah Ateşkesi 18 Nisan'a Kadar Sağlanır mı?",
    "Stra of Hormuz traffic returns to normal by end of April?": "Hurmuz Boğazı Trafiği Nisan Sonuna Kadar Normale Döner mi?",
    "Stra of Hormuz traffic returns to normal by end of April": "Hurmuz Boğazı Trafiği Nisan Sonuna Kadar Normale Döner mi?",
    "Peru Presidential Election Winner": "Peru Başkanlık Seçimi Kazananı",
    "Eurovision Winner 2026": "Eurovision 2026 Kazananı",
    "F1 Drivers' Champion 2026": "F1 Pilotlar Şampiyonu 2026",
    "Who will win the 2026 NBA Finals?": "2026 NBA Finalleri'ni Kim Kazanır?",
    "Who will win the 2026 NBA Championship?": "2026 NBA Şampiyonluğu'nu Kim Kazanır?",
  };
  if (exactMatches[q]) return exactMatches[q];

  // Step 2: Pattern — "Will [PERSON] win/wins the [YEAR] [COMPETITION]?"
  // Matches: "Will Oprah Winfrey win the 2028 Democratic presidential nomination?"
  // Also: "Will Oprah Winfrey wins the 2028..." ( Polymarket uses 'wins' )
  // Strategy: find known person name in the string, extract everything after the name
  let personFound = null;
  let afterPerson = '';
  for (const key of PERSON_KEYS) {
    // Case-insensitive search for person name in question
    const regex = new RegExp(`^Will\\s+${key.replace(/[.'-]/g, '\\$&')}s?\\s+(.+)$`, 'i');
    const match = q.match(regex);
    if (match) {
      personFound = PERSON_NAMES[key];
      afterPerson = match[1].trim();
      break;
    }
    // Also try without trailing 's' (in case key ends with 's')
    const noSregex = new RegExp(`^Will\\s+${key.replace(/[.'-]/g, '\\$&')}s?\\s+(.+)$`, 'i');
    const match2 = q.match(noSregex);
    if (match2) {
      personFound = PERSON_NAMES[key];
      afterPerson = match2[1].trim();
      break;
    }
  }

  if (personFound) {
    // Check if it's a win/nomination type question
    const winMatch = afterPerson.match(/^(wins?)\s+(?:the\s+)?(.+)\??$/i);
    if (winMatch) {
      const verb = winMatch[1];
      const competition = winMatch[2].trim();
      const compTranslated = translateCompetition(competition);
      return `${personFound} ${compTranslated} Kazanır mı?`;
    }
    // Non-win person question
    const actionTurkish = translateActionPhrase(afterPerson.replace(/\?$/, ''));
    return `${personFound} ${actionTurkish} mı?`;
  }

  // Step 3: Pattern — "Will [PERSON] [verb phrase]?" (non-win)
  const verbPattern = q.match(/^Will\s+(.+?)\s+(.+)\??$/i);
  if (verbPattern) {
    const rawName = verbPattern[1].trim();
    const action = verbPattern[2].trim();

    // Check if this is a known person
    let personTurkish = null;
    for (const key of PERSON_KEYS) {
      if (rawName.toLowerCase() === key.toLowerCase() || rawName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(rawName.toLowerCase())) {
        personTurkish = PERSON_NAMES[key];
        break;
      }
    }

    if (personTurkish) {
      const actionTurkish = translateActionPhrase(action);
      return `${personTurkish} ${actionTurkish} mı?`;
    }
  }

  // Step 4: Generic word-by-word replacement for country/person names
  let result = q;

  // Replace multi-word names/phrases first
  for (const key of PERSON_KEYS) {
    if (key.length < 3) continue; // Skip very short keys to avoid collisions
    const regex = new RegExp(key.replace(/[.'-]/g, '\\$&'), 'gi');
    result = result.replace(regex, PERSON_NAMES[key]);
  }

  // Country-specific replacements
  result = result
    .replace(/United States/gi, 'Amerika Birleşik Devletleri')
    .replace(/United Kingdom/gi, 'Birleşik Krallık')
    .replace(/Russia-Ukraine/gi, 'Rusya-Ukrayna')
    .replace(/US x Iran/gi, 'ABD-İran')
    .replace(/Israel x Hezbollah/gi, 'İsrail-Hezbollah')
    .replace(/China invades Taiwan/gi, 'Çin Tayvan\'ı işgal eder')
    .replace(/China invade Taiwan/gi, 'Çin Tayvan\'ı işgal eder')
    .replace(/ceasefire/gi, 'ateşkes')
    .replace(/Ceasefire/gi, 'Ateşkes')
    .replace(/released/gi, 'yayınlansın')
    .replace(/President/gi, 'Başkan')
    .replace(/president/gi, 'başkan')
    .replace(/bitcoin/gi, 'Bitcoin')
    .replace(/Bitcoin/gi, 'Bitcoin')
    .replace(/GTA VI/gi, 'GTA VI')
    .replace(/million/gi, 'milyon')
    .replace(/billion/gi, 'milyar')
    .replace(/trillion/gi, 'trilyon')
    .replace(/return/gi, 'döner')
    .replace(/out as/gi, 'olarak görevden')
    .replace(/out before/gi, 'önce')
    .replace(/out by/gi, 'e kadar')
    .replace(/in prison/gi, 'hapishanede')
    .replace(/prison time/gi, 'hapis cezası')
    .replace(/sentenced to/gi, 'hüküm giyen')
    .replace(/sentenced/gi, 'hüküm giymiş')
    .replace(/less than/gi, 'daha az')
    .replace(/more than/gi, 'daha fazla')
    .replace(/between/gi, 'arası')
    .replace(/years?/gi, 'yıl')
    .replace(/the Federal Reserve/gi, 'Fed')
    .replace(/Federal Reserve/gi, 'Fed')
    .replace(/decision in/gi, 'kararı')
    .replace(/decision/gi, 'karar')
    .replace(/permanent peace deal/gi, 'kalıcı barış anlaşması')
    .replace(/peace deal/gi, 'barış anlaşması')
    .replace(/market cap/gi, 'piyasa değeri')
    .replace(/one day after launch/gi, 'lansmandan 1 gün sonra')
    .replace(/airdrop by/gi, 'airdrop:')
    .replace(/launch/gi, 'lansman')
    .replace(/exceed/gi, 'aşar')
    .replace(/hit \$/gi, '$')
    .replace(/surpass \$/gi, '$')
    .replace(/reach \$/gi, '$')
    .replace(/reach €/gi, '€')
    .replace(/surpass €/gi, '€')
    .replace(/hit €/gi, '€')
    .replace(/FIFA World Cup/gi, 'FIFA Dünya Kupası')
    .replace(/World Cup/gi, 'Dünya Kupası')
    .replace(/NBA Finals/gi, 'NBA Finalleri')
    .replace(/NBA Championship/gi, 'NBA Şampiyonluğu')
    .replace(/NBA Champion/gi, 'NBA Şampiyonu')
    .replace(/NHL Stanley Cup/gi, 'NHL Stanley Kupası')
    .replace(/Stanley Cup/gi, 'Stanley Kupası')
    .replace(/Rookie of the Year/gi, 'Yılın Çaylağı')
    .replace(/Drivers' Champion/gi, 'Pilotlar Şampiyonu')
    .replace(/Democratic presidential nomination/gi, 'Demokrat Başkanlık Adaylığı')
    .replace(/Republican presidential nomination/gi, 'Cumhuriyetçi Başkanlık Adaylığı')
    .replace(/presidential nomination/gi, 'Başkanlık Adaylığı')
    .replace(/presidential election/gi, 'Başkanlık Seçimi')
    .replace(/election winner/gi, 'Seçim Kazananı')
    .replace(/Eurovision Winner/gi, 'Eurovision Kazananı')
    .replace(/Presidential Election/gi, 'Başkanlık Seçimi')
    .replace(/Presidential Election Winner/gi, 'Başkanlık Seçimi Kazananı')
    .replace(/F1 Drivers' Champion/gi, 'F1 Pilotlar Şampiyonu')
    .replace(/Stra of Hormuz/gi, 'Hurmuz Boğazı')
    .replace(/Hurmuz/gi, 'Hurmuz')
    .replace(/traffic returns to normal/gi, 'trafik normale döner')
    .replace(/by end of/gi, 'sonuna kadar')
    .replace(/before/gi, 'önce')
    .replace(/after/gi, 'sonra')
    .replace(/by/gi, 'tarihine kadar')
    .replace(/out/gi, 'çıkar')
    .replace(/New Album/gi, 'Yeni Albüm')
    .replace(/album/gi, 'albüm')
    .replace(/Season/gi, 'Sezon')
    .replace(/season/gi, 'sezon');

  // Clean up double spaces and question marks
  result = result.replace(/\s+/g, ' ').replace(/\s+\?/, '?').trim();
  if (!result.endsWith('?')) result += '?';

  return result;
}

// ── Helper: translate competition/award part ──
function translateCompetition(comp) {
  return comp
    .replace(/2028 Democratic presidential nomination$/, '2028 Demokrat Başkanlık Adaylığı')
    .replace(/2028 Republican presidential nomination$/, '2028 Cumhuriyetçi Başkanlık Adaylığı')
    .replace(/2028 US Presidential Election$/, '2028 ABD Başkanlık Seçimi')
    .replace(/2028 Presidential Election$/, '2028 Başkanlık Seçimi')
    .replace(/2028 presidential nomination$/, '2028 Başkanlık Adaylığı')
    .replace(/2026 FIFA World Cup$/, '2026 FIFA Dünya Kupası')
    .replace(/2026 NBA Finals$/, '2026 NBA Finalleri')
    .replace(/2026 NBA Championship$/, '2026 NBA Şampiyonluğu')
    .replace(/2026 NHL Stanley Cup$/, '2026 NHL Stanley Kupası')
    .replace(/2026 F1 Drivers' Championship$/, '2026 F1 Pilotlar Şampiyonluğu')
    .replace(/the\s+/gi, '');
}

// ── Helper: translate action phrase (for non-win verbs) ──
function translateActionPhrase(action) {
  return action
    .replace(/be sentenced to no prison time/, 'hapis cezası almaz')
    .replace(/be sentenced to less than (\d+) years?/, (_, n) => `${n} yıldan az hapis cezası alır`)
    .replace(/be sentenced to (\d+) to (\d+) years/, (_, a, b) => `${a}-${b} yıl arası hapis cezası alır`)
    .replace(/be sentenced to more than (\d+) years/, (_, n) => `${n} yıldan fazla hapis cezası alır`)
    .replace(/be elected president/, 'başkan seçilir')
    .replace(/be nominated for president/, 'başkan adayı gösterilir')
    .replace(/launch a new album/, 'yeni albüm çıkarır')
    .replace(/release a new album/, 'yeni albüm çıkarır')
    .replace(/have a new album/, 'yeni albümü olur')
    .replace(/be out as president/, 'başkanlık görevinden çıkar')
    .replace(/return before/, 'önce döner')
    .replace(/be released before/, 'önce yayınlanır')
    .replace(/hit \$(\d+)m/, '\$\$Milyon seviyesine çıkar')
    .replace(/surpass \$(\d+)m/, '\$\$Milyon üstüne çıkar');
}
