import { verifyUser } from "../api"
import { useState } from "react";
import {Navigate, useNavigate} from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
            axios.defaults.headers.common['Authorization'] = `Bearer ${response}`;
        } else {
            alert("Login failed");
        }
    }

        return (
            <form onSubmit={handleSubmit} className="flex flex-col">
                <Input placeholder={"Email"} onChange={handleChange} name="email" required maxLength={50} className="mb-1"/>
                <Input placeholder={"Password"} onChange={handleChange} name="password" type="password" required maxLength={20} className="mb-4"/>
                <Button type="submit" className="mb-2 hover:cursor-pointer">Login</Button>
            </form>
        )
}


