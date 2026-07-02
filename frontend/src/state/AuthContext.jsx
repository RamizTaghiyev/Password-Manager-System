// state/AuthContext.jsx
import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [twofa, setTwofa] = useState({ usersId: "", secret: "", qrDataUrl: "", mode: "" });

    function saveTwoFactorData(result, mode) {
        setTwofa({
            usersId: result.users_id || "",
            secret: result.secret || "",
            qrDataUrl: result.qr_data_url || "",
            mode
        });
    }

    function saveLoggedInUser(user) {
        setLoggedInUser(user);
        if (user?.users_id) setTwofa(t => ({ ...t, usersId: user.users_id }));
    }

    function logout() {
        setLoggedInUser(null);
        setTwofa({ usersId: "", secret: "", qrDataUrl: "", mode: "" });
    }

    return (
        <AuthContext.Provider value={{
            loggedInUser, twofa,
            isAuthenticated: loggedInUser !== null,
            saveTwoFactorData, saveLoggedInUser, logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);