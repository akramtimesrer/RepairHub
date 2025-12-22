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

// --- Main Application Component ---
function RepairMarketplace() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // PATCH: New Language State
  const [language, setLanguage] = useState('en'); // Options: 'en', 'fr', 'ar'

  // Feature 4: Global Context Data (Simulated Registry)
  const [myMachines, setMyMachines] = useState([
      { id: 'M001', name: 'CNC Lathe X200', type: 'CNC Machine', serial: 'SN-88219-X', location: 'Floor 1', status: 'Active' },
      { id: 'M002', name: 'Hydraulic Press HP5', type: 'Hydraulic Press', serial: 'HP-5000-V2', location: 'Floor 2', status: 'Active' },
      { id: 'M003', name: 'Cooling Unit 09', type: 'HVAC', serial: 'CU-09-TRANE', location: 'Roof', status: 'Maintenance' },
      { id: 'M004', name: 'Robotic Arm R-2000', type: 'Robotics', serial: 'R2K-JAPAN-99', location: 'Assembly Line A', status: 'Active' }
  ]);

  // Navigation & Modals
  const [currentView, setCurrentView] = useState('home'); 
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewProfile, setViewProfile] = useState(null);
  const [modals, setModals] = useState({
    newRequest: false, newOffer: false, contractTemplate: null, 
    contractSign: null, wallet: false, topUp: false, filters: false, 
    offerControl: null, notifications: false, chat: null, review: null,
    assistant: false, pricing: false, settings: false
  });

  // Data
  const [requests, setRequests] = useState([]);
  const [offers, setOffers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [allUsers, setAllUsers] = useState({}); 
  const [filters, setFilters] = useState({ machineType: '', budgetMin: '', budgetMax: '', location: '' });
  const [showSmartMatches, setShowSmartMatches] = useState(false);

  // 1. Auth Init (REPAIRED)
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        try {
          // Sync user data
          const userRef = doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, currentUser.uid);
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
        } catch (e) { console.error("Auth Error:", e); }
      } else {
        // FIX: Automatically sign in as Guest if no user is found
        setUser(null);
        setUserProfile(null);
        signInAnonymously(auth).catch(console.error);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // 2. Profile Sync
  useEffect(() => {
      if (!user?.uid || !db) return; 

      const ref = doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, user.uid);
      const unsub = onSnapshot(ref, (snap) => {
          if (snap.exists()) {
              const data = snap.data();
              setUserProfile({ id: user.uid, ...data });
              setIsAdmin(data.type === 'admin');
          } else {
              setUserProfile(null);
          }
          setLoading(false);
      }, (err) => setLoading(false));
      return () => unsub();
  }, [user?.uid]);

  // 3. Data Fetching
  useEffect(() => {
      if (!user?.uid || !db) return;
      
      const sub = (colName, setter, sortFn) => {
          const ref = collection(db, 'artifacts', appId, 'public', 'data', colName);
          return onSnapshot(ref, (snap) => {
              const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              if (sortFn) items.sort(sortFn);
              setter(items);
          }, (e) => console.log(`Fetching ${colName} deferred`));
      };

      const unsubReq = sub(COLLECTIONS.REQUESTS, setRequests, (a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const unsubOff = sub(COLLECTIONS.OFFERS, setOffers);
      const unsubCon = sub(COLLECTIONS.CONTRACTS, setContracts);
      
      const unsubNotifs = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.NOTIFICATIONS), (snap) => {
          const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const myNotifs = all.filter(n => n.receiverId === user.uid);
          myNotifs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
          setNotifications(myNotifs);
      });

      const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS), (snap) => {
          const map = {};
          snap.docs.forEach(d => map[d.id] = { id: d.id, ...d.data() });
          setAllUsers(map);
      }); 

      return () => { unsubReq(); unsubOff(); unsubCon(); unsubUsers(); unsubNotifs(); };
  }, [user?.uid]);

  // Actions
  const notifyUser = async (receiverId, message, type='info', targetId=null) => {
      try {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.NOTIFICATIONS), {
              receiverId,
              message,
              type,
              targetId,
              read: false,
              createdAt: new Date().toISOString()
          });
      } catch(e) { console.log("Notify failed", e); }
  };

  const handleReleaseFunds = async (contract) => {
      if (contract.released) return alert("Funds already released.");
      try {
          const engRef = doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, contract.engineerId);
          const engSnap = await getDoc(engRef);
          if (!engSnap.exists()) return alert("Engineer record not found");
          
          const engData = engSnap.data();
          const newBalance = (engData.balance || 0) + Number(contract.price);
          await updateDoc(engRef, { balance: newBalance });
          
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.CONTRACTS, contract.id), {
              released: true,
              status: 'Completed'
          });

          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.REQUESTS, contract.requestId), {
              status: 'Completed'
          });

          notifyUser(contract.engineerId, `Escrow released! $${contract.price} added to your wallet.`, 'success');
          notifyUser(contract.companyId, `Job marked complete. Funds released to engineer.`, 'info');
          
          alert("Funds released successfully!");
          toggleModal('review', { engineerId: contract.engineerId, contractId: contract.id });
      } catch (e) { alert("Transfer failed: " + e.message); }
  };

  const handleRegister = async (email, password, type, name) => {
      if (!user?.uid) return alert("System connecting... please wait a moment.");
      try {
          const q = query(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, where("email", "==", email)));
          const snap = await getDocs(q);
          if (!snap.empty) return alert("This email is already registered. Please login instead.");
          const profile = type === 'company' ? defineCompanyAccount(email, name) : defineEngineerAccount(email, name);
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, user.uid), cleanData(profile));
          setUserProfile({ id: user.uid, ...profile });
      } catch (e) { alert("Registration Error: " + e.message); }
  };

  const handleLogin = async (email, password) => {
      if (!user?.uid) return alert("System connecting... please wait a moment.");
      if (email === 'Repairhub@gmail.com' && password === 'Akram.2003') {
          const adminProfile = defineManagerAccount();
          try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, user.uid), cleanData(adminProfile), { merge: true }); } catch (e) {}
          setUserProfile({ id: user.uid, ...adminProfile });
          setIsAdmin(true);
          return;
      }
      try {
          const q = query(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS), where("email", "==", email));
          const snap = await getDocs(q);
          if (!snap.empty) {
              const docs = snap.docs.map(d => d.data());
              docs.sort((a, b) => (b.createdAt ? new Date(b.createdAt) : 0) - (a.createdAt ? new Date(a.createdAt) : 0));
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, user.uid), docs[0], { merge: true });
              setUserProfile({ id: user.uid, ...docs[0] });
              setIsAdmin(docs[0].type === 'admin');
          } else { alert("Account not found."); }
      } catch (e) { alert("Login Error: " + e.message); }
  };

  const handleSocialLogin = async (providerName) => {
      if (!user?.uid) return alert("Initializing authentication...");
      try {
          const mockUser = {
              email: `user_${providerName.toLowerCase()}@example.com`,
              name: `${providerName} User`,
              type: 'company' 
          };
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, user.uid), 
            cleanData(defineCompanyAccount(mockUser.email, mockUser.name))
          );
          const profile = defineCompanyAccount(mockUser.email, mockUser.name);
          setUserProfile({ id: user.uid, ...profile });
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
        await signInAnonymously(auth);
        setUserProfile(null);
        setIsAdmin(false);
        setCurrentView('home');
        setSelectedRequest(null);
        setModals({ newRequest: false, newOffer: false, contractTemplate: null, contractSign: null, wallet: false, topUp: false, filters: false, offerControl: null, notifications: false, chat: null, review: null, assistant: false, pricing: false, settings: false });
      } catch (e) { window.location.reload(); } finally { setLoading(false); }
  };

  const handleUpgrade = async (tier) => {
    if (!user?.uid) return;
    const isPlus = tier === 'premium_plus';
    
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, user.uid), {
        subscriptionTier: tier,
        canLinkIoTSensors: true, // Available for both tiers
        hasProfessionalInstall: isPlus, // Tier 2 Only
        unlimitedChatbot: isPlus,       // Tier 2 Only
        updatedAt: new Date().toISOString()
      });
      
      alert(`Success! Upgraded to ${isPlus ? 'Premium Plus' : 'Premium'}.`);
      toggleModal('pricing', false);
    } catch (e) {
      alert("Upgrade failed: " + e.message);
    }
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

  const activeRequestObj = selectedRequest ? requests.find(r => r.id === selectedRequest) : null;

  if (loading && !userProfile) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!auth) return <div className="min-h-screen flex items-center justify-center">Firebase not configured.</div>;
  if (!userProfile) return <LandingPage key={user?.uid || 'guest'} onRegister={handleRegister} onLogin={handleLogin} onSocialLogin={handleSocialLogin} authReady={authReady && !!user} />;

  return (
    <div key={user?.uid} className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
       
       <nav className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-30 shadow-sm backdrop-blur-md bg-opacity-90`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 cursor-pointer font-bold text-xl" onClick={() => setCurrentView('home')}><Wrench className="w-6 h-6 text-blue-600" /> RepairHub</div>
                <div className="hidden md:flex items-center gap-1">
                    <button onClick={() => setCurrentView('home')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${currentView === 'home' ? 'text-blue-600' : 'text-gray-500'}`}>Market</button>
                    {/* Feature 5: Map Navigation */}
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

       {currentView === 'home' && !selectedRequest && (
           <div className={`border-b ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'} py-3 px-4 transition-colors`}>
               <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center justify-between">
                   <div className="flex items-center gap-2 text-gray-500 text-sm">
                       <Filter className="w-4 h-4"/>
                       <span className="hidden sm:inline">Filter:</span>
                       <input className="bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-blue-500 outline-none w-32 px-1 transition-colors" placeholder="Machine Type" value={filters.machineType} onChange={e => setFilters({...filters, machineType: e.target.value})}/>
                       <input className="bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-blue-500 outline-none w-32 px-1 transition-colors" placeholder="Location" value={filters.location} onChange={e => setFilters({...filters, location: e.target.value})}/>
                   </div>
                   {userProfile.type === 'engineer' && (
                       <button 
                           onClick={() => setShowSmartMatches(!showSmartMatches)} 
                           className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition ${showSmartMatches ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}
                        >
                           <BrainCircuit className="w-4 h-4"/> Smart Match
                       </button>
                   )}
                   {userProfile.type === 'company' && (
                      <button onClick={() => toggleModal('newRequest', true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition flex items-center gap-2 text-sm transform active:scale-95"><Plus className="w-4 h-4"/> Post Request</button>
                   )}
               </div>
           </div>
       )}

       <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
          {currentView === 'admin' && isAdmin ? (
              <AdminPanel 
                users={allUsers} 
                requests={requests} 
                contracts={contracts} 
                onBack={() => setCurrentView('home')} 
                onBan={(uid) => {
                    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, uid), { status: 'banned' });
                }} 
                verifyUser={(uid, status = true) => { 
                    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, uid), { verified: status }); 
                    notifyUser(uid, status ? "Your account has been verified by Administration!" : "Your verification badge has been revoked.", status ? "success" : "warning"); 
                }}
                onVerifyContract={(id) => { updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.CONTRACTS, id), { adminVerified: true }); }}
                onReleaseFunds={handleReleaseFunds}
                darkMode={darkMode}
              />
          ) : currentView === 'messages' ? (
              <MessageSystem user={userProfile} users={allUsers} db={db} appId={appId} channelId="general" />
          ) : currentView === 'troubleshooter' ? (
              <AITroubleshooter darkMode={darkMode} />
          ) : currentView === 'iot-monitor' ? (
            <IoTDashboard user={userProfile} notifyUser={notifyUser} postData={postData} darkMode={darkMode} />
          ) : currentView === 'map' ? (
            <GeoMap 
                requests={filteredRequests} 
                users={Object.values(allUsers).filter(u => u.type === 'engineer')} 
                currentUser={userProfile}
                onRequestClick={(id) => { setSelectedRequest(id); }}
                onProfileClick={setViewProfile}
                darkMode={darkMode}
            />
          ) : (selectedRequest && activeRequestObj) ? (
              <RequestDetail 
                 request={activeRequestObj} 
                 offers={offers.filter(o => o.requestId === selectedRequest)}
                 contracts={contracts.filter(c => c.requestId === selectedRequest)}
                 currentUser={userProfile}
                 onBack={() => setSelectedRequest(null)}
                 onOffer={() => toggleModal('newOffer', true)}
                 onContract={(id) => toggleModal('contractTemplate', id)}
                 onViewContract={(c) => toggleModal('contractSign', c.id)}
                 users={allUsers}
                 darkMode={darkMode}
              />
          ) : viewProfile ? (
              <ProfileView profile={viewProfile} onBack={() => setViewProfile(null)} onLogout={handleLogout} darkMode={darkMode} />
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRequests.map(req => (
                      <div key={req.id} onClick={() => setSelectedRequest(req.id)} className={`group rounded-xl shadow-sm border cursor-pointer hover:shadow-lg transition overflow-hidden flex flex-col p-5 relative ${req.isAutomated ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                          {req.isAutomated && (
                              <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1">
                                  <BrainCircuit className="w-3 h-3"/> AI DISPATCH
                              </div>
                          )}
                          <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                 <div className={`p-2 rounded-lg ${req.isAutomated ? 'bg-red-100 text-red-600' : 'bg-blue-50 dark:bg-gray-700 text-blue-600'}`}><Settings className="w-5 h-5"/></div>
                                 <div><h3 className="font-bold text-lg leading-none">{req.machine}</h3><span className="text-xs text-gray-500">{req.machineType}</span></div>
                              </div>
                              <StatusBadge status={req.status} />
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4">{req.issue}</p>
                          <div className="font-bold text-green-600 flex items-center gap-1 mt-auto"><DollarSign className="w-4 h-4"/> {req.budget}</div>
                      </div>
                  ))}
              </div>
          )}
       </main>

        <div className={`border-t ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'} py-3 px-4 text-center text-xs text-gray-500 transition-colors`}>
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
                <span>© 2025 RepairHub Inc. All rights reserved.</span>
                
                {/* PATCH: Footer Social Links */}
                <div className="flex flex-col md:flex-row items-center gap-4 mt-4 md:mt-0">
                    <div className="flex gap-3">
                      <button onClick={() => window.open('https://facebook.com', '_blank')} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:text-blue-600 transition" title="Facebook"><Globe className="w-4 h-4"/></button>
                      <button onClick={() => window.open('https://instagram.com', '_blank')} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:text-pink-600 transition" title="Instagram"><Share2 className="w-4 h-4"/></button>
                      <button onClick={() => window.open('https://twitter.com', '_blank')} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:text-blue-400 transition" title="Twitter"><Link className="w-4 h-4"/></button>
                    </div>
                    <a 
                      href="https://wa.me/213782625021" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-[#128C7E] transition shadow-md"
                    >
                      <WhatsAppIcon className="w-4 h-4 fill-white" />
                      <span>WhatsApp Support</span>
                    </a>
                </div>

                <div className="flex items-center gap-4 ml-4">
                    <button onClick={() => alert("Help Center feature coming soon.")} className="hover:text-blue-500 transition">Help Center</button>
                    <button onClick={() => alert("Support ticket system coming soon.")} className="flex items-center gap-1 hover:text-blue-500 transition font-medium"><HelpCircle className="w-3 h-3"/> Contact Support</button>
                </div>
            </div>
        </div>

        {/* Floating Assistant FAB */}
        <button 
            onClick={() => toggleModal('assistant', !modals.assistant)}
            className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:scale-110 transition z-50 flex items-center justify-center border-2 border-white dark:border-gray-800"
        >
            {modals.assistant ? <XCircle className="w-6 h-6"/> : <Bot className="w-6 h-6"/>}
        </button>

       {/* --- MODALS --- */}
       
       {/* PATCH: Settings Modal Render Logic */}
       {modals.settings && (
          <SettingsModal 
            onClose={() => toggleModal('settings', false)} 
            user={userProfile} 
            language={language}
            setLanguage={setLanguage}
            darkMode={darkMode}
          />
       )}

       {modals.assistant && (
           <AIContextAssistant 
               user={userProfile} 
               machines={myMachines} 
               onClose={() => toggleModal('assistant', false)} 
               darkMode={darkMode}
           />
       )}
       
       {modals.pricing && (
         <PricingModal 
           onClose={() => toggleModal('pricing', false)} 
           onUpgrade={handleUpgrade}
           darkMode={darkMode} 
         />
       )}

       {modals.notifications && (
           <div className="fixed inset-0 bg-black/60 flex items-start justify-end z-50 p-4" onClick={() => toggleModal('notifications', false)}>
               <div className="bg-white dark:bg-gray-800 w-full max-w-sm mt-16 mr-4 rounded-xl shadow-2xl border dark:border-gray-700 overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                   <div className="p-4 border-b dark:border-gray-700 font-bold flex justify-between items-center">
                       <span>Notifications</span>
                       <button onClick={() => toggleModal('notifications', false)}><XCircle className="w-5 h-5 text-gray-400 hover:text-gray-600"/></button>
                   </div>
                   <div className="max-h-[60vh] overflow-y-auto">
                       {notifications.length === 0 ? (
                           <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2"><Bell className="w-8 h-8 opacity-20"/><p>No new notifications</p></div>
                       ) : (
                           notifications.map(n => (
                               <div 
                                   key={n.id} 
                                   onClick={() => {
                                       if (n.targetId) {
                                           setSelectedRequest(n.targetId);
                                           toggleModal('notifications', false);
                                       }
                                   }}
                                   className="p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
                               >
                                   <div className="text-sm font-medium mb-1">{n.message}</div>
                                   <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                               </div>
                           ))
                       )}
                   </div>
                   {notifications.length > 0 && (
                       <button onClick={async () => { for(const n of notifications) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.NOTIFICATIONS, n.id)); }} className="w-full p-3 text-center text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 font-medium">Clear All</button>
                   )}
               </div>
           </div>
       )}

       {modals.review && (
           <ReviewModal 
             data={modals.review} 
             onSubmit={async (rating) => {
                 await addDoc(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.REVIEWS), {
                     ...modals.review, rating, reviewerId: user.uid, createdAt: new Date().toISOString()
                 });
                 alert("Review submitted! Rating saved.");
                 toggleModal('review', null);
             }}
             onCancel={() => toggleModal('review', null)}
           />
       )}

       {modals.newRequest && <RequestForm onSubmit={async (data) => { 
           if (!userProfile?.name) return alert("Please wait for your profile to load fully.");
           if(await postData(COLLECTIONS.REQUESTS, {...data, contactId: user?.uid, companyName: userProfile.name, status: 'active'})) toggleModal('newRequest', false); 
       }} onCancel={() => toggleModal('newRequest', false)} darkMode={darkMode}/>}
       
       {modals.newOffer && <OfferForm onSubmit={async (data) => { 
           if (!userProfile?.name) return alert("Please wait for your profile to load fully.");
           if(await postData(COLLECTIONS.OFFERS, {...data, requestId: selectedRequest, engineerId: user?.uid, engineerName: userProfile.name, engineerPic: userProfile.profilePicture || '👨‍🔧', status: 'pending'})) {
               const req = requests.find(r => r.id === selectedRequest);
               if(req) notifyUser(req.contactId, `New offer received from ${userProfile.name} for ${req.machine}`, 'info', req.id);
               toggleModal('newOffer', false); 
           }
       }} onCancel={() => toggleModal('newOffer', false)} darkMode={darkMode}/>}
       
       {modals.contractTemplate && <ContractTemplateModal onCancel={() => toggleModal('contractTemplate', null)} onCreate={async (type) => {
           const offer = offers.find(o => o.id === modals.contractTemplate);
           const req = requests.find(r => r.id === offer.requestId);
           if (!offer || !req) return;
           const contract = { offerId: offer.id, requestId: req.id, companyId: user.uid, engineerId: offer.engineerId, title: type + ' Contract', content: 'Scope of Work: ' + offer.description + '\n\nStandard terms apply. Payment held in escrow.', status: 'pending', companySigned: false, engineerSigned: false, price: offer.price };
           await postData(COLLECTIONS.CONTRACTS, contract);
           notifyUser(offer.engineerId, `Contract drafted for ${req.machine}. Please review and sign.`, 'info', req.id);
           toggleModal('contractTemplate', null);
       }} darkMode={darkMode} />}

       {modals.contractSign && contracts.find(c => c.id === modals.contractSign) && (
           <ContractViewer 
               contract={contracts.find(c => c.id === modals.contractSign)} 
               currentUser={userProfile} 
               onUpdate={async (newContent) => {
                   await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.CONTRACTS, modals.contractSign), { content: newContent });
               }}
               onSign={async () => {
                   const c = contracts.find(c => c.id === modals.contractSign);
                   const field = userProfile.type === 'company' ? 'companySigned' : 'engineerSigned';
                   await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.CONTRACTS, c.id), { [field]: true });
                   const receiver = userProfile.type === 'company' ? c.engineerId : c.companyId;
                   notifyUser(receiver, `${userProfile.name} has signed the contract for ${c.title}.`, 'info', c.requestId);
                   toggleModal('contractSign', null);
               }} 
               onCompleteJob={() => handleReleaseFunds(contracts.find(c => c.id === modals.contractSign))} 
               onReleaseFunds={userProfile.type === 'company' ? () => handleReleaseFunds(contracts.find(c => c.id === modals.contractSign)) : null}
               onClose={() => toggleModal('contractSign', null)} 
               darkMode={darkMode} 
           />
       )}

       {modals.wallet && <WalletModal balance={userProfile.balance} onClose={() => toggleModal('wallet', false)} onTopUp={() => { toggleModal('wallet', false); toggleModal('topUp', true); }} darkMode={darkMode}/>}
       {modals.topUp && <TopUpModal onClose={() => toggleModal('topUp', false)} onComplete={(amt) => { updateDoc(doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.USERS, user.uid), { balance: (userProfile.balance || 0) + Number(amt) }); toggleModal('topUp', false); }} darkMode={darkMode}/>}

    </div>
  );
}
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
            <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase">Starter</span>
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
                <button onClick={onClose} className="hover:bg-white/20 p-1 rounded"><Minimize2 className="w-4 h-4"/></button>
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

