import { Navbar } from "./Navbar"
import { Footer } from "./Footer"
import { VerifyBanner } from "./VerifyBanner"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { useEffect } from "react";
import { X } from "lucide-react";


export function Layout() {
    const { pathname, state } = useLocation();
    const navigate = useNavigate();
    // A short message from the previous page, e.g. after deleting your account
    const notice = state?.notice;

    // Start each new page at the top
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="flex min-h-screen flex-col">
        <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
            Skip to content
        </a>
        <Navbar/>
        <main id="main" tabIndex={-1} className="flex-1 pt-16 outline-none print:pt-0">
            <VerifyBanner/>
            {notice && (
                <div role="status" className="border-b bg-secondary">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-sm sm:px-6">
                        <p>{notice}</p>
                        <button
                            type="button"
                            aria-label="Dismiss"
                            onClick={() => navigate(pathname, { replace: true, state: null })}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-muted cursor-pointer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
            <Outlet/>
        </main>
        <Footer/>
        </div>
    )

}
