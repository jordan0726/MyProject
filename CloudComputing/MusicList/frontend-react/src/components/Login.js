import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Typography from '../modules/components/Typography';
import AppFooter from '../modules/views/AppFooter';
import AppAppBar from '../modules/views/AppAppBar';
import AppForm from '../modules/views/AppForm';
import FormButton from '../modules/form/FormButton';
import FormFeedback from '../modules/form/FormFeedback';
import withRoot from '../modules/withRoot';
import config from '../config';

function SignIn() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    setSubmitError(null);

    if (Object.keys(validationErrors).length === 0) {
        setSent(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout
        try{
            const response = await fetch(`${config.backendBaseURL}/auth/login`, {
                method: 'POST',
                headers:{ 'Content-Type': 'application/json'},
                body: JSON.stringify(formData),
                signal: controller.signal,
                credentials: 'include', // Include cookies in the request
            });

            clearTimeout(timeoutId); // Clear the timeout if the request completes
            const result = await response.json();

            if(!response.ok){
                alert("❌ Login failed: Email or password is incorrect, please try again!");
                console.error("Login failed: ", result);
                setSent(false);
                return;
            }

            // Successful login
            alert("✅ Login success! Welcome " + result.username);
            console.log("Login result:", result);
            navigate('/main');

        }
        catch (err){
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                setSubmitError("⏱️ Timeout: Server did not respond in time")
            }
            else{
                setSubmitError('⚠️ Network error, please try again.');
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
            Login
          </Typography>
          <Typography variant="body2" align="center">
            {'Not a member yet? '}
            <Link component={RouterLink} to="/register" align="center" underline="always">
              Register here
            </Link>
          </Typography>
        </React.Fragment>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 6 }}>
          <TextField
            autoComplete="email"
            autoFocus
            fullWidth
            label="Email"
            margin="normal"
            name="email"
            value={formData.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email}
            size="large"
          />
          <TextField
            fullWidth
            size="large"
            required
            name="password"
            autoComplete="current-password"
            label="Password"
            type="password"
            margin="normal"
            value={formData.password}
            onChange={handleChange}
            error={!!errors.password}
            helperText={errors.password}
          />
          {submitError && (
            <FormFeedback error sx={{ mt: 2 }}>
              {submitError}
            </FormFeedback>
          )}
          <FormButton
            sx={{ mt: 3, mb: 2 }}
            disabled={sent}
            size="large"
            color="secondary"
            fullWidth
          >
            {sent ? 'In progress…' : 'Log in'}
          </FormButton>
        </Box>
      </AppForm>
      <AppFooter />
    </React.Fragment>
  );
}

export default withRoot(SignIn);
