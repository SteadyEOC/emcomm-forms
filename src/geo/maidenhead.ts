/**
 * Maidenhead locator for a WGS84 position: field letters uppercase, subsquare
 * letters lowercase ("FN31pr"). 4, 6 or 8 characters. Latitude 90 and longitude 180
 * fall into the last square.
 */
export function maidenhead(lat: number, lon: number, chars: 4 | 6 | 8 = 6): string {
  if (typeof lat !== 'number' || typeof lon !== 'number') throw new TypeError('maidenhead: lat and lon must be numbers');
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new RangeError(`maidenhead: latitude ${lat} is outside -90..90`);
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new RangeError(`maidenhead: longitude ${lon} is outside -180..180`);
  if (chars !== 4 && chars !== 6 && chars !== 8) throw new RangeError('maidenhead: chars must be 4, 6 or 8');
  // Work in whole cells of the finest grid (1/120 degree of longitude, 1/240 of latitude)
  // so each digit is integer arithmetic. The tiny epsilon keeps a value sitting on a cell
  // edge from falling into the cell below through floating-point error.
  const EPS = 1e-7;
  const lonCell = Math.min(43199, Math.floor((lon + 180) * 120 + EPS));
  const latCell = Math.min(43199, Math.floor((lat + 90) * 240 + EPS));
  const A = 'ABCDEFGHIJKLMNOPQR';
  const a = 'abcdefghijklmnopqrstuvwx';
  let out = A[Math.floor(lonCell / 2400)]! + A[Math.floor(latCell / 2400)]!;
  const lonR = lonCell % 2400;
  const latR = latCell % 2400;
  out += String(Math.floor(lonR / 240)) + String(Math.floor(latR / 240));
  if (chars === 4) return out;
  const lonS = lonR % 240;
  const latS = latR % 240;
  out += a[Math.floor(lonS / 10)]! + a[Math.floor(latS / 10)]!;
  if (chars === 6) return out;
  return out + String(lonS % 10) + String(latS % 10);
}
