// Define Sheet Group structure
export interface SheetGroup {
  name: string;
  sheets: Array<{
    name: string;
    range: string;
  }>;
}

// Sheet group configurations
export const sheetGroups: SheetGroup[] = [
  {
    name: "פלוגות",
    sheets: [
      { name: "פלוגה א", range: "א" },
      { name: "פלוגה ב", range: "ב" },
      { name: "פלוגה ג", range: "ג" },
      { name: "מסייעת", range: "מסייעת" },
      { name: "אלון", range: "אלון" },
      { name: "מכלול", range: "מכלול" },
      { name: "פלס״ם", range: "פלסם" },
    ]
  },
  {
    name: "נשקיה",
    sheets: [
      { name: "מלאי אופטיקה", range: "מלאי אופטיקה" },
      { name: "מלאי נשקיה", range: "מלאי נשקיה" },
      { name: "טבלת נשקיה", range: "טבלת נשקיה" },
      { name: "תקול לסדנא", range: "תקול לסדנא" },
    ]
  },
];

// Default spreadsheet ID
export const DEFAULT_SPREADSHEET_ID = '1I-4WiQHDkBjPWA2r2Oa4QBS0Nspj_Iy6NmJUCrTiHSY';
