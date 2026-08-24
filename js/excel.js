// ============================================================
// excel.js — loads and validates the Excel datasets.
// Section 4: all file paths are centralized in DATA_PATHS below,
// the single place to change if filenames/locations change.
// Sections 7-12: validation rules for question datasets.
// Section 7.1: validation rules for the affirmations dataset.
// ============================================================

import { safeTrim, isPositiveInteger, normalizeBoolAnswer, log } from './utils.js';

// --- Section 4: centralized data paths -----------------------------------
export const DATA_PATHS = {
  kumite: 'data/qkumite.xlsx',
  kata: 'data/qkata.xlsx',
  affirmations: 'data/mini-affirmations.xlsx',
};

/**
 * @typedef {Object} LoadResult
 * @property {boolean} ok
 * @property {Array<{number:number, question:string, answer:'TRUE'|'FALSE'}>} [questions]
 * @property {Array<{number:number, text:string}>} [texts]
 * @property {string} [errorMessage] user-facing, plain-language error
 * @property {string} [errorCode] machine-readable reason, for logging/tests
 */

/**
 * Fetches an xlsx file as an ArrayBuffer and parses the first sheet
 * with SheetJS. Never throws — always resolves to either raw rows
 * or a structured error.
 */
async function fetchAndParseWorkbook(path) {
  let response;
  try {
    response = await fetch(path);
  } catch (err) {
    // Typically a network/CORS failure when not served over http(s).
    log.error(`Failed to fetch ${path}`, err);
    return {
      ok: false,
      errorCode: 'FETCH_FAILED',
      errorMessage:
        'Δεν ήταν δυνατή η φόρτωση του αρχείου δεδομένων. Βεβαιωθείτε ότι η εφαρμογή εκτελείται μέσω web server (όχι με διπλό κλικ στο αρχείο) και ότι υπάρχει σύνδεση στο αρχείο.',
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      errorCode: 'HTTP_ERROR',
      errorMessage: `Το αρχείο "${path}" δεν βρέθηκε (κωδικός ${response.status}).`,
    };
  }

  let buffer;
  try {
    buffer = await response.arrayBuffer();
  } catch (err) {
    return {
      ok: false,
      errorCode: 'READ_FAILED',
      errorMessage: 'Το αρχείο δεν ήταν δυνατό να διαβαστεί.',
    };
  }

  if (!buffer || buffer.byteLength === 0) {
    return {
      ok: false,
      errorCode: 'EMPTY_FILE',
      errorMessage: 'Το αρχείο δεδομένων είναι κενό.',
    };
  }

  if (typeof window.XLSX === 'undefined') {
    return {
      ok: false,
      errorCode: 'LIBRARY_MISSING',
      errorMessage:
        'Η βιβλιοθήκη ανάγνωσης Excel δεν φορτώθηκε. Ελέγξτε ότι το αρχείο vendor/xlsx.full.min.js υπάρχει.',
    };
  }

  let workbook;
  try {
    // codepage/UTF-8 handling is automatic in SheetJS for xlsx (zip/XML
    // based), so Greek characters are preserved without extra config.
    workbook = window.XLSX.read(buffer, { type: 'array' });
  } catch (err) {
    log.error(`Failed to parse workbook ${path}`, err);
    return {
      ok: false,
      errorCode: 'CORRUPT_FILE',
      errorMessage: 'Το αρχείο Excel είναι κατεστραμμένο ή μη αναγνώσιμο.',
    };
  }

  const sheetName = workbook.SheetNames && workbook.SheetNames[0];
  if (!sheetName) {
    return {
      ok: false,
      errorCode: 'NO_SHEET',
      errorMessage: 'Το αρχείο Excel δεν περιέχει φύλλο εργασίας.',
    };
  }

  const sheet = workbook.Sheets[sheetName];
  // header:1 => array-of-arrays, raw:false => formatted strings (keeps
  // TRUE/FALSE and Greek text as-typed rather than coerced types).
  const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

  return { ok: true, rows };
}

/**
 * Validates and normalizes rows for a TRUE/FALSE question dataset
 * per sections 7-12. Returns a LoadResult.
 */
