interface TabsNavigationProps {
  sheets: Array<{name: string, range: string}>;
  activeTabIndex: number;
  onTabChange: (index: number) => void;
}

function TabsNavigation({ 
  sheets, 
  activeTabIndex, 
  onTabChange 
}: TabsNavigationProps) {
  return (
    <div className="mb-4 border-b border-gray-200">
      <ul className="flex flex-wrap -mb-px">
        {sheets.map((sheet, index) => (
          <li key={index} className="mr-2">
            <button 
              className={`inline-block p-4 ${activeTabIndex === index 
                ? 'text-blue-600 border-b-2 border-blue-600 rounded-t-lg' 
                : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'}`}
              onClick={() => onTabChange(index)}
            >
              {sheet.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TabsNavigation;
