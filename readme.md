# Disaster Response Platform Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- Supabase account
- Google AI Studio account (for Gemini API)

## Step 1: Create React App
```bash
npx create-react-app disaster-response-platform
cd disaster-response-platform
```

## Step 2: Install Dependencies

### Backend Dependencies
```bash
npm install express cors dotenv @supabase/supabase-js socket.io axios cheerio @google/generative-ai
npm install -D nodemon
```

### Frontend Dependencies
```bash
npm install socket.io-client
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## Step 3: Configure Tailwind CSS
Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Add to `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Step 4: Setup Supabase
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Settings → API to get your URL and anon key
3. Go to SQL Editor and run the main SQL setup script

## Step 5: Setup Google Gemini API
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key for your .env file

## Step 6: Environment Variables
Create `.env` file in root directory with your credentials:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

## Step 7: File Structure
```
disaster-response-platform/
├── src/
│   ├── App.js (React frontend)
│   └── index.css (with Tailwind)
├── server.js (Backend server)
├── package.json
└── .env
```

## Step 8: Replace Files
1. Replace `src/App.js` with the provided React code
2. Create `server.js` in root with the provided backend code
3. Update `package.json` with the provided dependencies

## Step 9: Run the Application

### Terminal 1 - Backend Server
```bash
node server.js
# or for development
npx nodemon server.js
```

### Terminal 2 - React Frontend
```bash
npm start
```

## Step 10: Test the Application

### Basic Flow:
1. Open http://localhost:3000
2. Create a new disaster using the form
3. Click on a disaster to select it
4. Submit reports for the selected disaster
5. View real-time social media updates
6. Use the geocoding tool to extract locations

### API Endpoints to Test:
- `GET /disasters` - List all disasters
- `POST /disasters` - Create new disaster
- `POST /geocode` - Extract location from text
- `GET /disasters/:id/social-media` - Get social media reports
- `GET /disasters/:id/resources` - Get nearby resources
- `POST /reports` - Submit a report
- `POST /disasters/:id/verify-image` - Verify image authenticity

## Features Implemented:
✅ CRUD operations for disasters  
✅ Location extraction using Gemini AI  
✅ Geocoding with OpenStreetMap  
✅ Mock social media monitoring  
✅ Geospatial resource mapping  
✅ Image verification with Gemini  
✅ Real-time updates with WebSockets  
✅ Supabase caching system  
✅ Structured logging  
✅ Responsive UI with Tailwind CSS  

## Deployment:
- Frontend: Deploy to Vercel (`vercel --prod`)
- Backend: Deploy to Render
- Database: Already hosted on Supabase

## Notes:
- Mock authentication is implemented (hardcoded users)
- Social media uses mock data (Twitter API alternative)
- Rate limiting is handled through Supabase caching
- All external API responses are cached for 1 hour
- OpenStreetMap Nominatim is used for geocoding (free alternative)

## Troubleshooting:
- Ensure Supabase URL and keys are correct
- Check that all SQL scripts ran successfully
- Verify Gemini API key is valid
- Make sure both servers are running on different ports (3000 and 5000)