import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Typography, Box, IconButton
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import config from '../../config';  // assuming config.backendBaseURL is set

export default function MusicTable({ data, userEmail }) {
  // Local state to track subscribed music IDs
  const [subscribedItems, setSubscribedItems] = useState([]);

  // Generate a unique musicId using title+album (after trimming any whitespace)
  const getMusicId = (music) => {
    const title = music.title?.trim() || '';
    const album = music.album?.trim() || '';
    return `${title}|${album}`;
  };

  // Handle click event on the heart icon: subscribe or unsubscribe.
  // The UI will only update when the API call is successful.
  const handleSubscribeClick = async (music) => {
    const musicId = getMusicId(music);

    // If the item is already subscribed, attempt to unsubscribe
    if (subscribedItems.includes(musicId)) {
      try {
        // DELETE subscription API call. Ensure email and musicId are properly URL encoded.
        const response = await fetch(
          `${config.backendBaseURL}/subscription?email=${encodeURIComponent(userEmail)}&musicId=${encodeURIComponent(musicId)}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          }
        );
        if (response.ok) {
          // Only update the subscribedItems state after successful API response.
          setSubscribedItems(subscribedItems.filter(id => id !== musicId));
        } else {
          // If the response is not OK, alert an error and do not update the UI.
          alert('Failed to unsubscribe');
          console.error('Failed to unsubscribe');
        }
      } catch (error) {
        alert('Unsubscribe error');
        console.error("Unsubscribe error:", error);
      }
    } else {
      // If the item is not subscribed, attempt to subscribe
      try {
        // POST subscription API call with required data fields.
        const response = await fetch(`${config.backendBaseURL}/subscription`, {
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
          // Only update the subscribedItems state if the subscription API call was successful.
          setSubscribedItems([...subscribedItems, musicId]);
        } else {
          alert('Failed to subscribe');
          console.error('Failed to subscribe');
        }
      } catch (error) {
        alert('Subscribe error');
        console.error("Subscribe error:", error);
      }
    }
  };


  return (
    <TableContainer component={Paper} sx={{ maxWidth: '100%', mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '25%' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Artist
              </Typography>
            </TableCell>
            <TableCell sx={{ width: '25%' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Title
              </Typography>
            </TableCell>
            <TableCell sx={{ width: '25%' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Album
              </Typography>
            </TableCell>
            <TableCell sx={{ width: '15%' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Year
              </Typography>
            </TableCell>
            <TableCell sx={{ width: '10%' }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((music, index) => {
            const musicId = getMusicId(music);
            const isSubscribed = subscribedItems.includes(musicId);
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
                  <IconButton onClick={() => handleSubscribeClick(music)}>
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
