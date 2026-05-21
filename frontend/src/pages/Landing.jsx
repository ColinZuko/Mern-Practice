import { CreateUser } from "../components/CreateUser"
import{ Login } from "../components/Login"
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Landing() {
    //view == 0 -> login
    //view == 1 -> create account
    const [view, setView] = useState(0);
        
       return (

        <div className="flex justify-center items-center w-screen h-screen">
            {!view ? 
            <div className="flex flex-col w-96">
            <Login />
            <Button onClick={() => setView(1)} className="hover:cursor-pointer bg-primary">
                Create new Account
            </Button>
            </div> : 
            <div className="flex flex-col w-96">
            <CreateUser setView={setView} />
            <Button onClick={() => setView(0)} className="hover:cursor-pointer bg-primary">
                Log into existing account
            </Button>
            </div>
            }
        </div>
       )


            
}