const db = require('../config/database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function runSeed() {
    console.log('🌱 Seeding database...\n');

    try {
        // Check if tables exist
        const tableCheck = await db.raw("SELECT name FROM sqlite_master WHERE type='table' AND name='employees'");

        if (tableCheck.length === 0) {
            console.log('⚠️ Tables missing. Initializing schema...');
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');

            const statements = schema.split(';').filter(s => s.trim());
            for (const statement of statements) {
                await db.raw(statement);
            }
            console.log('✅ Schema initialized.');
        }

        console.log('Cleaning existing data...');
        await db('call_logs').del();
        await db('customers').del();
        await db('employees').del();

        console.log('Creating employees...');
        const adminPassword = await bcrypt.hash('admin123', 10);
        const agentPassword = await bcrypt.hash('agent123', 10);

        const employees = [
            { name: 'Admin', mobile: '9999999999', email: 'admin@company.com', password_hash: adminPassword, role: 'Admin', status: 'Active' },
            { name: 'Agent One', mobile: '9876543201', email: 'agent1@company.com', password_hash: agentPassword, role: 'Agent', status: 'Active' },
            { name: 'Agent Two', mobile: '9876543202', email: 'agent2@company.com', password_hash: agentPassword, role: 'Agent', status: 'Active' },
            { name: 'Agent Three', mobile: '9876543203', email: 'agent3@company.com', password_hash: agentPassword, role: 'Agent', status: 'Active' },
        ];

        const employeeIds = [];
        for (const emp of employees) {
            const [id] = await db('employees').insert(emp);
            employeeIds.push(id);
        }
        console.log(`✅ Created ${employeeIds.length} employees`);

        // 2. Seed Customers
        console.log('Creating dummy customers...');
        const customers = [
            { customer_name: 'John Doe', phone: '9000000001', email: 'john@example.com', portfolio: 'Payout 2025', status: 'Active' },
            { customer_name: 'Jane Smith', phone: '9000000002', email: 'jane@example.com', portfolio: 'KYC Update', status: 'Active' },
            { customer_name: 'Robert Brown', phone: '9000000003', email: 'robert@example.com', portfolio: 'NCD Payout', status: 'Active' },
            { customer_name: 'Alice Williams', phone: '9000000004', email: 'alice@example.com', portfolio: 'Payment Refund', status: 'Active' },
            { customer_name: 'Michael Davis', phone: '9000000005', email: 'michael@example.com', portfolio: 'NCD Document', status: 'Active' },
        ];

        const customerIds = [];
        for (const cust of customers) {
            const [id] = await db('customers').insert(cust);
            customerIds.push(id);
        }
        console.log(`✅ Created ${customerIds.length} customers`);

        // 3. Seed Call Logs
        console.log('Creating dummy call logs...');
        const callLogs = [];
        const types = ['Incoming', 'Outgoing', 'Missed'];
        const purposes = ['Investment Follow-up', 'Payment Reminder', 'KYC Pending', 'New Lead', 'Complaint', 'General Query', 'Others'];
        const statuses = ['Connected', 'Not Answered', 'Busy'];
        const priorities = ['Emergency', 'Important', 'Manageable', 'Appointments'];

        for (let i = 0; i < 20; i++) {
            const empId = employeeIds[Math.floor(Math.random() * employeeIds.length)];
            const custId = customerIds[Math.floor(Math.random() * customerIds.length)];

            const daysAgo = Math.floor(Math.random() * 30);
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);

            callLogs.push({
                call_datetime: date.toISOString(),
                employee_id: empId,
                customer_id: custId,
                call_type: types[Math.floor(Math.random() * types.length)],
                call_purpose: purposes[Math.floor(Math.random() * purposes.length)],
                priority: priorities[Math.floor(Math.random() * priorities.length)],
                call_status: statuses[Math.floor(Math.random() * statuses.length)],
                notes: `Dummy follow-up note ${i + 1}`,
                next_followup_date: i % 4 === 0 ? new Date(date.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null
            });
        }

        await db('call_logs').insert(callLogs);
        console.log(`✅ Created ${callLogs.length} call logs`);

        console.log('\n📧 Demo Credentials:');
        console.log('   Admin: admin@company.com / admin123');
        console.log('   Agent: agent1@company.com / agent123\n');

        console.log('✅ Database seeded successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await db.destroy();
    }
}

runSeed();
