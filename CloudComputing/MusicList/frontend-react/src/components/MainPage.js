import * as React from 'react';
import { useEffect, useState } from 'react';
import AppFooter from '../modules/views/AppFooter';
import MusicSearch from '../modules/views/MusicSearch';
import Subscriptions from '../modules/views/Subscriptions';
import AppAppBar from '../modules/views/AppAppBar';
import withRoot from '../modules/withRoot';
import config from '../config';

function MainPage() {
    const [username, setUsername] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [subscriptions, setSubscriptions] = useState([]);

    // Function to fetch subscriptions from backend
  const fetchSubscriptions = async (email) => {
    try {
      const response = await fetch(
        `${config.backendBaseURL}/subscription/details?email=${encodeURIComponent(email)}`,
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

    useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUsername(storedUser.username);
      setUserEmail(storedUser.email);
      fetchSubscriptions(storedUser.email);
    } else {
      console.error("❌ User info not found, please login again.");
    }
  }, []);

  return (
    <React.Fragment>
      <AppAppBar />
      <MusicSearch username={username} userEmail={userEmail} subscriptions={subscriptions} refreshSubscriptions={() => fetchSubscriptions(userEmail)} />
      <Subscriptions userEmail={userEmail} subscriptions={subscriptions} refreshSubscriptions={() => fetchSubscriptions(userEmail)} />
      <AppFooter />
    </React.Fragment>
  );
}

export default withRoot(MainPage);

/*
This page is adapted from the MUI example at:
https://github.com/mui/material-ui/blob/master/docs/src/pages/premium-themes/onepirate/Home.js
It is licensed under the MIT license.
*/
