import * as React from 'react';
import { useEffect, useState } from 'react';
import ProductCategories from '../modules/views/ProductCategories';
import ProductSmokingHero from '../modules/views/ProductSmokingHero';
import AppFooter from '../modules/views/AppFooter';
import ProductHero from '../modules/views/ProductHero';
import ProductValues from '../modules/views/ProductValues';
import ProductHowItWorks from '../modules/views/ProductHowItWorks';
import ProductCTA from '../modules/views/ProductCTA';
import MainPageAppBar from '../modules/views/MainPageAppBar';
import withRoot from '../modules/withRoot';
import config from '../config';

function MainPage() {
    const [username, setUsername] = useState('');

  useEffect(() => {
    async function fetchUser() {
      try {
        const resp = await fetch(`${config.backendBaseURL}/auth/me`, {
          credentials: 'include',
        });
        const result = await resp.json();

        if (resp.ok) {
          setUsername(result.username);
        } else {
          console.error("❌ Failed to fetch user:", result);
        }
      } catch (err) {
        console.error("⚠️ Error fetching user info:", err);
      }
    }

    fetchUser();
  }, []);

  return (
    <React.Fragment>
      <MainPageAppBar />
      <ProductHero />
      <ProductValues />
      <ProductCategories />
      <ProductHowItWorks />
      <ProductCTA />
      <ProductSmokingHero />
      <AppFooter />
    </React.Fragment>
  );
}

export default MainPage;


