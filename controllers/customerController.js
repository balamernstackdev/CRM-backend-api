const db = require('../config/database');

const getCustomers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = '' } = req.query;
        const offset = (page - 1) * limit;

        const query = db('customers');

        if (search) {
            query.where(builder => {
                builder.where('customer_name', 'like', `%${search}%`)
                    .orWhere('phone', 'like', `%${search}%`)
                    .orWhere('investment_id', 'like', `%${search}%`);
            });
        }

        if (status) {
            query.where('status', status);
        }

        // Clone query for counting
        const countQuery = query.clone().count('* as total').first();
        const totalResult = await countQuery;
        const total = totalResult.total || totalResult['count(*)'] || 0; // Handle different DB responses

        const customers = await query
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset);

        res.json({
            success: true,
            data: {
                customers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(total),
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch customers' });
    }
};

const getCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await db('customers').where('customer_id', id).first();

        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        res.json({ success: true, data: customer });
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch customer' });
    }
};

const createCustomer = async (req, res) => {
    try {
        const {
            customer_name,
            phone,
            alternate_number,
            email,
            investment_id,
            investment_code,
            invested_date,
            cheque_no,
            portfolio,
            channel_partner,
            status,
            notes
        } = req.body;

        const [id] = await db('customers').insert({
            customer_name,
            phone,
            alternate_number: alternate_number || null,
            email: email || null,
            investment_id: investment_id || null,
            investment_code: investment_code || null,
            invested_date: invested_date || null,
            cheque_no: cheque_no || null,
            portfolio: portfolio || null,
            channel_partner: channel_partner || null,
            status: status || 'Active',
            notes: notes || null
        });

        // For SQLite, insert returns [id]. For PG/MySQL it might differ, but Knex usually normalizes 'returning' or we fetch it.
        // To be safe and cross-db compatible effectively:
        // SQLite: returns [id] with .returning() not supported by default unless specified or implicitly handled.
        // Actually, db(...).insert() returns a promise that resolves to an array of insert IDs for some DBs.
        // Let's rely on fetching the created record.

        // Wait! SQLite with simpler knex insert returns [id].
        // Let's assume standard behavior or use .returning('*') for PG support.
        // Since we need to support both:

        let customer;
        // Check if environment is using PG, then we can use .returning('*')
        // But for safe cross-compat without knowing driver features perfectly in this mixed mode:
        // We know 'id' (the inserted rowid) is usually returned in array [id].

        if (id) {
            customer = await db('customers').where('customer_id', id).first();
        } else {
            // Fallback if id capture failed (e.g. some mysql configs)
            // But for now let's assume standard knex behavior.
            // Actually, for better-sqlite3 knex returns [id].
            customer = await db('customers').where('customer_id', id).first();
        }

        res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            data: customer
        });
    } catch (error) {
        console.error('Create customer error:', error);
        // Knex error codes might differ between drivers, so we check generally
        if (error.code === 'SQLITE_CONSTRAINT' || error.code === '23505') { // 23505 is PG unique violation
            return res.status(400).json({ success: false, message: 'Phone number or Investment ID already exists' });
        }
        res.status(500).json({ success: false, message: 'Failed to create customer' });
    }
};

const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            customer_name,
            phone,
            alternate_number,
            email,
            investment_id,
            investment_code,
            invested_date,
            cheque_no,
            portfolio,
            channel_partner,
            status,
            notes,
            pan_number
        } = req.body;

        const updatedRows = await db('customers')
            .where('customer_id', id)
            .update({
                customer_name,
                phone,
                alternate_number: alternate_number || null,
                email: email || null,
                investment_id: investment_id || null,
                investment_code: investment_code || null,
                invested_date: invested_date || null,
                cheque_no: cheque_no || null,
                portfolio: portfolio || null,
                channel_partner: channel_partner || null,
                status,
                notes: notes || null,
                pan_number: pan_number ? pan_number.toUpperCase() : null
            });

        if (updatedRows === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        const customer = await db('customers').where('customer_id', id).first();

        res.json({
            success: true,
            message: 'Customer updated successfully',
            data: customer
        });
    } catch (error) {
        console.error('Update customer error:', error);
        if (error.code === 'SQLITE_CONSTRAINT' || error.code === '23505') {
            return res.status(400).json({ success: false, message: 'Phone number or Investment ID already exists' });
        }
        res.status(500).json({ success: false, message: 'Failed to update customer' });
    }
};

const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        // Check for related call logs
        const callLogCountResult = await db('call_logs').where('customer_id', id).count('* as count').first();
        const callLogCount = callLogCountResult.count || callLogCountResult['count(*)'] || 0;

        if (callLogCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete customer with ${callLogCount} call log(s). Set status to Closed instead.`
            });
        }

        const deletedRows = await db('customers').where('customer_id', id).del();

        if (deletedRows === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete customer' });
    }
};

const searchCustomers = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json({ success: true, data: [] });
        }

        const customers = await db('customers')
            .select('customer_id', 'customer_name', 'phone', 'portfolio', 'investment_id', 'status', 'pan_number')
            .where('status', 'Active')
            .andWhere(builder => {
                builder.where('customer_name', 'like', `%${q}%`)
                    .orWhere('phone', 'like', `%${q}%`)
                    .orWhere('investment_id', 'like', `%${q}%`)
                    .orWhere('pan_number', 'like', `${q}%`);
            })
            .orderByRaw(`CASE WHEN pan_number LIKE ? THEN 0 ELSE 1 END ASC`, [`${q}%`])
            .orderBy('customer_name', 'asc')
            .limit(20);

        res.json({ success: true, data: customers });
    } catch (error) {
        console.error('Search customers error:', error);
        res.status(500).json({ success: false, message: 'Search failed' });
    }
};

const getCustomerCalls = async (req, res) => {
    try {
        const { id } = req.params;

        const calls = await db('call_logs as cl')
            .join('employees as e', 'cl.employee_id', 'e.employee_id')
            .select('cl.*', 'e.name as employee_name')
            .where('cl.customer_id', id)
            .orderBy('cl.call_datetime', 'desc');

        res.json({ success: true, data: calls });
    } catch (error) {
        console.error('Get customer calls error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch call history' });
    }
};

const checkMobile = async (req, res) => {
    try {
        const { mobile } = req.query;

        const exists = await db('customers').where('phone', mobile).select('customer_id').first();

        res.json({ success: true, data: { exists: !!exists } });
    } catch (error) {
        console.error('Check mobile error:', error);
        res.status(500).json({ success: false, message: 'Check failed' });
    }
};

module.exports = {
    getCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    searchCustomers,
    getCustomerCalls,
    checkMobile
};
