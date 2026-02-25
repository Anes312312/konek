import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { User, Settings, Trash2, UserPlus, ShieldCheck, LogOut, CircleDot } from 'lucide-react';

const SERVER_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : 'https://konek.fun';

function AdminDashboard() {
    const [adminUsers, setAdminUsers] = useState([]);
    const [onlineCount, setOnlineCount] = useState(0);
    const [adminEditingUser, setAdminEditingUser] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const socketRef = useRef();

    // Usar el mismo ID del usuario principal del chat
    const [adminId] = useState(() => {
        const existing = localStorage.getItem('konek_userId');
        if (existing) return existing;
        // Si no hay ID, crear uno nuevo para admin
        const newId = 'admin_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('konek_userId', newId);
        return newId;
    });

    useEffect(() => {
        socketRef.current = io(SERVER_URL);

        socketRef.current.on('connect', () => {
            console.log('[Admin] Socket conectado');
            setIsConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            console.log('[Admin] Socket desconectado');
            setIsConnected(false);
        });

        // --- LISTENERS ---
        socketRef.current.on('admin_user_list', (users) => {
            console.log('[Admin] Lista recibida:', users.length, 'usuarios');
            setAdminUsers(users);
            setErrorMsg('');
        });

        socketRef.current.on('online_count', (count) => {
            setOnlineCount(count);
        });

        socketRef.current.on('login_success', (userData) => {
            console.log('[Admin] Login exitoso:', userData.username, 'rol:', userData.role);
            if (userData.role !== 'admin') {
                setErrorMsg('Tu cuenta no tiene permisos de administrador.');
                return;
            }
            // Pedir lista de usuarios tras login exitoso
            socketRef.current.emit('admin_get_all_users', adminId);
        });

        socketRef.current.on('user_list', (users) => {
            // También escuchar user_list como fallback
            console.log('[Admin] user_list recibida:', users.length);
            if (adminUsers.length === 0) {
                setAdminUsers(users);
            }
        });

        socketRef.current.on('error', (err) => {
            console.error('[Admin] Error:', err);
            setErrorMsg(err.message || 'Error desconocido');
        });

        // --- Unirse como Admin ---
        // Obtener el perfil guardado para no sobrescribir datos existentes
        let savedProfile = { name: 'Admin', photo: '', description: 'Dashboard Administrativo' };
        try {
            const stored = localStorage.getItem('konek_profile');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Mantener el nombre como Admin para asegurar el rol
                savedProfile = {
                    name: 'Admin',
                    photo: parsed.photo || '',
                    description: parsed.description || 'Dashboard Administrativo',
                    number: parsed.number || ''
                };
            }
        } catch (e) { /* ignore */ }

        socketRef.current.emit('join', {
            userId: adminId,
            profile: savedProfile
        });

        return () => socketRef.current.disconnect();
    }, [adminId]);

    const refreshUserList = () => {
        if (socketRef.current) {
            console.log('[Admin] Solicitando lista manualmente...');
            socketRef.current.emit('admin_get_all_users', adminId);
        }
    };

    const adminCreateUser = () => {
        const name = prompt('Nombre del nuevo usuario:');
        if (!name) return;
        const number = prompt('Número de identificación:');
        if (!number) return;

        const newUser = {
            id: 'user_' + Math.random().toString(36).substr(2, 9),
            username: name,
            phone_number: number,
            role: 'user'
        };
        socketRef.current.emit('admin_create_user', { adminId, newUser });
    };

    const adminDeleteUser = (targetId) => {
        if (targetId === adminId) {
            alert('No puedes eliminar tu propia cuenta de administrador.');
            return;
        }
        if (window.confirm('¿ELIMINAR este usuario y todos sus datos permanentemente?')) {
            socketRef.current.emit('admin_delete_user', { adminId, userId: targetId });
        }
    };

    const adminUpdateUser = (targetUser, updates) => {
        socketRef.current.emit('admin_update_user', { adminId, userId: targetUser.id, update: updates });
        setAdminEditingUser(null);
    };

    return (
        <div className="admin-page">
            <div className="admin-sidebar-nav">
                <div className="admin-nav-logo">
                    <ShieldCheck size={32} color="#00a884" />
                    <span>Konek Fun Admin</span>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ padding: '10px 16px', fontSize: 11, color: '#8696a0' }}>
                        ID: {adminId.substring(0, 12)}...
                        <br />
                        Estado: {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
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
                                <CircleDot size={20} /> Actualizar Lista
                            </button>
                            <button className="admin-add-btn" onClick={adminCreateUser}>
                                <UserPlus size={20} /> Crear Nuevo Usuario
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
                            margin: '0 0 20px 0',
                            fontSize: '14px'
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
                            <span className="label">Estado del Sistema</span>
                            <span className="value" style={{ fontSize: '18px', color: isConnected ? '#00a884' : '#ef4444' }}>
                                {isConnected ? 'Operacional' : 'Sin conexión'}
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
                                    <th>ID Identificación</th>
                                    <th>Rol</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {adminUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#8696a0' }}>
                                            {isConnected
                                                ? 'No se encontraron usuarios registrados. Haz clic en "Actualizar Lista" para reintentar.'
                                                : 'Conectando al servidor...'}
                                        </td>
                                    </tr>
                                ) : (
                                    adminUsers.map(u => (
                                        <tr key={u.id}>
                                            <td>
                                                <div className="table-user-info">
                                                    <div className="avatar-sm">
                                                        {u.profile_pic && u.profile_pic.length > 0 ? (
                                                            <img src={u.profile_pic} alt={u.username} />
                                                        ) : (
                                                            <User size={16} color="#8696a0" />
                                                        )}
                                                    </div>
                                                    <span>{u.username}</span>
                                                </div>
                                            </td>
                                            <td><code className="id-badge">{u.phone_number || '---'}</code></td>
                                            <td><span className={`role-badge ${u.role}`}>{u.role?.toUpperCase()}</span></td>
                                            <td>
                                                <span className={`status-pill ${u.isOnline ? 'online' : 'offline'}`}>
                                                    {u.isOnline ? 'Online' : 'Offline'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-btns">
                                                    <button className="edit-btn" title="Editar" onClick={() => setAdminEditingUser(u)}>
                                                        <Settings size={18} />
                                                    </button>
                                                    {u.id !== adminId && (
                                                        <button className="delete-btn" title="Eliminar" onClick={() => adminDeleteUser(u.id)}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
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
                            <label>ID Identificación</label>
                            <input
                                type="text"
                                value={adminEditingUser.phone_number || ''}
                                onChange={e => setAdminEditingUser({ ...adminEditingUser, phone_number: e.target.value })}
                            />
                        </div>
                        <div className="admin-form-group">
                            <label>Rol</label>
                            <select
                                value={adminEditingUser.role}
                                onChange={e => setAdminEditingUser({ ...adminEditingUser, role: e.target.value })}
                            >
                                <option value="user">USER</option>
                                <option value="admin">ADMIN</option>
                            </select>
                        </div>
                        <div className="admin-modal-actions">
                            <button className="cancel-btn" onClick={() => setAdminEditingUser(null)}>Cancelar</button>
                            <button className="save-btn" onClick={() => adminUpdateUser(adminEditingUser, {
                                username: adminEditingUser.username,
                                phone_number: adminEditingUser.phone_number,
                                role: adminEditingUser.role
                            })}>Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
