import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import MainPage from './MainPage';
import Register from './Register';
import Home from './Home';



function App() {
  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/main" element={<MainPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/home" element={<Home />} />

        </Routes>
    </BrowserRouter>
  );
}

export default App;
