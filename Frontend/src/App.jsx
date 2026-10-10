import { useState } from "react";
import Login from "./Login";
import CreateAccount from "./CreateAccount";

function App() {
    const [page, setPage] = useState("login");

    if (page === "create") {
        return <CreateAccount goToLogin={() => setPage("login")} />;
    }

    return <Login goToCreate={() => setPage("create")} />;
}

export default App;