const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const cheerio = require('cheerio');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();


const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://disaster-response-coordination-plat-three.vercel.app"],
    methods: ["GET", "POST"]
  }
});


// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "https://disaster-response-coordination-plat-three.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Mock users for authentication
const mockUsers = {
  netrunnerX: { id: 'netrunnerX', role: 'admin' },
  reliefAdmin: { id: 'reliefAdmin', role: 'admin' },
  citizen1: { id: 'citizen1', role: 'contributor' }
};

// Cache helper functions
async function getCache(key) {
  const { data } = await supabase
    .from('cache')
    .select('value, expires_at')
    .eq('key', key)
    .single();
  
  if (data && new Date(data.expires_at) > new Date()) {
    return data.value;
  }
  return null;
}

async function setCache(key, value, ttlMinutes = 60) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await supabase
    .from('cache')
    .upsert({ key, value, expires_at: expiresAt });
}

// Geocoding using OpenStreetMap Nominatim
async function geocodeLocation(locationName) {
  const cacheKey = `geocode_${locationName}`;
  let cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: {
        q: locationName,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'DisasterResponsePlatform/1.0'
      }
    });

    const result = response.data[0];
    if (result) {
      const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
      await setCache(cacheKey, coords);
      return coords;
    }
  } catch (error) {
    console.error('Geocoding error:', error.message);
  }
  return null;
}

// Extract location using Gemini AI
async function extractLocationWithGemini(text) {
  const cacheKey = `extract_location_${text}`;
  let cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.post(
      `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `Extract the most specific location name from this text. Return only the location name (city, state/country format preferred): "${text}"`
              }
            ]
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const locationName = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (locationName) {
      await setCache(cacheKey, locationName);
      return locationName;
    }
  } catch (error) {
    console.error('Gemini API (extractLocation) error:', error.message);
  }

  return null;
}


// Image verification using Gemini AI
async function verifyImageWithGemini(imageUrl) {
  const cacheKey = `verify_image_${imageUrl}`;
  let cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Analyze this disaster-related image for authenticity and context. Rate from 1-10 (10 being most authentic) and provide brief reasoning: ${imageUrl}`;
    
    const result = await model.generateContent(prompt);
    const verification = {
      score: Math.floor(Math.random() * 3) + 7, // Mock score 7-10
      reasoning: result.response.text().trim(),
      status: 'verified'
    };
    
    await setCache(cacheKey, verification);
    return verification;
  } catch (error) {
    console.error('Gemini image verification error:', error.message);
    return { score: 5, reasoning: 'Unable to verify', status: 'pending' };
  }
}

// Mock social media API
function getMockSocialMediaData() {
  return [
    { post: "#floodrelief Need food in NYC Lower East Side", user: "citizen1", timestamp: new Date() },
    { post: "SOS: Family trapped in Manhattan basement #emergency", user: "citizen2", timestamp: new Date() },
    { post: "Red Cross shelter at 42nd Street has space #disaster", user: "reliefworker1", timestamp: new Date() },
    { post: "URGENT: Medical supplies needed in Brooklyn #help", user: "medic1", timestamp: new Date() }
  ];
}

// Browse Page - Fetch official updates
async function fetchOfficialUpdates() {
  const cacheKey = 'official_updates';
  let cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    // Mock official updates since we can't scrape real sites
    const updates = [
      {
        source: "FEMA",
        title: "Emergency Response Activated",
        content: "Federal emergency response activated for NYC flooding",
        url: "https://fema.gov/emergency-response",
        timestamp: new Date()
      },
      {
        source: "Red Cross",
        title: "Shelter Operations",
        content: "Multiple shelters opened across affected areas",
        url: "https://redcross.org/shelter-updates",
        timestamp: new Date()
      }
    ];
    
    await setCache(cacheKey, updates);
    return updates;
  } catch (error) {
    console.error('Error fetching official updates:', error.message);
    return [];
  }
}

// Routes

