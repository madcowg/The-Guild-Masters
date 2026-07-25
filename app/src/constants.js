export const RANKS = ["F", "E", "D", "C", "B", "A", "S"];

export const RANK_COLORS = {
  F: "#8B8B7A",
  E: "#A7ADB8",
  D: "#3E7C6F",
  C: "#3E6C9C",
  B: "#7B4FA0",
  A: "#C06B2E",
  S: "#C9A227",
};

export const XP_PER_RANK = {
  F: 20,
  E: 35,
  D: 60,
  C: 100,
  B: 160,
  A: 250,
  S: 400,
};

export const RANK_XP_THRESHOLD = {
  E: 10,
  D: 100,
  C: 600,
  B: 2400,
  A: 8e3,
  S: 24e3,
};

export const STAT_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export const STAT_NAMES = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  WIS: "Wisdom",
  CHA: "Charisma",
};

export const STAT_DESCRIPTIONS = {
  STR: "Grown by labor: hauling, moving, building.",
  DEX: "Grown by handiwork: repairs, crafts, delicate rescues.",
  CON: "Grown by endurance: treks, long shifts, festival days.",
  INT: "Grown by study: tutoring, code, and clever solutions.",
  WIS: "Grown by judgment: planning, searching, sound counsel.",
  CHA: "Grown by company: outings, hosting, and good cheer.",
};

export const STAT_TIERS = [
  [80, "Legendary", "#C9A227"],
  [40, "Mythril", "#7B4FA0"],
  [20, "Gilded", "#C06B2E"],
  [10, "Tempered", "#3E7C6F"],
  [0, "Novice", "#8B8B7A"],
];

export const tierForStat = (value) => STAT_TIERS.find(([threshold]) => value >= threshold);

export const CARD_NUMERALS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
];

