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
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUsername(storedUser.username);
    } else {
      console.error("❌ User info not found, please login again.");
    }
  }, []);

  return (
    <React.Fragment>
      <MainPageAppBar />
      <ProductHero username={username}/>
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


