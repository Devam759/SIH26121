import { Router } from 'express';
import pool from '../db/pool.js';
import { addClient, removeClient } from '../services/sseManager.js';
import { assessRisk } from '../services/riskEngine.js';

const router = Router();

// GET /api/v1/stream/live/:wellId - Server-Sent Events stream for drilling simulation
router.get('/live/:wellId', async (req, res) => {
  const { wellId } = req.params;
  const startDepth = parseFloat(req.query.start_depth || '2700');
  const formation = req.query.formation || 'Barail';
  const radiusKm = parseFloat(req.query.radius_km || '10');

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.flushHeaders();

  addClient(wellId, res);

  let depth = startDepth;

  // Send initial connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ well_id: wellId, start_depth: depth })}\n\n`);

  // Simulation timer: advance 0.5m every 3 seconds
  const interval = setInterval(async () => {
    try {
      depth = Math.round((depth + 0.5) * 10) / 10;

      // Realistic eRTMAC drilling telemetry calculation
      const isBarailAnomaly = depth >= 2780 && depth <= 2825;
      const telemetry = {
        rop_m_hr: Math.round((14.5 + (Math.sin(depth * 0.8) * 2.2) - (isBarailAnomaly ? 4.5 : 0)) * 10) / 10,
        wob_tonnes: Math.round((12.5 + (Math.cos(depth * 0.5) * 1.1)) * 10) / 10,
        rpm: Math.round(110 + (Math.sin(depth * 0.3) * 6)),
        torque_kn_m: Math.round((18.2 + (isBarailAnomaly ? 6.2 + Math.random() * 2 : Math.sin(depth) * 1.2)) * 10) / 10,
        mud_weight_sg: isBarailAnomaly ? 1.21 : 1.16,
        spp_psi: Math.round(3120 + (isBarailAnomaly ? 240 : Math.sin(depth * 0.4) * 45)),
        gas_units: Math.round(isBarailAnomaly ? 165 + (Math.random() * 30) : 32 + (Math.sin(depth * 0.2) * 8)),
        status: isBarailAnomaly ? 'ANOMALY_DETECTED' : 'NORMAL'
      };

      // 1. Emit depth update with telemetry
      res.write(`event: depth_update\ndata: ${JSON.stringify({
        well_id: wellId,
        current_depth_m: depth,
        formation,
        telemetry,
        simulated: true,
        timestamp: new Date().toISOString()
      })}\n\n`);

      // 2. Assess real-time proximity risk
      const risk = await assessRisk({
        wellId,
        currentDepthM: depth,
        formation,
        radiusKm
      }, pool);

      // 3. Emit risk update always
      res.write(`event: risk_update\ndata: ${JSON.stringify({
        well_id: wellId,
        current_depth_m: depth,
        ...risk,
        simulated: true
      })}\n\n`);

      // 4. If high or medium alert threshold (score >= 40), emit dedicated risk_alert
      if (risk.score >= 40) {
        res.write(`event: risk_alert\ndata: ${JSON.stringify({
          well_id: wellId,
          current_depth_m: depth,
          ...risk,
          simulated: true,
          timestamp: new Date().toISOString()
        })}\n\n`);
      }
    } catch (err) {
      console.error('SSE simulation error:', err.message);
    }
  }, 3000);

  req.on('close', () => {
    clearInterval(interval);
    removeClient(wellId, res);
  });
});

export default router;
