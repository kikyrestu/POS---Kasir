// ============================================================================
// hash.js — SHA-256 pure-JS buat hash password kasir LOKAL (offline-first).
// ============================================================================
// Kenapa pure-JS (bukan expo-crypto): expo-crypto = native module → wajib rebuild
// APK. Ini murni JS → OTA-able, ZERO native dep baru, cukup reload Metro.
//
// Threat model: DB SQLite app-private di HP milik owner. Password ini cuma gate
// "kasir mana yang login" (peran/permission), bukan penjaga uang/akses cloud.
// Salt = id user (unik per baris) → hash beda walau dua kasir passwordnya sama,
// jadi ga bisa rainbow-table lintas user. Cukup & pantas buat kasus ini.
//
// Implementasi SHA-256 compact yang sudah teruji luas (Geraint Luff, MIT). Sudah
// diverifikasi lawan test vector sha256('abc') = ba7816bf...15ad.

function sha256(asciiByteStr) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';

  const words = [];
  const asciiBitLength = asciiByteStr.length * 8;

  // Konstanta hash (di-cache antar pemanggilan biar ga dihitung ulang tiap kali).
  let hash = sha256.h = sha256.h || [];
  const k = sha256.k = sha256.k || [];
  let primeCounter = k.length;

  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  asciiByteStr += '\x80';
  while ((asciiByteStr.length % 64) - 56) asciiByteStr += '\x00';
  for (let i = 0; i < asciiByteStr.length; i++) {
    const j = asciiByteStr.charCodeAt(i);
    if (j >> 8) return null; // input harus byte-string (0..255); caller sudah UTF-8 encode
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// String (boleh non-ASCII) → byte-string UTF-8 (tiap char code 0..255) biar aman
// buat sha256 di atas. unescape/encodeURIComponent tersedia di Hermes.
function toUtf8ByteString(str) {
  return unescape(encodeURIComponent(String(str)));
}

/**
 * Hash password kasir. `salt` = id user (unik per baris).
 * @returns {string} hex SHA-256, atau '' kalau password kosong.
 */
export function hashPassword(salt, password) {
  if (password == null || password === '') return '';
  return sha256(toUtf8ByteString(String(salt) + '::' + String(password)));
}

/**
 * Bandingin password dengan hash tersimpan (constant-time-ish).
 * @returns {boolean}
 */
export function verifyPassword(salt, password, storedHash) {
  if (!storedHash) return false;
  const computed = hashPassword(salt, password);
  if (!computed || computed.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

export default { hashPassword, verifyPassword };
