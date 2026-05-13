import { Navbar } from "./Navbar"
import { Outlet, useNavigate } from "react-router-dom"
import { use, useEffect } from "react";


export function Layout() {

    let user = sessionStorage.getItem("User");
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate("/");
        }
    }, [user, navigate]);

    return (
        <>
        <Navbar/>
        <Outlet/>
        </>
    )

}