// src/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/login.css';

function Login(){
    const navigate = useNavigate();
    const [email, setEmail] = useState("s40689590student.rmit.edu.au");
    const [password, setPassword] = useState('012345');

    async function doLogin(){
        const backendURL = '/auth/login'; // Need to insert the backend URL here
        try{
            const resp = await fetch(backendURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({ email, password })
            });
            const result = await resp.json();

            if (!resp.ok){
                alert("❌ Login failed: Email or password is incorrect, please try again!");
                console.error("Login failed: ", result);
                window.location.reload();
                return;
            }

            // Successful login
            alert("✅ Login success! Welcome " + result.username);
            console.log("Login response:", result);
            navigate('/main');
        }
        catch (err){
            alert("⚠️ Network error. Check backend URL or EC2 status.");
            console.error(err);}
    }

    return(
        <div className="login-container">
            <h1>Login</h1>

            <label htmlFor="email" className="login-label">Email:</label>
            <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
            />

            <label htmlFor="password" className="login-label">Password:</label>
            <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
            />

            <button onClick={doLogin} className="login-button" >Login</button>
            <a href="register.html" style={{ marginLeft: "1rem" }}>Register</a>
        </div>
    );
}
export default Login;


// Reference:
// https://github.com/mui/material-ui/blob/master/docs/src/pages/premium-themes/onepirate/SignIn.js