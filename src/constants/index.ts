// Define Sheet Group structure
export interface SheetGroup {
  name: string;
  sheets: Array<{
    name: string;
    range: string;
    id: number; // Google Sheets ID for the sheet
  }>;
}
// Sheet group configurations
export const sheetGroups: SheetGroup[] = [
  {
    name: "פלוגות",
    sheets: [
      { name: "פלוגה א", range: "א" , id: 1473439552},
      { name: "פלוגה ב", range: "ב" , id: 834345156},
      { name: "פלוגה ג", range: "ג" , id: 1155932191},
      { name: "מסייעת", range: "מסייעת" , id: 1438187158},
      { name: "אלון", range: "אלון" , id:  579384803},
      { name: "מכלול", range: "מכלול" , id:  557813363},
      { name: "פלס״ם", range: "פלסם" , id:  414499990},
    ]
  },
  {
    name: "נשקיה",
    sheets: [
      { name: "טבלת נשקיה", range: "טבלת נשקיה" , id:  714814830},
      { name: "מלאי נשקיה", range: "מלאי נשקיה" , id:  439908422},
      { name: "מלאי אופטיקה", range: "מלאי אופטיקה" , id:  813181890},
      { name: "תקול לסדנא", range: "תקול לסדנא" , id:  2142875489},
      { name: "תיעוד", range: "תיעוד" , id: 553027487},
    ]
  },
];

// Default spreadsheet ID
export const DEFAULT_SPREADSHEET_ID = '1I-4WiQHDkBjPWA2r2Oa4QBS0Nspj_Iy6NmJUCrTiHSY';
