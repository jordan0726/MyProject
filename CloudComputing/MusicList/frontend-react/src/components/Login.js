import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';

function Copyright() {
  return (
    <Typography variant="body2" color="text.secondary" align="center">
      {'Copyright © '}
      <Link color="inherit" href="https://mui.com/"> // 換網址！！！
        MyMusicList
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}<br />
      Built with <Link href="https://mui.com/" target="_blank">MUI</Link>. Licensed under <Link href="https://opensource.org/licenses/MIT" target="_blank">MIT License</Link>.
    </Typography>
  );
}
// Based on MUI template (MIT License): https://mui.com/


export default function SignIn() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("s40689590@student.rmit.edu.au");
    const [password, setPassword] = useState('012345');

    const handleSubmit = async (event) => {
        event.preventDefault();

        try{
            const response = await fetch('http://ec2-44-203-117-16.compute-1.amazonaws.com/auth/login', {
                method: 'POST',
                headers:{ 'Content-Type': 'application/json'},
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if(!response.ok){
                alert("❌ Login failed: Email or password is incorrect, please try again!");
                console.error("Login failed: ", result);
                return;
            }

            // Successful login
            alert("✅ Login success! Welcome " + result.username);
            console.log("Login result:", result);
            navigate('/main');
        }
        catch (err){
            alert("⚠️ Network error. Check backend URL or EC2 status.");
            console.error(err);
        }
    }



  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Log in
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Log In
          </Button>
          <Grid container>
            <Grid item>
              <Link href="#" variant="body2">
                {"Don't have an account? Sign Up"}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
      <Box mt={8}>
        <Copyright />
      </Box>
    </Container>
  );
}
