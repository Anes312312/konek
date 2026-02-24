import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { User, Settings, Trash2, UserPlus, ShieldCheck, LogOut, Search, MoreVertical, Paperclip, Smile, Send, FileText, Download, Check, CheckCheck, MessageCircle, CircleDot, Plus, X, Type, Palette, Camera } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const SERVER_URL = 'http://localhost:5000'; // Ajustar según sea necesario

function AdminDashboard() {
    const [adminUsers, setAdminUsers] = useState([]);
    const [onlineCount, setOnlineCount] = useState(0);
    const [adminEditingUser, setAdminEditingUser] = useState(null);
    const socketRef = useRef();

    // Generar o recuperar ID de Admin (puedes hacerlo más formal luego)
    const [adminId] = useState(() => localStorage.getItem('konek_admin_id') || 'admin_' + Math.random().toString(36).substr(2, 9));

    useEffect(() => {
        localStorage.setItem('konek_admin_id', adminId);
        socketRef.current = io(SERVER_URL);

        // Unirse como admin (el servidor debe validar esto, por ahora es nominal)
        socketRef.current.emit('join', {
            userId: adminId,
            profile: { name: 'Admin', photo: '', description: 'Dashboard Administrativo' }
        });

        socketRef.current.on('admin_user_list', (users) => {
            setAdminUsers(users);
        });

        socketRef.current.on('online_count', (count) => {
            setOnlineCount(count);
        });

        // Pedir lista inicial
        socketRef.current.emit('admin_get_all_users', adminId);

        return () => socketRef.current.disconnect();
    }, [adminId]);

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
                    {/* Espacio para futuros enlaces de navegación */}
                </div>
                <button className="admin-logout" onClick={() => window.location.href = '/'}>
                    <LogOut size={20} /> Volver al Chat
                </button>
            </div>

            <div className="admin-main-content">
                <div className="admin-content-inner">
                    <header className="admin-main-header">
                        <h1>Panel de Administración</h1>
                        <button className="admin-add-btn" onClick={adminCreateUser}>
                            <UserPlus size={20} /> Crear Nuevo Usuario
                        </button>
                    </header>

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
                            <span className="value" style={{ fontSize: '18px', color: '#00a884' }}>Operacional</span>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        <h3 style={{ padding: '20px', margin: 0, fontSize: '16px', color: '#8696a0' }}>Gestión de Usuarios</h3>
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
                                {adminUsers.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="table-user-info">
                                                <div className="avatar-sm">
                                                    {u.profile_pic ? <img src={u.profile_pic} /> : <User size={16} color="#8696a0" />}
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
                                                <button className="edit-btn" onClick={() => setAdminEditingUser(u)}>
                                                    <Settings size={18} />
                                                </button>
                                                <button className="delete-btn" onClick={() => adminDeleteUser(u.id)}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
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
