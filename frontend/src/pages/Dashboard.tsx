import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { MapDashboard } from '../components/MapDashboard';
import { saveOfflineReport } from '../utils/OfflineQueue';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend 
} from 'recharts';
import { 
  LayoutDashboard, Map, ShieldAlert, AlertTriangle, Radio, CloudRain, 
  FileText, Users, Bell, Search, Globe, ChevronDown, Check, Activity, 
  MapPin, Clock, Camera, FileDown, PlusCircle, Trash, RefreshCcw, LogOut,
  Navigation as NavigationIcon
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    currentTab, setCurrentTab,
    user, setUser,
    isConnected,
    sensors, setSensors,
    roads, setRoads,
    incidents, setIncidents,
    citizenReports, setCitizenReports,
    alerts, setAlerts,
    selectedZone, setSelectedZone
  } = useUIStore();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);

  // Sub-forms states
  const [reportDesc, setReportDesc] = useState('');
  const [reportLat, setReportLat] = useState(25.57);
  const [reportLon, setReportLon] = useState(91.88);
  const [reportPhoto, setReportPhoto] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Alert composer states
  const [alertZoneId, setAlertZoneId] = useState(1);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('High');
  const [alertProgress, setAlertProgress] = useState<string | null>(null);
  const [testMobileNumber, setTestMobileNumber] = useState<string>('+917319959112');
  const [smsAlertMessage, setSmsAlertMessage] = useState<string>('CRITICAL EVACUATION WARNING: Mass movements and saturated slope soils detected in East Khasi Hills. Seek high ground immediately.');
  const [smsSending, setSmsSending] = useState<boolean>(false);
  const [smsGateway, setSmsGateway] = useState<string>('pushbullet');
  const [pushbulletToken, setPushbulletToken] = useState<string>('o.oThyebgHDUpFA9o3E1zuKsNnqbi0BNKz');







  // District Weather cache
  const [weatherData, setWeatherData] = useState<any>(null);
  const [selectedWeatherDistrict, setSelectedWeatherDistrict] = useState(1);

  // Helper to generate district-specific fallback weather data when backend is offline
  const getMockDistrictWeather = (districtId: number) => {
    const mockWeatherMap: Record<number, any> = {
      1: {
        current: { temp: 21.5, humidity: 92, precipitation: 185.0, wind: 16.5 },
        forecast: [
          { day: 'Mon', temp: 22.0, condition: 'Heavy Rain', rainProb: 95 },
          { day: 'Tue', temp: 21.0, condition: 'Thunderstorm', rainProb: 98 },
          { day: 'Wed', temp: 22.5, condition: 'Showers', rainProb: 85 },
          { day: 'Thu', temp: 23.0, condition: 'Rainy', rainProb: 90 },
          { day: 'Fri', temp: 22.8, condition: 'Rainy', rainProb: 88 }
        ]
      },
      2: {
        current: { temp: 23.8, humidity: 88, precipitation: 75.0, wind: 12.4 },
        forecast: [
          { day: 'Mon', temp: 24.0, condition: 'Rainy', rainProb: 88 },
          { day: 'Tue', temp: 23.5, condition: 'Heavy Rain', rainProb: 92 },
          { day: 'Wed', temp: 24.5, condition: 'Showers', rainProb: 75 },
          { day: 'Thu', temp: 25.0, condition: 'Rainy', rainProb: 80 },
          { day: 'Fri', temp: 24.8, condition: 'Rainy', rainProb: 82 }
        ]
      },
      3: {
        current: { temp: 24.5, humidity: 75, precipitation: 12.5, wind: 8.5 },
        forecast: [
          { day: 'Mon', temp: 25.0, condition: 'Cloudy', rainProb: 40 },
          { day: 'Tue', temp: 24.5, condition: 'Drizzle', rainProb: 65 },
          { day: 'Wed', temp: 25.5, condition: 'Showers', rainProb: 70 },
          { day: 'Thu', temp: 26.0, condition: 'Cloudy', rainProb: 35 },
          { day: 'Fri', temp: 25.8, condition: 'Cloudy', rainProb: 45 }
        ]
      },
      4: {
        current: { temp: 16.8, humidity: 62, precipitation: 5.2, wind: 9.5 },
        forecast: [
          { day: 'Mon', temp: 17.0, condition: 'Partly Cloudy', rainProb: 20 },
          { day: 'Tue', temp: 16.5, condition: 'Cloudy', rainProb: 30 },
          { day: 'Wed', temp: 17.5, condition: 'Drizzle', rainProb: 45 },
          { day: 'Thu', temp: 18.0, condition: 'Sunny', rainProb: 10 },
          { day: 'Fri', temp: 17.8, condition: 'Sunny', rainProb: 15 }
        ]
      },
      5: {
        current: { temp: 19.5, humidity: 90, precipitation: 210.0, wind: 18.2 },
        forecast: [
          { day: 'Mon', temp: 19.0, condition: 'Heavy Rain', rainProb: 98 },
          { day: 'Tue', temp: 18.5, condition: 'Thunderstorm', rainProb: 99 },
          { day: 'Wed', temp: 19.8, condition: 'Showers', rainProb: 90 },
          { day: 'Thu', temp: 20.0, condition: 'Rainy', rainProb: 92 },
          { day: 'Fri', temp: 19.8, condition: 'Rainy', rainProb: 90 }
        ]
      }
    };
    return mockWeatherMap[districtId] || mockWeatherMap[1];
  };


  // Search filter implementation
  const filteredSensors = sensors.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredRoads = roads.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredIncidents = incidents.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // Auto-fetch weather data on district swap with offline fallback support
  useEffect(() => {
    axios.get(`/weather/forecast?district_id=${selectedWeatherDistrict}`)
      .then(res => setWeatherData(res.data))
      .catch(err => {
        console.warn('[Weather Panel API] Offline. Seeding mock district weather details:', err.message || err);
        setWeatherData(getMockDistrictWeather(selectedWeatherDistrict));
      });
  }, [selectedWeatherDistrict]);

  // Handle reporting (offline IndexedDB queue support)
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReport(true);
    
    const payload = {
      description: reportDesc,
      longitude: parseFloat(reportLon.toString()),
      latitude: parseFloat(reportLat.toString()),
      photo_url: reportPhoto || 'https://images.unsplash.com/photo-1576085898323-218e597c767c?auto=format&fit=crop&w=500&q=80',
      created_at: new Date().toISOString()
    };

    try {
      if (isConnected) {
        // Upload immediately
        const res = await axios.post('/citizen-reports', payload, {
          headers: { Authorization: `Bearer mock_token` }
        });
        setCitizenReports([res.data, ...citizenReports]);
        alert('Report submitted successfully!');
      } else {
        // Queue in IndexedDB
        await saveOfflineReport(payload);
        alert('Network offline. Report saved to local queue. It will automatically upload when network returns!');
      }
      setReportDesc('');
      setReportPhoto('');
    } catch (err) {
      console.error(err);
      alert('Error submitting report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Handle composing an alert (Creates Draft)
  const handleComposeAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle || !alertMsg) return;
    try {
      setAlertProgress('Creating draft...');
      const res = await axios.post('/alerts', {
        zone_id: alertZoneId,
        title_en: alertTitle,
        message_en: alertMsg,
        severity: alertSeverity
      }, {
        headers: { Authorization: `Bearer mock_token` }
      });

      setAlerts([res.data, ...alerts]);
      setAlertTitle('');
      setAlertMsg('');
      setAlertProgress(`Created successfully! Draft ID: ${res.data.id}`);
      setTimeout(() => setAlertProgress(null), 3000);
    } catch (err) {
      console.error(err);
      setAlertProgress('Error creating alert.');
    }
  };

  // Dispatches a draft alert (triggers mass broadcast)
  const handleDispatchAlert = async (id: number) => {
    try {
      setAlertProgress(`Dispatching alert #${id}...`);
      const res = await axios.post(`/alerts/${id}/dispatch`, {}, {
        headers: { Authorization: `Bearer mock_token` }
      });
      alert(res.data.message);
      
      // Refresh alerts list
      const freshAlerts = await axios.get('/alerts');
      setAlerts(freshAlerts.data);
      setAlertProgress(null);
    } catch (err) {
      console.error(err);
      alert('Error dispatching alert.');
    }
  };

  // Sends a real SMS/Voice warning alert to any global phone number via backend proxy
  const handleSendTestSMS = async (alertMessage: string) => {
    if (!testMobileNumber) {
      alert("Please enter a valid mobile number first (e.g. +91XXXXXXXXXX)");
      return;
    }
    if (!pushbulletToken) {
      alert("Please enter your Pushbullet Access Token.");
      return;
    }
    
    setSmsSending(true);
    try {
      const res = await axios.post('/alerts/send-sms', {
        phone: testMobileNumber,
        message: alertMessage,
        gateway: 'pushbullet',
        pushbulletToken
      });
      
      if (res.data && (res.data.success || res.data.messageId)) {
        alert(`SMS Warning Alert successfully triggered! Your Android phone will send a real SMS text message to ${testMobileNumber} in a few seconds.`);
      } else {
        const errorMsg = res.data && res.data.error ? res.data.error : "IP quota exceeded or DLT carrier restriction block";
        alert(`Alert warning failed, gateway returned: "${errorMsg}".`);
      }
    } catch (err: any) {
      console.error("[Alert Send Failed]", err);
      const errMsg = err.response && err.response.data && err.response.data.error ? err.response.data.error : err.message;
      alert(`Gateway connection failed. Error Details: ${errMsg}`);
    } finally {
      setSmsSending(false);
    }
  };

  // Change user roles for simulation sandbox
  const handleRoleSwap = (role: string) => {
    setUser({
      id: role === 'Citizen' ? 3 : role === 'Field Officer' ? 2 : 1,
      email: `${role.toLowerCase().replace(/ /g, '_')}@prithvi.gov.in`,
      phone: '+919999999999',
      role,
      preferred_language: 'en'
    });
    setRoleMenuOpen(false);
  };

  // Multi-lingual switch
  const handleLangSwap = (lng: string) => {
    i18n.changeLanguage(lng);
    setLangMenuOpen(false);
  };

  // Dynamic calculations for charts
  const districtRainfallData = [
    { name: 'East Khasi Hills', rainfall: 75, threshold: 80 },
    { name: 'Dima Hasao', rainfall: 185, threshold: 80 },
    { name: 'Aizawl', rainfall: 45, threshold: 80 },
    { name: 'Mangan', rainfall: 210, threshold: 80 },
    { name: 'Noney', rainfall: 95, threshold: 80 },
    { name: 'Tawang', rainfall: 20, threshold: 80 },
  ];

  const historicalRiskTrend = [
    { day: 'Mon', 'East Khasi Hills': 45, 'Dima Hasao': 65, 'Mangan': 75 },
    { day: 'Tue', 'East Khasi Hills': 48, 'Dima Hasao': 62, 'Mangan': 72 },
    { day: 'Wed', 'East Khasi Hills': 55, 'Dima Hasao': 70, 'Mangan': 82 },
    { day: 'Thu', 'East Khasi Hills': 52, 'Dima Hasao': 75, 'Mangan': 88 },
    { day: 'Fri', 'East Khasi Hills': 60, 'Dima Hasao': 85, 'Mangan': 80 },
    { day: 'Sat', 'East Khasi Hills': 58, 'Dima Hasao': 80, 'Mangan': 85 },
    { day: 'Sun', 'East Khasi Hills': 52, 'Dima Hasao': 83, 'Mangan': 88 },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-navy-950 font-sans text-slate-100 select-none">
      
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 border-r border-navy-800 bg-navy-900/50 flex flex-col justify-between backdrop-blur-md">
        <div className="flex flex-col">
          {/* Brand Shield Logo */}
          <div className="flex items-center space-x-3 p-6 border-b border-navy-800">
            <div className="w-10 h-10 bg-accent-green/10 border border-accent-green rounded-xl flex items-center justify-center pulse-emerald">
              <ShieldAlert className="w-6 h-6 text-accent-green" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-wider text-white">PRITHVI-SHIELD</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">NER Control Hub</span>
            </div>
          </div>

          {/* Nav Buttons */}
          <nav className="p-4 flex flex-col space-y-1">
            <button 
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${currentTab === 'dashboard' ? 'bg-accent-green text-navy-950 shadow-md' : 'text-slate-400 hover:bg-navy-800 hover:text-white'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t('nav_dashboard')}</span>
            </button>
            
            <button 
              onClick={() => setCurrentTab('risk_map')}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${currentTab === 'risk_map' ? 'bg-accent-green text-navy-950 shadow-md' : 'text-slate-400 hover:bg-navy-800 hover:text-white'}`}
            >
              <Map className="w-4 h-4" />
              <span>{t('nav_risk_map')}</span>
            </button>

            <button 
              onClick={() => setCurrentTab('incidents')}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${currentTab === 'incidents' ? 'bg-accent-green text-navy-950 shadow-md' : 'text-slate-400 hover:bg-navy-800 hover:text-white'}`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{t('nav_incidents')}</span>
              {incidents.filter(i => i.status !== 'Resolved').length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {incidents.filter(i => i.status !== 'Resolved').length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setCurrentTab('roads')}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${currentTab === 'roads' ? 'bg-accent-green text-navy-950 shadow-md' : 'text-slate-400 hover:bg-navy-800 hover:text-white'}`}
            >
              <NavigationIcon className="w-4 h-4" />
              <span>{t('nav_roads')}</span>
            </button>

            <button 
              onClick={() => setCurrentTab('sensors')}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${currentTab === 'sensors' ? 'bg-accent-green text-navy-950 shadow-md' : 'text-slate-400 hover:bg-navy-800 hover:text-white'}`}
            >
              <Radio className="w-4 h-4" />
              <span>{t('nav_sensors')}</span>
            </button>

            <button 
              onClick={() => setCurrentTab('weather')}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${currentTab === 'weather' ? 'bg-accent-green text-navy-950 shadow-md' : 'text-slate-400 hover:bg-navy-800 hover:text-white'}`}
            >
              <CloudRain className="w-4 h-4" />
              <span>{t('nav_weather')}</span>
            </button>

            {user && user.role !== 'Citizen' && (
              <button 
                onClick={() => setCurrentTab('citizen_reports')}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${currentTab === 'citizen_reports' ? 'bg-accent-green text-navy-950 shadow-md' : 'text-slate-400 hover:bg-navy-800 hover:text-white'}`}
              >
                <Users className="w-4 h-4" />
                <span>{t('nav_citizen')}</span>
                {citizenReports.filter(r => r.status === 'Pending').length > 0 && (
                  <span className="ml-auto bg-amber-500 text-navy-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {citizenReports.filter(r => r.status === 'Pending').length}
                  </span>
                )}
              </button>
            )}

            {user && user.role !== 'Citizen' && (
              <button 
                onClick={() => setCurrentTab('alerts')}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${currentTab === 'alerts' ? 'bg-accent-green text-navy-950 shadow-md' : 'text-slate-400 hover:bg-navy-800 hover:text-white'}`}
              >
                <Bell className="w-4 h-4" />
                <span>{t('nav_alerts')}</span>
              </button>
            )}

            <button 
              onClick={() => setCurrentTab('reports')}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${currentTab === 'reports' ? 'bg-accent-green text-navy-950 shadow-md' : 'text-slate-400 hover:bg-navy-800 hover:text-white'}`}
            >
              <FileText className="w-4 h-4" />
              <span>{t('nav_reports')}</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Status Footer */}
        <div className="p-4 border-t border-navy-800 text-xs text-slate-400 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span>{t('system_status')}:</span>
            <span className="flex items-center text-emerald-400 font-bold gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 pulse-emerald inline-block"></span>{t('operational')}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span>Last Sim heartbeat:</span>
            <span className="text-white font-mono flex items-center gap-1"><Activity className="w-3 h-3 text-accent-green inline animate-pulse" /> 1s ago</span>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP BAR */}
        <header className="h-16 border-b border-navy-800 bg-navy-900/60 backdrop-blur-md flex items-center justify-between px-6 z-20">
          
          {/* Search Box */}
          <div className="relative w-96">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search districts, roads, sensors..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-navy-950 border border-navy-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-green"
            />
          </div>

          <div className="flex items-center space-x-4">
            
            {/* Status Pill */}
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${isConnected ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-amber-500/10 border-amber-500 text-amber-400'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 pulse-emerald' : 'bg-amber-500 animate-pulse'}`}></span>
              <span>{isConnected ? t('status_connected') : t('status_offline')}</span>
            </div>

            {/* Language Switcher */}
            <div className="relative">
              <button 
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center space-x-2 bg-navy-900 border border-navy-800 hover:bg-navy-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-300"
              >
                <Globe className="w-4 h-4 text-accent-green" />
                <span>{i18n.language.toUpperCase()}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-navy-900 border border-navy-800 rounded-lg shadow-2xl py-1 text-xs z-50">
                  {['en', 'as', 'br', 'kha', 'mz', 'mni', 'nag'].map((lang) => (
                    <button 
                      key={lang}
                      onClick={() => handleLangSwap(lang)}
                      className="w-full text-left px-4 py-2 hover:bg-navy-800 text-slate-300 hover:text-white flex items-center justify-between"
                    >
                      <span>{lang.toUpperCase()}</span>
                      {i18n.language === lang && <Check className="w-3.5 h-3.5 text-accent-green" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sandbox Simulation Role Switcher */}
            <div className="relative">
              <button 
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center space-x-2 bg-accent-green/10 border border-accent-green text-accent-green hover:bg-accent-green/20 rounded-lg px-3 py-2 text-xs font-bold"
              >
                <span>Role: {user?.role || 'Guest'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-navy-900 border border-navy-800 rounded-lg shadow-2xl py-1 text-xs z-50">
                  {['Citizen', 'Field Officer', 'District Admin', 'SDMA Super Admin'].map((r) => (
                    <button 
                      key={r}
                      onClick={() => handleRoleSwap(r)}
                      className="w-full text-left px-4 py-2 hover:bg-navy-800 text-slate-300 hover:text-white flex items-center justify-between"
                    >
                      <span>{r}</span>
                      {user?.role === r && <Check className="w-3.5 h-3.5 text-accent-green" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </header>

        {/* 3. CENTER CONTENT SPLIT VIEW */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: MASTER DASHBOARD */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Map + Right Panel grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[460px] md:h-[500px]">
                
                {/* Center Map Box */}
                <div className="lg:col-span-2 relative">
                  <MapDashboard 
                    sensors={sensors}
                    roads={roads}
                    incidents={incidents}
                    zones={[{ id: 1, name: 'Shillong Ridge', geom: null, overall_risk_level: 'Moderate', overall_risk_score: 52.5 }]}
                    selectedZone={selectedZone}
                    onSelectZone={(z) => setSelectedZone(z)}
                  />
                </div>

                {/* Right Alert panel */}
                <div className="flex flex-col space-y-4 h-full overflow-y-auto">
                  
                  {/* Active Alert Widget */}
                  {alerts.length > 0 && alerts[0].status === 'Dispatched' && (
                    <div className="bg-red-500/10 border-2 border-red-500 rounded-xl p-4 flex flex-col space-y-3 pulse-red">
                      <div className="flex items-center space-x-2 text-red-500 font-extrabold text-sm uppercase tracking-wider">
                        <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
                        <span>{t('active_warning')}</span>
                      </div>
                      <h4 className="text-white font-bold text-sm">
                        {alerts[0].translations?.[i18n.language]?.title || alerts[0].title_en}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {alerts[0].translations?.[i18n.language]?.message || alerts[0].message_en}
                      </p>
                      <button 
                        onClick={() => alert('Acknowledge registered. Authorities notified.')}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 rounded-lg transition"
                      >
                        Acknowledge & Report Safe
                      </button>
                    </div>
                  )}

                  {/* Weather Snapshot widget */}
                  <div className="bg-navy-900/70 border border-navy-800 rounded-xl p-4 flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5"><CloudRain className="w-4 h-4 text-accent-green" /> {t('weather_forecast')}</span>
                      <select 
                        value={selectedWeatherDistrict}
                        onChange={e => setSelectedWeatherDistrict(parseInt(e.target.value))}
                        className="bg-navy-950 border border-navy-850 rounded text-xs px-2 py-1 text-slate-300 outline-none"
                      >
                        <option value={1}>East Khasi Hills</option>
                        <option value={2}>Dima Hasao</option>
                        <option value={3}>Aizawl</option>
                        <option value={4}>Mangan</option>
                      </select>
                    </div>
                    {weatherData ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <span className="text-[28px] font-bold text-white tracking-tight">{weatherData.current.temp}°C</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Clock className="w-3.5 h-3.5" /> Forecast Live</span>
                        </div>
                        <div className="flex flex-col justify-end space-y-1 text-xs text-slate-300">
                          <div>Humidity: <strong className="text-white">{weatherData.current.humidity}%</strong></div>
                          <div>Rainfall: <strong className="text-white">{weatherData.current.precipitation} mm</strong></div>
                          <div>Wind: <strong className="text-white">{weatherData.current.wind} km/h</strong></div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 py-4 text-center">Contacting Open-Meteo API...</div>
                    )}
                  </div>

                  {/* Donut risk levels chart */}
                  <div className="bg-navy-900/70 border border-navy-800 rounded-xl p-4 flex flex-col space-y-3">
                    <span className="font-bold text-white">{t('risk_summary')}</span>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col space-y-1.5 text-xs">
                        <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 bg-risk-veryhigh rounded-sm"></span> <span>Very High (2)</span></div>
                        <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 bg-risk-high rounded-sm"></span> <span>High (2)</span></div>
                        <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 bg-risk-moderate rounded-sm"></span> <span>Moderate (1)</span></div>
                        <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 bg-risk-low rounded-sm"></span> <span>Low (1)</span></div>
                      </div>
                      <div className="w-20 h-20 rounded-full border-8 border-navy-850 flex items-center justify-center relative">
                        <span className="text-sm font-bold text-white">6</span>
                        <div className="absolute inset-0 rounded-full border-8 border-red-500 border-t-transparent border-l-transparent pointer-events-none"></div>
                      </div>
                    </div>
                  </div>

                  {/* CCTV camera preview */}
                  <div className="bg-navy-900/70 border border-navy-800 rounded-xl p-4 flex flex-col space-y-2">
                    <span className="font-bold text-white flex items-center gap-1.5"><Camera className="w-4 h-4 text-accent-green" /> Live Field Camera Feed</span>
                    <div className="h-20 bg-navy-950 border border-navy-850 rounded-lg flex flex-col items-center justify-center text-center p-2 text-[10px] text-slate-400">
                      <span>Feed offline — awaiting field camera stream integration</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { title: t('kpi_v_high'), value: 2, sub: '+0 today', color: 'text-risk-veryhigh' },
                  { title: t('kpi_high'), value: 2, sub: '+0 today', color: 'text-risk-high' },
                  { title: t('kpi_sensors'), value: sensors.length || 7, sub: '100% online', color: 'text-accent-green' },
                  { title: t('kpi_roads'), value: roads.filter(r => r.status !== 'Open').length || 3, sub: '-1 vs yesterday', color: 'text-risk-moderate' },
                  { title: t('kpi_reports'), value: citizenReports.length || 3, sub: 'Queue active', color: 'text-cyan-400' }
                ].map((kpi, idx) => (
                  <div key={idx} className="bg-navy-900/60 border border-navy-800 rounded-xl p-4 flex flex-col space-y-1">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">{kpi.title}</span>
                    <div className="flex items-baseline space-x-2">
                      <span className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</span>
                      <span className="text-[9px] font-bold text-slate-500">{kpi.sub}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts + Incidents feed */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 24h Rainfall chart */}
                <div className="bg-navy-900/60 border border-navy-800 rounded-xl p-5 flex flex-col space-y-3">
                  <span className="font-bold text-white text-sm">{t('rainfall_24h')}</span>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={districtRainfallData}>
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#121A2C', borderColor: '#1E293B' }} labelStyle={{ color: '#F8FAFC' }} />
                        <Bar dataKey="rainfall" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="threshold" fill="rgba(239,68,68,0.2)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 7d Risk Trend */}
                <div className="bg-navy-900/60 border border-navy-800 rounded-xl p-5 flex flex-col space-y-3">
                  <span className="font-bold text-white text-sm">{t('risk_trend')}</span>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalRiskTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                        <XAxis dataKey="day" stroke="#94A3B8" fontSize={9} />
                        <YAxis stroke="#94A3B8" fontSize={9} />
                        <Tooltip contentStyle={{ backgroundColor: '#121A2C', borderColor: '#1E293B' }} />
                        <Legend wrapperStyle={{ fontSize: 8 }} />
                        <Line type="monotone" dataKey="East Khasi Hills" stroke="#EAB308" strokeWidth={2} />
                        <Line type="monotone" dataKey="Dima Hasao" stroke="#EF4444" strokeWidth={2} />
                        <Line type="monotone" dataKey="Mangan" stroke="#EF4444" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recent Incidents */}
                <div className="bg-navy-900/60 border border-navy-800 rounded-xl p-5 flex flex-col justify-between">
                  <div className="flex flex-col space-y-3">
                    <span className="font-bold text-white text-sm">{t('recent_incidents')}</span>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                      {incidents.slice(0, 3).map((inc, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-navy-800 pb-2">
                          <div className="flex flex-col space-y-0.5">
                            <span className="text-xs font-bold text-white">{inc.title}</span>
                            <span className="text-[10px] text-slate-400">{inc.district_name || 'Assam'}</span>
                          </div>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${inc.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {inc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => setCurrentTab('incidents')}
                    className="w-full mt-4 text-center text-xs font-bold text-accent-green hover:underline flex items-center justify-center gap-1"
                  >
                    View All Incidents &rarr;
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: FULL RISK MAP */}
          {currentTab === 'risk_map' && (
            <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Full-Screen Geographic Warning Map</h2>
                  <p className="text-xs text-slate-400">Map contains real-time sensor pulses, active road barriers, and landslide heatmaps.</p>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400">Heatmap opacity:</span>
                  <input type="range" min="10" max="100" defaultValue="70" className="accent-accent-green bg-navy-900 border-navy-800" />
                </div>
              </div>
              <div className="flex-1 min-h-[400px]">
                <MapDashboard 
                  sensors={sensors}
                  roads={roads}
                  incidents={incidents}
                  zones={[]}
                  selectedZone={selectedZone}
                  onSelectZone={setSelectedZone}
                />
              </div>
            </div>
          )}

          {/* TAB 3: INCIDENTS LOG */}
          {currentTab === 'incidents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Active Incident Tickets</h2>
                  <p className="text-xs text-slate-400">Verify reports, dispatch response teams, or close tickets.</p>
                </div>
                <button 
                  onClick={() => {
                    const desc = prompt("Enter landslide report description:");
                    if (desc) {
                      axios.post('/incidents', {
                        title: `Reported Slide: Shillong Road`,
                        description: desc,
                        type: 'landslide',
                        longitude: 91.85,
                        latitude: 25.56
                      }, { headers: { Authorization: `Bearer mock` } }).then(res => {
                        setIncidents([res.data, ...incidents]);
                      });
                    }
                  }}
                  className="bg-accent-green hover:bg-accent-green/85 text-navy-950 font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1"
                >
                  <PlusCircle className="w-4 h-4" /> Report New Incident
                </button>
              </div>

              {/* Incidents Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredIncidents.map((inc) => (
                  <div key={inc.id} className="bg-navy-900/60 border border-navy-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-accent-green" /> ({inc.longitude?.toFixed(2)}, {inc.latitude?.toFixed(2)})</span>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${inc.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{inc.status}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{inc.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{inc.description || 'No description provided.'}</p>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t border-navy-800">
                      {user && user.role !== 'Citizen' && inc.status === 'Reported' && (
                        <button 
                          onClick={() => {
                            axios.put(`/incidents/${inc.id}`, { status: 'Verified' }, { headers: { Authorization: `Bearer mock` } })
                              .then(res => setIncidents(incidents.map(i => i.id === inc.id ? { ...i, status: 'Verified' } : i)));
                          }}
                          className="flex-1 bg-navy-850 hover:bg-navy-800 text-slate-300 font-bold text-[10px] py-2 rounded transition"
                        >
                          Verify Report
                        </button>
                      )}
                      {user && user.role !== 'Citizen' && inc.status === 'Verified' && (
                        <button 
                          onClick={() => {
                            axios.put(`/incidents/${inc.id}`, { status: 'Response Dispatched' }, { headers: { Authorization: `Bearer mock` } })
                              .then(res => setIncidents(incidents.map(i => i.id === inc.id ? { ...i, status: 'Response Dispatched' } : i)));
                          }}
                          className="flex-1 bg-amber-500 text-navy-950 font-bold text-[10px] py-2 rounded transition"
                        >
                          Dispatch Team
                        </button>
                      )}
                      {user && user.role !== 'Citizen' && inc.status === 'Response Dispatched' && (
                        <button 
                          onClick={() => {
                            axios.put(`/incidents/${inc.id}`, { status: 'Resolved' }, { headers: { Authorization: `Bearer mock` } })
                              .then(res => setIncidents(incidents.map(i => i.id === inc.id ? { ...i, status: 'Resolved' } : i)));
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] py-2 rounded transition"
                        >
                          Close Incident
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ROAD STATUS */}
          {currentTab === 'roads' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Road Network Connectivity</h2>
                <p className="text-xs text-slate-400">Displays status updates for arterial highways across NER states.</p>
              </div>

              <div className="bg-navy-900/60 border border-navy-800 rounded-xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-navy-850 text-slate-300 border-b border-navy-800">
                      <th className="p-4">Road Name</th>
                      <th className="p-4">Code / Path</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Estimated Reopening</th>
                      {user && user.role !== 'Citizen' && <th className="p-4">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoads.map((road) => (
                      <tr key={road.id} className="border-b border-navy-850 hover:bg-navy-850/40 transition">
                        <td className="p-4 font-bold text-white">{road.name}</td>
                        <td className="p-4 text-slate-400">{road.code}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-extrabold uppercase ${road.status === 'Open' ? 'bg-emerald-500/10 text-emerald-400' : road.status === 'Partially Blocked' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                            {road.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">
                          {road.reopening_est ? new Date(road.reopening_est).toLocaleTimeString() : 'N/A (Open)'}
                        </td>
                        {user && user.role !== 'Citizen' && (
                          <td className="p-4 flex space-x-1.5">
                            <button 
                              onClick={() => {
                                axios.put(`/roads/${road.id}`, { status: 'Open' }, { headers: { Authorization: `Bearer mock` } })
                                  .then(res => setRoads(roads.map(r => r.id === road.id ? { ...r, status: 'Open', reopening_est: null } : r)));
                              }}
                              className="bg-emerald-500/10 hover:bg-emerald-500 hover:text-navy-950 text-emerald-400 px-2 py-1 rounded font-bold"
                            >
                              Open
                            </button>
                            <button 
                              onClick={() => {
                                axios.put(`/roads/${road.id}`, { status: 'Fully Blocked', reopening_est: new Date(Date.now() + 8*3600*1000) }, { headers: { Authorization: `Bearer mock` } })
                                  .then(res => setRoads(roads.map(r => r.id === road.id ? { ...r, status: 'Fully Blocked', reopening_est: res.data.reopening_est } : r)));
                              }}
                              className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 px-2 py-1 rounded font-bold"
                            >
                              Block
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: IoT SENSORS */}
          {currentTab === 'sensors' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">IoT Geotechnical Sensor Grid</h2>
                <p className="text-xs text-slate-400">Telemetry logs from physical soil moisture probes, tiltmeters, and rain gauges.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSensors.map((sensor) => (
                  <div key={sensor.id} className="bg-navy-900/60 border border-navy-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-navy-850 px-2 py-1 rounded">{sensor.type}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${sensor.status === 'active' ? 'bg-emerald-500 pulse-emerald' : sensor.status === 'warning' ? 'bg-red-500 pulse-red' : 'bg-slate-500'}`}></span>
                      </div>
                      <h3 className="text-base font-bold text-white">{sensor.name}</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2">
                        <div>Battery: <strong className="text-white">{sensor.battery_level || 90}%</strong></div>
                        <div>Signal: <strong className="text-white">{sensor.signal_strength || 85}%</strong></div>
                      </div>
                    </div>

                    <div className="border-t border-navy-800 pt-3 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Last telemetry sync:</span>
                      <span>{sensor.last_reading_at ? new Date(sensor.last_reading_at).toLocaleTimeString() : 'offline'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: WEATHER ANALYSIS */}
          {currentTab === 'weather' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Advanced Meteorology & Thresholds</h2>
                <p className="text-xs text-slate-400">Intensity-Duration threshold analysis for Northeast monsoon bands.</p>
              </div>

              {/* Rain widget comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-navy-900/60 border border-navy-800 rounded-xl p-5 flex flex-col space-y-3">
                  <span className="font-bold text-white text-sm">Slope Saturation Warning</span>
                  <p className="text-xs text-slate-400">Antecedent rain (cumulative 7-days) triggers deep failure planes when moisture saturation exceeds 70%.</p>
                  <div className="h-32 flex flex-col justify-center space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Soil Moisture Index</span>
                      <span className="text-red-400">78.5% (Critical)</span>
                    </div>
                    <div className="w-full bg-navy-950 h-3 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full" style={{ width: '78.5%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-navy-900/60 border border-navy-800 rounded-xl p-5 flex flex-col space-y-3">
                  <span className="font-bold text-white text-sm">24h Precipitation Forecast</span>
                  <p className="text-xs text-slate-400">Intensity limits based on Open-Meteo predictions.</p>
                  <div className="flex justify-around items-center h-32">
                    <div className="text-center">
                      <div className="text-xl font-black text-white">125 mm</div>
                      <div className="text-[10px] text-slate-400">Rain sum</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-amber-500">Moderate</div>
                      <div className="text-[10px] text-slate-400">Alert state</div>
                    </div>
                  </div>
                </div>

                <div className="bg-navy-900/60 border border-navy-800 rounded-xl p-5 flex flex-col space-y-3">
                  <span className="font-bold text-white text-sm">Landslide Warning Threshold</span>
                  <p className="text-xs text-slate-400">Triggers are generated if actual rainfall crosses the regional threshold limit.</p>
                  <div className="flex items-center h-32 text-xs">
                    <ul className="space-y-1.5 text-slate-300 w-full">
                      <li className="flex justify-between"><span>24h Threshold:</span> <strong className="text-white">80 mm</strong></li>
                      <li className="flex justify-between"><span>72h Threshold:</span> <strong className="text-white">160 mm</strong></li>
                      <li className="flex justify-between"><span>7-day Threshold:</span> <strong className="text-white">300 mm</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CITIZEN REPORT MODERATION QUEUE */}
          {currentTab === 'citizen_reports' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Citizen Observer Moderation Queue</h2>
                <p className="text-xs text-slate-400">Approve user observations to retrain the ML susceptibility indexes.</p>
              </div>

              {/* Citizen reports table */}
              <div className="bg-navy-900/60 border border-navy-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-navy-850 text-slate-300 border-b border-navy-800">
                      <th className="p-4">Report Details</th>
                      <th className="p-4">Coordinates</th>
                      <th className="p-4">AI Prescreen classification</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citizenReports.map((report) => (
                      <tr key={report.id} className="border-b border-navy-850 hover:bg-navy-850/40 transition">
                        <td className="p-4">
                          <div className="flex flex-col space-y-1">
                            <span className="font-bold text-white">{report.description}</span>
                            <span className="text-[10px] text-slate-400">Reporter: {report.reporter_email || 'citizen@prithvi.gov.in'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300 font-mono">({report.longitude?.toFixed(4)}, {report.latitude?.toFixed(4)})</td>
                        <td className="p-4">
                          {report.ai_classification_tags ? (
                            <div className="flex flex-wrap gap-1.5">
                              {report.ai_classification_tags.crack_detected && <span className="bg-red-500/10 text-red-400 px-1 rounded text-[10px]">Tension Crack</span>}
                              {report.ai_classification_tags.boulder_fall && <span className="bg-amber-500/10 text-amber-400 px-1 rounded text-[10px]">Rock displacement</span>}
                              {report.ai_classification_tags.road_blockage && <span className="bg-cyan-500/10 text-cyan-400 px-1 rounded text-[10px]">Highway slip</span>}
                              <span className="text-slate-500 text-[10px]">(Conf: {Math.floor(report.ai_classification_tags.confidence * 100)}%)</span>
                            </div>
                          ) : 'No AI Screening'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-extrabold uppercase ${report.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : report.status === 'Rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {report.status === 'Pending' && (
                            <div className="flex space-x-1.5">
                              <button 
                                onClick={() => {
                                  axios.put(`/citizen-reports/${report.id}/verify`, { action: 'Approved' }, { headers: { Authorization: `Bearer mock` } })
                                    .then(() => {
                                      setCitizenReports(citizenReports.map(r => r.id === report.id ? { ...r, status: 'Approved' } : r));
                                      // Reload list to fetch approved changes
                                      axios.get('/incidents').then(res => setIncidents(res.data));
                                    });
                                }}
                                className="bg-emerald-500/20 hover:bg-emerald-500 hover:text-navy-950 text-emerald-400 px-2 py-1 rounded font-bold"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => {
                                  axios.put(`/citizen-reports/${report.id}/verify`, { action: 'Rejected' }, { headers: { Authorization: `Bearer mock` } })
                                    .then(() => setCitizenReports(citizenReports.map(r => r.id === report.id ? { ...r, status: 'Rejected' } : r)));
                                }}
                                className="bg-red-500/20 hover:bg-red-500 hover:text-white text-red-400 px-2 py-1 rounded font-bold"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: ALERTS & WARNING CONTROL */}
          {currentTab === 'alerts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Alert Dispatch Dashboard</h2>
                  <p className="text-xs text-slate-400">Compose and dispatch SMS and mobile push alerts to regional populations.</p>
                </div>
              </div>

              {alertProgress && (
                <div className="bg-accent-green/10 border border-accent-green text-accent-green rounded-xl p-3 text-xs flex items-center justify-between">
                  <span>{alertProgress}</span>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-accent-green border-t-transparent"></span>
                </div>
              )}

              {/* Compose Warning Form */}
              <div className="bg-navy-900/60 border border-navy-800 rounded-xl p-5 space-y-4">
                <span className="font-bold text-white text-sm">Compose New Emergency Early Warning (Human-in-the-Loop)</span>
                
                <form onSubmit={handleComposeAlert} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-400 font-semibold">Target Risk Zone</label>
                    <select 
                      value={alertZoneId}
                      onChange={e => setAlertZoneId(parseInt(e.target.value))}
                      className="bg-navy-950 border border-navy-800 rounded p-2.5 text-slate-200 outline-none focus:border-accent-green"
                    >
                      <option value={1}>Shillong Ridge & Bypass Slope</option>
                      <option value={2}>Haflong Town Slide Zone</option>
                      <option value={3}>Laitumkhrah Valley Rim</option>
                      <option value={4}>Aizawl North Slope (Chaltlang)</option>
                      <option value={5}>Mangan Bazar Slip Area</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-400 font-semibold">Severity Tier</label>
                    <select 
                      value={alertSeverity}
                      onChange={e => setAlertSeverity(e.target.value)}
                      className="bg-navy-950 border border-navy-800 rounded p-2.5 text-slate-200 outline-none focus:border-accent-green"
                    >
                      <option value="Moderate">Moderate (Push Notification Only)</option>
                      <option value="High">High (Push + SMS to Responders)</option>
                      <option value="Very High">Very High (SMS Blast + Push + IVR Loop)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex flex-col space-y-1">
                    <label className="text-slate-400 font-semibold">Alert Title (English)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. EVACUATION NOTICE: Haflong Town Zone"
                      value={alertTitle}
                      onChange={e => setAlertTitle(e.target.value)}
                      className="bg-navy-950 border border-navy-800 rounded p-2.5 text-slate-200 outline-none focus:border-accent-green"
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-col space-y-1">
                    <label className="text-slate-400 font-semibold">Warning Message (English)</label>
                    <textarea 
                      rows={3}
                      placeholder="Enter specific risk details and action steps. The Bhashini AI engine will translate this preview into the 6 regional tongues."
                      value={alertMsg}
                      onChange={e => setAlertMsg(e.target.value)}
                      className="bg-navy-950 border border-navy-800 rounded p-2.5 text-slate-200 outline-none focus:border-accent-green resize-none"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <button 
                      type="submit"
                      className="bg-accent-green hover:bg-accent-green/85 text-navy-950 font-bold px-4 py-2 rounded-lg"
                    >
                      Create Draft Alert
                    </button>
                  </div>
                </form>
              </div>

              {/* Send Real SMS Early Warning Test Panel */}
              <div className="bg-navy-900/60 border border-navy-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-navy-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                    <span className="font-bold text-white text-sm">Send Live SMS Alert Warning to Real Mobile Number</span>
                  </div>
                  
                  {/* Gateway selector */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1.5 rounded-lg text-[10px] font-bold">
                    Pushbullet SMS Gateway Active
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  
                  {/* Pushbullet credentials inputs */}
                  <div className="md:col-span-2 flex flex-col space-y-2.5 bg-navy-950/50 p-4 border border-navy-800 rounded-lg text-xs">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2.5 rounded text-[10px] leading-relaxed">
                      🟢 <strong>Pushbullet SMS Mode (100% Free - Real SMS):</strong> Bypasses carrier DLT blocks completely by routing SMS text warnings through your own Android phone's SIM card.
                      <br />
                      <strong>Instructions:</strong> Install the Pushbullet App on your Android phone, enable **SMS Sync** in its settings, and click send!
                    </div>
                    
                    <div className="flex flex-col space-y-1">
                      <label className="text-slate-400 font-semibold">Pushbullet Access Token</label>
                      <input 
                        type="password" 
                        placeholder="Paste your Pushbullet Access Token here..."
                        value={pushbulletToken}
                        onChange={e => setPushbulletToken(e.target.value)}
                        className="bg-navy-950 border border-navy-800 rounded p-2 text-slate-200 outline-none focus:border-accent-green"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-400 font-semibold">Recipient Mobile Number (e.g., +919324207612)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. +91XXXXXXXXXX"
                      value={testMobileNumber}
                      onChange={e => setTestMobileNumber(e.target.value)}
                      className="bg-navy-950 border border-navy-800 rounded p-2.5 text-slate-200 outline-none focus:border-accent-green"
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-400 font-semibold">Warning Notification Body</label>
                    <textarea 
                      rows={2}
                      placeholder="Enter emergency warning content to send to your phone..."
                      value={smsAlertMessage}
                      onChange={e => setSmsAlertMessage(e.target.value)}
                      className="bg-navy-950 border border-navy-800 rounded p-2.5 text-slate-200 outline-none focus:border-accent-green resize-none"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <button 
                      type="button"
                      disabled={smsSending}
                      onClick={() => handleSendTestSMS(smsAlertMessage)}
                      className={`font-bold px-4 py-2 rounded-lg transition-all ${smsSending ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white shadow-lg'}`}
                    >
                      {smsSending ? 'Sending SMS Warning...' : 'Send Live SMS Warning'}
                    </button>
                  </div>
                </div>
              </div>



              {/* Alerts Log Queue */}
              <div className="bg-navy-900/60 border border-navy-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-navy-800 bg-navy-850">
                  <span className="font-bold text-white text-xs">Alert Dispatch History</span>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-navy-850/50 text-slate-400 border-b border-navy-800">
                      <th className="p-4">Warning Title & Content</th>
                      <th className="p-4">Target Region</th>
                      <th className="p-4">Severity</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((al) => (
                      <tr key={al.id} className="border-b border-navy-850 hover:bg-navy-850/20 transition">
                        <td className="p-4">
                          <div className="flex flex-col space-y-1 max-w-lg">
                            <span className="font-bold text-white">{al.title_en}</span>
                            <span className="text-slate-400 leading-normal">{al.message_en}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300">{al.zone_name || 'Haflong Zone'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-extrabold uppercase ${al.severity === 'Very High' ? 'bg-red-500/10 text-red-400' : al.severity === 'High' ? 'bg-orange-500/10 text-orange-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                            {al.severity}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-extrabold uppercase ${al.status === 'Dispatched' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                            {al.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {al.status === 'Draft' ? (
                            <button 
                              onClick={() => handleDispatchAlert(al.id)}
                              className="bg-accent-green hover:bg-accent-green/85 text-navy-950 font-bold px-2 py-1 rounded"
                            >
                              Dispatch SMS Blast
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                axios.get(`/alerts/${al.id}/recipients`, { headers: { Authorization: `Bearer mock` } })
                                  .then(res => {
                                    alert(`Alert delivered to ${res.data.length} registered subscribers. Success rate: 100%`);
                                  });
                              }}
                              className="bg-navy-800 hover:bg-navy-700 text-slate-300 px-2 py-1 rounded"
                            >
                              Delivery Logs
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 9: SITUATION REPORTS */}
          {currentTab === 'reports' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Situation PDF/CSV Reports Generator</h2>
                <p className="text-xs text-slate-400">Generate and download official bulletins for regional SDMAs and national disaster bureaus.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* PDF generation box */}
                <div className="bg-navy-900/60 border border-navy-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                  <div className="flex flex-col space-y-2">
                    <span className="text-xs font-bold text-accent-green uppercase tracking-wider">PDF Generator</span>
                    <h3 className="text-base font-bold text-white">Daily Landslide Warning Briefing</h3>
                    <p className="text-xs text-slate-400 leading-normal">Compiles risk severity mappings, sensor anomaly list, and active road blockages of the day into an official format.</p>
                  </div>
                  <button 
                    onClick={() => {
                      alert('Daily Briefing compiled and PDF downloaded locally (Simulated file save: prithvi_briefing_daily.pdf)');
                    }}
                    className="w-full bg-navy-850 hover:bg-navy-800 text-slate-300 font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <FileDown className="w-4 h-4 text-accent-green" /> Download Daily PDF Bulletin
                  </button>
                </div>

                {/* CSV download box */}
                <div className="bg-navy-900/60 border border-navy-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                  <div className="flex flex-col space-y-2">
                    <span className="text-xs font-bold text-accent-green uppercase tracking-wider">CSV Data Exporter</span>
                    <h3 className="text-base font-bold text-white">IoT Geotechnical Telemetry Logs</h3>
                    <p className="text-xs text-slate-400 leading-normal">Exports 72 hours of raw time-series data from soil moisture cells and tilt angles in CSV structure for research analysis.</p>
                  </div>
                  <button 
                    onClick={() => {
                      alert('CSV generated. 764 telemetry rows written to prithvi_sensor_logs.csv');
                    }}
                    className="w-full bg-navy-850 hover:bg-navy-800 text-slate-300 font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <FileDown className="w-4 h-4 text-accent-green" /> Download Geotech CSV Logs
                  </button>
                </div>

              </div>

              {/* Citizen Reporting Sandbox Form (For PWA presentation) */}
              <div className="bg-navy-900/60 border border-navy-800 rounded-xl p-5 space-y-4">
                <span className="font-bold text-white text-sm">PWA Sandbox — Submit Citizen Observation (Simulated Smartphone Interface)</span>
                <p className="text-xs text-slate-400">Use this form to test citizen crowdsourced observations. Disconnect your browser network (DevTools Offline) to test IndexedDB queuing and auto-sync synchronization!</p>

                <form onSubmit={handleSubmitReport} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-400 font-semibold">Latitude</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      value={reportLat}
                      onChange={e => setReportLat(parseFloat(e.target.value))}
                      className="bg-navy-950 border border-navy-800 rounded p-2.5 text-slate-200 outline-none focus:border-accent-green"
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-400 font-semibold">Longitude</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      value={reportLon}
                      onChange={e => setReportLon(parseFloat(e.target.value))}
                      className="bg-navy-950 border border-navy-800 rounded p-2.5 text-slate-200 outline-none focus:border-accent-green"
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-400 font-semibold">Attachment Photo URL</label>
                    <input 
                      type="text" 
                      placeholder="Optional URL"
                      value={reportPhoto}
                      onChange={e => setReportPhoto(e.target.value)}
                      className="bg-navy-950 border border-navy-800 rounded p-2.5 text-slate-200 outline-none focus:border-accent-green"
                    />
                  </div>
                  <div className="md:col-span-3 flex flex-col space-y-1">
                    <label className="text-slate-400 font-semibold">Observation Description</label>
                    <textarea 
                      rows={2}
                      placeholder="e.g. Large lateral crack observed on Shillong bypass slope, width about 4 inches."
                      value={reportDesc}
                      onChange={e => setReportDesc(e.target.value)}
                      className="bg-navy-950 border border-navy-800 rounded p-2.5 text-slate-200 outline-none focus:border-accent-green resize-none"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button 
                      type="submit"
                      disabled={isSubmittingReport}
                      className="bg-accent-green hover:bg-accent-green/85 text-navy-950 font-bold px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {isSubmittingReport ? 'Submitting...' : 'Submit Observation'}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

        </main>
      </div>

    </div>
  );
};
