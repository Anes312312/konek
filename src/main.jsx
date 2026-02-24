import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './Admin.css'
import App from './App.jsx'
import AdminDashboard from './AdminDashboard.jsx'

const Main = () => {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');

  if (view === 'admin') {
    return <AdminDashboard />;
  }

  return <App />;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Main />
  </StrictMode>,
)
