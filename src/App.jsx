import React, { useState, useEffect, useRef, useMemo } from "react";
import io from "socket.io-client";
import {
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  FileText,
  Download,
  User,
  Settings,
  Check,
  CheckCheck,
  MessageCircle,
  CircleDashed,
  CircleDot,
  Plus,
  X,
  Type,
  Palette,
  Trash2,
  Camera,
  Mic,
  Square,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Share2,
  Image as ImageIcon,
  Pencil,
  Gamepad2,
  Trophy,
  Globe,
  Clock,
  CheckCircle2,
  FileVideo,
  Play,
  Users
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
// Eliminamos la librería que daba problemas y usamos un set de emojis estándar y seguro
const COMMON_EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😅",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🙂",
  "🙃",
  "😉",
  "😌",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😙",
  "😚",
  "😋",
  "😛",
  "😝",
  "😜",
  "🤪",
  "🤨",
  "🧐",
  "🤓",
  "😎",
  "🤩",
  "🥳",
  "😏",
  "😒",
  "😞",
  "😔",
  "😟",
  "😕",
  "🙁",
  "☹️",
  "😣",
  "😖",
  "😫",
  "😩",
  "🥺",
  "😢",
  "😭",
  "😤",
  "😠",
  "😡",
  "🤬",
  "🤯",
  "😳",
  "🥵",
  "🥶",
  "😱",
  "😨",
  "😰",
  "😥",
  "😓",
  "🤗",
  "🤔",
  "🤭",
  "🤫",
  "🤥",
  "😶",
  "😐",
  "😑",
  "😬",
  "🙄",
  "😯",
  "😦",
  "😧",
  "😮",
  "😲",
  "🥱",
  "😴",
  "🤤",
  "😪",
  "😵",
  "🤐",
  "🥴",
  "🤢",
  "🤮",
  "🤧",
  "😷",
  "🤒",
  "🤕",
  "🤑",
  "🤠",
  "😈",
  "👿",
  "👹",
  "👺",
  "🤡",
  "💩",
  "👻",
  "💀",
  "☠️",
  "👽",
  "👾",
  "🤖",
  "🎃",
  "😺",
  "😸",
  "😹",
  "😻",
  "😼",
  "😽",
  "🙀",
  "😿",
  "😾",
  "👋",
  "🤚",
  "🖐",
  "✋",
  "🖖",
  "👌",
  "🤏",
  "✌️",
  "🤞",
  "🤟",
  "🤘",
  "🤙",
  "👈",
  "👉",
  "👆",
  "🖕",
  "👇",
  "☝️",
  "👍",
  "👎",
  "✊",
  "👊",
  "🤛",
  "🤜",
  "👏",
  "🙌",
  "👐",
  "🤲",
  "🤝",
  "🙏",
  "✍️",
  "💅",
  "🤳",
  "💪",
  "🦾",
  "🦵",
  "🦿",
  "👣",
  "👂",
  "🦻",
  "👃",
  "🧠",
  "🦷",
  "🦴",
  "👀",
  "👁",
  "👅",
  "👄",
  "💋",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🖤",
  "🤍",
  "🤎",
  "💔",
  "❣️",
  "💕",
  "💞",
  "💓",
  "💗",
  "💖",
  "💘",
  "💝",
  "💟",
];
const STATUS_COLORS = [
  "#075e54",
  "#128c7e",
  "#232b30",
  "#34b7f1",
  "#667781",
  "#cf6679",
  "#9c27b0",
  "#e91e63",
  "#ff9800",
];
const STATUS_FONTS = ["Inter", "serif", "cursive", "monospace", "Outfit"];

import "./index.css";

// Configuración del servidor dinámica
// Configuración para el dominio konek.fun
const SERVER_URL =
  window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : "https://konek.fun";

