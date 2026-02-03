const request = require('supertest');
const app = require('../server'); // We need to export app from server.js

describe('Health Check Endpoint', () => {
    it('should return 200 OK', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'OK');
    });
});
