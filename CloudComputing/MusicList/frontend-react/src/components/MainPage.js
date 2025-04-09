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

    useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUsername(storedUser.username);
      setUserEmail(storedUser.email);
    } else {
      console.error("❌ User info not found, please login again.");
    }
  }, []);

  return (
    <React.Fragment>
      <AppAppBar />
      <MusicSearch username={username} userEmail={userEmail}/>
      <Subscriptions userEmail={userEmail} />
      <AppFooter />
    </React.Fragment>
  );
}

export default withRoot(MainPage);


