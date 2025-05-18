// Sheet Group interface definition
export interface SheetGroup {
  name: string;
  sheets: Array<{
    name: string;
    range: string;
  }>;
}

export interface TabsNavigationProps {
  sheets: Array<{
    name: string;
    range: string;
  }>;
  activeTabIndex: number;
  onTabChange: (index: number) => void;
}
