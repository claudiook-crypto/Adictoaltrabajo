import { poolPromise } from './backend/src/db';

async function test() {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
    console.log(result.recordset);
    process.exit(0);
}

test();

