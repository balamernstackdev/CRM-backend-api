const request = require('supertest');
const app = require('../server');
const db = require('../config/database');
const bcrypt = require('bcryptjs');

describe('Auth Endpoints', () => {
    beforeAll(() => {
        // Create a test user
        const passwordHash = bcrypt.hashSync('password123', 10);
        db.prepare(`
            INSERT INTO employees (name, mobile, email, password_hash, role, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run('Test User', '9999999999', 'test@example.com', passwordHash, 'Admin', 'Active');
    });

    afterAll(() => {
        // Cleanup
        db.prepare('DELETE FROM employees WHERE email = ?').run('test@example.com');
    });

    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('token');
        });

        it('should fail with invalid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('success', false);
        });
    });
});
