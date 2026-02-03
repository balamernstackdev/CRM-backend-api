exports.up = function (knex) {
    return knex.schema
        // Employees Table
        .createTable('employees', function (table) {
            table.increments('employee_id').primary();
            table.string('name').notNullable();
            table.string('mobile').notNullable().unique();
            table.string('email').notNullable().unique();
            table.string('password_hash').notNullable();
            table.enum('role', ['Admin', 'Agent']).defaultTo('Agent');
            table.enum('status', ['Active', 'Inactive']).defaultTo('Active');
            table.dateTime('last_login');
            table.timestamps(true, true); // created_at, updated_at
        })
        // Customers Table
        .createTable('customers', function (table) {
            table.increments('customer_id').primary();
            table.string('customer_name').notNullable();
            table.string('phone').notNullable();
            table.string('alternate_number');
            table.string('email');

            // Investment Info
            table.string('investment_id').unique();
            table.string('investment_code');
            table.date('invested_date');
            table.string('cheque_no');
            table.string('pan_number');

            // Business
            table.string('portfolio');
            table.string('channel_partner');

            // Status
            table.enum('status', ['Active', 'Hold', 'Closed']).defaultTo('Active');
            table.text('notes');

            table.date('last_contact_date');
            table.timestamps(true, true);

            // Indexes
            table.index('customer_name');
            table.index('phone');
            table.index('email');
            table.index('investment_id');
            table.index('portfolio');
            table.index('status');
            table.index('invested_date');
            table.index('pan_number');
        })
        // Call Logs Table
        .createTable('call_logs', function (table) {
            table.increments('call_id').primary();
            table.integer('customer_id').notNullable()
                .references('customer_id').inTable('customers').onDelete('CASCADE');
            table.integer('employee_id').notNullable()
                .references('employee_id').inTable('employees').onDelete('CASCADE');

            table.dateTime('call_datetime').notNullable();
            table.enum('call_type', ['Incoming', 'Outgoing', 'Missed']).notNullable();
            table.enum('call_purpose', [
                'Investment Follow-up',
                'Payment Reminder',
                'KYC Pending',
                'New Lead',
                'Complaint',
                'General Query',
                'Others'
            ]).notNullable();
            table.enum('call_status', ['Connected', 'Not Answered', 'Busy']).notNullable();

            table.integer('call_duration');
            table.enum('priority', ['Emergency', 'Important', 'Manageable', 'Appointments']).defaultTo('Manageable');
            table.text('notes').notNullable();
            table.date('next_followup_date');

            table.timestamps(true, true);

            // Indexes
            table.index('customer_id');
            table.index('employee_id');
            table.index('call_datetime');
            table.index('call_type');
            table.index('call_purpose');
            table.index('next_followup_date');
        });
};

exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('call_logs')
        .dropTableIfExists('customers')
        .dropTableIfExists('employees');
};
