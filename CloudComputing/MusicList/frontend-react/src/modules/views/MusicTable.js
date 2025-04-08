import React, { useState, useEffect } from 'react';
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

  // Generate a unique musicId using title+album (after trimming and lowercasing)
  const getMusicId = (music) => {
    const title = (music.title || '').trim().toLowerCase();
    const album = (music.album || '').trim().toLowerCase();
    return `${title}|${album}`;
  };

  // Load current subscription list from the backend when component mounts or userEmail changes
  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const response = await fetch(
          `${config.backendBaseURL}/subscription/list?email=${encodeURIComponent(userEmail)}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          }
        );
        const result = await response.json();
        // Assuming the API returns {"items": [musicId1, musicId2, ...]}
        if (result.items) {
          setSubscribedItems(result.items);
        }
      } catch (error) {
        console.error("Error fetching subscriptions:", error);
      }
    };

    if (userEmail) {
      fetchSubscriptions();
    }
  }, [userEmail]);

  // Handle click event on the heart icon: subscribe or unsubscribe.
  // The UI will update only after a successful API call.
  const handleSubscribeClick = async (music) => {
    const musicId = getMusicId(music);

    if (subscribedItems.includes(musicId)) {
      // If already subscribed, attempt to unsubscribe
      try {
        const response = await fetch(
          `${config.backendBaseURL}/subscription?email=${encodeURIComponent(userEmail)}&musicId=${encodeURIComponent(musicId)}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          }
        );
        if (response.ok) {
          // Update state only after successful API call
          setSubscribedItems(subscribedItems.filter(id => id !== musicId));
        } else {
          alert('Failed to unsubscribe');
          console.error('Failed to unsubscribe');
        }
      } catch (error) {
        alert('Unsubscribe error');
        console.error("Unsubscribe error:", error);
      }
    } else {
      // If not subscribed, attempt to subscribe
      try {
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
          // Update state only after successful API call
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
