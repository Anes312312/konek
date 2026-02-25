import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Search, MoreVertical, Paperclip, Smile, Send, FileText, Download, User, Settings, Check, CheckCheck, MessageCircle, CircleDot, Plus, X, Type, Palette, Trash2, Camera, Mic, Square, ShieldCheck } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
// Eliminamos la librería que daba problemas y usamos un set de emojis estándar y seguro
const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '👣', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁', '👅', '👄', '💋', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'
];
const STATUS_COLORS = ['#075e54', '#128c7e', '#232b30', '#34b7f1', '#667781', '#cf6679', '#9c27b0', '#e91e63', '#ff9800'];
const STATUS_FONTS = ['Inter', 'serif', 'cursive', 'monospace', 'Outfit'];


import './index.css';


// Configuración del servidor dinámica
const SERVER_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.'))
  ? `http://${window.location.hostname}:5000`
  : window.location.origin;

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [userId] = useState(() => {
    const savedId = localStorage.getItem('konek_userId');
    if (savedId) return savedId;
    const newId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('konek_userId', newId);
    return newId;
  });

  const [profile, setProfile] = useState(() => {
    try {
      const savedProfile = localStorage.getItem('konek_profile');
      return savedProfile ? JSON.parse(savedProfile) : {
        name: 'Mi Usuario',
        description: '¡Usando Konek Fun!',
        photo: null,
        number: ''
      };
    } catch (e) {
      console.error("Error parsing profile from localStorage", e);
      return {
        name: 'Mi Usuario',
        description: '¡Usando Konek Fun!',
        photo: null,
        number: ''
      };
    }
  });


  const [activeChat, setActiveChat] = useState(null);
  const [availableUsers, setAvailableUsers] = useState(() => {
    try {
      const savedContacts = localStorage.getItem('konek_contacts');
      return savedContacts ? JSON.parse(savedContacts) : [];
    } catch (e) {
      console.error("Error parsing contacts from localStorage", e);
      return [];
    }
  });
  const [uploadProgress, setUploadProgress] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchNumber, setSearchNumber] = useState('');
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' o 'statuses'
  const [statuses, setStatuses] = useState([]);
  const [viewingGroup, setViewingGroup] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showTextStatusEditor, setShowTextStatusEditor] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusBg, setStatusBg] = useState(STATUS_COLORS[0]);
  const [statusFont, setStatusFont] = useState(STATUS_FONTS[0]);
  const [showStatusEmoji, setShowStatusEmoji] = useState(false);
  const [showMyStatusList, setShowMyStatusList] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState(() => {
    try {
      const savedBlocked = localStorage.getItem('konek_blocked');
      return savedBlocked ? JSON.parse(savedBlocked) : [];
    } catch (e) {
      return [];
    }
  });

  const [unreadCounts, setUnreadCounts] = useState({});
  const [isLinking, setIsLinking] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const setupDone = localStorage.getItem('konek_setup_done');
    const isActuallyNew = !setupDone || setupDone !== 'true';
    console.log('[Konek] Onboarding status:', { setupDone, isActuallyNew });
    return isActuallyNew;
  });
  const activeChatRef = useRef(null);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    localStorage.setItem('konek_blocked', JSON.stringify(blockedUsers));
  }, [blockedUsers]);

  useEffect(() => {
    localStorage.setItem('konek_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('konek_contacts', JSON.stringify(availableUsers));
  }, [availableUsers]);


  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const profilePhotoInputRef = useRef();
  const statusInputRef = useRef();
  const blockedUsersRef = useRef(blockedUsers);

  useEffect(() => {
    blockedUsersRef.current = blockedUsers;
  }, [blockedUsers]);


  useEffect(() => {
    socketRef.current = io(SERVER_URL);

    socketRef.current.emit('join', { userId, profile });

    socketRef.current.on('receive_message', (message) => {
      // Ignorar mensajes de usuarios bloqueados (usando Ref para evitar cierres obsoletos)
      if (blockedUsersRef.current.includes(message.sender_id)) return;

      setMessages((prev) => [...prev, message]);

      // Incrementar contador de no leídos si no es el chat activo
      if (message.sender_id !== userId && (!activeChatRef.current || activeChatRef.current.id !== message.sender_id)) {
        setUnreadCounts(prev => ({
          ...prev,
          [message.sender_id]: (prev[message.sender_id] || 0) + 1
        }));
      }

      // Si el remitente no está en nuestros contactos, añadirlo automáticamente
      if (message.sender_id !== userId && message.sender_id !== 'global') {
        setAvailableUsers(prev => {
          const exists = prev.find(u => u.id === message.sender_id);
          if (exists) {
            // Si ya existe, actualizamos su información por si cambió
            return prev.map(u => u.id === message.sender_id ? {
              ...u,
              username: message.sender_name,
              profile_pic: message.sender_pic,
              phone_number: message.sender_phone
            } : u);
          }

          const newContact = {
            id: message.sender_id,
            username: message.sender_name,
            profile_pic: message.sender_pic,
            phone_number: message.sender_phone
          };
          return [...prev, newContact];
        });
      }
    });

    socketRef.current.on('error', (err) => {
      alert(err.message);
      if (err.message.includes('en uso')) {
        setShowProfileModal(true);
      }
    });

    socketRef.current.on('user_found', (user) => {
      if (user) {
        if (user.id === userId) {
          alert('No puedes chatear contigo mismo.');
          return;
        }
        setAvailableUsers(prev => {
          if (prev.find(u => u.id === user.id)) {
            // Si ya existe, solo activamos el chat pero no lo añadimos de nuevo
            return prev;
          }
          return [...prev, user];
        });
        setActiveChat({ id: user.id, name: user.username });
        setSearchNumber('');
      } else {
        alert('Número no encontrado en la base de datos.');
      }
    });

    socketRef.current.on('chat_history', ({ contactId, messages: history }) => {
      setMessages(history);
    });

    socketRef.current.on('user_list', (users) => {
      // Actualizar la lista de contactos locales con la información más reciente del servidor
      setAvailableUsers(prev => {
        return prev.map(contact => {
          const updatedUser = users.find(u => u.id === contact.id);
          return updatedUser ? updatedUser : contact;
        });
      });

      // ¡NUEVO! Sincronizar mi propio perfil si el admin lo cambió desde el panel
      const me = users.find(u => u.id === userId);
      if (me) {
        setProfile(prev => ({
          ...prev,
          name: me.username || prev.name,
          number: me.phone_number || prev.number,
          role: me.role || prev.role,
          photo: me.profile_pic || prev.photo,
          description: me.status || prev.description
        }));
      }
    });

    socketRef.current.on('status_list', (statusList) => {
      setStatuses(statusList);
    });

    socketRef.current.on('login_success', (userData) => {
      setProfile(prev => ({ ...prev, role: userData.role, number: userData.phone_number || '' }));
      // Si el servidor dice que ya tiene nombre real y no es el default, quitamos onboarding
      if (userData.username && userData.username !== 'Mi Usuario') {
        localStorage.setItem('konek_setup_done', 'true');
        setShowOnboarding(false);
      }
    });

    socketRef.current.on('user_deleted', () => {
      alert('Tu cuenta ha sido eliminada por el administrador.');
      localStorage.clear();
      window.location.reload();
    });

    socketRef.current.emit('request_statuses');

    return () => socketRef.current.disconnect();
  }, [userId]);

  // Manejar el tiempo de los estados (historias)
  useEffect(() => {
    let timer;
    if (viewingGroup) {
      timer = setTimeout(() => {
        if (currentIdx < viewingGroup.items.length - 1) {
          setCurrentIdx(prev => prev + 1);
        } else {
          setViewingGroup(null);
          setCurrentIdx(0);
        }
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [viewingGroup, currentIdx]);

  // Sincronizar el grupo que se está viendo con la lista global de estados (para borrados en tiempo real)
  useEffect(() => {
    if (viewingGroup) {
      const grouped = statuses.reduce((acc, s) => {
        if (!acc[s.user_id]) acc[s.user_id] = { ...s, items: [] };
        acc[s.user_id].items.push(s);
        return acc;
      }, {});

      const updatedGroup = grouped[viewingGroup.user_id];
      if (!updatedGroup) {
        setViewingGroup(null);
      } else {
        setViewingGroup(updatedGroup);
        if (currentIdx >= updatedGroup.items.length) {
          setCurrentIdx(Math.max(0, updatedGroup.items.length - 1));
        }
      }
    }
  }, [statuses]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (activeChat && socketRef.current) {
      // Limpiar no leídos para este chat
      setUnreadCounts(prev => ({
        ...prev,
        [activeChat.id]: 0
      }));

      if (activeChat.id === 'global') {
        socketRef.current.emit('request_global_history');
      } else {
        socketRef.current.emit('request_chat_history', { userId, contactId: activeChat.id });
      }
    }
  }, [activeChat, userId]);

  const sendMessage = (e) => {
    e?.preventDefault();
    if (!input.trim() || !activeChat) return;

    if (blockedUsers.includes(activeChat.id)) {
      alert('Has bloqueado a este usuario. Desbloquéalo para enviar mensajes.');
      return;
    }

    const newMessage = {
      id: uuidv4(),
      sender_id: userId,
      receiver_id: activeChat.id,
      content: input,
      type: 'text',
      timestamp: new Date().toISOString()
    };

    socketRef.current.emit('send_message', newMessage);
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
  };

  const uploadGenericFile = async (file, forcedType = null) => {
    if (!file) return;

    const fileId = uuidv4();
    const totalSize = file.size;
    const chunkSize = 10 * 1024 * 1024; // 10MB por trozo
    let start = 0;

    setUploadProgress({ name: file.name, progress: 0 });

    try {
      // Inicializar carga en servidor
      await axios.post(`${SERVER_URL}/api/upload/init`, {
        fileName: file.name,
        totalSize,
        id: fileId
      });

      while (start < totalSize) {
        const end = Math.min(start + chunkSize, totalSize);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('fileId', fileId);
        formData.append('fileName', file.name);

        await axios.post(`${SERVER_URL}/api/upload/chunk`, formData);

        start = end;
        setUploadProgress({ name: file.name, progress: Math.round((start / totalSize) * 100) });
      }

      // Enviar mensaje de archivo al terminar la carga
      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/') || file.name.endsWith('.webm');
      const finalType = forcedType || (isImage ? 'image' : isAudio ? 'audio' : 'file');

      const fileMessage = {
        id: uuidv4(),
        sender_id: userId,
        receiver_id: activeChat.id,
        content: finalType === 'audio' ? 'Mensaje de voz' : `Envió un archivo: ${file.name}`,
        type: finalType,
        file_info: {
          id: fileId,
          name: file.name,
          size: totalSize,
          path: `${fileId}_${file.name}`,
          mimeType: file.type
        },
        timestamp: new Date().toISOString()
      };

      socketRef.current.emit('send_message', fileMessage);
      setMessages((prev) => [...prev, fileMessage]);
      setUploadProgress(null);

    } catch (error) {
      console.error('Error al subir archivo:', error);
      alert('Error al subir el archivo.');
      setUploadProgress(null);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) uploadGenericFile(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
        await uploadGenericFile(audioFile, 'audio');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Remove stop listener to avoid sending
      mediaRecorderRef.current.onstop = () => {
        setIsRecording(false);
        clearInterval(recordingTimerRef.current);
        const stream = mediaRecorderRef.current.stream;
        if (stream) stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
    }
  };

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleProfilePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addEmoji = (emoji) => {
    setInput(prev => prev + emoji);
    // No cerramos el picker para poder poner varios emojis seguidos, igual que en WhatsApp
  };

  const saveProfile = () => {
    // Sincronizar con el servidor
    socketRef.current.emit('update_profile', { userId, profile });
    setShowProfileModal(false);
  };

  const completeOnboarding = () => {
    if (!profile.name.trim() || profile.name === 'Mi Usuario') {
      alert("Por favor, introduce un nombre real para continuar.");
      return;
    }
    localStorage.setItem('konek_setup_done', 'true');
    setShowOnboarding(false);
    socketRef.current.emit('update_profile', { userId, profile });
  };

  const deleteChat = (userIdToDelete) => {
    if (window.confirm('¿Estás seguro de que deseas borrar este chat? Se eliminará la lista de mensajes localmente.')) {
      // Eliminar de los contactos disponibles
      setAvailableUsers(prev => prev.filter(u => u.id !== userIdToDelete));
      // Limpiar los mensajes de este chat específico
      setMessages(prev => prev.filter(msg =>
        !((msg.sender_id === userId && msg.receiver_id === userIdToDelete) ||
          (msg.sender_id === userIdToDelete && msg.receiver_id === userId))
      ));
      setActiveChat(null);
      setShowChatMenu(false);
    }
  };

  const toggleBlockUser = (userToBlock) => {
    const isBlocked = blockedUsers.includes(userToBlock.id);
    if (isBlocked) {
      setBlockedUsers(prev => prev.filter(id => id !== userToBlock.id));
      alert(`${userToBlock.name} ha sido desbloqueado.`);
    } else {
      if (window.confirm(`¿Bloquear a ${userToBlock.name}? No podrás enviarle ni recibir sus mensajes.`)) {
        setBlockedUsers(prev => [...prev, userToBlock.id]);
      }
    }
    setShowChatMenu(false);
  };

  const publishStatus = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Solo imágenes para estados por ahora para simplificar
    if (!file.type.startsWith('image/')) {
      alert('Por ahora solo puedes subir imágenes como estado.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const newStatus = {
        id: uuidv4(),
        user_id: userId,
        content: reader.result,
        type: 'image',
        timestamp: new Date().toISOString()
      };
      socketRef.current.emit('publish_status', newStatus);
    };
    reader.readAsDataURL(file);
  };

  const publishTextStatus = () => {
    if (!statusText.trim()) return;
    const newStatus = {
      id: uuidv4(),
      user_id: userId,
      content: JSON.stringify({ text: statusText, bg: statusBg, font: statusFont }),
      type: 'text',
      timestamp: new Date().toISOString()
    };
    socketRef.current.emit('publish_status', newStatus);
    setShowTextStatusEditor(false);
    setStatusText('');
  };

  const deleteStatus = (statusId) => {
    if (statusId && window.confirm('¿Eliminar este estado?')) {
      socketRef.current.emit('delete_status', statusId);
      if (viewingGroup) {
        if (viewingGroup.items.length > 1) {
          const newItems = viewingGroup.items.filter(i => i.id !== statusId);
          setViewingGroup({ ...viewingGroup, items: newItems });
          if (currentIdx >= newItems.length) setCurrentIdx(newItems.length - 1);
        } else {
          setViewingGroup(null);
        }
      }
    }
  };

  const startNewChat = (e) => {
    e.preventDefault();
    if (!searchNumber.trim()) return;
    socketRef.current.emit('find_user_by_number', searchNumber);
  };

  const handleLinkNumber = () => {
    const num = prompt("Introduce el número de identificación proporcionado por el Admin:");
    if (num) {
      setIsLinking(true);
      socketRef.current.emit('find_user_by_number', num);
    }
  };

  // Escuchar cuando se encuentra un usuario para vincular
  useEffect(() => {
    if (!socketRef.current) return;

    const handleUserFound = (user) => {
      if (!isLinking) return; // Solo actuar si viene de handleLinkNumber

      setIsLinking(false);
      if (user) {
        if (user.id === userId) {
          alert('Este número ya está vinculado a tu sesión actual.');
          return;
        }
        if (window.confirm(`¿Vincular a la cuenta de "${user.username}" con número ${user.phone_number}? (Se reiniciará la aplicación)`)) {
          localStorage.setItem('konek_userId', user.id);
          localStorage.setItem('konek_profile', JSON.stringify({
            name: user.username,
            photo: user.profile_pic,
            description: user.status,
            number: user.phone_number,
            role: user.role
          }));
          window.location.reload();
        }
      } else {
        alert('No se encontró ningún usuario con ese número de identificación.');
      }
    };

    socketRef.current.on('user_found', handleUserFound);
    return () => socketRef.current.off('user_found', handleUserFound);
  }, [userId, isLinking]);

  return (
    <div className="app-container">
      {/* Barra Lateral */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div
            className="avatar"
            onClick={() => setShowProfileModal(true)}
            style={{
              width: 40, height: 40, background: '#6a7175', borderRadius: '50%', cursor: 'pointer',
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {profile.photo ? <img src={profile.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User color="white" size={20} />}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="icon-btn" onClick={() => setShowProfileModal(true)}><Settings size={20} /></button>
            <button className="icon-btn"><MoreVertical size={20} /></button>
          </div>
        </div>

        {/* Navegación por Pestañas */}
        <div className="tab-navigation">
          <div
            className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            <MessageCircle size={20} />
            <span>CHATS</span>
          </div>
          <div
            className={`tab-btn ${activeTab === 'statuses' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('statuses');
              socketRef.current.emit('request_statuses');
            }}
          >
            <CircleDot size={20} />
            <span>ESTADOS</span>
          </div>
        </div>

        {activeTab === 'chats' ? (
          <>
            <div className="search-container">
              <form onSubmit={startNewChat} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Escribe un número para chatear"
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                />
                <button type="submit" className="icon-btn" style={{ background: 'var(--wa-accent)', color: 'white', borderRadius: '8px' }}>
                  <Search size={18} />
                </button>
              </form>
            </div>

            <div className="chat-list">
              <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--wa-accent)', fontWeight: 600, textTransform: 'uppercase' }}>
                Mis Conversaciones
              </div>

              {availableUsers.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--wa-text-secondary)', fontSize: 13 }}>
                  No tienes chats abiertos. Ingresa un número arriba para empezar.
                </div>
              )}

              {availableUsers.map(user => (
                <div key={user.id} className={`chat-item ${activeChat?.id === user.id ? 'active' : ''}`} onClick={() => setActiveChat({ id: user.id, name: user.username })}>
                  <div className="avatar" style={{ width: 48, height: 48, background: '#6a7175', borderRadius: '50%', marginRight: 15, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {user.profile_pic ? <img src={user.profile_pic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User color="white" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500 }}>{user.username}</span>
                      {blockedUsers.includes(user.id) && (
                        <span style={{ fontSize: 10, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>BLOQUEADO</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <div style={{ fontSize: 13, color: 'var(--wa-text-secondary)' }}>
                        #{user.phone_number}
                      </div>
                      {unreadCounts[user.id] > 0 && (
                        <div style={{
                          background: '#25d366',
                          color: '#111b21',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700
                        }}>
                          {unreadCounts[user.id]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="status-list-container">
            <div className="status-section">
              {(() => {
                const grouped = statuses.reduce((acc, s) => {
                  if (!acc[s.user_id]) acc[s.user_id] = { ...s, items: [] };
                  acc[s.user_id].items.push(s);
                  return acc;
                }, {});

                const myGroup = grouped[userId];
                return (
                  <>
                    <div className="status-item self">
                      <div className="status-avatar-wrapper" onClick={() => {
                        if (myGroup) {
                          setViewingGroup(myGroup);
                          setCurrentIdx(0);
                        }
                      }}>
                        <div className={`avatar ${myGroup ? 'status-ring' : ''}`} style={{ width: 48, height: 48, background: '#6a7175', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {profile.photo ? <img src={profile.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User color="white" />}
                        </div>
                      </div>
                      <div style={{ flex: 1, marginLeft: 15 }} onClick={() => {
                        if (myGroup) {
                          setViewingGroup(myGroup);
                          setCurrentIdx(0);
                        }
                      }}>
                        <div style={{ fontWeight: 500, color: 'var(--wa-text)' }}>Mi estado</div>
                        <div style={{ fontSize: 13, color: 'var(--wa-text-secondary)', marginTop: 4 }}>
                          {myGroup ? 'Toca para ver tus actualizaciones' : 'Toca para añadir una actualización'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {myGroup && (
                          <button className="icon-btn-circle small" onClick={(e) => {
                            e.stopPropagation();
                            setShowMyStatusList(!showMyStatusList);
                          }}>
                            <MoreVertical size={16} color="white" />
                          </button>
                        )}
                        <button className="icon-btn-circle" onClick={() => statusInputRef.current.click()}>
                          <Camera size={18} color="white" />
                        </button>
                        <button className="icon-btn-circle" onClick={() => setShowTextStatusEditor(true)}>
                          <Type size={18} color="white" />
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={statusInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={publishStatus}
                      />
                    </div>

                    {showMyStatusList && myGroup && (
                      <div className="my-statuses-list" style={{ padding: '0 16px', marginBottom: 15 }}>
                        <div style={{ fontSize: 11, color: 'var(--wa-accent)', marginBottom: 8, marginTop: 5 }}>MIS ACTUALIZACIONES</div>
                        {myGroup.items.map((item, idx) => (
                          <div key={item.id} className="my-status-sub-item" style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div
                              className="mini-preview"
                              style={{ width: 36, height: 36, borderRadius: '50%', background: item.type === 'text' ? JSON.parse(item.content).bg : '#3b4a54', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              onClick={() => {
                                setViewingGroup(myGroup);
                                setCurrentIdx(idx);
                              }}
                            >
                              {item.type === 'image' ? <img src={item.content} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Type size={14} color="white" />}
                            </div>
                            <div style={{ flex: 1, marginLeft: 12, fontSize: 13, cursor: 'pointer' }} onClick={() => {
                              setViewingGroup(myGroup);
                              setCurrentIdx(idx);
                            }}>
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <button className="icon-btn" onClick={() => deleteStatus(item.id)}>
                              <Trash2 size={16} color="#ef4444" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--wa-accent)', fontWeight: 600, textTransform: 'uppercase' }}>
              RECIENTES
            </div>

            <div className="status-items">
              {(() => {
                const grouped = statuses.reduce((acc, s) => {
                  if (!acc[s.user_id]) acc[s.user_id] = { ...s, items: [] };
                  acc[s.user_id].items.push(s);
                  return acc;
                }, {});

                return Object.values(grouped)
                  .filter(g => g.user_id !== userId)
                  .sort((a, b) => new Date(b.items[0].timestamp) - new Date(a.items[0].timestamp))
                  .map(group => (
                    <div key={group.user_id} className="status-item" onClick={() => {
                      setViewingGroup(group);
                      setCurrentIdx(0);
                    }}>
                      <div className="avatar status-ring" style={{ width: 48, height: 48, background: '#6a7175', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {group.profile_pic ? <img src={group.profile_pic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User color="white" />}
                      </div>
                      <div style={{ flex: 1, marginLeft: 15 }}>
                        <div style={{ fontWeight: 500 }}>{group.username}</div>
                        <div style={{ fontSize: 13, color: 'var(--wa-text-secondary)', marginTop: 4 }}>
                          {new Date(group.items[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ));
              })()}
            </div>
          </div>
        )}
      </div>

      <div className="chat-window">
        {!activeChat ? (
          <div className="chat-placeholder">
            <div className="placeholder-content">
              <div className="logo-placeholder">
                <MessageCircle size={80} color="#3b4a54" />
              </div>
              <h2>Konek Fun</h2>
              <p>Envía y recibe mensajes sin mantener tu teléfono conectado.<br />Usa Konek Fun en hasta 4 dispositivos vinculados y 1 teléfono a la vez.</p>
              <div style={{ marginTop: '60px', fontSize: 12, color: 'var(--wa-text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCheck size={14} /> Cifrado de extremo a extremo
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div className="avatar" style={{ width: 40, height: 40, background: '#00a884', borderRadius: '50%', marginRight: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {availableUsers.find(u => u.id === activeChat.id)?.profile_pic ? (
                  <img src={availableUsers.find(u => u.id === activeChat.id).profile_pic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : <User color="white" size={20} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{activeChat.name}</div>
                <div style={{ fontSize: 12, color: 'var(--wa-text-secondary)' }}>Chat Privado</div>
              </div>
              <div style={{ display: 'flex', gap: 15, position: 'relative' }}>
                <button className="icon-btn"><Search size={20} /></button>
                <button
                  className="icon-btn"
                  onClick={() => setShowChatMenu(!showChatMenu)}
                >
                  <MoreVertical size={20} />
                </button>

                {showChatMenu && (
                  <div className="dropdown-menu">
                    <div className="dropdown-item" onClick={() => deleteChat(activeChat.id)}>
                      Borrar chat
                    </div>
                    <div className="dropdown-item" onClick={() => toggleBlockUser(activeChat)}>
                      {blockedUsers.includes(activeChat.id) ? 'Desbloquear usuario' : 'Bloquear usuario'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="messages-container">
              {messages
                .filter(msg => (msg.sender_id === userId && msg.receiver_id === activeChat.id) ||
                  (msg.sender_id === activeChat.id && msg.receiver_id === userId))
                .map((msg) => (

                  <div key={msg.id} className={`message ${msg.sender_id === userId ? 'me' : 'other'}`}>
                    <div style={{ fontWeight: 500, fontSize: 12, marginBottom: 4, color: msg.sender_id === userId ? '#ffbd69' : '#53bdeb' }}>
                      {msg.sender_id === userId ? profile.name : 'Usuario'}
                    </div>
                    {msg.type === 'image' ? (
                      <div style={{ padding: '2px', position: 'relative' }}>
                        <img
                          src={`${SERVER_URL}/api/download/${msg.file_info.id}/${msg.file_info.name}`}
                          alt={msg.file_info.name}
                          style={{
                            maxWidth: '100%',
                            borderRadius: '4px',
                            display: 'block',
                            maxHeight: '300px',
                            cursor: 'pointer'
                          }}
                          onClick={() => window.open(`${SERVER_URL}/api/download/${msg.file_info.id}/${msg.file_info.name}`, '_blank')}
                        />
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                          {msg.file_info.name} ({(msg.file_info.size / (1024 * 1024)).toFixed(2)} MB)
                        </div>
                      </div>
                    ) : msg.type === 'audio' ? (
                      <div style={{ padding: '5px' }}>
                        <audio
                          src={`${SERVER_URL}/api/download/${msg.file_info.id}/${msg.file_info.name}`}
                          controls
                          style={{ height: '35px', width: '220px' }}
                        />
                      </div>
                    ) : msg.type === 'file' ? (
                      <div className="file-message">
                        <FileText size={32} color="#8696a0" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14 }}>{msg.file_info.name}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                            {(msg.file_info.size / (1024 * 1024 * 1024)).toFixed(2)} GB
                          </div>
                        </div>
                        <a
                          href={`${SERVER_URL}/api/download/${msg.file_info.id}/${msg.file_info.name}`}
                          download
                          className="icon-btn"
                        >
                          <Download size={20} />
                        </a>
                      </div>
                    ) : (
                      <span>{msg.content}</span>
                    )}

                    <div className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.sender_id === userId && <CheckCheck size={14} style={{ marginLeft: 4, verticalAlign: 'middle', color: '#53bdeb' }} />}
                    </div>
                  </div>
                ))}
              {uploadProgress && (
                <div className="message me" style={{ opacity: 0.8 }}>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>Subiendo: {uploadProgress.name}</div>
                  <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                    <div style={{ width: `${uploadProgress.progress}%`, height: '100%', background: '#53bdeb', borderRadius: 2 }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              {isRecording ? (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 10 }}>
                  <button className="icon-btn" onClick={cancelRecording}>
                    <Trash2 size={24} color="#ef4444" />
                  </button>
                  <div style={{ flex: 1, color: '#ef4444', animation: 'pulsate 1.5s infinite', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, background: '#ef4444', borderRadius: '50%' }}></div>
                    <span>Grabando {formatTime(recordingTime)}</span>
                  </div>
                  <button className="icon-btn" onClick={stopRecording} style={{ background: '#00a884', borderRadius: '50%', padding: 8 }}>
                    <Send size={24} color="white" />
                  </button>
                </div>
              ) : (
                <>
                  <button className="icon-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                    <Smile size={24} />
                  </button>
                  {showEmojiPicker && (
                    <div className="emoji-picker">
                      <div className="emoji-grid">
                        {COMMON_EMOJIS.map((emoji, index) => (
                          <span key={index} className="emoji-item" onClick={() => addEmoji(emoji)}>{emoji}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button className="icon-btn" onClick={() => document.getElementById('fileInput').click()}>
                    <Paperclip size={24} />
                  </button>
                  <input
                    type="file"
                    id="fileInput"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />

                  <div className="input-wrapper">
                    <input
                      type="text"
                      className="message-input"
                      placeholder="Escribe un mensaje"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    />
                  </div>

                  {input ? (
                    <button className="icon-btn" onClick={sendMessage}>
                      <Send size={24} color="#00a884" />
                    </button>
                  ) : (
                    <button className="icon-btn" onClick={startRecording}>
                      <Mic size={24} />
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* --- SECCIÓN DE MODALES (Al final para asegurar visibilidad) --- */}

      {/* Modal de Bienvenida (Onboarding) */}
      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="onboarding-card">
            <div className="onboarding-header">
              <div className="onboarding-logo">
                <MessageCircle size={48} color="white" />
              </div>
              <h2>Bienvenido a Konek Fun</h2>
              <p>Configura tu perfil para empezar a chatear</p>
            </div>

            <div className="onboarding-body">
              <div className="profile-photo-edit large" onClick={() => profilePhotoInputRef.current.click()}>
                {profile.photo ? <img src={profile.photo} /> : <div className="placeholder"><Camera size={50} /></div>}
                <div className="overlay"><Camera size={24} /> AÑADIR FOTO</div>
              </div>

              <div className="input-group">
                <label>¿Cómo te llamas?</label>
                <input
                  type="text"
                  placeholder="Tu nombre o apodo"
                  value={profile.name === 'Mi Usuario' ? '' : profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>

              <div className="info-box">
                <ShieldCheck size={20} color="var(--wa-accent)" />
                <div>
                  <strong>Identificación oficial</strong>
                  <p>Una vez dentro, el administrador te asignará un número de ID único para validar tu cuenta.</p>
                </div>
              </div>

              <button className="onboarding-submit" onClick={completeOnboarding}>
                Empezar a usar Konek Fun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Perfil */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Perfil</h3>
              <button onClick={() => setShowProfileModal(false)} className="icon-btn">×</button>
            </div>
            <div className="profile-edit-body">
              <div className="profile-photo-edit" onClick={() => profilePhotoInputRef.current.click()}>
                {profile.photo ? <img src={profile.photo} /> : <div className="placeholder"><Camera size={40} /></div>}
                <div className="overlay"><Camera size={24} /> CAMBIAR FOTO</div>
              </div>
              <input type="file" ref={profilePhotoInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleProfilePhotoUpload} />

              <div className="input-group">
                <label>Tu nombre</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Tu número de identificación</label>
                <div
                  className={`id-number-display ${profile.number ? 'active' : 'pending'}`}
                  style={{
                    padding: '12px',
                    background: profile.number ? 'rgba(0, 168, 132, 0.1)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    color: profile.number ? 'var(--wa-accent)' : 'var(--wa-text-secondary)',
                    fontSize: '15px',
                    border: profile.number ? '1px solid var(--wa-accent)' : '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: profile.number ? '600' : '400'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {profile.number ? <ShieldCheck size={18} /> : <CircleDot size={18} className="pulse" />}
                    {profile.number || 'Pendiente de asignar'}
                  </div>
                  {!profile.number && (
                    <button
                      onClick={handleLinkNumber}
                      style={{
                        background: 'var(--wa-accent)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        padding: '4px 8px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      Vincular
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'var(--wa-text-secondary)', marginTop: 8 }}>
                  {profile.number
                    ? 'Este ID es único y verifica tu identidad en Konek Fun.'
                    : 'Solicita tu número al administrador para activar todas las funciones.'}
                </p>
              </div>

              <div className="input-group">
                <label>Descripción</label>
                <input
                  type="text"
                  value={profile.description}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                />
              </div>

              <button className="save-btn" onClick={saveProfile}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Editor de Estado de Texto */}
      {showTextStatusEditor && (
        <div className="status-editor-overlay" style={{ background: statusBg }}>
          <div className="status-editor-header">
            <button className="icon-btn" onClick={() => setShowTextStatusEditor(false)}><X size={24} color="white" /></button>
            <div style={{ display: 'flex', gap: 15 }}>
              <button className="icon-btn" onClick={() => {
                const colors = STATUS_COLORS;
                const idx = colors.indexOf(statusBg);
                setStatusBg(colors[(idx + 1) % colors.length]);
              }}><Palette size={24} color="white" /></button>
              <button className="icon-btn" onClick={() => {
                const fonts = STATUS_FONTS;
                const idx = fonts.indexOf(statusFont);
                setStatusFont(fonts[(idx + 1) % fonts.length]);
              }}><Type size={24} color="white" /></button>
              <button className="icon-btn" onClick={() => setShowStatusEmoji(!showStatusEmoji)}><Smile size={24} color="white" /></button>
            </div>
          </div>

          <div className="status-editor-content">
            <textarea
              autoFocus
              placeholder="Escribe un estado"
              style={{ fontFamily: statusFont }}
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              maxLength={700}
            />

            {showStatusEmoji && (
              <div className="status-emoji-picker">
                <div className="status-emoji-grid">
                  {COMMON_EMOJIS.map((emoji, index) => (
                    <span key={index} className="emoji-item" onClick={() => {
                      setStatusText(prev => prev + emoji);
                    }}>{emoji}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button className="send-status-btn" onClick={publishTextStatus}>
            <Send size={24} color="white" />
          </button>
        </div>
      )}

      {/* Visor de Estados */}
      {viewingGroup && (
        <div className="status-viewer-overlay">
          <div className="status-viewer-progress">
            {viewingGroup.items.map((item, idx) => (
              <div key={item.id} className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: idx < currentIdx ? '100%' : idx === currentIdx ? '100%' : '0%',
                    transition: idx === currentIdx ? 'width 5s linear' : 'none'
                  }}
                />
              </div>
            ))}
          </div>

          <div className="status-viewer-header">
            <div className="user-info">
              <div className="avatar-small">
                {viewingGroup.profile_pic ? <img src={viewingGroup.profile_pic} /> : <User color="white" size={16} />}
              </div>
              <div style={{ marginLeft: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{viewingGroup.username}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{new Date(viewingGroup.items[currentIdx].timestamp).toLocaleString()}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {viewingGroup.user_id === userId && (
                <button className="icon-btn" onClick={() => deleteStatus(viewingGroup.items[currentIdx].id)}>
                  <Trash2 size={20} color="white" />
                </button>
              )}
              <button className="icon-btn" onClick={() => setViewingGroup(null)}>
                <X size={24} color="white" />
              </button>
            </div>
          </div>

          <div className="status-viewer-content">
            {viewingGroup.items[currentIdx].type === 'image' ? (
              <img src={viewingGroup.items[currentIdx].content} />
            ) : (
              <div
                className="text-status-view"
                style={{
                  background: JSON.parse(viewingGroup.items[currentIdx].content).bg,
                  fontFamily: JSON.parse(viewingGroup.items[currentIdx].content).font
                }}
              >
                {JSON.parse(viewingGroup.items[currentIdx].content).text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
