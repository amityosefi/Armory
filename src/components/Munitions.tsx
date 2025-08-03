import React, { useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useGoogleSheetData } from '@/components/hooks/useGoogleSheetData';

interface RowData {
    [key: string]: string | number;
}

interface MunitionsProps {
    accessToken: string;
    selectedSheet: {
        name: string;
        range: string;
        id: number;
    };
}

const Munitions: React.FC<MunitionsProps> = ({ accessToken, selectedSheet }) => {
    const { permissions } = usePermissions();
    const [rowData, setRowData] = useState<RowData[]>([]);
    const [columnDefs, setColumnDefs] = useState<any[]>([]);

    const { data: sheetQueryData, refetch } = useGoogleSheetData(
        { accessToken, range: selectedSheet.range, isArmory: false },
        { processData: false, enabled: !!accessToken }
    );

    useEffect(() => {
        if (!sheetQueryData?.values || sheetQueryData.values.length === 0) {
            setColumnDefs([]);
            setRowData([]);
            return;
        }

        // The first row contains headers
        const headers = sheetQueryData.values[0];

        // Build column definitions from headers
        const cols = headers.map((header: string) => ({
            headerName: header,
            field: header,
            sortable: true,
            filter: true,
            resizable: true,
            flex: 1,
        }));

        // Build row data objects keyed by header fields
        const rows = sheetQueryData.values.slice(1).map((row: any[]) => {
            const rowObj: Record<string, any> = {};
            headers.forEach((header: string, index: number) => {
                rowObj[header] = row[index] ?? '';
            });
            return rowObj;
        });

        setColumnDefs(cols.reverse());
        setRowData(rows);
    }, [sheetQueryData]);

    return (
        <div className="ag-theme-alpine" style={{ height: '80vh', width: '100%' }}>
            <AgGridReact rowData={rowData} columnDefs={columnDefs} domLayout="autoHeight" />
        </div>
    );
};

export default Munitions;
