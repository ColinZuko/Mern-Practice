import { verifyUser } from "../api"
import { useState } from "react";
import {Navigate, useNavigate} from "react-router-dom";

export function Login() {
    const [user, setUser] = useState({
        email: '',
        password: ''
    });

    const navigate = useNavigate();

    function handleChange(e){
        setUser({ ...user, [e.target.name]: e.target.value })
    }

    async function handleSubmit(e) {
        e.preventDefault();
        let response = await verifyUser(user);

        if (response) {
            navigate("/home");
            sessionStorage.setItem("User", response);
        } else {
            alert("Login failed");
        }
    }

        return (
            <form onSubmit={handleSubmit}>
                <input placeholder={"Email"} onChange={handleChange} name="email" required maxLength={50}/>
                <input placeholder={"Password"} onChange={handleChange} name="password" type="password" required maxLength={20}/>
                <button type="submit">Login</button>
            </form>
        )
}


//finished on authentication token chapter, next is the asxios one