export const SEED_QUESTS = [
  {
    id: "q1",
    rank: "F",
    title: "The Vanished Familiar",
    desc: "Mrs. Alvarez's cat, Biscuit, slipped out near Willow & 5th. Last seen at dusk. Gentle hands required.",
    type: "Search",
    stats: {
      WIS: 1,
    },
    scrip: 40,
    employer: "Mrs. Alvarez",
    barter: false,
  },
  {
    id: "q2",
    rank: "F",
    title: "The Couch of Burden",
    desc: "A three-flight ascent awaits. One couch, two boxes, zero elevators. Pizza provided upon victory.",
    type: "Labor",
    stats: {
      STR: 1,
    },
    scrip: 60,
    employer: "Theo M.",
    barter: false,
  },
  {
    id: "q3",
    rank: "E",
    title: "Companion for the Bard's Concert",
    desc: "One spare ticket to the Midnight Lanterns show. Seeking a fellow traveler who sings off-key with confidence.",
    type: "Social",
    stats: {
      CHA: 1,
    },
    scrip: 0,
    employer: "Rina K.",
    barter: true,
    barterFor: "The spare ticket itself + merch",
  },
  {
    id: "q4",
    rank: "E",
    title: "Riddle of the Flat-Pack",
    desc: "A wardrobe of foreign design, 214 parts, instructions in runes. Bring wit and an Allen key.",
    type: "Craft",
    stats: {
      DEX: 1,
    },
    scrip: 55,
    employer: "Dmitri P.",
    barter: false,
  },
  {
    id: "q5",
    rank: "E",
    title: "A Walk Among the Old Masters",
    desc: "Seeking pleasant company for a Sunday museum stroll and coffee after. Conversation is the true quest.",
    type: "Social",
    stats: {
      CHA: 1,
    },
    scrip: 0,
    employer: "Jae L.",
    barter: true,
    barterFor: "Coffee & pastries on them",
  },
  {
    id: "q6",
    rank: "D",
    title: "The Weeping Faucet",
    desc: "It drips a dirge at 3 a.m. Silence it, and earn the household's eternal gratitude (and scrip).",
    type: "Craft",
    stats: {
      DEX: 1,
      INT: 1,
    },
    scrip: 90,
    employer: "The Okafor House",
    barter: false,
  },
  {
    id: "q7",
    rank: "D",
    title: "Fence of the Setting Sun",
    desc: "Forty feet of fence, one shade of oxblood. Payment offered in the ancient art of sourdough.",
    type: "Labor",
    stats: {
      STR: 1,
      CON: 1,
    },
    scrip: 0,
    employer: "Baker Anders",
    barter: true,
    barterFor: "Three sourdough lessons + starter",
  },
  {
    id: "q8",
    rank: "C",
    title: "The Calculus Codex",
    desc: "A student stands before the final exam. Six sessions to teach the forbidden knowledge of derivatives.",
    type: "Scholarly",
    stats: {
      INT: 2,
    },
    scrip: 150,
    employer: "The Nguyen Family",
    barter: false,
  },
  {
    id: "q9",
    rank: "C",
    title: "Feast of the Thirtieth Year",
    desc: "Plan and run a surprise birthday feast for 25 souls. Secrecy, logistics, and cake diplomacy required.",
    type: "Social",
    stats: {
      CHA: 1,
      WIS: 1,
    },
    scrip: 180,
    employer: "Marta & Co.",
    barter: false,
  },
  {
    id: "q10",
    rank: "B",
    title: "March of the Granite Ridge",
    desc: "A two-day trek to the ridge shrine. Party strongly advised. The mountain does not negotiate.",
    type: "Adventure",
    stats: {
      CON: 1,
      STR: 1,
      WIS: 1,
    },
    scrip: 220,
    employer: "Guild Expeditions",
    barter: false,
    tavernOnly: true,
    partyAdvised: true,
  },
  {
    id: "q11",
    rank: "A",
    title: "The Bakery's Digital Sigil",
    desc: "Forge a website for Anders' bakery: menu, orders, and a map to the door. A commission of true craft.",
    type: "Scholarly",
    stats: {
      INT: 2,
      CHA: 1,
    },
    scrip: 400,
    employer: "Baker Anders",
    barter: false,
    tavernOnly: true,
  },
  {
    id: "q12",
    rank: "S",
    title: "The Harvest Festival Accord",
    desc: "Lead the organization of the city's Harvest Festival: vendors, stages, volunteers, chaos. Legends are made here.",
    type: "Grand",
    stats: {
      CHA: 1,
      WIS: 1,
      INT: 1,
      CON: 1,
    },
    scrip: 900,
    employer: "The Guild Council",
    barter: false,
    tavernOnly: true,
    partyAdvised: true,
  },
  {
    id: "q13",
    rank: "D",
    title: "Portrait for a Songbook",
    desc: "Paint the luthier's portrait in oils. In trade: six guitar lessons and a song written in your honor.",
    type: "Craft",
    stats: {
      DEX: 1,
      WIS: 1,
    },
    scrip: 0,
    employer: "Ines the Luthier",
    barter: true,
    barterFor: "Six guitar lessons + an original song",
  },
  {
    id: "q14",
    rank: "C",
    title: "The Garden Covenant",
    desc: "Tame a wild backyard into raised beds. In return: a season's share of the harvest, delivered weekly.",
    type: "Labor",
    stats: {
      STR: 1,
      CON: 1,
    },
    scrip: 0,
    employer: "The Herbalist Twins",
    barter: true,
    barterFor: "A season's vegetable share",
  },
  {
    id: "q15",
    rank: "F",
    title: "Buttons of the Widow",
    desc: "A winter coat, four missing buttons, and a tin of spares. Steady fingers earn a grateful smile.",
    type: "Craft",
    stats: {
      DEX: 1,
    },
    scrip: 30,
    employer: "Widow Hesse",
    barter: false,
  },
  {
    id: "q16",
    rank: "F",
    title: "The Unread Letters",
    desc: "Old Fenwick's inbox has 4,000 unread messages and one important form. Untangle it for him.",
    type: "Scholarly",
    stats: {
      INT: 1,
    },
    scrip: 35,
    employer: "Old Fenwick",
    barter: false,
  },
  {
    id: "q17",
    rank: "F",
    title: "Company at the Chess Tables",
    desc: "The park regulars need a fourth. Lose gracefully, laugh often, bring nothing but time.",
    type: "Social",
    stats: {
      CHA: 1,
    },
    scrip: 30,
    employer: "The Park Circle",
    barter: false,
  },
  {
    id: "q18",
    rank: "F",
    title: "The Dawn Delivery Round",
    desc: "Sixty doorsteps, one wagon of bread, and the city before it wakes. Endurance, not speed.",
    type: "Labor",
    stats: {
      CON: 1,
    },
    scrip: 40,
    employer: "Baker Anders",
    barter: false,
  },
  {
    id: "q19",
    rank: "F",
    title: "Which Road for Rosa",
    desc: "Rosa must run six errands in three hours across town. Chart her the wisest route.",
    type: "Search",
    stats: {
      WIS: 1,
    },
    scrip: 30,
    employer: "Rosa V.",
    barter: false,
  },
  {
    id: "q20",
    rank: "F",
    title: "Hauler of the Market Crates",
    desc: "Saturday market teardown. Crates to carts, carts to cellar. Strong backs welcome.",
    type: "Labor",
    stats: {
      STR: 1,
    },
    scrip: 45,
    employer: "Market Stewards",
    barter: false,
  },
  {
    id: "q21",
    rank: "E",
    title: "The Garden Stones",
    desc: "Twelve paving stones from driveway to garden path. They will not move themselves.",
    type: "Labor",
    stats: {
      STR: 1,
    },
    scrip: 50,
    employer: "The Iwu Family",
    barter: false,
  },
  {
    id: "q22",
    rank: "E",
    title: "Ledger of the Small Merchant",
    desc: "A shoebox of receipts and a tax deadline. Bring order to the chaos.",
    type: "Scholarly",
    stats: {
      INT: 1,
    },
    scrip: 60,
    employer: "Marisol's Corner Shop",
    barter: false,
  },
  {
    id: "q23",
    rank: "E",
    title: "Counsel at the Crossroads",
    desc: "A first-year student, five possible paths, one evening of honest talk over tea.",
    type: "Social",
    stats: {
      WIS: 1,
    },
    scrip: 45,
    employer: "The Okafor House",
    barter: false,
  },
  {
    id: "q24",
    rank: "E",
    title: "Festival Rigging at Dawn",
    desc: "Tents, tables, and bunting before the street fair opens. A long morning's work.",
    type: "Labor",
    stats: {
      CON: 1,
    },
    scrip: 55,
    employer: "Street Fair Committee",
    barter: false,
  },
  {
    id: "q25",
    rank: "E",
    title: "The Trembling Hinge",
    desc: "Three doors that squeak, one gate that sticks. A pouch of small repairs.",
    type: "Craft",
    stats: {
      DEX: 1,
    },
    scrip: 50,
    employer: "Widow Hesse",
    barter: false,
  },
  {
    id: "q26",
    rank: "D",
    title: "Host of the Game Night",
    desc: "Run the Tavern's newcomer game night: teach rules, mix strangers, leave them friends.",
    type: "Social",
    stats: {
      CHA: 1,
      WIS: 1,
    },
    scrip: 80,
    employer: "The Guild Council",
    barter: false,
  },
  {
    id: "q27",
    rank: "D",
    title: "The Broken Ledger",
    desc: "The co-op's books haven't balanced since spring. Find the error; restore the peace.",
    type: "Scholarly",
    stats: {
      INT: 2,
    },
    scrip: 95,
    employer: "Riverside Co-op",
    barter: false,
  },
  {
    id: "q28",
    rank: "D",
    title: "Shelves of the Archive",
    desc: "Build and mount six oak shelves in the neighborhood archive. Level, true, and load-bearing.",
    type: "Craft",
    stats: {
      STR: 1,
      DEX: 1,
    },
    scrip: 85,
    employer: "The Archivist",
    barter: false,
  },
  {
    id: "q29",
    rank: "D",
    title: "The Long Walk Program",
    desc: "Accompany elders on their weekly long walks for a month. Steady pace, good stories.",
    type: "Adventure",
    stats: {
      CON: 1,
      CHA: 1,
    },
    scrip: 75,
    employer: "Silver Steps Society",
    barter: false,
  },
  {
    id: "q30",
    rank: "C",
    title: "Restring the Luthier's Twelve",
    desc: "Twelve instruments await new strings and fine adjustment before the recital.",
    type: "Craft",
    stats: {
      DEX: 2,
    },
    scrip: 160,
    employer: "Ines the Luthier",
    barter: false,
  },
  {
    id: "q31",
    rank: "C",
    title: "Wardens of the Trail",
    desc: "Lead a volunteer cleanup along the ridge trail: eight miles, forty bags, one sunset.",
    type: "Adventure",
    stats: {
      CON: 1,
      WIS: 1,
    },
    scrip: 140,
    employer: "Guild Expeditions",
    barter: false,
  },
  {
    id: "q32",
    rank: "C",
    title: "Voice of the Block",
    desc: "Door-knock the whole block to gather signatures for the new crosswalk. Charm required.",
    type: "Social",
    stats: {
      CHA: 2,
    },
    scrip: 150,
    employer: "Neighbors of 5th",
    barter: false,
  },
  {
    id: "q33",
    rank: "B",
    title: "The Symposium of Small Wonders",
    desc: "Organize an evening of lightning talks at the Tavern: speakers, seats, and spirited debate.",
    type: "Grand",
    stats: {
      INT: 1,
      CHA: 1,
      WIS: 1,
    },
    scrip: 240,
    employer: "The Guild Council",
    barter: false,
    tavernOnly: true,
  },
  {
    id: "q34",
    rank: "B",
    title: "Raising of the Stage",
    desc: "Build the community stage for festival season: lumber, sweat, and three long days.",
    type: "Labor",
    stats: {
      STR: 2,
      CON: 1,
    },
    scrip: 260,
    employer: "Street Fair Committee",
    barter: false,
    tavernOnly: true,
    partyAdvised: true,
  },
  {
    id: "q35",
    rank: "A",
    title: "Envoy to the City Council",
    desc: "Represent the neighborhood's case for the river path at city hall. Prepare, persuade, prevail.",
    type: "Grand",
    stats: {
      CHA: 2,
      WIS: 1,
    },
    scrip: 380,
    employer: "Neighbors of 5th",
    barter: false,
    tavernOnly: true,
  },
  {
    id: "q36",
    rank: "A",
    title: "Restoration of the Mural",
    desc: "The old station mural is fading. Restore it panel by panel with the artist's blessing.",
    type: "Craft",
    stats: {
      DEX: 2,
      INT: 1,
    },
    scrip: 420,
    employer: "The Archivist",
    barter: false,
    tavernOnly: true,
  },
  {
    id: "q37",
    rank: "S",
    title: "The Great River Cleanup",
    desc: "Marshal a hundred volunteers, six barges, and one stubborn river. A deed sung for years.",
    type: "Grand",
    stats: {
      STR: 1,
      CON: 1,
      DEX: 1,
      WIS: 1,
    },
    scrip: 800,
    employer: "The Guild Council",
    barter: false,
    tavernOnly: true,
    partyAdvised: true,
  },
  {
    id: "q38",
    rank: "F",
    title: "Groceries for the Baker's Dozen",
    desc: "Carry Nana Ruth's groceries up the hill each Friday this month. She pays in legendary cookies.",
    type: "Labor",
    stats: {
      CON: 1,
    },
    scrip: 0,
    employer: "Nana Ruth",
    barter: true,
    barterFor: "A baker's dozen of cookies, weekly",
  },
  {
    id: "q39",
    rank: "B",
    title: "The Beekeeper's Bargain",
    desc: "Build and raise three new hives at the meadow's edge. The bees will repay you all year.",
    type: "Craft",
    stats: {
      STR: 1,
      DEX: 1,
      CON: 1,
    },
    scrip: 0,
    employer: "Keeper Sylvie",
    barter: true,
    barterFor: "A year of honey + beeswax candles",
    tavernOnly: true,
  },
  {
    id: "q40",
    rank: "A",
    title: "Atlas of the Old Quarter",
    desc: "Chart and illustrate a walking map of the old quarter's hidden courts. The carpenter offers a king's trade.",
    type: "Scholarly",
    stats: {
      INT: 2,
      WIS: 1,
    },
    scrip: 0,
    employer: "Halvard the Carpenter",
    barter: true,
    barterFor: "A handmade oak writing desk",
    tavernOnly: true,
  },
  {
    id: "q41",
    rank: "S",
    title: "The Wandering Chef's Accord",
    desc: "Plan and cook the hundred-plate charity feast beside the wandering chef. Feed the city; be fed for a year.",
    type: "Grand",
    stats: {
      CHA: 1,
      WIS: 1,
      CON: 1,
      INT: 1,
    },
    scrip: 0,
    employer: "Chef Amara",
    barter: true,
    barterFor: "Twelve private dinners, one per month",
    tavernOnly: true,
    partyAdvised: true,
  },
];

