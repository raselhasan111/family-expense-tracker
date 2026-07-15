import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const checkEnvVars = () => {
    const requiredEnvVars = ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_SHEET_ID'];
    const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
};

function getAuth() {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    return new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: privateKey,
        },
        scopes: [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/spreadsheets',
        ],
    });
}

const RANGE = 'Family-Emergency!A:F';

export async function POST(request: Request) {
    try {
        checkEnvVars();

        const body = await request.json();
        const { userName, userEmail, reason, amount, date, type } = body;

        if (!userName || !userEmail || !reason || !amount || !date || !type) {
            return NextResponse.json(
                { error: 'Missing required fields: userName, userEmail, reason, amount, date, and type are required.' },
                { status: 400 }
            );
        }

        if (type !== 'cashin' && type !== 'cashout') {
            return NextResponse.json(
                { error: 'Type must be "cashin" or "cashout".' },
                { status: 400 }
            );
        }

        if (isNaN(Number(amount))) {
            return NextResponse.json(
                { error: 'Amount must be a valid number.' },
                { status: 400 }
            );
        }

        const sheets = google.sheets({ version: 'v4', auth: getAuth() });

        // Columns: Date | Name | Email | Reason | Amount | Type
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: RANGE,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[date, userName, userEmail, reason, amount, type]],
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Entry added successfully',
            data: response.data,
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error saving emergency entry:', error);

        const isConfigError = error.message.includes('Missing required environment variables') ||
            error.message.includes('key values mismatch');

        return NextResponse.json(
            { error: isConfigError ? 'Server configuration error. Please ensure Google API credentials are set correctly.' : error.message || 'Failed to save entry' },
            { status: isConfigError ? 500 : 400 }
        );
    }
}

export async function GET() {
    try {
        checkEnvVars();

        const sheets = google.sheets({ version: 'v4', auth: getAuth() });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: RANGE,
        });

        const rows = response.data.values || [];

        // Columns: Date | Name | Email | Reason | Amount | Type
        const entries = rows.map((row) => ({
            date: row[0] || '',
            userName: row[1] || '',
            userEmail: row[2] || '',
            reason: row[3] || '',
            amount: Number(row[4]) || 0,
            type: (row[5] as 'cashin' | 'cashout') || 'cashout',
        }));

        return NextResponse.json({ entries }, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching emergency entries:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch entries' },
            { status: 500 }
        );
    }
}
