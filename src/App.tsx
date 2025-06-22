import { useState } from 'react'
import type { TokenResponse } from '@react-oauth/google'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginScreen from './components/LoginScreen'
import SheetGroupPage from './components/SheetGroupPage'
import NavBar from './components/NavBar'
import { sheetGroups } from './constants'
import './css/App.css';
import SoldierCardPage from './components/SoldierCardPage'

function App() {
  const [user, setUser] = useState<TokenResponse | null>(null)

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
      <Router>
        <Routes>
          <Route path="/login" element={<LoginScreen onLoginSuccess={handleLoginSuccess} />} />
          
          {user ? (
            <>
              <Route path="/" element={<Navigate to="/group/0" replace />} />
              <Route path="/sheet/:sheetName/soldier/:soldierIndex" element={<SoldierCardPage accessToken={user.access_token} />} />
              <Route path="/group/:groupId/sheet/:sheetIndex/row/:rowIndex/*" element={
                <div className="w-full max-w-full md:px-4">
                  <NavBar 
                    sheetGroups={sheetGroups} 
                    accessToken={user.access_token} 
                    onSignOut={handleSignOut} 
                  />
                  <SheetGroupPage accessToken={user.access_token} sheetGroups={sheetGroups} />
                </div>
              } />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </Router>
    </div>
  )
}

export default App