// POST /geocode - Extract location and geocode
app.post('/geocode', async (req, res) => {
  try {
    const { text } = req.body;
    
    // Extract location using Gemini
    const locationName = await extractLocationWithGemini(text);
    if (!locationName) {
      return res.status(400).json({ error: 'Could not extract location' });
    }
    
    // Geocode the location
    const coords = await geocodeLocation(locationName);
    if (!coords) {
      return res.status(400).json({ error: 'Could not geocode location' });
    }
    
    res.json({ locationName, coordinates: coords });
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

// Disasters CRUD
app.post('/disasters', async (req, res) => {
  try {
    const { title, location_name, description, tags, owner_id = 'netrunnerX' } = req.body;
    
    let location = null;
    if (location_name) {
      const coords = await geocodeLocation(location_name);
      if (coords) {
        location = `POINT(${coords.lng} ${coords.lat})`;
      }
    }
    
    const { data, error } = await supabase
      .from('disasters')
      .insert({
        title,
        location_name,
        location,
        description,
        tags,
        owner_id,
        audit_trail: [{ action: 'create', user_id: owner_id, timestamp: new Date() }]
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`Disaster created: ${title} at ${location_name}`);
    io.emit('disaster_updated', { action: 'create', disaster: data });
    
    res.json(data);
  } catch (error) {
    console.error('Error creating disaster:', error);
    res.status(500).json({ error: 'Failed to create disaster' });
  }
});

app.get('/disasters', async (req, res) => {
  try {
    const { tag } = req.query;
    let query = supabase.from('disasters').select('*');
    
    if (tag) {
      query = query.contains('tags', [tag]);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching disasters:', error);
    res.status(500).json({ error: 'Failed to fetch disasters' });
  }
});

app.put('/disasters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, location_name, description, tags, owner_id = 'netrunnerX' } = req.body;
    
    let location = null;
    if (location_name) {
      const coords = await geocodeLocation(location_name);
      if (coords) {
        location = `POINT(${coords.lng} ${coords.lat})`;
      }
    }
    
    const { data: current } = await supabase.from('disasters').select('audit_trail').eq('id', id).single();
    const newAuditTrail = [...(current?.audit_trail || []), { action: 'update', user_id: owner_id, timestamp: new Date() }];
    
    const { data, error } = await supabase
      .from('disasters')
      .update({
        title,
        location_name,
        location,
        description,
        tags,
        audit_trail: newAuditTrail
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`Disaster updated: ${title}`);
    io.emit('disaster_updated', { action: 'update', disaster: data });
    
    res.json(data);
  } catch (error) {
    console.error('Error updating disaster:', error);
    res.status(500).json({ error: 'Failed to update disaster' });
  }
});

app.delete('/disasters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('disasters')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    console.log(`Disaster deleted: ${id}`);
    io.emit('disaster_updated', { action: 'delete', id });
    
    res.json({ message: 'Disaster deleted successfully' });
  } catch (error) {
    console.error('Error deleting disaster:', error);
    res.status(500).json({ error: 'Failed to delete disaster' });
  }
});

// Social Media Reports
app.get('/disasters/:id/social-media', async (req, res) => {
  try {
    const socialMediaData = getMockSocialMediaData();
    io.emit('social_media_updated', { disaster_id: req.params.id, data: socialMediaData });
    res.json(socialMediaData);
  } catch (error) {
    console.error('Error fetching social media:', error);
    res.status(500).json({ error: 'Failed to fetch social media data' });
  }
});

// Resources with geospatial queries
app.get('/disasters/:id/resources', async (req, res) => {
  try {
    const { lat, lng, radius = 10000 } = req.query; // radius in meters
    
    let query = supabase
      .from('resources')
      .select('*')
      .eq('disaster_id', req.params.id);
    
    if (lat && lng) {
      // Use PostGIS function for proximity search
      const { data, error } = await supabase
        .rpc('get_nearby_resources', {
          disaster_id: req.params.id,
          user_lat: parseFloat(lat),
          user_lng: parseFloat(lng),
          radius_meters: parseInt(radius)
        });
      
      if (error) {
        // Fallback to regular query if RPC fails
        const { data: fallbackData, error: fallbackError } = await query;
        if (fallbackError) throw fallbackError;
        return res.json(fallbackData);
      }
      
      return res.json(data);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// Official Updates
app.get('/disasters/:id/official-updates', async (req, res) => {
  try {
    const updates = await fetchOfficialUpdates();
    res.json(updates);
  } catch (error) {
    console.error('Error fetching official updates:', error);
    res.status(500).json({ error: 'Failed to fetch official updates' });
  }
});

// Image Verification
app.post('/disasters/:id/verify-image', async (req, res) => {
  try {
    const { image_url } = req.body;
    const verification = await verifyImageWithGemini(image_url);
    
    // Update report verification status
    await supabase
      .from('reports')
      .update({ verification_status: verification.status })
      .eq('image_url', image_url);
    
    res.json(verification);
  } catch (error) {
    console.error('Error verifying image:', error);
    res.status(500).json({ error: 'Failed to verify image' });
  }
});

// Reports
app.post('/reports', async (req, res) => {
  try {
    const { disaster_id, user_id = 'citizen1', content, image_url } = req.body;
    
    const { data, error } = await supabase
      .from('reports')
      .insert({
        disaster_id,
        user_id,
        content,
        image_url,
        verification_status: 'pending'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`Report processed: ${content.substring(0, 50)}...`);
    res.json(data);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

app.get('/reports/:disaster_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('disaster_id', req.params.disaster_id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});