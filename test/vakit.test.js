import test from 'node:test';
import assert from 'node:assert/strict';
import { vakitHesapla } from '../src/lib/vakitHesap.js';

const dk = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
// Diyanet, Mersin merkez, 20 Kasım 2026: 05:54 07:17 12:32 15:14 17:37 18:55
test('Diyanet yöntemi hesabı Diyanet takvimine en fazla 1 dk uzak', () => {
  const h = vakitHesapla('2026-11-20', 36.81, 34.64);
  const d = { imsak: '05:54', gunes: '07:17', ogle: '12:32', ikindi: '15:14', aksam: '17:37', yatsi: '18:55' };
  for (const k of Object.keys(d)) assert.ok(Math.abs(dk(h[k]) - dk(d[k])) <= 1, `${k}: ${h[k]} / ${d[k]}`);
});
