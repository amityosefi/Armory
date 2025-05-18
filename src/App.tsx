import { useState, useEffect } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import type { TokenResponse } from '@react-oauth/google'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import GoogleSheetsService from './services/GoogleSheetsService'
import { BrowserRouter as Router, Routes, Route, Link, useParams, Navigate, useLocation } from 'react-router-dom'
import TabsNavigation from './components/TabsNavigation'

// Define Sheet Group structure
interface SheetGroup {
  name: string;
  sheets: Array<{
    name: string;
    range: string;
  }>;
}

// Sheet group configurations
const sheetGroups: SheetGroup[] = [
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

function App() {
  const [user, setUser] = useState<TokenResponse | null>(null)
  
  // Google login handler
  const login = useGoogleLogin({
    onSuccess: (codeResponse: TokenResponse) => {
      setUser(codeResponse)
    },
    onError: (error) => {
      console.log('Login Failed:', error)
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly'
  })

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 w-full" dir="rtl">
      {!user ? (
        // Not logged in - Show login screen
        <div className="flex flex-col items-center justify-center w-full h-[75vh] max-w-2xl">
          <div className="bg-white shadow-lg rounded-lg p-6 w-full">
            <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">Armory</h1>
            <div className="flex flex-col items-center">
              <p className="text-gray-700 mb-4">Please sign in with Google to access your spreadsheet data</p>
              <button
                onClick={() => login()}
                className="flex items-center bg-white border border-gray-300 rounded-lg shadow-md px-6 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                <svg className="h-6 w-6 ml-2" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 48 48">
                  <defs>
                    <path id="a" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" />
                  </defs>
                  <clipPath id="b">
                    <use xlinkHref="#a" overflow="visible" />
                  </clipPath>
                  <path clipPath="url(#b)" fill="#FBBC05" d="M0 37V11l17 13z" />
                  <path clipPath="url(#b)" fill="#EA4335" d="M0 11l17 13 7-6.1L48 14V0H0z" />
                  <path clipPath="url(#b)" fill="#34A853" d="M0 37l30-23 7.9 1L48 0v48H0z" />
                  <path clipPath="url(#b)" fill="#4285F4" d="M48 48L17 24l-4-3 35-10z" />
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Logged in - Show the router with page navigation
        <Router>
          <div className="w-full max-w-full px-4">
            {/* Header with title, navigation and sign out button in one row */}
            <div className="flex justify-between items-center mb-6">
              {/* Title on the left */}
              <h1 className="text-2xl font-bold text-gray-800">Armory Dashboard</h1>
              
              {/* Group Navigation in the center */}
              <GroupNavigation sheetGroups={sheetGroups} />
              
              {/* Sign out button on the right */}
              <button
                onClick={() => setUser(null)}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded text-sm transition-colors"
              >
                Sign Out
              </button>
            </div>

            <Routes>
              <Route path="/" element={<Navigate to="/group/0" replace />} />
              <Route path="/group/:groupId/*" element={<SheetGroupPage accessToken={user.access_token} sheetGroups={sheetGroups} />} />
            </Routes>
          </div>
        </Router>
      )}
    </div>
  )
}

// Component to handle group navigation with active indicators
function GroupNavigation({ sheetGroups }: { sheetGroups: SheetGroup[] }) {
  const location = useLocation();
  const currentPath = location.pathname;
  
  return (
    <div className="flex justify-center gap-3">
      {sheetGroups.map((group, index) => {
        // Check if this group is active
        const isActive = currentPath.includes(`/group/${index}`);
        
        return (
          <Link 
            key={index}
            to={`/group/${index}`}
            className={`px-4 py-1 rounded-lg transition-colors font-medium ${
              isActive 
                ? 'bg-blue-700 text-white shadow-md' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {group.name}
          </Link>
        );
      })}
    </div>
  );
}

// Component for displaying sheet group with tabs
function SheetGroupPage({ accessToken, sheetGroups }: { accessToken: string, sheetGroups: SheetGroup[] }) {
  const { groupId } = useParams();
  const groupIndex = parseInt(groupId || "0");
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [columnDefs, setColumnDefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spreadsheetId = '1I-4WiQHDkBjPWA2r2Oa4QBS0Nspj_Iy6NmJUCrTiHSY';

  // Make sure groupIndex is valid
  const currentGroup = groupIndex >= 0 && groupIndex < sheetGroups.length 
    ? sheetGroups[groupIndex] 
    : sheetGroups[0];

  // Function to fetch data based on sheet selection
  const fetchSheetData = async (sheetIndex: number) => {
    setActiveTabIndex(sheetIndex);
    const selectedSheet = currentGroup.sheets[sheetIndex];
    
    setLoading(true);
    setError(null);

    try {
      const encodedRange = encodeURIComponent(selectedSheet.range);
      console.log(`Fetching sheet: ${spreadsheetId} with range: ${selectedSheet.range}`);
      
      const result = await GoogleSheetsService.fetchSheetData(accessToken, spreadsheetId, encodedRange);
      console.log('API Response:', result);

      if (result.error) {
        throw new Error(`Google Sheets API error: ${result.error.message}`);
      }

      if (!result.values || result.values.length === 0) {
        setSheetData([]);
        setColumnDefs([]);
        throw new Error('No data found in the specified range');
      }

      // Process the data using our service
      const { columnDefs: cols, rowData } = GoogleSheetsService.processSheetData(result);

      setColumnDefs(cols);
      setSheetData(rowData);
      console.log(`Processed ${rowData.length} rows of data`);
    } catch (error) {
      console.error('Error fetching Google Sheets data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch sheet data');
      setSheetData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data for the first tab when the component mounts or group changes
  useEffect(() => {
    if (currentGroup && currentGroup.sheets.length > 0) {
      fetchSheetData(0);
    }
  }, [currentGroup]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{currentGroup.name}</h2>
      
      {/* Tabs Navigation */}
      <TabsNavigation 
        sheets={currentGroup.sheets} 
        activeTabIndex={activeTabIndex} 
        onTabChange={fetchSheetData} 
      />

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-700">טוען מידע...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      ) : sheetData.length > 0 ? (
        <div className="ag-theme-alpine w-full h-[70vh] ag-rtl">
          <AgGridReact
            columnDefs={columnDefs}
            rowData={sheetData}
            domLayout="normal"
            enableRtl={true}
            defaultColDef={{
              flex: 1,
              minWidth: 100,
              resizable: true
            }}
          />
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-lg p-6 text-center">
          <p className="text-gray-700">אין מידע זמין עבור גליון זה.</p>
        </div>
      )}
    </div>
  );
}

export default App
