import { Navbar } from "./Navbar"
import { Outlet } from "react-router-dom"


export function Layout() {

    return (
        <>
        <Navbar/>
        <main className="flex w-screen justify-center mt-24">
            <Outlet/>
        </main>
        </>
    )

}