import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './Admin.css'
import App from './App.jsx'
import AdminDashboard from './AdminDashboard.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#e9edef', background: '#111b21', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>😵</div>
          <h2 style={{ marginBottom: 10, color: '#ef4444' }}>Algo salió mal</h2>
          <p style={{ color: '#8696a0', marginBottom: 20, maxWidth: 400 }}>La aplicación encontró un error inesperado. Intenta recargar la página.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 30px', background: '#00a884', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer' }}>Recargar</button>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: 30, fontSize: 11, color: '#666', maxWidth: '90vw', overflow: 'auto' }}>
            <summary>Detalles técnicos</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <ErrorBoundary>
      <Main />
    </ErrorBoundary>
  </StrictMode>,
)
