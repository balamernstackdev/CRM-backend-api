const db = require('../config/database');

const getAdminDashboard = async (req, res) => {
    try {
        const { startDate, endDate, date } = req.query;

        // Determine search range
        let startStr, endStr;

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            startStr = start.toISOString();
            endStr = end.toISOString();
        } else {
            const targetDate = date ? new Date(date) : new Date();
            const start = new Date(targetDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(targetDate);
            end.setHours(23, 59, 59, 999);
            startStr = start.toISOString();
            endStr = end.toISOString();
        }

        // 1. Total Calls (Filtered)
        const totalCallsResult = await db('call_logs')
            .whereBetween('call_datetime', [startStr, endStr])
            .count('* as count')
            .first();
        const totalCallsToday = totalCallsResult.count || totalCallsResult['count(*)'] || 0;

        // 2. Unique Customer Calls (Filtered)
        const uniqueParams = await db('call_logs')
            .whereBetween('call_datetime', [startStr, endStr])
            .countDistinct('customer_id as count')
            .first();
        const uniqueCustomerCalls = uniqueParams.count || uniqueParams['count(distinct customer_id)'] || 0;

        // 3. Pending Follow-ups (Future from Today)
        const todayStr = new Date().toISOString().split('T')[0];
        const pendingFollowupsResult = await db('call_logs')
            .where('next_followup_date', '>=', todayStr)
            .whereNotNull('next_followup_date')
            .count('* as count')
            .first();
        const pendingFollowups = pendingFollowupsResult.count || pendingFollowupsResult['count(*)'] || 0;

        // 4. Employee Priority Stats (Filtered)
        // Grouping logic with Knex
        const employeePriorityStats = await db('employees as e')
            .leftJoin('call_logs as cl', function () {
                this.on('e.employee_id', '=', 'cl.employee_id')
                    .andOnBetween('cl.call_datetime', [startStr, endStr]);
            })
            .select(
                'e.employee_id',
                'e.name as employee_name',
                db.raw("SUM(CASE WHEN cl.priority = 'Emergency' THEN 1 ELSE 0 END) as emergency"),
                db.raw("SUM(CASE WHEN cl.priority = 'Important' THEN 1 ELSE 0 END) as important"),
                db.raw("SUM(CASE WHEN cl.priority = 'Manageable' THEN 1 ELSE 0 END) as manageable"),
                db.raw("SUM(CASE WHEN cl.priority = 'Appointments' THEN 1 ELSE 0 END) as appointments"),
                db.raw("COUNT(cl.call_id) as total")
            )
            .groupBy('e.employee_id', 'e.name')
            .havingRaw('total > 0 OR e.status = ?', ['Active'])
            .orderBy('total', 'desc');

        // 5. Employee Call Purpose Stats (Filtered)
        const employeeCallPurposeStats = await db('employees as e')
            .leftJoin('call_logs as cl', function () {
                this.on('e.employee_id', '=', 'cl.employee_id')
                    .andOnBetween('cl.call_datetime', [startStr, endStr]);
            })
            .select(
                'e.employee_id',
                'e.name as employee_name',
                db.raw("SUM(CASE WHEN cl.call_purpose = 'Payment Refund' THEN 1 ELSE 0 END) as payment_refund"),
                db.raw("SUM(CASE WHEN cl.call_purpose = 'KYC Update' THEN 1 ELSE 0 END) as kyc_update"),
                db.raw("SUM(CASE WHEN cl.call_purpose = 'Payout 2025' THEN 1 ELSE 0 END) as payout_2025"),
                db.raw("SUM(CASE WHEN cl.call_purpose = 'Payout 2024' THEN 1 ELSE 0 END) as payout_2024"),
                db.raw("SUM(CASE WHEN cl.call_purpose = 'NCD Document' THEN 1 ELSE 0 END) as ncd_document"),
                db.raw("SUM(CASE WHEN cl.call_purpose = 'NCD Payout' THEN 1 ELSE 0 END) as ncd_payout"),
                db.raw("SUM(CASE WHEN cl.call_purpose = 'Appointments' THEN 1 ELSE 0 END) as appointments"),
                db.raw("SUM(CASE WHEN cl.call_purpose = 'Others' THEN 1 ELSE 0 END) as others"),
                db.raw("COUNT(cl.call_id) as total")
            )
            .groupBy('e.employee_id', 'e.name')
            .orderBy('total', 'desc');

        res.json({
            success: true,
            data: {
                summary: {
                    totalCallsToday,
                    uniqueCustomerCalls,
                    pendingFollowups
                },
                employeePriorityStats,
                employeeCallPurposeStats
            }
        });
    } catch (error) {
        console.error('Get admin dashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
    }
};

const getEmployeeDashboard = async (req, res) => {
    try {
        const employeeId = req.user.employeeId;
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const thisMonth = new Date().toISOString().slice(0, 7);

        // Date comparison in cross-db way. 
        // Best to use string comparison for call_datetime since it's likely stored as ISO string in SQLite
        // But for PG/MySQL they might be datetime types.
        // We'll use whereBetween or similar for safer filtering.

        // 1. Calls Today
        // Assuming call_datetime is ISO 8601 string or compatible.
        const callsTodayResult = await db('call_logs')
            .where('employee_id', employeeId)
            .andWhereRaw("SUBSTR(call_datetime, 1, 10) = ?", [today]) // SQLite/String friendly. For PG use TO_CHAR or cast with specific syntax if needed.
            // A safer cross-db way for "today" without raw sql if field type is standard:
            // .whereBetween('call_datetime', [startOfToday, endOfToday])
            // Let's implement that for better compatibility.
            .count('* as count')
            .first();

        // Let's refine the today filtering to be strict range
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

        const callsTodayResultSafe = await db('call_logs')
            .where('employee_id', employeeId)
            .whereBetween('call_datetime', [startOfDay.toISOString(), endOfDay.toISOString()])
            .count('* as count')
            .first();

        const callsToday = callsTodayResultSafe.count || callsTodayResultSafe['count(*)'] || 0;

        // 2. Calls this week
        const callsThisWeekResult = await db('call_logs')
            .where('employee_id', employeeId)
            .where('call_datetime', '>=', weekAgo.toISOString())
            .count('* as count')
            .first();
        const callsThisWeek = callsThisWeekResult.count || callsThisWeekResult['count(*)'] || 0;

        // 3. Calls this month
        // Difficult to get distinct month range without dates.
        // Let's construct start of month date
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const callsThisMonthResult = await db('call_logs')
            .where('employee_id', employeeId)
            .where('call_datetime', '>=', startOfMonth.toISOString())
            .count('* as count')
            .first();
        const callsThisMonth = callsThisMonthResult.count || callsThisMonthResult['count(*)'] || 0;

        const pendingFollowupsResult = await db('call_logs')
            .where('employee_id', employeeId)
            .where('next_followup_date', '>=', today)
            .whereNotNull('next_followup_date')
            .count('* as count')
            .first();
        const pendingFollowups = pendingFollowupsResult.count || pendingFollowupsResult['count(*)'] || 0;

        const recentCalls = await db('call_logs as cl')
            .join('customers as c', 'cl.customer_id', 'c.customer_id')
            .select('cl.*', 'c.customer_name')
            .where('cl.employee_id', employeeId)
            .orderBy('cl.call_datetime', 'desc')
            .limit(10);

        const todayFollowups = await db('call_logs as cl')
            .join('customers as c', 'cl.customer_id', 'c.customer_id')
            .select('cl.*', 'c.customer_name', 'c.phone')
            .where('cl.employee_id', employeeId)
            .where('cl.next_followup_date', today)
            .orderBy('cl.call_datetime', 'desc');

        const performanceThisMonth = await db('call_logs')
            .select('call_purpose')
            .count('* as count')
            .where('employee_id', employeeId)
            .where('call_datetime', '>=', startOfMonth.toISOString())
            .groupBy('call_purpose');

        res.json({
            success: true,
            data: {
                summary: {
                    callsToday,
                    callsThisWeek,
                    callsThisMonth,
                    pendingFollowups
                },
                recentCalls,
                todayFollowups,
                performanceThisMonth
            }
        });
    } catch (error) {
        console.error('Get employee dashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
    }
};

module.exports = {
    getAdminDashboard,
    getEmployeeDashboard
};
