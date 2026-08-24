/**
 * Excel Loading and Validation
 * Handles loading of Excel files and data validation
 */

export class ExcelLoader {
    constructor() {
        // Χρησιμοποιούμε σχετικές διαδρομές που δουλεύουν παντού
        this.filePaths = {
            kumite: 'data/qkumite.xlsx',
            kata: 'data/qkata.xlsx',
            affirmations: 'data/mini-affirmations.xlsx'
        };
    }

    async loadKumite() {
        return this.loadExcel(this.filePaths.kumite, 'kumite');
    }

    async loadKata() {
        return this.loadExcel(this.filePaths.kata, 'kata');
    }

    async loadAffirmations() {
        return this.loadExcel(this.filePaths.affirmations, 'affirmations');
    }

    async loadExcel(path, type) {
        try {
            console.log(`Loading ${type} from: ${path}`);
            
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load ${type} Excel file: ${response.status} - ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('Excel file is empty or invalid');
            }
            
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
            
            if (!data || data.length === 0) {
                throw new Error('Excel file contains no data');
            }
            
            if (type === 'affirmations') {
                const result = this.parseAffirmations(data);
                console.log(`Loaded ${result.length} affirmations`);
                return result;
            }
            
            const result = this.parseQuestions(data);
            console.log(`Loaded ${result.length} questions for ${type}`);
            return result;
            
        } catch (error) {
            console.error(`Error loading ${type} from ${path}:`, error);
            throw error;
        }
    }

    parseQuestions(data) {
        const questions = [];
        
        for (const row of data) {
            // Extract columns A, B, C
            const number = row['A'] !== undefined ? row['A'] : row['Number'];
            const text = row['B'] !== undefined ? row['B'] : row['Question'];
            const answer = row['C'] !== undefined ? row['C'] : row['Answer'];
            
            // Skip header row if detected
            if (typeof number === 'string' && 
                (number.toLowerCase() === 'number' || number.toLowerCase() === 'a')) {
                continue;
            }
            
            // Validate number
            const num = parseInt(number);
            if (isNaN(num) || num < 1) continue;
            
            // Validate text
            const questionText = String(text).trim();
            if (!questionText || questionText === '') continue;
            
            // Validate answer
            const normalizedAnswer = this.normalizeAnswer(answer);
            if (normalizedAnswer === null) continue;
            
            questions.push({
                number: num,
                text: questionText,
                answer: normalizedAnswer,
                originalRow: row
            });
        }
        
        // Sort by number
        questions.sort((a, b) => a.number - b.number);
        
        return questions;
    }

    parseAffirmations(data) {
        const affirmations = [];
        
        for (const row of data) {
            const number = row['A'] !== undefined ? row['A'] : row['Number'];
            const text = row['B'] !== undefined ? row['B'] : row['Text'];
            
            // Skip header
            if (typeof number === 'string' && 
                (number.toLowerCase() === 'number' || number.toLowerCase() === 'a')) {
                continue;
            }
            
            const num = parseInt(number);
            if (isNaN(num) || num < 1) continue;
            
            const affirmationText = String(text).trim();
            if (!affirmationText || affirmationText === '') continue;
            
            affirmations.push({
                number: num,
                text: affirmationText
            });
        }
        
        return affirmations;
    }

    normalizeAnswer(value) {
        if (value === undefined || value === null) return null;
        
        const str = String(value).trim().toUpperCase();
        
        // Check for TRUE variants
        if (str === 'TRUE' || str === 'T' || str === '1' || str === 'ΑΛΗΘΗΣ' || str === 'ΣΩΣΤΟ') {
            return true;
        }
        
        // Check for FALSE variants
        if (str === 'FALSE' || str === 'F' || str === '0' || str === 'ΨΕΥΔΗΣ' || str === 'ΛΑΘΟΣ') {
            return false;
        }
        
        return null;
    }

    validateDataset(questions) {
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return { valid: false, error: 'Empty dataset' };
        }
        
        // Check for valid numbering: 1...N, no gaps, no duplicates
        const numbers = questions.map(q => q.number).sort((a, b) => a - b);
        
        // Check duplicates
        const uniqueNumbers = new Set(numbers);
        if (uniqueNumbers.size !== numbers.length) {
            return { valid: false, error: 'Duplicate question numbers found' };
        }
        
        // Check sequence: 1...N
        for (let i = 0; i < numbers.length; i++) {
            if (numbers[i] !== i + 1) {
                return { valid: false, error: `Invalid number sequence: expected ${i + 1}, got ${numbers[i]}` };
            }
        }
        
        // Check all questions have valid data
        for (const q of questions) {
            if (!q.text || q.text.trim() === '') {
                return { valid: false, error: 'Empty question text found' };
            }
            if (q.answer === null || q.answer === undefined) {
                return { valid: false, error: 'Invalid answer found' };
            }
        }
        
        return { valid: true, count: questions.length };
    }

    setFilePath(type, path) {
        if (this.filePaths.hasOwnProperty(type)) {
            this.filePaths[type] = path;
        }
    }
}