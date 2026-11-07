import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { FavoritesProvider } from './context/FavoritesProvider'
import { AlertsProvider } from './context/AlertsProvider'
import { PropertiesProvider } from './context/PropertiesProvider'
import { AnunciosProvider } from './context/AnunciosProvider'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PropertiesProvider>
          <FavoritesProvider>
            <AlertsProvider>
              <AnunciosProvider>
                <App />
              </AnunciosProvider>
            </AlertsProvider>
          </FavoritesProvider>
        </PropertiesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)