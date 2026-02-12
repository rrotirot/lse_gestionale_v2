// lib/parseMembers.ts
const csv = require('csv-parser');
const fs = require('fs');


// Parse .txt file (custom format)
const parseTxtFile = (s) => {
    const allLines = fileContent.split('\n').map(line => line.trim());
    let lines = [];
    const startIndex = allLines.findIndex(line => line.toLowerCase().includes('elenco membri con tag [lse-p]'));
    if (startIndex !== -1) {
        lines = allLines.slice(startIndex + 1).filter(line => line.length > 0 && !line.toLowerCase().includes('fine elenco'));
    } else {
        // Fallback: assume all non-empty lines are data rows
        lines = allLines.filter(line => line.length > 0);
    }

    return lines.map((line) => {
        const columns = line.split(' | ').map(col => col.trim());
        if (columns.length >= 3) {
            const memberInfo = columns[1];
            const match = memberInfo.match(/\[LSE-P\]\s+(.+?)\s+\((\d+)\)/);
            if (match) {
                return {
                    key: parseInt(columns[0]),
                    index: columns[0],
                    tag: 'LSE-P',
                    name: match[1],
                    id: match[2],
                    date: columns[2],
                    idoneita: false,
                    watchdog: false,
                    promoted: false,
                    affiliazioniOrg: '',
                    orgValidation: null,
                    note: ''
                };
            }
        }
        return null;
    }).filter(item => item !== null);
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
        return Promise.resolve(parseTxtFile(fileContent));
    } else {
        throw new Error('Unsupported file type');
    }
};

module.exports = { parseMemberDataFromFile, parseTxtFile, parseCsvFile };