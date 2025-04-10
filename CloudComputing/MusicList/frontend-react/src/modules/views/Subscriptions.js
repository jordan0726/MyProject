import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Typography, Box, Button
} from '@mui/material';
import config from '../../config';

export default function Subscription({ userEmail, subscriptions, refreshSubscriptions }) {
  // Generate a unique musicId using title+album (after trimming and lowercasing)
  const getMusicId = (sub) => {
    const title = (sub.title || '').trim().toLowerCase();
    const album = (sub.album || '').trim().toLowerCase();
    return `${title}|${album}`;
  };

  // Handle removal of subscription
  const handleRemove = async (sub) => {
    const musicId = getMusicId(sub);
    try {
      const response = await fetch(
        `${config.backendBaseURL}/subscription?email=${encodeURIComponent(userEmail)}&musicId=${encodeURIComponent(musicId)}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      if (!response.ok) {
        alert('Failed to unsubscribe');
        console.error('Failed to unsubscribe');
        return;
      }
      // Successful removal: trigger parent's refresh to update subscriptions
      refreshSubscriptions();
    } catch (error) {
      alert('Error removing subscription');
      console.error("Remove subscription error:", error);
    }
  };

  return (
    <Box sx={{ maxWidth: '90%', mx: 'auto', mt: 4, mb: 4 }}>
      {/* Header outside the Paper box */}
      <Typography variant="h4" align="center" sx={{ mt: 2, mb: 2 }}>
        YOUR SUBSCRIPTIONS
      </Typography>

      <Paper sx={{ p: 2 }}>
        {/* You could add a success removal message here if needed */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '20%' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Artist
                  </Typography>
                </TableCell>
                <TableCell sx={{ width: '20%' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Title
                  </Typography>
                </TableCell>
                <TableCell sx={{ width: '20%' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Album
                  </Typography>
                </TableCell>
                <TableCell sx={{ width: '15%' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Year
                  </Typography>
                </TableCell>
                <TableCell sx={{ width: '25%' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Remove
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body1">
                      You have not subscribed to any songs yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <img
                          src={sub.artistImageUrl}
                          alt={sub.artist}
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
                        <Typography>{sub.artist}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{sub.title}</TableCell>
                    <TableCell>{sub.album}</TableCell>
                    <TableCell>{sub.year}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleRemove(sub)}
                      >
                        REMOVE
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
