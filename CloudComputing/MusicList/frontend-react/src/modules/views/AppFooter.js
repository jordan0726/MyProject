import * as React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Container from '@mui/material/Container';
import Typography from '../components/Typography';

export default function AppFooter() {
  return (
    <Box
      component="footer"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'secondary.light',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
          {'Copyright © '}
          <Link color="inherit" component={RouterLink} to="/main">
            MyMusicList
          </Link>{' '}
          {new Date().getFullYear()}
          {'.'} <br />
          Built with{' '}
          <Link href="https://mui.com/" target="_blank">
            MUI
          </Link>
          . Licensed under{' '}
          <Link href="https://opensource.org/licenses/MIT" target="_blank">
            MIT License
          </Link>.
        </Typography>


        <Typography variant="body2" color="text.secondary" align="center">
          {'Icons made by '}
          <Link href="https://www.freepik.com" rel="sponsored" title="Freepik">
            Freepik
          </Link>
          {' from '}
          <Link href="https://www.flaticon.com" rel="sponsored" title="Flaticon">
            www.flaticon.com
          </Link>
          {' is licensed by '}
          <Link
            href="https://creativecommons.org/licenses/by/3.0/"
            title="Creative Commons BY 3.0"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC 3.0 BY
          </Link>
        </Typography>
      </Container>
    </Box>
  );
}
