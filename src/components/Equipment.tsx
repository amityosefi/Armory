import React, {useEffect, useMemo, useState} from "react";
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

const SHEET_COLUMNS = ["פריט", "כמות", "חייל חותם", "חייל מחתים", "זמן ביצוע"];

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

    const [columnDefs, setColumnDefs] = useState<any[]>([]);
    const [sheetData, setSheetData] = useState<any[]>([]);
    const [showMessage, setShowMessage] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (sheetQueryData && !isLoading) {
            if (!sheetQueryData.values?.length) {
                setSheetData([]);
                setColumnDefs([]);
                return;
            }

            const { columnDefs: cols, rowData } = GoogleSheetsService.processSheetData(sheetQueryData);

            // Add fixed width and disable flex for first column if exists
            if (cols.length > 0) {
                cols[0] = {
                    ...cols[0],
                    width: 180,
                    flex: 0
                };
            }

            // Map columns to add headerClass and cellStyle, and fix "פריט" column width too
            const alignedCols = cols.map((col: { field: string; }) => {
                if (col.field === "פריט") {
                    return {
                        ...col,
                        width: 180,    // fixed width
                        flex: 0,       // disable flex for fixed width
                        headerClass: 'rtl-header',
                        cellStyle: { textAlign: 'center' },
                    };
                }
                return {
                    ...col,
                    headerClass: 'rtl-header',
                    cellStyle: { textAlign: 'center' },
                };
            });

            // Reverse once, only on the final alignedCols
            setColumnDefs(alignedCols.reverse());

            const processed = rowData.map((row: any, index: number) => ({
                ...row,
                rowRealIndex: index
            }));
            setSheetData(processed);
        }
    }, [sheetQueryData, isLoading]);



    const itemBalances = useMemo(() => {
        const balances: Record<string, number> = {};
        sheetData.forEach(row => {
            const item = row["פריט"];
            const qty = Number(row["כמות"]) || 0;
            if (!item) return;
            balances[item] = (balances[item] || 0) + qty;
        });
        return balances;
    }, [sheetData]);

    const addRowToSheet = async (row: any[]) => {
        const msg = 'פריט חדש נוסף';
        if (!row) return;
        row[1] = String(row[1]);
        console.log(selectedSheet.name)
        console.log(selectedSheet.name)

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

        if (!item || !quantity) {
            alert("נא למלא את כל השדות");
            return;
        }

        if (quantity > signedAmount) {
            alert("אי אפשר לזכות יותר ממה שחתמו");
            return;
        }

        const signer = form.signer.value.trim();
        const signedBy = form.signedBy.value.trim();

        if (!signer || !signedBy) {
            alert("נא למלא גם את שם החותם והמחַתים");
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

            {/* Signing Form */}
            <form onSubmit={handleSign} className="space-x-2 rtl:space-x-reverse">
                <input name="item" placeholder="פריט"/>
                <input name="quantity" placeholder="כמות" type="number"/>
                <input name="signer" placeholder="חייל חותם"/>
                <input name="signedBy" placeholder="חייל מחתים"/>
                <button type="submit" className="bg-green-300 px-3 py-1 rounded">חתום</button>
            </form>

            {/* Credit Form */}
            <form onSubmit={handleCredit} className="space-x-2 rtl:space-x-reverse">
                <select name="creditItem">
                    {Object.entries(itemBalances)
                        .filter(([_, qty]) => qty > 0)
                        .map(([item, qty]) => (
                            <option key={item} value={item}>{item} ({qty})</option>
                        ))}
                </select>
                <input name="creditQuantity" placeholder="כמות לזיכוי" type="number"/>
                <input name="signer" placeholder="חייל חותם"/>
                <input name="signedBy" placeholder="חייל מחתים"/>
                <button type="submit" className="bg-red-300 px-3 py-1 rounded">זכה</button>
            </form>

            {/* Signing Summary Table */}
            <table className="min-w-full border-collapse border border-gray-300 rtl text-right mb-4">
                <thead>
                <tr>
                    <th className="border border-gray-300 px-2 py-1">פריט</th>
                    <th className="border border-gray-300 px-2 py-1">כמות</th>
                </tr>
                </thead>
                <tbody>
                {Object.entries(itemBalances)
                    .filter(([_, qty]) => qty > 0)
                    .map(([item, qty]) => (
                        <tr key={item} className="hover:bg-gray-100">
                            <td className="border border-gray-300 px-2 py-1">{item}</td>
                            <td className="border border-gray-300 px-2 py-1">{qty}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <br/><br/><br/>

            {/* AG Grid Table */
            }
            <div className="ag-theme-alpine w-full h-[70vh] ag-rtl equipment-grid" style={{ direction: "rtl" }}>
                <AgGridReact
                    rowData={sheetData}
                    columnDefs={columnDefs}
                    rowHeight={25}
                    headerHeight={30}
                    domLayout="normal"
                    defaultColDef={{ resizable: true, sortable: true }}
                />
            </div>
        </div>
    )
        ;
};

export default Equipment;
