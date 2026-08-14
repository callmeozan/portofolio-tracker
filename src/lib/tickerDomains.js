// Mapping kode saham -> domain resmi perusahaan, dipakai buat narik favicon
// otomatis (lewat Google favicon service, gratis & gak perlu API key).
// Kalau kode saham gak ada di sini (belum diriset / gak ketemu domain
// yang meyakinkan), otomatis fallback ke avatar inisial -- BUKAN nebak
// logo, biar gak salah nampilin brand orang lain.
//
// Nambah saham baru? Tambahin baris baru di sini kalau mau logo aslinya
// muncul. Kalau gak ditambahin, tetep aman (fallback avatar).
export const TICKER_DOMAINS = {
  ACES: 'acehardware.co.id',
  ASSA: 'assa.id',
  DKFT: 'centralomega.com',
  MIDI: 'alfamidiku.com',
  PZZA: 'pizzahut.co.id',
}
