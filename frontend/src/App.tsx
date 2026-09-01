import React, { useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useUIStore } from './store/uiStore';
import { syncOfflineReports } from './utils/OfflineQueue';
import { Dashboard } from './pages/Dashboard';
import './i18n';

// Configure Axios Defaults
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.timeout = 2000;

export const App: React.FC = () => {
  const {
    user,
    setSensors,
    updateSensor,
    setRoads,
    updateRoad,
    setIncidents,
    addIncident,
    updateIncident,
    setCitizenReports,
    setAlerts,
    addAlert,
    updateAlert,
    setIsConnected
  } = useUIStore();

  // 1. Initial API poll
  const loadData = async () => {
    try {
      const [sensorsRes, roadsRes, incidentsRes, alertsRes] = await Promise.all([
        axios.get('/sensors'),
        axios.get('/roads'),
        axios.get('/incidents'),
        axios.get('/alerts')
      ]);

      setSensors(sensorsRes.data);
      setRoads(roadsRes.data);
      setIncidents(incidentsRes.data);
      setAlerts(alertsRes.data);

      if (user && (user.role === 'Field Officer' || user.role === 'District Admin' || user.role === 'SDMA Super Admin')) {
        const citizenReportsRes = await axios.get('/citizen-reports', {
          headers: { Authorization: `Bearer mock_admin_token` } // JWT header mockup
        });
        setCitizenReports(citizenReportsRes.data);
      }
    } catch (err) {
      console.error('[Initial Loading Error]', err);
      // Fallback Seed Data when backend is offline
      console.warn('[Initial Loading] Backend offline. Seeding premium offline mock data...');
      setSensors([
        { id: 1, name: 'Tiltmeter-01 (Shillong Ridge)', status: 'active', last_reading_at: new Date().toISOString(), type: 'Tilt' },
        { id: 2, name: 'RainGauge-02 (Haflong Highway)', status: 'warning', last_reading_at: new Date().toISOString(), type: 'Rainfall' },
        { id: 3, name: 'Tiltmeter-03 (Mangan Valley)', status: 'active', last_reading_at: new Date().toISOString(), type: 'Tilt' },
        { id: 4, name: 'RainGauge-04 (Tawang Road)', status: 'active', last_reading_at: new Date().toISOString(), type: 'Rainfall' },
        { id: 5, name: 'Tiltmeter-05 (Aizawl North)', status: 'active', last_reading_at: new Date().toISOString(), type: 'Tilt' },
        { id: 6, name: 'Tiltmeter-06 (Lunglei Pass)', status: 'active', last_reading_at: new Date().toISOString(), type: 'Tilt' },
        { id: 7, name: 'RainGauge-07 (Gangtok Hill)', status: 'active', last_reading_at: new Date().toISOString(), type: 'Rainfall' }
      ]);
      setRoads([
        { id: 1, name: 'Shillong - Silchar Highway (NH-6)', status: 'Partially Blocked', district_id: 1 },
        { id: 2, name: 'Haflong Link Road', status: 'Fully Blocked', district_id: 2 },
        { id: 3, name: 'Aizawl Bypass Road', status: 'Clear', district_id: 3 },
        { id: 5, name: 'Guwahati-Tezpur Route (NH-37)', status: 'Clear', district_id: 1 }
      ]);
      setIncidents([
        { id: 1, title: 'Debris Flow near Shillong', description: 'Debris flow block on NH-6', status: 'Active', severity: 'High', location: 'Shillong' },
        { id: 2, title: 'Rockfall on Haflong Pass', description: 'Major rockfall blocking both lanes', status: 'Active', severity: 'Critical', location: 'Haflong' }
      ]);
      setAlerts([
        {
          id: 1,
          title_en: 'Red Alert: Landslide Risk in Meghalaya',
          message_en: 'Severe rainfall has saturated slope soils. Evacuate low-lying areas in East Khasi Hills immediately.',
          severity: 'Critical',
          status: 'Dispatched',
          translations: {
            kha: {
              title: 'Hakhlieh Kyndon: Jingma ha Meghalaya',
              message: 'Ka jingshlei um ka la pynlong ia ki khyndew ban khyllem. Phet noh shisyndon baroh ki jaka kyndong.'
            }
          }
        }
      ]);
    }
  };

  useEffect(() => {
    loadData();

    // 2. Setup WebSocket Live Stream
    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
    const socket = io(`${socketUrl}/live`, { 
      timeout: 2000, 
      reconnectionAttempts: 2, 
      autoConnect: false 
    });

    // In-memory simulation interval when backend is offline
    const simInterval = setInterval(() => {
      const randomSensorId = Math.floor(Math.random() * 7) + 1;
      const randomStatus = Math.random() > 0.85 ? 'warning' : 'active';
      updateSensor({
        sensor_id: randomSensorId,
        timestamp: new Date().toISOString(),
        status: randomStatus
      });
    }, 4000);

    socket.on('connect', () => {
      console.log('[WebSocket Client] Connected to namespace /live');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket Client] Disconnected');
      setIsConnected(false);
    });

    socket.on('sensor:update', (data) => {
      console.log('[WS Telemetry Ingestion]', data);
      updateSensor(data);
    });

    socket.on('road:status-change', (data) => {
      updateRoad(data);
    });

    socket.on('incident:new', (data) => {
      addIncident(data);
    });

    socket.on('incident:update', (data) => {
      updateIncident(data);
    });

    socket.on('alert:new', (data) => {
      addAlert(data);
    });

    socket.on('alert:update', (data) => {
      updateAlert(data);
    });

    socket.on('risk:zone-change', (data) => {
      console.log('[WS Risk Shift Notification]', data);
      // Reload lists or append alert
      loadData();
    });

    // 3. Setup Offline Sync Hooks
    const handleOnline = async () => {
      console.log('[Network] Connectivity restored.');
      setIsConnected(true);
      
      // Auto Sync Offline Queue
      const mockToken = 'mock_admin_token'; // Normally from auth state
      const synced = await syncOfflineReports(mockToken, API_BASE_URL);
      if (synced > 0) {
        console.log(`[Offline Sync] Uploaded ${synced} citizen reports.`);
        loadData(); // refresh list
      }
    };

    const handleOffline = () => {
      console.log('[Network] Network connectivity lost. Switching to IndexedDB Cache.');
      setIsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection state check
    setIsConnected(navigator.onLine);

    return () => {
      socket.disconnect();
      clearInterval(simInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  return <Dashboard />;
};

export default App;
