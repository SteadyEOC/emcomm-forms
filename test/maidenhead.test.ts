import { describe, expect, it } from 'vitest';
import { maidenhead } from '../src/index.js';

// Hand computation (second method), with a = 0 ... x = 23, A = 0 ... R = 17.
//
// W1AW 41.714775, -72.727260:
//   lon + 180 = 107.27274; /20 = 5.36 -> field F; 107.27274 - 100 = 7.27274; /2 -> square 3;
//   7.27274 - 6 = 1.27274 deg; x 12 (5 arc-min units) = 15.27288 -> subsquare p (15); frac .27288 x 10 -> ext 2.
//   lat + 90 = 131.714775; /10 = 13.17 -> field N (13); 1.714775 -> square 1; .714775 deg x 24 = 17.1546
//   -> subsquare r (17); frac .1546 x 10 -> ext 1.                          => FN31pr, 8 chars FN31pr21
// Munich 48.14666, 11.60833:
//   lon: 191.60833; /20 = 9.58 -> J; 11.60833 -> 5 (10..12); 1.60833 x 12 = 19.30 -> t (19)
//   lat: 138.14666; 13 -> N; 8.14666 -> 8; .14666 x 24 = 3.52 -> d (3)       => JN58td
// Origin (0, 0): lon 180 -> 180/20 = 9 -> J, rem 0 -> 0, 0 -> a; same for lat 90 -> J    => JJ00aa
// South-west corner (-90, -180) => AA00aa. North-east corner (90, 180) clamps into RR99xx.
describe('maidenhead', () => {
  it('W1AW is FN31pr', () => {
    expect(maidenhead(41.714775, -72.72726)).toBe('FN31pr');
  });
  it('Munich is JN58td', () => {
    expect(maidenhead(48.14666, 11.60833)).toBe('JN58td');
  });
  it('supports 4 and 8 characters', () => {
    expect(maidenhead(41.714775, -72.72726, 4)).toBe('FN31');
    expect(maidenhead(41.714775, -72.72726, 8)).toBe('FN31pr21');
    expect(maidenhead(48.14666, 11.60833, 4)).toBe('JN58');
  });
  it('handles the origin and the corners', () => {
    expect(maidenhead(0, 0)).toBe('JJ00aa');
    expect(maidenhead(-90, -180)).toBe('AA00aa');
    expect(maidenhead(90, 180)).toBe('RR99xx');
    expect(maidenhead(90, 180, 8)).toBe('RR99xx99');
    expect(maidenhead(90, 180, 4)).toBe('RR99');
    expect(maidenhead(-90, 180)).toBe('RA90xa');
  });
  it('puts square edges in the upper square', () => {
    expect(maidenhead(1, 2)).toBe('JJ11aa');
    expect(maidenhead(10, 20, 4)).toBe('KK00');
    expect(maidenhead(0.999999, 1.999999, 4)).toBe('JJ00');
  });
  it('throws out of range, on NaN, and on bad chars', () => {
    expect(() => maidenhead(90.1, 0)).toThrow(RangeError);
    expect(() => maidenhead(-90.1, 0)).toThrow(RangeError);
    expect(() => maidenhead(0, 180.1)).toThrow(RangeError);
    expect(() => maidenhead(0, -180.1)).toThrow(RangeError);
    expect(() => maidenhead(NaN, 0)).toThrow(RangeError);
    expect(() => maidenhead(0, Infinity)).toThrow(RangeError);
    expect(() => maidenhead(0, 0, 5 as 4)).toThrow(RangeError);
    expect(() => maidenhead('1' as unknown as number, 0)).toThrow(TypeError);
  });
});
