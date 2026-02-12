const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const Member = require('../models/Member');
const DeletedMember = require('../models/DeletedMember');
const { parseMemberDataFromFile } = require('../lib/parseMembers');

// Configurazione multer per upload file
const upload = multer({ dest: 'uploads/' });

// Endpoint per importare membri da file
router.post('/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'File richiesto'
            });
        }

        const estensione = path.extname(req.file.originalname);
        const fileContent = fs.readFileSync(req.file.path, 'utf-8');
        const members = parseMemberDataFromFile(fileContent, estensione);

        if (members.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nessun membro valido trovato nel file'
            });
        }

        // Verifica membri eliminati
        const errors = [];
        const membersToProcess = [];

        for (const member of members) {
            const deletedMember = await DeletedMember.findOne({
                $or: [
                    { key: member.key },
                    { name: member.name, id: member.id },
                    { index: member.index }
                ]
            });

            if (deletedMember) {
                errors.push({
                    member: member.name || member.index || `key=${member.key}`,
                    error: `Membro è presente nel database eliminati`
                });
                continue;
            }
            membersToProcess.push(member);
        }

        // Inserisci i membri
        const insertedMembers = [];
        for (const member of membersToProcess) {
            try {
                const newMember = new Member(member);
                await newMember.save();
                insertedMembers.push(newMember);
            } catch (error) {
                errors.push({
                    member: member.name || member.index || `key=${member.key}`,
                    error: error.message
                });
            }
        }

        // Rimuovi file temporaneo
        fs.unlinkSync(req.file.path);

        return res.json({
            success: true,
            message: `Importati ${insertedMembers.length} membri`,
            insertedCount: insertedMembers.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Errore nell\'importazione membri:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Errore interno del server'
        });
    }
});

module.exports = router;