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
                    alert("Refresh the page and Sign in again to continue using the app.");
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
                alert("Refresh the page and Sign in again to continue using the app.");
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
                                 spreadsheetId,
                                 updates,
                                 appendSheetId,
                                 appendValues,
                             }: {
        accessToken: string;
        spreadsheetId: string;
        updates: {
            sheetId: number;
            rowIndex: number;
            colIndex: number;
            value: string;
        }[];
        appendSheetId: number;
        appendValues: string[][];
    }) {
        // Fetch sheet metadata to get sheet IDs
        // const metadataRes = await fetch(
        //     `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        //     {
        //         headers: {
        //             Authorization: `Bearer ${accessToken}`,
        //         },
        //     }
        // );
        //
        // const metadata = await metadataRes.json();
        // const sheets = metadata.sheets;
        //
        // const getSheetId = (name: string) =>
        //     sheets.find((s: any) => s.properties.title === name)?.properties.sheetId;

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
        const res = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
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
                alert("Refresh the page and Sign in again to continue using the app.");
            }
            const error = await res.json();
            console.log(`Failed to update/append: ${JSON.stringify(error)}`)
            return false;
        }
        console.log("✅ Batch update and append successful");
        return true;
    }


    static async updateGoogleSheetCell({
                                           accessToken,
                                           sheetName,
                                           rowIndex,
                                           colIndex,
                                           value
                                       }: {
        accessToken: string;
        sheetName: string;
        rowIndex: number; // 0-based
        colIndex: number; // 0-based
        value: string;
    }): Promise<boolean> {


        const range = `${sheetName}!${GoogleSheetsService.columnIndexToLetter(colIndex)}${rowIndex + 1}`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`;

        const res = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                values: [[value]]
            }),
        });

        if (!res.ok) {
            // const error = await res.json();
            // throw new Error(`Failed to update cell: ${JSON.stringify(error)}`);
            return false;
        }
        console.log(`✅ Updated ${range} with value: ${value}`);
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
     * Removes a row from a Google Sheet
     * @param accessToken - Google API access token
     * @param sheetId - The ID of the sheet (not the spreadsheet ID)
     * @param rowIndex - 0-based row index to remove
     * @returns Promise<boolean> - True if successful, false otherwise
     */
    static async removeRow({
        accessToken,
        sheetId,
        rowIndex
    }: {
        accessToken: string;
        sheetId: number;
        rowIndex: number; // 0-based
    }): Promise<boolean> {
        const requests = [{
            deleteDimension: {
                range: {
                    sheetId: sheetId,
                    dimension: "ROWS",
                    startIndex: rowIndex,
                    endIndex: rowIndex + 1
                }
            }
        }];

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
            console.log(`Failed to remove row: ${JSON.stringify(error)}`);
            return false;
        }

        console.log(`✅ Successfully removed row at index ${rowIndex}`);
        return true;
    }

    /*
    static async getSheetIdByName({
                                      accessToken,
                                      spreadsheetId,
                                      sheetName,
                                  }: {
        accessToken: string;
        spreadsheetId: string;
        sheetName: string;
    }): Promise<number | null> {
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!res.ok) {
            console.error(`❌ Failed to fetch spreadsheet metadata`);
            return null;
        }

        const metadata = await res.json();

        // Log all sheet names and IDs
        for (const s of metadata.sheets) {
            console.log(`${s.properties.title} - ${s.properties.sheetId}`);
        }

        const sheet = metadata.sheets.find((s: any) => s.properties.title === sheetName);

        if (!sheet) {
            console.warn(`⚠️ Sheet "${sheetName}" not found`);
            return null;
        }

        return sheet.properties.sheetId;
    }
*/

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