export const SEED_ROSTER = [
  {
    id: "a1",
    name: "Sera of the Ninth Bell",
    rank: "C",
    cls: "Tinker",
    note: "DEX/INT \u2014 fixes anything with hinges",
  },
  {
    id: "a2",
    name: "Brom Ironladle",
    rank: "B",
    cls: "Vanguard",
    note: "STR/CON \u2014 moves pianos for fun",
  },
  {
    id: "a3",
    name: "Lysa Quill",
    rank: "D",
    cls: "Loremaster",
    note: "INT/WIS \u2014 tutor, planner, list-maker",
  },
  {
    id: "a4",
    name: "Pip Merryweather",
    rank: "E",
    cls: "Envoy",
    note: "CHA \u2014 has never met a stranger",
  },
];

export const SEED_PETITIONERS = [
  {
    name: "Sera of the Ninth Bell",
    rank: "C",
    rating: 4.8,
    deeds: 34,
    note: "I have restrung, rebuilt, and rescued. References upon request.",
  },
  {
    name: "Brom Ironladle",
    rank: "B",
    rating: 4.9,
    deeds: 51,
    note: "If it is heavy, I am interested.",
  },
  {
    name: "Lysa Quill",
    rank: "D",
    rating: 4.6,
    deeds: 22,
    note: "Meticulous, punctual, fond of checklists.",
  },
  {
    name: "Pip Merryweather",
    rank: "E",
    rating: 4.4,
    deeds: 9,
    note: "New to the guild but eager. I bring snacks.",
  },
  {
    name: "Wren Thistledown",
    rank: "F",
    rating: 5,
    deeds: 3,
    note: "Three deeds, three perfect marks. Let me earn a fourth.",
  },
  {
    name: "Halvard the Carpenter",
    rank: "A",
    rating: 4.7,
    deeds: 68,
    note: "Forty years of honest work, now with more walking.",
  },
  {
    name: "The Herbalist Twins",
    rank: "C",
    rating: 4.5,
    deeds: 27,
    note: "Two sets of hands, one petition.",
  },
];

