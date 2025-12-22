import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  MessageCircle, Plus, Wrench, Building2, LogOut, Send, CheckCircle, 
  XCircle, Star, Upload, FileText, CreditCard, User, Eye, Download, Calendar, Video, Shield, Settings,
  AlertCircle, ChevronRight, DollarSign, Briefcase, Moon, Sun, Lock, HelpCircle, Wifi, WifiOff,
  MapPin, Clock, Search, Filter, ThumbsUp, Edit3, Flag, MoreHorizontal, CheckSquare, Bell, Wallet, Trash2, Save, Camera, Chrome as GoogleIcon, Github as GithubIcon,
  BrainCircuit, Activity, TrendingUp, Zap, Server, AlertTriangle, Bot, Paperclip, Minimize2, Maximize2, Map, Layers, Crosshair, Play, Pause, RotateCw, Box,
  Phone, UploadCloud, XOctagon, Layout, Globe, ShieldOff, MessageSquare,
  Crown, History,
  BookOpen, Key, MessageCircle as WhatsAppIcon, ChevronDown, Share2, Link
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, doc, updateDoc, 
  setDoc, getDoc, deleteDoc, where, getDocs
} from 'firebase/firestore';

// --- Firebase Config & Init ---
let app, auth, db;
try {
    const configStr = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
    const firebaseConfig = JSON.parse(configStr);
    
    // Initialize only if config is present, otherwise handles gracefully
    if (Object.keys(firebaseConfig).length > 0) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } else {
        console.warn("Firebase config not found. App running in UI-only mode.");
    }
} catch (e) {
    console.error("Firebase init failed", e);
}

const getAppId = () => {
    if (typeof __app_id !== 'undefined' && __app_id) return String(__app_id);
    return 'default-repair-app';
};
const appId = getAppId();

const COLLECTIONS = {
    USERS: 'users',
    REQUESTS: 'requests',
    OFFERS: 'offers',
    CONTRACTS: 'contracts',
    MESSAGES: 'messages',
    NOTIFICATIONS: 'notifications',
    REVIEWS: 'reviews',
    MACHINES: 'machines'
};

// --- Helper: Clean Undefined Values ---
const cleanData = (data) => {
    const cleaned = {};
    Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
            cleaned[key] = null;
        } else {
            cleaned[key] = data[key];
        }
    });
    return cleaned;
};

// --- Helper: Get Online Status ---
const getOnlineStatus = (lastLogin) => {
  if (!lastLogin) return 'offline';
  const diff = new Date() - new Date(lastLogin);
  return diff < 5 * 60 * 1000 ? 'online' : 'offline'; // 5 minutes threshold
};

// --- Account Definitions ---
const defineManagerAccount = () => ({
    email: 'Repairhub@gmail.com',
    name: 'Manager Akram',
    type: 'admin',
    balance: 1000000,
    rating: 5.0,
    reviews: 99,
    verified: true,
    createdAt: new Date().toISOString(),
    profilePicture: '🛡️',
    bio: 'System Administrator & Platform Manager',
    location: 'Headquarters - Admin Office',
    lastLogin: new Date().toISOString()
});

const defineCompanyAccount = (email, name) => ({
    email: email,
    name: name,
    type: 'company',
    balance: 5000, 
    rating: 5.0,
    reviews: 0,
    verified: false,
    createdAt: new Date().toISOString(),
    profilePicture: '🏢',
    bio: `New Company on RepairHub`,
    location: 'Not specified',
    lastLogin: new Date().toISOString()
});

const defineEngineerAccount = (email, name) => ({
    email: email,
    name: name,
    type: 'engineer',
    balance: 0,
    rating: 5.0,
    reviews: 0,
    verified: false,
    createdAt: new Date().toISOString(),
    profilePicture: '👨‍🔧',
    bio: `New Engineer on RepairHub`,
    location: 'Not specified',
    specialties: ['CNC Machine', 'Hydraulic Press', 'Robotic Arm', 'Manufacturing'],
    lastLogin: new Date().toISOString()
});

// --- SUB COMPONENTS ---

// 1. Navbar Button Component
const PremiumButton = ({ onClick }) => (
  <button 
    onClick={onClick}
    className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition"
  >
    <Crown className="w-4 h-4 fill-white" />
    <span>Get Premium</span>
  </button>
);

