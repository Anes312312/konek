import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { 
    User, Settings, Trash2, UserPlus, ShieldCheck, LogOut, 
    RefreshCw, Globe, Download, Database, GitBranch, Cpu, 
    Terminal, CheckCircle2, AlertTriangle, Play, HelpCircle
} from 'lucide-react';

const SERVER_URL =
    window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : `https://${window.location.hostname}`;

function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'infra'
    const [adminUsers, setAdminUsers] = useState([]);
    const [onlineCount, setOnlineCount] = useState(0);
    const [adminEditingUser, setAdminEditingUser] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [mundoIsEmpty, setMundoIsEmpty] = useState(true);
    const socketRef = useRef();

    // Infrastructure States
    const [infraSettings, setInfraSettings] = useState({
        gitea: { url: '', token: '' },
        pocketbase: { url: '', email: '', password: '' },
        coolify: { url: '', token: '' }
    });
    
    const [giteaStatus, setGiteaStatus] = useState(null);
    const [pocketbaseStatus, setPocketbaseStatus] = useState(null);
    const [coolifyStatus, setCoolifyStatus] = useState(null);
    
    const [giteaRepos, setGiteaRepos] = useState([]);
    const [pocketbaseCollections, setPocketbaseCollections] = useState([]);
    const [coolifyProjects, setCoolifyProjects] = useState([]);
    
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState({});
    const [isLoadingData, setIsLoadingData] = useState({});
    
    const [activeDeployAppId, setActiveDeployAppId] = useState(null);
    const [deploymentLogs, setDeploymentLogs] = useState([]);
    const [isDeploying, setIsDeploying] = useState(false);

    useEffect(() => {
        socketRef.current = io(SERVER_URL, {
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            timeout: 10000,
            transports: ["websocket", "polling"],
        });

        socketRef.current.on('connect', () => {
            console.log('[Admin] Socket conectado');
            setIsConnected(true);
            socketRef.current.emit('admin_login', { key: 'konek_admin_2024' });
        });

        socketRef.current.on('disconnect', () => {
            setIsConnected(false);
            setIsAuthenticated(false);
        });

        socketRef.current.on('admin_authenticated', () => {
            console.log('[Admin] Autenticado correctamente');
            setIsAuthenticated(true);
            setErrorMsg('');
        });

        socketRef.current.on('admin_user_list', (users) => {
            setAdminUsers(users);
            setErrorMsg('');
        });

        socketRef.current.on('online_count', (count) => {
            setOnlineCount(count);
        });

        socketRef.current.on('mundo_status', (status) => {
            setMundoIsEmpty(status.isEmpty);
        });

        socketRef.current.on('error', (err) => {
            setErrorMsg(err.message || 'Error desconocido');
        });

        return () => socketRef.current.disconnect();
    }, []);

    useEffect(() => {
        if (activeTab === 'infra') {
            fetchInfraSettings();
        }
    }, [activeTab]);

    const refreshUserList = () => {
        if (socketRef.current) {
            socketRef.current.emit('admin_get_all_users');
        }
    };

    const adminCreateUser = () => {
        const name = prompt('Nombre del nuevo usuario:');
        if (!name) return;
        const number = prompt('Número de teléfono:');

        socketRef.current.emit('admin_create_user', {
            username: name,
            phone_number: number || '',
            role: 'user'
        });
    };

    const adminDeleteUser = (targetId) => {
        if (window.confirm('¿ELIMINAR este usuario permanentemente?')) {
            socketRef.current.emit('admin_delete_user', { userId: targetId });
        }
    };

    const adminDownloadChat = (targetId) => {
        if (!socketRef.current) return;
        socketRef.current.emit('admin_download_chat', { userId: targetId }, (res) => {
            if (res?.success && res.text) {
                const blob = new Blob([res.text], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `chat_${targetId}_${new Date().getTime()}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                alert("Error al descargar el chat: " + (res?.error || "Desconocido"));
            }
        });
    };

    const adminUpdateUser = (targetUser, updates) => {
        socketRef.current.emit('admin_update_user', {
            userId: targetUser.id,
            update: updates
        });
        setAdminEditingUser(null);
    };

    const adminClearMundo = () => {
        if (window.confirm('¿VACIAR TODO el chat de Mundo? Esta acción no se puede deshacer.')) {
            socketRef.current.emit('admin_clear_mundo');
        }
    };

    // Infrastructure Handlers
    const fetchInfraSettings = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/api/infra/settings`);
            if (res.ok) {
                const data = await res.json();
                setInfraSettings({
                    gitea: { url: data.gitea.url || '', token: data.gitea.hasToken ? '********' : '' },
                    pocketbase: { url: data.pocketbase.url || '', email: data.pocketbase.email || '', password: data.pocketbase.hasPassword ? '********' : '' },
                    coolify: { url: data.coolify.url || '', token: data.coolify.hasToken ? '********' : '' }
                });
                
                // Auto test if credentials exist
                if (data.gitea.url) testInfraConnection('gitea');
                if (data.pocketbase.url) testInfraConnection('pocketbase');
                if (data.coolify.url) testInfraConnection('coolify');
            }
        } catch (e) {
            console.error('Error fetching infra settings:', e);
        }
    };

    const saveInfraSettings = async () => {
        setIsSavingSettings(true);
        try {
            const payload = {};
            payload.gitea = { url: infraSettings.gitea.url };
            if (infraSettings.gitea.token !== '********') {
                payload.gitea.token = infraSettings.gitea.token;
            }
            payload.pocketbase = { url: infraSettings.pocketbase.url, email: infraSettings.pocketbase.email };
            if (infraSettings.pocketbase.password !== '********') {
                payload.pocketbase.password = infraSettings.pocketbase.password;
            }
            payload.coolify = { url: infraSettings.coolify.url };
            if (infraSettings.coolify.token !== '********') {
                payload.coolify.token = infraSettings.coolify.token;
            }

            const res = await fetch(`${SERVER_URL}/api/infra/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('¡Configuración de infraestructura guardada!');
                fetchInfraSettings();
            } else {
                const err = await res.json();
                alert(`Error al guardar: ${err.error || 'Desconocido'}`);
            }
        } catch (e) {
            alert(`Error de red: ${e.message}`);
        } finally {
            setIsSavingSettings(false);
        }
    };

    const testInfraConnection = async (service) => {
        setIsTestingConnection(prev => ({ ...prev, [service]: true }));
        try {
            const res = await fetch(`${SERVER_URL}/api/infra/test/${service}`);
            if (res.ok) {
                const data = await res.json();
                if (service === 'gitea') setGiteaStatus(data);
                if (service === 'pocketbase') setPocketbaseStatus(data);
                if (service === 'coolify') setCoolifyStatus(data);
                
                if (data.success) {
                    fetchInfraData(service);
                }
            }
        } catch (e) {
            const errRes = { success: false, error: e.message, message: 'Error de red en servidor local.' };
            if (service === 'gitea') setGiteaStatus(errRes);
            if (service === 'pocketbase') setPocketbaseStatus(errRes);
            if (service === 'coolify') setCoolifyStatus(errRes);
        } finally {
            setIsTestingConnection(prev => ({ ...prev, [service]: false }));
        }
    };

    const fetchInfraData = async (service) => {
        setIsLoadingData(prev => ({ ...prev, [service]: true }));
        try {
            const res = await fetch(`${SERVER_URL}/api/infra/${service}/${service === 'coolify' ? 'projects' : service === 'pocketbase' ? 'collections' : 'repos'}`);
            if (res.ok) {
                const result = await res.json();
                if (service === 'gitea') setGiteaRepos(result.data || []);
                if (service === 'pocketbase') setPocketbaseCollections(result.data || []);
                if (service === 'coolify') setCoolifyProjects(result.data || []);
            }
        } catch (e) {
            console.error(`Error loading ${service} data:`, e);
        } finally {
            setIsLoadingData(prev => ({ ...prev, [service]: false }));
        }
    };

    const deployApp = async (appId) => {
        setActiveDeployAppId(appId);
        setIsDeploying(true);
        setDeploymentLogs(['🚀 Iniciando despliegue de app en servidor local...']);
        try {
            const res = await fetch(`${SERVER_URL}/api/infra/coolify/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appId })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.logs) {
                    let currentLogIdx = 0;
                    const interval = setInterval(() => {
                        if (currentLogIdx < data.logs.length) {
                            setDeploymentLogs(prev => [...prev, data.logs[currentLogIdx]]);
                            currentLogIdx++;
                        } else {
                            clearInterval(interval);
                            setIsDeploying(false);
                        }
                    }, 400);
                } else {
                    setDeploymentLogs(prev => [...prev, `❌ Error: ${data.error || 'Respuesta inesperada'}`]);
                    setIsDeploying(false);
                }
            } else {
                setDeploymentLogs(prev => [...prev, '❌ Error al conectarse con el endpoint de despliegue.']);
                setIsDeploying(false);
            }
        } catch (e) {
            setDeploymentLogs(prev => [...prev, `❌ Error: ${e.message}`]);
            setIsDeploying(false);
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-sidebar-nav">
                <div className="admin-nav-logo">
                    <ShieldCheck size={32} color="#00a884" />
                    <span>Konek Local Admin</span>
                </div>
                
                <div className="admin-nav-tabs">
                    <button 
                        className={`admin-nav-tab-btn ${activeTab === 'users' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('users')}
                    >
                        <User size={20} />
                        <span>Usuarios</span>
                    </button>
                    
                    <button 
                        className={`admin-nav-tab-btn ${activeTab === 'infra' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('infra')}
                    >
                        <Cpu size={20} />
                        <span>Infraestructura</span>
                    </button>
                </div>

                <div style={{ padding: '10px 16px', marginTop: 'auto' }}>
                    <div style={{ fontSize: 11, color: '#8696a0', marginBottom: 12 }}>
                        Estado: {isConnected ? (isAuthenticated ? '🟢 Autenticado' : '🟡 Conectando...') : '🔴 Desconectado'}
                    </div>
                    <button className="admin-logout" onClick={() => window.location.href = '/'}>
                        <LogOut size={20} /> Volver al Chat
                    </button>
                </div>
            </div>

            <div className="admin-main-content">
                <div className="admin-content-inner">
                    
                    {activeTab === 'users' ? (
                        <>
                            <header className="admin-main-header">
                                <h1>Gestión de Usuarios</h1>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button className="admin-refresh-btn" onClick={refreshUserList}>
                                        <RefreshCw size={18} /> Actualizar
                                    </button>
                                    <button className="admin-add-btn" onClick={adminCreateUser}>
                                        <UserPlus size={18} /> Crear Usuario
                                    </button>
                                </div>
                            </header>

                            {errorMsg && (
                                <div style={{
                                    padding: '12px 20px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '8px',
                                    color: '#ef4444',
                                    margin: '0 0 20px 0'
                                }}>
                                    ⚠️ {errorMsg}
                                </div>
                            )}

                            <div className="admin-metrics-grid">
                                <div className="metric-card">
                                    <span className="label">Total Usuarios</span>
                                    <span className="value">{adminUsers.length}</span>
                                </div>
                                <div className="metric-card accent">
                                    <span className="label">Usuarios Online</span>
                                    <span className="value">{onlineCount}</span>
                                </div>
                                <div className="metric-card">
                                    <span className="label">Estado Servidor</span>
                                    <span className="value" style={{ fontSize: '18px', color: isAuthenticated ? '#00a884' : '#ef4444' }}>
                                        {isAuthenticated ? 'SQLite Operacional' : 'Sin acceso'}
                                    </span>
                                </div>
                                <div className={`metric-card ${mundoIsEmpty ? 'success' : 'danger'}`} onClick={!mundoIsEmpty ? adminClearMundo : undefined} style={{ cursor: mundoIsEmpty ? 'default' : 'pointer' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <span className="label">Chat Mundo</span>
                                        <Globe size={16} color={mundoIsEmpty ? '#00a884' : '#ef4444'} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                                        <Trash2 size={24} color={mundoIsEmpty ? '#00a884' : '#ef4444'} />
                                        <span className="value" style={{ fontSize: '16px', color: mundoIsEmpty ? '#00a884' : '#ef4444' }}>
                                            {mundoIsEmpty ? 'LIMPIO' : 'VACIAR CHAT'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="admin-table-container">
                                <h3 style={{ padding: '20px', margin: 0, fontSize: '16px', color: '#8696a0' }}>
                                    Usuarios Registrados ({adminUsers.length})
                                </h3>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Usuario</th>
                                            <th>Teléfono</th>
                                            <th>Rol</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {adminUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#8696a0' }}>
                                                    {isAuthenticated
                                                        ? 'No hay usuarios registrados aún.'
                                                        : 'Conectando al servidor...'}
                                                </td>
                                            </tr>
                                        ) : (
                                            adminUsers.map(u => (
                                                <tr key={u.id}>
                                                    <td>
                                                        <div className="table-user-info">
                                                            <div className="avatar-sm">
                                                                {u.profile_pic ? (
                                                                    <img src={u.profile_pic} alt={u.username} />
                                                                ) : (
                                                                    <User size={16} color="#8696a0" />
                                                                )}
                                                            </div>
                                                            <span>{u.username}</span>
                                                        </div>
                                                    </td>
                                                    <td><code className="id-badge">{u.phone_number || '---'}</code></td>
                                                    <td><span className={`role-badge ${u.role}`}>{(u.role || 'user').toUpperCase()}</span></td>
                                                    <td>
                                                        <span className={`status-pill ${u.isOnline ? 'online' : 'offline'}`}>
                                                            {u.isOnline ? 'Online' : 'Offline'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="action-btns">
                                                            <button className="edit-btn" style={{ backgroundColor: '#00a884', color: '#fff', padding: '6px', borderRadius: '4px' }} title="Descargar Historial" onClick={() => adminDownloadChat(u.id)}>
                                                                <Download size={16} />
                                                            </button>
                                                            <button className="edit-btn" style={{ padding: '6px' }} title="Editar" onClick={() => setAdminEditingUser({ ...u })}>
                                                                <Settings size={16} />
                                                            </button>
                                                            <button className="delete-btn" style={{ padding: '6px' }} title="Eliminar" onClick={() => adminDeleteUser(u.id)}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        // TAB: INFRAESTRUCTURA
                        <div className="infra-container">
                            <header className="admin-main-header">
                                <h1>Infraestructura Local</h1>
                                <button 
                                    className="admin-add-btn" 
                                    onClick={saveInfraSettings}
                                    disabled={isSavingSettings}
                                    style={{ opacity: isSavingSettings ? 0.6 : 1 }}
                                >
                                    <Settings size={18} />
                                    {isSavingSettings ? 'Guardando...' : 'Guardar Credenciales'}
                                </button>
                            </header>

                            {/* Credentials Grid */}
                            <div className="infra-credentials-grid">
                                
                                {/* GITEA */}
                                <div className="infra-card">
                                    <div className="infra-card-header">
                                        <GitBranch size={22} color="#fc5811" />
                                        <h3>Gitea</h3>
                                    </div>
                                    <div className="infra-card-body">
                                        <div className="admin-form-group">
                                            <label>URL del Servidor</label>
                                            <input 
                                                type="text" 
                                                placeholder="http://gitea.local" 
                                                value={infraSettings.gitea.url}
                                                onChange={e => setInfraSettings({
                                                    ...infraSettings,
                                                    gitea: { ...infraSettings.gitea, url: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="admin-form-group">
                                            <label>Token de Acceso</label>
                                            <input 
                                                type="password" 
                                                placeholder="gti_..." 
                                                value={infraSettings.gitea.token}
                                                onChange={e => setInfraSettings({
                                                    ...infraSettings,
                                                    gitea: { ...infraSettings.gitea, token: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="infra-status-action">
                                            <button 
                                                className="infra-test-btn"
                                                onClick={() => testInfraConnection('gitea')}
                                                disabled={isTestingConnection.gitea}
                                            >
                                                {isTestingConnection.gitea ? 'Probando...' : 'Probar Conexión'}
                                            </button>
                                            {giteaStatus && (
                                                <div className={`infra-status-badge ${giteaStatus.success ? 'success' : 'warning'}`}>
                                                    {giteaStatus.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                                    <span>{giteaStatus.success ? 'Conectado' : 'Simulado'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* POCKETBASE */}
                                <div className="infra-card">
                                    <div className="infra-card-header">
                                        <Database size={22} color="#00e5ff" />
                                        <h3>PocketBase</h3>
                                    </div>
                                    <div className="infra-card-body">
                                        <div className="admin-form-group">
                                            <label>URL del Servidor</label>
                                            <input 
                                                type="text" 
                                                placeholder="http://127.0.0.1:8090" 
                                                value={infraSettings.pocketbase.url}
                                                onChange={e => setInfraSettings({
                                                    ...infraSettings,
                                                    pocketbase: { ...infraSettings.pocketbase, url: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="admin-form-group">
                                            <label>Email de Admin</label>
                                            <input 
                                                type="email" 
                                                placeholder="admin@local.com" 
                                                value={infraSettings.pocketbase.email}
                                                onChange={e => setInfraSettings({
                                                    ...infraSettings,
                                                    pocketbase: { ...infraSettings.pocketbase, email: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="admin-form-group">
                                            <label>Password de Admin</label>
                                            <input 
                                                type="password" 
                                                placeholder="••••••••" 
                                                value={infraSettings.pocketbase.password}
                                                onChange={e => setInfraSettings({
                                                    ...infraSettings,
                                                    pocketbase: { ...infraSettings.pocketbase, password: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="infra-status-action">
                                            <button 
                                                className="infra-test-btn"
                                                onClick={() => testInfraConnection('pocketbase')}
                                                disabled={isTestingConnection.pocketbase}
                                            >
                                                {isTestingConnection.pocketbase ? 'Probando...' : 'Probar Conexión'}
                                            </button>
                                            {pocketbaseStatus && (
                                                <div className={`infra-status-badge ${pocketbaseStatus.success ? 'success' : 'warning'}`}>
                                                    {pocketbaseStatus.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                                    <span>{pocketbaseStatus.success ? 'Conectado' : 'Simulado'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* COOLIFY */}
                                <div className="infra-card">
                                    <div className="infra-card-header">
                                        <Cpu size={22} color="#a855f7" />
                                        <h3>Coolify</h3>
                                    </div>
                                    <div className="infra-card-body">
                                        <div className="admin-form-group">
                                            <label>URL del Servidor</label>
                                            <input 
                                                type="text" 
                                                placeholder="http://coolify.local" 
                                                value={infraSettings.coolify.url}
                                                onChange={e => setInfraSettings({
                                                    ...infraSettings,
                                                    coolify: { ...infraSettings.coolify, url: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="admin-form-group">
                                            <label>API Token</label>
                                            <input 
                                                type="password" 
                                                placeholder="1|..." 
                                                value={infraSettings.coolify.token}
                                                onChange={e => setInfraSettings({
                                                    ...infraSettings,
                                                    coolify: { ...infraSettings.coolify, token: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div className="infra-status-action" style={{ marginTop: 62 }}>
                                            <button 
                                                className="infra-test-btn"
                                                onClick={() => testInfraConnection('coolify')}
                                                disabled={isTestingConnection.coolify}
                                            >
                                                {isTestingConnection.coolify ? 'Probando...' : 'Probar Conexión'}
                                            </button>
                                            {coolifyStatus && (
                                                <div className={`infra-status-badge ${coolifyStatus.success ? 'success' : 'warning'}`}>
                                                    {coolifyStatus.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                                    <span>{coolifyStatus.success ? 'Conectado' : 'Simulado'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Resources & Details */}
                            <div className="infra-resources-layout" style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                
                                {/* Repositories & Collections column */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                    
                                    {/* Gitea Repos Card */}
                                    <div className="infra-detail-card">
                                        <div className="detail-card-title">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <GitBranch size={18} color="#fc5811" />
                                                <h4>Repositorios en Gitea</h4>
                                            </div>
                                            <button className="icon-refresh-btn" onClick={() => fetchInfraData('gitea')} disabled={isLoadingData.gitea}>
                                                <RefreshCw size={14} className={isLoadingData.gitea ? 'spin' : ''} />
                                            </button>
                                        </div>
                                        <div className="detail-card-body scroll-panel">
                                            {giteaRepos.length === 0 ? (
                                                <p className="no-data-text">No hay repositorios para mostrar.</p>
                                            ) : (
                                                giteaRepos.map(repo => (
                                                    <div key={repo.id} className="repo-row">
                                                        <div className="repo-name">
                                                            <span>{repo.full_name}</span>
                                                            <span className="repo-lang">{repo.language}</span>
                                                        </div>
                                                        <div className="repo-meta">
                                                            <span>⭐ {repo.stars_count}</span>
                                                            <span>🍴 {repo.forks_count}</span>
                                                            <span>{(repo.size / 1024).toFixed(1)} MB</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Pocketbase Collections Card */}
                                    <div className="infra-detail-card">
                                        <div className="detail-card-title">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Database size={18} color="#00e5ff" />
                                                <h4>Colecciones en PocketBase</h4>
                                            </div>
                                            <button className="icon-refresh-btn" onClick={() => fetchInfraData('pocketbase')} disabled={isLoadingData.pocketbase}>
                                                <RefreshCw size={14} className={isLoadingData.pocketbase ? 'spin' : ''} />
                                            </button>
                                        </div>
                                        <div className="detail-card-body scroll-panel">
                                            {pocketbaseCollections.length === 0 ? (
                                                <p className="no-data-text">No hay colecciones para mostrar.</p>
                                            ) : (
                                                pocketbaseCollections.map(col => (
                                                    <div key={col.id} className="collection-row">
                                                        <div className="col-info">
                                                            <span className="col-name">{col.name}</span>
                                                            <span className="col-type">{col.type} collection</span>
                                                        </div>
                                                        <div className="col-badge">
                                                            <span>{col.recordCount} registros</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                </div>

                                {/* Coolify Projects & Console column */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                    
                                    {/* Coolify Apps Card */}
                                    <div className="infra-detail-card">
                                        <div className="detail-card-title">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Cpu size={18} color="#a855f7" />
                                                <h4>Proyectos & Apps Coolify</h4>
                                            </div>
                                            <button className="icon-refresh-btn" onClick={() => fetchInfraData('coolify')} disabled={isLoadingData.coolify}>
                                                <RefreshCw size={14} className={isLoadingData.coolify ? 'spin' : ''} />
                                            </button>
                                        </div>
                                        <div className="detail-card-body scroll-panel">
                                            {coolifyProjects.length === 0 ? (
                                                <p className="no-data-text">No hay proyectos para mostrar.</p>
                                            ) : (
                                                coolifyProjects.map(proj => (
                                                    <div key={proj.id} className="project-group">
                                                        <h5 className="proj-title">{proj.name}</h5>
                                                        {proj.applications.length === 0 ? (
                                                            <p className="no-data-text sub">Sin aplicaciones.</p>
                                                        ) : (
                                                            proj.applications.map(app => (
                                                                <div key={app.id} className="app-row">
                                                                    <div className="app-info">
                                                                        <span className="app-name">{app.name}</span>
                                                                        <span className="app-fqdn">{app.fqdn || 'Sin FQDN'}</span>
                                                                    </div>
                                                                    <div className="app-actions">
                                                                        <span className={`app-status ${app.status}`}>{app.status}</span>
                                                                        <button 
                                                                            className="app-deploy-btn"
                                                                            onClick={() => deployApp(app.id)}
                                                                            disabled={isDeploying}
                                                                        >
                                                                            <Play size={10} />
                                                                            Deploy
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Deployment Terminal Console */}
                                    <div className="infra-detail-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div className="detail-card-title">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Terminal size={18} color="#00a884" />
                                                <h4>Consola de Despliegue Local</h4>
                                            </div>
                                        </div>
                                        <div className="terminal-console">
                                            {deploymentLogs.length === 0 ? (
                                                <div className="terminal-placeholder">
                                                    <HelpCircle size={32} />
                                                    <span>Selecciona "Deploy" en una aplicación para ver los logs de compilación aquí.</span>
                                                </div>
                                            ) : (
                                                <div className="terminal-logs scroll-panel">
                                                    {deploymentLogs.map((log, idx) => (
                                                        <div key={idx} className="log-line">{log}</div>
                                                    ))}
                                                    {isDeploying && <div className="log-line cursor">▋</div>}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>

                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Modal para editar usuario */}
            {adminEditingUser && (
                <div className="admin-modal-overlay" onClick={() => setAdminEditingUser(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <h2>Editar Usuario</h2>
                        <div className="admin-form-group">
                            <label>Nombre</label>
                            <input
                                type="text"
                                value={adminEditingUser.username}
                                onChange={e => setAdminEditingUser({ ...adminEditingUser, username: e.target.value })}
                            />
                        </div>
                        <div className="admin-form-group">
                            <label>Teléfono</label>
                            <input
                                type="text"
                                value={adminEditingUser.phone_number || ''}
                                onChange={e => setAdminEditingUser({ ...adminEditingUser, phone_number: e.target.value })}
                            />
                        </div>
                        <div className="admin-form-group">
                            <label>Rol</label>
                            <select
                                value={adminEditingUser.role || 'user'}
                                onChange={e => setAdminEditingUser({ ...adminEditingUser, role: e.target.value })}
                            >
                                <option value="user">USER</option>
                            </select>
                        </div>
                        <div className="admin-modal-actions">
                            <button className="cancel-btn" onClick={() => setAdminEditingUser(null)}>Cancelar</button>
                            <button className="save-btn" onClick={() => adminUpdateUser(adminEditingUser, {
                                username: adminEditingUser.username,
                                phone_number: adminEditingUser.phone_number,
                                role: adminEditingUser.role
                            })}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
