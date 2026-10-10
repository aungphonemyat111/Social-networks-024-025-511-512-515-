import { useState } from "react";
import "./Login.css";
import elephantImg from "./assets/elephant.png";

//Creating the whole Login Page Layout

//My Goal is to make the logo and background, while the right contains the login information
function Login({ goToCreate }) {

    //Gives login remembered values (Email and Passowrd)
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

//Function that will run when the Log In button is clicked
function handleLogin() {
    //If user doesn't fill in information
    if (email === ""|| password === "" ) {
        setError ("Please fill in all fields.");
        return;

    }

    //If email doesn't end with @cmu.ac.th
    if (!email.endsWith("@cmu.ac.th")) {
        setError("Please use a valid CMU email.");
        return;
    }

    setError ("");
}
    return (
        <div className="login-page">
            <div className="login-left"> 
                <div className="login-content">

                    <div className="logo-placeholder">
                        <img
                            src={elephantImg}
                            className="elephant-logo"
                            alt="CMU elephant mascot"
                                                    />
                    </div>

                    <h1> MORCHOR<span className ="connect-text">CONNECT</span></h1>
                    <h2>CMU Students Only</h2>
                    <p>The Wise Disciple Themselves</p>
                    </div> 
                </div>

            <div className = "login-right"> 
                <div className="login-card">
                    <h2>Welcome Back</h2>
                    <p> Log in to continue to MORCHORCONNECT</p>

                    <label> CMU Email</label>
                    <input type = "email" placeholder="yourname@cmu.ac.th"
                    value = {email}
                    onChange={(event) => setEmail(event.target.value)}/>
                    
                    <label> Password </label>
                    <input type = "password" placeholder = "Enter your password"
                    value = {password}
                    onChange={(event) => setPassword(event.target.value)}/>

                    <a href = "#" className = "forgot-password">
                        Forgot password?
                    </a>

                    {/*If there is an error show the messgage (Ex: Passwords do not match) */}              
                    {error && <p className = "error-message"> {error} </p>}
                    
                    <button className = "login-button"
                    onClick = {handleLogin}>
                           Log In
                    </button>

                    <div className = "divider">
                        <span></span>
                    </div>

                    <p className = "create-account">
                        Don't have an account? {" "} <a href= "/" onClick ={(event) => { event.preventDefault(); goToCreate(); }} > Create Account </a> </p>
                </div>
            </div>



        </div>
    );
}

export default Login;