export const SEED_FORUM_POSTS = [
  {
    id: "f1",
    title: "Party LFG: Granite Ridge trek this weekend",
    author: "Brom Ironladle",
    replies: 12,
    tag: "Party Finder",
  },
  {
    id: "f2",
    title: "Barter board: I sew, you cook?",
    author: "Sera of the Ninth Bell",
    replies: 7,
    tag: "Barter",
  },
  {
    id: "f3",
    title: "Tavern trivia night \u2014 Thursdays, D-rank+",
    author: "Guild Council",
    replies: 31,
    tag: "Tavern",
  },
  {
    id: "f4",
    title: "Tips for your first rank trial (E)",
    author: "Lysa Quill",
    replies: 19,
    tag: "Guides",
  },
];

export const SEED_DM_THREADS = [
  {
    id: "m1",
    withWhom: "Baker Anders",
    msgs: [
      {
        me: false,
        t: "Saw you eyeing the fence quest. The sourdough lessons are real, friend.",
      },
    ],
  },
  {
    id: "m2",
    withWhom: "Guild Council",
    msgs: [
      {
        me: false,
        t: "Welcome to The Guild Masters. Complete your first quest to earn the Fledgling achievement.",
      },
    ],
  },
];

export const ACHIEVEMENTS = [
  {
    id: "first",
    name: "Fledgling",
    desc: "Complete your first quest",
    icon: "\u{1FAB6}",
  },
  {
    id: "trio",
    name: "Journeyfolk",
    desc: "Complete three quests",
    icon: "\u{1F97E}",
  },
  {
    id: "barter",
    name: "Fair Trader",
    desc: "Complete a barter quest",
    icon: "\u2696\uFE0F",
  },
  {
    id: "party",
    name: "Fellowship",
    desc: "Form or join a party",
    icon: "\u{1F91D}",
  },
  {
    id: "erank",
    name: "Past the Threshold",
    desc: "Reach Rank E \u2014 the Tavern doors open",
    icon: "\u{1F6AA}",
  },
  {
    id: "drank",
    name: "Member of the Hall",
    desc: "Reach Rank D \u2014 insurance & club access",
    icon: "\u{1F6E1}\uFE0F",
  },
  {
    id: "patron",
    name: "Patron of the Guild",
    desc: "See one of your own postings through to completion",
    icon: "\u{1F58B}\uFE0F",
  },
];

