import React, { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';

export default function MusicQueryArea({ onQuery }) {
  const [query, setQuery] = useState({
    title: '',
    year: '',
    artist: '',
    album: ''
  });

  const handleChange = (e) => {
    setQuery({ ...query, [e.target.name]: e.target.value });
  };

  const handleQuery = () => {
    onQuery(query);
  };

  const inputStyle = {
    backgroundColor: 'white',
    borderRadius: 1,
    width: '180px'
  };

  return (
    <Box display="flex" alignItems="center" gap={2} sx={{ flexWrap: 'wrap', my: 2 }}>
      <TextField
        label="Title"
        name="title"
        value={query.title}
        onChange={handleChange}
        variant="outlined"
        sx={inputStyle}
      />
      <TextField
        label="Year"
        name="year"
        value={query.year}
        onChange={handleChange}
        variant="outlined"
        sx={inputStyle}
      />
      <TextField
        label="Artist"
        name="artist"
        value={query.artist}
        onChange={handleChange}
        variant="outlined"
        sx={inputStyle}
      />
      <TextField
        label="Album"
        name="album"
        value={query.album}
        onChange={handleChange}
        variant="outlined"
        sx={inputStyle}
      />
      <Button
        variant="contained"
        onClick={handleQuery}
        sx={{
          height: '56px',
          px: 3,
          fontWeight: 'bold',
          boxShadow: 2
        }}
      >
        QUERY
      </Button>
    </Box>
  );
}
