import React, {useEffect, useRef, useMemo, useState} from "react";
import {AgGridReact} from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import GoogleSheetsService from "../services/GoogleSheetsService";
import StatusMessageProps from "./feedbackFromBackendOrUser/StatusMessageProps";
import {useGoogleSheetData} from "./hooks/useGoogleSheetData";
import {DEFAULT_SPREADSHEET_ID_EQUIPMENT} from "../constants";

interface EquipmentProps {
    accessToken: string;
    selectedSheet: {
        name: string;
        range: string;
        id: number;
    };
}

const Equipment: React.FC<EquipmentProps> = ({accessToken, selectedSheet}) => {
    if (selectedSheet.name === 'פלסם') {
        type ItemRow = { itemName: string; amount: number };

            const [bundleId, setBundleId] = useState("");
            const [fullName, setFullName] = useState("");
            const [serial, setSerial] = useState("");
            const [items, setItems] = useState<ItemRow[]>([{ itemName: "", amount: 0 }]);
            const [bundleName, setBundleName] = useState("");


        const [signedData, setSignedData] = useState<any[][]>([]);

            const [bundleIdToCredit, setBundleIdToCredit] = useState("");
            const [serialToCredit, setSerialToCredit] = useState("");
            const [itemToCredit, setItemToCredit] = useState("");

            const sheetName = encodeURIComponent(selectedSheet.range);

            // Fetch signed data from Google Sheets
            const fetchSignedData = async () => {
                const url = `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_SPREADSHEET_ID_EQUIPMENT}/values/${sheetName}`;
                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                const json = await res.json();
                setSignedData(json.values || []);
            };

            useEffect(() => {
                fetchSignedData();
            }, [sheetName]);

            // Handle item input changes
            const handleItemChange = (
                index: number,
                field: "itemName" | "amount",
                value: string | number
            ) => {
                setItems((prev) =>
                    prev.map((item, i) =>
                        i === index
                            ? { ...item, [field]: field === "amount" ? Number(value) : value }
                            : item
                    )
                );
            };

            const addItemRow = () => setItems((prev) => [...prev, { itemName: "", amount: 0 }]);
            const removeItemRow = (index: number) =>
                setItems((prev) => prev.filter((_, i) => i !== index));

            // Handle signing a bundle
        const handleSignBundle = async () => {
            if (!bundleId.trim()) {
                alert("נא להזין מספר מזהה חבילה");
                return;
            }
            if (!bundleName.trim()) {
                alert("נא להזין שם חבילה");
                return;
            }
            if (!fullName.trim() || !serial.trim()) {
                alert("נא למלא שם מלא ומספר אישי");
                return;
            }

            const usedBundleId = bundleId.trim();

            // Check if bundle ID already exists
            const existingBundleIds = signedData.slice(1).map((row) => row[0]);
            if (existingBundleIds.includes(usedBundleId)) {
                alert(`המזהה '${usedBundleId}' כבר קיים. נא להזין מזהה ייחודי.`);
                return;
            }

            // ✅ FIXED: define filteredItems here
            const filteredItems = items.filter(
                ({ itemName, amount }) => itemName.trim() && amount > 0
            );

            if (filteredItems.length === 0) {
                alert("נא להזין לפחות פריט אחד עם שם וכמות חוקיים");
                return;
            }

            const timestamp = new Date().toLocaleString("sv-IL");

            const rowsToAppend = filteredItems.map(({ itemName, amount }) => [
                usedBundleId,
                itemName,
                amount,
                fullName,
                serial,
                bundleName.trim(),
                timestamp,
            ]);

            const url = `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_SPREADSHEET_ID_EQUIPMENT}/values/${sheetName}:append?valueInputOption=USER_ENTERED`;
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ values: rowsToAppend }),
            });

            if (res.ok) {
                alert(`החתימה נשמרה עם מזהה חבילה: ${usedBundleId}`);
                setBundleId("");
                setBundleName("");
                setFullName("");
                setSerial("");
                setItems([{ itemName: "", amount: 0 }]);
                fetchSignedData();
            } else {
                const err = await res.json();
                console.error(err);
                alert("שגיאה בשליחת החתימה");
            }
        };

        // General credit function with filter
            const creditRows = async (filterFn: (row: any[]) => boolean) => {
                if (signedData.length < 2) return alert("אין נתונים לזיכוי");

                const headers = signedData[0];
                const remainingRows = signedData.slice(1).filter((row) => !filterFn(row));
                const updatedValues = [headers, ...remainingRows];

                const url = `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_SPREADSHEET_ID_EQUIPMENT}/values/${sheetName}?valueInputOption=RAW`;
                const res = await fetch(url, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ values: updatedValues }),
                });

                if (res.ok) {
                    alert("זיכוי בוצע בהצלחה");
                    fetchSignedData();
                    setBundleIdToCredit("");
                    setSerialToCredit("");
                    setItemToCredit("");
                } else {
                    const err = await res.json();
                    console.error(err);
                    alert("שגיאה בזיכוי");
                }
            };

            // Credit handlers
            const handleCreditByBundleId = () => {
                if (!bundleIdToCredit.trim()) return alert("נא להזין מזהה חבילה");
                creditRows((row) => row[0] === bundleIdToCredit.trim());
            };

            const handleCreditAllBySerial = () => {
                if (!serialToCredit.trim()) return alert("נא להזין מספר אישי");
                creditRows((row) => row[4] === serialToCredit.trim());
            };

            const handleCreditSpecificItem = () => {
                if (!serialToCredit.trim() || !itemToCredit.trim())
                    return alert("נא להזין מספר אישי וסוג פריט");
                creditRows((row) => row[4] === serialToCredit.trim() && row[1] === itemToCredit.trim());
            };

        const headers =
            signedData[0] || [
                "מזהה חבילה",
                "פריט",
                "כמות",
                "חייל חותם",
                "מספר אישי",
                "שם חבילה",
                "זמן ביצוע",
            ];


        return (
                <div className="p-4 max-w-5xl mx-auto space-y-8">
                    {/* Sign bundle form */}
                    <section className="border rounded p-4">
                        <h2 className="text-xl font-bold mb-4">טופס חתימת חבילה</h2>
                        <input
                            type="text"
                            placeholder="מספר מזהה חבילה (מספר בלבד)"
                            className="border p-2 w-full mb-3"
                            value={bundleId}
                            onChange={(e) => setBundleId(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="שם חבילה"
                            className="border p-2 w-full mb-3"
                            value={bundleName}
                            onChange={(e) => setBundleName(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="שם מלא"
                            className="border p-2 w-full mb-3"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="מספר אישי"
                            className="border p-2 w-full mb-3"
                            value={serial}
                            onChange={(e) => setSerial(e.target.value)}
                        />

                        {items.map((item, idx) => (
                            <div key={idx} className="flex gap-2 mb-2 items-center">
                                <input
                                    type="text"
                                    placeholder="שם פריט"
                                    className="border p-2 flex-grow"
                                    value={item.itemName}
                                    onChange={(e) => handleItemChange(idx, "itemName", e.target.value)}
                                />
                                <input
                                    type="number"
                                    min={0}
                                    placeholder="כמות"
                                    className="border p-2 w-24 text-center"
                                    value={item.amount}
                                    onChange={(e) => handleItemChange(idx, "amount", e.target.value)}
                                />
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        className="bg-red-600 text-white px-3 py-1 rounded"
                                        onClick={() => removeItemRow(idx)}
                                        aria-label={`Remove item row ${idx + 1}`}
                                    >
                                        הסר
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
                            onClick={addItemRow}
                        >
                            הוסף פריט נוסף
                        </button>

                        <button
                            type="button"
                            className="bg-green-600 text-white px-6 py-2 rounded w-full"
                            onClick={handleSignBundle}
                        >
                            שלח חתימת חבילה
                        </button>
                    </section>

                    {/* Credit Section */}
                    <section className="border rounded p-4">
                        <h2 className="text-xl font-bold mb-4">זיכוי חתימות</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
                            <div>
                                <label className="block mb-1">זיכוי לפי מזהה חבילה</label>
                                <input
                                    type="text"
                                    placeholder="מזהה חבילה"
                                    className="border p-2 w-full"
                                    value={bundleIdToCredit}
                                    onChange={(e) => setBundleIdToCredit(e.target.value)}
                                />
                                <button
                                    onClick={handleCreditByBundleId}
                                    className="bg-red-600 text-white px-3 py-2 mt-2 rounded w-full"
                                >
                                    זכה חבילה שלמה
                                </button>
                            </div>

                            <div>
                                <label className="block mb-1">זיכוי כל הפריטים לפי מספר אישי</label>
                                <input
                                    type="text"
                                    placeholder="מספר אישי"
                                    className="border p-2 w-full"
                                    value={serialToCredit}
                                    onChange={(e) => setSerialToCredit(e.target.value)}
                                />
                                <button
                                    onClick={handleCreditAllBySerial}
                                    className="bg-orange-600 text-white px-3 py-2 mt-2 rounded w-full"
                                >
                                    זכה כל המספר האישי
                                </button>
                            </div>

                            <div>
                                <label className="block mb-1">זיכוי פריט ספציפי לפי מספר אישי</label>
                                <input
                                    type="text"
                                    placeholder="מספר אישי"
                                    className="border p-2 mb-2 w-full"
                                    value={serialToCredit}
                                    onChange={(e) => setSerialToCredit(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="סוג פריט"
                                    className="border p-2 w-full"
                                    value={itemToCredit}
                                    onChange={(e) => setItemToCredit(e.target.value)}
                                />
                                <button
                                    onClick={handleCreditSpecificItem}
                                    className="bg-yellow-600 text-white px-3 py-2 mt-2 rounded w-full"
                                >
                                    זכה פריט מסוים
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Signed Data Table */}
                    <section className="border rounded p-4 ag-theme-alpine" style={{ height: 400, width: "100%" }}>
                        <h2 className="text-xl font-bold mb-4 text-center">חתימות קיימות</h2>
                        <AgGridReact
                            rowData={signedData.slice(1).map((row) =>
                                Object.fromEntries(
                                    headers.map((header, i) => [header, row[i] ?? ""])
                                )
                            )}
                            columnDefs={headers.map((header) => ({
                                headerName: header,
                                field: header,
                                filter: "agTextColumnFilter",
                                sortable: true,
                                floatingFilter: true,
                            }))}
                            defaultColDef={{
                                flex: 1,
                                minWidth: 120,
                                filter: true,
                                floatingFilter: true,
                                sortable: true,
                                resizable: true,
                            }}
                            domLayout="autoHeight"
                        />
                    </section>
                </div>
            );
    } else {
        const {
            data: sheetQueryData,
            refetch,
            isLoading
        } = useGoogleSheetData(
            {
                accessToken,
                range: selectedSheet.range,
                isArmory: false
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
                isArmory: false
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
                <form onSubmit={handleCredit}
                      className="space-x-2 rtl:space-x-reverse flex flex-wrap items-center gap-2">
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
                                    return {פריט: item, כמות: qty, "חייל חותם": lastSigner};
                                })}
                            columnDefs={[
                                {
                                    headerName: "חייל חותם",
                                    field: "חייל חותם",
                                    sortable: true,
                                    filter: true,
                                    headerClass: 'rtl-header',
                                    cellStyle: {textAlign: 'center'}
                                },
                                {
                                    headerName: "כמות",
                                    field: "כמות",
                                    sortable: true,
                                    filter: true,
                                    headerClass: 'rtl-header',
                                    cellStyle: {textAlign: 'center'}
                                },
                                {
                                    headerName: "פריט",
                                    field: "פריט",
                                    sortable: true,
                                    filter: true,
                                    headerClass: 'rtl-header',
                                    cellStyle: {textAlign: 'center'}
                                },
                            ]}
                            domLayout="normal"
                            defaultColDef={{resizable: true, sortable: true, filter: true}}
                        />
                    </div>
                </div>

                {/* Main AG Grid aligned right */}
                <div className="flex justify-center items-center min-h-screen">
                    <div className="ag-theme-alpine w-[1000px] h-[30vh] ag-rtl equipment-grid"
                         style={{direction: "rtl"}}>
                        <AgGridReact
                            ref={mainGridRef}
                            rowData={[...sheetData].reverse()}
                            columnDefs={columnDefs}
                            domLayout="normal"
                            defaultColDef={{resizable: true, sortable: true, filter: true}}
                        />
                    </div>
                </div>
            </div>

        );
    }
    ;
}

export default Equipment;
