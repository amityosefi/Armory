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
      { name: "פלוגה א", range: "א" , id: 1505210756},
      { name: "פלוגה ב", range: "ב" , id: 1712667967},
      { name: "פלוגה ג", range: "ג" , id: 1597915545},
      { name: "מסייעת", range: "מסייעת" , id: 493836425},
      { name: "אלון", range: "אלון" , id:  269212444},
      { name: "מכלול", range: "מכלול" , id:  364493809},
      { name: "פלסם", range: "פלסם" , id:  208437580},
    ]
  },
  {
    name: "נשקיה",
    sheets: [
      { name: "טבלת נשקיה", range: "טבלת נשקיה" , id:  600073477},
      { name: "מלאי נשקיה", range: "מלאי נשקיה" , id:  262055601},
      { name: "מלאי אופטיקה", range: "מלאי אופטיקה" , id:  1158402644},
      { name: "תקול לסדנא", range: "תקול לסדנא" , id:  1689612813},
      { name: "תיעוד", range: "תיעוד" , id: 1070971626},
    ]
  },
];

// Default spreadsheet ID
export const DEFAULT_SPREADSHEET_ID = '1I-4WiQHDkBjPWA2r2Oa4QBS0Nspj_Iy6NmJUCrTiHSY'; // Deployed spreadsheet ID
// export const DEFAULT_SPREADSHEET_ID = '12SEo0M6Ky03mOnOLxJZNo3vnyAuVTJrjrC5870yBj2c'; // Local spreadsheet ID for development