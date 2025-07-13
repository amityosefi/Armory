import React, {useEffect, useRef, useMemo, useState} from "react";
import {AgGridReact} from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import GoogleSheetsService from "../services/GoogleSheetsService";
import StatusMessageProps from "./feedbackFromBackendOrUser/StatusMessageProps";
import {useGoogleSheetData} from "./hooks/useGoogleSheetData";

interface EquipmentProps {
    accessToken: string;
    selectedSheet: {
        name: string;
        range: string;
        id: number;
    };
}

const Equipment: React.FC<EquipmentProps> = ({accessToken, selectedSheet}) => {
    const {
        data: sheetQueryData,
        refetch,
        isLoading
    } = useGoogleSheetData(
        {
            accessToken,
            range: selectedSheet.range
        },
        {
            processData: false,
            enabled: !!accessToken
        }
    );
    const summaryGridRef = useRef<any>(null);
    const mainGridRef = useRef<any>(null);

    const [columnDefs, setColumnDefs] = useState<any[]>([]);
    const [sheetData, setSheetData] = useState<any[]>([]);
    const [showMessage, setShowMessage] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [message, setMessage] = useState('');
    const [itemOptions, setItemOptions] = useState<string[]>([]);

    useEffect(() => {
        if (sheetQueryData && !isLoading) {
            if (!sheetQueryData.values?.length) {
                setSheetData([]);
                setColumnDefs([]);
                return;
            }

            const {columnDefs: cols, rowData} = GoogleSheetsService.processSheetData(sheetQueryData);

            const alignedCols = cols.map((col: { field: string }) => ({
                ...col,
                width: col.field === "פריט" ? 180 : undefined,
                flex: col.field === "פריט" ? 0 : undefined,
                headerClass: 'rtl-header',
                cellStyle: {textAlign: 'center'},
            }));

            setColumnDefs(alignedCols.reverse());

            const processed = rowData.map((row: any, index: number) => ({
                ...row,
                rowRealIndex: index
            }));
            setSheetData(processed);
        }
    }, [sheetQueryData, isLoading]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (mainGridRef.current) {
                const gridBody = mainGridRef.current.api?.gridBodyCtrl?.eBodyHorizontalScrollViewport;
                if (gridBody) {
                    gridBody.scrollLeft = gridBody.scrollWidth;
                }
            }
        }, 100);
        return () => clearTimeout(timeout);
    }, [columnDefs, sheetData]);



    const itemBalances = useMemo(() => {
        const balances: Record<string, number> = {};
        const itemsSet = new Set<string>();

        sheetData.forEach(row => {
            const item = row["פריט"];
            const qty = Number(row["כמות"]) || 0;
            if (!item) return;
            itemsSet.add(item);
            balances[item] = (balances[item] || 0) + qty;
        });

        setItemOptions(Array.from(itemsSet));
        return balances;
    }, [sheetData]);

    const addRowToSheet = async (row: any[]) => {
        const msg = 'פריט חדש נוסף';
        if (!row) return;
        row[1] = String(row[1]);

        const response = await GoogleSheetsService.updateCalls({
            accessToken: accessToken,
            updates: [],
            appendSheetId: selectedSheet.id,
            appendValues: [row],
        });

        setShowMessage(true);
        setIsSuccess(response);
        setMessage(response ? msg : `בעיה בהחתמת פריט`);
        if (response) refetch();
    };

    const handleSign = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const item = form.item.value.trim();
        const quantity = Number(form.quantity.value);
        const signer = form.signer.value.trim();
        const signedBy = form.signedBy.value.trim();
        const timestamp = new Date().toLocaleString('he-IL');

        if (!item || !quantity || !signer || !signedBy) {
            alert("נא למלא את כל השדות");
            return;
        }

        const row = [item, quantity, signer, signedBy, timestamp];
        await addRowToSheet(row);
        form.reset();
    };

    const handleCredit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const item = form.creditItem.value.trim();
        const quantity = Number(form.creditQuantity.value);
        const signedAmount = itemBalances[item] || 0;
        const timestamp = new Date().toLocaleString('he-IL');
        const signer = form.signer.value.trim();
        const signedBy = form.signedBy.value.trim();

        if (!item || !quantity || !signer || !signedBy) {
            alert("נא למלא את כל השדות כולל חותם ומחתים");
            return;
        }

        if (quantity > signedAmount) {
            alert("אי אפשר לזכות יותר ממה שחתמו");
            return;
        }

        const row = [item, -quantity, signer, signedBy, timestamp];
        await addRowToSheet(row);
        form.reset();
    };

    return (
        <div className="space-y-4">
            {showMessage && (
                <StatusMessageProps isSuccess={isSuccess} message={message} onClose={() => setShowMessage(false)}/>
            )}

            {/* Signing Form with ComboBox */}
            <form onSubmit={handleSign} className="space-x-2 rtl:space-x-reverse flex flex-wrap items-center gap-2">
                <input list="items" name="item" placeholder="פריט" className="border px-2 py-1 rounded"/>
                <datalist id="items">
                    {itemOptions.map((item, i) => (
                        <option key={i} value={item}/>
                    ))}
                </datalist>
                <input name="quantity" placeholder="כמות" type="number" className="border px-2 py-1 rounded"/>
                <input name="signer" placeholder="חייל חותם" className="border px-2 py-1 rounded"/>
                <input name="signedBy" placeholder="חייל מחתים" className="border px-2 py-1 rounded"/>
                <button type="submit" className="bg-green-300 px-3 py-1 rounded">חתום</button>
            </form>

            {/* Credit Form */}
            <form onSubmit={handleCredit} className="space-x-2 rtl:space-x-reverse flex flex-wrap items-center gap-2">
                <select name="creditItem" className="border px-2 py-1 rounded">
                    {Object.entries(itemBalances)
                        .filter(([_, qty]) => qty > 0)
                        .map(([item, qty]) => (
                            <option key={item} value={item}>{item} ({qty})</option>
                        ))}
                </select>
                <input name="creditQuantity" placeholder="כמות לזיכוי" type="number"
                       className="border px-2 py-1 rounded"/>
                <input name="signer" placeholder="חייל חותם" className="border px-2 py-1 rounded"/>
                <input name="signedBy" placeholder="חייל מחתים" className="border px-2 py-1 rounded"/>
                <button type="submit" className="bg-red-300 px-3 py-1 rounded">זכה</button>
            </form>

            {/* Summary Table as AG Grid */}
            {/* Summary AG Grid aligned right */}
            <div className="flex justify-center items-center min-h-screen">
                <div className="ag-theme-alpine w-[620px] h-[30vh] ag-rtl">
                    <AgGridReact
                        ref={summaryGridRef}
                        rowData={Object.entries(itemBalances)
                            .filter(([_, qty]) => qty > 0)
                            .map(([item, qty]) => {
                                const lastSigner = [...sheetData]
                                    .reverse()
                                    .find(row => row["פריט"] === item && row["חייל_חותם"])?.["חייל_חותם"] || "";
                                return { פריט: item, כמות: qty, "חייל חותם": lastSigner };
                            })}
                        columnDefs={[
                            {
                                headerName: "חייל חותם",
                                field: "חייל חותם",
                                sortable: true,
                                filter: true,
                                headerClass: 'rtl-header',
                                cellStyle: { textAlign: 'center' }
                            },
                            {
                                headerName: "כמות",
                                field: "כמות",
                                sortable: true,
                                filter: true,
                                headerClass: 'rtl-header',
                                cellStyle: { textAlign: 'center' }
                            },
                            {
                                headerName: "פריט",
                                field: "פריט",
                                sortable: true,
                                filter: true,
                                headerClass: 'rtl-header',
                                cellStyle: { textAlign: 'center' }
                            },
                        ]}
                        domLayout="normal"
                        defaultColDef={{ resizable: true, sortable: true, filter: true }}
                    />
                </div>
            </div>

            {/* Main AG Grid aligned right */}
            <div className="flex justify-center items-center min-h-screen">
                <div className="ag-theme-alpine w-[1000px] h-[20vh] ag-rtl equipment-grid" style={{ direction: "rtl" }}>
                    <AgGridReact
                        ref={mainGridRef}
                        rowData={sheetData}
                        columnDefs={columnDefs}
                        domLayout="normal"
                        defaultColDef={{ resizable: true, sortable: true, filter: true }}
                    />
                </div>
            </div>
        </div>

            );
};

export default Equipment;
