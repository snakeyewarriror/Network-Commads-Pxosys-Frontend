import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './components/AuthContext.tsx';

import App from './App.tsx';

import '../src/css/styles.css'
  
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <HelmetProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </HelmetProvider>
    </StrictMode>,
)
