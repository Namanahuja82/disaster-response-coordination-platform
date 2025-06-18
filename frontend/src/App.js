import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const socket = io(API_BASE_URL);


function App() {
  const [disasters, setDisasters] = useState([]);
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [reports, setReports] = useState([]);
  const [resources, setResources] = useState([]);
  const [socialMedia, setSocialMedia] = useState([]);
  const [officialUpdates, setOfficialUpdates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [disasterForm, setDisasterForm] = useState({
    title: '',
    location_name: '',
    description: '',
    tags: ''
  });

  const [reportForm, setReportForm] = useState({
    content: '',
    image_url: ''
  });

  const [geocodeText, setGeocodeText] = useState('');
  const [geocodeResult, setGeocodeResult] = useState(null);

  // Load disasters on component mount
  useEffect(() => {
    fetchDisasters();
    
    // WebSocket listeners
    socket.on('disaster_updated', (data) => {
      console.log('Disaster updated:', data);
      fetchDisasters();
    });

    socket.on('social_media_updated', (data) => {
      console.log('Social media updated:', data);
      setSocialMedia(data.data);
    });

    return () => {
      socket.off('disaster_updated');
      socket.off('social_media_updated');
    };
  }, []);

  // API calls
  const fetchDisasters = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/disasters`);
      const data = await response.json();
      setDisasters(data);
    } catch (error) {
      console.error('Error fetching disasters:', error);
    }
  };

  const createDisaster = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/disasters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...disasterForm,
          tags: disasterForm.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        })
      });
      
      if (response.ok) {
        setDisasterForm({ title: '', location_name: '', description: '', tags: '' });
        fetchDisasters();
      }
    } catch (error) {
      console.error('Error creating disaster:', error);
    }
    setLoading(false);
  };

  const selectDisaster = async (disaster) => {
    setSelectedDisaster(disaster);
    setLoading(true);
    
    try {
      // Fetch reports
      const reportsResponse = await fetch(`${process.env.REACT_APP_API_URL}/reports/${disaster.id}`);
      const reportsData = await reportsResponse.json();
      setReports(reportsData);

      // Fetch resources
      const resourcesResponse = await fetch(`${process.env.REACT_APP_API_URL}/disasters/${disaster.id}/resources`);
      const resourcesData = await resourcesResponse.json();
      setResources(resourcesData);

      // Fetch social media
      const socialResponse = await fetch(`${process.env.REACT_APP_API_URL}/disasters/${disaster.id}/social-media`);
      const socialData = await socialResponse.json();
      setSocialMedia(socialData);

      // Fetch official updates
      const updatesResponse = await fetch(`${process.env.REACT_APP_API_URL}/disasters/${disaster.id}/official-updates`);
      const updatesData = await updatesResponse.json();
      setOfficialUpdates(updatesData);
      
    } catch (error) {
      console.error('Error fetching disaster details:', error);
    }
    setLoading(false);
  };

  const createReport = async (e) => {
    e.preventDefault();
    if (!selectedDisaster) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disaster_id: selectedDisaster.id,
          ...reportForm
        })
      });
      
      if (response.ok) {
        setReportForm({ content: '', image_url: '' });
        // Refresh reports
        const reportsResponse = await fetch(`${process.env.REACT_APP_API_URL}/reports/${selectedDisaster.id}`);
        const reportsData = await reportsResponse.json();
        setReports(reportsData);
      }
    } catch (error) {
      console.error('Error creating report:', error);
    }
    setLoading(false);
  };

  const geocodeLocation = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: geocodeText })
      });
      
      const data = await response.json();
      setGeocodeResult(data);
    } catch (error) {
      console.error('Error geocoding:', error);
    }
    setLoading(false);
  };

  const verifyImage = async (imageUrl) => {
    if (!selectedDisaster) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/disasters/${selectedDisaster.id}/verify-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl })
      });
      
      const verification = await response.json();
      alert(`Verification Score: ${verification.score}/10\nReasoning: ${verification.reasoning}`);
    } catch (error) {
      console.error('Error verifying image:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-blue-800">
          🚨 Disaster Response Coordination Platform
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Forms */}
          <div className="space-y-6">
            {/* Create Disaster Form */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-red-600">Create Disaster</h2>
              <form onSubmit={createDisaster} className="space-y-3">
                <input
                  type="text"
                  placeholder="Disaster Title"
                  value={disasterForm.title}
                  onChange={(e) => setDisasterForm({...disasterForm, title: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  required
                />
                <input
                  type="text"
                  placeholder="Location (e.g., Manhattan, NYC)"
                  value={disasterForm.location_name}
                  onChange={(e) => setDisasterForm({...disasterForm, location_name: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={disasterForm.description}
                  onChange={(e) => setDisasterForm({...disasterForm, description: e.target.value})}
                  className="w-full p-2 border rounded-md h-20"
                  required
                />
                <input
                  type="text"
                  placeholder="Tags (comma separated, e.g., flood, urgent)"
                  value={disasterForm.tags}
                  onChange={(e) => setDisasterForm({...disasterForm, tags: e.target.value})}
                  className="w-full p-2 border rounded-md"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 text-white p-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Disaster'}
                </button>
              </form>
            </div>

            {/* Geocoding Tool */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-600">🌍 Location Extraction</h2>
              <form onSubmit={geocodeLocation} className="space-y-3">
                <textarea
                  placeholder="Enter text to extract location from..."
                  value={geocodeText}
                  onChange={(e) => setGeocodeText(e.target.value)}
                  className="w-full p-2 border rounded-md h-20"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Extract & Geocode'}
                </button>
              </form>
              {geocodeResult && (
                <div className="mt-4 p-3 bg-green-50 rounded-md">
                  <p><strong>Location:</strong> {geocodeResult.locationName}</p>
                  <p><strong>Coordinates:</strong> {geocodeResult.coordinates.lat}, {geocodeResult.coordinates.lng}</p>
                </div>
              )}
            </div>

            {/* Create Report Form */}
            {selectedDisaster && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-green-600">📝 Submit Report</h2>
                <p className="text-sm text-gray-600 mb-3">For: {selectedDisaster.title}</p>
                <form onSubmit={createReport} className="space-y-3">
                  <textarea
                    placeholder="Report content..."
                    value={reportForm.content}
                    onChange={(e) => setReportForm({...reportForm, content: e.target.value})}
                    className="w-full p-2 border rounded-md h-20"
                    required
                  />
                  <input
                    type="url"
                    placeholder="Image URL (optional)"
                    onChange={(e) => setReportForm({...reportForm, image_url: e.target.value})}
                    className="w-full p-2 border rounded-md"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Report'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Middle Panel - Disasters List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">🔥 Active Disasters</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {disasters.map((disaster) => (
                <div
                  key={disaster.id}
                  onClick={() => selectDisaster(disaster)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedDisaster?.id === disaster.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <h3 className="font-semibold text-lg">{disaster.title}</h3>
                  <p className="text-sm text-gray-600">📍 {disaster.location_name}</p>
                  <p className="text-sm text-gray-700 mt-1">{disaster.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {disaster.tags?.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Created: {new Date(disaster.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Disaster Details */}
          <div className="space-y-4">
            {selectedDisaster ? (
              <>
                {/* Reports */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">📋 Reports</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {reports.map((report) => (
                      <div key={report.id} className="p-3 bg-gray-50 rounded-md">
                        <p className="text-sm">{report.content}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">By: {report.user_id}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            report.verification_status === 'verified' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {report.verification_status}
                          </span>
                        </div>
                        {report.image_url && (
                          <button
                            onClick={() => verifyImage(report.image_url)}
                            className="mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                          >
                            🔍 Verify Image
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resources */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">🏥 Resources</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {resources.map((resource) => (
                      <div key={resource.id} className="p-2 bg-blue-50 rounded-md">
                        <p className="font-medium text-sm">{resource.name}</p>
                        <p className="text-xs text-gray-600">📍 {resource.location_name}</p>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {resource.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Social Media */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">📱 Social Media</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {socialMedia.map((post, index) => (
                      <div key={index} className="p-2 bg-twitter-blue-50 rounded-md">
                        <p className="text-sm">{post.post}</p>
                        <p className="text-xs text-gray-500">@{post.user}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Official Updates */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">🏛️ Official Updates</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {officialUpdates.map((update, index) => (
                      <div key={index} className="p-2 bg-green-50 rounded-md">
                        <p className="font-medium text-sm">{update.title}</p>
                        <p className="text-xs text-gray-600">{update.source}</p>
                        <p className="text-xs">{update.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <p className="text-gray-500">Select a disaster to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6 bg-gray-800 text-white p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span>🔴 System Status: Online</span>
            <span>📊 Total Disasters: {disasters.length}</span>
            <span>👥 Connected Users: {selectedDisaster ? '3' : '1'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;