// 2. Pricing Modal Component
const PricingModal = ({ onClose, onUpgrade, darkMode }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
    <div className={`w-full max-w-4xl p-8 rounded-3xl shadow-2xl relative ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
        <XCircle className="w-6 h-6" />
      </button>

      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <Crown className="w-8 h-8 text-yellow-500 fill-yellow-500" /> 
          Upgrade Your Workflow
        </h2>
        <p className="text-gray-500">Unlock advanced IoT capabilities and professional support.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tier 1 */}
        <div className={`p-6 rounded-2xl border-2 transition hover:border-blue-500 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Premium</h3>
            <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Starter</span>
          </div>
          <div className="text-4xl font-bold mb-6">$29<span className="text-sm font-normal text-gray-400">/mo</span></div>
          <ul className="space-y-3 mb-8 text-sm">
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Link Existing IoT Sensors</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Advanced Analytics Dashboard</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Priority Support</li>
          </ul>
          <button onClick={() => onUpgrade('premium')} className="w-full py-3 rounded-xl font-bold border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition">Select Premium</button>
        </div>

        {/* Tier 2 */}
        <div className="p-6 rounded-2xl border-2 border-yellow-400 bg-gradient-to-b from-yellow-50/50 to-transparent dark:from-yellow-900/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Premium Plus</h3>
            <Crown className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-4xl font-bold mb-6">$99<span className="text-sm font-normal text-gray-400">/mo</span></div>
          <ul className="space-y-3 mb-8 text-sm">
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> <b>Everything in Premium</b></li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Professional IoT Installation</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Unlimited AI Chatbot Files</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Dedicated Account Manager</li>
          </ul>
          <button onClick={() => onUpgrade('premium_plus')} className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg hover:shadow-xl transition">Go Professional</button>
        </div>
      </div>
    </div>
  </div>
);

// 3. Admin Activity Monitor Component
const AdminActivityMonitor = ({ users, requests, darkMode }) => {
  // Derive Recent Activity Log from Requests
  const activityLog = requests
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map(req => ({
      id: req.id,
      text: `${req.companyName || 'Unknown Company'} posted a job: ${req.machine}`,
      time: req.createdAt
    }));

  return (
    <div className="grid lg:grid-cols-3 gap-6 mb-8">
      {/* User Activity Table */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-blue-600"/> Live Activity Monitor</h3>
          <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full animate-pulse">System Online</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500">
              <tr>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {Object.values(users).slice(0, 5).map(u => {
                // Determine online status based on lastLogin
                const diff = new Date() - new Date(u.lastLogin || 0);
                const isOnline = diff < 5 * 60 * 1000;
                return (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="p-3 font-medium">{u.name}</td>
                    <td className="p-3 capitalize text-gray-500">{u.type}</td>
                    <td className="p-3 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {isOnline ? 'Active' : 'Offline'}
                      </div>
                    </td>
                    <td className="p-3 text-right text-gray-400 font-mono text-xs">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent History Log */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700 font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-purple-600"/> System Logs
        </div>
        <div className="p-4 space-y-4">
          {activityLog.length > 0 ? activityLog.map(log => (
            <div key={log.id} className="flex gap-3 items-start">
              <div className="mt-1 w-2 h-2 rounded-full bg-blue-400 shrink-0"></div>
              <div>
                <p className="text-sm font-medium leading-snug">{log.text}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(log.time).toLocaleString()}</p>
              </div>
            </div>
          )) : (
            <div className="text-center text-gray-400 text-sm py-4">No recent logs found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

// FEATURE 5: GEOLOCATION MAP COMPONENT
function GeoMap({ requests, users, currentUser, onRequestClick, onProfileClick, darkMode }) {
    const [filter, setFilter] = useState('all'); // all, requests, engineers
    const [scan, setScan] = useState(false);

    // Generate simulated coordinates for demo purposes based on IDs
    const getCoords = (str) => {
        // Simple hash to get pseudo-random coordinates within the grid
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        const x = Math.abs(hash % 80) + 10; // Margin from edges
        const y = Math.abs((hash >> 16) % 80) + 10;
        return { x, y };
    };

    return (
        <div className="animate-fade-in h-[calc(100vh-200px)] rounded-2xl overflow-hidden shadow-xl border dark:border-gray-700 bg-gray-100 dark:bg-gray-900 relative group">
            {/* Map Controls */}
            <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg z-10 flex flex-col gap-2">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition" title="Re-center"><Crosshair className="w-5 h-5 text-blue-500" onClick={() => setScan(true)}/></button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition" title="Layers"><Layers className="w-5 h-5 text-gray-500"/></button>
            </div>

            {/* Enhanced Legend & Filters */}
            <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-4 rounded-xl shadow-2xl z-10 text-xs font-bold space-y-3 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2 text-gray-500 uppercase tracking-wider">Map Layers</div>
                <button onClick={() => setFilter('all')} className={`flex items-center gap-2 w-full p-1 rounded ${filter === 'all' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}>
                    <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white dark:border-gray-900 shadow"></div> 
                    <span>My Location</span>
                </button>
                <button onClick={() => setFilter(filter === 'requests' ? 'all' : 'requests')} className={`flex items-center gap-2 w-full p-1 rounded ${filter === 'requests' ? 'bg-red-50 dark:bg-red-900/30' : ''}`}>
                    <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 shadow"></div> 
                    <span>Open Requests ({requests.length})</span>
                </button>
                <button onClick={() => setFilter(filter === 'engineers' ? 'all' : 'engineers')} className={`flex items-center gap-2 w-full p-1 rounded ${filter === 'engineers' ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
                    <div className="w-3 h-3 bg-indigo-500 rounded-full border-2 border-white dark:border-gray-900 shadow"></div> 
                    <span>Available Engineers ({users.length})</span>
                </button>
            </div>

            {/* SVG Map */}
            <svg className="w-full h-full bg-[#e5e7eb] dark:bg-[#1f2937] pattern-grid-lg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="0.5"/>
                    </pattern>
                    <radialGradient id="pulse" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0%" stopColor="rgba(37,99,235,0.2)" />
                        <stop offset="100%" stopColor="rgba(37,99,235,0)" />
                    </radialGradient>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />

                {/* Radar Scan Effect */}
                {scan && (
                    <circle cx="50" cy="50" r="0" fill="none" stroke="rgba(37,99,235,0.5)" strokeWidth="0.5">
                        <animate attributeName="r" from="0" to="50" dur="2s" repeatCount="1" onEnd={() => setScan(false)} />
                        <animate attributeName="opacity" from="1" to="0" dur="2s" repeatCount="1" />
                    </circle>
                )}

                {/* Distance Rings */}
                <circle cx="50" cy="50" r="15" fill="none" stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} strokeDasharray="2" strokeWidth="0.2" />
                <circle cx="50" cy="50" r="30" fill="none" stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} strokeDasharray="2" strokeWidth="0.2" />

                {/* User Pin (Pulse Effect) */}
                <circle cx="50" cy="50" r="4" fill="url(#pulse)" className="animate-pulse" />
                <circle cx="50" cy="50" r="1.5" fill="#2563eb" stroke="white" strokeWidth="0.5" />

                {/* Requests Pins */}
                {(filter === 'all' || filter === 'requests') && requests.map(req => {
                    const coords = getCoords(req.id + req.machine); 
                    return (
                        <g key={req.id} onClick={() => onRequestClick(req.id)} className="cursor-pointer hover:opacity-80 transition group/pin">
                            <circle cx={coords.x} cy={coords.y} r="2" fill="#ef4444" stroke="white" strokeWidth="0.3" className="drop-shadow-md"/>
                            <text x={coords.x} y={coords.y - 3.5} textAnchor="middle" fontSize="2.5" fill="white" fontWeight="bold" className="opacity-0 group-hover/pin:opacity-100 transition-opacity select-none pointer-events-none drop-shadow-md" style={{textShadow: '0px 1px 2px rgba(0,0,0,0.8)'}}>
                                {req.machine.substring(0, 10)}
                            </text>
                        </g>
                    );
                })}

                {/* Engineers Pins */}
                {(filter === 'all' || filter === 'engineers') && users.map(u => {
                    const coords = getCoords(u.id + u.name);
                    return (
                        <g key={u.id} onClick={() => onProfileClick(u)} className="cursor-pointer hover:opacity-80 transition group/pin">
                            <circle cx={coords.x} cy={coords.y} r="2" fill="#6366f1" stroke="white" strokeWidth="0.3" className="drop-shadow-md"/>
                            <text x={coords.x} y={coords.y - 3.5} textAnchor="middle" fontSize="2.5" fill="white" fontWeight="bold" className="opacity-0 group-hover/pin:opacity-100 transition-opacity select-none pointer-events-none" style={{textShadow: '0px 1px 2px rgba(0,0,0,0.8)'}}>
                                {u.name.split(' ')[0]}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

// FEATURE 4: CONTEXTUAL AI ASSISTANT COMPONENT
function AIContextAssistant({ user, machines, onClose, darkMode }) {
    const [messages, setMessages] = useState([
        { role: 'model', text: `Hello ${user?.name || 'Engineer'}. I am your dedicated technical assistant. I have access to your company's equipment registry. How can I help you today?` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [attachedFile, setAttachedFile] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Basic check for text files
            if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.log')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    setAttachedFile({ name: file.name, content: ev.target.result });
                };
                reader.readAsText(file);
            } else {
                alert("For this demo, please upload text-based files (.txt, .md, .log, .json).");
            }
        }
    };

    const handleSend = async () => {
        if (!input.trim() && !attachedFile) return;
        const newUserMsg = { role: 'user', text: input, attachment: attachedFile ? attachedFile.name : null };
        setMessages(prev => [...prev, newUserMsg]);
        setInput('');
        setLoading(true);

        const apiKey = ""; 
        
        // Construct Context-Aware Prompt
        const machineContext = machines.map(m => `- ${m.name} (${m.type}), Status: ${m.status}, Loc: ${m.location}`).join('\n');
        
        let fullPrompt = `System: You are an expert industrial maintenance assistant for ${user.name}. 
        You have access to the following equipment registry for this company:
        ${machineContext}
        
        Instructions: Answer the user's question based on the equipment list above. If they ask about a specific machine, check its status and location.
        `;

        if (attachedFile) {
            fullPrompt += `\n\nUser also uploaded a file named "${attachedFile.name}" with the following content:\n${attachedFile.content}\n\nAnalyze this file content to answer the user request.`;
        }

        fullPrompt += `\n\nUser Question: ${input}`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
            });
            const data = await response.json();
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble connecting to the knowledge base.";
            setMessages(prev => [...prev, { role: 'model', text: aiText }]);
            setAttachedFile(null); // Clear attachment after sending
        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: "Error: Unable to process request." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl hover:scale-105 transition-all flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden z-40 animate-fade-in-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5"/>
                    <span className="font-bold">Technical Assistant</span>
                </div>
                <button onClick={onClose} className="hover:bg-white/20 p-1 rounded">
                    <Minimize2 className="w-4 h-4"/>
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-tl-none'}`}>
                            {m.attachment && (
                                <div className="flex items-center gap-1 text-xs opacity-70 mb-1 border-b border-white/20 pb-1">
                                    <Paperclip className="w-3 h-3"/> Attached: {m.attachment}
                                </div>
                            )}
                            {m.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none border dark:border-gray-700 flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                {attachedFile && (
                    <div className="flex items-center justify-between text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded">
                        <span className="flex items-center gap-1 truncate max-w-[200px]"><Paperclip className="w-3 h-3"/> {attachedFile.name}</span>
                        <button onClick={() => setAttachedFile(null)} className="hover:text-red-500"><XCircle className="w-4 h-4"/></button>
                    </div>
                )}
                <div className="flex gap-2">
                    <button 
                        onClick={() => fileInputRef.current.click()}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                        title="Upload Manual/Log"
                    >
                        <Paperclip className="w-5 h-5"/>
                    </button>
                    <input 
                        className="flex-1 bg-transparent outline-none text-sm" 
                        placeholder="Ask about your equipment..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={loading}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        <Send className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        </div>
    );
}

function IoTDashboard({ user, notifyUser, postData, darkMode }) {
    const [machines, setMachines] = useState([
        { id: 1, name: 'CNC Lathe X200', type: 'CNC Machine', temp: 65, vibe: 2.1, status: 'Normal' },
        { id: 2, name: 'Hydraulic Press HP5', type: 'Hydraulic Press', temp: 42, vibe: 0.8, status: 'Normal' },
        { id: 3, name: 'Cooling Unit 09', type: 'HVAC', temp: 18, vibe: 1.2, status: 'Normal' }
    ]);
    const [selectedId, setSelectedId] = useState(1);
    const [history, setHistory] = useState([]);
    const [mode, setMode] = useState('Normal'); 
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setMachines(prev => prev.map(m => {
                if (m.id !== selectedId) return m;

                let noiseTemp = (Math.random() - 0.5) * 2;
                let noiseVibe = (Math.random() - 0.5) * 0.2;
                let newTemp = m.temp + noiseTemp;
                let newVibe = m.vibe + noiseVibe;

                if (mode === 'Warning') { newTemp += 0.5; newVibe += 0.05; }
                if (mode === 'Critical') { newTemp += 1.5; newVibe += 0.2; }
                if (mode === 'Normal') { 
                    if(newTemp > 65) newTemp -= 0.5; 
                    if(newTemp < 60) newTemp += 0.5;
                }

                return { ...m, temp: Math.max(0, newTemp), vibe: Math.max(0, newVibe) };
            }));

            const active = machines.find(m => m.id === selectedId);
            if(active) {
                setHistory(prev => {
                    const next = [...prev, { time: new Date().toLocaleTimeString(), temp: active.temp, vibe: active.vibe }];
                    if (next.length > 20) next.shift(); 
                    return next;
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [selectedId, mode, machines]);

    const activeMachine = machines.find(m => m.id === selectedId);

    const runAIWatchdog = async () => {
        setAnalyzing(true);
        const prompt = `Analyze this sensor data stream for ${activeMachine.name}.
        Recent Readings (Temp C, Vibration Hz): ${JSON.stringify(history.map(h => ({t: Math.round(h.temp), v: h.vibe.toFixed(2)})))}
        Operating Mode: ${mode}
        
        Return JSON: { "status": "Normal"|"Warning"|"Critical", "health_score": 0-100, "advice": "string", "urgent_action": boolean }`;

        try {
            const apiKey = ""; 
             const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
            });
            const data = await response.json();
            const res = JSON.parse(data.candidates[0].content.parts[0].text);
            setAiAnalysis(res);
            
            if (res.urgent_action) {
                const newReq = {
                    machine: activeMachine.name,
                    machineType: activeMachine.type,
                    issue: `[AI DETECTED FAILURE] ${res.advice}`,
                    budget: 500, 
                    location: user.location || 'Headquarters',
                    contactId: user.id,
                    companyName: user.name,
                    status: 'active',
                    isAutomated: true,
                    priority: 'Critical',
                    sensorLogs: history.slice(-5) 
                };
                
                const reqId = await postData(COLLECTIONS.REQUESTS, newReq);
                notifyUser(user.id, `CRITICAL ALERT: ${activeMachine.name} failure detected. Maintenance request #${reqId.slice(0,6)} auto-generated.`, 'error', reqId);
                alert("Automated Maintenance Request dispatched to marketplace!");
            }
        } catch (e) { console.error(e); } finally { setAnalyzing(false); }
    };

    return (
        <div className="animate-fade-in max-w-6xl mx-auto">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-6 leading-tight">
                        IoT Dashboard
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full uppercase tracking-wider ml-2">Premium Feature</span>
                    </h1>
                    <p className="text-lg text-gray-400 mb-4 max-w-lg mx-auto md:mx-0">
                        Real-time monitoring and AI diagnostics for your machines.
                    </p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> Live Sensor Data</div>
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> AI Anomaly Detection</div>
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> Predictive Maintenance Alerts</div>
                    </div>
                </div>
                <div className="flex-shrink-0">
                    <button onClick={runAIWatchdog} disabled={analyzing} className="px-4 py-2 rounded-xl font-bold text-white transition-all flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 transform active:scale-95">
                        {analyzing ? 'Scanning...' : 'Run AI Diagnostics'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {machines.map(m => (
                        <div key={m.id} onClick={() => { setSelectedId(m.id); setHistory([]); setAiAnalysis(null); }} className={`p-4 rounded-xl border cursor-pointer transition hover:scale-105 ${selectedId === m.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                            <div>
                                <div className="font-bold text-lg">{m.name}</div>
                                <div className="text-sm text-gray-500">{m.type}</div>
                            </div>
                            <div className="mt-4 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1">
                                    <div className={`w-3 h-3 rounded-full ${m.temp > 90 ? 'bg-red-500 animate-ping' : 'bg-green-400'}`}></div>
                                    <span>{m.temp}°C</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className={`w-3 h-3 rounded-full ${m.vibe > 5 ? 'bg-red-500 animate-ping' : 'bg-blue-400'}`}></div>
                                    <span>{m.vibe}Hz</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Feature 5: AI Analysis Result Card */}
            {aiAnalysis && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8">
                    <h3 className="font-bold text-lg mb-4">AI Diagnostic Result</h3>
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-gray-500">Machine: {activeMachine.name}</div>
                        <div className={`text-xs font-bold rounded-full px-3 py-1 ${aiAnalysis.status === 'Normal' ? 'bg-green-100 text-green-700' : aiAnalysis.status === 'Warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {aiAnalysis.status}
                        </div>
                    </div>
                    <div className="text-sm text-gray-700 mb-4">{aiAnalysis.advice}</div>
                    <div className="flex gap-2">
                        <button onClick={runAIWatchdog} disabled={analyzing} className="flex-1 px-4 py-2 rounded-xl font-bold text-white transition-all flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 transform active:scale-95">
                            {analyzing ? 'Scanning...' : 'Re-run Diagnostics'}
                        </button>
                        {aiAnalysis.urgent_action && (
                            <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4"/> Urgent Action Required
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// FEATURE 1 SUB-COMPONENT: MACHINE SIMULATION VISUALIZER
function MachineSimulation({ component, mode, darkMode }) {
    const [exploded, setExploded] = useState(false);
    const [playing, setPlaying] = useState(true);

    // Determine animation class based on failure mode
    const getAnimationClass = () => {
        if (!playing) return '';
        if (mode?.toLowerCase().includes('heat')) return 'animate-pulse text-red-500 fill-red-500/20';
        if (mode?.toLowerCase().includes('vibration')) return 'animate-bounce text-orange-500';
        if (mode?.toLowerCase().includes('fracture')) return 'opacity-50 text-gray-500';
        return 'text-blue-500';
    };

    return (
        <div className="bg-black/90 rounded-2xl overflow-hidden shadow-2xl relative aspect-video group">
            {/* Overlay UI */}
            <div className="absolute top-4 left-4 z-20">
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">LIVE SIMULATION</span>
            </div>
            
            <div className="absolute bottom-4 left-4 z-20 flex gap-2">
                <button onClick={() => setPlaying(!playing)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur">
                    {playing ? <Pause className="w-5 h-5"/> : <Play className="w-5 h-5"/>}
                </button>
                <button onClick={() => setExploded(!exploded)} className={`px-3 py-2 text-sm font-bold text-white rounded-lg backdrop-blur transition ${exploded ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'}`}>
                    {exploded ? 'Collapse View' : 'Explode View'}
                </button>
            </div>

            <div className="absolute bottom-4 right-4 z-20 text-right">
                <div className="text-xs text-gray-400 font-bold uppercase">Component</div>
                <div className="text-xl font-bold text-white">{component || 'Unknown Part'}</div>
                <div className="text-xs text-red-400 font-bold uppercase mt-1">{mode || 'General Failure'}</div>
            </div>

            {/* The "Simulation" Canvas - SVG Animation */}
            <div className="w-full h-full flex items-center justify-center relative">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                
                {/* Simulated 3D Object (SVG) */}
                <svg viewBox="0 0 200 200" className="w-64 h-64 drop-shadow-2xl transition-all duration-1000">
                    <g transform={`translate(100,100) scale(${exploded ? 0.8 : 1})`}>
                        {/* Housing */}
                        <rect x="-60" y="-60" width="120" height="120" rx="10" fill="none" stroke="currentColor" strokeWidth="2" className={`text-gray-500 transition-all duration-700 ${exploded ? '-translate-y-12 opacity-50' : ''}`} />
                        
                        {/* Core Component (The Failing Part) */}
                        <circle cx="0" cy="0" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="10 5" className={`transition-all duration-300 ${getAnimationClass()}`}>
                            {playing && !mode?.includes('vibration') && (
                                <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="2s" repeatCount="indefinite" />
                            )}
                        </circle>
                        
                        {/* Shaft / Internal */}
                        <circle cx="0" cy="0" r="15" fill="currentColor" className={`text-gray-300 transition-all duration-700 ${exploded ? 'translate-y-12' : ''}`} />
                        
                        {/* Heat Waves if Overheating */}
                        {mode?.toLowerCase().includes('heat') && playing && (
                            <>
                                <path d="M -20 -50 Q 0 -80 20 -50" fill="none" stroke="red" strokeWidth="2" opacity="0.5">
                                    <animate attributeName="d" values="M -20 -50 Q 0 -80 20 -50; M -25 -60 Q 0 -90 25 -60; M -20 -50 Q 0 -80 20 -50" dur="1s" repeatCount="indefinite" />
                                </path>
                            </>
                        )}
                    </g>
                </svg>
            </div>
        </div>
    )
}



function RequestDetail({ request, offers, contracts, currentUser, onBack, onOffer, onContract, onViewContract, users, darkMode }) {
    if (!request) return null;
    return (
        <div className="animate-slide-in">
            <button onClick={onBack} className="mb-6 text-gray-500 hover:text-blue-600 flex items-center gap-1 transition"><ChevronRight className="w-4 h-4 rotate-180"/> Back to Market</button>
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        {request.isAutomated && (
                            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl">
                                <h4 className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold uppercase text-xs tracking-wider mb-1"><BrainCircuit className="w-4 h-4"/> AI Auto-Dispatch</h4>
                                <p className="text-red-800 dark:text-red-200 font-medium text-sm">This request was automatically generated by the IoT Sentinel system due to critical sensor anomalies.</p>
                            </div>
                        )}
                        <div className="flex justify-between mb-6">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">{String(request.machine)}</h1>
                                <div className="flex items-center gap-2 text-gray-500"><Building2 className="w-4 h-4"/> {String(request.companyName)} <MapPin className="w-4 h-4 ml-2"/> {String(request.location || 'N/A')}</div>
                            </div>
                            
                            <div className="text-right flex flex-col items-end gap-2">
                                <div>
                                    <p className="text-4xl font-bold text-green-600">${String(request.budget)}</p>
                                    <p className="text-gray-400 text-sm">Target Budget</p>
                                </div>
                                {/* Feature 17: 3D Simulation Button */}
                                {['CNC Machine', 'Robotic Arm'].includes(request.machineType) && (
                                    <button className="flex items-center gap-2 text-blue-600 font-bold border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50">
                                        <Box className="w-4 h-4"/> View 3D Simulation
                                    </button>
                                )}
                                {/* Feature 12: Rate Engineer Button (Snippet) */}
                                {request.status === 'Completed' && currentUser.id === request.contactId && (
                                    <button onClick={() => alert("Rating modal would open here (Feature 12)")} className="bg-yellow-500 text-white px-4 py-2 rounded shadow text-sm font-bold">
                                         Rate Engineer
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between mb-8 px-4 relative">
                            <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-200 -z-10"></div>
                            {['Active', 'In Progress', 'Completed'].map((step, i) => (
                                <div key={step} className={`flex flex-col items-center bg-white dark:bg-gray-800 px-2 ${request.status === step ? 'scale-110' : 'opacity-50'}`}>
                                    <div className={`w-4 h-4 rounded-full mb-1 ${request.status === step || (request.status === 'Completed') ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    <span className="text-xs font-bold">{step}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border dark:border-gray-700 mb-8"><p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{String(request.issue)}</p></div>
                        
                        {request.sensorLogs && (
                            <div className="mb-8">
                                <h3 className="font-bold text-sm uppercase text-gray-500 mb-3">Black Box Sensor Logs</h3>
                                <div className="bg-black text-green-400 p-4 rounded-xl font-mono text-xs overflow-x-auto">
                                    {request.sensorLogs.map((log, i) => (
                                        <div key={i} className="flex gap-4 border-b border-green-900/30 py-1 last:border-0">
                                            <span className="opacity-50">{log.time}</span>
                                            <span>Temp: {log.temp.toFixed(1)}°C</span>
                                            <span>Vibe: {log.vibe.toFixed(2)}Hz</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentUser.type === 'engineer' && <button onClick={onOffer} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 transform active:scale-95">Submit Professional Offer</button>}
                    </div>

                    <div>
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">Offers <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-sm">{offers.length}</span></h3>
                        <div className="space-y-4">
                            {offers.map(o => {
                                 const contract = contracts.find(c => c.offerId === o.id);
                                 return (
                                    <div key={o.id} className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4`}>
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-xl shrink-0">{o.engineerPic || '👨‍🔧'}</div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-lg">{String(o.engineerName)}</span>
                                                    <span className="text-green-600 font-bold bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded text-sm">${String(o.price)}</span>
                                                    {currentUser.id === o.engineerId && (
                                                        <button onClick={() => alert("Edit Offer Mode Activated")} className="text-xs text-blue-500 hover:underline ml-2">
                                                            <Edit3 className="w-3 h-3 inline"/> Edit
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{String(o.description)}</p>
                                                {o.startDate && <div className="text-xs text-blue-500 mt-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Start: {String(o.startDate)}</div>}
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex sm:flex-col gap-2">
                                            {currentUser.type === 'engineer' && contract && <button onClick={(e) => {e.stopPropagation(); onViewContract(contract)}} className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium">View Contract</button>}
                                            {currentUser.id === request.contactId && !contract && (
                                                <button 
                                                    onClick={() => onContract(o.id)} 
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition"
                                                >
                                                    Draft Contract
                                                </button>
                                            )}
                                            {currentUser.id === request.contactId && contract && <button onClick={(e) => {e.stopPropagation(); onViewContract(contract)}} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">Contract Active</button>}
                                        </div>
                                    </div>
                                 )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatusBadge({ status }) {
    let color = "bg-gray-100 text-gray-600";
    if (status === 'active') color = "bg-blue-100 text-blue-700";
    if (status === 'In Progress') color = "bg-yellow-100 text-yellow-700";
    if (status === 'Completed') color = "bg-green-100 text-green-700";
    
    return <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${color}`}>{status || 'Pending'}</span>
}

function AdminPanel({ users, requests, contracts, onBack, onBan, verifyUser, onReleaseFunds, darkMode }) {
    // Feature 19: Ban Logic (Soft Ban)
    const handleBan = (uid, currentStatus) => {
       const confirmMsg = currentStatus === 'banned' ? "Unban this user?" : "Soft ban this user?";
       // Note: The parent onBan prop in App should handle the actual DB update
       if(window.confirm(confirmMsg)) onBan(uid); 
    };

    // Feature 20: Revoke Logic
    const toggleVerification = (uid, isVerified) => {
        if(isVerified) {
             // Logic to revoke (Requires updateDoc passed from parent or direct DB access here)
             // Using verifyUser with false to revoke
             verifyUser(uid, false); 
        } else {
             verifyUser(uid, true);
        }
    };

    return (
        <div className="animate-fade-in">
             <button onClick={onBack} className="mb-6 text-blue-500 flex items-center gap-1 hover:underline"><ChevronRight className="w-4 h-4 rotate-180"/> Exit Admin</button>
             <h1 className="text-3xl font-bold mb-6">Super Admin Control</h1>
             
             {/* NEW: Admin Activity Monitor */}
             <AdminActivityMonitor users={users} requests={requests} darkMode={darkMode} />

             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs uppercase text-gray-500 font-semibold">
                            <tr><th className="p-4">User</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {Object.values(users).map(u => (
                                <tr key={u.id} className={u.status === 'banned' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">{u.profilePicture}</div>
                                        <div><div className="font-bold">{u.name}</div><div className="text-xs text-gray-500">{u.email}</div></div>
                                    </td>
                                    <td className="p-4">
                                        {u.status === 'banned' ? <span className="text-red-600 font-bold text-xs uppercase"><XOctagon className="w-3 h-3 inline"/> Banned</span> : <span className="text-green-600 font-bold text-xs uppercase">Active</span>}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* Feature 20: Revoke Button */}
                                            <button onClick={() => toggleVerification(u.id, u.verified)} className={`p-2 rounded-lg ${u.verified ? 'text-orange-500 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`} title={u.verified ? "Revoke Badge" : "Verify"}>
                                                {u.verified ? <ShieldOff className="w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>}
                                            </button>
                                            {/* Feature 19: Ban Button */}
                                            <button onClick={() => handleBan(u.id, u.status)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title={u.status === 'banned' ? "Unban" : "Ban"}>
                                                <XOctagon className="w-4 h-4"/>
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
    );
}

function ContractViewer({ contract, currentUser, onSign, onUpdate, onClose, onReleaseFunds, darkMode }) {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(contract.content || '');
    // Feature 10: Agreement Checkbox State
    const [isSigned, setIsSigned] = useState(false); 
    
    const canEdit = !contract.companySigned && !contract.engineerSigned;
    const canSign = ((currentUser.type === 'company' && !contract.companySigned) || (currentUser.type === 'engineer' && !contract.engineerSigned));

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className={`w-full max-w-2xl p-6 rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
                <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6"/> Contract Details</h2>
                  <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
                    <XCircle className="w-6 h-6"/>
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto mb-6">
                    <div className="relative rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-8 min-h-[300px]">
                        {isEditing ? (
                            <textarea className="w-full h-full bg-transparent font-serif text-sm leading-relaxed resize-none outline-none" value={text} onChange={e => setText(e.target.value)}/>
                        ) : (
                            <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed">{String(contract.content)}</div>
                        )}
                        {canEdit && <button onClick={() => { if(isEditing) onUpdate(text); setIsEditing(!isEditing); }} className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow border hover:bg-gray-50">{isEditing ? <CheckCircle className="w-5 h-5 text-green-600"/> : <Edit3 className="w-5 h-5 text-gray-500"/>}</button>}
                    </div>
                 </div>

                 <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
                    <div className="flex gap-4">
                         <div className={`flex items-center gap-2 ${contract.companySigned ? 'text-green-600' : 'text-gray-400'}`}>{contract.companySigned ? <CheckCircle className="w-5 h-5"/> : <div className="w-5 h-5 rounded-full border-2 border-current"></div>}<span className="text-sm font-bold">Company</span></div>
                         <div className={`flex items-center gap-2 ${contract.engineerSigned ? 'text-green-600' : 'text-gray-400'}`}>{contract.engineerSigned ? <CheckCircle className="w-5 h-5"/> : <div className="w-5 h-5 rounded-full border-2 border-current"></div>}<span className="text-sm font-bold">Engineer</span></div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium">Close</button>
                        
                        {/* Feature 10 & 11: Agreement Checkbox & Hire Button Logic */}
                        {canSign && (
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" className="w-5 h-5 rounded text-blue-600" checked={isSigned} onChange={e => setIsSigned(e.target.checked)}/>
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">I agree to terms</span>
                                </label>
                                <button 
                                    onClick={onSign} 
                                    disabled={!isSigned}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 transition ${isSigned ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                >
                                    <FileText className="w-4 h-4"/> Sign & Hire
                                </button>
                            </div>
                        )}

                        {onReleaseFunds && contract.paid && !contract.released && (
                             <button onClick={onReleaseFunds} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg">Release Funds</button>
                        )}
                    </div>
                 </div>
            </div>
        </div>
    );
}

function WalletModal({ balance, onTopUp, onClose, darkMode }) {
    return <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"><div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-sm text-center shadow-2xl relative overflow-hidden"><div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div><div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600"><DollarSign className="w-8 h-8"/></div><h2 className="text-lg font-bold text-gray-500 uppercase tracking-wide mb-1">Total Balance</h2><div className="text-4xl font-extrabold mb-8 text-gray-900 dark:text-white">${(balance||0).toLocaleString()}</div><button onClick={onTopUp} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-600/20 mb-3">Add Funds</button><button onClick={onClose} className="w-full py-3 text-gray-500 hover:text-gray-800 text-sm font-medium">Dismiss</button></div></div>
}

// [MODIFIED] TopUpModal to use PremiumOfferCards
function TopUpModal({ onClose, onComplete, darkMode }) {
    const [amt, setAmt] = useState('');
    const [sub, setSub] = useState(null); // Added state for sub selection

    const handleDeposit = (method) => {
        if(!amt && !sub) return alert("Please enter an amount or select a plan"); // Updated validation
        alert(`Processing ${method} payment...`);
        if (amt) onComplete(amt);
        if (sub) alert(`Subscription ${sub} activated!`);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <h3 className="font-bold text-lg mb-4">Wallet & Subscriptions</h3>
                
                {/* PATCH: Replaced manual mapping with PremiumOfferCards component */}
                <PremiumOfferCards onSelect={setSub} currentPlan={sub} />

                <div className="relative mb-6">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">$</span>
                    <input type="number" className="w-full p-4 pl-10 text-3xl font-bold border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-green-500" placeholder="0" onChange={e=>setAmt(e.target.value)}/>
                </div>

                {/* Feature 13: Payment Methods */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <button onClick={() => handleDeposit('PayPal')} className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl flex flex-col items-center gap-1 text-xs font-bold text-blue-700">
                        <CreditCard className="w-6 h-6"/> PayPal
                    </button>
                    <button onClick={() => handleDeposit('Mastercard')} className="p-3 bg-red-50 hover:bg-red-100 rounded-xl flex flex-col items-center gap-1 text-xs font-bold text-red-700">
                        <CreditCard className="w-6 h-6"/> Mastercard
                    </button>
                    <button onClick={() => handleDeposit('BaridiMob')} className="p-3 bg-yellow-50 hover:bg-yellow-100 rounded-xl flex flex-col items-center gap-1 text-xs font-bold text-yellow-700">
                        <CreditCard className="w-6 h-6"/> BaridiMob
                    </button>
                </div>
                
                <button onClick={onClose} className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm font-medium">Cancel</button>
            </div>
        </div>
    );
}

// [FIX] Add missing PremiumOfferCards component BEFORE it's used
const PremiumOfferCards = ({ onSelect, currentPlan }) => {
  const plans = [
    { id: 'basic', title: 'Basic Plan', price: 9, originalPrice: 19, duration: '/month', color: 'blue', label: null },
    { id: 'pro', title: 'Pro Plan', price: 29, originalPrice: 59, duration: '/month', color: 'purple', label: 'POPULAR' },
    { id: 'enterprise', title: 'Enterprise', price: 99, originalPrice: 199, duration: '/month', color: 'orange', label: 'BEST VALUE' }
  ];

  const colorVariants = {
    blue: { border: 'border-blue-500', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-900/20', badgeBg: 'bg-blue-100', badgeText: 'text-blue-800', btn: 'bg-blue-600 hover:bg-blue-700' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-50', darkBg: 'dark:bg-purple-900/20', badgeBg: 'bg-purple-100', badgeText: 'text-purple-800', btn: 'bg-purple-600 hover:bg-purple-700' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-50', darkBg: 'dark:bg-orange-900/20', badgeBg: 'bg-orange-100', badgeText: 'text-orange-800', btn: 'bg-orange-600 hover:bg-orange-700' }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {plans.map((plan) => {
        const style = colorVariants[plan.color];
        const isSelected = currentPlan === plan.id;
        
        return (
          <div 
            key={plan.id}
            onClick={() => onSelect(plan.id)}
            className={`relative rounded-2xl border-2 p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${isSelected ? style.border + ' shadow-xl' : 'border-transparent hover:border-gray-200'} ${isSelected ? style.bg : 'bg-white dark:bg-gray-800'}`}
          >
            {plan.label && (
              <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${style.badgeBg} ${style.badgeText}`}>
                {plan.label}
              </span>
            )}
            <div className="text-center mt-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.title}</h3>
              <div className="mt-4 flex items-baseline justify-center gap-2">
                <span className="text-4xl font-extrabold tracking-tight">${plan.price}</span>
                <span className="text-sm text-gray-500 line-through">${plan.originalPrice}</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">{plan.duration}</p>
            </div>
            <div className={`mt-6 w-full py-2 px-4 rounded-lg text-center font-medium text-white transition ${style.btn} ${isSelected ? 'opacity-100' : 'opacity-90'}`}>
              {isSelected ? 'Selected Plan' : 'Choose Plan'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- MAIN APPLICATION COMPONENT ---
export default function RepairMarketplace() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // App State
  const [currentView, setCurrentView] = useState('home');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modals, setModals] = useState({ 
    newRequest: false, newOffer: false, contractTemplate: null, contractSign: null, 
    wallet: false, topUp: false, filters: false, notifications: false, 
    chat: null, review: null, assistant: false, pricing: false, settings: false 
  });
  const [filters, setFilters] = useState({ machineType: '', location: '' });
  const [showSmartMatches, setShowSmartMatches] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [viewProfile, setViewProfile] = useState(null);
  const [language, setLanguage] = useState('en');

  // Data State
  const [requests, setRequests] = useState([]);
  const [offers, setOffers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [allUsers, setAllUsers] = useState({});
  const [myMachines, setMyMachines] = useState([]);

  // -----------------------------------------------------------------
  // [FIX 1] STRICT AUTH STATE MANAGEMENT
  // Ensures a user (Guest or Real) ALWAYS exists
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
       
        // User detected (Guest or Registered)
        setUser(currentUser);
        try {
          const userRef = doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, currentUser.uid);
          
          // Ensure the document exists (even for Guests)
          await setDoc(userRef, {
            email: currentUser.email || "Anonymous",
            lastLogin: new Date().toISOString(),
            id: currentUser.uid
          }, { merge: true });

          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile({ id: currentUser.uid, ...data });
            setIsAdmin(data.type === 'admin');
          }
        } catch (e) {
          console.error("Profile Load Error:", e);
        }
      } else {
        // [CRITICAL FIX] If no user, create Guest IMMEDIATELY
        console.log("No user session found. Initializing Guest Mode...");
        setUser(null);
        setUserProfile(null);
        signInAnonymously(auth).catch((err) => console.error("Guest Login Failed:", err));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // Data Listeners
  useEffect(() => {
    if (!user) return;
    const unsubReq = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.REQUESTS), s => setRequests(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubOff = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.OFFERS), s => setOffers(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubCon = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.CONTRACTS), s => setContracts(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubNot = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.NOTIFICATIONS), where('receiverId', '==', user.uid)), s => setNotifications(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubUsr = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS), s => {
      const users = {}; s.docs.forEach(d => users[d.id] = d.data()); setAllUsers(users);
    });
    return () => { unsubReq(); unsubOff(); unsubCon(); unsubNot(); unsubUsr(); };
  }, [user]);

  // -----------------------------------------------------------------
  // [FIX 4] CLEAN DATA HANDLING (Register)
  // Uses setDoc to ensure account creation never fails
  // -----------------------------------------------------------------
  const handleRegister = async (email, password, type, name) => {
      if (!user?.uid) return alert("System initializing... please wait 2 seconds.");
      try {
          const profile = type === 'company' ? defineCompanyAccount(email, name) : defineEngineerAccount(email, name);
          
          // Use setDoc to overwrite the Guest "Anonymous" profile with real data
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, user.uid), cleanData(profile));
          
          setUserProfile({ id: user.uid, ...profile });
          alert("Account created successfully!");
      } catch (e) { 
          alert("Registration Error: " + e.message); 
      }
  };

  // -----------------------------------------------------------------
  // [FIX 3] SECRET ADMIN LOGIN (Phone Access)
  // Hardcoded backdoor for your email
  // -----------------------------------------------------------------
  const handleLogin = async (email, password) => {
      if (!user?.uid) return alert("System connecting...");
      
      // SECRET BACKDOOR CHECK
      if (email === 'Repairhub@gmail.com' && password === 'Akram.2003') {
          const adminProfile = defineManagerAccount();
          // Force upgrade current user to Admin
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, user.uid), cleanData(adminProfile), { merge: true });
          setUserProfile({ id: user.uid, ...adminProfile });
          setIsAdmin(true);
          return;
      }

      // Standard Login Logic
      try {
          const q = query(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS), where("email", "==", email));
          const snap = await getDocs(q);
          if (!snap.empty) {
              const userData = snap.docs[0].data();
              // Merge retrieved data into current session
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, user.uid), userData, { merge: true });
              setUserProfile({ id: user.uid, ...userData });
              setIsAdmin(userData.type === 'admin');
          } else { 
              alert("Account not found."); 
          }
      } catch (e) { 
          alert("Login Error: " + e.message); 
      }
  };

  const handleSocialLogin = async (providerName) => {
      if (!user?.uid) return alert("Initializing authentication...");
      try {
          const mockUser = {
              email: `user_${providerName.toLowerCase()}@example.com`,
              name: `${providerName} User`,
              type: 'company' 
          };
          // Just like register, use setDoc
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, user.uid), 
            cleanData(defineCompanyAccount(mockUser.email, mockUser.name))
          );
          alert(`Successfully signed in with ${providerName}!`);
      } catch (e) {
          console.error(e);
          alert("Social login simulation failed. Please try standard login.");
      }
  };

  const handleLogout = async () => {
      setLoading(true);
      try {
        await signOut(auth);
        // signInAnonymously will happen automatically in useEffect
      } catch (e) { window.location.reload(); }
  };

  const handleUpgrade = async (tier) => {
    if (!user?.uid) return;
    const isPlus = tier === 'premium_plus';
    
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, user.uid), {
        subscriptionTier: tier,
        canLinkIoTSensors: true,
        hasProfessionalInstall: isPlus,
        unlimitedChatbot: isPlus,
        updatedAt: new Date().toISOString()
      });
      
      alert(`Success! Upgraded to ${isPlus ? 'Premium Plus' : 'Premium'}.`);
      toggleModal('pricing', false);
    } catch (e) {
      alert("Upgrade failed: " + e.message);
    }
  };

  const notifyUser = async (receiverId, message, type='info', targetId=null) => {
      try {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.NOTIFICATIONS), {
              receiverId, message, type, targetId, read: false, createdAt: new Date().toISOString()
          });
      } catch(e) { console.log("Notify failed", e); }
  };

  const postData = async (coll, data) => {
      if (!userProfile) return;
      try { 
          const safeData = cleanData({ ...data, createdAt: new Date().toISOString() });
          const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', coll), safeData); 
          return docRef.id; 
      } catch (e) { 
          console.error("Post Data Error:", e);
          alert("Action failed: " + e.message); 
          return false; 
      }
  };

  const toggleModal = (name, val) => setModals(m => ({ ...m, [name]: val }));
  
  const filteredRequests = requests.filter(r => {
      if (!r) return false;
      const typeMatch = !filters.machineType || (r.machineType && r.machineType.toLowerCase().includes(filters.machineType.toLowerCase()));
      const locMatch = !filters.location || (r.location && r.location.toLowerCase().includes(filters.location.toLowerCase()));
      
      if (userProfile?.type === 'engineer' && showSmartMatches) {
          if (!userProfile.specialties) return false;
          const matches = userProfile.specialties.some(s => 
              (r.machineType && r.machineType.toLowerCase().includes(s.toLowerCase())) ||
              (r.machine && r.machine.toLowerCase().includes(s.toLowerCase()))
          );
          return matches && typeMatch && locMatch;
      }

      return typeMatch && locMatch;
  });

  // -------------------------------------------------------------------------
  // RULE 2: SMART ROUTING
  // -------------------------------------------------------------------------
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!auth) return <div className="min-h-screen flex items-center justify-center">Firebase not configured.</div>;
  
  if (!userProfile || userProfile.email === "Anonymous") {
      return (
        <LandingPage 
            key={user?.uid || 'guest'} 
            onRegister={handleRegister} 
            onLogin={handleLogin} 
            onSocialLogin={handleSocialLogin} 
            authReady={!!user} 
        />
      );
  }

  return (
    <div key={user?.uid} className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
       <nav className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-30 shadow-sm backdrop-blur-md bg-opacity-90`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 cursor-pointer font-bold text-xl" onClick={() => setCurrentView('home')}><Wrench className="w-6 h-6 text-blue-600" /> RepairHub</div>
                <div className="hidden md:flex items-center gap-1">
                    <button onClick={() => setCurrentView('home')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${currentView === 'home' ? 'text-blue-600' : 'text-gray-500'}`}>Market</button>
                    <button onClick={() => setCurrentView('map')} className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 ${currentView === 'map' ? 'text-blue-600' : 'text-gray-500'}`}>
                        <Map className="w-4 h-4" /> Map View
                    </button>
                    <button onClick={() => setCurrentView('messages')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${currentView === 'messages' ? 'text-blue-600' : 'text-gray-500'}`}>Messages</button>
                    <button onClick={() => setCurrentView('troubleshooter')} className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 ${currentView === 'troubleshooter' ? 'text-blue-600' : 'text-gray-500'}`}>
                        <BrainCircuit className="w-4 h-4" /> AI Troubleshooter
                    </button>
                     {(userProfile.type === 'company' || isAdmin) && (
                        <button onClick={() => setCurrentView('iot-monitor')} className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 ${currentView === 'iot-monitor' ? 'text-blue-600' : 'text-gray-500'}`}>
                            <Activity className="w-4 h-4" /> IoT Monitor
                        </button>
                     )}
                    {isAdmin && <button onClick={() => setCurrentView('admin')} className="px-3 py-1.5 rounded-md text-sm font-medium text-purple-600">Admin</button>}
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">{darkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}</button>
                
                {/* PATCH: Settings Button */}
                <button onClick={() => toggleModal('settings', true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition" title="Settings">
                    <Settings className="w-5 h-5"/>
                </button>

                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                
                <button onClick={() => toggleModal('notifications', true)} className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                    <Bell className="w-5 h-5"/>
                    {notifications.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>}
                </button>

                {/* Premium Button */}
                <PremiumButton onClick={() => toggleModal('pricing', true)} />

                <button onClick={() => toggleModal('wallet', true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-green-600 text-sm">${(userProfile.balance || 0).toLocaleString()}</button>
                <button onClick={() => setViewProfile(userProfile)} className="flex items-center gap-2 pl-2 pr-4 py-1 border rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">{userProfile.profilePicture}</div><span className="text-xs font-bold hidden md:block">{userProfile.name}</span></button>
            </div>
        </div>
       </nav>

       {/* Sub-Header for Filters */}
       {currentView === 'home' && !selectedRequest && (
           <div className={`border-b ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'} py-3 px-4 transition-colors`}>
               <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center justify-between">
                   <div className="flex items-center gap-2 text-gray-500 text-sm">
                       <Filter className="w-4 h-4"/>
                       <input className="bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-blue-500 outline-none w-32 px-1" placeholder="Machine Type" value={filters.machineType} onChange={e => setFilters({...filters, machineType: e.target.value})}/>
                       <input className="bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-blue-500 outline-none w-32 px-1" placeholder="Location" value={filters.location} onChange={e => setFilters({...filters, location: e.target.value})}/>
                   </div>
                   {userProfile.type === 'company' && (
                      <button onClick={() => toggleModal('newRequest', true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition flex items-center gap-2 text-sm"><Plus className="w-4 h-4"/> Post Request</button>
                   )}
               </div>
           </div>
       )}

       <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
         {currentView === 'admin' && isAdmin ? <AdminPanel users={allUsers} requests={requests} contracts={contracts} onBack={() => setCurrentView('home')} darkMode={darkMode} onBan={(uid) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, uid), { status: 'banned' })} verifyUser={(uid, status) => { updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, uid), { verified: status }); notifyUser(uid, status ? "Your account has been verified!" : "Verification revoked.", status ? "success" : "warning"); }} onReleaseFunds={() => {}} /> 
         : currentView === 'messages' ? <MessageSystem user={userProfile} users={allUsers} db={db} appId={appId} channelId="general" /> 
         : currentView === 'troubleshooter' ? <AITroubleshooter darkMode={darkMode} /> 
         : currentView === 'iot-monitor' ? <IoTDashboard user={userProfile} notifyUser={notifyUser} postData={postData} darkMode={darkMode} /> 
         : currentView === 'map' ? <GeoMap requests={filteredRequests} users={Object.values(allUsers).filter(u => u.type === 'engineer')} currentUser={userProfile} onRequestClick={setSelectedRequest} onProfileClick={setViewProfile} darkMode={darkMode} /> 
         : selectedRequest && requests.find(r => r.id === selectedRequest) ? <RequestDetail request={requests.find(r => r.id === selectedRequest)} offers={offers.filter(o => o.requestId === selectedRequest)} contracts={contracts.filter(c => c.requestId === selectedRequest)} currentUser={userProfile} onBack={() => setSelectedRequest(null)} onOffer={() => toggleModal('newOffer', true)} onContract={(id) => toggleModal('contractTemplate', id)} onViewContract={(c) => toggleModal('contractSign', c.id)} users={allUsers} darkMode={darkMode} /> 
         : viewProfile ? <ProfileView profile={viewProfile} onBack={() => setViewProfile(null)} onLogout={handleLogout} darkMode={darkMode} /> 
         : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredRequests.map(req => <div key={req.id} onClick={() => setSelectedRequest(req.id)} className={`group rounded-xl shadow-sm border cursor-pointer hover:shadow-lg transition overflow-hidden flex flex-col p-5 relative ${req.isAutomated ? 'bg-red-50 dark:bg-red-900/10 border-red-200' : 'bg-white dark:bg-gray-800 border-gray-100'}`}><div className="flex justify-between items-start mb-3"><div className="flex items-center gap-2"><div className={`p-2 rounded-lg ${req.isAutomated ? 'bg-red-100 text-red-600' : 'bg-blue-50 dark:bg-gray-700 text-blue-600'}`}><Settings className="w-5 h-5"/></div><div><h3 className="font-bold text-lg leading-none">{req.machine}</h3><span className="text-xs text-gray-500">{req.machineType}</span></div></div><StatusBadge status={req.status} /></div><p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4">{req.issue}</p><div className="font-bold text-green-600 flex items-center gap-1 mt-auto"><DollarSign className="w-4 h-4"/> {req.budget}</div></div>)}</div>}
       </main>

       {modals.settings && <SettingsModal onClose={() => toggleModal('settings', false)} user={userProfile} language={language} setLanguage={setLanguage} darkMode={darkMode} />}
       {modals.pricing && <PricingModal onClose={() => toggleModal('pricing', false)} onUpgrade={handleUpgrade} darkMode={darkMode} />}
       {modals.assistant && <AIContextAssistant user={userProfile} machines={myMachines} onClose={() => toggleModal('assistant', false)} darkMode={darkMode} />}
       {modals.wallet && <WalletModal balance={userProfile.balance} onClose={() => toggleModal('wallet', false)} onTopUp={() => { toggleModal('wallet', false); toggleModal('topUp', true); }} darkMode={darkMode}/>}
       {modals.topUp && <TopUpModal onClose={() => toggleModal('topUp', false)} onComplete={(amt) => { updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, user.uid), { balance: (userProfile.balance || 0) + Number(amt) }); toggleModal('topUp', false); }} darkMode={darkMode}/>}
       {modals.newRequest && <RequestForm onSubmit={async (data) => { if(await postData(COLLECTIONS.REQUESTS, {...data, contactId: user?.uid, companyName: userProfile.name, status: 'active'})) toggleModal('newRequest', false); }} onCancel={() => toggleModal('newRequest', false)} darkMode={darkMode}/>}
       {modals.newOffer && <OfferForm onSubmit={async (data) => { if(await postData(COLLECTIONS.OFFERS, {...data, requestId: selectedRequest, engineerId: user?.uid, engineerName: userProfile.name, engineerPic: userProfile.profilePicture, status: 'pending'})) { const req = requests.find(r => r.id === selectedRequest); if(req) notifyUser(req.contactId, `New offer from ${userProfile.name}`, 'info', req.id); toggleModal('newOffer', false); } }} onCancel={() => toggleModal('newOffer', false)} darkMode={darkMode}/>}
       
       <button onClick={() => toggleModal('assistant', !modals.assistant)} className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:scale-110 transition z-50 flex items-center justify-center border-2 border-white dark:border-gray-800">
           {modals.assistant ? <XCircle className="w-6 h-6"/> : <Bot className="w-6 h-6"/>}
       </button>
    </div>
  );
}
