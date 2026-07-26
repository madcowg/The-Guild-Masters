// Static, curated fantasy nickname generator -- no LLM call, no network
// request, matches the flavor of existing SEED_ROSTER names like "Sera of
// the Ninth Bell" and "Brom Ironladle".
const FIRST_NAMES = [
  "Wren", "Brom", "Sera", "Lysa", "Pip", "Halvard", "Fenwick", "Odalys",
  "Tam", "Rook", "Marigold", "Cobb", "Elowen", "Gideon", "Nadia",
  "Percival", "Sable", "Thorne", "Ysolde", "Bram", "Junip", "Osric",
  "Wilhelmina", "Cass", "Alder",
];

const COMPOUND_SURNAMES = [
  "Ironladle", "Thistledown", "Merryweather", "Ashcombe", "Nightbrew",
  "Stonewhistle", "Larkspur", "Hollowmere", "Fernwake", "Coalfoot",
  "Brightkettle", "Mossgleam", "Ravensworth", "Duskwater", "Copperquill",
];

const LOCATION_PHRASES = [
  "of the Ninth Bell", "of the North Market", "of the Amber Hollow",
  "of the Last Lantern", "of Miller's Row", "of the Salt Road",
  "of the Weeping Willow", "of the Cobbler's Row", "of the Tanner's Guild",
  "of the Wayfarer's Rest",
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function generateNickname() {
  let first = pick(FIRST_NAMES),
    tail = Math.random() < 0.5 ? pick(COMPOUND_SURNAMES) : pick(LOCATION_PHRASES);
  return `${first} ${tail}`;
}
