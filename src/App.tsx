import { useState, useEffect } from 'react'
import type { TokenResponse } from '@react-oauth/google'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginScreen from './components/LoginScreen'
import GroupNavigation from './components/GroupNavigation'
import SheetGroupPage from './components/SheetGroupPage'
import { sheetGroups } from './constants'

function App() {
  const [user, setUser] = useState<TokenResponse | null>(null)
  
  // Load saved token on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem('googleAuthToken');
    if (savedToken) {
      try {
        const parsedToken = JSON.parse(savedToken) as TokenResponse;
        setUser(parsedToken);
      } catch (error) {
        console.error('Error parsing saved token:', error);
        // Clear invalid token
        localStorage.removeItem('googleAuthToken');
      }
    }
  }, []);
  
  const handleLoginSuccess = (response: TokenResponse) => {
    setUser(response);
  };
  
  const handleSignOut = () => {
    // Remove token from localStorage when signing out
    localStorage.removeItem('googleAuthToken');
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 w-full" dir="rtl">
      {!user ? (
        // Not logged in - Show login screen
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
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
                onClick={handleSignOut}
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

export default App
