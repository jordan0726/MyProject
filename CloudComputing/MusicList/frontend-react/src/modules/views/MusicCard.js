import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

export default function MusicCard({ music }) {
  const { title, artist, album, year } = music;

  return (
    <Card sx={{ minWidth: 200 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="subtitle1">
          Artist: {artist}
        </Typography>
        <Typography variant="subtitle1">
          Album: {album}
        </Typography>
        <Typography variant="subtitle2">
          Year: {year}
        </Typography>
      </CardContent>
    </Card>
  );
}
