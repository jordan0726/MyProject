import * as React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import AppBar from '../components/AppBar';
import Toolbar from '../components/Toolbar';

const rightLink = {
  fontSize: 16,
  color: 'common.white',
  ml: 3,
};

function AppAppBar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div>
      <AppBar position="fixed">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }} />
          <Link
            variant="h6"
            underline="none"
            color="inherit"
            component={RouterLink}
            to="/main"
            sx={{ fontSize: 24 }}
          >
            {'My MusicList'}
          </Link>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            {user ? (
              <Link
                color="inherit"
                variant="h6"
                underline="none"
                component="button"
                onClick={handleLogout}
                sx={rightLink}
              >
                {'Log Out'}
              </Link>
            ) : (
              <>
                <Link
                  color="inherit"
                  variant="h6"
                  underline="none"
                  component={RouterLink}
                  to="/login"
                  sx={rightLink}
                >
                  {'Log In'}
                </Link>
                <Link
                  component={RouterLink}
                  to="/register"
                  variant="h6"
                  underline="none"
                  sx={{ ...rightLink, color: 'secondary.main' }}
                >
                  {'Register'}
                </Link>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Toolbar />
    </div>
  );
}

export default AppAppBar;
