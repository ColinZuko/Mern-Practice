import { createUser } from "../api"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateUser({ setView }) {
    const [user, setUser] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    function handleChange(e){
        setUser({ ...user, [e.target.name]: e.target.value })
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        try {
            let response = await createUser(user);
            console.log(response);  
            
            if (response && response.status !== 200 && response.status !== 201) {
                setErrorMessage("An error occurred while creating your account. Please try again later.");
            } else {
                setSuccessMessage("Account created successfully! Redirecting to login...");
                setTimeout(() => {
                    if (setView) setView(0);
                }, 2000);
            }
        } catch (error) {
            console.error(error);
            // If using Axios, the backend error response is attached to error.response
            if (error.response && (error.response.status === 400 || error.response.status === 409)) {
                setErrorMessage("An account with this email already exists.");
            } else {
                setErrorMessage("An error occurred while creating your account. Please try again later.");
            }
        }
    };

        return (
            <form onSubmit={handleSubmit} className="flex flex-col">
                <Input placeholder={"Name"} onChange={handleChange} name="name" required maxLength={20} className="mb-1"/>
                <Input placeholder={"Email"} onChange={handleChange} name="email" required maxLength={50} className="mb-1"/>
                <Input 
                    placeholder={"Password"} 
                    onChange={handleChange} 
                    name="password" 
                    type="password" 
                    required 
                    maxLength={20} 
                    minLength={6} 
                    pattern="(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).*" 
                    title="Password must contain at least one uppercase letter, one number, and one symbol."
                    className="mb-4"
                />
                <Button type="submit" className="mb-2 hover:cursor-pointer">Create Account</Button>
            {errorMessage && <p className="text-red-500 text-center mt-2 font-medium">{errorMessage}</p>}
            {successMessage && <p className="text-green-500 text-center mt-2 font-medium">{successMessage}</p>}
            </form>
        )
}
