// Test script to catch full error
try {
    require('./server.js');
} catch (error) {
    console.error('FULL ERROR:');
    console.error(error);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
}
