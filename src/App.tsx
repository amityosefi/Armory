import { useState, useEffect } from 'react'
import type { TokenResponse } from '@react-oauth/google'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginScreen from './components/LoginScreen'
import GroupNavigation from './components/route/GroupNavigation'
import SearchBar from './components/SearchBar'
import SheetGroupPage from './components/SheetGroupPage'
import { sheetGroups } from './constants'
import GoogleSheetsService from './services/GoogleSheetsService'
import './css/App.css';
import useIsMobile from './hooks/useIsMobile'

function App() {
  const [user, setUser] = useState<TokenResponse | null>(null)
  const [isValidatingToken, setIsValidatingToken] = useState<boolean>(true)
  const isMobile = useIsMobile();

  // Function to validate access token by making a test request
  const validateAccessToken = async (token: string): Promise<boolean> => {
    try {
      // Try to fetch a minimal amount of data from the spreadsheet to verify access
      const result = await GoogleSheetsService.fetchSheetData(
        token,
        'א!A1:A1'  // Just request a single cell
      );

      // If we get a 401 or 403 error, token is invalid or lacks permission
      if (result.error) {
        console.error('Token validation failed:', result.error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  // Load saved token on component mount
  useEffect(() => {
    const checkSavedToken = async () => {
      setIsValidatingToken(true);
      const savedToken = localStorage.getItem('googleAuthToken');

      if (savedToken) {
        try {
          const parsedToken = JSON.parse(savedToken) as TokenResponse;

          // Validate that the token can access Google Sheets
          const isValid = await validateAccessToken(parsedToken.access_token);

          if (isValid) {
            setUser(parsedToken);
          } else {
            // Token is invalid or lacks permissions
            console.log('Saved token is invalid or lacks permissions');
            localStorage.removeItem('googleAuthToken');
            setUser(null);
          }
        } catch (error) {
          console.error('Error parsing saved token:', error);
          // Clear invalid token
          localStorage.removeItem('googleAuthToken');
        }
      }

      setIsValidatingToken(false);
    };

    checkSavedToken();
  }, []);

  const handleLoginSuccess = (response: TokenResponse) => {
    setUser(response);
  };

  const handleSignOut = () => {
    // Remove token from localStorage when signing out
    localStorage.removeItem('googleAuthToken');
    setUser(null);
  };

  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 w-full" dir="rtl">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-700">מאמת חיבור...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 w-full" dir="rtl">
      {!user ? (
        // Not logged in - Show login screen
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        // Logged in - Show the router with page navigation
        <Router>
          <div className="w-full max-w-full px-4">
            {/* Header with title, navigation and sign out button */}
            <div className="flex justify-between items-center mb-4">

              <div className='flex gap-5'>
                {/* Title on the left */}
                <h1 className="text-2xl font-bold text-gray-800">נשקיה 8101</h1>

                {/* Group Navigation */}
                <div>
                  <GroupNavigation sheetGroups={sheetGroups} />
                </div>
              </div>

              <div className='flex gap-10'>
                {/* Search Bar - Desktop */}
                <div className={isMobile ? 'hidden' : 'block'}>
                  <SearchBar sheetGroups={sheetGroups} accessToken={user.access_token} />
                </div>

                {/* Sign out button on the right */}
                <button
                  onClick={handleSignOut}
                  className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded text-sm transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
            {/* Search Bar - Mobile */}
            <div className={isMobile ? 'block mb-2' : 'hidden'}>
              <SearchBar sheetGroups={sheetGroups} accessToken={user.access_token} />
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

export default App
