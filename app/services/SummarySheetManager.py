class SummarySheetManager:
    def __init__(self, client, spreadsheet, group_names, weapon_stock_sheets):
        self.client = client
        self.spreadsheet = spreadsheet
        self.group_names = group_names  # ['א', 'ב', 'ג', 'מסייעת', 'אלון', 'מכלול', 'פלסם']
        self.weapon_stock_sheets = weapon_stock_sheets  # ['מלאי נשקיה', 'מלאי אופטיקה']
        self.sheet_name = "טבלת נשקיה"

    def refresh_summary_sheet(self):
        try:
            sheet = self.spreadsheet.worksheet(self.sheet_name)
            sheet.clear()
        except gspread.exceptions.WorksheetNotFound:
            sheet = self.spreadsheet.add_worksheet(title=self.sheet_name, rows=500, cols=50)

        weapon_data = self.aggregate_data(weapon_col="סוג נשק")
        optics_data = self.aggregate_data(weapon_col="כוונת")

        self.write_summary(sheet, weapon_data, "נשק")
        self.write_summary(sheet, optics_data, "אופטיקה ואמר\"ל")

    def aggregate_data(self, weapon_col):
        all_counts = {}
        sheet_names = self.group_names + self.weapon_stock_sheets

        for sheet_name in sheet_names:
            try:
                ws = self.spreadsheet.worksheet(sheet_name)
                headers = ws.row_values(1)
                if weapon_col not in headers:
                    continue
                col_index = headers.index(weapon_col) + 1
                col_values = ws.col_values(col_index)[1:]
                for item in col_values:
                    item = item.strip()
                    if not item:
                        continue
                    if item not in all_counts:
                        all_counts[item] = {name: 0 for name in sheet_names}
                    all_counts[item][sheet_name] += 1
            except Exception as e:
                print(f"Error reading sheet {sheet_name}: {e}")

        return all_counts

    def write_summary(self, sheet, data, section_title):
        sheet.append_row([section_title])
        headers = [""] + self.group_names + self.weapon_stock_sheets + ["סה\"כ לקבוצות", "סה\"כ למלאים", "סה\"כ כללי"]
        sheet.append_row(headers)

        for weapon, counts in data.items():
            group_sum = sum(counts[name] for name in self.group_names)
            stock_sum = sum(counts[name] for name in self.weapon_stock_sheets)
            total = group_sum + stock_sum
            row = [weapon] + [counts.get(name, 0) for name in self.group_names + self.weapon_stock_sheets]
            row += [group_sum, stock_sum, total]
            sheet.append_row(row)
