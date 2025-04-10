import React, { useState } from 'react';
import Typography from '../components/Typography';
import MusicSearchLayout from './MusicSearchLayout';
import MusicSearchField from './MusicSearchField';
import { Box } from '@mui/material';
import MusicTable from './MusicTable';
import config from '../../config';

export default function MusicSearch({ username, userEmail, subscriptions, refreshSubscriptions }) {
  const [searchResults, setSearchResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Search function to handle the query
  const handleQuery = async (query) => {
    console.log("Query parameters:", query);
    setErrorMessage(''); // Reset error message

    // Check if at least one field is filled
    if (!query.title && !query.year && !query.artist && !query.album) {
      setErrorMessage('Please fill in at least one field to search.');
      return;
    }

    // Build the URL with query parameters
    const params = new URLSearchParams();
    if (query.title) params.append("title", query.title);
    if (query.year) params.append("year", query.year);
    if (query.artist) params.append("artist", query.artist);
    if (query.album) params.append("album", query.album);

    try {
      // Make the API call
      const response = await fetch(`${config.backendBaseURL}/music/music?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        setSearchResults(data.items);
      } else {
        // If backend responds with items: []
        setErrorMessage(data.message || "No results found! Please try again.");
        setSearchResults([]);
      }
    }
    catch (error) {
      console.error("Query error:", error);
      setErrorMessage("Failed to query from the server. Please try again later.");
    }
  };

  return (
    <MusicSearchLayout
      sxBackground={{
        backgroundColor: '#ff3366',
        backgroundPosition: 'center',
      }}
    >
      <Typography color="inherit" align="center" variant="h2" marked="center">
        Welcome, {username || 'guest'}
      </Typography>
      <Typography
        color="inherit"
        align="center"
        variant="h5"
        sx={{ mb: 4, mt: { xs: 2, sm: 2 } }}
      >
        Discover and manage your favorite music now 🎵
      </Typography>

      {/* Display error message */}
      {errorMessage && (
        <Typography
          align="center"
          sx={{
            mt: 2,
            fontWeight: 'bold',
            color: 'error.main',         // Use the primary error (red) color from MUI theme
            backgroundColor: 'white',    // White background for contrast
            px: 2,
            py: 1,
            borderRadius: 1,
          }}
        >
          {errorMessage} ⚠️
        </Typography>
      )}

      {/* Searching Fields */}
      <MusicSearchField onQuery={handleQuery} />

      {/* Searching Results: pass refreshSubscriptions to MusicTable */}
      {searchResults.length > 0 && (
        <MusicTable
          data={searchResults}
          userEmail={userEmail}
          subscriptions={subscriptions}
          refreshSubscriptions={refreshSubscriptions}
        />
      )}
    </MusicSearchLayout>
  );
}
