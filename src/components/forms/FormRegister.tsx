import { useState } from "react";
import { useNavigate } from "react-router";

import api from "../../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../../../constants";

import "../../css/Form.css";
import { toast } from "react-toastify";


interface FormLoginProps {
    route: string;
    method: "login" | "register";
}

function FormRegister({ route, method }: FormLoginProps) {
    const [email, setEmail] = useState("");
    const [first_name, setFirstName] = useState("");
    const [last_name, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const name = method === "login" ? "Login" : "Register";

    const handle_submit = async (e: React.FormEvent<HTMLFormElement>) => {
        setLoading(true);
        e.preventDefault();

        try{
            const response = await api.post(route, {email,first_name, last_name, password, password2})

            if(method === "login"){
                localStorage.setItem(ACCESS_TOKEN, response.data.access)
                localStorage.setItem(REFRESH_TOKEN, response.data.refresh)
                navigate("/");
            }
           else {
                navigate("/login");
            }
        }

        catch (error) {
            toast.error("Error: " + error);

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
        />

        <input
            className="form-input"
            type="first_name"
            value={first_name}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
        />

        <input
            className="form-input"
            type="last_name"
            value={last_name}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
        />


        <input
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
        />


        <input
            className="form-input"
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="Password confirmation"
        />

        <button className="form-button" type="submit">
            {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Resgistering you...
            </>
          ) : (
            name
          )}
        </button>

    </form>
}

export default FormRegister;
