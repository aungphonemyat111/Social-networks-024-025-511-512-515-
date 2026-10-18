import { useState } from "react";
import "./CreateAccount.css";
import elephantImg from "./assets/elephant.png";
import {
    createUserWithEmailAndPassword,
    updateProfile,
    sendEmailVerification,
    signOut
} from "firebase/auth";

import { auth } from "./firebase";

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
    async function handleCreateAccount() {
        const cleanEmail = email.trim().toLowerCase();
        const cleanName = fullName.trim();
    
        setError("");
        setSuccess("");
    
        if (!cleanName || !cleanEmail || !password || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }
    
        if (!cleanEmail.endsWith("@cmu.ac.th")) {
            setError("Please use a valid CMU email.");
            return;
        }
    
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
    
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
    
        try {
            // Create account using Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                cleanEmail,
                password
            );
    
            // Save the user's display name
            await updateProfile(userCredential.user, {
                displayName: cleanName
            });
    
            // Send email verification link
            await sendEmailVerification(userCredential.user);
    
            // Require verification before accessing the home feed
            await signOut(auth);
    
            setSuccess(
                "Account created! Check your CMU email for a verification link, then log in."
            );
    
        } catch (error) {
            console.error("Firebase registration error:", error.code);
    
            if (error.code === "auth/email-already-in-use") {
                setError("This email is already registered.");
            } else if (error.code === "auth/weak-password") {
                setError("Please choose a stronger password.");
            } else {
                setError("Could not complete registration. Please try again.");
            }
        }
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