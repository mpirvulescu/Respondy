import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { router as apiRoutes } from './routes/api.js';
import callRoutes from './routes/calls.js';
import { callStore } from './callStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false
    : [
        'http://localhost:5173',
        /\.trycloudflare\.com$/,
      ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API routes
app.use('/api/calls', callRoutes);
app.use('/api', apiRoutes);

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

// WebSocket server for real-time transcript
const wss = new WebSocketServer({ server, path: '/ws/transcript' });

wss.on('connection', (ws, req) => {
  // Extract callSid from query: /ws/transcript?callSid=CA...
  const url = new URL(req.url, `http://${req.headers.host}`);
  const callSid = url.searchParams.get('callSid');

  if (!callSid) {
    ws.send(JSON.stringify({ error: 'callSid query param required' }));
    ws.close();
    return;
  }

  const entry = callStore.get(callSid);
  if (!entry) {
    ws.send(JSON.stringify({ error: 'Call not found' }));
    ws.close();
    return;
  }

  // Send existing transcript
  for (const t of entry.transcript) {
    ws.send(JSON.stringify(t));
  }

  // Send new entries as they arrive
  const onTranscript = (data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };
  entry.listeners.add(onTranscript);

  ws.on('close', () => {
    entry.listeners.delete(onTranscript);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
