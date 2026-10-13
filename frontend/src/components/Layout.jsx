import { Navbar } from "./Navbar"
import { Footer } from "./Footer"
import { Outlet, useLocation } from "react-router-dom"
import { useEffect } from "react";


export function Layout() {
    const { pathname } = useLocation();

    // Start each new page at the top
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="flex min-h-screen flex-col">
        <Navbar/>
        <main className="flex-1 pt-16">
            <Outlet/>
        </main>
        <Footer/>
        </div>
    )

}