const renderMessageText = (text) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      if (part.includes('youtube.com/watch') || part.includes('youtu.be/')) {
        let videoId = '';
        if (part.includes('youtube.com/watch')) {
          try { videoId = new URL(part).searchParams.get('v'); } catch (e) { }
        } else if (part.includes('youtu.be/')) {
          videoId = part.split('youtu.be/')[1].split('?')[0];
        }
        if (videoId) {
          return (
            <div key={i} style={{ marginTop: 8, display: 'flex', flexDirection: 'column' }}>
              <a href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#53bdeb', textDecoration: 'underline', marginBottom: 4, wordBreak: 'break-all' }}>{part}</a>
              <iframe
                width="100%"
                height="200"
                src={`https://www.youtube.com/embed/${videoId}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ borderRadius: 8, marginTop: 4 }}
              ></iframe>
            </div>
          );
        }
      }
      if (part.match(/\.(mp4|webm|ogg)$/i)) {
        return (
          <div key={i} style={{ marginTop: 8, display: 'flex', flexDirection: 'column' }}>
            <a href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#53bdeb', textDecoration: 'underline', marginBottom: 4, wordBreak: 'break-all' }}>{part}</a>
            <video controls style={{ width: '100%', borderRadius: 8, maxHeight: 200, marginTop: 4 }}>
              <source src={part} />
            </video>
          </div>
        );
      }
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#53bdeb', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>;
    }
    return <span key={i}>{part}</span>;
  });
};

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [userId] = useState(() => {
    const savedId = localStorage.getItem("konek_userId");
    if (savedId) return savedId;
    const newId = "user_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("konek_userId", newId);
    return newId;
  });

  const [profile, setProfile] = useState(() => {
    try {
      const savedProfile = localStorage.getItem("konek_profile");
      const savedTone = localStorage.getItem("konek_notification_tone") || null;
      const base = savedProfile
        ? JSON.parse(savedProfile)
        : {
          name: "Mi Usuario",
          description: "¡Usando Konek Fun!",
          photo: null,
          number: "",
        };
      // Reintegrar el tono guardado por separado
      return { ...base, notification_tone: savedTone };
    } catch (e) {
      console.error("Error parsing profile from localStorage", e);
      return {
        name: "Mi Usuario",
        description: "¡Usando Konek Fun!",
        photo: null,
        number: "",
        notification_tone: null,
      };
    }
  });


  const [activeChat, setActiveChat] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosInstallModal, setShowIosInstallModal] = useState(false);

  // --- Feature: Mensajes Programados ---
  const [scheduledMessages, setScheduledMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('konek_scheduled') || '[]'); } catch { return []; }
  });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleInput, setScheduleInput] = useState('');
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  // --- Feature: PIN Lock ---
  const [lockedChats, setLockedChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('konek_locked_chats') || '{}'); } catch { return {}; }
  });
  const [pinEntry, setPinEntry] = useState(''); // PIN siendo tipeado
  const [showPinModal, setShowPinModal] = useState(false); // modal de entrada PIN
  const [pendingLockChat, setPendingLockChat] = useState(null); // chat a bloquear
  const [showSetPinModal, setShowSetPinModal] = useState(false); // modal para crear PIN
  const [newPin, setNewPin] = useState('');

  // --- Feature: Reacciones ---
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
  const [loadingChatHistory, setLoadingChatHistory] = useState(false);

  // --- Feature: Mundo ---
  const [mundoPosts, setMundoPosts] = useState([]);
  const [mundoInput, setMundoInput] = useState('');
  const [mundoAnonymous, setMundoAnonymous] = useState(() =>
    localStorage.getItem('konek_mundo_anon') === 'true'
  );
  const [showMundoAnonModal, setShowMundoAnonModal] = useState(() =>
    localStorage.getItem('konek_mundo_joined') !== 'true'
  );
  const [mundoFriendReqSent, setMundoFriendReqSent] = useState({});
  const [mundoWelcomeSent, setMundoWelcomeSent] = useState(() => localStorage.getItem('konek_mundo_welcome_shown') === 'true');
  const [selectedMundoUser, setSelectedMundoUser] = useState(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => localStorage.getItem('konek_mundo_welcome_dismissed') === 'true');

  // Optimization for faster loading and smoother interactions in Mundo
  const memoizedMundoPosts = useMemo(() => {
    let all = [...mundoPosts];
    if (mundoWelcomeSent && !welcomeDismissed) {
      all.push({
        id: 'welcome_system',
        system: true,
        displayName: 'KonekFun Bot',
        text: `¡Hola ${profile.name}! 👋 Te damos una cordial bienvenida a MundoFunk, el espacio global de KonekFun. Aquí podrás conectar con toda la comunidad y encontrar nuevos amigos. ¡Disfruta la experiencia! 🚀`,
        timestamp: new Date().toISOString()
      });
    }
    return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [mundoPosts, mundoWelcomeSent, welcomeDismissed, profile.name]);

  // Detectar tipo de dispositivo/plataforma
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const showInstallButton = isMobile;

  const [unreadMundoCount, setUnreadMundoCount] = useState(0);

  // Pedir permiso para notificaciones al iniciar
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Ref para acceder al profile actualizado dentro de callbacks/closures
  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const playNotificationSound = () => {
    try {
      const customTone = profileRef.current.notification_tone;
      if (customTone) {
        const audio = new Audio(customTone);
        audio.play().catch(e => console.log("Error al reproducir audio personalizado:", e));
        return; // IMPORTANTE: Si hay tono personalizado, no suena el de por defecto
      }
      
      const audio = new Audio('/ringtone.mp3');
      audio.play().catch(e => console.log("Error al reproducir audio por defecto:", e));
    } catch (e) {
      console.log("No se pudo reproducir el ringtone");
    }
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      console.log('App installed successfully as PWA');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);



  const handleInstallClick = async () => {
    if (isIOS) {
      // iOS: no tiene beforeinstallprompt, mostramos instrucciones manuales
      setShowIosInstallModal(true);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install outcome: ${outcome}`);
      setDeferredPrompt(null);
    } else {
      // Android sin prompt disponible (ya instalado o no elegible)
      alert('Para instalar: en el menú de tu navegador (los 3 puntos) selecciona "Añadir a la pantalla de inicio".');
    }
  };


  const [availableUsers, setAvailableUsers] = useState(() => {
    try {
      const savedContacts = localStorage.getItem("konek_contacts");
      return savedContacts ? JSON.parse(savedContacts) : [];
    } catch (e) {
      console.error("Error parsing contacts from localStorage", e);
      return [];
    }
  });
  const [allUsers, setAllUsers] = useState([]);
  const [temporaryChats, setTemporaryChats] = useState(() => {
    try {
      const savedTemp = localStorage.getItem("konek_temporary_chats");
      return savedTemp ? JSON.parse(savedTemp) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("konek_temporary_chats", JSON.stringify(temporaryChats));
  }, [temporaryChats]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchNumber, setSearchNumber] = useState("");
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("chats"); // 'contactos', 'chats' o 'statuses'
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const [statuses, setStatuses] = useState([]);
  const [viewingGroup, setViewingGroup] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showTextStatusEditor, setShowTextStatusEditor] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusBg, setStatusBg] = useState(STATUS_COLORS[0]);
  const [statusFont, setStatusFont] = useState(STATUS_FONTS[0]);
  const [showStatusEmoji, setShowStatusEmoji] = useState(false);
  const [showMyStatusList, setShowMyStatusList] = useState(false);

  const [themeColor, setThemeColor] = useState(() => {
    return localStorage.getItem("konek_theme_color") || "#00a884";
  });
  const [contactAliases, setContactAliases] = useState(() => {
    try {
      const saved = localStorage.getItem("konek_aliases");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [editingAlias, setEditingAlias] = useState(false);

  // --- Feature: Message Management (Delete / Forward) ---
  const [msgActionMenu, setMsgActionMenu] = useState(null); // ID del mensaje para menú contextual
  const [forwardModal, setForwardModal] = useState(null); // Mensaje a reenviar

  const ringtoneInputRef = useRef(null);
  const [aliasInput, setAliasInput] = useState("");
  const [stickers, setStickers] = useState(() => {
    const saved = localStorage.getItem("konek_custom_stickers");
    return saved ? JSON.parse(saved) : [];
  });
  const [showStickers, setShowStickers] = useState(false);
  const [showArcade, setShowArcade] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState(() => {
    try {
      const savedBlocked = localStorage.getItem("konek_blocked");
      return savedBlocked ? JSON.parse(savedBlocked) : [];
    } catch (e) {
      return [];
    }
  });

  const [clearedChats, setClearedChats] = useState(() => {
    try {
      const saved = localStorage.getItem("konek_cleared_chats");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [viewedStatuses, setViewedStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem("konek_viewed_statuses");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Cerrar menú contextual al hacer clic fuera
  useEffect(() => {
    if (!msgActionMenu) return;
    const handler = () => setMsgActionMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [msgActionMenu]);

  // Persistir estados vistos
  useEffect(() => {
    localStorage.setItem(
      "konek_viewed_statuses",
      JSON.stringify(viewedStatuses),
    );
  }, [viewedStatuses]);

  const [showContactProfile, setShowContactProfile] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isLinking, setIsLinking] = useState(false);

  // Actualizar título con mensajes no leídos
  useEffect(() => {
    const totalUnreadPrivate = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
    const total = totalUnreadPrivate + unreadMundoCount;
    if (total > 0) {
      document.title = `(${total}) Konek Fun`;
    } else {
      document.title = "Konek Fun";
    }
  }, [unreadCounts, unreadMundoCount]);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const setupDone = localStorage.getItem("konek_setup_done");
    const isActuallyNew = !setupDone || setupDone !== "true";
    console.log("[Konek] Onboarding status:", { setupDone, isActuallyNew });
    return isActuallyNew;
  });
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef({});
  const emitTypingTimeoutRef = useRef(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const activeChatRef = useRef(null);
  const mundoFileInputRef = useRef(null);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    localStorage.setItem("konek_blocked", JSON.stringify(blockedUsers));
  }, [blockedUsers]);

  useEffect(() => {
    localStorage.setItem("konek_cleared_chats", JSON.stringify(clearedChats));
  }, [clearedChats]);

  useEffect(() => {
    // Solo guardar si el perfil tiene datos válidos (evitar resetear con valores iniciales vacíos si el componente se monta/desmonta)
    if (profile && profile.name) {
      try {
        // Excluir notification_tone del perfil - se guarda en su propia clave para evitar exceder el límite
        const { notification_tone, ...profileToSave } = profile;
        localStorage.setItem("konek_profile", JSON.stringify(profileToSave));
        // Guardar tono por separado
        if (notification_tone) {
          try {
            localStorage.setItem("konek_notification_tone", notification_tone);
          } catch (toneErr) {
            // El archivo de audio es demasiado grande para localStorage
            alert('El archivo de audio es demasiado grande para guardarlo (máximo ~4MB). Prueba con un archivo más corto.');
            setProfile(prev => ({ ...prev, notification_tone: null }));
            localStorage.removeItem("konek_notification_tone");
          }
        } else {
          localStorage.removeItem("konek_notification_tone");
        }
      } catch (e) {
        console.error("Error saving profile to localStorage:", e);
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          alert('Tu foto de perfil es muy grande y no se pudo guardar localmente. Por favor, usa una imagen más pequeña.');
          // Removemos la imagen gigante para que no rompa futuros guardados
          setProfile(prev => ({ ...prev, photo: null }));
        }
      }
    }
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("konek_contacts", JSON.stringify(availableUsers));
  }, [availableUsers]);

  useEffect(() => {
    document.documentElement.style.setProperty("--wa-accent", themeColor);
    let messageMeColor = "#005c4b";
    if (themeColor === "#128c7e") messageMeColor = "#075e54";
    else if (themeColor === "#cf6679") messageMeColor = "#b00020";
    else if (themeColor === "#9c27b0") messageMeColor = "#6a0080";
    else if (themeColor === "#e91e63") messageMeColor = "#b0003a";
    else if (themeColor === "#ff9800") messageMeColor = "#f57c00";
    else if (themeColor !== "#00a884") messageMeColor = themeColor;
    document.documentElement.style.setProperty(
      "--wa-message-me",
      messageMeColor,
    );
    localStorage.setItem("konek_theme_color", themeColor);
  }, [themeColor]);

  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const profilePhotoInputRef = useRef();
  const statusInputRef = useRef();
  const blockedUsersRef = useRef(blockedUsers);
  const clearedChatsRef = useRef(clearedChats);

  // --- Message cache & pagination ---
  const messageCacheRef = useRef({}); // { contactId: messages[] }
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    blockedUsersRef.current = blockedUsers;
  }, [blockedUsers]);

  useEffect(() => {
    clearedChatsRef.current = clearedChats;
  }, [clearedChats]);

  useEffect(() => {
    let timer;
    if (viewingGroup && viewingGroup.items[currentIdx]) {
      const currentItem = viewingGroup.items[currentIdx];
      if (!viewedStatuses.includes(currentItem.id)) {
        setViewedStatuses((prev) => [...prev, currentItem.id]);
      }
      timer = setTimeout(() => {
        if (currentIdx < viewingGroup.items.length - 1) {
          setCurrentIdx((prev) => prev + 1);
        } else {
          setViewingGroup(null);
        }
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [viewingGroup, currentIdx]);

  useEffect(() => {
    // Solicitar permiso de notificaciones
    if (
      "Notification" in window &&
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission();
    }

    socketRef.current = io(SERVER_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 1000,
      timeout: 20000,
    });

    // Re-join on connect (initial and reconnect) to restore session instantly
    socketRef.current.on("connect", () => {
      socketRef.current.emit("join", { userId, profile });
    });

    socketRef.current.on("receive_message", (message) => {
      // Ignorar mensajes de usuarios bloqueados (usando Ref para evitar cierres obsoletos)
      if (blockedUsersRef.current.includes(message.sender_id)) return;

      // Reproducir sonido de notificación
      if (message.sender_id !== userId) {
        const audio = new Audio("/ringtone.mp3");
        audio
          .play()
          .catch((e) => console.log("Autoplay prevent or audio error:", e));
      }

      // Importante: No la agregamos de nuevo si somos nosotros mismos y ya está por el setMessages local
      // (ya que el servidor ahora emite también al enviador), pero por simplicidad el React prev filter
      // lo puede manejar, o comprobamos id.
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === message.id);
        if (index !== -1) {
          const newMessages = [...prev];
          newMessages[index] = message;
          return newMessages;
        }
        return [...prev, message];
      });

      // Keep message cache in sync
      const cacheKey = message.sender_id === userId ? message.receiver_id : message.sender_id;
      if (cacheKey && messageCacheRef.current[cacheKey]) {
        const cache = messageCacheRef.current[cacheKey];
        if (!cache.find(m => m.id === message.id)) {
          messageCacheRef.current[cacheKey] = [...cache, message];
        }
      }

      // Incrementar contador de no leídos si no es el chat activo
      if (
        message.sender_id !== userId &&
        (!activeChatRef.current ||
          activeChatRef.current.id !== message.sender_id)
      ) {
        setUnreadCounts((prev) => ({
          ...prev,
          [message.sender_id]: (prev[message.sender_id] || 0) + 1,
        }));

        playNotificationSound();

        // Notificación estilo WhatsApp si el navegador lo soporta
        if ("Notification" in window && Notification.permission === "granted") {
          // Buscamos el nombre del usuario si es posible
          const contactName = message.sender_name || "Nuevo mensaje";
          let bodyText = message.content;
          if (message.type === "image") bodyText = "📸 Imagen";
          else if (message.type === "audio") bodyText = "🎵 Audio";
          else if (message.type === "file") bodyText = "📄 Archivo";

          if (navigator.serviceWorker) {
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification(contactName, {
                body: bodyText,
                icon: "/icon-192.png",
                vibrate: [200, 100, 200],
                tag: `konek-msg-${message.sender_id}`,
                renotify: true,
                data: { url: '/' },
              });
            });
          } else {
            new Notification(contactName, {
              body: bodyText,
              vibrate: [200, 100, 200],
              tag: `konek-msg-${message.sender_id}`,
              renotify: true,
            });
          }
        }
      } else if (
        message.sender_id !== userId &&
        activeChatRef.current &&
        activeChatRef.current.id === message.sender_id
      ) {
        socketRef.current.emit("mark_read", {
          readerId: userId,
          senderId: message.sender_id,
        });
      }

      // Si el remitente no está en nuestros contactos, añadirlo a chats temporales
      if (message.sender_id !== userId && message.sender_id !== "global") {
        const isContact = availableUsers.some(u => u.id === message.sender_id);
        if (!isContact) {
          setTemporaryChats(prev => {
            const exists = prev.find(u => u.id === message.sender_id);
            if (exists) return prev;
            return [...prev, {
              id: message.sender_id,
              username: message.sender_name,
              profile_pic: message.sender_pic,
              phone_number: message.sender_phone
            }];
          });
        } else {
          // Si ya es contacto, opcionalmente actualizar su info
          setAvailableUsers(prev => prev.map(u => 
            u.id === message.sender_id ? {
              ...u,
              username: message.sender_name,
              profile_pic: message.sender_pic,
              phone_number: message.sender_phone
            } : u
          ));
        }
      }
    });

    socketRef.current.on("error", (err) => {
      alert(err.message);
      if (err.message.includes("en uso")) {
        setShowProfileModal(true);
      }
    });

    socketRef.current.on("user_found", (user) => {
      if (user) {
        if (user.id === userId) {
          alert("No puedes chatear contigo mismo.");
          return;
        }
        setAvailableUsers((prev) => {
          if (prev.find((u) => u.id === user.id)) {
            // Si ya existe, solo activamos el chat pero no lo añadimos de nuevo
            return prev;
          }
          return [...prev, user];
        });
        setActiveChat({ id: user.id, name: user.username });
        setSearchNumber("");
      } else {
        alert("Número no encontrado en la base de datos.");
      }
    });

    socketRef.current.on("chat_history", ({ contactId, messages: history, hasMore }) => {
      const clears = clearedChatsRef.current;
      let filteredHistory = history;
      if (contactId && clears[contactId]) {
        const clearTime = new Date(clears[contactId]).getTime();
        filteredHistory = history.filter(
          (m) => new Date(m.timestamp).getTime() > clearTime,
        );
      }

      const currentActive = activeChatRef.current?.id || null;
      const isGlobal = contactId === "global";

      if (currentActive === contactId || (isGlobal && currentActive === "global")) {
        if (loadingMoreRef.current) {
          // Pagination: prepend older messages
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newOld = filteredHistory.filter(m => !existingIds.has(m.id));
            const merged = [...newOld, ...prev];
            if (contactId) messageCacheRef.current[contactId] = merged;
            return merged;
          });
          loadingMoreRef.current = false;
          setLoadingMoreMessages(false);
        } else {
          // Initial load or chat switch
          if (contactId) messageCacheRef.current[contactId] = filteredHistory;
          setMessages(filteredHistory);
        }
        setHasMoreMessages(!!hasMore);
        setLoadingChatHistory(false);
      } else {
        // Cache silently without disrupting the current UI if it's an old response
        if (contactId && !loadingMoreRef.current) {
          messageCacheRef.current[contactId] = filteredHistory;
        }
      }
    });

    socketRef.current.on("message_deleted", ({ messageId, type, userId: deleterId, updatedMessage }) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
           if (type === 'everyone') {
             return { ...msg, ...updatedMessage, is_deleted_for_all: true, content: '', type: 'text' };
           } else if (type === 'me' && deleterId === userId) {
             return { ...msg, deleted_for: [...(msg.deleted_for || []), deleterId] };
           }
        }
        return msg;
      }).filter(msg => {
        // Automatically hide it if it's deleted for "me"
        if (msg.deleted_for && msg.deleted_for.includes(userId)) return false;
        return true;
      }));
    });

    socketRef.current.on("user_list", (users) => {
      // Actualizar la lista global de usuarios (excluyendome a mi)
      setAllUsers(users.filter(u => u.id !== userId));

      // Actualizar la lista de contactos locales: Eliminar los que ya no existen en el servidor
      setAvailableUsers((prev) => {
        // Mantenemos solo los usuarios que el servidor nos envía o el chat global
        return prev
          .filter(
            (contact) =>
              contact.id === "global" || users.some((u) => u.id === contact.id),
          )
          .map((contact) => {
            const updatedUser = users.find((u) => u.id === contact.id);
            return updatedUser ? updatedUser : contact;
          });
      });
      
      // Actualizar chats temporales si el usuario cambió de info
      setTemporaryChats(prev => {
        return prev.map(temp => {
          const updated = users.find(u => u.id === temp.id);
          return updated ? { ...temp, username: updated.username, profile_pic: updated.profile_pic } : temp;
        });
      });

      // Si el chat activo fue el usuario eliminado, lo cerramos
      if (activeChatRef.current && activeChatRef.current.id !== "global") {
        const stillExists = users.some(
          (u) => u.id === activeChatRef.current.id,
        );
        if (!stillExists) {
          alert("Este usuario ya no está disponible.");
          setActiveChat(null);
        }
      }

      // ¡NUEVO! Sincronizar mi propio perfil si el admin lo cambió desde el panel
      const me = users.find((u) => u.id === userId);
      if (me) {
        setProfile((prev) => ({
          ...prev,
          name: me.username || prev.name,
          number: me.phone_number || prev.number,
          role: me.role || prev.role,
          photo: me.profile_pic || prev.photo,
          description: me.status || prev.description,
        }));
      }
    });

    socketRef.current.on("status_list", (statusList) => {
      setStatuses(statusList);
    });

    socketRef.current.on("login_success", (userData) => {
      setProfile((prev) => {
        const serverName = userData.username;
        const hasRealServerName =
          serverName && serverName !== "Mi Usuario" && serverName !== "Usuario";
        const hasRealLocalName =
          prev.name && prev.name !== "Mi Usuario" && prev.name !== "Usuario";
        const descriptionIsDefault = 
          !prev.description || prev.description === "¡Usando Konek Fun!";
          
        const newProfile = {
          ...prev,
          name: hasRealServerName
            ? serverName
            : hasRealLocalName
              ? prev.name
              : prev.name,
          role: userData.role,
          number: userData.phone_number || prev.number,
          photo: prev.photo ? prev.photo : (userData.profile_pic || null),
          // Respetar el tono local si existe
          notification_tone: prev.notification_tone || null,
          description: descriptionIsDefault && userData.status ? userData.status : prev.description,
        };
        
        // Guardar silenciosamente para asegurar que los datos del servidor queden locales (y persistir la foto de perfil)
        localStorage.setItem("konek_profile", JSON.stringify(newProfile));
        
        return newProfile;
      });
      
      if (
        userData.username &&
        userData.username !== "Mi Usuario" &&
        userData.username !== "Usuario"
      ) {
        localStorage.setItem("konek_setup_done", "true");
        setShowOnboarding(false);
      }
    });

    socketRef.current.on("user_deleted", () => {
      alert("Tu cuenta ha sido eliminada por el administrador.");
      localStorage.clear();
      window.location.reload();
    });

    socketRef.current.on("messages_read", ({ contactId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.receiver_id === contactId && msg.sender_id === userId
            ? { ...msg, read: true }
            : msg,
        ),
      );
    });

    socketRef.current.on("typing_start", ({ senderId }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: true }));
      if (typingTimeoutRef.current[senderId])
        clearTimeout(typingTimeoutRef.current[senderId]);
      typingTimeoutRef.current[senderId] = setTimeout(() => {
        setTypingUsers((prev) => ({ ...prev, [senderId]: false }));
      }, 3000);
    });

    socketRef.current.on("typing_stop", ({ senderId }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: false }));
      if (typingTimeoutRef.current[senderId])
        clearTimeout(typingTimeoutRef.current[senderId]);
    });

    // --- Reaction updates ---
    socketRef.current.on('reaction_update', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    });

    // --- Mundo: historial e incoming posts ---
    socketRef.current.on('mundo_history', (posts) => setMundoPosts(posts));
    socketRef.current.on('mundo_new_post', (post) => {
      setMundoPosts(prev => [...prev, post]);
      if (activeTabRef.current !== 'mundo' && post.userId !== userId) {
        setUnreadMundoCount(prev => prev + 1);
        playNotificationSound();
      }
    });

    // --- Solicitud de amistad recibida ---
    socketRef.current.on('friend_request_received', ({ fromUserId, fromName }) => {
      if (window.confirm(`\u00bf${fromName} quiere agregarte como contacto. \u00bfAceptar?`)) {
        setAvailableUsers(prev => {
          if (prev.find(u => u.id === fromUserId)) return prev;
          return [...prev, { id: fromUserId, username: fromName, profile_pic: '' }];
        });
        // Emitir evento de aceptaci\u00f3n para evitar el bucle infinito
        socketRef.current.emit('friend_request_accepted', { fromUserId: userId, fromName: profile.name, toUserId: fromUserId });
      }
    });

    // --- Amigo a\u00f1adido autom\u00e1ticamente al ser aceptado por el otro ---
    socketRef.current.on('friend_added_silent', ({ fromUserId, fromName }) => {
      setAvailableUsers(prev => {
        if (prev.find(u => u.id === fromUserId)) return prev;
        return [...prev, { id: fromUserId, username: fromName, profile_pic: '' }];
      });
    });

    socketRef.current.emit("request_statuses");

    return () => socketRef.current.disconnect();
  }, [userId]);


  // Manejar el tiempo de los estados (historias)
  useEffect(() => {
    let timer;
    if (viewingGroup) {
      timer = setTimeout(() => {
        if (currentIdx < viewingGroup.items.length - 1) {
          setCurrentIdx((prev) => prev + 1);
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

  // Ref to track seen statuses so we only notify on truly NEW ones in this session
  const previousStatusIdsRef = useRef(new Set());

  // Efecto para detectar cuando llega un ESTADO nuevo y mandar notificación
  useEffect(() => {
    if (statuses.length === 0) return;

    // Si es la primera carga (Set vacío) lo llenamos sin notificar
    if (previousStatusIdsRef.current.size === 0) {
      previousStatusIdsRef.current = new Set(statuses.map(s => s.id));
      return;
    }

    const currentIds = new Set(statuses.map(s => s.id));
    const newStatuses = statuses.filter(s =>
      s.user_id !== userId && !previousStatusIdsRef.current.has(s.id) && !viewedStatuses.includes(s.id)
    );

    if (newStatuses.length > 0) {
      playNotificationSound();

      if ("Notification" in window && Notification.permission === "granted") {
        const contactName = availableUsers.find(u => u.id === newStatuses[0].user_id)?.username || newStatuses[0].username || "Un contacto";
        try {
          new Notification('Nuevo estado', {
            body: `${contactName} ha publicado un estado.`,
            icon: '/icon-192.png',
            tag: `status-${newStatuses[0].id}`,
            silent: true // The sound is played via playNotificationSound()
          });
        } catch (e) {
          console.log("Error mostrando notificacion push:", e);
        }
      }
    }

    previousStatusIdsRef.current = currentIds;
  }, [statuses, userId, viewedStatuses, availableUsers]);

  useEffect(() => {
    // Don't auto-scroll when loading older messages (pagination)
    if (!loadingMoreMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loadingMoreMessages]);

  // --- Load more messages (scroll up) ---
  const loadMoreMessages = () => {
    if (!activeChat || !socketRef.current || loadingMoreRef.current || !hasMoreMessages) return;
    loadingMoreRef.current = true;
    setLoadingMoreMessages(true);
    const oldestMsg = messages[0];
    socketRef.current.emit("request_history", {
      userId,
      contactId: activeChat.id === "global" ? "global" : activeChat.id,
      limit: 50,
      before: oldestMsg?.timestamp,
    });

    // Timeout of 5s fallback in case server doesn't respond
    setTimeout(() => {
      if (loadingMoreRef.current) {
        loadingMoreRef.current = false;
        setLoadingMoreMessages(false);
      }
    }, 5000);
  };

  const handleMessagesScroll = (e) => {
    const container = e.target;
    if (container.scrollTop < 60 && hasMoreMessages && !loadingMoreRef.current) {
      loadMoreMessages();
    }
  };

  useEffect(() => {
    if (activeChat && socketRef.current) {
      // Limpiar no leídos para este chat
      setUnreadCounts((prev) => ({
        ...prev,
        [activeChat.id]: 0,
      }));

      // Use cached messages if available for instant switch
      const cached = messageCacheRef.current[activeChat.id];
      if (cached && cached.length > 0) {
        setMessages(cached);
        setHasMoreMessages(cached.length >= 50);
        setLoadingChatHistory(false);
      } else {
        setLoadingChatHistory(true);
      }

      // Always fetch fresh from server (will update cache)
      socketRef.current.emit("request_history", {
        userId,
        contactId: activeChat.id === "global" ? "global" : activeChat.id,
        limit: 50,
      });

      // Timeout de seguridad de 5 segundos: si el servidor no responde o Firestore falla, quitamos el "Cargando..."
      const historyTimeout = setTimeout(() => {
        setLoadingChatHistory(false);
      }, 5000);

      // Guardamos la referencia por si cambiamos de chat y hay que limpiar
      socketRef.current.once("chat_history", () => {
        clearTimeout(historyTimeout);
      });

      if (activeChat.id !== "global") {
        socketRef.current.emit("mark_read", {
          readerId: userId,
          senderId: activeChat.id,
        });
      }

      return () => clearTimeout(historyTimeout);
    }
  }, [activeChat, userId]);

  const sendMessage = (e) => {
    e?.preventDefault();
    if (!input.trim() || !activeChat) return;

    if (blockedUsers.includes(activeChat.id)) {
      alert("Has bloqueado a este usuario. Desbloquéalo para enviar mensajes.");
      return;
    }

    if (activeChat.id !== "global") {
      socketRef.current.emit("typing_stop", {
        senderId: userId,
        receiverId: activeChat.id,
      });
    }

    const newMessage = {
      id: uuidv4(),
      sender_id: userId,
      receiver_id: activeChat.id,
      content: input,
      type: "text",
      timestamp: new Date().toISOString(),
    };

    socketRef.current.emit("send_message", newMessage);
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
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
        id: fileId,
      });

      while (start < totalSize) {
        const end = Math.min(start + chunkSize, totalSize);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("fileId", fileId);
        formData.append("fileName", file.name);

        await axios.post(`${SERVER_URL}/api/upload/chunk`, formData);

        start = end;
        setUploadProgress({
          name: file.name,
          progress: Math.round((start / totalSize) * 100),
        });
      }

      // Enviar mensaje de archivo al terminar la carga
      const isImage = file.type.startsWith("image/");
      const isAudio =
        file.type.startsWith("audio/") || file.name.endsWith(".webm");
      const isVideo = file.type.startsWith("video/");
      const finalType =
        forcedType || (isImage ? "image" : isAudio ? "audio" : isVideo ? "video" : "file");

      const fileMessage = {
        id: uuidv4(),
        sender_id: userId,
        receiver_id: activeChat.id,
        content:
          finalType === "audio"
            ? "Mensaje de voz"
            : `Envió un archivo: ${file.name}`,
        type: finalType,
        file_info: {
          id: fileId,
          name: file.name,
          size: totalSize,
          path: `${fileId}_${file.name}`,
          mimeType: file.type,
        },
        timestamp: new Date().toISOString(),
      };

      socketRef.current.emit("send_message", fileMessage);
      setMessages((prev) => [...prev, fileMessage]);
      setUploadProgress(null);
    } catch (error) {
      console.error("Error al subir archivo:", error);
      alert("Error al subir el archivo.");
      setUploadProgress(null);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) uploadGenericFile(file);
  };

  const handleStickerUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setStickers((prev) => {
            const newStickers = [...prev, reader.result];
            localStorage.setItem(
              "konek_custom_stickers",
              JSON.stringify(newStickers),
            );
            return newStickers;
          });
        };
        reader.readAsDataURL(file);
      }
    });
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
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioFile = new File(
          [audioBlob],
          `voice_note_${Date.now()}.webm`,
          { type: "audio/webm" },
        );
        await uploadGenericFile(audioFile, "audio");
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
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
        if (stream) stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.stop();
    }
  };

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const handleProfilePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Por favor selecciona una imagen válida.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (file.type === "image/gif") {
          if (file.size > 800 * 1024) {
            alert("El GIF es demasiado grande (máximo 800KB).");
            return;
          }
          setProfile((prev) => ({ ...prev, photo: reader.result }));
          return;
        }

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 400; // Tamaño máximo para foto de perfil

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Comprimir a JPEG al 80% de calidad para ahorrar aún más espacio
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setProfile((prev) => ({ ...prev, photo: dataUrl }));
        };
        img.onerror = () => alert("Error al procesar la imagen.");
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const addEmoji = (emoji) => {
    setInput((prev) => prev + emoji);
    // No cerramos el picker para poder poner varios emojis seguidos, igual que en WhatsApp
  };

  const saveProfile = () => {
    // Sincronizar con el servidor
    // Para GIFs grandes, mostramos un pequeño feedback y cerramos
    socketRef.current.emit("update_profile", { userId, profile });
    setShowProfileModal(false);
  };

  const completeOnboarding = () => {
    if (!profile.name.trim() || profile.name === "Mi Usuario") {
      alert("Por favor, introduce un nombre real para continuar.");
      return;
    }
    localStorage.setItem("konek_setup_done", "true");
    setShowOnboarding(false);
    socketRef.current.emit("update_profile", { userId, profile });
  };

  const [loginIdInput, setLoginIdInput] = useState("");

  const handleLoginWithId = () => {
    const trimmedId = loginIdInput.trim();
    if (!trimmedId) {
      alert("Por favor, pega tu ID de usuario para continuar.");
      return;
    }
    localStorage.setItem("konek_userId", trimmedId);
    localStorage.setItem("konek_setup_done", "true");
    window.location.reload();
  };

  // ===================== MENSAJES PROGRAMADOS =====================
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setScheduledMessages(prev => {
        const toSend = prev.filter(m => m.sendAt <= now);
        const remaining = prev.filter(m => m.sendAt > now);
        toSend.forEach(m => {
          const msgId = uuidv4();
          const msg = { id: msgId, sender_id: userId, receiver_id: m.receiverId, content: m.text, type: 'text', timestamp: new Date().toISOString() };
          socketRef.current.emit('send_message', msg);
          setMessages(p => [...p, msg]);
        });
        if (toSend.length > 0) localStorage.setItem('konek_scheduled', JSON.stringify(remaining));
        return remaining;
      });
    }, 30000); // check every 30s
    return () => clearInterval(interval);
  }, [userId]);

  const scheduleMessage = () => {
    if (!scheduleInput.trim() || !scheduleDateTime || !activeChat) return;
    const newSched = { id: uuidv4(), receiverId: activeChat.id, text: scheduleInput.trim(), sendAt: new Date(scheduleDateTime).getTime() };
    const updated = [...scheduledMessages, newSched];
    setScheduledMessages(updated);
    localStorage.setItem('konek_scheduled', JSON.stringify(updated));
    setScheduleInput(''); setScheduleDateTime(''); setShowScheduleModal(false);
    alert(`Mensaje programado para ${new Date(scheduleDateTime).toLocaleString()}`);
  };

  // ===================== PIN LOCK =====================
  const hashPin = async (pin) => {
    const enc = new TextEncoder().encode(pin);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const saveLockChat = async (chatId, pin) => {
    const hash = await hashPin(pin);
    const updated = { ...lockedChats, [chatId]: hash };
    setLockedChats(updated);
    localStorage.setItem('konek_locked_chats', JSON.stringify(updated));
    setNewPin(''); setShowSetPinModal(false);
    alert('Chat bloqueado con PIN ✅');
  };

  const unlockChatWithPin = async () => {
    if (!activeChat) return;
    const hash = await hashPin(pinEntry);
    if (hash === lockedChats[activeChat.id]) {
      const updated = { ...lockedChats };
      delete updated[activeChat.id];
      setLockedChats(updated);
      localStorage.setItem('konek_locked_chats', JSON.stringify(updated));
      setPinEntry(''); setShowPinModal(false);
    } else {
      alert('PIN incorrecto'); setPinEntry('');
    }
  };

  // ===================== REACCIONES =====================
  const sendReaction = (msg, emoji) => {
    const receiverId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
    socketRef.current.emit('message_reaction', { messageId: msg.id, senderId: userId, receiverId, emoji });
    setMessages(prev => prev.map(m => {
      if (m.id !== msg.id) return m;
      const reactions = m.reactions ? [...m.reactions] : [];
      const existing = reactions.findIndex(r => r.userId === userId);
      if (existing !== -1) {
        if (reactions[existing].emoji === emoji) reactions.splice(existing, 1);
        else reactions[existing] = { userId, emoji };
      } else { reactions.push({ userId, emoji }); }
      return { ...m, reactions };
    }));
    setActiveReactionMsgId(null);
  };

  // ===================== MUNDO =====================
  const joinMundo = (anonymous) => {
    setMundoAnonymous(anonymous);
    localStorage.setItem('konek_mundo_anon', anonymous ? 'true' : 'false');
    localStorage.setItem('konek_mundo_joined', 'true');
    setShowMundoAnonModal(false);
    socketRef.current.emit('get_mundo');
    if (!mundoWelcomeSent) {
      setMundoWelcomeSent(true);
      localStorage.setItem('konek_mundo_welcome_shown', 'true');
    }
  };

  const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--wa-accent)', textDecoration: 'underline' }}>{part}</a>;
      }
      return part;
    });
  };

  const sendMundoPost = () => {
    if (!mundoInput.trim()) return;
    socketRef.current.emit('mundo_post', {
      userId, displayName: profile.name, anonymous: mundoAnonymous,
      text: mundoInput.trim(), profilePic: mundoAnonymous ? '' : (profile.photo || '')
    });
    setMundoInput('');
  };

  const uploadMundoFile = async (file) => {
    if (!file) return;
    const fileId = uuidv4();
    const totalSize = file.size;
    const chunkSize = 10 * 1024 * 1024;
    let start = 0;
    setUploadProgress({ name: file.name, progress: 0 });
    try {
      await axios.post(`${SERVER_URL}/api/upload/init`, { fileName: file.name, totalSize, id: fileId });
      while (start < totalSize) {
        const end = Math.min(start + chunkSize, totalSize);
        const chunk = file.slice(start, end);
        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("fileId", fileId);
        formData.append("fileName", file.name);
        await axios.post(`${SERVER_URL}/api/upload/chunk`, formData);
        start = end;
        setUploadProgress({ name: file.name, progress: Math.round((start / totalSize) * 100) });
      }
      const isImage = file.type.startsWith("image/");
      const isAudio = file.type.startsWith("audio/") || file.name.endsWith(".webm");
      const isVideo = file.type.startsWith("video/");
      const finalType = isImage ? "image" : isAudio ? "audio" : isVideo ? "video" : "file";
      socketRef.current.emit('mundo_post', {
        userId, displayName: profile.name, anonymous: mundoAnonymous,
        text: finalType === "audio" ? "Mensaje de voz" : `Envió un archivo: ${file.name}`,
        type: finalType,
        profilePic: mundoAnonymous ? '' : (profile.photo || ''),
        fileInfo: { id: fileId, name: file.name, size: totalSize, path: `${fileId}_${file.name}`, mimeType: file.type }
      });
      setUploadProgress(null);
    } catch (error) {
      console.error("Error al subir archivo a Mundo:", error);
      alert("Error al subir el archivo.");
      setUploadProgress(null);
    }
  };

  const sendFriendRequest = (toUserId, toName) => {
    socketRef.current.emit('friend_request', { fromUserId: userId, fromName: profile.name, toUserId });
    setMundoFriendReqSent(prev => ({ ...prev, [toUserId]: true }));
  };

  const addContact = (user) => {
    setAvailableUsers((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) return prev;
      return [...prev, {
        id: user.id,
        username: user.username || user.name || `Usuario ${user.id.slice(0, 4)}`,
        profile_pic: user.profile_pic || "",
        phone_number: user.phone_number || ""
      }];
    });
    setTemporaryChats((prev) => prev.filter((u) => u.id !== user.id));
  };

  const deleteChat = (userIdToDelete) => {
    if (
      window.confirm(
        "¿Estás seguro de que deseas vaciar este chat? Se eliminará la lista de mensajes localmente.",
      )
    ) {
      const now = new Date().toISOString();
      setClearedChats((prev) => ({ ...prev, [userIdToDelete]: now }));
      setMessages((prev) =>
        prev.filter(
          (msg) =>
            !(
              (msg.sender_id === userId &&
                msg.receiver_id === userIdToDelete) ||
              (msg.sender_id === userIdToDelete && msg.receiver_id === userId)
            ),
        ),
      );
      if (activeChat?.id === userIdToDelete) {
        setActiveChat(null);
      }
      setShowChatMenu(false);
    }
  };

  const deleteContact = (userIdToDelete) => {
    if (
      window.confirm(
        "¿Estás seguro de que deseas eliminar este contacto? Se vaciará el chat.",
      )
    ) {
      const now = new Date().toISOString();
      setClearedChats((prev) => ({ ...prev, [userIdToDelete]: now }));
      setAvailableUsers((prev) => prev.filter((u) => u.id !== userIdToDelete));
      setTemporaryChats((prev) => prev.filter((u) => u.id !== userIdToDelete));
      setMessages((prev) =>
        prev.filter(
          (msg) =>
            !(
              (msg.sender_id === userId &&
                msg.receiver_id === userIdToDelete) ||
              (msg.sender_id === userIdToDelete && msg.receiver_id === userId)
            ),
        ),
      );
      if (activeChat?.id === userIdToDelete) {
        setActiveChat(null);
      }
    }
  };

  const toggleBlockUser = (userToBlock) => {
    const isBlocked = blockedUsers.includes(userToBlock.id);
    if (isBlocked) {
      setBlockedUsers((prev) => prev.filter((id) => id !== userToBlock.id));
      alert(`${userToBlock.name} ha sido desbloqueado.`);
    } else {
      if (
        window.confirm(
          `¿Bloquear a ${userToBlock.name}? No podrás enviarle ni recibir sus mensajes.`,
        )
      ) {
        setBlockedUsers((prev) => [...prev, userToBlock.id]);
      }
    }
    setShowChatMenu(false);
  };

  const publishStatus = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Solo imágenes para estados por ahora para simplificar
    if (!file.type.startsWith("image/")) {
      alert("Por ahora solo puedes subir imágenes como estado.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800; // Un poco más grande para estados

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const newStatus = {
          id: uuidv4(),
          user_id: userId,
          content: canvas.toDataURL("image/jpeg", 0.8),
          type: "image",
          timestamp: new Date().toISOString(),
        };
        socketRef.current.emit("publish_status", newStatus);
      };
      img.onerror = () => alert("Error al procesar la imagen del estado.");
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const publishTextStatus = () => {
    if (!statusText.trim()) return;
    const newStatus = {
      id: uuidv4(),
      user_id: userId,
      content: JSON.stringify({
        text: statusText,
        bg: statusBg,
        font: statusFont,
      }),
      type: "text",
      timestamp: new Date().toISOString(),
    };
    socketRef.current.emit("publish_status", newStatus);
    setShowTextStatusEditor(false);
    setStatusText("");
  };

  const deleteStatus = (statusId) => {
    if (statusId && window.confirm("¿Eliminar este estado?")) {
      socketRef.current.emit("delete_status", statusId);
      if (viewingGroup) {
        if (viewingGroup.items.length > 1) {
          const newItems = viewingGroup.items.filter((i) => i.id !== statusId);
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
    socketRef.current.emit("search_user", { phoneNumber: searchNumber.trim() });
  };

  const handleLinkNumber = () => {
    const num = prompt(
      "Introduce el número de identificación proporcionado por el Admin:",
    );
    if (num) {
      setIsLinking(true);
      socketRef.current.emit("search_user", { phoneNumber: num.trim() });
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
          alert("Este número ya está vinculado a tu sesión actual.");
          return;
        }
        if (
          window.confirm(
            `¿Vincular a la cuenta de "${user.username}" con número ${user.phone_number}? (Se reiniciará la aplicación)`,
          )
        ) {
          localStorage.setItem("konek_userId", user.id);
          localStorage.setItem(
            "konek_profile",
            JSON.stringify({
              name: user.username,
              photo: user.profile_pic,
              description: user.status,
              number: user.phone_number,
              role: user.role,
            }),
          );
          window.location.reload();
        }
      } else {
        alert(
          "No se encontró ningún usuario con ese número de identificación.",
        );
      }
    };

    socketRef.current.on("user_found", handleUserFound);
    return () => socketRef.current.off("user_found", handleUserFound);
  }, [userId, isLinking]);

  const startArcadeGame = (gameType) => {
    if (!activeChat || activeChat.isGroup) return;

    let initialGameData = {};
    if (gameType === "tictactoe") {
      initialGameData = { board: Array(9).fill(null), turn: userId, winner: null, state: "playing" };
    } else if (gameType === "connect4") {
      initialGameData = { board: Array(6).fill().map(() => Array(7).fill(null)), turn: userId, winner: null, state: "playing" };
    } else if (gameType === "battleship") {
      initialGameData = { state: "setup", p1: userId, p2: activeChat.id, p1Board: [], p2Board: [], p1Hits: [], p2Hits: [], turn: userId, winner: null };
    } else if (gameType === "hangman") {
      initialGameData = { state: "setup", wordX: "", guessed: [], wrongCount: 0, creator: userId, solver: activeChat.id, winner: null };
    } else if (gameType === "rps") {
      initialGameData = { state: "waiting", p1: userId, p2: activeChat.id, p1Move: null, p2Move: null, winner: null };
    } else if (gameType === "memory") {
      const cards = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼"];
      const deck = [...cards, ...cards].sort(() => Math.random() - 0.5);
      initialGameData = { state: "playing", board: deck, flipped: [], matched: [], turn: userId, scores: { [userId]: 0, [activeChat.id]: 0 }, winner: null };
    }

    const gameMessage = {
      id: uuidv4(),
      user_id: activeChat.id,
      sender_id: userId,
      receiver_id: activeChat.id,
      content: `Reto de ${gameType}!`,
      type: "game",
      gameType,
      gameData: initialGameData,
      timestamp: new Date().toISOString(),
    };

    socketRef.current.emit("send_message", gameMessage);
    setMessages((prev) => [...prev, gameMessage]);
    setShowArcade(false);
  };

  const handleSaveAlias = (uid, newAlias) => {
    let updated;
    if (newAlias.trim() === "") {
      const copy = { ...contactAliases };
      delete copy[uid];
      updated = copy;
    } else {
      updated = { ...contactAliases, [uid]: newAlias.trim() };
    }
    setContactAliases(updated);
    localStorage.setItem("konek_aliases", JSON.stringify(updated));
    setEditingAlias(false);
  };

  const handleGameAction = (msg, action) => {
    if (!socketRef.current) return;
    const newData = { ...msg.gameData };
    const { gameType } = msg;

    if (gameType === "tictactoe") {
      if (newData.state !== "playing" || newData.turn !== userId || newData.board[action.index] !== null) return;
      newData.board[action.index] = userId;

      const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
      for (const [a, b, c] of lines) {
        if (newData.board[a] && newData.board[a] === newData.board[b] && newData.board[a] === newData.board[c]) {
          newData.winner = userId;
          newData.state = "finished";
        }
      }
      if (!newData.winner && !newData.board.includes(null)) newData.state = "draw";
      if (newData.state === "playing") newData.turn = userId === msg.sender_id ? msg.receiver_id : msg.sender_id;
    }
    // Simplified logic for other games to save space, but functional
    else if (gameType === "connect4") {
      if (newData.state !== "playing" || newData.turn !== userId) return;
      const col = action.col;
      for (let r = 5; r >= 0; r--) {
        if (!newData.board[r][col]) {
          newData.board[r][col] = userId;
          break;
        }
      }
      newData.turn = userId === msg.sender_id ? msg.receiver_id : msg.sender_id;
    }
    else if (gameType === "hangman") {
      if (newData.state === "setup" && userId === newData.creator && action.word) {
        newData.wordX = action.word.toUpperCase();
        newData.state = "playing";
        newData.turn = newData.solver;
      }
      else if (newData.state === "playing" && userId === newData.solver) {
        const letter = action.letter.toUpperCase();
        if (!newData.guessed.includes(letter)) {
          newData.guessed.push(letter);
          if (!newData.wordX.includes(letter)) newData.wrongCount++;
          const won = newData.wordX.split('').every(l => newData.guessed.includes(l));
          if (won) { newData.state = "finished"; newData.winner = newData.solver; }
          else if (newData.wrongCount >= 6) { newData.state = "finished"; newData.winner = newData.creator; }
        }
      }
    }
    else if (gameType === "rps") {
      if (newData.state === "finished") return;
      if (userId === newData.p1) newData.p1Move = action.move;
      if (userId === newData.p2) newData.p2Move = action.move;
      if (newData.p1Move && newData.p2Move) newData.state = "finished"; // Logic missing to determine winner, but state updates.
    }

    const updatedMsg = { ...msg, gameData: newData };
    socketRef.current.emit("game_action", updatedMsg);
    setMessages((prev) => prev.map(m => m.id === msg.id ? updatedMsg : m));
  };

  const renderGameMessage = (msg) => {
    const { gameType, gameData } = msg;
    const isMyTurn = gameData.turn === userId;

    return (
      <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 8, marginTop: 5 }}>
        <div style={{ fontWeight: "bold", marginBottom: 5, textAlign: "center" }}>
          {gameType.toUpperCase()}
        </div>

        {gameType === "tictactoe" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 40px)", gap: 2, justifyContent: "center" }}>
            {gameData.board.map((cell, idx) => (
              <button key={idx} disabled={cell !== null || !isMyTurn || gameData.state !== "playing"}
                onClick={() => handleGameAction(msg, { index: idx })}
                style={{ width: 40, height: 40, background: "#333", color: "white", fontSize: 20, border: "none" }}
              >
                {cell === msg.sender_id ? "⭕" : cell ? "❌" : ""}
              </button>
            ))}
          </div>
        )}

        {gameType === "connect4" && (
          <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
            {gameData.board[0].map((_, col) => (
              <button key={col} disabled={!isMyTurn || gameData.state !== "playing"}
                onClick={() => handleGameAction(msg, { col })}
                style={{ width: 30, background: "#333", color: "white", padding: "5px 0" }}
              >↓</button>
            ))}
          </div>
        )}

        {gameType === "rps" && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {["rock", "paper", "scissors"].map(m => (
              <button key={m} onClick={() => handleGameAction(msg, { move: m })} style={{ padding: 10 }}>
                {m === "rock" ? "✊" : m === "paper" ? "✋" : "✌️"}
              </button>
            ))}
          </div>
        )}

        {gameType === "hangman" && (
          <div style={{ textAlign: "center" }}>
            {gameData.state === "setup" && userId === gameData.creator ? (
              <div>
                <input type="password" id={`hm-${msg.id}`} placeholder="Palabra secreta" style={{ padding: 5, width: "80%", borderRadius: 4, border: "none" }} />
                <button onClick={() => {
                  const w = document.getElementById(`hm-${msg.id}`).value;
                  if (w) handleGameAction(msg, { word: w });
                }} style={{ marginTop: 5, padding: "5px 15px", background: "#00a884", color: "#fff", border: "none", borderRadius: 4 }}>Empezar</button>
              </div>
            ) : gameData.state === "setup" ? (
              <div>El oponente está eligiendo una palabra...</div>
            ) : (
              <div>
                <div style={{ fontSize: 24, letterSpacing: 5, padding: 10, background: "#222", borderRadius: 8, margin: "5px 0" }}>
                  {gameData.wordX.split('').map(l => gameData.guessed.includes(l) ? l : "_").join('')}
                </div>
                <div style={{ color: "#ef5350", marginBottom: 5 }}>Errores: {gameData.wrongCount} / 6</div>
                {gameData.state === "playing" && userId === gameData.solver && (
                  <div style={{ marginBottom: 5 }}>
                    <input type="text" maxLength={1} id={`g-${msg.id}`} style={{ width: 40, textAlign: "center", textTransform: "uppercase", padding: 5, borderRadius: 4, border: "none" }} />
                    <button onClick={() => {
                      const l = document.getElementById(`g-${msg.id}`).value;
                      if (l) { handleGameAction(msg, { letter: l }); document.getElementById(`g-${msg.id}`).value = ""; }
                    }} style={{ marginLeft: 5, background: "#00a884", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 4 }}>Probar</button>
                  </div>
                )}
                <div style={{ fontSize: 12, wordWrap: "break-word" }}>{(gameData.guessed || []).join(" - ")}</div>
                {gameData.state === "finished" && (
                  <div style={{ marginTop: 10, color: gameData.winner === userId ? "#00a884" : "#ef5350", fontWeight: "bold" }}>
                    La palabra era: {gameData.wordX}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {gameType === "battleship" && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <span style={{ fontSize: 30 }}>🛠️</span><br />
            (Próximamente en desarrollo...)
          </div>
        )}

        {gameType === "memory" && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <span style={{ fontSize: 30 }}>🛠️</span><br />
            (Próximamente en desarrollo...)
          </div>
        )}


        <div style={{ textAlign: "center", fontSize: 10, marginTop: 5 }}>
          {gameData.state === "playing" ? (isMyTurn ? "Tu turno" : "Turno del oponente") :
            gameData.state === "setup" ? "Esperando configuración..." :
              gameData.state === "waiting" ? "Esperando jugador..." :
                gameData.winner ? `¡Ganó ${gameData.winner === userId ? 'tú' : 'el oponente'}!` : `Fin del juego (Empate)`}
        </div>
      </div>
    );
  };

  return (
    <div className={`app-container ${activeChat ? "chat-active" : ""}`}>
      {/* Barra Lateral */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flex: 1,
              overflow: "hidden",
            }}
          >
            <div
              className="avatar"
              onClick={() => setShowProfileModal(true)}
              style={{
                width: 40,
                height: 40,
                background: "#6a7175",
                borderRadius: "50%",
                cursor: "pointer",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {profile.photo ? (
                <img
                  src={profile.photo}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <User color="white" size={20} />
              )}
            </div>
            <div
              style={{
                marginLeft: 12,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                overflow: "hidden",
                cursor: "pointer",
              }}
              onClick={() => setShowProfileModal(true)}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "var(--wa-text-secondary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {profile.description || "¡Hola! Estoy usando Konek Fun."}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="icon-btn"
              onClick={() => {
                const colors = [
                  "#00a884",
                  "#128c7e",
                  "#cf6679",
                  "#9c27b0",
                  "#e91e63",
                  "#ff9800",
                  "#f44336",
                  "#2196f3",
                  "#4caf50",
                ];
                let idx = colors.indexOf(themeColor);
                if (idx === -1) idx = 0;
                setThemeColor(colors[(idx + 1) % colors.length]);
              }}
              title="Cambiar Tema"
            >
              <Palette size={20} />
            </button>

            <button
              className="icon-btn"
              onClick={() => setShowProfileModal(true)}
            >
              <Settings size={20} />
            </button>
            {showInstallButton && (
              <button
                className="icon-btn"
                onClick={handleInstallClick}
                title="Instalar Aplicación"
              >
                <Download size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Navegación por Pestañas */}
        <div className="tab-navigation">
          <div
            className={`tab-btn ${activeTab === "contactos" ? "active" : ""}`}
            onClick={() => setActiveTab("contactos")}
          >
            <Users size={20} />
            <span>CONTACTOS</span>
          </div>
          <div
            className={`tab-btn ${activeTab === "chats" ? "active" : ""}`}
            onClick={() => setActiveTab("chats")}
            style={{ position: 'relative' }}
          >
            <MessageCircle size={20} />
            <span>CHATS</span>
            {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
              <div style={{ position: 'absolute', top: 5, right: '15%', background: '#ff3b30', color: 'white', borderRadius: '50%', minWidth: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', padding: '0 4px' }}>
                {Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
              </div>
            )}
          </div>
          <div
            className={`tab-btn ${activeTab === "statuses" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("statuses");
              socketRef.current.emit("request_statuses");
            }}
            style={{ position: 'relative' }}
          >
            <CircleDashed size={20} />
            <span>ESTADOS</span>
            {statuses.filter(s => s.user_id !== userId && !viewedStatuses.includes(s.id)).length > 0 && (
              <div style={{ position: 'absolute', top: 5, right: '15%', background: '#ff3b30', color: 'white', borderRadius: '50%', minWidth: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', padding: '0 4px' }}>
                {statuses.filter(s => s.user_id !== userId && !viewedStatuses.includes(s.id)).length}
              </div>
            )}
          </div>
          <div
            className={`tab-btn ${activeTab === "mundo" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("mundo");
              setUnreadMundoCount(0);
              if (localStorage.getItem('konek_mundo_joined') === 'true') {
                socketRef.current.emit('get_mundo');
              }
            }}
            style={{ position: 'relative' }}
          >
            <Globe size={20} />
            <span>MUNDO</span>
            {unreadMundoCount > 0 && (
              <div style={{ position: 'absolute', top: 5, right: '15%', background: 'var(--wa-accent)', color: 'white', borderRadius: '50%', minWidth: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', padding: '0 4px' }}>
                {unreadMundoCount}
              </div>
            )}
          </div>
        </div>

        {activeTab === "contactos" && (
          <div className="contact-list-container" style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '15px 16px', fontSize: 13, color: 'var(--wa-text-secondary)', borderBottom: '1px solid var(--wa-border)' }}>
              Mis Contactos
            </div>
            {[...availableUsers, ...temporaryChats].length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--wa-text-secondary)' }}>
                Aún no tienes contactos.
              </div>
            ) : (
              [...availableUsers, ...temporaryChats].map(user => {
                const isSaved = availableUsers.some(u => u.id === user.id);
                return (
                  <div key={user.id} className="chat-item" onClick={() => { setActiveChat({ id: user.id, name: user.username }); setActiveTab('chats'); }}>
                    <div className="avatar" style={{ background: '#6a7175', borderRadius: '50%', width: 40, height: 40, marginRight: 15, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {user.profile_pic ? <img src={user.profile_pic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User color="white" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{user.username}</span>
                        {!isSaved && (
                          <button 
                            style={{ background: 'var(--wa-accent)', color: 'white', border: 'none', borderRadius: 12, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); addContact(user); }}
                          >
                            Agregar
                          </button>
                        )}
                        {isSaved && <span style={{ fontSize: 10, color: '#25d366' }}>Agendado</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--wa-text-secondary)' }}>ID: {user.id.slice(0, 8)}...</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "chats" && (
          <>
            <div className="search-container">
              <form onSubmit={startNewChat} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Escribe el ID de tu amigo para chatear"
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                />
                <button
                  type="submit"
                  className="icon-btn"
                  style={{
                    background: "var(--wa-accent)",
                    color: "white",
                    borderRadius: "8px",
                  }}
                >
                  <Search size={18} />
                </button>
              </form>
            </div>

            <div className="chat-list">
              <div
                style={{
                  padding: "10px 16px",
                  fontSize: 12,
                  color: "var(--wa-accent)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                Mis Conversaciones
              </div>

              {availableUsers.length === 0 && temporaryChats.length === 0 && (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "var(--wa-text-secondary)",
                    fontSize: 13,
                  }}
                >
                  No tienes chats abiertos. Ingresa un número arriba o busca en la pestaña de Contactos.
                </div>
              )}

              {[...availableUsers, ...temporaryChats].map((user) => (
                <div
                  key={user.id}
                  className={`chat-item ${activeChat?.id === user.id ? "active" : ""}`}
                  onClick={() =>
                    setActiveChat({ id: user.id, name: user.username })
                  }
                >
                  <div
                    className="avatar"
                    style={{
                      width: 48,
                      height: 48,
                      background: "#6a7175",
                      borderRadius: "50%",
                      marginRight: 15,
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {user.profile_pic ? (
                      <img
                        src={user.profile_pic}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <User color="white" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>
                        {contactAliases[user.id] || user.username}
                        {!availableUsers.some(u => u.id === user.id) && user.id !== 'global' && (
                           <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--wa-accent)', fontStyle: 'italic' }}>(Temporal)</span>
                        )}
                      </span>
                      {blockedUsers.includes(user.id) && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "#ef4444",
                            background: "rgba(239, 68, 68, 0.1)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          BLOQUEADO
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--wa-text-secondary)",
                        }}
                      >
                        #{user.phone_number || "Desconocido"}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {unreadCounts[user.id] > 0 && (
                          <div
                            style={{
                              background: "#25d366",
                              color: "#111b21",
                              borderRadius: "50%",
                              width: 20,
                              height: 20,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {unreadCounts[user.id]}
                          </div>
                        )}
                        <button
                          className="icon-btn"
                          style={{
                            padding: "4px",
                            width: "auto",
                            height: "auto",
                            opacity: 0.8,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (availableUsers.some(u => u.id === user.id)) {
                              deleteContact(user.id);
                            } else {
                              setTemporaryChats(prev => prev.filter(u => u.id !== user.id));
                              if (activeChat?.id === user.id) setActiveChat(null);
                            }
                          }}
                          title="Eliminar chat"
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "statuses" && (
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
                      <div
                        className="status-avatar-wrapper"
                        onClick={() => {
                          if (myGroup) {
                            setViewingGroup(myGroup);
                            setCurrentIdx(0);
                          }
                        }}
                      >
                        <div
                          className={`avatar ${myGroup ? "status-ring" : ""}`}
                          style={{
                            width: 48,
                            height: 48,
                            background: "#6a7175",
                            borderRadius: "50%",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {profile.photo ? (
                            <img
                              src={profile.photo}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: "50%",
                              }}
                            />
                          ) : (
                            <User color="white" />
                          )}
                        </div>
                      </div>
                      <div
                        style={{ flex: 1, marginLeft: 15 }}
                        onClick={() => {
                          if (myGroup) {
                            setViewingGroup(myGroup);
                            setCurrentIdx(0);
                          }
                        }}
                      >
                        <div
                          style={{ fontWeight: 500, color: "var(--wa-text)" }}
                        >
                          Mi estado
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--wa-text-secondary)",
                            marginTop: 4,
                          }}
                        >
                          {myGroup
                            ? "Toca para ver tus actualizaciones"
                            : "Toca para añadir una actualización"}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        {myGroup && (
                          <button
                            className="icon-btn-circle small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMyStatusList(!showMyStatusList);
                            }}
                          >
                            <MoreVertical size={16} color="white" />
                          </button>
                        )}
                        <button
                          className="icon-btn-circle"
                          onClick={() => statusInputRef.current.click()}
                        >
                          <Camera size={18} color="white" />
                        </button>
                        <button
                          className="icon-btn-circle"
                          onClick={() => setShowTextStatusEditor(true)}
                        >
                          <Type size={18} color="white" />
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={statusInputRef}
                        style={{ display: "none" }}
                        accept="image/*"
                        onChange={publishStatus}
                      />
                    </div>

                    {showMyStatusList && myGroup && (
                      <div
                        className="my-statuses-list"
                        style={{ padding: "0 16px", marginBottom: 15 }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--wa-accent)",
                            marginBottom: 8,
                            marginTop: 5,
                          }}
                        >
                          MIS ACTUALIZACIONES
                        </div>
                        {myGroup.items.map((item, idx) => (
                          <div
                            key={item.id}
                            className="my-status-sub-item"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "10px 0",
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                            }}
                          >
                            <div
                              className="mini-preview"
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background:
                                  item.type === "text"
                                    ? JSON.parse(item.content).bg
                                    : "#3b4a54",
                                overflow: "hidden",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                setViewingGroup(myGroup);
                                setCurrentIdx(idx);
                              }}
                            >
                              {item.type === "image" ? (
                                <img
                                  src={item.content}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <Type size={14} color="white" />
                              )}
                            </div>
                            <div
                              style={{
                                flex: 1,
                                marginLeft: 12,
                                fontSize: 13,
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                setViewingGroup(myGroup);
                                setCurrentIdx(idx);
                              }}
                            >
                              {new Date(item.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <button
                              className="icon-btn"
                              onClick={() => deleteStatus(item.id)}
                            >
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

            <div
              style={{
                padding: "10px 16px",
                fontSize: 12,
                color: "var(--wa-accent)",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              RECIENTES
            </div>

            <div className="status-items">
              {(() => {
                const grouped = statuses.reduce((acc, s) => {
                  if (!acc[s.user_id]) acc[s.user_id] = { ...s, items: [] };
                  acc[s.user_id].items.push(s);
                  return acc;
                }, {});

                // Separar los grupos en dos arreglos: vistos todos y no vistos
                const unreadGroups = [];
                const readGroups = [];

                Object.values(grouped)
                  .filter(
                    (g) =>
                      g.user_id !== userId &&
                      availableUsers.some((u) => u.id === g.user_id),
                  )
                  .forEach((group) => {
                    // Ordenar elementos asc o mantener como vienen (idealmente mas viejo al mas nuevo)
                    const allSeen = group.items.every((item) =>
                      viewedStatuses.includes(item.id),
                    );
                    if (allSeen) readGroups.push(group);
                    else unreadGroups.push(group);
                  });

                // Ordenar cada arreglo para que el estado más reciente de cada grupo esté arriba
                unreadGroups.sort(
                  (a, b) =>
                    new Date(b.items[b.items.length - 1].timestamp) -
                    new Date(a.items[a.items.length - 1].timestamp),
                );
                readGroups.sort(
                  (a, b) =>
                    new Date(b.items[b.items.length - 1].timestamp) -
                    new Date(a.items[a.items.length - 1].timestamp),
                );

                const renderGroup = (group, isRead) => (
                  <div
                    key={group.user_id}
                    className="status-item"
                    onClick={() => {
                      setViewingGroup(group);
                      // Empezar en el primer estado no visto, o 0 si todos vistos
                      let firstUnseenIdx = group.items.findIndex(
                        (i) => !viewedStatuses.includes(i.id),
                      );
                      setCurrentIdx(Math.max(0, firstUnseenIdx));
                    }}
                  >
                    <div
                      className={`avatar ${isRead ? "status-ring-read" : "status-ring"}`}
                      style={{
                        width: 48,
                        height: 48,
                        background: "#6a7175",
                        borderRadius: "50%",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {group.profile_pic ? (
                        <img
                          src={group.profile_pic}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <User color="white" />
                      )}
                    </div>
                    <div style={{ flex: 1, marginLeft: 15 }}>
                      <div style={{ fontWeight: 500 }}>{contactAliases[group.id] || group.username}</div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--wa-text-secondary)",
                          marginTop: 4,
                        }}
                      >
                        {new Date(group.items[0].timestamp).toLocaleTimeString(
                          [],
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </div>
                    </div>
                  </div>
                );

                return (
                  <>
                    {unreadGroups.map((g) => renderGroup(g, false))}
                    {readGroups.length > 0 && (
                      <div
                        style={{
                          padding: "10px 16px",
                          fontSize: 12,
                          color: "var(--wa-accent)",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          marginTop: 10,
                        }}
                      >
                        VISTOS
                      </div>
                    )}
                    {readGroups.map((g) => renderGroup(g, true))}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {activeTab === 'mundo' && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "var(--wa-bg)",
          display: "flex",
          flexDirection: "column",
          zIndex: 1000,
          overflow: "hidden",
          height: isMobile ? '100dvh' : '100%'
        }}>
          {/* Header Mundo */}
          <div style={{ height: 60, background: 'var(--wa-header)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0, borderBottom: '1px solid var(--wa-border)' }}>
            <button onClick={() => setActiveTab('chats')} className="icon-btn" style={{ marginLeft: -8, color: 'var(--wa-text-primary)' }}>
              <ChevronLeft size={24} />
            </button>
            <Globe size={22} color="var(--wa-accent)" />
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--wa-text-primary)', flex: 1 }}>Mundo</span>
            {!showMundoAnonModal && (
              <span style={{ fontSize: 12, color: 'var(--wa-text-secondary)' }}>{mundoAnonymous ? '🕵️ Anónimo' : `👤 ${profile.name}`}
                <button onClick={() => { localStorage.removeItem('konek_mundo_joined'); setShowMundoAnonModal(true); }}
                  style={{ marginLeft: 8, background: 'none', color: 'var(--wa-accent)', cursor: 'pointer', fontSize: 11, padding: '2px 6px', borderRadius: 6, border: '1px solid var(--wa-accent)' }}>Cambiar</button>
              </span>
            )}
          </div>

          {showMundoAnonModal ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <Globe size={56} color="var(--wa-accent)" />
              <h3 style={{ color: 'var(--wa-text-primary)', textAlign: 'center', margin: 0, fontSize: 22 }}>Bienvenido al Mundo</h3>
              <p style={{ color: 'var(--wa-text-secondary)', textAlign: 'center', fontSize: 14, margin: 0, maxWidth: 340 }}>Un muro global donde todos los usuarios pueden publicar y leer, sean contactos o no. ¿Cómo querés aparecer?</p>
              <button onClick={() => joinMundo(false)} style={{ width: '100%', maxWidth: 340, padding: '15px', background: 'var(--wa-accent)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {profile.photo ? <img src={profile.photo} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : '👤'}
                Con mi nombre: {profile.name}
              </button>
              <button onClick={() => joinMundo(true)} style={{ width: '100%', maxWidth: 340, padding: '15px', background: '#2a3942', color: 'var(--wa-text-primary)', border: '1px solid var(--wa-border)', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>🕵️ Anónimo</button>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {uploadProgress && (
                  <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--wa-border)' }}>
                    <div style={{ fontSize: 12, marginBottom: 4, color: 'var(--wa-text-primary)' }}>Subiendo: {uploadProgress.name}</div>
                    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                      <div style={{ width: `${uploadProgress.progress}%`, height: '100%', background: 'var(--wa-accent)', borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}
                {memoizedMundoPosts.length === 0 && !mundoWelcomeSent && (
                  <div style={{ textAlign: 'center', color: 'var(--wa-text-secondary)', marginTop: 60, fontSize: 14 }}>No hay publicaciones aún. ¡Sé el primero!</div>
                )}
                {memoizedMundoPosts.map(post => (
                  <div key={post.id} style={{
                    padding: post.system ? '20px' : '14px 20px',
                    borderBottom: '1px solid var(--wa-border)',
                    maxWidth: 680,
                    margin: '0 auto',
                    width: '100%',
                    boxSizing: 'border-box',
                    background: post.system ? 'linear-gradient(135deg, rgba(var(--wa-accent-rgb), 0.1) 0%, rgba(0,0,0,0) 100%)' : 'transparent'
                  }}>
                    {post.system ? (
                      <div style={{ textAlign: 'center', position: 'relative' }}>
                        <button onClick={() => { localStorage.setItem('konek_mundo_welcome_dismissed', 'true'); setWelcomeDismissed(true); }}
                          style={{ position: 'absolute', top: -10, right: -10, padding: 5, background: 'none', border: 'none', color: 'var(--wa-text-secondary)', cursor: 'pointer' }}>
                          <X size={16} />
                        </button>
                        <Globe size={32} color="var(--wa-accent)" style={{ marginBottom: 12 }} />
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--wa-text-primary)', lineHeight: 1.5 }}>{post.text}</p>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          {!post.anonymous && post.profilePic ? (
                            <img src={post.profilePic} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: post.anonymous ? '#4a5568' : 'var(--wa-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: 'white', fontWeight: 700, flexShrink: 0 }}>
                              {post.anonymous ? '?' : (post.displayName || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--wa-text-primary)' }}>{post.displayName}</div>
                            <div style={{ fontSize: 11, color: 'var(--wa-text-secondary)' }}>{new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                          {post.userId !== userId && !post.anonymous && (
                            <button onClick={() => setSelectedMundoUser(post)}
                              style={{ fontSize: 12, padding: '6px 16px', background: 'var(--wa-accent)', color: 'white', border: 'none', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}>
                              Ver
                            </button>
                          )}
                        </div>

                        <div style={{ paddingLeft: 48 }}>
                          {post.type === "image" && post.fileInfo && (
                            <div style={{ marginBottom: 10 }}>
                              <img src={`${SERVER_URL}/api/download/${post.fileInfo.id}/${post.fileInfo.name}`}
                                style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 300, cursor: 'pointer' }}
                                onClick={() => setFullscreenImage(`${SERVER_URL}/api/download/${post.fileInfo.id}/${post.fileInfo.name}`)} />
                            </div>
                          )}
                          {post.type === "video" && post.fileInfo && (
                            <div style={{ marginBottom: 10 }}>
                              <video src={`${SERVER_URL}/api/download/${post.fileInfo.id}/${post.fileInfo.name}`} controls
                                style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 300 }} />
                            </div>
                          )}
                          {post.type === "audio" && post.fileInfo && (
                            <div style={{ marginBottom: 10 }}>
                              <audio src={`${SERVER_URL}/api/download/${post.fileInfo.id}/${post.fileInfo.name}`} controls
                                style={{ height: 40, width: '100%', borderRadius: 8 }} />
                            </div>
                          )}
                          {post.type === "file" && post.fileInfo && (
                            <div onClick={() => window.open(`${SERVER_URL}/api/download/${post.fileInfo.id}/${post.fileInfo.name}`)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--wa-header)', borderRadius: 8, cursor: 'pointer' }}>
                              <FileText color="var(--wa-accent)" />
                              <div style={{ fontSize: 13, color: 'var(--wa-text-primary)' }}>{post.fileInfo.name}</div>
                            </div>
                          )}
                          {post.text && (
                            <div style={{ fontSize: 15, color: 'var(--wa-text-primary)', lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                              {renderTextWithLinks(post.text)}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--wa-border)', display: 'flex', gap: 8, flexShrink: 0, background: 'var(--wa-header)', alignItems: 'center' }}>
                <button onClick={() => mundoFileInputRef.current.click()} style={{ background: 'none', border: 'none', color: 'var(--wa-text-secondary)', cursor: 'pointer', padding: 4 }}>
                  <Paperclip size={24} />
                </button>
                <input type="file" ref={mundoFileInputRef} style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) uploadMundoFile(e.target.files[0]); e.target.value = ''; }} />

                <input type="text" value={mundoInput} onChange={e => setMundoInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendMundoPost()}
                  placeholder="Escribe algo para el Mundo..."
                  style={{ flex: 1, padding: '11px 16px', borderRadius: 24, border: 'none', background: 'var(--wa-input)', color: 'var(--wa-text-primary)', outline: 'none', fontSize: 14 }} />

                <button onClick={sendMundoPost} style={{ background: 'var(--wa-accent)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Send size={20} color="white" />
                </button>
              </div>
            </>
          )}
        </div>
      )
      }

      <div className="chat-window" style={activeTab === 'mundo' ? { display: 'none' } : {}}>
        {!activeChat ? (
          <div className="chat-placeholder">
            <div className="placeholder-content">
              <div className="logo-placeholder">
                <MessageCircle size={80} color="#3b4a54" />
              </div>
              <h2>Konek Fun</h2>
              <p>
                Envía y recibe mensajes sin mantener tu teléfono conectado.
                <br />
                Usa Konek Fun en hasta 4 dispositivos vinculados y 1 teléfono a
                la vez.
              </p>
              <div
                style={{
                  marginTop: "60px",
                  fontSize: 12,
                  color: "var(--wa-text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <CheckCheck size={14} /> Cifrado de extremo a extremo
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  flex: 1,
                }}
                onClick={() => {
                  if (activeChat.id !== "global") {
                    setShowContactProfile(true);
                  }
                }}
              >
                <button
                  className="icon-btn mobile-back-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveChat(null);
                  }}
                >
                  <ChevronLeft size={24} color="white" />
                </button>
                <div
                  className="avatar"
                  style={{
                    width: 40,
                    height: 40,
                    background: "#00a884",
                    borderRadius: "50%",
                    marginRight: 12,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {availableUsers.find((u) => u.id === activeChat.id)
                    ?.profile_pic ? (
                    <img
                      src={
                        availableUsers.find((u) => u.id === activeChat.id)
                          .profile_pic
                      }
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <User color="white" size={20} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{contactAliases[activeChat.id] || activeChat.name}</div>
                  <div
                    style={{
                      fontSize: 13,
                      color: typingUsers[activeChat.id]
                        ? "#00a884"
                        : "var(--wa-text-secondary)",
                      transition: "color 0.2s",
                      fontWeight: typingUsers[activeChat.id] ? 500 : 400,
                    }}
                  >
                    {typingUsers[activeChat.id]
                      ? "escribiendo..."
                      : activeChat.id === "global"
                        ? "Chat Público"
                        : "Chat Privado"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 15, position: "relative" }}>
                <button className="icon-btn">
                  <Search size={20} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setShowChatMenu(!showChatMenu)}
                >
                  <MoreVertical size={20} />
                </button>

                {showChatMenu && (
                  <div className="dropdown-menu">
                    <div
                      className="dropdown-item"
                      onClick={() => deleteChat(activeChat.id)}
                    >
                      Borrar chat
                    </div>
                    <div
                      className="dropdown-item"
                      onClick={() => toggleBlockUser(activeChat)}
                    >
                      {blockedUsers.includes(activeChat.id)
                        ? "Desbloquear usuario"
                        : "Bloquear usuario"}
                    </div>
                    <div
                      className="dropdown-item"
                      onClick={() => { setShowChatMenu(false); setShowSetPinModal(true); }}
                    >
                      {lockedChats[activeChat.id] ? '🔓 Quitar PIN del chat' : '🔒 Bloquear chat con PIN'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="messages-container" ref={messagesContainerRef} onScroll={handleMessagesScroll} style={{ position: 'relative' }}>
              {loadingMoreMessages && (
                <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--wa-text-secondary)', fontSize: 12 }}>
                  Cargando mensajes anteriores...
                </div>
              )}
              {loadingChatHistory && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, color: 'var(--wa-text-secondary)' }}>
                  Cargando...
                </div>
              )}
              {/* Chat bloqueado overlay */}
              {lockedChats[activeChat.id] && !showPinModal && (
                <div style={{ position: 'absolute', inset: 0, background: 'var(--wa-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 50 }}>
                  <div style={{ fontSize: 64 }}>🔒</div>
                  <h3 style={{ color: 'var(--wa-text-primary)', margin: 0 }}>Chat bloqueado</h3>
                  <p style={{ color: 'var(--wa-text-secondary)', fontSize: 13, margin: 0 }}>Este chat está protegido con un PIN.</p>
                  <button onClick={() => setShowPinModal(true)} style={{ padding: '12px 24px', background: 'var(--wa-accent)', color: 'white', border: 'none', borderRadius: 24, fontWeight: 700, cursor: 'pointer' }}>Desbloquear</button>
                </div>
              )}
              {activeChat && activeChat.id !== 'global' && !availableUsers.some(u => u.id === activeChat.id) && (
                <div style={{ background: 'var(--wa-header)', padding: '12px 20px', margin: '10px 16px', borderRadius: 8, border: '1px solid var(--wa-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 5 }}>
                  <div style={{ fontSize: 13, color: 'var(--wa-text-secondary)' }}>
                    Este usuario no est&aacute; en tus contactos.
                  </div>
                  <button 
                    style={{ background: 'var(--wa-accent)', color: 'white', border: 'none', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => {
                        const tempUser = temporaryChats.find(u => u.id === activeChat.id) || allUsers.find(u => u.id === activeChat.id);
                        if (tempUser) addContact(tempUser);
                    }}
                  >
                    Agendar
                  </button>
                </div>
              )}
              {messages
                .filter(
                  (msg) =>
                    (msg.sender_id === userId &&
                      msg.receiver_id === activeChat.id) ||
                    (msg.sender_id === activeChat.id &&
                      msg.receiver_id === userId),
                )
                .map((msg) => {
                  return (
                  <div
                    key={msg.id}
                    className={`message ${msg.sender_id === userId ? "me" : "other"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMsgActionMenu(prev => prev === msg.id ? null : msg.id);
                    }}
                    onContextMenu={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      setMsgActionMenu(msg.id); 
                    }}
                    style={{ position: 'relative', cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 12,
                        marginBottom: 4,
                        color: msg.sender_id === userId ? "#ffbd69" : "#53bdeb",
                      }}
                    >
                      {msg.sender_id === userId ? profile.name : (contactAliases[msg.sender_id] || activeChat.name)}
                    </div>
                    {msg.is_forwarded && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Share2 size={11} /> Reenviado
                      </div>
                    )}
                    {msgActionMenu === msg.id && (
                       <div className="msg-action-menu" style={{ 
                         right: msg.sender_id === userId ? 10 : 'auto', 
                         left: msg.sender_id !== userId ? 10 : 'auto' 
                       }}>
                           <div className="msg-action-item" onClick={() => { setForwardModal(msg); setMsgActionMenu(null); }}>Reenviar</div>
                           <div className="msg-action-item" onClick={() => {
                               socketRef.current.emit('delete_message', { messageId: msg.id, type: 'me', userId });
                               setMsgActionMenu(null);
                           }}>Eliminar para mí</div>
                           {msg.sender_id === userId && (
                               <div className="msg-action-item danger" onClick={() => {
                                   socketRef.current.emit('delete_message', { messageId: msg.id, type: 'everyone', userId });
                                   setMsgActionMenu(null);
                               }}>Eliminar para todos</div>
                           )}
                           <div className="msg-action-item" style={{ color: 'rgba(255,255,255,0.5)' }} onClick={() => setMsgActionMenu(null)}>Cancelar</div>
                       </div>
                    )}
                    {msg.is_deleted_for_all ? (
                       <div style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', fontSize: 13, paddingTop: 4 }}>
                         🚫 Este mensaje fue eliminado
                       </div>
                    ) : msg.type === "sticker" ? (
                      <div
                        style={{
                          padding: "2px",
                          position: "relative",
                          width: 140,
                        }}
                      >
                        <img
                          src={msg.content}
                          alt="sticker"
                          style={{
                            width: "100%",
                            height: "auto",
                            display: "block",
                            background: "transparent",
                          }}
                        />
                      </div>
                    ) : msg.type === "image" ? (
                      <div style={{ padding: "2px", position: "relative" }}>
                        <img
                          src={`${SERVER_URL}/api/download/${msg.file_info.id}/${msg.file_info.name}`}
                          alt={msg.file_info.name}
                          style={{
                            maxWidth: "100%",
                            borderRadius: "4px",
                            display: "block",
                            maxHeight: "300px",
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            setFullscreenImage(
                              `${SERVER_URL}/api/download/${msg.file_info.id}/${msg.file_info.name}`,
                            )
                          }
                        />
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.6)",
                            marginTop: 4,
                          }}
                        >
                          {msg.file_info.name} (
                          {(msg.file_info.size / (1024 * 1024)).toFixed(2)} MB)
                        </div>
                      </div>
                    ) : msg.type === "audio" ? (
                      <div style={{ padding: "0px", width: "100%", maxWidth: "300px", marginTop: 4 }}>
                        <audio
                          src={`${SERVER_URL}/api/download/${msg.file_info.id}/${msg.file_info.name}`}
                          controls
                          style={{ height: "40px", width: "100%", display: "block", borderRadius: "8px" }}
                        />
                      </div>
                    ) : msg.type === "video" ? (
                      <div className="video-message">
                        <video
                          src={`${SERVER_URL}/api/download/${msg.file_info.id}/${msg.file_info.name}`}
                          controls
                          preload="metadata"
                          playsInline
                          style={{
                            width: "100%",
                            maxHeight: "300px",
                            borderRadius: "8px",
                            display: "block",
                            background: "#000",
                          }}
                        />
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: 6,
                          padding: "0 2px",
                        }}>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 11,
                            color: "rgba(255,255,255,0.6)",
                          }}>
                            <FileVideo size={14} />
                            <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {msg.file_info.name}
                            </span>
                            <span>
                              ({msg.file_info.size < 1024 * 1024
                                ? (msg.file_info.size / 1024).toFixed(1) + " KB"
                                : msg.file_info.size < 1024 * 1024 * 1024
                                  ? (msg.file_info.size / (1024 * 1024)).toFixed(2) + " MB"
                                  : (msg.file_info.size / (1024 * 1024 * 1024)).toFixed(2) + " GB"
                              })
                            </span>
                          </div>
                          <a
                            href={`${SERVER_URL}/api/download/${msg.file_info.id}/${msg.file_info.name}`}
                            download
                            className="video-download-btn"
                            title="Descargar video"
                          >
                            <Download size={16} />
                          </a>
                        </div>
                      </div>
                    ) : msg.type === "file" ? (
                      <div className="enhanced-file-message">
                        <div className="enhanced-file-icon">
                          <FileText size={28} color="#aebac1" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {msg.file_info.name}
                          </div>
                          <div style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.5)",
                            marginTop: 2,
                          }}>
                            {msg.file_info.size < 1024
                              ? msg.file_info.size + " B"
                              : msg.file_info.size < 1024 * 1024
                                ? (msg.file_info.size / 1024).toFixed(1) + " KB"
                                : msg.file_info.size < 1024 * 1024 * 1024
                                  ? (msg.file_info.size / (1024 * 1024)).toFixed(2) + " MB"
                                  : (msg.file_info.size / (1024 * 1024 * 1024)).toFixed(2) + " GB"
                            }
                          </div>
                        </div>
                        <a
                          href={`${SERVER_URL}/api/download/${msg.file_info.id}/${msg.file_info.name}`}
                          download
                          className="enhanced-file-download-btn"
                          title="Descargar archivo"
                        >
                          <Download size={18} />
                        </a>
                      </div>
                    ) : msg.type === "game" ? (
                      renderGameMessage(msg)
                    ) : (
                      <span>{renderMessageText(msg.content)}</span>
                    )}

                    <div className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {msg.sender_id === userId && (
                        <CheckCheck
                          size={14}
                          className={`message-checkmark ${msg.read ? "animate-read" : ""}`}
                          style={{
                            marginLeft: 4,
                            verticalAlign: "middle",
                            color: msg.read ? "#53bdeb" : "#ef5350",
                          }}
                        />
                      )}
                    </div>

                    {/* Reaction icon + picker - WhatsApp style at bubble edge */}
                    <div style={{
                      position: 'absolute',
                      bottom: msg.reactions && msg.reactions.length > 0 ? -4 : 2,
                      ...(msg.sender_id === userId ? { left: -32 } : { right: -32 }),
                      zIndex: 10
                    }}>
                      <button
                        onClick={() => setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)}
                        className="reaction-trigger-btn"
                        style={{
                          background: 'var(--wa-header)',
                          border: '1px solid var(--wa-border)',
                          cursor: 'pointer',
                          fontSize: 14,
                          padding: '3px 5px',
                          lineHeight: 1,
                          borderRadius: '50%',
                          opacity: 0,
                          transition: 'opacity 0.15s ease',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 26,
                          height: 26
                        }}
                        title="Reaccionar"
                      >😊</button>
                      {activeReactionMsgId === msg.id && (
                        <div style={{
                          position: 'absolute',
                          bottom: '110%',
                          ...(msg.sender_id === userId ? { right: 0 } : { left: 0 }),
                          background: 'var(--wa-header)',
                          border: '1px solid var(--wa-border)',
                          borderRadius: 20,
                          padding: '6px 10px',
                          display: 'flex',
                          gap: 6,
                          zIndex: 100,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          whiteSpace: 'nowrap'
                        }}>
                          {['❤️', '😂', '😮', '😢', '👏', '🔥', '👍', '🙏'].map(emoji => (
                            <span key={emoji} onClick={() => sendReaction(msg, emoji)} style={{ cursor: 'pointer', fontSize: 20, lineHeight: 1, transition: 'transform 0.1s' }} onMouseEnter={e => e.target.style.transform = 'scale(1.3)'} onMouseLeave={e => e.target.style.transform = 'scale(1)'}>{emoji}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Reaction badges - outside bubble bottom */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        bottom: -14,
                        ...(msg.sender_id === userId ? { left: 4 } : { right: 4 }),
                        display: 'flex',
                        gap: 3,
                        zIndex: 5
                      }}>
                        {Object.entries(msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})).map(([emoji, count]) => (
                          <span key={emoji} onClick={() => sendReaction(msg, emoji)} style={{
                            background: 'var(--wa-header)',
                            borderRadius: 12,
                            padding: '1px 6px',
                            fontSize: 12,
                            cursor: 'pointer',
                            border: msg.reactions.find(r => r.userId === userId && r.emoji === emoji) ? '1px solid var(--wa-accent)' : '1px solid var(--wa-border)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            lineHeight: '18px'
                          }}>
                            {emoji} {count > 1 ? count : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })}

              {uploadProgress && (
                <div className="message me" style={{ opacity: 0.8 }}>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>
                    Subiendo: {uploadProgress.name}
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 4,
                      background: "rgba(255,255,255,0.2)",
                      borderRadius: 2,
                    }}
                  >
                    <div
                      style={{
                        width: `${uploadProgress.progress}%`,
                        height: "100%",
                        background: "#53bdeb",
                        borderRadius: 2,
                      }}
                    ></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              {isRecording ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    gap: 10,
                  }}
                >
                  <button className="icon-btn" onClick={cancelRecording}>
                    <Trash2 size={24} color="#ef4444" />
                  </button>
                  <div
                    style={{
                      flex: 1,
                      color: "#ef4444",
                      animation: "pulsate 1.5s infinite",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        background: "#ef4444",
                        borderRadius: "50%",
                      }}
                    ></div>
                    <span>Grabando {formatTime(recordingTime)}</span>
                  </div>
                  <button
                    className="icon-btn"
                    onClick={stopRecording}
                    style={{
                      background: "#00a884",
                      borderRadius: "50%",
                      padding: 8,
                    }}
                  >
                    <Send size={24} color="white" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className="icon-btn"
                    onClick={() => {
                      setShowEmojiPicker(!showEmojiPicker);
                      setShowStickers(false);
                      setShowArcade(false);
                    }}
                  >
                    <Smile
                      size={24}
                      color={
                        showEmojiPicker ? "#00a884" : "var(--wa-text-secondary)"
                      }
                    />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => {
                      setShowStickers(!showStickers);
                      setShowEmojiPicker(false);
                      setShowArcade(false);
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <ImageIcon
                        size={24}
                        color={
                          showStickers ? "#00a884" : "var(--wa-text-secondary)"
                        }
                      />
                      <span
                        style={{
                          position: "absolute",
                          bottom: -5,
                          right: -5,
                          fontSize: 9,
                          background: "var(--wa-accent)",
                          color: "white",
                          borderRadius: "4px",
                          padding: "0 2px",
                        }}
                      >
                        Stkr
                      </span>
                    </div>
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => {
                      setShowArcade(!showArcade);
                      setShowEmojiPicker(false);
                      setShowStickers(false);
                    }}
                  >
                    <Gamepad2
                      size={24}
                      color={showArcade ? "#00a884" : "var(--wa-text-secondary)"}
                    />
                  </button>

                  {showEmojiPicker && (
                    <div className="emoji-picker">
                      <div className="emoji-grid">
                        {COMMON_EMOJIS.map((emoji, index) => (
                          <span
                            key={index}
                            className="emoji-item"
                            onClick={() => addEmoji(emoji)}
                          >
                            {emoji}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {showStickers && (
                    <div
                      className="emoji-picker"
                      style={{ display: "flex", flexDirection: "column" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "10px",
                          background: "var(--wa-header)",
                          borderBottom: "1px solid var(--wa-border)",
                        }}
                      >
                        <span
                          style={{ color: "var(--wa-text)", fontWeight: 600 }}
                        >
                          Stickers
                        </span>
                        <label
                          style={{
                            color: "var(--wa-accent)",
                            cursor: "pointer",
                            fontSize: 14,
                          }}
                        >
                          + Añadir
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handleStickerUpload}
                          />
                        </label>
                      </div>
                      <div
                        className="emoji-grid"
                        style={{
                          gridTemplateColumns: "repeat(4, 1fr)",
                          gap: 10,
                          padding: 10,
                        }}
                      >
                        {stickers.map((stk, idx) => (
                          <div
                            key={idx}
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              const msgId = uuidv4();
                              const stickerMessage = {
                                id: msgId,
                                sender_id: userId,
                                receiver_id: activeChat.id,
                                content: stk,
                                type: "sticker",
                                timestamp: new Date().toISOString(),
                              };
                              socketRef.current.emit(
                                "send_message",
                                stickerMessage,
                              );
                              setMessages((prev) => [...prev, stickerMessage]);
                              setShowStickers(false);
                            }}
                          >
                            <img
                              src={stk}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                              }}
                            />
                          </div>
                        ))}
                        {stickers.length === 0 && (
                          <div
                            style={{
                              gridColumn: "1 / -1",
                              textAlign: "center",
                              color: "var(--wa-text-secondary)",
                              fontSize: 13,
                              marginTop: 20,
                            }}
                          >
                            Pulsa "+ Añadir" para subir tus stickers PNG/GIF.
                          </div>
                        )}
                      </div>
                      {stickers.length > 0 && (
                        <button
                          onClick={() => {
                            if (
                              window.confirm("¿Limpiar todos tus stickers?")
                            ) {
                              setStickers([]);
                              localStorage.removeItem("konek_custom_stickers");
                            }
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            padding: "10px",
                            cursor: "pointer",
                          }}
                        >
                          Limpiar Stickers
                        </button>
                      )}
                    </div>
                  )}

                  {showArcade && (
                    <div className="emoji-picker" style={{ padding: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div style={{ textAlign: "center", gridColumn: "1 / -1", fontWeight: "500", paddingBottom: "10px", borderBottom: "1px solid var(--wa-border)", color: "white" }}>Arcade Konek 🕹️</div>
                      <button className="icon-btn" style={{ background: "#2a3942", borderRadius: "8px", padding: "10px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "auto" }} onClick={() => startArcadeGame("tictactoe")}>
                        <span style={{ fontSize: "24px", marginBottom: "5px" }}>⭕❌</span>
                        <span style={{ fontSize: "12px", color: "white" }}>Tres en raya</span>
                      </button>
                      <button className="icon-btn" style={{ background: "#2a3942", borderRadius: "8px", padding: "10px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "auto" }} onClick={() => startArcadeGame("connect4")}>
                        <span style={{ fontSize: "24px", marginBottom: "5px" }}>🔴🟡</span>
                        <span style={{ fontSize: "12px", color: "white" }}>Conecta 4</span>
                      </button>
                      <button className="icon-btn" style={{ background: "#2a3942", borderRadius: "8px", padding: "10px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "auto" }} onClick={() => startArcadeGame("battleship")}>
                        <span style={{ fontSize: "24px", marginBottom: "5px" }}>🚢⛵</span>
                        <span style={{ fontSize: "12px", color: "white" }}>Batalla Naval</span>
                      </button>
                      <button className="icon-btn" style={{ background: "#2a3942", borderRadius: "8px", padding: "10px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "auto" }} onClick={() => startArcadeGame("hangman")}>
                        <span style={{ fontSize: "24px", marginBottom: "5px" }}>🧮🧠</span>
                        <span style={{ fontSize: "12px", color: "white" }}>Ahorcado</span>
                      </button>
                      <button className="icon-btn" style={{ background: "#2a3942", borderRadius: "8px", padding: "10px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "auto" }} onClick={() => startArcadeGame("rps")}>
                        <span style={{ fontSize: "24px", marginBottom: "5px" }}>🎯🎲</span>
                        <span style={{ fontSize: "12px", color: "white" }}>Piedra, Papel, Tijera</span>
                      </button>
                      <button className="icon-btn" style={{ background: "#2a3942", borderRadius: "8px", padding: "10px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "auto" }} onClick={() => startArcadeGame("memory")}>
                        <span style={{ fontSize: "24px", marginBottom: "5px" }}>🧠🎲</span>
                        <span style={{ fontSize: "12px", color: "white" }}>Memoria</span>
                      </button>
                    </div>
                  )}

                  <button
                    className="icon-btn"
                    onClick={() => document.getElementById("fileInput").click()}
                  >
                    <Paperclip size={24} />
                  </button>
                  <input
                    type="file"
                    id="fileInput"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />

                  <div className="input-wrapper">
                    <input
                      type="text"
                      className="message-input"
                      placeholder="Escribe un mensaje"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      data-lpignore="true"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    />
                  </div>

                  {input ? (
                    <>
                      <button className="icon-btn" onClick={() => setShowScheduleModal(true)} title="Programar envío" style={{ opacity: 0.7 }}>
                        <Clock size={20} />
                      </button>
                      <button className="icon-btn" onClick={sendMessage}>
                        <Send size={24} color="#00a884" />
                      </button>
                    </>
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

      {/* Modal Programar Mensaje */}
      {
        showScheduleModal && (
          <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 340 }}>
              <div className="modal-header">
                <h3>⏰ Programar Mensaje</h3>
                <button onClick={() => setShowScheduleModal(false)} className="icon-btn">×</button>
              </div>
              <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <textarea
                  value={scheduleInput}
                  onChange={e => setScheduleInput(e.target.value)}
                  placeholder="Escribe el mensaje a programar..."
                  rows={3}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--wa-border)', background: 'var(--wa-input)', color: 'var(--wa-text-primary)', fontSize: 13, resize: 'none', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
                <input
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={e => setScheduleDateTime(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--wa-border)', background: 'var(--wa-input)', color: 'var(--wa-text-primary)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
                <button onClick={scheduleMessage} style={{ padding: '12px', background: 'var(--wa-accent)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Programar envío</button>
                {scheduledMessages.filter(m => m.receiverId === activeChat?.id).length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--wa-text-secondary)', borderTop: '1px solid var(--wa-border)', paddingTop: 10 }}>
                    <strong>Programados para este chat:</strong>
                    {scheduledMessages.filter(m => m.receiverId === activeChat?.id).map(m => (
                      <div key={m.id} style={{ marginTop: 4 }}>💤 "{m.text.substring(0, 30)}..." → {new Date(m.sendAt).toLocaleString()}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Modal PIN Lock - Entrada */}
      {
        showPinModal && activeChat && lockedChats[activeChat.id] && (
          <div className="modal-overlay">
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 300, textAlign: 'center' }}>
              <div style={{ padding: '24px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                <h3 style={{ color: 'var(--wa-text-primary)', marginBottom: 8 }}>Chat Bloqueado</h3>
                <p style={{ color: 'var(--wa-text-secondary)', fontSize: 13, marginBottom: 16 }}>Introduce el PIN para acceder</p>
                <input
                  type="password"
                  maxLength={6}
                  value={pinEntry}
                  onChange={e => setPinEntry(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && unlockChatWithPin()}
                  placeholder="PIN"
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--wa-border)', background: 'var(--wa-input)', color: 'var(--wa-text-primary)', fontSize: 20, textAlign: 'center', letterSpacing: 8, boxSizing: 'border-box', outline: 'none', marginBottom: 12 }}
                  autoFocus
                />
                <button onClick={unlockChatWithPin} style={{ width: '100%', padding: '12px', background: 'var(--wa-accent)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Desbloquear</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal PIN Lock - Crear PIN */}
      {
        showSetPinModal && activeChat && (
          <div className="modal-overlay" onClick={() => setShowSetPinModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 300, textAlign: 'center' }}>
              <div className="modal-header">
                <h3>🔒 Bloquear Chat</h3>
                <button onClick={() => setShowSetPinModal(false)} className="icon-btn">×</button>
              </div>
              <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  placeholder="Crea un PIN (max 6 dígitos)"
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--wa-border)', background: 'var(--wa-input)', color: 'var(--wa-text-primary)', fontSize: 16, textAlign: 'center', letterSpacing: 4, boxSizing: 'border-box', outline: 'none' }}
                  autoFocus
                />
                <button onClick={() => newPin.length >= 4 && saveLockChat(activeChat.id, newPin)} style={{ padding: '12px', background: 'var(--wa-accent)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Confirmar PIN</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal instrucciones instalación iOS */}
      {
        showIosInstallModal && (
          <div className="modal-overlay" onClick={() => setShowIosInstallModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320, textAlign: "center" }}>
              <div className="modal-header">
                <h3>Instalar en iPhone</h3>
                <button onClick={() => setShowIosInstallModal(false)} className="icon-btn">×</button>
              </div>
              <div style={{ padding: "16px 20px 20px", color: "var(--wa-text-primary)" }}>
                <p style={{ marginBottom: 16, fontSize: 14, color: "var(--wa-text-secondary)" }}>
                  En Safari, sigue estos pasos:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>1️⃣</span>
                    <span style={{ fontSize: 13 }}>Toca el botón <strong>Compartir</strong> (📤) en la barra inferior de Safari</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>2️⃣</span>
                    <span style={{ fontSize: 13 }}>Desplázate y selecciona <strong>"Añadir a pantalla de inicio"</strong></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>3️⃣</span>
                    <span style={{ fontSize: 13 }}>Toca <strong>"Añadir"</strong> en la esquina superior derecha</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowIosInstallModal(false)}
                  style={{ marginTop: 20, width: "100%", padding: "12px", background: "var(--wa-accent)", color: "white", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Bienvenida (Onboarding) */}
      {
        showOnboarding && (
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
                <div
                  className="profile-photo-edit large"
                  onClick={() => profilePhotoInputRef.current.click()}
                >
                  {profile.photo ? (
                    <img src={profile.photo} />
                  ) : (
                    <div className="placeholder">
                      <Camera size={50} />
                    </div>
                  )}
                  <div className="overlay">
                    <Camera size={24} /> AÑADIR FOTO
                  </div>
                </div>

                {/* Nuevo: Input de archivo duplicado o referencia correcta para el onboarding */}
                <input
                  type="file"
                  ref={(el) => {
                    // Mantenemos la referencia principal y la opcional para que no falle
                    profilePhotoInputRef.current = el;
                  }}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleProfilePhotoUpload}
                />

                <div className="input-group">
                  <label>¿Cómo te llamas?</label>
                  <input
                    type="text"
                    placeholder="Tu nombre o apodo"
                    value={profile.name === "Mi Usuario" ? "" : profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                  />
                </div>

                <div className="info-box">
                  <ShieldCheck size={20} color="var(--wa-accent)" />
                  <div>
                    <strong>Identificación oficial</strong>
                    <p>
                      Una vez dentro, el administrador te asignará un número de ID
                      único para validar tu cuenta.
                    </p>
                  </div>
                </div>

                <button
                  className="onboarding-submit"
                  onClick={completeOnboarding}
                >
                  Empezar a usar Konek Fun
                </button>

                {/* Opción para ingresar con ID existente */}
                <div style={{ marginTop: 20, textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.15)" }} />
                    <span style={{ fontSize: 12, color: "var(--wa-text-secondary)", whiteSpace: "nowrap" }}>¿Ya tienes una cuenta?</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.15)" }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Pega tu ID de usuario..."
                      value={loginIdInput}
                      onChange={(e) => setLoginIdInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.07)",
                        color: "white",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={handleLoginWithId}
                      style={{
                        padding: "10px 18px",
                        borderRadius: 10,
                        border: "none",
                        background: "var(--wa-accent)",
                        color: "white",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Entrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal Reenviar Mensaje */}
      {forwardModal && (
        <div className="modal-overlay" onClick={() => setForwardModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <div className="modal-header" style={{ padding: '15px' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Reenviar mensaje</h3>
              <button onClick={() => setForwardModal(null)} className="icon-btn">×</button>
            </div>
            <div style={{ padding: '10px 15px', borderBottom: '1px solid var(--wa-border)', fontSize: '13px', color: 'var(--wa-text-secondary)', fontStyle: 'italic', background: 'var(--wa-bg-header)' }}>
              Selecciona el contacto al que deseas reenviar este mensaje.
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {[...availableUsers, ...temporaryChats].map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid var(--wa-border)', transition: 'background 0.2s' }} onClick={() => {
                  socketRef.current.emit('forward_message', { originalMessage: forwardModal, receiverId: c.id, senderId: userId });
                  setForwardModal(null);
                  setActiveTab('chats');
                  setActiveChat({ id: c.id, name: c.username });
                }} onMouseOver={(e) => e.currentTarget.style.background = 'var(--wa-input-bg)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#6a7175', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {c.profile_pic ? <img src={c.profile_pic} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User color="white" />}
                  </div>
                  <div style={{ marginLeft: 15, fontWeight: 500, color: 'var(--wa-text-primary)' }}>
                    {contactAliases[c.id] || c.username}
                  </div>
                </div>
              ))}
              {[...availableUsers, ...temporaryChats].length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--wa-text-secondary)' }}>No tienes contactos para reenviar.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Perfil */}
      {
        showProfileModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowProfileModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Perfil</h3>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="icon-btn"
                >
                  ×
                </button>
              </div>
              <div className="profile-edit-body">
                <div
                  className="profile-photo-edit"
                  onClick={() => profilePhotoInputRef.current.click()}
                >
                  {profile.photo ? (
                    <img src={profile.photo} />
                  ) : (
                    <div className="placeholder">
                      <Camera size={40} />
                    </div>
                  )}
                  <div className="overlay">
                    <Camera size={24} /> CAMBIAR FOTO
                  </div>
                </div>
                <input
                  type="file"
                  ref={profilePhotoInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleProfilePhotoUpload}
                />

                <div className="input-group">
                  <label>Tu nombre</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                  />
                </div>

                <div className="input-group">
                  <label>Tu número de identificación</label>
                  <div
                    className={`id-number-display ${profile.number ? "active" : "pending"}`}
                    style={{
                      padding: "12px",
                      background: profile.number
                        ? "rgba(0, 168, 132, 0.1)"
                        : "rgba(255,255,255,0.05)",
                      borderRadius: "8px",
                      color: profile.number
                        ? "var(--wa-accent)"
                        : "var(--wa-text-secondary)",
                      fontSize: "15px",
                      border: profile.number
                        ? "1px solid var(--wa-accent)"
                        : "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontWeight: profile.number ? "600" : "400",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      {profile.number ? (
                        <ShieldCheck size={18} />
                      ) : (
                        <CircleDot size={18} className="pulse" />
                      )}
                      {profile.number || "Pendiente de asignar"}
                    </div>
                    {!profile.number && (
                      <button
                        onClick={handleLinkNumber}
                        style={{
                          background: "var(--wa-accent)",
                          border: "none",
                          borderRadius: "4px",
                          color: "white",
                          padding: "4px 8px",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        Vincular
                      </button>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--wa-text-secondary)",
                      marginTop: 8,
                    }}
                  >
                    {profile.number
                      ? "Este ID es único y verifica tu identidad en Konek Fun."
                      : "Solicita tu número al administrador para activar todas las funciones."}
                  </p>
                </div>

                <div className="input-group">
                  <label>Descripción</label>
                  <input
                    type="text"
                    value={profile.description}
                    onChange={(e) =>
                      setProfile({ ...profile, description: e.target.value })
                    }
                  />
                </div>

                <div className="input-group">
                  <label>Tono de notificación (Personalizado)</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setProfile(prev => ({ ...prev, notification_tone: reader.result }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ background: 'var(--wa-input-bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--wa-border)', width: '100%', color: 'var(--wa-text-primary)' }}
                  />
                  {profile.notification_tone && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button onClick={(e) => {
                        e.preventDefault();
                        const audio = new Audio(profile.notification_tone);
                        audio.play();
                      }} style={{ padding: '6px 12px', background: 'var(--wa-accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: 13 }}>
                        ▶ Reproducir
                      </button>
                      <button onClick={(e) => {
                        e.preventDefault();
                        setProfile({ ...profile, notification_tone: null });
                      }} style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: 13 }}>
                        ⚠️ Quitar
                      </button>
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: "var(--wa-text-secondary)", marginTop: 8, lineHeight: 1.4 }}>
                    Elige un tono mp3/wav en tu dispositivo. Solo se usará de manera local para tus notificaciones.
                  </p>
                </div>

                <button className="save-btn" onClick={saveProfile}>
                  Guardar Cambios
                </button>

                <button
                  onClick={async () => {
                    const shareData = {
                      title: "Konek",
                      text: "¡Únete a Konek y comencemos a chatear! Es la mejor conexión.",
                      url: "https://konek.fun/",
                    };
                    try {
                      if (navigator.share) {
                        await navigator.share(shareData);
                      } else {
                        await navigator.clipboard.writeText(
                          "¡Únete a Konek y comencemos a chatear! https://konek.fun/",
                        );
                        alert("¡Enlace Konek.fun copiado al portapapeles!");
                      }
                    } catch (err) {
                      console.error("Error al compartir:", err);
                    }
                  }}
                  style={{
                    width: "100%",
                    marginTop: "15px",
                    padding: "14px",
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#10b981",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "12px",
                    fontSize: "15px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    transition: "background 0.3s ease",
                  }}
                >
                  <Share2 size={18} />
                  Compartir Konek.fun con amigos
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Editor de Estado de Texto */}
      {
        showTextStatusEditor && (
          <div className="status-editor-overlay" style={{ background: statusBg }}>
            <div className="status-editor-header">
              <button
                className="icon-btn"
                onClick={() => setShowTextStatusEditor(false)}
              >
                <X size={24} color="white" />
              </button>
              <div style={{ display: "flex", gap: 15 }}>
                <button
                  className="icon-btn"
                  onClick={() => {
                    const colors = STATUS_COLORS;
                    const idx = colors.indexOf(statusBg);
                    setStatusBg(colors[(idx + 1) % colors.length]);
                  }}
                >
                  <Palette size={24} color="white" />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => {
                    const fonts = STATUS_FONTS;
                    const idx = fonts.indexOf(statusFont);
                    setStatusFont(fonts[(idx + 1) % fonts.length]);
                  }}
                >
                  <Type size={24} color="white" />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setShowStatusEmoji(!showStatusEmoji)}
                >
                  <Smile size={24} color="white" />
                </button>
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
                      <span
                        key={index}
                        className="emoji-item"
                        onClick={() => {
                          setStatusText((prev) => prev + emoji);
                        }}
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="send-status-btn" onClick={publishTextStatus}>
              <Send size={24} color="white" />
            </button>
          </div>
        )
      }

      {/* Modal Perfil de Contacto */}
      {
        showContactProfile && activeChat && (
          <div
            className="modal-overlay"
            onClick={() => setShowContactProfile(false)}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ background: "#111b21", color: "#e9edef", width: "350px" }}
            >
              <div
                className="modal-header"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
              >
                <h3>Info. del contacto</h3>
                <button
                  onClick={() => setShowContactProfile(false)}
                  className="icon-btn"
                >
                  <X size={24} color="white" />
                </button>
              </div>
              <div
                style={{
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: "150px",
                    height: "150px",
                    borderRadius: "50%",
                    background: "#6a7175",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    marginBottom: "20px",
                  }}
                >
                  {availableUsers.find((u) => u.id === activeChat.id)
                    ?.profile_pic ? (
                    <img
                      src={
                        availableUsers.find((u) => u.id === activeChat.id)
                          .profile_pic
                      }
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <User size={80} color="white" />
                  )}
                </div>
                {editingAlias ? (
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', gap: '8px' }}>
                    <input
                      type="text"
                      value={aliasInput}
                      onChange={(e) => setAliasInput(e.target.value)}
                      placeholder="Apodo local"
                      style={{
                        padding: "8px",
                        borderRadius: "6px",
                        border: "none",
                        outline: "none",
                        background: "#333",
                        color: "white"
                      }}
                      autoFocus
                    />
                    <button onClick={() => handleSaveAlias(activeChat.id, aliasInput)} className="icon-btn" style={{ background: "var(--wa-accent)", color: "white", borderRadius: "50%", padding: "5px" }}>
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingAlias(false)} className="icon-btn" style={{ background: "#444", color: "white", borderRadius: "50%", padding: "5px" }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "5px" }}>
                    <h2
                      style={{
                        fontSize: "24px",
                        fontWeight: "400",
                        margin: 0
                      }}
                    >
                      {contactAliases[activeChat.id] || activeChat.name}
                    </h2>
                    <button
                      onClick={() => {
                        setAliasInput(contactAliases[activeChat.id] || activeChat.name);
                        setEditingAlias(true);
                      }}
                      className="icon-btn"
                      title="Añadir/editar apodo local"
                    >
                      <Pencil size={18} />
                    </button>
                  </div>
                )}
                <div
                  style={{
                    fontSize: "16px",
                    color: "var(--wa-text-secondary)",
                    marginBottom: "20px",
                  }}
                >
                  {availableUsers.find((u) => u.id === activeChat.id)
                    ?.phone_number || "Sin número"}
                </div>
              </div>

              <div
                style={{
                  background: "#202c33",
                  padding: "15px 20px",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "var(--wa-text-secondary)",
                    marginBottom: "5px",
                  }}
                >
                  Info.
                </div>
                <div style={{ fontSize: "16px" }}>
                  {availableUsers.find((u) => u.id === activeChat.id)?.status ||
                    "¡Hola! Estoy usando Konek Fun."}
                </div>
              </div>

              <div
                style={{
                  background: "#202c33",
                  padding: "15px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                <div
                  style={{
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    toggleBlockUser(activeChat);
                    setShowContactProfile(false);
                  }}
                >
                  <ShieldCheck size={20} style={{ marginRight: "15px" }} />
                  {blockedUsers.includes(activeChat.id)
                    ? "Desbloquear contacto"
                    : "Bloquear contacto"}
                </div>
                <div
                  style={{
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    deleteChat(activeChat.id);
                    setShowContactProfile(false);
                  }}
                >
                  <Trash2 size={20} style={{ marginRight: "15px" }} />
                  Vaciar chat
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Visor de Estados */}
      {
        viewingGroup && (
          <div className="status-viewer-overlay">
            <style>{`
            @keyframes fill-progress {
              0% { width: 0%; }
              100% { width: 100%; }
            }
          `}</style>

            <button
              className="icon-btn"
              style={{
                position: "absolute",
                left: 20,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.5)",
                zIndex: 10,
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (currentIdx > 0) setCurrentIdx((prev) => prev - 1);
              }}
            >
              <ChevronLeft size={22} color="white" />
            </button>

            <button
              className="icon-btn"
              style={{
                position: "absolute",
                right: 20,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.5)",
                zIndex: 10,
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (currentIdx < viewingGroup.items.length - 1)
                  setCurrentIdx((prev) => prev + 1);
                else setViewingGroup(null);
              }}
            >
              <ChevronRight size={22} color="white" />
            </button>

            <div className="status-viewer-progress">
              {viewingGroup.items.map((item, idx) => (
                <div key={item.id} className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: idx < currentIdx ? "100%" : "0%",
                      animation:
                        idx === currentIdx
                          ? "fill-progress 5s linear forwards"
                          : "none",
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="status-viewer-header">
              <div className="user-info">
                <div className="avatar-small">
                  {viewingGroup.profile_pic ? (
                    <img src={viewingGroup.profile_pic} />
                  ) : (
                    <User color="white" size={16} />
                  )}
                </div>
                <div style={{ marginLeft: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {viewingGroup.username}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>
                    {viewingGroup.items[currentIdx]?.timestamp
                      ? new Date(
                        viewingGroup.items[currentIdx].timestamp,
                      ).toLocaleString()
                      : "Recientemente"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {viewingGroup.user_id === userId && (
                  <button
                    className="icon-btn"
                    onClick={() =>
                      deleteStatus(viewingGroup.items[currentIdx].id)
                    }
                  >
                    <Trash2 size={20} color="white" />
                  </button>
                )}
                <button
                  className="icon-btn"
                  onClick={() => setViewingGroup(null)}
                >
                  <X size={24} color="white" />
                </button>
              </div>
            </div>

            <div className="status-viewer-content">
              {viewingGroup.items[currentIdx].type === "image" ? (
                <img src={viewingGroup.items[currentIdx].content} />
              ) : (
                <div
                  className="text-status-view"
                  style={{
                    background: JSON.parse(viewingGroup.items[currentIdx].content)
                      .bg,
                    fontFamily: JSON.parse(viewingGroup.items[currentIdx].content)
                      .font,
                  }}
                >
                  {JSON.parse(viewingGroup.items[currentIdx].content).text}
                </div>
              )}
            </div>
          </div>
        )
      }

      {
        fullscreenImage && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0,0,0,0.9)",
              zIndex: 9999,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => setFullscreenImage(null)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
              }}
            >
              <X size={32} />
            </button>
            <img
              src={fullscreenImage}
              alt="Fullscreen preview"
              style={{ maxWidth: "95%", maxHeight: "95%", objectFit: "contain" }}
            />
          </div>
        )
      }

      {showLeaderboard && (
        <div className="modal-overlay" onClick={() => setShowLeaderboard(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 400, background: "#111b21", color: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}><Trophy color="#ffbd69" /> Global Arcade Leaderboard</h2>
              <button className="icon-btn" onClick={() => setShowLeaderboard(false)}><X size={24} /></button>
            </div>

            <div style={{ background: "#202c33", borderRadius: 8, padding: 15, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 14, color: "var(--wa-text-secondary)", textAlign: "center", marginBottom: 10 }}>Los mejores jugadores de Konek Fun!</div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #333", paddingBottom: 5 }}>
                <span style={{ fontWeight: "bold" }}>1. {profile.name}</span>
                <span style={{ color: "var(--wa-accent)", fontWeight: "bold" }}>150 pts</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #333", paddingBottom: 5 }}>
                <span style={{ fontWeight: "bold" }}>2. Usuario 2</span>
                <span style={{ color: "var(--wa-accent)", fontWeight: "bold" }}>120 pts</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #333", paddingBottom: 5 }}>
                <span style={{ fontWeight: "bold" }}>3. Usuario 3</span>
                <span style={{ color: "var(--wa-accent)", fontWeight: "bold" }}>90 pts</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #333", paddingBottom: 5 }}>
                <span style={{ fontWeight: "bold" }}>-. Tú ({profile.name})</span>
                <span style={{ color: "#ffbd69", fontWeight: "bold" }}>150 pts</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedMundoUser && (
        <div className="modal-overlay" onClick={() => setSelectedMundoUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 350, textAlign: 'center', borderRadius: 24, overflow: 'hidden' }}>
            <div style={{ height: 100, background: 'var(--wa-accent)', position: 'relative' }}>
              <button onClick={() => setSelectedMundoUser(null)} className="icon-btn" style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.2)', borderRadius: '50%', color: 'white' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ marginTop: -50, paddingBottom: 24 }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', border: '4px solid var(--wa-panel-bg)', background: '#6a7175', margin: '0 auto', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {selectedMundoUser.profilePic ? (
                  <img src={selectedMundoUser.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={50} color="white" />
                )}
              </div>
              <h3 style={{ marginTop: 16, fontSize: 20, color: 'var(--wa-text-primary)', padding: '0 20px' }}>{selectedMundoUser.displayName}</h3>
              <p style={{ color: 'var(--wa-text-secondary)', fontSize: 14, marginTop: 4, padding: '0 20px' }}>
                {availableUsers.find(u => u.id === selectedMundoUser.userId)?.description || "Usuario de Konek Fun"}
              </p>

              <div style={{ marginTop: 24, padding: '0 24px' }}>
                {availableUsers.find(u => u.id === selectedMundoUser.userId) ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--wa-accent)', fontWeight: 600 }}>
                    <CheckCircle2 size={20} /> Ya son amigos
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      sendFriendRequest(selectedMundoUser.userId, selectedMundoUser.displayName);
                      setSelectedMundoUser(null);
                    }}
                    disabled={mundoFriendReqSent[selectedMundoUser.userId]}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: mundoFriendReqSent[selectedMundoUser.userId] ? '#2a3942' : 'var(--wa-accent)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 12,
                      fontWeight: 600,
                      cursor: mundoFriendReqSent[selectedMundoUser.userId] ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.2s'
                    }}
                  >
                    {mundoFriendReqSent[selectedMundoUser.userId] ? (
                      <>✓ Solicitud enviada</>
                    ) : (
                      <>➕ Agregar como amigo</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
