import React, {useMemo} from 'react';
import {AgGridReact} from 'ag-grid-react';
import {useGoogleSheetData} from './hooks/useGoogleSheetData';
import type {ColDef} from 'ag-grid-community';

// Define interface for the row data structure
interface RowDataType {
  weaponData: Record<string, any>[];
  opticData: Record<string, any>[];
  amralimData: Record<string, any>[];
}

const SHEETS = [
  {name: "פלוגה א", range: "א"},
  {name: "פלוגה ב", range: "ב"},
  {name: "פלוגה ג", range: "ג"},
  {name: "מסייעת", range: "מסייעת"},
  {name: "אלון", range: "אלון"},
  {name: "פלסם", range: "פלסם"},
  {name: "מכלול", range: "מכלול"},
];

const SummaryComponent = ({accessToken}: { accessToken: string }) => {
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
  const {
    data: h,
  } = useGoogleSheetData(
    {
      accessToken,
      range: "טבלת נשקיה"
    },
    {
      processData: false,
      enabled: !!accessToken
    }
  );
  const {
    data: i,
  } = useGoogleSheetData(
    {
      accessToken,
      range: "תקול לסדנא"
    },
    {
      processData: false,
      enabled: !!accessToken
    }
  );

  const allSheets = [a, b, c, d, e, f, g];
  const allSheetsNames = SHEETS.map(s => s.name);

  const rowData = useMemo<RowDataType>(() => {
    if (!weaponQuery.values || !opticQuery.values) return { weaponData: [], opticData: [], amralimData: [] };

    const headers = weaponQuery.values[0] || [];
    const optics = opticQuery.values[0] || [];

    const weaponBody = weaponQuery.values.slice(1);
    const opticBody = opticQuery.values.slice(1);

    const weaponsResult: any[] = [];
    const opticsResult: any[] = [];
    const amralimResult: any[] = [];

    const amralimItems = ["מפרו", "M5", "טריג׳", "שחע", "שחמ", "זאבון", "מיקרון", "עדי", "עכבר", "אקילה X4", "אקילה X6", "ליאור", "עידו", "עמיתמכבים", "כוונת EOTECH"];

    const processType = (nameList: string[], source: 'weapon' | 'optic', resultArray: any[], amralimArray?: any[]) => {
      nameList.forEach(type => {
        const isAmralim = source === 'optic' && amralimItems.includes(type);

        const targetArray = isAmralim && amralimArray ? amralimArray : resultArray;

        const row: Record<string, any> = {name: type};
        let total = 0;
        let storedCount = 0;

        allSheets.forEach((sheetQuery, idx) => {
          const sheet = sheetQuery?.values || [];
          const headerRow = sheet[0] || [];
          const body = sheet.slice(1);
          let count = 0;

          if (source === 'weapon') {
            const weaponColIndex = headerRow.indexOf('סוג נשק');
            const commentColIndex = headerRow.indexOf('הערות');
            let unitCount = 0;
            let unitStored = 0;
            if (weaponColIndex !== -1) {

              body.forEach((row: { [x: string]: string; }) => {
                const weapon = row[weaponColIndex];
                const comment = commentColIndex !== -1 ? row[commentColIndex]?.trim() : '';

                if (weapon === type) {
                  if (comment === 'מאופסן')
                    unitStored++;
                  // else
                  unitCount++;
                }

              });

              row[allSheetsNames[idx]] = unitCount;
              total += unitCount;
              storedCount += unitStored;
            }
          } else {
            if (["M5", "מפרו", "מארס"].includes(type)) {
              const opticColumnIndex = headerRow.indexOf('כוונת');
              if (opticColumnIndex !== -1) {
                count = body.filter((row: {
                  [x: string]: string;
                }) => row[opticColumnIndex]?.trim() === type).length;
              }
            } else {
              const opticColIndex = headerRow.indexOf(type);
              if (opticColIndex !== -1) {
                count = body.filter((row: {
                  [x: string]: string;
                }) => row[opticColIndex]?.trim()).length;
              }
            }
            row[allSheetsNames[idx]] = count;
            total += count;
          }
        });

        row['מנופק'] = total;

        let stockCount = 0;
        const stockColIndex = (source === 'weapon' ? headers.indexOf(type) : optics.indexOf(type));
        const stockSource = source === 'weapon' ? weaponBody : opticBody;

        if (stockColIndex !== -1) {
          stockCount = stockSource.filter((row: {
            [x: string]: string;
          }) => row[stockColIndex]?.trim()).length;
        }

        row['במלאי'] = stockCount;
        row["תקול לסדנא"] = (() => {
          const tikulHeader = i?.values?.[0] || [];
          const tikulBody = i?.values?.slice(1) || [];
          const tikulIndex = tikulHeader.indexOf(type);

          if (tikulIndex === -1) return 0;

          return tikulBody.filter((r: any) => r[tikulIndex]?.trim()).length;
        })();
        row['מאופסן'] = storedCount;
        // row['סה"כ'] = total + stockCount + row["תקול לסדנא"] + storedCount;
        row['סה"כ'] = total + stockCount + row["תקול לסדנא"];

        row['חתימה'] = (() => {
          const summarySheetHeader = h?.values?.[0] || [];
          const summarySheetBody = h?.values?.slice(1) || [];
          const nameIndex = summarySheetHeader.indexOf('שם אמצעי');
          const hatimaIndex = summarySheetHeader.indexOf('חתימה');

          if (nameIndex === -1 || hatimaIndex === -1) return 0;
          const matchedRow = summarySheetBody.find((r: { [x: string]: string; }) => r[nameIndex] === type);
          return Number(matchedRow?.[hatimaIndex]) || 0;
        })();

        row["תקול לסדנא"] = (() => {
          const tikulHeader = i?.values?.[0] || [];
          const tikulBody = i?.values?.slice(1) || [];
          const tikulIndex = tikulHeader.indexOf(type);

          if (tikulIndex === -1) return 0;

          return tikulBody.filter((r: any) => r[tikulIndex]?.trim()).length;
        })();

        row['פער'] = row['סה"כ'] - row['חתימה'];

        targetArray.push(row);
      });
    };

    processType(headers, 'weapon', weaponsResult);
    processType(optics, 'optic', opticsResult, amralimResult);

    const weaponStockRow: Record<string, any> = {name: 'מלאי'};
    weaponsResult.forEach(row => {
      const name = row.name;
      let count = 0;

      const weaponColIndex = headers.indexOf(name);
      if (weaponColIndex !== -1) {
        count += weaponBody.filter((row: { [x: string]: string; }) => row[weaponColIndex]?.trim()).length;
      }
      weaponStockRow[name] = count;
    });

    const opticStockRow: Record<string, any> = {name: 'מלאי'};
    opticsResult.forEach(row => {
      const name = row.name;
      let count = 0;

      const opticColIndex = optics.indexOf(name);
      if (opticColIndex !== -1) {
        count += opticBody.filter((row: { [x: string]: string; }) => row[opticColIndex]?.trim()).length;
      }
      opticStockRow[name] = count;
    });

    const amralimStockRow: Record<string, any> = {name: 'מלאי'};
    amralimResult.forEach(row => {
      const name = row.name;
      let count = 0;

      const amralimColIndex = optics.indexOf(name);
      if (amralimColIndex !== -1) {
        count += opticBody.filter((row: { [x: string]: string; }) => row[amralimColIndex]?.trim()).length;
      }
      amralimStockRow[name] = count;
    });

    return {
      weaponData: [weaponStockRow, ...weaponsResult],
      opticData: [opticStockRow, ...opticsResult],
      amralimData: [amralimStockRow, ...amralimResult]
    };
  }, [
    weaponQuery.values,
    opticQuery.values,
    ...allSheets.map(q => q?.values?.toString() || '')
  ]);


  const createColumnDefs = (): ColDef<any>[] => {
    const columns: ColDef<any>[] = [
      {
        headerName: 'שם אמצעי',
        field: 'name',
        pinned: 'right',
        width: 130, //
        cellStyle: {textAlign: 'right'},
        headerClass: 'ag-right-aligned-header'
      },
      ...SHEETS.map(s => ({
        headerName: s.name,
        field: s.name,
        type: 'numericColumn',
        width: 85, //
        cellStyle: {textAlign: 'center'},
        headerClass: 'ag-right-aligned-header'
      })),
      {
        headerName: 'מנופק',
        field: 'מנופק',
        type: 'numericColumn',
        width: 70,
        cellStyle: {textAlign: 'center', backgroundColor: '#fff7d1'},
        headerClass: 'ag-right-aligned-header'
      },
      {
        headerName: 'במלאי',
        field: 'במלאי',
        type: 'numericColumn',
        width: 72,
        cellStyle: {textAlign: 'center'},
        headerClass: 'ag-right-aligned-header'
      },
      {
        headerName: 'מאופסן',
        field: 'מאופסן',
        type: 'numericColumn',
        width: 80,
        cellStyle: {textAlign: 'center'},
        headerClass: 'ag-right-aligned-header',
      },
      {
        headerName: 'סדנא',
        field: 'תקול לסדנא',
        type: 'numericColumn',
        width: 70,
        cellStyle: {textAlign: 'center'},
        headerClass: 'ag-right-aligned-header'
      },
      {
        headerName: 'סה"כ',
        field: 'סה"כ',
        type: 'numericColumn',
        width: 70,
        cellStyle: {textAlign: 'center', fontWeight: 'bold'},
        headerClass: 'ag-right-aligned-header'
      },
      {
        headerName: 'חתימה',
        field: 'חתימה',
        type: 'numericColumn',
        width: 80,
        cellStyle: {textAlign: 'center', backgroundColor: '#fff7d1'},
        headerClass: 'ag-right-aligned-header',
      },
      {
        headerName: 'פער',
        field: 'פער',
        type: 'numericColumn',
        width: 70,
        cellStyle: (params) => {
          const val = Number(params.value);
          return {
            color: val < 0 ? 'red' : 'green',
            fontWeight: 'bold',
            textAlign: 'center'
          };
        },
        headerClass: 'ag-right-aligned-header',
      },
    ];
    return columns.reverse();
  };

  const weaponColumnDefs = useMemo(() => createColumnDefs(), []);
  const opticColumnDefs = useMemo(() => createColumnDefs(), []);
  const amralimColumnDefs = useMemo(() => createColumnDefs(), []);

  return (
    <div className="overflow-x-auto">
      <h2 className="text-xl font-bold text-center mb-4 rtl">טבלת נשקים</h2>
      <div
        className="ag-theme-alpine w-full h-[40vh] ag-rtl mb-8"
        style={{ direction: 'rtl' }}
      >
        <AgGridReact
          rowData={rowData.weaponData}
          columnDefs={weaponColumnDefs}
          rowHeight={20}
          domLayout="normal"
          headerHeight={25}
          defaultColDef={{
            resizable: true,
          }}
        />
      </div>

      <h2 className="text-xl font-bold text-center mb-4 rtl">טבלת אמרלים</h2>
      <div
        className="ag-theme-alpine w-full h-[40vh] ag-rtl mb-8"
        style={{ direction: 'rtl' }}
      >
        <AgGridReact
          rowData={rowData.amralimData}
          columnDefs={amralimColumnDefs}
          rowHeight={20}
          domLayout="normal"
          headerHeight={25}
          defaultColDef={{
            resizable: true,
          }}
        />
      </div>

      <h2 className="text-xl font-bold text-center mb-4 rtl">טבלת אופטיקה</h2>
      <div
        className="ag-theme-alpine w-full h-[100vh] ag-rtl"
        style={{ direction: 'rtl' }}
      >
        <AgGridReact
          rowData={rowData.opticData}
          columnDefs={opticColumnDefs}
          rowHeight={20}
          domLayout="normal"
          headerHeight={25}
          defaultColDef={{
            resizable: true,
          }}
        />
      </div>
    </div>
  );
};

export default SummaryComponent;