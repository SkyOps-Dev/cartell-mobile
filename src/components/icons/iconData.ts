// Glyphs used by the app, keyed like the Flutter source so call sites read the same.
// Codepoints and fonts are taken from font_awesome_flutter 10.10.0 (Font Awesome 7 Free) and
// the Flutter 3.41.9 MaterialIcons font. Add icons here as screens need them.

export type IconData = {
  codePoint: number;
  fontFamily: string;
  /** The glyph's advance width in ems, read from the font file, when it is not 1. */
  advance?: number;
};

// Font files in assets/fonts are named after their PostScript names, so these work on both
// platforms (spec 01 §4).
const FA_SOLID = 'FontAwesome7Free-Solid';
const FA_REGULAR = 'FontAwesome7Free-Regular';
const FA_BRANDS = 'FontAwesome7Brands-Regular';
const MATERIAL = 'MaterialIcons-Regular';

/** FontAwesomeIcons.x (IconDataSolid / IconDataRegular / IconDataBrands, as each is declared). */
export const FontAwesomeIcons = {
  amazon: { codePoint: 0xf270, fontFamily: FA_BRANDS, advance: 0.875 },
  arrowLeftLong: { codePoint: 0xf177, fontFamily: FA_SOLID, advance: 1.125 },
  arrowRightFromBracket: { codePoint: 0xf08b, fontFamily: FA_SOLID },
  arrowRightToBracket: { codePoint: 0xf090, fontFamily: FA_SOLID },
  check: { codePoint: 0xf00c, fontFamily: FA_SOLID, advance: 0.875 },
  circleCheck: { codePoint: 0xf058, fontFamily: FA_REGULAR },
  circleExclamation: { codePoint: 0xf06a, fontFamily: FA_SOLID },
  circlePlus: { codePoint: 0xf055, fontFamily: FA_SOLID },
  circleQuestion: { codePoint: 0xf059, fontFamily: FA_REGULAR },
  clipboardList: { codePoint: 0xf46d, fontFamily: FA_SOLID, advance: 0.75 },
  clockRotateLeft: {
    codePoint: 0xf1da,
    fontFamily: FA_SOLID,
    advance: 1.125,
  },
  ellipsisVertical: {
    codePoint: 0xf142,
    fontFamily: FA_SOLID,
    advance: 0.25,
  },
  envelope: { codePoint: 0xf0e0, fontFamily: FA_REGULAR },
  eye: { codePoint: 0xf06e, fontFamily: FA_REGULAR, advance: 1.125 },
  eyeSlash: { codePoint: 0xf070, fontFamily: FA_REGULAR, advance: 1.125 },
  fingerprint: { codePoint: 0xf577, fontFamily: FA_SOLID },
  headset: { codePoint: 0xf590, fontFamily: FA_SOLID, advance: 0.875 },
  lock: { codePoint: 0xf023, fontFamily: FA_SOLID, advance: 0.75 },
  phone: { codePoint: 0xf095, fontFamily: FA_SOLID },
  plus: { codePoint: 0x2b, fontFamily: FA_SOLID, advance: 0.875 },
  satelliteDish: { codePoint: 0xf7c0, fontFamily: FA_SOLID },
  triangleExclamation: { codePoint: 0xf071, fontFamily: FA_SOLID },
  user: { codePoint: 0xf007, fontFamily: FA_REGULAR, advance: 0.875 },
  userGear: { codePoint: 0xf4fe, fontFamily: FA_SOLID, advance: 1.25 },
  userXmark: { codePoint: 0xf235, fontFamily: FA_SOLID, advance: 1.25 },
  wifi: { codePoint: 0xf1eb, fontFamily: FA_SOLID, advance: 1.125 },
  wrench: { codePoint: 0xf0ad, fontFamily: FA_SOLID, advance: 1.125 },
  xmark: { codePoint: 0xf00d, fontFamily: FA_SOLID, advance: 0.75 },
} satisfies Record<string, IconData>;

/** Icons.x (Material Icons). */
export const Icons = {
  check_circle: { codePoint: 0xe159, fontFamily: MATERIAL },
  close: { codePoint: 0xe16a, fontFamily: MATERIAL },
  email_outlined: { codePoint: 0xf018, fontFamily: MATERIAL },
  error_outline: { codePoint: 0xe238, fontFamily: MATERIAL },
  lock_outline: { codePoint: 0xe3b1, fontFamily: MATERIAL },
  menu: { codePoint: 0xe3dc, fontFamily: MATERIAL },
  person_outline: { codePoint: 0xe497, fontFamily: MATERIAL },
  phone_outlined: { codePoint: 0xf290, fontFamily: MATERIAL },
  radio_button_checked: { codePoint: 0xe503, fontFamily: MATERIAL },
  radio_button_off: { codePoint: 0xe504, fontFamily: MATERIAL },
} satisfies Record<string, IconData>;
