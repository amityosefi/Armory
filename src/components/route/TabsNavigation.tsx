interface TabsNavigationProps {
  sheets: Array<{name: string, range: string}>;
  activeTabIndex: number;
  onTabChange: (index: number) => void;
  creditButton?: React.ReactNode; // Add this prop to accept the credit button
  assignWeaponButton?: React.ReactNode; // Add this prop to accept the credit button
}

function TabsNavigation({ 
  sheets, 
  activeTabIndex, 
  onTabChange,
  creditButton,
  assignWeaponButton                   // Accept the credit button
}: TabsNavigationProps) {
  return (
    <div className="mb-4 border-b border-gray-200 flex justify-between items-center">
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
      
      {/* Render the credit button if provided */}
      {creditButton}
      {assignWeaponButton}
    </div>
  );
}

export default TabsNavigation;
