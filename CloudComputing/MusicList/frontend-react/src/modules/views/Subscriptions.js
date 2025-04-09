import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Typography, Box
} from '@mui/material';
import config from '../../config';

export default function Subscription({ userEmail }) {
  const [subscriptions, setSubscriptions] = useState([]);

  // Fetch subscription details from backend API when userEmail changes.
  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      try {
        const response = await fetch(
          `${config.backendBaseURL}/subscription/details?email=${encodeURIComponent(userEmail)}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );
        const data = await response.json();
        if (data.items) {
          setSubscriptions(data.items);
        }
      } catch (error) {
        console.error("Error fetching subscription details:", error);
      }
    };

    if (userEmail) {
      fetchSubscriptionDetails();
    }
  }, [userEmail]);

  return (
    <TableContainer component={Paper} sx={{ maxWidth: '100%', mt: 4, mb: 4 }}>
      <Typography variant="h4" align="center" sx={{ mt: 2, mb: 2 }}>
        Your Subscriptions
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '25%' }}>
              {/* Artist column header */}
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
          </TableRow>
        </TableHead>
        <TableBody>
          {subscriptions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">
                <Typography variant="body1">
                  You have not subscribed to any songs yet.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            subscriptions.map((sub, index) => (
              <TableRow key={index}>
                <TableCell>
                  {/* Display the artist image and name */}
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
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
