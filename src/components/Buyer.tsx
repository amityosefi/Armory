import React, { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import GoogleSheetsService from "../services/GoogleSheetsService";
import { useGoogleSheetData } from "./hooks/useGoogleSheetData";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {usePermissions} from "@/contexts/PermissionsContext";

const STATUSES = ['הזמנה', 'החתמה', 'התעצמות'] as const;

interface BuyerProps {
    accessToken: string;
    selectedSheet: {
        name: string;
        range: string;
        id: number;
    };
}

const Buyer: React.FC<BuyerProps> = ({ accessToken, selectedSheet }) => {
    const { permissions } = usePermissions();

    const { data: sheetQueryData, refetch } = useGoogleSheetData(
        { accessToken, range: selectedSheet.range, isArmory: false },
        { processData: false, enabled: !!accessToken }
    );

    // Dialog open state
    const [open, setOpen] = useState(false);

    // Form items state (dynamic rows)
    const defaultItem = { פריט: '', מידה: '', כמות: 1, צורך: 'ניפוק', הערה: '' };
    const [items, setItems] = useState([{ ...defaultItem }]);

    // Parse sheet data to objects
    const parsedData = useMemo(() => {
        if (!sheetQueryData?.values?.length) return [];
        const [headers, ...rows] = sheetQueryData.values;
        return rows.map((row: { [x: string]: string; }) =>
            headers.reduce((acc: { [x: string]: string; }, key: string | number, idx: string | number) => {
                acc[key] = row[idx] ?? "";
                return acc;
            }, {} as Record<string, string>)
        );
    }, [sheetQueryData]);

    // Group data by סטטוס
    const dataByStatus = useMemo(() => {
        const grouped = { הזמנה: [], החתמה: [], התעצמות: [] } as Record<string, typeof parsedData>;
        for (const row of parsedData) {
            if (STATUSES.includes(row['סטטוס'] as any)) grouped[row['סטטוס']]?.push(row);
        }
        return grouped;
    }, [parsedData]);

    // Disable send if any פריט empty
    const isSendDisabled = items.some(item => !item.פריט.trim());

    // Form handlers
    const handleChange = (index: number, field: keyof typeof defaultItem, value: any) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[index][field] = field === 'כמות' ? Number(value) : value;
        setItems(newItems);
    };
    const addItemRow = () => setItems([...items, { ...defaultItem }]);
    const removeItemRow = (index: number) => setItems(items.filter((_, i) => i !== index));

    // Submit form: append new rows with סטטוס = "הזמנה"
    const handleSubmit = async () => {
        const timestamp = new Date().toLocaleString('he-IL');
        const rows = items.map(item => [
            timestamp,
            '', // מק"ט empty for now
            item.פריט,
            item.מידה,
            item.כמות.toString(),
            item.צורך,
            item.הערה,
            'הזמנה',
        ]);

        try {
            // @ts-ignore
            await GoogleSheetsService.updateCalls({
                accessToken,
                updates: [],
                appendSheetId: selectedSheet.id,
                appendValues: rows,
                isArmory: false,
            });
            setItems([{ ...defaultItem }]);
            setOpen(false);
            refetch();
        } catch (error) {
            console.error('Error submitting to Google Sheet:', error);
        }
    };

    // AG Grid columns including editable סטטוס dropdown
    const columns = [
        { headerName: 'תאריך', field: 'תאריך', sortable: true, filter: true, width: 160,},
        { headerName: 'פריט', field: 'פריט', sortable: true, filter: true, width: 170,},
        { headerName: 'מידה', field: 'מידה', sortable: true, filter: true, width: 130,},
        { headerName: 'כמות', field: 'כמות', sortable: true, filter: true, width: 80,},
        { headerName: 'צורך', field: 'צורך', sortable: true, filter: true, width: 130,},
        { headerName: 'הערה', field: 'הערה', sortable: true, filter: true, width: 130,},
        {
            headerName: 'סטטוס',
            field: 'סטטוס',
            sortable: true,
            filter: true,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: { values: STATUSES },
            onCellValueChanged: async (params: { data: any; newValue: any; }) => {
                const rowData = params.data;
                const date = rowData['תאריך'];
                const item = rowData['פריט'];

                const sheetRows = sheetQueryData?.values || [];
                let rowIndexToUpdate = -1;
                for (let i = 1; i < sheetRows.length; i++) {
                    if (sheetRows[i][0] === date && sheetRows[i][2] === item) {
                        rowIndexToUpdate = i;
                        break;
                    }
                }
                if (rowIndexToUpdate === -1) {
                    console.error("Could not find row to update");
                    return;
                }

                try {
                    const colIndex = 7; // סטטוס column index in sheet
                    await GoogleSheetsService.updateCalls({
                        accessToken,
                        updates: [{
                            sheetId: selectedSheet.id,
                            rowIndex: rowIndexToUpdate,
                            colIndex,
                            value: params.newValue
                        }],
                        isArmory: false,
                    });
                    refetch();
                } catch (e) {
                    console.error("Failed to update status in sheet", e);
                }
            }
        }
    ];

    // Render one table by status
    const renderTable = (status: typeof STATUSES[number]) => (
        <div key={status} className="mb-8">
            <h2 className="text-lg font-bold mb-2">{`טבלת ${status} של הפלוגה`}</h2>
            <div className="ag-theme-alpine w-full h-[20vh] ag-rtl">
                <AgGridReact
                    columnDefs={columns}
                    rowData={dataByStatus[status]}
                    defaultColDef={{ resizable: true }}
                    domLayout="autoHeight"
                    animateRows
                    stopEditingWhenCellsLoseFocus={true}
                    enableRtl={true}
                />
            </div>
        </div>
    );

    return (
        <div className="rtl p-4 text-right">
            {permissions[selectedSheet.range] && (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogHeader>
                        <DialogTitle>תפעול לוגיסטי פלוגתי - {selectedSheet.name}</DialogTitle>
                        <DialogDescription>שלח פריטים להזמנה לצורך ביצוע הזמנה</DialogDescription>
                    </DialogHeader>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" variant="default">
                            שלח פריטים להזמנה
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl overflow-auto max-h-[120vh] space-y-4">
                        {items.map((item, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <Input
                                    placeholder="הערה"
                                    value={item.הערה}
                                    onChange={e => handleChange(index, 'הערה', e.target.value)}
                                />
                                <Select value={item.צורך} onValueChange={value => handleChange(index, 'צורך', value)}>
                                    <SelectTrigger><SelectValue placeholder="צורך" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ניפוק">ניפוק</SelectItem>
                                        <SelectItem value="בלאי">בלאי</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    placeholder="כמות"
                                    min={1}
                                    value={item.כמות}
                                    onChange={e => handleChange(index, 'כמות', e.target.value)}
                                />
                                <Input
                                    placeholder="מידה"
                                    value={item.מידה}
                                    onChange={e => handleChange(index, 'מידה', e.target.value)}
                                />
                                <Input
                                    placeholder="פריט"
                                    value={item.פריט}
                                    onChange={e => handleChange(index, 'פריט', e.target.value)}
                                    required
                                />
                                <button onClick={() => removeItemRow(index)} className="text-red-600 hover:text-red-900">🗑️</button>
                            </div>
                        ))}
                        <Button
                            className="border-blue-600 text-blue-600 hover:bg-blue-100"
                            variant="outline"
                            onClick={addItemRow}
                        >
                            הוסף פריט
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={handleSubmit}
                            disabled={isSendDisabled}
                        >
                            שלח
                        </Button>
                    </DialogContent>
                </Dialog>
            )}
            {permissions[selectedSheet.range] || permissions['Logistic'] && STATUSES.map(renderTable)}
        </div>
    );
};

export default Buyer;
