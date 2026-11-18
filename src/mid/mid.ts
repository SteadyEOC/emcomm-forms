// Message IDs. wl2k-go (MIT, github.com/la5nta/wl2k-go, fbb/mid.go and fbb/message.go) makes
// a MID as the first 12 characters of base32(md5("<time>-<callsign>")) and treats a MID as valid
// when it is 1 to 12 characters long. Only those two facts (length 12; length-only validity) are
// used here; no code is borrowed. We draw characters from an injected random source instead.

export const MID_LENGTH = 12;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const LIMIT = 252; // 36 * 7: bytes at or above this are rejected so every character is equally likely

/**
 * A 12-character message ID from A-Z0-9, drawn with `randomBytes` (for example a
 * wrapper around crypto.getRandomValues). Rejection sampling, so no modulo bias.
 */
export function generateMid(randomBytes: (n: number) => Uint8Array): string {
  if (typeof randomBytes !== 'function') throw new TypeError('generateMid: randomBytes must be a function');
  let out = '';
  for (let round = 0; out.length < MID_LENGTH; round++) {
    if (round > 1000) throw new RangeError('generateMid: randomBytes produced too few usable bytes');
    const want = (MID_LENGTH - out.length) * 2;
    const bytes = randomBytes(want);
    if (!(bytes instanceof Uint8Array) || bytes.length !== want) {
      throw new TypeError(`generateMid: randomBytes(${want}) must return a Uint8Array of that length`);
    }
    for (const b of bytes) {
      if (b < LIMIT && out.length < MID_LENGTH) out += ALPHABET[b % 36];
    }
  }
  return out;
}

/** True for a string of 1 to 12 characters, which is all wl2k-go checks. */
export function isValidMid(s: string): boolean {
  return typeof s === 'string' && s.length >= 1 && s.length <= MID_LENGTH;
}
