const path = require('path');
const fs = require('fs-extra');

// Path to store configuration settings
const dataDir = process.env.PERSISTENT_DATA_PATH || __dirname;
const SETTINGS_FILE = path.join(dataDir, 'infra_settings.json');

// Default initial settings
let settings = {
    gitea: { url: '', token: '' },
    pocketbase: { url: '', email: '', password: '' },
    coolify: { url: '', token: '' }
};

// Load settings on startup
try {
    if (fs.pathExistsSync(SETTINGS_FILE)) {
        settings = fs.readJsonSync(SETTINGS_FILE);
    }
} catch (err) {
    console.error('[Infra] Error loading infra settings:', err.message);
}

// Function to save settings
async function saveSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    await fs.writeJson(SETTINGS_FILE, settings, { spaces: 2 });
    return settings;
}

// Helper to check if credentials are provided
function hasCredentials(service) {
    if (service === 'gitea') {
        return settings.gitea.url && settings.gitea.token;
    }
    if (service === 'pocketbase') {
        return settings.pocketbase.url && settings.pocketbase.email && settings.pocketbase.password;
    }
    if (service === 'coolify') {
        return settings.coolify.url && settings.coolify.token;
    }
    return false;
}

// Helper to make fetch requests in a safe way
async function safeFetch(url, options = {}) {
    if (!global.fetch) {
        throw new Error('Native fetch not available in this Node version.');
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (e) {
        clearTimeout(timeoutId);
        throw e;
    }
}

// MOCK DATA GENERATORS
const mockRepos = [
    { id: 1, name: 'konek-fun', full_name: 'admin/konek-fun', html_url: '#', description: 'Plataforma de mensajería de alto rendimiento', language: 'JavaScript', stars_count: 14, forks_count: 2, updated_at: new Date(Date.now() - 3600000 * 2).toISOString(), open_issues_count: 1, size: 84320 },
    { id: 2, name: 'konek-mobile', full_name: 'admin/konek-mobile', html_url: '#', description: 'Cliente móvil oficial en React Native', language: 'TypeScript', stars_count: 8, forks_count: 1, updated_at: new Date(Date.now() - 3600000 * 24).toISOString(), open_issues_count: 0, size: 45210 },
    { id: 3, name: 'konek-docs', full_name: 'admin/konek-docs', html_url: '#', description: 'Documentación técnica de la arquitectura de fragmentación', language: 'Markdown', stars_count: 3, forks_count: 0, updated_at: new Date(Date.now() - 3600000 * 120).toISOString(), open_issues_count: 3, size: 5410 }
];

const mockCollections = [
    { id: 'u1', name: 'users', type: 'base', system: false, schema: [
        { name: 'username', type: 'text', required: true },
        { name: 'phone_number', type: 'text', required: true },
        { name: 'profile_pic', type: 'url', required: false },
        { name: 'role', type: 'text', required: false }
    ], recordCount: 154, created: '2026-01-10T12:00:00Z' },
    { id: 'm1', name: 'messages', type: 'base', system: false, schema: [
        { name: 'sender_id', type: 'relation', required: true },
        { name: 'receiver_id', type: 'relation', required: true },
        { name: 'content', type: 'text', required: false },
        { name: 'message_type', type: 'text', required: true }
    ], recordCount: 18432, created: '2026-01-11T12:00:00Z' },
    { id: 's1', name: 'statuses', type: 'base', system: false, schema: [
        { name: 'user_id', type: 'relation', required: true },
        { name: 'content', type: 'text', required: false },
        { name: 'media_url', type: 'url', required: false }
    ], recordCount: 89, created: '2026-02-01T15:30:00Z' }
];

const mockCoolifyProjects = [
    {
        id: 'p-1',
        name: 'Konek Production',
        description: 'Servicio en la nube principal de konek.fun',
        applications: [
            { id: 'app-1', name: 'konek-backend', status: 'running', fqdn: 'https://konek.fun', ip: '216.24.57.1', last_deployed: new Date(Date.now() - 3600000 * 5).toISOString(), branch: 'main' },
            { id: 'app-2', name: 'konek-frontend', status: 'running', fqdn: 'https://konek.fun', ip: '216.24.57.2', last_deployed: new Date(Date.now() - 3600000 * 5).toISOString(), branch: 'main' }
        ]
    },
    {
        id: 'p-2',
        name: 'Databases & Tools',
        description: 'Bases de datos y servicios auxiliares',
        applications: [
            { id: 'app-3', name: 'pocketbase-db', status: 'running', fqdn: 'https://pb.konek.fun', ip: '216.24.57.3', last_deployed: new Date(Date.now() - 3600000 * 48).toISOString(), branch: 'main' },
            { id: 'app-4', name: 'gitea-server', status: 'running', fqdn: 'https://git.konek.fun', ip: '216.24.57.4', last_deployed: new Date(Date.now() - 3600000 * 96).toISOString(), branch: 'main' }
        ]
    }
];

const mockDeploymentLogs = [
    "🚀 Starting deployment of app-1...",
    "📦 Cloning repository admin/konek-fun (branch: main)...",
    "✓ Repository cloned successfully.",
    "⚙ Preparing environment variables...",
    "🐳 Building Docker image...",
    "➜ Running npm install...",
    "✓ npm install completed. Installed 432 packages.",
    "➜ Running npm run build...",
    "✓ Production bundle generated in dist/.",
    "➜ Starting production server...",
    "🟢 Application running on port 5000.",
    "🚀 Deployment completed successfully! Web service is online."
];

// Controller functions
const infraController = {
    // Get censored settings
    getSettings(req, res) {
        res.json({
            gitea: {
                url: settings.gitea.url,
                hasToken: !!settings.gitea.token
            },
            pocketbase: {
                url: settings.pocketbase.url,
                email: settings.pocketbase.email,
                hasPassword: !!settings.pocketbase.password
            },
            coolify: {
                url: settings.coolify.url,
                hasToken: !!settings.coolify.token
            }
        });
    },

    // Save configuration settings
    async updateSettings(req, res) {
        try {
            const { gitea, pocketbase, coolify } = req.body;
            const updated = {};
            if (gitea) {
                updated.gitea = {
                    url: gitea.url || settings.gitea.url,
                    token: gitea.token !== undefined ? (gitea.token || '') : settings.gitea.token
                };
            }
            if (pocketbase) {
                updated.pocketbase = {
                    url: pocketbase.url || settings.pocketbase.url,
                    email: pocketbase.email || settings.pocketbase.email,
                    password: pocketbase.password !== undefined ? (pocketbase.password || '') : settings.pocketbase.password
                };
            }
            if (coolify) {
                updated.coolify = {
                    url: coolify.url || settings.coolify.url,
                    token: coolify.token !== undefined ? (coolify.token || '') : settings.coolify.token
                };
            }
            const saved = await saveSettings(updated);
            res.json({ success: true, message: 'Configuración guardada.' });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    },

    // Test connection
    async testConnection(req, res) {
        const { service } = req.params;
        try {
            if (!hasCredentials(service)) {
                return res.json({ success: false, isMock: true, message: 'Sin credenciales. Mostrando datos simulados.' });
            }

            if (service === 'gitea') {
                const url = `${settings.gitea.url.replace(/\/$/, '')}/api/v1/user`;
                const response = await safeFetch(url, {
                    headers: { 'Authorization': `token ${settings.gitea.token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    return res.json({ success: true, isMock: false, message: `Conectado como ${data.username || 'usuario Gitea'}` });
                }
                throw new Error(`Código de respuesta: ${response.status}`);
            }

            if (service === 'pocketbase') {
                const url = `${settings.pocketbase.url.replace(/\/$/, '')}/api/collections/users/records?perPage=1`;
                // Intento simple sin admin token para ver si responde, o usando auth endpoint
                const response = await safeFetch(url);
                if (response.ok || response.status === 401 || response.status === 403) {
                    return res.json({ success: true, isMock: false, message: `Servidor de Pocketbase responde en la URL configurada.` });
                }
                throw new Error(`Código de respuesta: ${response.status}`);
            }

            if (service === 'coolify') {
                const url = `${settings.coolify.url.replace(/\/$/, '')}/api/v1/projects`;
                const response = await safeFetch(url, {
                    headers: { 'Authorization': `Bearer ${settings.coolify.token}` }
                });
                if (response.ok) {
                    return res.json({ success: true, isMock: false, message: `Conexión con Coolify API validada correctamente.` });
                }
                throw new Error(`Código de respuesta: ${response.status}`);
            }

            res.status(400).json({ success: false, error: 'Servicio no soportado' });
        } catch (err) {
            res.json({ success: false, isMock: true, error: err.message, message: 'La conexión real falló o no se pudo completar. Se usarán datos de simulación.' });
        }
    },

    // Gitea Repositories List
    async getGiteaRepos(req, res) {
        try {
            if (!hasCredentials('gitea')) {
                return res.json({ success: true, isMock: true, data: mockRepos });
            }
            const url = `${settings.gitea.url.replace(/\/$/, '')}/api/v1/user/repos`;
            const response = await safeFetch(url, {
                headers: { 'Authorization': `token ${settings.gitea.token}` }
            });
            if (response.ok) {
                const data = await response.json();
                return res.json({ success: true, isMock: false, data: data.map(r => ({
                    id: r.id,
                    name: r.name,
                    full_name: r.full_name,
                    html_url: r.html_url,
                    description: r.description || 'Sin descripción',
                    language: r.language || 'Otros',
                    stars_count: r.stars_count || 0,
                    forks_count: r.forks_count || 0,
                    updated_at: r.updated_at,
                    open_issues_count: r.open_issues_count || 0,
                    size: r.size || 0
                })) });
            }
            throw new Error(`Error en Gitea API: ${response.status}`);
        } catch (e) {
            res.json({ success: true, isMock: true, error: e.message, data: mockRepos });
        }
    },

    // Pocketbase Collections List
    async getPocketbaseCollections(req, res) {
        try {
            if (!hasCredentials('pocketbase')) {
                return res.json({ success: true, isMock: true, data: mockCollections });
            }
            
            // Intento de login del admin para conseguir token
            const authUrl = `${settings.pocketbase.url.replace(/\/$/, '')}/api/admins/auth-with-password`;
            const authRes = await safeFetch(authUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identity: settings.pocketbase.email,
                    password: settings.pocketbase.password
                })
            });

            if (!authRes.ok) {
                throw new Error(`Admin Auth falló con código: ${authRes.status}`);
            }
            const authData = await authRes.json();
            const token = authData.token;

            // Conseguir colecciones
            const collectionsUrl = `${settings.pocketbase.url.replace(/\/$/, '')}/api/collections?perPage=50`;
            const collectionsRes = await safeFetch(collectionsUrl, {
                headers: { 'Authorization': `Admin ${token}` }
            });

            if (collectionsRes.ok) {
                const colls = await collectionsRes.json();
                // Enriquecer cada colección con conteo de registros aproximado (ej. pidiendo los primeros records)
                const data = [];
                for (const col of (colls.items || colls)) {
                    let count = 0;
                    try {
                        const countUrl = `${settings.pocketbase.url.replace(/\/$/, '')}/api/collections/${col.name}/records?perPage=1`;
                        const countRes = await safeFetch(countUrl, { headers: { 'Authorization': `Admin ${token}` } });
                        if (countRes.ok) {
                            const countData = await countRes.json();
                            count = countData.totalItems || 0;
                        }
                    } catch (err) { }
                    data.push({
                        id: col.id,
                        name: col.name,
                        type: col.type,
                        schema: col.schema || [],
                        recordCount: count,
                        created: col.created
                    });
                }
                return res.json({ success: true, isMock: false, data });
            }
            throw new Error(`Error en Pocketbase API: ${collectionsRes.status}`);
        } catch (e) {
            res.json({ success: true, isMock: true, error: e.message, data: mockCollections });
        }
    },

    // Coolify Projects & Applications
    async getCoolifyProjects(req, res) {
        try {
            if (!hasCredentials('coolify')) {
                return res.json({ success: true, isMock: true, data: mockCoolifyProjects });
            }
            const url = `${settings.coolify.url.replace(/\/$/, '')}/api/v1/projects`;
            const response = await safeFetch(url, {
                headers: { 'Authorization': `Bearer ${settings.coolify.token}` }
            });
            if (response.ok) {
                const projects = await response.json();
                // Estructurar projects de manera similar a mockCoolifyProjects
                const formatted = projects.map(p => ({
                    id: p.uuid || p.id,
                    name: p.name,
                    description: p.description || 'Proyecto de Coolify',
                    applications: (p.environments || []).flatMap(env => 
                        (env.applications || []).map(app => ({
                            id: app.uuid || app.id,
                            name: app.name,
                            status: app.status || 'unknown',
                            fqdn: app.fqdn || '',
                            ip: app.ip || '',
                            last_deployed: app.updated_at || '',
                            branch: app.git_branch || 'main'
                        }))
                    )
                }));
                return res.json({ success: true, isMock: false, data: formatted });
            }
            throw new Error(`Error en Coolify API: ${response.status}`);
        } catch (e) {
            res.json({ success: true, isMock: true, error: e.message, data: mockCoolifyProjects });
        }
    },

    // Coolify Deploy trigger
    async deployCoolifyApp(req, res) {
        const { appId } = req.body;
        try {
            if (!hasCredentials('coolify') || appId.startsWith('app-')) {
                // Simulación de despliegue con logs progresivos en el cliente
                return res.json({
                    success: true,
                    isMock: true,
                    message: 'Despliegue simulado iniciado.',
                    logs: mockDeploymentLogs
                });
            }
            const url = `${settings.coolify.url.replace(/\/$/, '')}/api/v1/deploy`;
            const response = await safeFetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.coolify.token}`
                },
                body: JSON.stringify({ uuid: appId, force: true })
            });
            if (response.ok) {
                return res.json({
                    success: true,
                    isMock: false,
                    message: 'Despliegue de aplicación iniciado con éxito en Coolify.',
                    logs: [
                        "🚀 Deployment request sent to Coolify for App UUID: " + appId,
                        "🟢 API responded with status 200 OK.",
                        "➜ Check Coolify dashboard for real-time compilation logs."
                    ]
                });
            }
            throw new Error(`Error al iniciar despliegue: ${response.status}`);
        } catch (e) {
            res.json({
                success: true,
                isMock: true,
                error: e.message,
                message: 'Iniciado en modo de simulación debido a error de conexión.',
                logs: mockDeploymentLogs
            });
        }
    }
};

module.exports = infraController;
