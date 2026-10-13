import { CreateUser } from "../components/CreateUser";
import { Login } from "../components/Login";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function Landing() {
  //view == 0 -> login
  //view == 1 -> create account
  const [view, setView] = useState(0);

  return (
    <div className="flex justify-center items-center w-screen h-screen">
      {!view ? (
        <div className="flex flex-col w-96">
          <Login />
          <Button
            onClick={() => setView(1)}
            className="hover:cursor-pointer bg-primary"
          >
            Create new Account
          </Button>
        </div>
      ) : (
        <div className="flex flex-col w-96">
          <CreateUser setView={setView} />
          <Button
            onClick={() => setView(0)}
            className="hover:cursor-pointer bg-primary"
          >
            Log into existing account
          </Button>
        </div>
      )}
      <Link
        to="/home"
        className="absolute bottom-10 text-sm text-stone-500 hover:text-primary underline"
      >
        Continue browsing as a guest
      </Link>
    </div>
  );
}
