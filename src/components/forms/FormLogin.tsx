import { useState } from "react";
import { useNavigate } from "react-router";

import api from "../../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../../../constants";
import { useAuth } from '../../components/AuthContext';

import "../../css/Form.css";
import { toast } from "react-toastify";
import axios from "axios";


interface FormLoginProps {
    route: string;
    method: "login" | "register";
}

function FormLogin({ route, method }: FormLoginProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { checkAuthStatus } = useAuth();
    const navigate = useNavigate();

    const name = method === "login" ? "Login" : "Register";

    const handle_submit = async (e: React.FormEvent<HTMLFormElement>) => {
        setLoading(true);
        e.preventDefault();

        try{
            const response = await api.post(route, {email, password})

            if(method === "login"){
                localStorage.setItem(ACCESS_TOKEN, response.data.access);
                localStorage.setItem(REFRESH_TOKEN, response.data.refresh);
                await checkAuthStatus();
                navigate("/");
            }
           else {
                navigate("/login");
            }
        }
        
        catch (error) {
            if (axios.isAxiosError(error) && error.response) { toast.error("Invalid credentials."); }
            else { toast.error("Error: " + error); }
        }

        finally {
            setLoading(false);
        }
    }

    return <form onSubmit={handle_submit} className="form-container">
        <h1>{name}</h1>
        <input
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
        />

        <input
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
        />

        <button className="form-button" type="submit">
            {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Logging in...
            </>
          ) : (
            name
          )}
        </button>

    </form>
}

export default FormLogin;
