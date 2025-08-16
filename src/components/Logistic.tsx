import React, {useMemo, useState, useRef, useCallback, useEffect} from "react";
import {AgGridReact} from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import GoogleSheetsService from "../services/GoogleSheetsService";
import {useGoogleSheetData} from "./hooks/useGoogleSheetData";

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandSeparator
} from "@/components/ui/command";

import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {usePermissions} from "@/contexts/PermissionsContext";
import SignatureCanvas from "react-signature-canvas";
import {Label} from "@/components/ui/label";
import {Popover, PopoverContent, PopoverTrigger} from "./ui/popover";
import {CaretSortIcon, CheckIcon, PlusCircledIcon} from "@radix-ui/react-icons";
import {cn} from "../lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const STATUSES = ['הזמנה', 'החתמה', 'התעצמות'] as const;

interface LogisticProps {
    accessToken: string;
    selectedSheet: {
        name: string;
        range: string;
        id: number;
    };
}

const Logistic: React.FC<LogisticProps> = ({accessToken, selectedSheet}) => {
    const {permissions} = usePermissions();

    const {data: sheetQueryData, refetch} = useGoogleSheetData(
        {accessToken, range: selectedSheet.range, isArmory: false},
        {processData: false, enabled: !!accessToken}
    );

    // Dialog open state
    const [open, setOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'הזמנה' | 'החתמה'>('הזמנה');
    const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [editedItems, setEditedItems] = useState<any[]>([]);
    const signatureRef = useRef<SignatureCanvas>(null);
    const [signerName, setSignerName] = useState('');
    const [signatureItemPopoverOpen, setSignatureItemPopoverOpen] = useState(false);
    // Form items state (dynamic rows)
    const defaultItem = {פריט: '', מידה: '', כמות: 1, צורך: 'ניפוק', הערה: ''};
    const [items, setItems] = useState([{...defaultItem}]);

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
        const grouped = {הזמנה: [], החתמה: [], התעצמות: []} as Record<string, typeof parsedData>;
        for (const row of parsedData) {
            if (STATUSES.includes(row['סטטוס'] as any)) grouped[row['סטטוס']]?.push(row);
        }
        return grouped;
    }, [parsedData]);

    // Create summary data for החתמה table
    const summarizedSignatureData = useMemo(() => {
        // Get only החתמה data
        const signatureData = dataByStatus['החתמה'] || [];

        if (signatureData.length === 0) {
            return [];
        }

        // Create a map to group by פריט (item) and sum up כמות (quantity)
        const itemSummary = new Map<string, {
            פריט: string,
            מידה: string,
            כמות: number,
            תאריך: string,
            משתמש: string,
            '11': string // שם החותם field
        }>();

        // Process each row
        signatureData.forEach((row: Record<string, string>) => {
            const item = row['פריט'];
            const quantity = isNaN(parseInt(row['כמות'], 10)) ? 0 : parseInt(row['כמות'], 10);

            if (itemSummary.has(item)) {
                // Item exists, update quantity
                const existing = itemSummary.get(item)!;
                existing.כמות += quantity;

                // Keep the latest date
                const existingDate = new Date(existing.תאריך || '').getTime() || 0;
                const currentDate = new Date(row['תאריך'] || '').getTime() || 0;
                if (currentDate > existingDate) {
                    existing.תאריך = row['תאריך'];
                    existing.משתמש = row['משתמש'] || '';
                    existing['11'] = row['11'] || '';
                }
            } else {
                // New item, add to map
                itemSummary.set(item, {
                    פריט: item,
                    מידה: row['מידה'] || '',
                    כמות: quantity,
                    תאריך: row['תאריך'] || '',
                    משתמש: row['משתמש'] || '',
                    '11': row['11'] || ''
                });
            }
        });

        // Convert map to array
        return Array.from(itemSummary.values());
    }, [dataByStatus]);

    // Disable send if any פריט empty
    const isSendDisabled = items.some(item => !item.פריט.trim());

    // Form handlers
    const handleChange = (index: number, field: keyof typeof defaultItem, value: any) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[index][field] = field === 'כמות' ? Number(value) : value;
        setItems(newItems);
    };
    const addItemRow = () => setItems([...items, {...defaultItem}]);
    const removeItemRow = (index: number) => setItems(items.filter((_, i) => i !== index));

    // Handle order form submission
    const handleOrderSubmit = async () => {
        // Filter out items with empty פריט fields
        const validItems = editedItems.filter(item => item.פריט && item.פריט.trim() !== '');
        
        // Skip submission if no valid items
        if (validItems.length === 0) {
            alert('אין פריטים תקינים להוספה. נא למלא לפחות פריט אחד.');
            return;
        }

        const timestamp = new Date().toLocaleString('he-IL');
        const userEmail = localStorage.getItem('userEmail') || '';

        try {
            const rows = validItems.map(item => [
                timestamp,
                '', // מק"ט empty for now
                item.פריט,
                item.מידה,
                String(item.כמות),
                item.צורך || 'ניפוק',
                item.הערה || '',
                'הזמנה', // Status is always הזמנה here
                userEmail, // The user who made the change
                '', // No signature for orders
                '0',
                ''  // Empty signer name for orders
            ]);

            // Submit the form using Google Sheets Service
            await GoogleSheetsService.updateCalls({
                accessToken,
                updates: [],
                appendSheetId: selectedSheet.id,
                appendValues: rows,
                isArmory: false,
            });

            setOpen(false);
            setEditedItems([getEmptyItem()]); // Reset to empty form
            refetch();
            alert('הפריטים נשלחו בהצלחה להזמנה');
        } catch (e) {
            console.error('Error submitting form:', e);
        }
    };

    console.log(permissions['Logistic'])

    // Submit form: append new rows with סטטוס = "הזמנה"
    const handleSubmit = async () => {
        // Filter out items with empty פריט fields
        const validItems = items.filter(item => item.פריט && item.פריט.trim() !== '');
        
        // Skip submission if no valid items
        if (validItems.length === 0) {
            alert('אין פריטים תקינים להוספה. נא למלא לפחות פריט אחד.');
            return;
        }

        const timestamp = new Date().toLocaleString('he-IL');
        const userEmail = localStorage.getItem('userEmail') || '';
        let toTable = 'הזמנה';
        
        if (!permissions['Plugot'])
            toTable = 'החתמה'
        
        const rows = validItems.map(item => [
            timestamp,
            '', // מק"ט empty for now
            item.פריט,
            item.מידה,
            item.כמות.toString(),
            item.צורך,
            item.הערה,
            toTable,
            userEmail, // The user who made the change
            'לא', // Default value for 'נקרא' field
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
            setItems([{...defaultItem}]);
            setOpen(false);
            refetch();
        } catch (error) {
            console.error('Error submitting to Google Sheet:', error);
        }
    };

    // AG Grid columns including editable סטטוס dropdown
    const baseColumns = useMemo(() => {
        return [
            {field: 'תאריך', headerName: 'תאריך', sortable: true, filter: true, width: 160},
            {field: 'פריט', headerName: 'פריט', sortable: true, filter: true, width: 170},
            {field: 'מידה', headerName: 'מידה', sortable: true, filter: true, width: 130},
            {field: 'כמות', headerName: 'כמות', sortable: true, filter: true, width: 80},
            {field: 'צורך', headerName: 'צורך', sortable: true, filter: true, width: 130},
            {field: 'הערה', headerName: 'הערה', sortable: true, filter: true, width: 130},
            {
                field: 'סטטוס',
                headerName: 'סטטוס',
                sortable: true,
                filter: true,
                width: 130,
                editable: permissions['Logistic'],
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: {
                    values: STATUSES
                },
                onCellValueChanged: async (params: any) => {
                    // Don't allow changing to החתמה if צורך is בלאי
                    if (params.newValue === 'החתמה' && params.data['צורך'] === 'בלאי') {
                        // Revert the change
                        params.node.setDataValue('סטטוס', params.oldValue);
                        alert('לא ניתן להעביר פריט בלאי לסטטוס החתמה');
                        return;
                    }

                    // Don't allow changing to התעצמות if נקרא is כן
                    if (params.newValue === 'התעצמות' && params.data['נקרא'] === 'כן') {
                        // Revert the change
                        params.node.setDataValue('סטטוס', params.oldValue);
                        alert('לא ניתן להעביר פריט שנקרא לסטטוס התעצמות');
                        return;
                    }

                    const rowData = params.data;

                    // If changing status to החתמה, show signature dialog
                    if (params.newValue === 'החתמה') {
                        setCurrentItem({...rowData});
                        // Store the original item and the grid node for later reverting if needed
                        setOriginalItem({
                            data: {...rowData},
                            oldValue: params.oldValue,
                            node: params.node
                        });
                        setEditedItems([getEmptyItem()]);
                        setSignatureDialogOpen(true);
                        return;
                    }

                    const date = rowData['תאריך'];
                    const item = rowData['פריט'];
                    const measure = rowData['מידה'];
                    const quantity = rowData['כמות'];
                    const need = rowData['צורך'];
                    const note = rowData['הערה'];
                    const timestamp = new Date().toLocaleString('he-IL');
                    const userEmail = localStorage.getItem('userEmail') || '';

                    // try {
                    //     // Update נקרא status if changing from הזמנה
                    //     if (params.oldValue === 'הזמנה' && params.newValue !== 'הזמנה') {
                    //         // Set נקרא to כן for the original row in הזמנה table
                    //         // Find the exact row in the parsed data and update it
                    //         const originalItem = parsedData.find(item =>
                    //             item['תאריך'] === params.data['תאריך'] &&
                    //             item['פריט'] === params.data['פריט'] &&
                    //             item['סטטוס'] === params.oldValue
                    //         );
                    //
                    //         if (originalItem) {
                    //             originalItem['נקרא'] = 'כן';
                    //         }
                    //     }
                    //
                    //     // Set נקרא to כן when status changes from הזמנה or התעצמות
                    //     // const readStatus = (params.oldValue === 'הזמנה' || params.oldValue === 'התעצמות') ? 'כן' : ;
                    //
                    //     // Create a new row with updated status and user information
                    //     const newRow = [
                    //         timestamp,
                    //         '', // מק"ט empty for now
                    //         item,
                    //         measure,
                    //         quantity.toString(),
                    //         need,
                    //         note,
                    //         params.newValue, // The new status value
                    //         userEmail, // The user who made the change
                    //         rowData['נקרא'], // Set נקרא based on status change
                    //     ];
                    //
                    //     await GoogleSheetsService.updateCalls({
                    //         accessToken,
                    //         updates: [],
                    //         appendSheetId: selectedSheet.id,
                    //         appendValues: [newRow], // Append as a single new row
                    //         isArmory: false,
                    //     });
                    //
                    //     refetch();
                    // } catch (error) {
                    //     console.error('Failed to update cell:', error);
                    // }
                }
            },
        ];
    }, [setCurrentItem, setEditedItems, setSignatureDialogOpen, accessToken, selectedSheet, refetch, parsedData]);

    // Handle signature submission
    const handleSignatureSubmit = async () => {
        if (!signatureRef.current) {
            alert('אנא חתום לפני השליחה');
            return;
        }

        // Filter out items with empty פריט fields
        const validItems = editedItems.filter(item => item.פריט && item.פריט.trim() !== '');
        
        // Skip submission if no valid items
        if (validItems.length === 0) {
            alert('אין פריטים תקינים להוספה. נא למלא לפחות פריט אחד.');
            return;
        }

        const timestamp = new Date().toLocaleString('he-IL');
        const userEmail = localStorage.getItem('userEmail') || '';

        try {
            const pngSignature = signatureRef.current.toDataURL("image/png");
            
            const rows = validItems.map(item => [
                timestamp,
                '', // מק"ט empty for now
                item.פריט,
                item.מידה,
                item.כמות,
                signerName,
                '',
                '',
                userEmail,
                pngSignature,
                '0',
                'החתמה'
            ]);

            // Submit the form using Google Sheets API
            const values = {
                values: rows
            };

            // Make sure all items use the same signature data
            await GoogleSheetsService.updateCalls({
                accessToken,
                updates: [],
                appendSheetId: selectedSheet.id,
                appendValues: rows,
                isArmory: false,
            });

            setSignatureDialogOpen(false);
            setSignerName('');
            if (signatureRef.current) {
                signatureRef.current.clear();
            }
            setEditedItems([getEmptyItem()]); // Reset to empty form
            refetch();
            
            alert('הפריטים נשלחו בהצלחה להחתמה');
        } catch (e) {
            console.error('Error submitting form:', e);
        }
    };

    // Clear the signature pad
    const clearSignature = () => {
        if (signatureRef.current) {
            signatureRef.current.clear();
        }
    };

    // Store the original state before opening the dialog
    const [originalItem, setOriginalItem] = useState<any>(null);

    // Reset form to original state when cancelling
    const handleSignatureCancel = () => {
        // Restore the original state in the UI only (no API calls)
        if (originalItem) {
            // Revert the cell value in the grid to the original value
            originalItem.node.setDataValue('סטטוס', originalItem.oldValue);
            setCurrentItem(originalItem.data);
        }
        
        // Clear form without making any API calls
        setEditedItems([]);
        setSignerName('');
        clearSignature();
        
        // Close dialog
        setSignatureDialogOpen(false);
        
        // No GoogleSheetsService.updateCalls here - changes are only reverted in the UI
    };

    // Function to export החתמה data to PDF
    const exportSignatureToPDF = () => {
        // Get signature data
        const signatureData = dataByStatus['החתמה'] || [];

        if (signatureData.length === 0) {
            alert('אין נתוני החתמה להורדה');
            return;
        }

        try {
            // Create PDF document with RTL support
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Add custom font for Hebrew support if needed
            // This requires additional setup - the basic implementation will use standard fonts

            // Set RTL mode
            pdf.setR2L(true);

            // Add title
            pdf.setFontSize(18);
            pdf.text('נתוני החתמה', pdf.internal.pageSize.width / 2, 15, {align: 'center'});

            let startY = 25;
            const pageHeight = pdf.internal.pageSize.height;
            const margin = 10;

            // Process each signature item
            for (let i = 0; i <signatureData.length; i++) {
                const item = signatureData[i];

                // Check if we need a new page
                if (startY > pageHeight - 60) {
                    pdf.addPage();
                    startY = 15;
                }

                // Create item header with פריט and כמות
                pdf.setFontSize(14);
                pdf.text(`${item['פריט']} - כמות: ${item['כמות']}`, margin, startY);

                startY += 8;

                // Add item details using autoTable
                autoTable(pdf, {
                    startY: startY,
                    head: [['שדה', 'ערך']],
                    body: [
                        ['תאריך', item['תאריך'] || ''],
                        ['מקט', item['מקט'] || ''],
                        ['מידה', item['מידה'] || ''],
                        ['צורך', item['צורך'] || ''],
                        ['הערה', item['הערה'] || ''],
                        ['סטטוס', item['סטטוס'] || ''],
                        ['משתמש', item['משתמש'] || ''],
                        ['שם החותם', item['11'] || '']
                    ],
                    theme: 'grid',
                    headStyles: {
                        halign: 'right',
                        textColor: [0, 0, 0],
                        fillColor: [220, 220, 220]
                    },
                    bodyStyles: {
                        halign: 'right'
                    },
                    tableWidth: 'auto',
                    margin: {right: margin},
                    didDrawPage: (data: { cursor: { y: number } }) => {
                        // Update startY position after table is drawn
                        startY = data.cursor.y + 10;
                    }
                });

                // Check if we need a new page for the signature
                if (startY > pageHeight - 40) {
                    pdf.addPage();
                    startY = 15;
                }

                // Add signature if exists
                if (item['10']) {
                    pdf.setFontSize(12);
                    pdf.text('חתימה:', margin, startY);

                    startY += 5;

                    // Add signature image
                    try {
                        const signatureImg = item['10']; // Base64 image data
                        if (signatureImg && signatureImg.includes('data:image')) {
                            pdf.addImage(
                                signatureImg,
                                'PNG',
                                margin,
                                startY,
                                50,  // width in mm
                                20   // height in mm
                            );
                            startY += 25;
                        }
                    } catch (imgError) {
                        console.error('Error adding signature image:', imgError);
                        pdf.text('(שגיאה בטעינת החתימה)', margin, startY);
                        startY += 10;
                    }
                }

                // Add divider between items
                if (i < signatureData.length - 1) {
                    pdf.setDrawColor(200, 200, 200);
                    pdf.line(margin, startY, pdf.internal.pageSize.width - margin, startY);
                    startY += 10;
                }

                // Add page if needed for next item
                if (i < signatureData.length - 1 && startY > pageHeight - 60) {
                    pdf.addPage();
                    startY = 15;
                }
            }

            // Save PDF
            const fileName = `נתוני_החתמה_${new Date().toLocaleDateString('he-IL').replace(/\//g, '_')}.pdf`;
            pdf.save(fileName);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('שגיאה ביצירת ה-PDF');
        }
    };

    // Function to export all data to Excel (CSV)
    const exportDataToExcel = () => {
        // Get all the data from all statuses
        const allData = parsedData || [];
        
        if (allData.length === 0) {
            alert('אין נתונים להורדה');
            return;
        }
        
        // Get headers from the first row
        const headers = Object.keys(allData[0] || {});
        
        // Create CSV content
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Add headers row
        csvContent += headers.join(',') + "\n";
        
        // Add data rows
        allData.forEach((row: { [x: string]: any; }) => {
            const dataRow = headers.map(header => {
                // Ensure values with commas are properly quoted
                const cellValue = row[header] ? String(row[header]).replace(/"/g, '""') : '';
                return `"${cellValue}"`;
            });
            csvContent += dataRow.join(',') + "\n";
        });
        
        // Create a download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${selectedSheet.name}_${new Date().toLocaleDateString('he-IL')}.csv`);
        document.body.appendChild(link);
        
        // Download the file
        link.click();
        
        // Clean up
        document.body.removeChild(link);
    };

    // Create status-specific columns
    const ordersColumns = [
        ...baseColumns.map(col => {
            // For the סטטוס column, add conditional editing
            if (col.field === 'סטטוס') {
                return {
                    ...col,
                    editable: permissions['Logistic'],
                };
            }
            return col;
        }),
        {
            headerName: 'נקרא',
            field: 'נקרא',
            sortable: true,
            filter: true,
            width: 100,
            editable: permissions['Logistic'],
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {values: ['כן', 'לא']},
            onCellValueChanged: async (params: { data: any; newValue: any; }) => {
                // Handle read status change
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
                    const colIndex = 9; // נקרא column index in sheet (assuming it's the 10th column, 0-indexed)
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
                    console.error("Failed to update read status in sheet", e);
                }
            }
        }
    ];

    // Add נקרא column to התעצמות status
    const armamentColumns = [
        ...baseColumns,
        {
            headerName: 'נקרא',
            field: 'נקרא',
            sortable: true,
            filter: true,
            width: 100,
            editable: permissions['Logistic'],
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {values: ['כן', 'לא']},
            onCellValueChanged: async (params: { data: any; newValue: any; }) => {
                // Handle read status change
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
                    const colIndex = 9; // נקרא column index in sheet (assuming it's the 10th column, 0-indexed)
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
                    console.error("Failed to update read status in sheet", e);
                }
            }
        }
    ];

    // Add columns specific to החתמה status with שם החותם
    const signatureColumns = [
        // Filter out צורך, סטטוס, נקרא, and הערה from baseColumns
        ...baseColumns.filter(col =>
            col.field !== 'צורך' &&
            col.field !== 'סטטוס' &&
            col.field !== 'נקרא' &&
            col.field !== 'הערה'
        ),
        {
            headerName: 'שם החותם',
            field: '11', // Assuming this is the index where signer name is stored
            sortable: true,
            filter: true,
            width: 150,
        }
    ];

    // Define columns for the summarized signature table
    const summarizedSignatureColumns = [
        {field: 'פריט', headerName: 'פריט', sortable: true, filter: true, width: 170},
        {field: 'כמות', headerName: 'כמות (סה"כ)', sortable: true, filter: true, width: 120}
    ];

    // Create a default empty item template
    const getEmptyItem = () => ({
        כמות: 1,
        פריט: "",
        הערה: "",
        מידה: "",
        צורך: "ניפוק"
    });

    // Extract unique signature items
    const uniqueSignatureItems = useMemo(() => {
        // Get unique items from the החתמה data
        const uniqueItems = new Set<string>();
        
        // Add items from החתמה
        dataByStatus['החתמה']?.forEach((item: { [x: string]: string; }) => {
            if (item['פריט']) {
                uniqueItems.add(item['פריט']);
            }
        });
        
        // Convert to array and sort
        return Array.from(uniqueItems).sort();
    }, [dataByStatus]);

    // Track open state of פריט comboboxes
    const [openComboboxes, setOpenComboboxes] = useState<{ [key: number]: boolean }>({});

    const toggleCombobox = (index: number, isOpen: boolean) => {
        setOpenComboboxes(prev => ({
            ...prev,
            [index]: isOpen
        }));
    };

    // Signature form validation - require all fields except מידה
    const isSignatureSubmitDisabled = useMemo(() => {
        return editedItems.some(item => 
            !item.פריט || // פריט is required
            !item.כמות || // כמות is required
            !item.צורך || // צורך is required
            !signerName   // Signer name is required
            // מידה is NOT required
            // הערה (note) is optional
        ) || !signatureRef.current?.toData().length; // Signature is required
    }, [editedItems, signerName, signatureRef]);

    // Render one table by status
    const renderTable = (status: typeof STATUSES[number]) => {
        // Use the appropriate columns based on status
        let columnDefs;
        let rowData;

        switch (status) {
            case 'הזמנה':
                columnDefs = ordersColumns;
                rowData = [...dataByStatus[status]].reverse();
                break;
            case 'התעצמות':
                columnDefs = armamentColumns;
                rowData = [...dataByStatus[status]].reverse();
                break;
            case 'החתמה':
                columnDefs = summarizedSignatureColumns; // Use summarized columns
                rowData = summarizedSignatureData; // Use summarized data
                break;
            default:
                columnDefs = baseColumns;
                rowData = [...dataByStatus[status]].reverse();
        }

        // Row styling function - add light red background for read items
        const getRowStyle = (params: any) => {
            // Apply styling to both התעצמות and הזמנה tables
            if ((status === 'התעצמות' || status === 'הזמנה') && params.data['נקרא'] === 'כן') {
                return {backgroundColor: '#FFCDD2'}; // Light red color
            }
            return undefined;
        };

        return (
            <div key={status} className="mb-8">
                <h2 className="text-lg font-bold mb-2">{`טבלת ${status} של הפלוגה`}</h2>
                <div className="ag-theme-alpine w-full h-[40vh] ag-rtl">
                    <AgGridReact
                        columnDefs={columnDefs}
                        rowData={rowData}
                        defaultColDef={{resizable: true}}
                        domLayout="normal"
                        animateRows
                        stopEditingWhenCellsLoseFocus={true}
                        enableRtl={true}
                        getRowStyle={getRowStyle}
                        pagination={true}
                        paginationPageSize={25}
                        cacheBlockSize={25}
                        rowModelType="clientSide"
                        suppressHorizontalScroll={false}
                        enableCellTextSelection={permissions['Logistic']}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="rtl p-4 text-right">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogHeader>
                    <DialogTitle>{dialogMode === 'הזמנה' ? 'תפעול לוגיסטי פלוגתי' : 'תפעול לוגיסטי פלוגתי - החתמה'}</DialogTitle>
                    {/*<DialogDescription>שלח פריטים להזמנה לצורך ביצוע הזמנה </DialogDescription>*/}
                </DialogHeader>
                {permissions['Logistic'] ? (
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white mr-2"
                            variant="default"
                            onClick={() => {
                                // Store original state before opening dialog
                                setOriginalItem(null); // No original for new items
                                setCurrentItem(null);
                                setEditedItems([getEmptyItem()]);
                                setSignatureDialogOpen(true);
                            }}
                        >
                            שלח פריטים להחתמה
                        </Button>
                    ) :
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        variant="default"
                        onClick={() => {
                            // Store original state before opening dialog
                            setDialogMode('הזמנה');
                            setOriginalItem(null); // No original for new items
                            setCurrentItem(null);
                            setEditedItems([getEmptyItem()]);
                            setOpen(true);
                        }}
                    >
                        שלח פריטים להזמנה
                    </Button>}

                <DialogContent className="max-w-4xl overflow-auto max-h-[85vh] space-y-4 p-4">
                    <DialogDescription className="text-lg font-medium text-center mb-2">
                        {dialogMode === 'הזמנה' ? 'הזן את פרטי הפריטים להזמנה' : 'הזן את פרטי הפריטים הנדרשים להלן'}
                    </DialogDescription>
                    
                    {dialogMode === 'הזמנה' ? (
                        // Order dialog content with multi-row support
                        <>
                            <div className="grid gap-4 py-1 rtl">
                                {editedItems.map((item, index) => (
                                    <div key={index} className="border p-3 rounded-md">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-medium">פריט {index + 1}</h4>
                                            {editedItems.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-2"
                                                    onClick={() => {
                                                        setEditedItems(editedItems.filter((_, i) => i !== index));
                                                    }}
                                                >
                                                    הסר
                                                </Button>
                                            )}
                                        </div>
                                        
                                        <div className="grid gap-3">
                                            <div className="grid grid-cols-2 items-center gap-4">
                                                <Label htmlFor={`item-${index}`}>פריט</Label>
                                                <div className="flex gap-2">
                                                    <select 
                                                        id={`item-${index}`}
                                                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                                                        value={item?.פריט || ""}
                                                        onChange={(e) => {
                                                            const selectedValue = e.target.value;
                                                            const matchingItem = dataByStatus['החתמה']?.find(
                                                                (item: { [x: string]: string; }) => item['פריט'] === selectedValue
                                                            );
                                                            
                                                            setEditedItems(editedItems.map((editedItem, i) => {
                                                                if (i === index) {
                                                                    return {
                                                                        ...editedItem, 
                                                                        פריט: selectedValue,
                                                                        מידה: matchingItem?.['מידה'] || ''
                                                                    };
                                                                }
                                                                return editedItem;
                                                            }));
                                                        }}
                                                    >
                                                        <option value="">בחר פריט</option>
                                                        {uniqueSignatureItems.map((itemName, idx) => (
                                                            <option key={`${itemName}-${idx}`} value={itemName}>
                                                                {itemName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <Input
                                                        placeholder="או הוסף פריט חדש"
                                                        className="max-w-[150px]"
                                                        value={item?.פריט || ''}
                                                        onChange={(e) => {
                                                            setEditedItems(editedItems.map((editedItem, i) => {
                                                                if (i === index) {
                                                                    return {...editedItem, פריט: e.target.value};
                                                                }
                                                                return editedItem;
                                                            }));
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 items-center gap-4">
                                                <Label htmlFor={`measure-${index}`}>מידה</Label>
                                                <Input
                                                    id={`measure-${index}`}
                                                    value={item?.מידה || ''}
                                                    onChange={(e) => {
                                                        setEditedItems(editedItems.map((editedItem, i) => {
                                                            if (i === index) {
                                                                return {...editedItem, מידה: e.target.value};
                                                            }
                                                            return editedItem;
                                                        }));
                                                    }}
                                                />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 items-center gap-4">
                                                <Label htmlFor={`quantity-${index}`}>כמות</Label>
                                                <Input
                                                    id={`quantity-${index}`}
                                                    type="number"
                                                    value={item?.כמות}
                                                    onChange={(e) => {
                                                        setEditedItems(editedItems.map((editedItem, i) => {
                                                            if (i === index) {
                                                                const newValue = e.target.value === '' ? 0 : Number(e.target.value);
                                                                return {...editedItem, כמות: newValue};
                                                            }
                                                            return editedItem;
                                                        }));
                                                    }}
                                                />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 items-center gap-4">
                                                <Label htmlFor={`need-${index}`}>צורך</Label>
                                                <select
                                                    id={`need-${index}`}
                                                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                                                    value={item?.צורך || "ניפוק"}
                                                    onChange={(e) => {
                                                        setEditedItems(editedItems.map((editedItem, i) => {
                                                            if (i === index) {
                                                                return {...editedItem, צורך: e.target.value};
                                                            }
                                                            return editedItem;
                                                        }));
                                                    }}
                                                >
                                                    <option value="ניפוק">ניפוק</option>
                                                    <option value="בלאי">בלאי</option>
                                                </select>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 items-center gap-4">
                                                <Label htmlFor={`comment-${index}`}>הערה</Label>
                                                <Input
                                                    id={`comment-${index}`}
                                                    value={item?.הערה || ''}
                                                    onChange={(e) => {
                                                        setEditedItems(editedItems.map((editedItem, i) => {
                                                            if (i === index) {
                                                                return {...editedItem, הערה: e.target.value};
                                                            }
                                                            return editedItem;
                                                        }));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                <div className="flex justify-center mt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                            setEditedItems([...editedItems, getEmptyItem()]);
                                        }}
                                    >
                                        <PlusCircledIcon className="h-4 w-4 mr-1" />
                                        הוסף פריט נוסף
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="flex justify-between mt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        // Handle cancel - reset form and close dialog
                                        setOpen(false);
                                        setEditedItems([getEmptyItem()]);
                                    }}
                                >
                                    ביטול
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={handleOrderSubmit}
                                >
                                     שלח פריטים להזמנה
                                </Button>
                            </div>
                        </>
                    ) : (
                        // Original order items flow
                        <>
                            {items.map((item, index) => (
                                <div key={index} className="flex flex-col gap-2">
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="flex flex-col space-y-1">
                                            <label htmlFor={`item-comment-${index}`}
                                                className="text-sm font-medium">הערה:</label>
                                            <Input
                                                id={`item-comment-${index}`}
                                                placeholder="הערה"
                                                className="text-sm h-9"
                                                value={item.הערה}
                                                onChange={e => handleChange(index, 'הערה', e.target.value)}
                                            />
                                        </div>

                                        <div className="flex flex-col space-y-1">
                                            <label htmlFor={`item-need-${index}`} className="text-sm font-medium">צורך:</label>
                                            <Select value={item.צורך}
                                                    onValueChange={value => handleChange(index, 'צורך', value)}>
                                                <SelectTrigger id={`item-need-${index}`} className="text-sm h-9"><SelectValue
                                                    placeholder="צורך"/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ניפוק">ניפוק</SelectItem>
                                                    <SelectItem value="בלאי">בלאי</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex flex-col space-y-1">
                                            <label htmlFor={`item-quantity-${index}`}
                                                className="text-sm font-medium">כמות:</label>
                                            <Input
                                                id={`item-quantity-${index}`}
                                                type="number"
                                                value={item.כמות}
                                                onChange={e => handleChange(index, 'כמות', e.target.value)}
                                            />
                                        </div>

                                        <div className="flex flex-col space-y-1">
                                            <label htmlFor={`item-size-${index}`} className="text-sm font-medium">מידה:</label>
                                            <Input
                                                id={`item-size-${index}`}
                                                placeholder="מידה"
                                                className="text-sm h-9"
                                                value={item.מידה}
                                                onChange={e => handleChange(index, 'מידה', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex flex-col space-y-1 flex-1">
                                            <label className="text-sm font-medium">פריט:</label>
                                            <Popover open={openComboboxes[index]}
                                                     onOpenChange={(open) => toggleCombobox(index, open)}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openComboboxes[index]}
                                                        className="w-full h-9 justify-between text-right text-sm"
                                                    >
                                                        {item.פריט || "בחר פריט"}
                                                        <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[280px] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="חפש פריט..." className="h-9 text-sm"/>
                                                        <CommandEmpty>לא נמצאו פריטים.</CommandEmpty>
                                                        <CommandGroup className="max-h-[250px] overflow-auto">
                                                            {uniqueSignatureItems.map((itemName, index) => (
                                                                <CommandItem
                                                                    key={`${itemName}-${index}`}
                                                                    className="text-sm py-2 cursor-pointer"
                                                                    value={itemName as string}
                                                                    onSelect={(value) => {
                                                                        handleChange(index, 'פריט', value);
                                                                        handleChange(index, 'מידה', dataByStatus['החתמה']?.find(
                                                                            (item: { [x: string]: string; }) => item['פריט'] === itemName
                                                                        )?.['מידה'] || '');
                                                                        toggleCombobox(index, false);
                                                                    }}
                                                                >
                                                                    <span className="flex-1 text-right">{itemName}</span>
                                                                    <CheckIcon
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            item.פריט === itemName ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                </CommandItem>
                                                            ))}
                                                            <CommandSeparator/>
                                                            <div className="p-2">
                                                                <label className="text-sm font-medium block mb-1">הוסף פריט
                                                                    חדש:</label>
                                                                <div className="flex gap-1">
                                                                    <Input
                                                                        placeholder="הקלד שם פריט חדש"
                                                                        className="text-sm h-8"
                                                                        value={item.פריט}
                                                                        onChange={e => {
                                                                            e.stopPropagation();
                                                                            handleChange(index, 'פריט', e.target.value);
                                                                        }}
                                                                        onClick={e => e.stopPropagation()}
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (item.פריט.trim()) {
                                                                                toggleCombobox(index, false);
                                                                            }
                                                                        }}
                                                                        className="shrink-0 h-8 text-xs"
                                                                    >
                                                                        הוסף
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <button
                                            onClick={() => removeItemRow(index)}
                                            className="text-red-600 hover:text-red-900 text-lg mt-6"
                                            aria-label="הסר פריט"
                                            title="הסר פריט"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    <hr className="my-1"/>
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
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {STATUSES.map(renderTable)}
            <div className="flex space-x-4 rtl:space-x-reverse">
                <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={exportSignatureToPDF}
                >
                    הורד נתוני החתמה כ-PDF
                </Button>
                <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={exportDataToExcel}
                >
                    הורד את כל הנתונים כקובץ Excel
                </Button>
            </div>
            <Dialog 
                open={signatureDialogOpen} 
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        handleSignatureCancel();
                    }
                    setSignatureDialogOpen(isOpen);
                }}
            >
                <DialogContent className="max-w-4xl overflow-auto max-h-[80vh] space-y-4">
                    <DialogHeader>
                        <DialogTitle>החתמה - עריכת פרטים וחתימה</DialogTitle>
                        <DialogDescription>
                            יש לעדכן את הפרטים ולחתום במקום המיועד
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-1 py-1 rtl">
                        {editedItems.map((item, index) => (
                            <div key={index} className="border p-3 rounded-md">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-medium">פריט {index + 1}</h4>
                                    {editedItems.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2"
                                            onClick={() => {
                                                setEditedItems(editedItems.filter((_, i) => i !== index));
                                            }}
                                        >
                                            הסר
                                        </Button>
                                    )}
                                </div>
                                
                                <div className="grid gap-3">
                                    <div className="grid grid-cols-2 items-center gap-4">
                                        <Label htmlFor={`item-${index}`}>פריט</Label>
                                        <div className="flex gap-2">
                                            <select 
                                                id={`item-${index}`}
                                                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                                                value={item?.פריט || ""}
                                                onChange={(e) => {
                                                    const selectedValue = e.target.value;
                                                    const matchingItem = dataByStatus['החתמה']?.find(
                                                        (item: { [x: string]: string; }) => item['פריט'] === selectedValue
                                                    );
                                                    
                                                    setEditedItems(editedItems.map((editedItem, i) => {
                                                        if (i === index) {
                                                            return {
                                                                ...editedItem, 
                                                                פריט: selectedValue,
                                                                מידה: matchingItem?.['מידה'] || ''
                                                            };
                                                        }
                                                        return editedItem;
                                                    }));
                                                }}
                                            >
                                                <option value="">בחר פריט</option>
                                                {uniqueSignatureItems.map((itemName, idx) => (
                                                    <option key={`${itemName}-${idx}`} value={itemName}>
                                                        {itemName}
                                                    </option>
                                                ))}
                                            </select>
                                            <Input
                                                placeholder="או הוסף פריט חדש"
                                                className="max-w-[150px]"
                                                value={item?.פריט || ''}
                                                onChange={(e) => {
                                                    setEditedItems(editedItems.map((editedItem, i) => {
                                                        if (i === index) {
                                                            return {...editedItem, פריט: e.target.value};
                                                        }
                                                        return editedItem;
                                                    }));
                                                }}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 items-center gap-4">
                                        <Label htmlFor={`measure-${index}`}>מידה</Label>
                                        <Input
                                            id={`measure-${index}`}
                                            value={item?.מידה || ''}
                                            onChange={(e) => {
                                                setEditedItems(editedItems.map((editedItem, i) => {
                                                    if (i === index) {
                                                        return {...editedItem, מידה: e.target.value};
                                                    }
                                                    return editedItem;
                                                }));
                                            }}
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 items-center gap-4">
                                        <Label htmlFor={`quantity-${index}`}>כמות</Label>
                                        <Input
                                            id={`quantity-${index}`}
                                            type="number"
                                            value={item?.כמות}
                                            onChange={(e) => {
                                                setEditedItems(editedItems.map((editedItem, i) => {
                                                    if (i === index) {
                                                        const newValue = e.target.value === '' ? 0 : Number(e.target.value);
                                                        return {...editedItem, כמות: newValue};
                                                    }
                                                    return editedItem;
                                                }));
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        <div className="flex justify-center mt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    setEditedItems([...editedItems, getEmptyItem()]);
                                }}
                            >
                                <PlusCircledIcon className="h-4 w-4 mr-1" />
                                הוסף פריט נוסף
                            </Button>
                        </div>
                    </div>
                    <div className="grid gap-1 py-1 rtl">
                        <div className="grid grid-cols-2 items-center gap-4">
                            <Label htmlFor="signerName">שם החותם</Label>
                            <Input
                                id="signerName"
                                value={signerName}
                                onChange={(e) => setSignerName(e.target.value)}
                                placeholder="הכנס את שם החותם"
                                required
                            />
                        </div>
                    </div>
                    <div className="border p-2 rounded-md">
                        <div className="text-center mb-2">
                            <Label htmlFor="signature" className="text-base font-medium">חתימה</Label>
                        </div>
                        <div 
                            className="border mt-2 bg-white" 
                            style={{
                                touchAction: 'none',
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'center'
                            }}
                        >
                            <SignatureCanvas
                                ref={signatureRef}
                                canvasProps={{
                                    width: 400,
                                    height: 150,
                                    className: 'sigCanvas',
                                    style: {
                                        width: '100%',
                                        height: '150px',
                                        maxWidth: '400px',
                                        cursor: 'crosshair'
                                    }
                                }}
                                penColor="black"
                                onEnd={() => {
                                    // This ensures the signature data is captured when drawing ends
                                    if (signatureRef.current) {
                                        const dataURL = signatureRef.current.toDataURL();
                                        console.log("Signature captured:", dataURL.substring(0, 20) + "...");
                                    }
                                }}
                            />
                        </div>
                        <div className="flex justify-center mt-1">
                            <Button 
                                type="button" 
                                variant="outline"
                                size="sm" 
                                onClick={() => {
                                    if (signatureRef.current) {
                                        signatureRef.current.clear();
                                    }
                                }}
                            >
                                נקה חתימה
                            </Button>
                        </div>
                    </div>
                    <DialogFooter className="flex space-x-2 justify-end mt-4">
                        <Button
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                            onClick={handleSignatureCancel}
                        >
                            ביטול
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => {
                                // Validate items before submission
                                const emptyItems = editedItems.filter(item => !item.פריט || item.פריט.trim() === '');
                                if (emptyItems.length > 0) {
                                    alert('אנא מלא את שם הפריט בכל השורות לפני השליחה');
                                    return;
                                }
                                handleSignatureSubmit();
                            }}
                            disabled={isSignatureSubmitDisabled}
                        >
                            שלח
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Logistic;