export const BUFFS = [
  {
    id: "b1",
    name: "Midsummer Ale",
    desc: "Seasonal: +10% scrip on Labor quests until the equinox",
    icon: "\u{1F37A}",
    redeem: "Active buff",
  },
  {
    id: "b2",
    name: "Five-Star Streak",
    desc: "Earn three 5\u2605 reviews \u2014 trade for a free stew at the Tavern",
    icon: "\u{1F31F}",
    redeem: "1 free stew",
  },
  {
    id: "b3",
    name: "Founders' Token",
    desc: "Early member promo \u2014 trade for a Guild Masters enamel pin",
    icon: "\u{1FA99}",
    redeem: "Enamel pin",
  },
];

export const INITIAL_PLAYER = {
  name: "",
  rank: "F",
  xp: 0,
  scrip: 25,
  stats: {
    STR: 5,
    DEX: 5,
    CON: 5,
    INT: 5,
    WIS: 5,
    CHA: 5,
  },
  saved: [],
  pending: [],
  active: [],
  completed: [],
  doneSinceRefresh: [],
  achievements: [],
  atTavern: false,
  party: null,
  ratingsGiven: {},
  avatar: null,
  myPostings: [],
  partyAssisted: {},
  notifications: [],
  disputes: [],
  profile: {
    email: "",
    phone: "",
    payout: "Guild scrip",
    taxId: "",
    city: "High Fantasy Chapter",
    notify: true,
    isSteward: false,
  },
};

// Stat rewards per completed quest, gated by rank band (see CLAUDE.md):
// F/E -> 1 stat/1 pt, D/C -> 2/2, B/A -> 3/3, S -> 4/4.
export const statRewardForRank = (rank) => {
  let rankIndex = RANKS.indexOf(rank);
  return rankIndex <= 1
    ? { cap: 1, pts: 1 }
    : rankIndex <= 3
      ? { cap: 2, pts: 2 }
      : rankIndex <= 5
        ? { cap: 3, pts: 3 }
        : { cap: 4, pts: 4 };
};

export const xpForLevel = (level) => 25 * (level - 1) * level;

export const levelFromXp = (xp) => {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
};
