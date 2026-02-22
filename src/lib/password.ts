import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  const normalized = password.trim();
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(normalized, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const normalized = password.trim();

  if (!storedHash.startsWith('scrypt$')) {
    return normalized === storedHash;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 3) {
    return false;
  }

  const [, salt, expectedHex] = parts;
  const expected = Buffer.from(expectedHex, 'hex');
  const derived = (await scrypt(normalized, salt, expected.length)) as Buffer;

  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}
