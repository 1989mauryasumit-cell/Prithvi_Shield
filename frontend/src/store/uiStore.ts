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

  sensors: [],
  setSensors: (sensors) => set({ sensors }),
  updateSensor: (sensor) => set((state) => ({
    sensors: state.sensors.map((s) => (s.id === sensor.sensor_id ? { ...s, ...sensor, last_reading_at: sensor.timestamp, status: sensor.status } : s))
  })),

  roads: [],
  setRoads: (roads) => set({ roads }),
  updateRoad: (road) => set((state) => ({
    roads: state.roads.map((r) => (r.id === road.id ? { ...r, ...road } : r))
  })),

  incidents: [],
  setIncidents: (incidents) => set({ incidents }),
  addIncident: (incident) => set((state) => ({ incidents: [incident, ...state.incidents] })),
  updateIncident: (incident) => set((state) => ({
    incidents: state.incidents.map((i) => (i.id === incident.id ? { ...i, ...incident } : i))
  })),

  citizenReports: [],
  setCitizenReports: (reports) => set({ citizenReports: reports }),
  addCitizenReport: (report) => set((state) => ({ citizenReports: [report, ...state.citizenReports] })),
  updateCitizenReport: (report) => set((state) => ({
    citizenReports: state.citizenReports.map((r) => (r.id === report.id ? { ...r, ...report } : r))
  })),

  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
  updateAlert: (alert) => set((state) => ({
    alerts: state.alerts.map((a) => (a.id === alert.id ? { ...a, ...alert } : a))
  })),

  selectedZone: null,
  setSelectedZone: (zone) => set({ selectedZone: zone }),
}));
