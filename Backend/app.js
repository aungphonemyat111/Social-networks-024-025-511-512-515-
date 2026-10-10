//Import the Express framework
const express = require("express");

//Import the CORS framwork
const cors = require("cors");

//Create the Express application
const app = express();


//Choosing a port for the backend server
//3000 is just a common value (nothing special)

// :5173 = Frontend
// :3000 = Backend
const PORT = 3000;


//Allow the backend to read JSON data sent from the frontend
app.use(express.json());

//Allows frontend port 5173 to talk to backend port 3000
app.use(cors());


//req = Request, res = Response
//If someone visits localhost:3000/, send this message back
app.get("/", (req, res) => {
    res.send("MORCHORCONNECT backend is running");
});

//Creates a POST Route (For example creating a new account)
app.post("/register", (req, res) => {
    const { fullName, email, password } = req.body;

    console.log(fullName, email, password);

    res.json({
        message: "Registration data received"
    });
});


//Starts the server and listens for requests on port 3000
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});