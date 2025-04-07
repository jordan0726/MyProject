import React, { useState } from 'react';
import Typography from '../components/Typography';
import MusicSearchLayout from './MusicSearchLayout';
import MusicSearchField from './MusicSearchField';
import { Box, Grid } from '@mui/material';
import MusicCard from './MusicCard';
import config from '../../config';


export default function MusicSearch({ username }) {
  const [searchResults, setSearchResults] = useState([]);

  // Search function to handle the query
  const handleQuery = async (query) => {
    console.log("Query parameters:", query);

    // Build the URL with query parameters
    const params = new URLSearchParams();
    if (query.title) params.append("title", query.title);
    if (query.year) params.append("year", query.year);
    if (query.artist) params.append("artist", query.artist);
    if (query.album) params.append("album", query.album);

    try{
        // Make the API call
      const response = await fetch(`${config.backendBaseURL}/music/music?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        setSearchResults(data.items);
      } else {
        // If backend responds items: []
        alert(data.message || "No result is retrieved. Please query again.");
        setSearchResults([]);
      }
    }
    catch (error) {
      console.error("Query error:", error);
      alert("Failed to query. Check console for details.");
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
      {/* Searching Fields */}
      <MusicSearchField onQuery={handleQuery} />

      {/* Searching Results */}
      <Box sx={{ mt: 4 }}>
        <Grid container spacing={2}>
          {searchResults.map((item, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <MusicCard music={item} />
            </Grid>
          ))}
        </Grid>
      </Box>

    </MusicSearchLayout>
  );
}
