import axios from 'axios';
import { Router, Response } from 'express';
import { pool } from '../db/db';
import { authenticateToken, authorizeRoles, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

// Proxy endpoint to send real SMS warning message via Textbelt, Twilio, or Fast2SMS API, avoiding browser-side CORS blocks
router.post('/send-sms', async (req, res) => {
  const { phone, message, gateway, twilioSid, twilioToken, twilioPhone, twilioMediaType, fast2smsKey } = req.body;
  
  if (gateway === 'twilio') {
    if (!twilioSid || !twilioToken || !twilioPhone) {
      res.status(400).json({ error: 'Twilio Account SID, Auth Token, and Sender Number are all required in Twilio Mode.' });
      return;
    }
    
    if (twilioMediaType === 'voice') {
      try {
        console.log(`[Voice Proxy] Initiating synthesized warning call to ${phone} via Twilio Account ${twilioSid}...`);
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`;
        
        const params = new URLSearchParams();
        params.append('To', phone);
        params.append('From', twilioPhone);
        
        // Use Twilio's whitelisted demo URL to bypass inline TwiML blocks on trial accounts
        params.append('Url', 'http://demo.twilio.com/docs/voice.xml');

        const authHeaderClean = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');

        const response = await axios.post(twilioUrl, params, {
          headers: {
            'Authorization': `Basic ${authHeaderClean}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        res.json({ success: true, messageId: response.data.sid, status: response.data.status });
      } catch (error: any) {
        const errorDetail = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message;
        console.error('[Voice Proxy] Twilio IVR Call failed:', errorDetail);
        res.status(500).json({ error: `Twilio Voice Call Error: ${errorDetail}` });
      }
    } else {
      // Standard Twilio SMS warning blast
      try {
        console.log(`[SMS Proxy] Relaying Twilio SMS warning blast to ${phone} via Twilio Account ${twilioSid}...`);
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        
        const params = new URLSearchParams();
        params.append('To', phone);
        params.append('From', twilioPhone);
        params.append('Body', message);

        const authHeader = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');

        const response = await axios.post(twilioUrl, params, {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        res.json({ success: true, messageId: response.data.sid, status: response.data.status });
      } catch (error: any) {
        const errorDetail = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message;
        console.error('[SMS Proxy] Twilio delivery failed:', errorDetail);
        res.status(500).json({ error: `Twilio Dispatch Error: ${errorDetail}` });
      }
    }
  } else if (gateway === 'pushbullet') {
    const { pushbulletToken } = req.body;
    if (!pushbulletToken) {
      res.status(400).json({ error: 'Pushbullet Access Token is required in Pushbullet Mode.' });
      return;
    }
    try {
      console.log(`[Pushbullet Proxy] Fetching devices...`);
      
      // Fetch devices list
      const devicesRes = await axios.get('https://api.pushbullet.com/v2/devices', {
        headers: { 'Access-Token': pushbulletToken }
      });
      
      const devices = devicesRes.data.devices || [];
      const phoneDevice = devices.find((d: any) => d.active && (d.has_sms || d.type === 'android' || d.icon === 'phone'));
      
      if (!phoneDevice) {
        res.status(400).json({ error: 'No active Android phone device found in your Pushbullet account. Install the Pushbullet app on your phone and enable SMS Sync.' });
        return;
      }
      
      const deviceIden = phoneDevice.iden;
      console.log(`[Pushbullet Proxy] Relaying warning SMS to ${phone} via phone device ${phoneDevice.nickname || phoneDevice.model} (${deviceIden})...`);
      
      // Dispatch text SMS push
      const pushRes = await axios.post('https://api.pushbullet.com/v2/texts', {
        data: {
          addresses: [phone],
          message: `[PRITHVI SHIELD ALERT] \n\n${message}`,
          target_device_iden: deviceIden
        }
      }, {
        headers: {
          'Access-Token': pushbulletToken,
          'Content-Type': 'application/json'
        }
      });
      
      res.json({ success: true, messageId: pushRes.data.iden });
    } catch (error: any) {
      const errorDetail = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message;
      console.error('[Pushbullet Proxy] SMS dispatch failed:', errorDetail);
      res.status(500).json({ error: `Pushbullet Dispatch Error: ${errorDetail}` });
    }
  } else if (gateway === 'telegram') {
    const { telegramBotToken, telegramChatId } = req.body;
    if (!telegramBotToken || !telegramChatId) {
      res.status(400).json({ error: 'Telegram Bot Token and Chat ID are both required in Telegram Mode.' });
      return;
    }
    try {
      console.log(`[Telegram Proxy] Relaying warning blast to Telegram Chat ID ${telegramChatId}...`);
      
      const response = await axios.post(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        chat_id: telegramChatId,
        text: `🚨 [PRITHVI SHIELD LANDSLIDE WARNING] \n\n${message}`
      });
      
      if (response.data && response.data.ok) {
        res.json({ success: true, messageId: response.data.result.message_id });
      } else {
        res.status(500).json({ error: response.data.description || 'Telegram API returned delivery failure.' });
      }
    } catch (error: any) {
      const errorDetail = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message;
      console.error('[Telegram Proxy] Message dispatch failed:', errorDetail);
      res.status(500).json({ error: `Telegram Dispatch Error: ${errorDetail}` });
    }
  } else if (gateway === 'fast2sms') {
    if (!fast2smsKey) {
      res.status(400).json({ error: 'Fast2SMS Authorization API Key is required.' });
      return;
    }
    try {
      console.log(`[SMS Proxy] Relaying Fast2SMS warning blast to ${phone}...`);
      
      // Clean mobile number (Fast2SMS expects 10-digit Indian number without code)
      const cleanPhone = phone.replace('+', '').replace(/^91/, '').trim();
      
      const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
        params: {
          authorization: fast2smsKey,
          route: 'q',
          message: message,
          language: 'english',
          numbers: cleanPhone
        }
      });
      
      if (response.data && response.data.return) {
        res.json({ success: true, message: response.data.message });
      } else {
        res.status(500).json({ error: response.data.message || 'Fast2SMS gateway returned dispatch failure.' });
      }
    } catch (error: any) {
      const errorDetail = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message;
      console.error('[SMS Proxy] Fast2SMS delivery failed:', errorDetail);
      res.status(500).json({ error: `Fast2SMS Dispatch Error: ${errorDetail}` });
    }
  } else {
    // Default to free Textbelt gateway
    try {
      console.log(`[SMS Proxy] Relaying free Textbelt warning blast to ${phone}...`);
      const response = await axios.post('https://textbelt.com/text', {
        phone,
        message,
        key: 'textbelt'
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('[SMS Proxy] Textbelt delivery failed:', error.message || error);
      res.status(500).json({ error: error.message || 'SMS Gateway connection failure' });
    }
  }
});

// Dictionary for Bhashini-style translation fallbacks
const translateAlert = (title: string, message: string, lang: string): { title: string, message: string } => {
  // Simulates translation results for NER languages
  const translations: Record<string, { title: string, message: string }> = {
    as: {
      title: `[সতৰ্কতা] ${title}`,
      message: `ভূমিস্খলনৰ জাননী: ${message}. অনুগ্ৰহ কৰি সুৰক্ষিত স্থানলৈ যাওক।`
    },
    br: {
      title: `[सावधान] ${title}`,
      message: `हामख्रिनाय सांग्रांथि: ${message}. अनुग्रह खालामनानै रैखाथि जायगायाव थां।`
    },
    kha: {
      title: `[Kyllang] ${title}`,
      message: `Maham khyliap dew: ${message}. Sngewbha leit sha ki jaka ba shngain.`
    },
    mz: {
      title: `[Vantlang Ralrinna] ${title}`,
      message: `Leilung tlahniam lakah fimkhur rawh: ${message}. Hmun him lam pan rawh le.`
    },
    mni: {
      title: `[চেখঙন বা অমুক্তা] ${title}`,
      message: `লৈচিল তাবা চেকশিনৱা অমুক্তা: ${message}. চেকশিন থৌরাং লৌখৎউ।`
    },
    nag: {
      title: `[Warning] ${title}`,
      message: `Landslide warning: ${message}. Please shift to safe shelter.`
    }
  };

  return translations[lang] || { title, message };
};

// 1. GET ALL ALERTS
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = `
      SELECT 
        a.id,
        a.zone_id,
        a.title_en,
        a.message_en,
        a.translations,
        a.severity,
        a.status,
        a.created_at,
        z.name as zone_name,
        u.email as sender_email
      FROM alerts a
      LEFT JOIN risk_zones z ON a.zone_id = z.id
      LEFT JOIN users u ON a.sent_by = u.id
      ORDER BY a.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('[Get Alerts] Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. COMPOSE ALERT (Admins only) - Saves as Draft
router.post('/', authenticateToken, authorizeRoles('District Admin', 'SDMA Super Admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { zone_id, title_en, message_en, severity } = req.body;
  const senderId = req.user?.id;

  if (!title_en || !message_en || !severity) {
    res.status(400).json({ error: 'Title (EN), Message (EN), and Severity are required.' });
    return;
  }

  try {
    // Generate regional language translations
    const langs = ['as', 'br', 'kha', 'mz', 'mni', 'nag'];
    const translations: Record<string, { title: string, message: string }> = {};
    for (const lang of langs) {
      translations[lang] = translateAlert(title_en, message_en, lang);
    }

    const query = `
      INSERT INTO alerts (zone_id, title_en, message_en, translations, severity, status, sent_by)
      VALUES ($1, $2, $3, $4, $5, 'Draft', $6)
      RETURNING *
    `;
    const values = [zone_id || null, title_en, message_en, JSON.stringify(translations), severity, senderId];
    const result = await pool.query(query, values);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[Compose Alert] Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. DISPATCH ALERT (Admins only) - Triggers mass SMS/Push Simulation
router.post('/:id/dispatch', authenticateToken, authorizeRoles('District Admin', 'SDMA Super Admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const alertId = req.params.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch Alert
    const alertRes = await client.query('SELECT * FROM alerts WHERE id = $1', [alertId]);
    if (alertRes.rows.length === 0) {
      res.status(404).json({ error: 'Alert not found.' });
      client.release();
      return;
    }
    const alert = alertRes.rows[0];

    if (alert.status === 'Dispatched') {
      res.status(400).json({ error: 'Alert has already been dispatched.' });
      client.release();
      return;
    }

    // 2. Fetch target users.
    // In production, we would query users in that risk zone using PostGIS ST_DWithin or district filter.
    // For MVP, we fetch all active users to dispatch notifications to them.
    const usersRes = await client.query('SELECT id, phone, role, preferred_language FROM users');
    const users = usersRes.rows;

    const recipientInserts = [];
    for (const targetUser of users) {
      const preferredLang = targetUser.preferred_language || 'en';
      let title = alert.title_en;
      let msg = alert.message_en;

      if (preferredLang !== 'en' && alert.translations && alert.translations[preferredLang]) {
        title = alert.translations[preferredLang].title;
        msg = alert.translations[preferredLang].message;
      }

      // Simulate channel dispatch log
      // Very High severity -> SMS + Push. Moderate/High -> Push only for general public, SMS for responders
      const channels = alert.severity === 'Very High' ? ['SMS', 'Push'] : ['Push'];
      if (targetUser.role !== 'Citizen') {
        // Always send SMS to responders/officers
        if (!channels.includes('SMS')) channels.push('SMS');
      }

      for (const channel of channels) {
        recipientInserts.push({
          alert_id: alert.id,
          user_id: targetUser.id,
          channel,
          status: 'delivered', // simulated success
          error_message: null
        });

        if (channel === 'SMS') {
          console.log(`[SMS Client] SENDING via MSG91 (DLT Template ID: 140716...) to ${targetUser.phone || '9999999999'}: ${msg}`);
        } else {
          console.log(`[FCM Client] SENDING PUSH to user_${targetUser.id}: ${title} - ${msg}`);
        }
      }
    }

    // Batch insert recipients
    if (recipientInserts.length > 0) {
      const valuesSql = recipientInserts.map((_, i) => `($${i*5 + 1}, $${i*5 + 2}, $${i*5 + 3}, $${i*5 + 4}, $${i*5 + 5})`).join(', ');
      const queryParams = recipientInserts.flatMap(r => [r.alert_id, r.user_id, r.channel, r.status, r.error_message]);
      await client.query(`
        INSERT INTO alert_recipients (alert_id, user_id, channel, status, error_message)
        VALUES ${valuesSql}
      `, queryParams);
    }

    // 3. Update alert status to 'Dispatched'
    await client.query('UPDATE alerts SET status = \'Dispatched\' WHERE id = $1', [alertId]);

    await client.query('COMMIT');
    res.json({ message: 'Alert dispatched successfully to all district subscribers.', recipients_count: recipientInserts.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Dispatch Alert] Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// 4. GET ALERT RECIPIENTS LOG (For monitoring transmission success rate)
router.get('/:id/recipients', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const alertId = req.params.id;
  try {
    const query = `
      SELECT 
        r.id,
        r.channel,
        r.status,
        r.error_message,
        r.sent_at,
        u.email,
        u.phone
      FROM alert_recipients r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.alert_id = $1
      ORDER BY r.sent_at DESC
    `;
    const result = await pool.query(query, [alertId]);
    res.json(result.rows);
  } catch (error) {
    console.error('[Get Alert Recipients] Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
