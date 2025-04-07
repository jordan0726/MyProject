import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Typography
} from '@mui/material';

export default function MusicTable({ data }) {
  return (
    <TableContainer component={Paper} sx={{ maxWidth: '100%', mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <Typography variant="subtitle1" fontWeight="bold">
                Artist
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle1" fontWeight="bold">
                Image
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle1" fontWeight="bold">
                Title
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle1" fontWeight="bold">
                Album
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle1" fontWeight="bold">
                Year
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((music, index) => (
            <TableRow key={index}>
              <TableCell>{music.artist}</TableCell>
              <TableCell>
                {music.artistImageUrl ? (
                  <img
                    src={music.artistImageUrl}
                    alt={music.artist}
                    style={{ width: 50, height: 50, objectFit: 'cover' }}
                  />
                ) : (
                  "No image"
                )}
              </TableCell>
              <TableCell>{music.title}</TableCell>
              <TableCell>{music.album}</TableCell>
              <TableCell>{music.year}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
