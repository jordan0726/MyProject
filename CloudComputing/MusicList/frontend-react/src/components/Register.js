import * as React from 'react';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '../modules/components/Typography';
import AppFooter from '../modules/views/AppFooter';
import AppAppBar from '../modules/views/AppAppBar';
import AppForm from '../modules/views/AppForm';
import FormButton from '../modules/form/FormButton';
import FormFeedback from '../modules/form/FormFeedback';
import withRoot from '../modules/withRoot';
import config from '../config';

function SignUp() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = 'Required';
    if (!formData.email) newErrors.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate form data first
    const validationErrors = validate();
    setErrors(validationErrors);
    setSubmitError(null);

    if (Object.keys(validationErrors).length === 0) {
      setSent(true); // Set form submission state
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 50000);

      try{
        const response = await fetch(`${config.apiGatewayURL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
            signal: controller.signal,
        });
        clearTimeout(timeoutId); // Clear the timeout if the request completes
        const result = await response.json();

        if (!response.ok){
            setSubmitError("❌ Registration failed: Email already exists, please try another email!");
            setSent(false);
            return;
        }


        // Successful registration
        alert('✅ Registration successful! Please log in.');
        console.log('Registration result:', result);
        navigate('/login'); // Redirect to login page
      }
      catch (err){
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            alert("⏱️ Timeout: Server did not respond in time");
        }
        else{
            alert("⚠️ Network error. Check backend URL or EC2 status.");
        }
        console.error(err);
        setSent(false);
      }
    }
  };

  return (
    <React.Fragment>
      <AppAppBar />
      <AppForm>
        <React.Fragment>
          <Typography variant="h3" gutterBottom marked="center" align="center">
            Register
          </Typography>
          <Typography variant="body2" align="center">
            <Link component={RouterLink} to="/login" underline="always">
              Already have an account?
            </Link>
          </Typography>
        </React.Fragment>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 6 }}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            margin="normal"
            value={formData.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email}
          />
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            margin="normal"
            value={formData.password}
            onChange={handleChange}
            error={!!errors.password}
            helperText={errors.password}
          />
          <TextField
            autoFocus
            fullWidth
            label="Username"
            name="username"
            margin="normal"
            value={formData.username}
            onChange={handleChange}
            error={!!errors.username}
            helperText={errors.username}
          />
          {submitError && (
            <FormFeedback error sx={{ mt: 2 }}>
              {submitError}
            </FormFeedback>
          )}
          <FormButton
            sx={{ mt: 3, mb: 2 }}
            disabled={sent}
            color="secondary"
            fullWidth
          >
            {sent ? 'In progress…' : 'Register'}
          </FormButton>
        </Box>
      </AppForm>
      <AppFooter />
    </React.Fragment>
  );
}

export default withRoot(SignUp);
