import { describe, expect, it } from 'vitest';
import { resolveMenuImageUri } from '../lib/menu-image';

describe('resolveMenuImageUri', () => {
  it('preserves an absolute CDN photo URL', () => {
    const photoUrl = 'https://cdn.example.com/menu/amala.jpg';
    expect(resolveMenuImageUri(photoUrl)).toBe(photoUrl);
  });

  it('resolves a storage path against the API base URL', () => {
    expect(resolveMenuImageUri('/manus-storage/menu/amala.jpg', 'https://api.example.com')).toBe(
      'https://api.example.com/manus-storage/menu/amala.jpg',
    );
  });

  it('returns undefined when no photo has been assigned', () => {
    expect(resolveMenuImageUri()).toBeUndefined();
  });
});
