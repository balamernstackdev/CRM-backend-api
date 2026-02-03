-- Drop existing tables
DROP TABLE IF EXISTS call_logs;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS employees;

-- Employees table (unchanged)
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('Admin', 'Agent')) DEFAULT 'Agent',
    status TEXT CHECK(status IN ('Active', 'Inactive')) DEFAULT 'Active',
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_role ON employees(role);

-- Customers table (REDESIGNED for Investment Tracking)
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Basic Information
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    alternate_number TEXT,
    email TEXT,
    
    -- Investment Information (NEW)
    investment_id TEXT UNIQUE,
    investment_code TEXT,
    invested_date DATE,
    cheque_no TEXT,
    pan_number TEXT,
    
    -- Portfolio & Business
    portfolio TEXT,
    channel_partner TEXT,
    
    -- Status & Notes
    status TEXT CHECK(status IN ('Active', 'Hold', 'Closed')) DEFAULT 'Active',
    notes TEXT,
    
    -- Tracking
    last_contact_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_name ON customers(customer_name);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_investment_id ON customers(investment_id);
CREATE INDEX idx_customers_portfolio ON customers(portfolio);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_invested_date ON customers(invested_date);

-- Call Logs table (updated for new customer structure)
CREATE TABLE call_logs (
    call_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    
    -- Call Details
    call_datetime DATETIME NOT NULL,
    call_type TEXT CHECK(call_type IN ('Incoming', 'Outgoing', 'Missed')) NOT NULL,
    call_purpose TEXT CHECK(call_purpose IN (
        'Investment Follow-up', 
        'Payment Reminder', 
        'KYC Pending', 
        'New Lead', 
        'Complaint', 
        'General Query', 
        'Others'
    )) NOT NULL,
    call_status TEXT CHECK(call_status IN ('Connected', 'Not Answered', 'Busy')) NOT NULL,
    
    -- Additional Info
    call_duration INTEGER,
    priority TEXT CHECK(priority IN ('Emergency', 'Important', 'Manageable', 'Appointments')) DEFAULT 'Manageable',
    notes TEXT NOT NULL,
    next_followup_date DATE,
    
    -- Tracking
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

CREATE INDEX idx_call_logs_customer ON call_logs(customer_id);
CREATE INDEX idx_call_logs_employee ON call_logs(employee_id);
CREATE INDEX idx_call_logs_datetime ON call_logs(call_datetime);
CREATE INDEX idx_call_logs_type ON call_logs(call_type);
CREATE INDEX idx_call_logs_purpose ON call_logs(call_purpose);
CREATE INDEX idx_call_logs_followup ON call_logs(next_followup_date);

-- Trigger to update last_contact_date
CREATE TRIGGER update_customer_last_contact
AFTER INSERT ON call_logs
BEGIN
    UPDATE customers 
    SET last_contact_date = NEW.call_datetime,
        updated_at = CURRENT_TIMESTAMP
    WHERE customer_id = NEW.customer_id;
END;

-- Trigger to update timestamps
CREATE TRIGGER update_customers_timestamp
AFTER UPDATE ON customers
BEGIN
    UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE customer_id = NEW.customer_id;
END;

CREATE TRIGGER update_call_logs_timestamp
AFTER UPDATE ON call_logs
BEGIN
    UPDATE call_logs SET updated_at = CURRENT_TIMESTAMP WHERE call_id = NEW.call_id;
END;
