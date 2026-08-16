// Bad words filter containing strictly the requested list of words
const BAD_WORDS = [
  'anjir',
  'njir',
  'bjir',
  'anjay',
  'ajg',
  'goblok',
  'tolol',
  'bego',
  'bacot',
  'kampret',
  'bangsat',
  'brengsek',
  'sialan',
  'tai',
  'kontol',
  'memeg',
  'memek',
  'nyoli',
  'ewe',
  'ewean',
  'rodok',
  'coli',
  'coly'
];

/**
 * Checks if the text contains any bad words.
 * Returns true if bad word is found, false otherwise.
 */
export function hasBadWords(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  
  return BAD_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b|${word}`, 'i');
    return regex.test(lower);
  });
}

export const PROFANITY_WARNING = "maaf bahasa yang anda ketik mengandung bahasa kasar";
