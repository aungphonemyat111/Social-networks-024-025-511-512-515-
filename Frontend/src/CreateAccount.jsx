import { useState } from "react";
import "./CreateAccount.css";
import elephantImg from "./assets/elephant.png";

function CreateAccount( {goToLogin} ) {

    //Stores the values typed into each input field (Ex: CJ Dilig for FullName)
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    //Stores any validation error message
    const [error , setError] = useState("");
    const [success, setSuccess] = useState("");

    //Runs when the Create Account Button is clicked
    function handleCreateAccount() {

        //If the user clicked Create without filling in information
        // === means strictly equal (midterm question :) )
        if ( fullName === "" || email === "" || password === "" || confirmPassword === "" ) {
            setError ("Please fill in all fields.");
            return;
        }

        //This checks if the email ends with @cmu.ac.th, if not then an error will occur
        if (!email.endsWith("@cmu.ac.th")) {
            setError("Please use a valid CMU email.");
            return;
        }

        //Password length should be at least 8 characters
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        //This checks if ConfirmPassword matches password, if not then an error will occur
        if (password !== confirmPassword) {
            setError ("Passwords do not match.");
            return;
        }

        //Clear any validation error messages if all checks pass/work
        setError("")

    //BACKEND   //Send an HTTP request to 3000  //fetch() sends info from frontend to the backend
            fetch("http://localhost:3000/register", {
        method: "POST",

                //Tells data im sending JSON
        headers: {
            "Content-Type": "application/json"
        },
        
        //The data being sent  (Ex: FullName is CJ Dilig) 
        body: JSON.stringify({
            fullName: fullName,
            email: email,
            password: password
        })
     })


     //When the backend responds (Convert Json to Javascript Data)
     .then((response) => response.json())
     .then((data) => {
        console.log(data);
        setSuccess("Account created successfully.");
     });
    }

    return (
        <div className="create-page">
            <div className="create-left">
                <div className="create-content">
                    <div className="logo-placeholder">
                        <img
                            src={elephantImg}
                            className="elephant-logo"
                            alt="CMU elephant mascot"
                        />
                    </div>

                    <h1>
                        MORCHOR<span className="connect-text">CONNECT</span>
                    </h1>
                    <h2>CMU Students Only</h2>
                    <p>The Wise Disciple Themselves</p>
                </div>
            </div>

            <div className="create-right">
                <div className="create-card">
                    <h2>Create Account</h2>
                    <p>Join MORCHORCONNECT using your CMU email</p>
 
                    <label> Full Name</label>
                    <input type ="text" placeholder = "Enter your full name"
                    value = {fullName}

                    onChange = {(event) => setFullName(event.target.value)} />

                    <label>CMU Email</label>
                    <input type="email" placeholder="yourname@cmu.ac.th"
                    value = {email}
                    onChange = {(event) => setEmail(event.target.value)} />

                    <label>Password</label>
                    <input type ="password" placeholder = "Create a password" 
                    value = {password}
                    onChange = {(event) => setPassword(event.target.value)}/>

                    <label>Confirm Password</label>
                    <input type ="password" placeholder = "Re-enter your password"
                    value = {confirmPassword}
                    onChange = {(event) => setConfirmPassword(event.target.value)} />
                    
                    {/*If there is an error show the messgage (Ex: Passwords do not match) */}              
                    {error && <p className = "error-message"> {error} </p>}

                    {success && <p className = "success-message"> {success} </p>}
                    
                    {/*Runs handleCreateAccount when the button is clicked */}
                    <button className="create-button" onClick = {handleCreateAccount} > Create Account </button>

                     <p className = "login-link">
                        Already have an account? {" "} <a href= "#" onClick ={goToLogin} > Log In </a> </p>
                </div>

                </div>
            </div>
    );
}

export default CreateAccount;