import { DEFAULT_SPREADSHEET_ID } from "../constants";

class GoogleSheetsService {
    static async fetchSheetData(accessToken: string, range: string) {
        try {
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_SPREADSHEET_ID}/values/${range}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    alert("רענן את הדף לצורך התחברות נוספת");
                }
                throw new Error('Failed to fetch data');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching sheet data:', error);
            throw error;
        }
    }

    static async appendSheetData(accessToken: string, range: string, values: any[][]) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`
        console.log("url works: ", url);
        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({values})
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                alert("רענן את הדף לצורך התחברות נוספת");
            }
            const errorData = await response.json();
            console.error('Failed to append data:', errorData);
        }

        return await response.json();
    }

    static processSheetData(data: any) {
        if (!data.values || data.values.length === 0) {
            return {columnDefs: [], rowData: []};
        }

        const headers = data.values[0];

        // Create column definitions for AG Grid
        const columnDefs = headers.map((header: string) => ({
            headerName: header,
            field: header.toLowerCase().replace(/\s+/g, '_'),
            sortable: true,
            filter: true,
            resizable: true
        }));

        // Create row data from the values
        const rowData = data.values.slice(1).map((row: any[]) => {
            const rowData: Record<string, any> = {};
            headers.forEach((header: string, index: number) => {
                rowData[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
            });
            return rowData;
        });

        return {columnDefs, rowData};
    }

    static async updateCalls({
                                 accessToken,
                                 updates,
                                 appendSheetId,
                                 appendValues,
                                 secondAppendSheetId,
                                 secondAppendValues,
                             }: {
        accessToken: string;
        updates: {
            sheetId: number;
            rowIndex: number;
            colIndex: number;
            value: string;
        }[];
        appendSheetId: number;
        appendValues: string[][];
        secondAppendSheetId?: number;
        secondAppendValues?: string[][];
    }) {

        const requests: any[] = [];
        // Add updateCells requests
        for (const update of updates) {
            const sheetId = update.sheetId;
            if (sheetId === undefined) {
                throw new Error(`Sheet not found: ${update.sheetId}`);
            }

            requests.push({
                updateCells: {
                    rows: [
                        {
                            values: [
                                {
                                    userEnteredValue: { stringValue: update.value },
                                },
                            ],
                        },
                    ],
                    fields: "userEnteredValue",
                    start: {
                        sheetId,
                        rowIndex: update.rowIndex,
                        columnIndex: update.colIndex,
                    },
                },
            });
        }

        // Add appendCells request
        if (appendSheetId === undefined) {
            throw new Error(`Sheet not found: ${appendSheetId}`);
        }

        requests.push({
            appendCells: {
                sheetId: appendSheetId,
                rows: appendValues.map((row) => ({
                    values: row.map((cell) => ({
                        userEnteredValue: { stringValue: cell },
                    })),
                })),
                fields: "*",
            },
        });
        // Append to second sheet if provided
        if (secondAppendSheetId !== undefined && secondAppendValues !== undefined) {
            requests.push({
                appendCells: {
                    sheetId: secondAppendSheetId,
                    rows: secondAppendValues.map((row) => ({
                        values: row.map((cell) => ({
                            userEnteredValue: { stringValue: cell },
                        })),
                    })),
                    fields: "*",
                },
            });
        }

        const res = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_SPREADSHEET_ID}:batchUpdate`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ requests }),
            }
        );

        if (!res.ok) {
            if (res.status === 401) {
                alert("רענן את הדף לצורך התחברות נוספת");
            }
            const error = await res.json();
            console.log(`Failed to update/append: ${JSON.stringify(error)}`)
            return false;
        }
        console.log("✅ Batch update and append successful");
        return true;
    }


    // File: GoogleSheetsService.ts

    static async batchAppendRowsToSheets({
                                                      accessToken,
                                                      updates,
                                                  }: {
        accessToken: string;
        updates: {
            range: string;
            values: any[][];
        }[];
    }){
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_SPREADSHEET_ID}/values:append`;

        const payload = {
            valueInputOption: "USER_ENTERED",
            data: updates.map(update => ({
                range: update.range,
                values: update.values,
            })),
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json();
            console.log(`Failed to batch update sheets: ${JSON.stringify(error)}`);
            return false;
        }
        console.log(`✅ Successfully executed batch update with ${response} operations`);
        return true;

    }


    static columnIndexToLetter(index: number): string {
        let letter = '';
        let temp = index + 1;
        while (temp > 0) {
            const mod = (temp - 1) % 26;
            letter = String.fromCharCode(65 + mod) + letter;
            temp = Math.floor((temp - mod) / 26);
        }
        return letter;
    }

    /**
     * Executes multiple operations in a single batch update
     * @param accessToken - Google API access token
     * @param requests - Array of request objects for the batch update
     * @returns Promise<boolean> - True if successful, false otherwise
     */
    static async executeBatchUpdate(
        accessToken: string,
        requests: any[]
    ): Promise<boolean> {
        const res = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_SPREADSHEET_ID}:batchUpdate`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ requests }),
            }
        );

        if (!res.ok) {
            const error = await res.json();
            console.error(`Failed to execute batch update: ${JSON.stringify(error)}`);
            return false;
        }

        console.log(`✅ Successfully executed batch update with ${requests.length} operations`);
        return true;
    }

    static findInsertIndex(data: string[][], headerName: string): { row: number, col: number } {
        const headerRow = data[0];
        const colIndex = headerRow.indexOf(headerName);

        if (colIndex === -1) {
            throw new Error(`Header "${headerName}" not found`);
        }

        for (let row = 1; row < data.length; row++) {
            const rowData = data[row];
            if (!rowData[colIndex] || rowData[colIndex].trim() === '') {
                return { row, col: colIndex };
            }
        }

        // If no empty cell found, insert at new row
        return { row: data.length, col: colIndex };
    }

    static findValuesUnderHeader(
        data: any[][],
        headerName: string
    ): { rowIndex: number; colIndex: number; value: any }[] {
        const result: { rowIndex: number; colIndex: number; value: any; }[] = [];

        if (!data || data.length === 0) return result;

        const headerRow = data[0];
        const colIndex = headerRow.indexOf(headerName);
        if (colIndex === -1) return result;

        for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
            const row = data[rowIndex];
            if (row && row.length > colIndex) {
                const val = row[colIndex];
                if (val !== '' && val !== null && val !== undefined) {
                    result.push({ rowIndex, colIndex, value: val });
                }
            }
        }

        return result;
    }




}

export default GoogleSheetsService;
