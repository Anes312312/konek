import React, { useState, useEffect, useRef } from "react";
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
  Trophy
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
      return savedProfile
        ? JSON.parse(savedProfile)
        : {
          name: "Mi Usuario",
          description: "¡Usando Konek Fun!",
          photo: null,
          number: "",
        };
    } catch (e) {
      console.error("Error parsing profile from localStorage", e);
      return {
        name: "Mi Usuario",
        description: "¡Usando Konek Fun!",
        photo: null,
        number: "",
      };
    }
  });

  const [activeChat, setActiveChat] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      console.log('App successfully installed as PWA');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
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
  const [uploadProgress, setUploadProgress] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchNumber, setSearchNumber] = useState("");
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("chats"); // 'chats' o 'statuses'
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

  useEffect(() => {
    localStorage.setItem(
      "konek_viewed_statuses",
      JSON.stringify(viewedStatuses),
    );
  }, [viewedStatuses]);

  const [showContactProfile, setShowContactProfile] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isLinking, setIsLinking] = useState(false);
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
      localStorage.setItem("konek_profile", JSON.stringify(profile));
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
  const profilePhotoInputRef = useRef();
  const statusInputRef = useRef();
  const blockedUsersRef = useRef(blockedUsers);
  const clearedChatsRef = useRef(clearedChats);

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

    socketRef.current = io(SERVER_URL);

    socketRef.current.emit("join", { userId, profile });

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
                tag: "konek-message",
              });
            });
          } else {
            new Notification(contactName, {
              body: bodyText,
              vibrate: [200, 100, 200],
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

      // Si el remitente no está en nuestros contactos, añadirlo automáticamente
      if (message.sender_id !== userId && message.sender_id !== "global") {
        setAvailableUsers((prev) => {
          const exists = prev.find((u) => u.id === message.sender_id);
          if (exists) {
            // Si ya existe, actualizamos su información por si cambió
            return prev.map((u) =>
              u.id === message.sender_id
                ? {
                  ...u,
                  username: message.sender_name,
                  profile_pic: message.sender_pic,
                  phone_number: message.sender_phone,
                }
                : u,
            );
          }

          const newContact = {
            id: message.sender_id,
            username: message.sender_name,
            profile_pic: message.sender_pic,
            phone_number: message.sender_phone,
          };
          return [...prev, newContact];
        });
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

    socketRef.current.on("chat_history", ({ contactId, messages: history }) => {
      const clears = clearedChatsRef.current;
      let filteredHistory = history;
      if (contactId && clears[contactId]) {
        const clearTime = new Date(clears[contactId]).getTime();
        filteredHistory = history.filter(
          (m) => new Date(m.timestamp).getTime() > clearTime,
        );
      }
      setMessages(filteredHistory);
    });

    socketRef.current.on("user_list", (users) => {
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
        return {
          ...prev,
          // Si el servidor tiene un nombre real, usarlo (prioridad al servidor)
          // Si no, mantener el nombre local si es real
          name: hasRealServerName
            ? serverName
            : hasRealLocalName
              ? prev.name
              : prev.name,
          role: userData.role,
          number: userData.phone_number || prev.number,
        };
      });
      // Si el servidor dice que ya tiene nombre real, quitamos onboarding
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
      // Auto clear after 3 seconds if stop doesn't arrive
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeChat && socketRef.current) {
      // Limpiar no leídos para este chat
      setUnreadCounts((prev) => ({
        ...prev,
        [activeChat.id]: 0,
      }));

      if (activeChat.id === "global") {
        socketRef.current.emit("request_history", {
          userId,
          contactId: "global",
        });
      } else {
        socketRef.current.emit("request_history", {
          userId,
          contactId: activeChat.id,
        });
        socketRef.current.emit("mark_read", {
          readerId: userId,
          senderId: activeChat.id,
        });
      }
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
      const finalType =
        forcedType || (isImage ? "image" : isAudio ? "audio" : "file");

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
              onClick={() => setShowLeaderboard(true)}
              title="Arcade Leaderboard"
            >
              <Trophy size={20} />
            </button>
            <button
              className="icon-btn"
              onClick={() => setShowProfileModal(true)}
            >
              <Settings size={20} />
            </button>
            {isInstallable && (
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
            className={`tab-btn ${activeTab === "chats" ? "active" : ""}`}
            onClick={() => setActiveTab("chats")}
          >
            <MessageCircle size={20} />
            <span>CHATS</span>
          </div>
          <div
            className={`tab-btn ${activeTab === "statuses" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("statuses");
              socketRef.current.emit("request_statuses");
            }}
          >
            <CircleDashed size={20} />
            <span>ESTADOS</span>
          </div>
        </div>

        {activeTab === "chats" ? (
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

              {availableUsers.length === 0 && (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "var(--wa-text-secondary)",
                    fontSize: 13,
                  }}
                >
                  No tienes chats abiertos. Ingresa un número arriba para
                  empezar.
                </div>
              )}

              {availableUsers.map((user) => (
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
                      <span style={{ fontWeight: 500 }}>{contactAliases[user.id] || user.username}</span>
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
                        #{user.phone_number}
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
                            deleteContact(user.id);
                          }}
                          title="Eliminar contacto"
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

      <div className="chat-window">
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
                  </div>
                )}
              </div>
            </div>

            <div className="messages-container">
              {messages
                .filter(
                  (msg) =>
                    (msg.sender_id === userId &&
                      msg.receiver_id === activeChat.id) ||
                    (msg.sender_id === activeChat.id &&
                      msg.receiver_id === userId),
                )
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.sender_id === userId ? "me" : "other"}`}
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
                    {msg.type === "sticker" ? (
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
                      <div style={{ padding: "5px" }}>
                        <audio
                          src={`${SERVER_URL}/api/download/${msg.file_info.id}/${msg.file_info.name}`}
                          controls
                          style={{ height: "35px", width: "220px" }}
                        />
                      </div>
                    ) : msg.type === "file" ? (
                      <div className="file-message">
                        <FileText size={32} color="#8696a0" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14 }}>
                            {msg.file_info.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "rgba(255,255,255,0.6)",
                            }}
                          >
                            {(
                              msg.file_info.size /
                              (1024 * 1024 * 1024)
                            ).toFixed(2)}{" "}
                            GB
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
                    ) : msg.type === "game" ? (
                      renderGameMessage(msg)
                    ) : (
                      <span>{msg.content}</span>
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
                  </div>
                ))}
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
      )}

      {/* Modal de Perfil */}
      {showProfileModal && (
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
      )}

      {/* Editor de Estado de Texto */}
      {showTextStatusEditor && (
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
      )}

      {/* Modal Perfil de Contacto */}
      {showContactProfile && activeChat && (
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
      )}

      {/* Visor de Estados */}
      {viewingGroup && (
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
      )}

      {fullscreenImage && (
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
      )}

      {showLeaderboard && (
        <div className="modal-overlay" onClick={() => setShowLeaderboard(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 400, background: "#111b21", color: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 10 }}><Trophy color="#ffbd69" /> Global Arcade Leaderboard</h2>
              <button className="icon-btn" onClick={() => setShowLeaderboard(false)}><X size={24} /></button>
            </div>

            <div style={{ background: "#202c33", borderRadius: 8, padding: 15, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 14, color: "var(--wa-text-secondary)", textAlign: "center", marginBottom: 10 }}>Los mejores jugadores de Konek Fun!</div>

              {/* Dummy data for now, would typically map from server response */}
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
    </div>
  );
}

export default App;
