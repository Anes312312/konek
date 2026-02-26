import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { User, Settings, Trash2, UserPlus, ShieldCheck, LogOut, CircleDot, RefreshCw } from 'lucide-react';

const SERVER_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : 'https://konek.fun';

function AdminDashboard() {
    const [adminUsers, setAdminUsers] = useState([]);
    const [onlineCount, setOnlineCount] = useState(0);
    const [adminEditingUser, setAdminEditingUser] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const socketRef = useRef();

    useEffect(() => {
        socketRef.current = io(SERVER_URL);

        socketRef.current.on('connect', () => {
            console.log('[Admin] Socket conectado');
            setIsConnected(true);
            // Autenticarse como admin (NO como usuario del chat)
            socketRef.current.emit('admin_login', { key: 'konek_admin_2024' });
        });

        socketRef.current.on('disconnect', () => {
            setIsConnected(false);
            setIsAuthenticated(false);
        });

        // Admin autenticado exitosamente
        socketRef.current.on('admin_authenticated', () => {
            console.log('[Admin] Autenticado correctamente');
            setIsAuthenticated(true);
            setErrorMsg('');
        });

        // Lista de usuarios
        socketRef.current.on('admin_user_list', (users) => {
            console.log('[Admin] Lista recibida:', users.length, 'usuarios');
            setAdminUsers(users);
            setErrorMsg('');
        });

        socketRef.current.on('online_count', (count) => {
            setOnlineCount(count);
        });

        socketRef.current.on('error', (err) => {
            console.error('[Admin] Error:', err);
            setErrorMsg(err.message || 'Error desconocido');
        });

        return () => socketRef.current.disconnect();
    }, []);

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

    const adminUpdateUser = (targetUser, updates) => {
        socketRef.current.emit('admin_update_user', {
            userId: targetUser.id,
            update: updates
        });
        setAdminEditingUser(null);
    };

    return (
        <div className="admin-page">
            <div className="admin-sidebar-nav">
                <div className="admin-nav-logo">
                    <ShieldCheck size={32} color="#00a884" />
                    <span>Konek Fun Admin</span>
                </div>
                <div style={{ flex: 1, padding: '10px 16px' }}>
                    <div style={{ fontSize: 11, color: '#8696a0' }}>
                        Estado: {isConnected ? (isAuthenticated ? '🟢 Autenticado' : '🟡 Conectando...') : '🔴 Desconectado'}
                    </div>
                </div>
                <button className="admin-logout" onClick={() => window.location.href = '/'}>
                    <LogOut size={20} /> Volver al Chat
                </button>
            </div>

            <div className="admin-main-content">
                <div className="admin-content-inner">
                    <header className="admin-main-header">
                        <h1>Panel de Administración</h1>
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
                            <span className="label">Estado</span>
                            <span className="value" style={{ fontSize: '18px', color: isAuthenticated ? '#00a884' : '#ef4444' }}>
                                {isAuthenticated ? 'Operacional' : 'Sin acceso'}
                            </span>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        <h3 style={{ padding: '20px', margin: 0, fontSize: '16px', color: '#8696a0' }}>
                            Gestión de Usuarios ({adminUsers.length})
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
                                                    <button className="edit-btn" title="Editar" onClick={() => setAdminEditingUser({ ...u })}>
                                                        <Settings size={18} />
                                                    </button>
                                                    <button className="delete-btn" title="Eliminar" onClick={() => adminDeleteUser(u.id)}>
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

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
