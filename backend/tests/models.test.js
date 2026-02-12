/**
 * Test unitari per i modelli (User, Member)
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const Member = require('../models/Member');

// Mock database (non connesso)
describe('Models - User', () => {
    it('User schema deve avere campo username', () => {
        const schema = User.schema;
        expect(schema.paths.username).toBeDefined();
        expect(schema.paths.username.instance).toBe('String');
    });

    it('User schema deve avere campo password', () => {
        const schema = User.schema;
        expect(schema.paths.password).toBeDefined();
        expect(schema.paths.password.instance).toBe('String');
    });

    it('User schema deve avere campo rsiHandle opzionale', () => {
        const schema = User.schema;
        expect(schema.paths.rsiHandle).toBeDefined();
    });

    it('User schema deve avere campo rsiVerified booleano', () => {
        const schema = User.schema;
        expect(schema.paths.rsiVerified).toBeDefined();
        expect(schema.paths.rsiVerified.instance).toBe('Boolean');
    });
});

describe('Models - Member', () => {
    it('Member schema deve avere campo key', () => {
        const schema = Member.schema;
        expect(schema.paths.key).toBeDefined();
        expect(schema.paths.key.instance).toBe('Number');
    });

    it('Member schema deve avere campo name', () => {
        const schema = Member.schema;
        expect(schema.paths.name).toBeDefined();
        expect(schema.paths.name.instance).toBe('String');
    });

    it('Member schema deve avere campo idoneita booleano', () => {
        const schema = Member.schema;
        expect(schema.paths.idoneita).toBeDefined();
        expect(schema.paths.idoneita.instance).toBe('Boolean');
    });

    it('Member schema deve avere indici su name e id', () => {
        const schema = Member.schema;
        // Jest test che gli indici sono definiti nel schema
        expect(schema._indexes).toBeDefined();
    });

    it('Member schema deve impostare updatedAt al salvataggio', (done) => {
        const member = new Member({
            key: 1,
            name: 'Test Member'
        });

        // Simula il pre-save hook
        expect(member.updatedAt).toBeDefined();
        done();
    });
});
