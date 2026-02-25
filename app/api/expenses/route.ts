import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Validate required environment variables
const checkEnvVars = () => {
    const requiredEnvVars = ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_SHEET_ID'];
    const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
};

export async function POST(request: Request) {
    try {
        // 1. Validate environment
        checkEnvVars();

        // 2. Parse request body
        const body = await request.json();
        const { user, reason, amount, date } = body;

        // Validate inputs
        if (!user || !reason || !amount || !date) {
            return NextResponse.json(
                { error: 'Missing required fields: user, reason, amount, and date are required.' },
                { status: 400 }
            );
        }

        if (isNaN(Number(amount))) {
            return NextResponse.json(
                { error: 'Amount must be a valid number.' },
                { status: 400 }
            );
        }

        // 3. Authenticate with Google Sheets API
        // Format the private key correctly (replace literal '\n' with actual newlines)
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        const auth = new google.auth.GoogleAuth({
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

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        // 4. Append data to the sheet
        // We assume the sheet has headers: Date, User, Reason, Amount in the first row.
        // If you haven't set up the sheet, create one and put those headers in A1:D1.
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:D', // Adjust 'Sheet1' if your tab name is different
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[date, user, reason, amount]],
            },
        });

        // 5. Return success
        return NextResponse.json({
            success: true,
            message: 'Expense added successfully',
            data: response.data,
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error saving expense:', error);

        // Check if it's an authorization or environment error
        const isConfigError = error.message.includes('Missing required environment variables') ||
            error.message.includes('key values mismatch');

        const statusCode = isConfigError ? 500 : 400;
        const errorMessage = isConfigError ?
            'Server configuration error. Please ensure Google API credentials are set correctly.' :
            error.message || 'Failed to save expense';

        return NextResponse.json(
            { error: errorMessage },
            { status: statusCode }
        );
    }
}
