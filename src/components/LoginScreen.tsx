import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import type { TokenResponse } from '@react-oauth/google';

interface LoginScreenProps {
  onLoginSuccess: (response: TokenResponse) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const login = useGoogleLogin({
    onSuccess: async (codeResponse: TokenResponse) => {
      localStorage.setItem('googleAuthToken', JSON.stringify(codeResponse));

      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${codeResponse.access_token}`,
          },
        });

        const userInfo = await res.json();
        console.log('User Info:', userInfo); // includes email, name, picture, etc.

        // Optional: save user info to state or localStorage
        localStorage.setItem('userEmail', userInfo.email);

        onLoginSuccess(codeResponse);
      } catch (err) {
        console.error('Failed to fetch user info', err);
      }
    },

    onError: (error) => {
      console.log('Login Failed:', error);
    },
    scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets'
  });

  return (
    <div className="flex flex-col items-center justify-center w-full h-[75vh] max-w-2xl">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full">
        <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">נשקיה 8101</h1>
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
  );
};

export default LoginScreen;
