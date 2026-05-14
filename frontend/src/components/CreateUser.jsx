import { createUser } from "../api"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateUser() {
    const [user, setUser] = useState({
        name: '',
        email: '',
        password: ''
    });

    function handleChange(e){
        setUser({ ...user, [e.target.name]: e.target.value })
    }

    async function handleSubmit(e) {
        e.preventDefault();
        let response = await createUser(user);
        console.log(response);  
        if (response.status !== 200) {
            alert("An error occurred while creating your account. Please try again later.");
        }
    };

        return (
            <form onSubmit={handleSubmit} className="flex flex-col">
                <Input placeholder={"Name"} onChange={handleChange} name="name" required maxLength={20} className="mb-1"/>
                <Input placeholder={"Email"} onChange={handleChange} name="email" required maxLength={50} className="mb-1"/>
                <Input placeholder={"Password"} onChange={handleChange} name="password" type="password" required maxLength={20} className="mb-4"/>
                <Button type="submit" className="mb-2 hover:cursor-pointer">Create Account</Button>
            </form>
        )
}


