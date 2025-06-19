import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { useGoogleSheetData } from './hooks/useGoogleSheetData';

const SHEETS = [
    { name: "פלוגה א", range: "א" },
    { name: "פלוגה ב", range: "ב" },
    { name: "פלוגה ג", range: "ג" },
    { name: "מסייעת", range: "מסייעת" },
    { name: "אלון", range: "אלון" },
    { name: "פלסם", range: "פלסם" },
    { name: "מכלול", range: "מכלול" },
];

const SummaryComponent = ({ accessToken }: { accessToken: string }) => {
    const {
        data: weaponQuery,
    } = useGoogleSheetData(
        {
            accessToken,
            range: "מלאי נשקיה"
        },
        {
            processData: false,
            enabled: !!accessToken
        }
    );
    const {
        data: opticQuery,
    } = useGoogleSheetData(
        {
            accessToken,
            range: "מלאי אופטיקה"
        },
        {
            processData: false,
            enabled: !!accessToken
        }
    );
    const {
        data: a,
    } = useGoogleSheetData(
        {
            accessToken,
            range: "א"
        },
        {
            processData: false,
            enabled: !!accessToken
        }
    );
    const {
        data: b,
    } = useGoogleSheetData(
        {
            accessToken,
            range: "ב"
        },
        {
            processData: false,
            enabled: !!accessToken
        }
    );
    const {
        data: c,
    } = useGoogleSheetData(
        {
            accessToken,
            range: "ג"
        },
        {
            processData: false,
            enabled: !!accessToken
        }
    );
    const {
        data: d,
    } = useGoogleSheetData(
        {
            accessToken,
            range: "מסייעת"
        },
        {
            processData: false,
            enabled: !!accessToken
        }
    );
    const {
        data: e,
    } = useGoogleSheetData(
        {
            accessToken,
            range: "אלון"
        },
        {
            processData: false,
            enabled: !!accessToken
        }
    );
    const {
        data: f,
    } = useGoogleSheetData(
        {
            accessToken,
            range: "פלסם"
        },
        {
            processData: false,
            enabled: !!accessToken
        }
    );
    const {
        data: g,
    } = useGoogleSheetData(
        {
            accessToken,
            range: "מכלול"
        },
        {
            processData: false,
            enabled: !!accessToken
        }
    );

    const allSheets = [a, b, c, d, e, f, g];
    const allSheetsNames = SHEETS.map(s => s.name);

    const rowData = useMemo(() => {
        if (!weaponQuery.values || !opticQuery.values) return [];

        const headers = weaponQuery.values[0] || [];
        const optics = opticQuery.values[0] || [];

        const weaponBody = weaponQuery.values.slice(1);
        const opticBody = opticQuery.values.slice(1);

        const result: any[] = [];

        const allItems = [...headers, ...optics];

        const processType = (nameList: string[], source: 'weapon' | 'optic') => {
            nameList.forEach(type => {
                const row: Record<string, any> = { name: type };
                let total = 0;

                allSheets.forEach((sheetQuery, idx) => {
                    const sheet = sheetQuery?.values || [];
                    const headerRow = sheet[0] || [];
                    const body = sheet.slice(1);
                    let count = 0;

                    if (source === 'weapon') {
                        const weaponColIndex = headerRow.indexOf('סוג נשק');
                        if (weaponColIndex !== -1) {
                            count = body.filter(row => row[weaponColIndex] === type).length;
                        }
                    } else {
                        const opticColIndex = headerRow.indexOf(type);
                        if (opticColIndex !== -1) {
                            count = body.filter(row => row[opticColIndex]?.trim()).length;
                        }
                    }

                    row[allSheetsNames[idx]] = count;
                    total += count;
                });

                row['מנופק'] = total;

                let stockCount = 0;
                const stockColIndex = (source === 'weapon' ? headers.indexOf(type) : optics.indexOf(type));
                const stockSource = source === 'weapon' ? weaponBody : opticBody;

                if (stockColIndex !== -1) {
                    stockCount = stockSource.filter(row => row[stockColIndex]?.trim()).length;
                }

                row['במלאי'] = stockCount;
                row['סה"כ'] = total + stockCount;

                row['חתימה'] = 0;
                row['פער'] = 0 - row['סה"כ'];


                result.push(row);
            });
        };

        processType(headers, 'weapon');
        processType(optics, 'optic');

        // ✅ Add the "מלאי" summary row at the top
        const stockRow: Record<string, any> = { name: 'מלאי' };

        result.forEach(row => {
            const name = row.name;
            let count = 0;

            const weaponColIndex = headers.indexOf(name);
            const opticColIndex = optics.indexOf(name);

            if (weaponColIndex !== -1) {
                count += weaponBody.filter(row => row[weaponColIndex]?.trim()).length;
            }
            if (opticColIndex !== -1) {
                count += opticBody.filter(row => row[opticColIndex]?.trim()).length;
            }

            stockRow[name] = count;
        });

        return [stockRow, ...result];
    }, [
        weaponQuery.values,
        opticQuery.values,
        ...allSheets.map(q => q?.values?.toString() || '')
    ]);



    const columnDefs = useMemo(() => {
        const columns = [
            { headerName: 'שם אמצעי', field: 'name', pinned: 'right', minWidth: 150, cellStyle: { textAlign: 'right' }, headerClass: 'ag-right-aligned-header' },
            ...SHEETS.map(s => ({
                headerName: s.name,
                field: s.name,
                type: 'numericColumn',
                cellStyle: { textAlign: 'right' },
                headerClass: 'ag-right-aligned-header'
            })),
            {
                headerName: 'מנופק',
                field: 'מנופק',
                type: 'numericColumn',
                cellStyle: { textAlign: 'right', fontWeight: 'bold' },
                headerClass: 'ag-right-aligned-header'
            },
            {
                headerName: 'במלאי',
                field: 'במלאי',
                type: 'numericColumn',
                cellStyle: { textAlign: 'right', fontWeight: 'bold' },
                headerClass: 'ag-right-aligned-header'
            },
            {
                headerName: 'סה"כ',
                field: 'סה"כ',
                type: 'numericColumn',
                cellStyle: { textAlign: 'right', fontWeight: 'bold' },
                headerClass: 'ag-right-aligned-header'
            },
            {
                headerName: 'חתימה',
                field: 'חתימה',
                editable: true,
                type: 'numericColumn',
                cellStyle: { textAlign: 'right', backgroundColor: '#fff7d1' },
                headerClass: 'ag-right-aligned-header',
                valueParser: (params) => Number(params.newValue) || 0,
            },
            {
                headerName: 'פער',
                field: 'פער',
                type: 'numericColumn',
                valueGetter: (params) => {
                    const hatima = Number(params.data?.חתימה || 0);
                    const total = Number(params.data?.["סה\"כ"] || 0);
                    return hatima - total;
                },
                cellStyle: (params) => {
                    const val = Number(params.value);
                    return {
                        color: val < 0 ? 'red' : 'green',
                        fontWeight: 'bold',
                        textAlign: 'right'
                    };
                },
                headerClass: 'ag-right-aligned-header',
            },
        ];
        return columns.reverse(); // 👈 Mirror the column order
    }, []);


    return (
        <div className="ag-theme-alpine" style={{ height: '600px', width: '100%', direction: 'rtl' }}>
            <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={{
                    resizable: true,
                    sortable: true,
                    flex: 1,
                    cellStyle: { textAlign: 'right' },
                    headerClass: 'ag-right-aligned-header',
                }}
            />

        </div>
    );
};

export default SummaryComponent;