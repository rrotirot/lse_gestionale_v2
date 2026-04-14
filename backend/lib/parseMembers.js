const csv = require('csv-parser');
const fs = require('fs');
const { Readable } = require('stream');

// Parse .txt file (custom format)
// Supports rows like:
// 001 | [LSE-P] Name (380126931133267978) | 2021-02-26 18:03
const parseTxtFile = (fileContent) => {
    const allLines = (fileContent || '').split('\n').map(line => line.trim()).filter(Boolean);
    let lines = [];
    const startIndex = allLines.findIndex(line => line.toLowerCase().includes('elenco membri con tag [lse-p]'));
    if (startIndex !== -1) {
        lines = allLines.slice(startIndex + 1).filter(line => line.length > 0 && !line.toLowerCase().includes('fine elenco'));
    } else {
        // Fallback: assume all non-empty lines are data rows
        lines = allLines.filter(line => line.length > 0);
    }

    return lines
        .map((rawLine) => {
            const line = String(rawLine).replace(/^"+|"+$/g, '').trim(); // strip accidental quotes
            const columns = line.split('|').map(col => col.trim()).filter(Boolean);
            if (columns.length < 3) return null;

            const indexStr = columns[0];
            const key = parseInt(indexStr, 10);
            if (!Number.isFinite(key)) return null;

            const memberInfo = columns[1];
            const match = memberInfo.match(/^\[([A-Z-]+)\]\s+(.+?)\s+\((\d+)\)\s*$/);
            if (!match) return null;

            const tag = match[1];
            const name = match[2];
            const id = match[3];

            const date = columns.slice(2).join(' | ');

            return {
                key,
                index: indexStr,
                tag,
                name,
                id,
                date,
                idoneita: false,
                watchdog: false,
                promoted: false,
                affiliazioniOrg: '',
                orgValidation: null,
                note: ''
            };
        })
        .filter(Boolean);
};

// Parse .csv file
const parseCsvFile = (fileContent) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const stream = Readable.from(fileContent);
        stream.pipe(csv({
                headers: ['Tipo', 'Categoria', 'Indice', 'Nome Visualizzato', 'ID', 'Data Entrata'],
                skipEmptyLines: true
            }))
            .on('data', (data) => {
                // Validate required fields
                if (!data.Indice || !data['Nome Visualizzato'] || !data.ID || !data['Data Entrata']) {
                    return; // Skip invalid rows
                }
                // Extract name: remove [LSE-P] prefix
                const name = data['Nome Visualizzato'].replace(/^\[LSE-P\]\s+/, '');
                // Map Categoria to tag (assume P-LSE -> LSE-P)
                const tag = data.Categoria === 'P-LSE' ? 'LSE-P' : data.Categoria;
                results.push({
                    key: parseInt(data.Indice),
                    index: data.Indice,
                    tag: tag,
                    name: name,
                    id: data.ID,
                    date: data['Data Entrata'],
                    idoneita: false,
                    watchdog: false,
                    promoted: false,
                    affiliazioniOrg: '',
                    orgValidation: null,
                    note: ''
                });
            })
            .on('end', () => {
                resolve(results);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
};

// Main parse function based on file type
const parseMemberDataFromFile = async (fileContent, fileType) => {
    console.log(fileType);
    if (fileType === '.csv') {
        return await parseCsvFile(fileContent);
    } else if (fileType === '.txt') {
        return parseTxtFile(fileContent);
    } else {
        throw new Error('Unsupported file type');
    }
};

module.exports = { parseMemberDataFromFile, parseTxtFile, parseCsvFile };