import { CreateUser } from "../components/createUser"
import{ Login } from "../components/Login"
import { useState } from "react";

export function Landing() {
    //view == 0 -> login
    //view == 1 -> create account
    const [view, setView] = useState(0);
        
       return (

        <>
            {!view ? 
            <>
            <Login />
            <button onClick={() => setView(1)}>Don't have an account? Create one here.</button>
            </> : 
            <>
            <CreateUser />
            <button onClick={() => setView(0)}>Already have an account? Log in here.</button>
            </>
            }
        </>
       )


            
}