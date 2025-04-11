import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Typography, Box, IconButton
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import config from '../../config';

export default function MusicTable({ data, userEmail, refreshSubscriptions, subscriptions }) {
  const [loadingItems, setLoadingItems] = useState([]); // Track loading musicIds

  // Generate an array of musicIds from the subscriptions passed from the parent component
  const subscribedItems = subscriptions ? subscriptions.map(item => item.musicId) : [];

  // Generate a unique musicId (combining title and album after trimming and lowercasing)
  const getMusicId = (music) => {
    const title = (music.title || '').trim().toLowerCase();
    const album = (music.album || '').trim().toLowerCase();
    return `${title}|${album}`;
  };

  // Handle subscription or unsubscription
  const handleSubscribeClick = async (music) => {
    const musicId = getMusicId(music);

    // Prevent double click
    if (loadingItems.includes(musicId)) return;

    setLoadingItems(prev => [...prev, musicId]);  // Add to loading state

    if (subscribedItems.includes(musicId)) {
      // Already subscribed → Unsubscribe
      try {
        const response = await fetch(
          `${config.apiGatewayURL}/subscription?email=${encodeURIComponent(userEmail)}&musicId=${encodeURIComponent(musicId)}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          }
        );
        if (response.ok) {
          refreshSubscriptions();
        } else {
          alert('Failed to unsubscribe');
          console.error('Failed to unsubscribe');
        }
      } catch (error) {
        alert('Unsubscribe error');
        console.error("Unsubscribe error:", error);
      }
    } else {
      // Not yet subscribed → Subscribe
      try {
        const response = await fetch(`${config.apiGatewayURL}/subscription`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            musicId: musicId,
            title: music.title,
            album: music.album,
            artist: music.artist,
            year: music.year
          })
        });
        if (response.ok) {
          refreshSubscriptions();
        } else {
          alert('Failed to subscribe. Please login.');
          console.error('Failed to subscribe');
        }
      } catch (error) {
        alert('Subscribe error');
        console.error("Subscribe error:", error);
      }
    }

    setLoadingItems(prev => prev.filter(id => id !== musicId));  // Remove from loading state
  };

  return (
    <TableContainer component={Paper} sx={{ maxWidth: '100%', mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '25%' }}><Typography variant="subtitle1" fontWeight="bold">Artist</Typography></TableCell>
            <TableCell sx={{ width: '25%' }}><Typography variant="subtitle1" fontWeight="bold">Title</Typography></TableCell>
            <TableCell sx={{ width: '25%' }}><Typography variant="subtitle1" fontWeight="bold">Album</Typography></TableCell>
            <TableCell sx={{ width: '15%' }}><Typography variant="subtitle1" fontWeight="bold">Year</Typography></TableCell>
            <TableCell sx={{ width: '10%' }}><Typography variant="subtitle1" fontWeight="bold">Subscription</Typography></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((music, index) => {
            const musicId = getMusicId(music);
            const isSubscribed = subscribedItems.includes(musicId);
            const isLoading = loadingItems.includes(musicId); // Check loading state

            return (
              <TableRow key={index}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <img
                      src={music.artistImageUrl}
                      alt={music.artist}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        marginRight: 10
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/40';
                      }}
                    />
                    <Typography>{music.artist}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{music.title}</TableCell>
                <TableCell>{music.album}</TableCell>
                <TableCell>{music.year}</TableCell>
                <TableCell align="center">
                  <IconButton
                    onClick={() => handleSubscribeClick(music)}
                    disabled={isLoading}  // Disable when loading
                  >
                    {isSubscribed ? (
                      <FavoriteIcon sx={{ color: 'red' }} />
                    ) : (
                      <FavoriteBorderIcon />
                    )}
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