// FEATURE 1: ENHANCED AI TROUBLESHOOTER WITH VISUAL SIMULATION
function AITroubleshooter({ darkMode }) {
    const [machine, setMachine] = useState('');
    const [issue, setIssue] = useState('');
    const [result, setResult] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [view3D, setView3D] = useState(false); // Toggle for Visual Simulation
    const [f, setF] = useState({ budget: '', location: '' }); // Form state for optional fields

    const handleAnalyze = async () => {
        if (!machine || !issue) return alert("Please fill in both fields.");
        setAnalyzing(true);
        setError(null);
        setResult(null);
        setView3D(false); // Reset visualization

        const apiKey = ""; 
        const prompt = `Act as a senior industrial maintenance engineer.
        Machine Context: ${machine}
        Problem Description: ${issue}

        Provide a structured JSON response with exactly these fields:
        1. "safety_warning": A critical safety string.
        2. "guide": An array of strings, technical repair steps.
        3. "case_studies": An array of 2 objects {title, summary}.
        4. "suspected_component": String (e.g., "Motor", "Gearbox", "Pump", "Circuit").
        5. "failure_mode": String (e.g., "Overheating", "Vibration", "Fracture", "Short Circuit").

        Do not include markdown code blocks. Just the raw JSON.`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
            setResult(parsed);
            // Automatically open visualizer if a relevant component is detected
            if (['Motor', 'Gearbox', 'Pump', 'Hydraulic'].some(c => parsed.suspected_component?.includes(c))) {
                setView3D(true);
            }
        } catch (e) {
            console.error(e);
            setError("AI Analysis failed. Please try again or check your connection.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="animate-fade-in max-w-5xl mx-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3"><BrainCircuit className="w-8 h-8"/> AI Diagnostic Engine</h1>
                    <p className="text-blue-100 max-w-xl">Our advanced AI analyzes symptoms and generates "Digital Twin" visual simulations to pinpoint mechanical failures before you even open the machine.</p>
                </div>
                <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform origin-top-right"></div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Input Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 className="font-bold text-lg mb-4">Input Symptoms</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Machine Model / Type</label>
                                <input 
                                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder="e.g. Industrial Motor X200"
                                    value={machine}
                                    onChange={e => setMachine(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Describe the Malfunction</label>
                                <textarea 
                                    className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none h-32" 
                                    placeholder="e.g. Loud grinding noise and high temperature."
                                    value={issue}
                                    onChange={e => setIssue(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Budget ($)</label>
                                    <input type="number" className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="500" onChange={e=>setF({...f, budget: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Location</label>
                                    <input className="w-full p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="City, State" onChange={e=>setF({...f, location: e.target.value})}/>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <button 
                                onClick={handleAnalyze} 
                                disabled={analyzing}
                                className={`w-full py-3 rounded-xl font-bold text-white transition-all flex items-center gap-2 ${analyzing ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'}`}
                            >
                                {analyzing ? <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Analyzing...</> : <><BrainCircuit className="w-5 h-5"/> Run Diagnostics</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-8 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-100 text-red-700 rounded-xl border border-red-200 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5"/> {error}
                        </div>
                    )}

                    {!result && !analyzing && !error && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl min-h-[400px]">
                            <BrainCircuit className="w-16 h-16 mb-4 opacity-20"/>
                            <p>AI Output will appear here</p>
                        </div>
                    )}

                    {analyzing && (
                        <div className="h-full flex flex-col items-center justify-center p-8 space-y-4 min-h-[400px]">
                            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="text-gray-500 animate-pulse">Running Physics Simulation...</p>
                        </div>
                    )}

                    {result && (
                        <div className="animate-slide-in space-y-6">
                            
                            {/* Feature 1: Visual Simulation Component */}
                            {view3D && (
                                <MachineSimulation 
                                    component={result.suspected_component} 
                                    mode={result.failure_mode}
                                    darkMode={darkMode}
                                />
                            )}

                            {result.safety_warning && (
                                <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
                                    <h4 className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold uppercase text-xs tracking-wider mb-1"><Shield className="w-4 h-4"/> Safety Warning</h4>
                                    <p className="text-red-800 dark:text-red-200 font-medium">{result.safety_warning}</p>
                                </div>
                            )}

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600"/> Repair Guide: {result.suspected_component}</h3>
                                <div className="space-y-4">
                                    {result.guide?.map((step, idx) => (
                                        <div key={idx} className="flex gap-4">
                                            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold text-gray-500 text-sm">{idx + 1}</div>
                                            <p className="pt-1 text-gray-700 dark:text-gray-300 leading-relaxed">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="w-5 h-5"/> Relevant Case Studies</h3>
                                <div className="grid gap-4">
                                    {result.case_studies?.map((study, idx) => (
                                        <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                                            <div className="font-bold text-blue-600 mb-1">{study.title}</div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{study.summary}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
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



function RequestDetail({ request, offers, contracts, currentUser, onBack, onOffer, onOpenControl, onContract, onViewContract, onChat, users, darkMode }) {
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
                                    <div key={o.id} 
                                         className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4`}>
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-xl shrink-0">{o.engineerPic || '👨‍🔧'}</div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-lg">{String(o.engineerName)}</span>
                                                    <span className="text-green-600 font-bold bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded text-sm">${String(o.price)}</span>
                                                    {/* Feature 9: Edit Offer Button Snippet */}
                                                    {currentUser.id === o.engineerId && (
                                                        <button onClick={() => alert("Edit Offer Mode Activated (Feature 9)")} className="text-xs text-blue-500 hover:underline ml-2">
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
                                            {/* Company actions: Draft Contract button */}
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

function AdminPanel({ users, requests, contracts, onBack, onBan, verifyUser, onVerifyContract, onReleaseFunds, darkMode }) {
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

function MessageSystem({ user, users, db, appId, channelId }) {
    const [msgs, setMsgs] = useState([]);
    const [txt, setTxt] = useState('');
    
    useEffect(() => {
        if(!user?.id || !channelId) return;
        const q = collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.MESSAGES);
        const unsub = onSnapshot(q, (snap) => {
            const all = snap.docs.map(d => ({id:d.id, ...d.data()}));
            const filtered = all.filter(m => m.channelId === channelId || (!m.channelId && channelId === 'general'));
            filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            setMsgs(filtered);
        }, (e) => console.log("Message fetch error:", e.code));
        return unsub;
    }, [user?.id, channelId]);

    const send = async () => {
        if(!txt.trim()) return;
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.MESSAGES), {
            text: txt,
            senderId: user.id,
            senderName: user.name,
            senderPic: user.profilePicture,
            channelId: channelId || 'general',
            createdAt: new Date().toISOString()
        });
        setTxt('');
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b dark:border-gray-700 font-bold flex justify-between items-center"><MessageCircle className="w-5 h-5"/> Community Chat</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
                {msgs.map(m => (
                    <div key={m.id} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-tl-none'}`}>
                            <div className="text-xs opacity-70 mb-1">{m.senderName}</div>
                            <p className="text-sm">{m.text}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex gap-2">
                <input 
                    className="flex-1 p-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-2 ring-blue-500"
                    placeholder="Type a message..."
                    value={txt}
                    onChange={e=>setTxt(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&send()}
                />
                <button onClick={send} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"><Send className="w-5 h-5"/></button>
            </div>
        </div>
    )
}

function ProfileView({ profile, onBack, onLogout, darkMode }) {
    // Feature 1 & 2: Local state for Visuals and CV
    const [cvFile, setCvFile] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [tempPic, setTempPic] = useState(profile.profilePicture);
    const [tempCover, setTempCover] = useState('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80');

    const handleCVUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCvFile(file);
            alert("CV Uploaded Successfully: " + file.name);
        }
    };

    const handleStartChat = () => {
        // Feature 15: Private Chat Logic
        console.log(`Opening chat with user ${profile.id}`);
        alert(`Starting private encrypted chat with ${profile.name}...`);
    };

    const handleVideoCall = () => {
        // Feature 16: Video Interview
        const meetId = Math.random().toString(36).substring(7);
        window.open(`https://meet.google.com/new?id=${meetId}`, '_blank');
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in py-8">
            <button onClick={onBack} className="mb-6 text-gray-500 hover:text-blue-600 flex items-center gap-1 transition">
                <ChevronRight className="w-4 h-4 rotate-180"/> Back
            </button>
            
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                {/* Feature 2: Cover Photo */}
                <div className="h-48 relative bg-gray-200">
                    <img src={tempCover} alt="Cover" className="w-full h-full object-cover"/>
                    {editMode && (
                        <input 
                            className="absolute bottom-2 right-2 text-xs bg-black/50 text-white p-1 rounded"
                            placeholder="Paste Cover URL"
                            onChange={(e) => setTempCover(e.target.value)}
                        />
                    )}
                    <button onClick={onLogout} className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur transition">
                        <LogOut className="w-5 h-5"/>
                    </button>
                </div>

                {/* Feature 2: Profile Picture (Circle) */}
                <div className="px-8 relative">
                    <div className="w-32 h-32 -mt-16 relative z-10 rounded-full border-4 border-white dark:border-gray-800 bg-white shadow-lg overflow-hidden flex items-center justify-center text-6xl">
                        {editMode ? (
                           <div className="text-xs text-center p-2">
                               <input placeholder="Img URL" className="w-full bg-gray-100 mb-1" onChange={(e) => setTempPic(e.target.value)} />
                           </div>
                        ) : (
                            <span className="flex items-center justify-center w-full h-full">{profile.profilePicture || tempPic}</span>
                        )}
                        
                        {/* Feature 3 & 4: Verification Badge */}
                        {profile.verified && (
                            <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1.5 rounded-full border-2 border-white dark:border-gray-800" title="Verified Account">
                                <CheckCircle className="w-4 h-4"/>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-4 flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{profile.name}</h1>
                            <p className="text-gray-500 capitalize flex items-center gap-2">
                                <Briefcase className="w-4 h-4"/> {profile.type} • <MapPin className="w-4 h-4"/> {profile.location || 'Remote'}
                            </p>
                        </div>
                        
                        <div className="flex gap-2">
                            {/* Feature 15 & 16: Action Buttons */}
                            <button onClick={handleStartChat} className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition" title="Message">
                                <MessageSquare className="w-5 h-5"/>
                            </button>
                            <button onClick={handleVideoCall} className="p-3 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 transition" title="Video Interview">
                                <Video className="w-5 h-5"/>
                            </button>
                             <button onClick={() => setEditMode(!editMode)} className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition" title="Edit Profile">
                                <Edit3 className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>

                    {/* Feature 1: CV Upload & Download */}
                    <div className="mt-8 border-t dark:border-gray-700 pt-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5"/> Professional CV</h3>
                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            {cvFile ? (
                                <div className="flex-1 flex justify-between items-center">
                                    <span className="text-sm font-medium text-blue-600">{cvFile.name}</span>
                                    <button className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg font-bold flex items-center gap-1">
                                        <Download className="w-3 h-3"/> Download CV
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1">
                                    <label className="cursor-pointer flex items-center gap-2 text-gray-500 hover:text-blue-600 transition">
                                        <UploadCloud className="w-5 h-5"/>
                                        <span className="text-sm font-medium">Upload PDF Resume</span>
                                        <input type="file" accept=".pdf" className="hidden" onChange={handleCVUpload}/>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mt-8 mb-8">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-center">
                            <div className="text-2xl font-bold text-yellow-500">{profile.rating || '5.0'}</div>
                            <div className="text-xs text-gray-400 uppercase font-bold mb-1">Rating</div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-center">
                            <div className="text-2xl font-bold text-blue-500">{profile.reviews || 0}</div>
                            <div className="text-xs text-gray-400 uppercase font-bold mb-1">Jobs Done</div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-center">
                            <div className="text-2xl font-bold text-green-500">{profile.verified ? '100%' : '50%'}</div>
                            <div className="text-xs text-gray-400 uppercase font-bold mb-1">Trust Score</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RequestForm({ onSubmit, onCancel, darkMode }) {
    const [f, setF] = useState({ machine: '', machineType: 'CNC Machine', issue: '', budget: '', location: '' });
    // Feature 6: Contract Jobs State
    const [jobType, setJobType] = useState('standard'); // 'standard' or 'contract'

    // Feature 8: Global DB vs My Fleet Data
    const myFleet = ['CNC Lathe X200', 'Hydraulic Press HP5', 'Cooling Unit 09'];
    const globalDB = ['Industrial Mixer', 'Conveyor Belt System', 'Robotic Arm v4', 'Generator 500kW'];

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">New Maintenance Request</h2>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><XCircle className="w-6 h-6"/></button>
                </div>
                
                {/* Feature 6: Job Type Toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mb-6">
                    <button onClick={() => setJobType('standard')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${jobType === 'standard' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}>One-Time Fix</button>
                    <button onClick={() => setJobType('contract')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${jobType === 'contract' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}>Long-Term Contract</button>
                </div>

                <div className="space-y-4">
                    {/* Feature 8: Machine Selector with Optgroups */}
                    <div>
                        <label className="text-xs text-gray-500 font-bold uppercase ml-1">Target Machine</label>
                        <select className="w-full p-3 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500" onChange={e=>setF({...f, machine: e.target.value})}>
                            <option value="">Select Equipment...</option>
                            <optgroup label="My Fleet (Registered)">
                                {myFleet.map(m => <option key={m} value={m}>{m}</option>)}
                            </optgroup>
                            <optgroup label="Global Database">
                                {globalDB.map(m => <option key={m} value={m}>{m}</option>)}
                            </optgroup>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 font-bold uppercase ml-1">Issue Description</label>
                        <textarea rows="3" className="w-full p-3 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe the malfunction..." onChange={e=>setF({...f, issue: e.target.value})}/>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase ml-1">Budget ($)</label>
                            <input type="number" className="w-full p-3 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="500" onChange={e=>setF({...f, budget: e.target.value})}/>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase ml-1">Location</label>
                            <input className="w-full p-3 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="City, State" onChange={e=>setF({...f, location: e.target.value})}/>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={onCancel} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-xl font-medium transition">Cancel</button>
                    <button onClick={()=>onSubmit({...f, type: jobType})} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">
                        {jobType === 'contract' ? 'Post Contract Job' : 'Post Request'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function OfferForm({ onSubmit, onCancel, darkMode }) {
    const [f, setF] = useState({ price: '', timeline: '', description: '', startDate: '' }); // Initialized with empty strings
    return <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"><div className="bg-white dark:bg-gray-800 p-8 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in-up"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Submit Proposal</h2><button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><XCircle className="w-6 h-6"/></button></div><div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-gray-500 font-bold uppercase ml-1">Your Price ($)</label><input type="number" className="w-full p-3 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-green-500" placeholder="0.00" onChange={e=>setF({...f, price: e.target.value})}/></div><div><label className="text-xs text-gray-500 font-bold uppercase ml-1">Est. Days</label><input className="w-full p-3 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-green-500" placeholder="Days" onChange={e=>setF({...f, timeline: e.target.value})}/></div></div>{/* NEW: Start Date */}<div><label className="text-xs text-gray-500 font-bold uppercase ml-1">Proposed Start Date</label><input type="date" className="w-full p-3 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-green-500" onChange={e=>setF({...f, startDate: e.target.value})}/></div><div><label className="text-xs text-gray-500 font-bold uppercase ml-1">Repair Plan</label><textarea rows="4" className="w-full p-3 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-green-500" placeholder="Detail your approach..." onChange={e=>setF({...f, description: e.target.value})}/></div></div><div className="flex gap-3 mt-8"><button onClick={onCancel} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-medium transition">Cancel</button><button onClick={()=>onSubmit(f)} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-600/20">Submit Offer</button></div></div></div>
}

function ContractTemplateModal({ onCreate, onCancel, darkMode }) {
    return <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"><div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-md shadow-2xl"><h2 className="text-xl font-bold mb-4">Select Contract Type</h2><div className="space-y-3"><button onClick={()=>onCreate('Standard')} className="w-full p-4 border dark:border-gray-700 rounded-xl text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 transition group"><div className="font-bold text-blue-600 group-hover:text-blue-700">Standard Repair Agreement</div><div className="text-xs text-gray-500 mt-1">Basic liability and payment terms.</div></button><button onClick={()=>onCreate('Warranty')} className="w-full p-4 border dark:border-gray-700 rounded-xl text-left hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 transition group"><div className="font-bold text-green-600 group-hover:text-green-700">Warranty Included</div><div className="text-xs text-gray-500 mt-1">Includes 30-day post-repair guarantee.</div></button><button onClick={()=>onCreate('Emergency')} className="w-full p-4 border dark:border-gray-700 rounded-xl text-left hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition group"><div className="font-bold text-red-600 group-hover:text-red-700">Emergency Response</div><div className="text-xs text-gray-500 mt-1">Expedited service terms and premiums.</div></button></div><button onClick={onCancel} className="w-full mt-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">Cancel</button></div></div>
}

function ReviewModal({ data, onSubmit, onCancel }) {
    const [rating, setRating] = useState(5);
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl w-full max-w-sm shadow-2xl text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600"><ThumbsUp className="w-8 h-8"/></div>
                <h2 className="text-2xl font-bold mb-2">Job Completed!</h2>
                <p className="text-gray-500 mb-6">Please rate the engineer's work.</p>
                <div className="flex justify-center gap-2 mb-8">
                    {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={()=>setRating(s)} className={`transition ${s<=rating ? 'text-yellow-500 scale-110' : 'text-gray-300'}`}><Star className="w-8 h-8 fill-current"/></button>
                    ))}
                </div>
                <button onClick={()=>onSubmit(rating)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Submit Review</button>
            </div>
        </div>
    )
}

function LandingPage({ onRegister, onLogin, authReady, onSocialLogin }) {
    const [isLogin, setIsLogin] = useState(false);
    const [type, setType] = useState('company');
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const handleSubmit = (e) => { e.preventDefault(); isLogin ? onLogin(form.email, form.password) : onRegister(form.email, form.password, type, form.name); };
    return (
        <div className="min-h-screen bg-slate-900 flex text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600 rounded-full blur-[100px]"></div>
                <div className="absolute top-1/2 right-0 w-80 h-80 bg-purple-600 rounded-full blur-[100px]"></div>
            </div>

            <div className="container mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-center relative z-10">
                <div className="md:w-1/2 mb-12 md:mb-0 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/50 border border-blue-700 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-6">
                        <Star className="w-3 h-3 fill-current" /> The #1 Maintenance Platform
                    </div>
                    <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
                        Fix Industrial <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Issues Instantly.</span>
                    </h1>
                    <p className="text-lg text-gray-400 mb-8 max-w-lg mx-auto md:mx-0">
                        RepairHub connects industrial companies with certified maintenance engineers. Post requests, get offers, and sign contracts securely.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm text-gray-500">
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> Verified Engineers</div>
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> Secure Escrow</div>
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> Smart Contracts</div>
                    </div>
                </div>

                <div className="md:w-1/2 max-w-md w-full">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold">{isLogin ? 'Welcome Back' : 'Get Started'}</h2>
                            <p className="text-gray-400 text-sm mt-1">{isLogin ? 'Enter your credentials to access your dashboard' : 'Join thousands of companies and engineers'}</p>
                        </div>

                        {/* NEW: Social Login Buttons */}
                        <div className="flex justify-center gap-4 mb-6">
                            <button onClick={() => onSocialLogin('Google')} className="bg-white text-gray-900 p-3 rounded-full hover:bg-gray-100 transition shadow-md">
                                <GoogleIcon className="w-5 h-5"/>
                            </button>
                            <button onClick={() => onSocialLogin('GitHub')} className="bg-gray-800 text-white p-3 rounded-full hover:bg-gray-700 transition shadow-md border border-gray-700">
                                <GithubIcon className="w-5 h-5"/>
                            </button>
                            <button onClick={() => onSocialLogin('Microsoft')} className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition shadow-md">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/></svg>
                            </button>
                        </div>

                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
                            <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-900 text-gray-500">Or continue with email</span></div>
                        </div>

                        {!isLogin && (
                            <div className="flex p-1 bg-white/5 rounded-xl mb-6">
                                {['company', 'engineer'].map(t => (
                                    <button key={t} onClick={() => setType(t)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${type === t ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>{t}</button>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!isLogin && (
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 ml-1">Full Name</label>
                                    <input className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" placeholder="e.g. Acme Industries" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 ml-1">Email Address</label>
                                <input className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" type="email" placeholder="name@company.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 ml-1">Password</label>
                                <input className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
                            </div>
                            
                            <button disabled={!authReady} className={`w-full py-3.5 rounded-xl font-bold text-white transition-all transform active:scale-95 shadow-lg ${authReady ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500' : 'bg-gray-700 cursor-not-allowed'}`}>{authReady ? (isLogin ? 'Sign In' : 'Create Free Account') : 'Connecting...'}</button>
                        </form>

                        <div className="mt-6 text-center">
                            <button onClick={() => setIsLogin(!isLogin)} className="text-blue-400 text-sm hover:text-blue-300 transition">
                                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// [COMPONENT] Settings & Help Module
export function SettingsModal({ onClose, user, language, setLanguage, darkMode }) {
  const tutorials = [
    { title: "How to Post a Request", content: "Click the 'Post Request' button, select your machine type from the Global Database or your Fleet, and describe the issue." },
    { title: "Verifying Your Account", content: "Upload your trade license or certification in the Profile tab to get the Blue Badge." },
    { title: "Using AI Diagnostics", content: "Navigate to the 'Troubleshooter' tab and describe the symptoms to get a 3D simulation." }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-2xl p-6 rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6"/> Settings & Help</h2>
          <button onClick={onClose}><XCircle className="w-6 h-6 text-gray-400 hover:text-red-500 transition"/></button>
        </div>

        <div className="overflow-y-auto pr-2 space-y-8">
          {/* Account Section */}
          <section>
            <h3 className="text-sm font-bold uppercase text-gray-500 mb-3 flex items-center gap-2"><User className="w-4 h-4"/> Account Management</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <button onClick={() => alert("Edit Profile Module Opening...")} className="p-4 border dark:border-gray-700 rounded-xl flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><Edit3 className="w-5 h-5"/></div>
                <div><div className="font-bold">Edit Profile</div><div className="text-xs text-gray-500">Update name & bio</div></div>
              </button>
              <button onClick={() => alert("Password Change Email Sent.")} className="p-4 border dark:border-gray-700 rounded-xl flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600"><Key className="w-5 h-5"/></div>
                <div><div className="font-bold">Security</div><div className="text-xs text-gray-500">Change password</div></div>
              </button>
            </div>
          </section>

          {/* Language Section */}
          <section>
            <h3 className="text-sm font-bold uppercase text-gray-500 mb-3 flex items-center gap-2"><Globe className="w-4 h-4"/> Language / Langue / اللغة</h3>
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
              {['en', 'fr', 'ar'].map(lang => (
                <button 
                  key={lang} 
                  onClick={() => setLanguage(lang)}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition capitalize ${language === lang ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {lang === 'en' ? 'English' : lang === 'fr' ? 'Français' : 'العربية'}
                </button>
              ))}
            </div>
          </section>

          {/* Tutorials Section */}
          <section>
            <h3 className="text-sm font-bold uppercase text-gray-500 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4"/> Tutorials</h3>
            <div className="space-y-2">
              {tutorials.map((t, i) => (
                <div key={i} className="border dark:border-gray-700 rounded-xl overflow-hidden">
                  <details className="group">
                    <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <span>{t.title}</span>
                      <span className="transition group-open:rotate-180"><ChevronDown className="w-4 h-4"/></span>
                    </summary>
                    <div className="text-gray-600 dark:text-gray-300 p-4 pt-0 text-sm leading-relaxed border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      {t.content}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 pt-4 border-t dark:border-gray-700 text-center">
          <p className="text-xs text-gray-400">RepairHub v3.1 • {language.toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
}

// [COMPONENT] Advanced Premium Subscription Cards 
export function PremiumOfferCards({ onSelect, currentPlan }) {
  const plans = [
    { 
      id: '3mo', 
      title: 'Quarterly', 
      duration: '3 Months', 
      price: 87, 
      originalPrice: 116, 
      label: '1 Month Free', 
      color: 'blue' 
    },
    { 
      id: '6mo', 
      title: 'Biannual', 
      duration: '6 Months', 
      price: 174, 
      originalPrice: 232, 
      label: '2 Months Free', 
      color: 'purple' 
    },
    { 
      id: '1yr', 
      title: 'Annual', 
      duration: '1 Year', 
      price: 261, 
      originalPrice: 435, 
      label: '3 Months Free + Discount', 
      color: 'orange' 
    }
  ];

  // Lookup table to solve dynamic Tailwind class issue
  const colorVariants = {
    blue: { border: 'border-blue-500', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-900/20', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-50', darkBg: 'dark:bg-purple-900/20', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-50', darkBg: 'dark:bg-orange-900/20', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700' }
  };

  return (
    <div className="grid gap-3 md:grid-cols-3 mb-6">
      {plans.map(plan => {
        const colors = colorVariants[plan.color];
        return (
          <div 
            key={plan.id} 
            onClick={() => onSelect(plan.id)}
            className={`relative p-4 border-2 rounded-xl cursor-pointer transition hover:scale-105 ${currentPlan === plan.id ? `${colors.border} ${colors.bg} ${colors.darkBg}` : 'border-gray-100 dark:border-gray-700'}`}
          >
            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap ${colors.badgeBg} ${colors.badgeText}`}>
              {plan.label}
            </div>
            <div className="text-center mt-2">
              <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm">{plan.duration}</h4>
              <div className="flex items-center justify-center gap-2 my-1">
                <span className="text-gray-400 line-through text-xs">${plan.originalPrice}</span>
                <span className="text-xl font-extrabold text-gray-900 dark:text-white">${plan.price}</span>
              </div>
              <p className="text-[10px] text-gray-500">Billed once</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- MOUNT THE APP ---
const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(<RepairMarketplace />);
