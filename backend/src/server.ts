import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

// Load config
dotenv.config();

// Imports
import { initDatabase } from './db/db';
import { startSchedulers } from './jobs/cron';
import authRouter from './routes/auth';
import sensorsRouter from './routes/sensors';
import incidentsRouter from './routes/incidents';
import roadsRouter from './routes/roads';
import alertsRouter from './routes/alerts';
import weatherRouter from './routes/weather';
import citizenReportsRouter from './routes/citizenReports';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Setup Socket.IO Server
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for dev simplicity
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Configure CORS and JSON Parser
app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Register routes
app.use('/auth', authRouter);
app.use('/sensors', sensorsRouter);
app.use('/incidents', incidentsRouter);
app.use('/roads', roadsRouter);
app.use('/alerts', alertsRouter);
app.use('/weather', weatherRouter);
app.use('/citizen-reports', citizenReportsRouter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'PRITHVI-SHIELD Core API'
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Express Global Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Socket.io namespace setups
const liveNamespace = io.of('/live');
liveNamespace.on('connection', (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id} to namespace /live`);
  
  socket.on('subscribe:zone', (zoneId: string) => {
    console.log(`[WebSocket] Client ${socket.id} subscribed to zone_${zoneId}`);
    socket.join(`zone_${zoneId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  });
});

// Self-starting server initialization
async function bootstrap() {
  // 1. Initialize DB and run schemas/seeds automatically
  await initDatabase();

  // 2. Start telemetry and ML cron runners
  startSchedulers(io);

  // 3. Start Listening
  server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` PRITHVI-SHIELD CORE API IS LIVE ON PORT ${PORT} `);
    console.log(`==================================================`);
  });
}

bootstrap();
