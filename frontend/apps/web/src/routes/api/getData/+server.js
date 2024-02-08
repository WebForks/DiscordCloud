import { json } from '@sveltejs/kit';
import Database from 'better-sqlite3';
import { DB_PATH } from '$env/static/private';

export async function GET() {
    const db = new Database(DB_PATH);
    console.log("ACCESSING DATA ---------------------------");
    const rows = db.prepare('SELECT * FROM files').all();
    db.close();
    //console.log(rows);

    if (rows.length > 0) {
        // Use the json function for the successful response
        return json({ files: rows });
    } else {
        // Also use json for error messages, optionally with a status code
        return json({ error: 'No files found' }, { status: 404 });
    }
}
