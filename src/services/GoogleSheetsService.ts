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

  static processSheetData(data: any) {
    if (!data.values || data.values.length === 0) {
      return { columnDefs: [], rowData: [] };
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
    
    return { columnDefs, rowData };
  }
}

export default GoogleSheetsService;
