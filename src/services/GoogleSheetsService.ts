class GoogleSheetsService {
    static async fetchSheetData(accessToken: string, spreadsheetId: string, range: string) {
        try {
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching sheet data:', error);
            throw error;
        }
    }

    static async appendSheetData(accessToken: string, spreadsheetId: string, range: string, values: any[][]) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`
        console.log("url works: ", url);
        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
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
            const errorData = await response.json();
            throw new Error(`Failed to append data: ${JSON.stringify(errorData)}`);
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

    static async updateGoogleSheetCell({
                                           accessToken,
                                           spreadsheetId,
                                           sheetName,
                                           rowIndex,
                                           colIndex,
                                           value
                                       }: {
        accessToken: string;
        spreadsheetId: string;
        sheetName: string;
        rowIndex: number; // 0-based
        colIndex: number; // 0-based
        value: string;
    }): Promise<void> {

        function columnIndexToLetter(index: number): string {
            let letter = '';
            let temp = index + 1;
            while (temp > 0) {
                const mod = (temp - 1) % 26;
                letter = String.fromCharCode(65 + mod) + letter;
                temp = Math.floor((temp - mod) / 26);
            }
            return letter;
        }

        const range = `${sheetName}!${columnIndexToLetter(colIndex)}${rowIndex + 1}`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`;

        const log1 = range + ", value: " + value;
        console.log(log1);

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
            const error = await res.json();
            throw new Error(`Failed to update cell: ${JSON.stringify(error)}`);
        }
        console.log(`✅ Updated ${range} with value: ${value}`);
    }

}

export default GoogleSheetsService;
