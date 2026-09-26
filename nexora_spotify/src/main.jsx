import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';
import { EventDataProvider } from './context/EventDataContext';
import { JourneyProvider } from './context/JourneyContext';
import { AuthProvider } from './context/AuthContext';
import { LiveEventProvider } from './context/LiveEventContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <EventDataProvider>
          <JourneyProvider>
            <LiveEventProvider>
              <App />
            </LiveEventProvider>
          </JourneyProvider>
        </EventDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
