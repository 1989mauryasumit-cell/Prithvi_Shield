import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  phone: string;
  role: string;
  preferred_language: string;
}

interface UIStore {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  isConnected: boolean;
  setIsConnected: (status: boolean) => void;
  
  // Dynamic Lists populated from API / websockets
  sensors: any[];
  setSensors: (sensors: any[]) => void;
  updateSensor: (sensor: any) => void;
  
  roads: any[];
  setRoads: (roads: any[]) => void;
  updateRoad: (road: any) => void;
  
  incidents: any[];
  setIncidents: (incidents: any[]) => void;
  addIncident: (incident: any) => void;
  updateIncident: (incident: any) => void;

  citizenReports: any[];
  setCitizenReports: (reports: any[]) => void;
  addCitizenReport: (report: any) => void;
  updateCitizenReport: (report: any) => void;

  alerts: any[];
  setAlerts: (alerts: any[]) => void;
  addAlert: (alert: any) => void;
  updateAlert: (alert: any) => void;

  selectedZone: any | null;
  setSelectedZone: (zone: any | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  currentTab: 'dashboard',
  setCurrentTab: (tab) => set({ currentTab: tab }),
  
  // Default session set to Admin for instant sandbox playability
  user: {
    id: 1,
    email: 'admin@prithvi.gov.in',
    phone: '+919999999999',
    role: 'SDMA Super Admin',
    preferred_language: 'en'
  },
  setUser: (user) => set({ user }),
  isConnected: true,
  setIsConnected: (status) => set({ isConnected: status }),

  sensors: [
    { id: 1, name: 'Tiltmeter-01 (Shillong Ridge)', status: 'active', last_reading_at: new Date().toISOString(), type: 'Tilt', location: 'Meghalaya' },
    { id: 2, name: 'RainGauge-02 (Haflong Highway)', status: 'warning', last_reading_at: new Date().toISOString(), type: 'Rainfall', location: 'Assam' },
    { id: 3, name: 'Tiltmeter-03 (Mangan Valley)', status: 'active', last_reading_at: new Date().toISOString(), type: 'Tilt', location: 'Sikkim' },
    { id: 4, name: 'RainGauge-04 (Tawang Road)', status: 'active', last_reading_at: new Date().toISOString(), type: 'Rainfall', location: 'Arunachal Pradesh' },
    { id: 5, name: 'Tiltmeter-05 (Aizawl North)', status: 'active', last_reading_at: new Date().toISOString(), type: 'Tilt', location: 'Mizoram' },
    { id: 6, name: 'Tiltmeter-06 (Lunglei Pass)', status: 'active', last_reading_at: new Date().toISOString(), type: 'Tilt', location: 'Mizoram' },
    { id: 7, name: 'RainGauge-07 (Gangtok Hill)', status: 'active', last_reading_at: new Date().toISOString(), type: 'Rainfall', location: 'Sikkim' }
  ],
  setSensors: (sensors) => set({ sensors }),
  updateSensor: (sensor) => set((state) => ({
    sensors: state.sensors.map((s) => (s.id === sensor.sensor_id ? { ...s, ...sensor, last_reading_at: sensor.timestamp, status: sensor.status } : s))
  })),

  roads: [
    { id: 1, name: 'Shillong - Silchar Highway (NH-6)', code: 'NH-6', status: 'Partially Blocked', district_id: 1, reopening_est: new Date(Date.now() + 4*3600*1000).toISOString() },
    { id: 2, name: 'Haflong Link Road', code: 'SH-14', status: 'Fully Blocked', district_id: 2, reopening_est: new Date(Date.now() + 8*3600*1000).toISOString() },
    { id: 3, name: 'Aizawl Bypass Road', code: 'NH-54', status: 'Clear', district_id: 3, reopening_est: null },
    { id: 5, name: 'Guwahati-Tezpur Route (NH-37)', code: 'NH-37', status: 'Clear', district_id: 1, reopening_est: null }
  ],
  setRoads: (roads) => set({ roads }),
  updateRoad: (road) => set((state) => ({
    roads: state.roads.map((r) => (r.id === road.id ? { ...r, ...road } : r))
  })),

  incidents: [
    { id: 1, title: 'Debris Flow near Shillong', description: 'Debris flow block on NH-6', status: 'Active', severity: 'High', location: 'Shillong', reported_at: new Date().toISOString() },
    { id: 2, title: 'Rockfall on Haflong Pass', description: 'Major rockfall blocking both lanes', status: 'Active', severity: 'Critical', location: 'Haflong', reported_at: new Date().toISOString() }
  ],
  setIncidents: (incidents) => set({ incidents }),
  addIncident: (incident) => set((state) => ({ incidents: [incident, ...state.incidents] })),
  updateIncident: (incident) => set((state) => ({
    incidents: state.incidents.map((i) => (i.id === incident.id ? { ...i, ...incident } : i))
  })),

  citizenReports: [
    { id: 101, description: 'Large ground crack observed near Shillong bypass', latitude: 25.57, longitude: 91.88, status: 'Pending Review', created_at: new Date().toISOString() },
    { id: 102, description: 'Water accumulation and minor mudflow on Haflong slope', latitude: 25.18, longitude: 92.95, status: 'Verified', created_at: new Date().toISOString() }
  ],
  setCitizenReports: (reports) => set({ citizenReports: reports }),
  addCitizenReport: (report) => set((state) => ({ citizenReports: [report, ...state.citizenReports] })),
  updateCitizenReport: (report) => set((state) => ({
    citizenReports: state.citizenReports.map((r) => (r.id === report.id ? { ...r, ...report } : r))
  })),

  alerts: [
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
  ],
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
  updateAlert: (alert) => set((state) => ({
    alerts: state.alerts.map((a) => (a.id === alert.id ? { ...a, ...alert } : a))
  })),

  selectedZone: null,
  setSelectedZone: (zone) => set({ selectedZone: zone }),
}));