function validateQuestionRows(rows) {
  if (!Array.isArray(rows) || rows.length <= 1) {
    return {
      ok: false,
      errorCode: 'EMPTY_DATASET',
      errorMessage: 'Το αρχείο δεν περιέχει ερωτήσεις (μόνο header ή είναι κενό).',
    };
  }

  // Row 0 is the header row (section 7) and is always skipped.
  const dataRows = rows.slice(1);

  const candidates = [];
  for (const row of dataRows) {
    const rawNumber = row?.[0];
    const rawQuestion = row?.[1];
    const rawAnswer = row?.[2];

    // A fully blank row is ignored outright (section 10).
    const isBlankRow =
      safeTrim(rawNumber) === '' && safeTrim(rawQuestion) === '' && safeTrim(rawAnswer) === '';
    if (isBlankRow) continue;

    const number = Number(safeTrim(rawNumber));
    const question = safeTrim(rawQuestion);
    const answer = normalizeBoolAnswer(rawAnswer);

    const validNumber = isPositiveInteger(number);
    const validQuestion = question.length > 0;
    const validAnswer = answer !== null;

    // Any invalid field => this record is dropped entirely (section 10/11).
    if (!validNumber || !validQuestion || !validAnswer) continue;

    candidates.push({ number, question, answer });
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      errorCode: 'NO_VALID_ROWS',
      errorMessage: 'Δεν βρέθηκε καμία έγκυρη ερώτηση στο αρχείο.',
    };
  }

  // Re-validate numbering AFTER filtering (section 10): remaining
  // numbers must be exactly 1..N with no gaps/duplicates, in any
  // original order — we sort first, then check strict sequence.
  const sorted = candidates.slice().sort((a, b) => a.number - b.number);
  const seen = new Set();
  for (const c of sorted) {
    if (seen.has(c.number)) {
      return {
        ok: false,
        errorCode: 'DUPLICATE_NUMBER',
        errorMessage: `Ο αριθμός ερώτησης ${c.number} εμφανίζεται περισσότερες από μία φορά.`,
      };
    }
    seen.add(c.number);
  }
  for (let i = 0; i < sorted.length; i++) {
    const expected = i + 1;
    if (sorted[i].number !== expected) {
      return {
        ok: false,
        errorCode: 'NON_SEQUENTIAL',
        errorMessage:
          'Η αρίθμηση των ερωτήσεων δεν σχηματίζει ακριβώς τη σειρά 1...N (υπάρχουν κενά ή λάθος σειρά).',
      };
    }
  }

  return { ok: true, questions: sorted };
}

/**
 * Validates and normalizes rows for the affirmations dataset
 * per section 7.1. Much simpler: just number + non-empty text.
 */
function validateAffirmationRows(rows) {
  if (!Array.isArray(rows) || rows.length <= 1) {
    return {
      ok: false,
      errorCode: 'EMPTY_DATASET',
      errorMessage: 'Το αρχείο μηνυμάτων δεν περιέχει κείμενα.',
    };
  }

  const dataRows = rows.slice(1);
  const texts = [];
  for (const row of dataRows) {
    const rawNumber = row?.[0];
    const rawText = row?.[1];
    const isBlankRow = safeTrim(rawNumber) === '' && safeTrim(rawText) === '';
    if (isBlankRow) continue;

    const number = Number(safeTrim(rawNumber));
    const text = safeTrim(rawText);
    if (!isPositiveInteger(number) || text.length === 0) continue;

    texts.push({ number, text });
  }

  if (texts.length === 0) {
    return {
      ok: false,
      errorCode: 'NO_VALID_ROWS',
      errorMessage: 'Δεν βρέθηκε κανένα έγκυρο μήνυμα στο αρχείο.',
    };
  }

  return { ok: true, texts };
}

/** Loads and validates the KUMITE or KATA question dataset. */
export async function loadQuestionDataset(path) {
  const fetched = await fetchAndParseWorkbook(path);
  if (!fetched.ok) return fetched;
  return validateQuestionRows(fetched.rows);
}

/** Loads and validates the mini-affirmations dataset. */
export async function loadAffirmationsDataset(path) {
  const fetched = await fetchAndParseWorkbook(path);
  if (!fetched.ok) return fetched;
  return validateAffirmationRows(fetched.rows);
}
