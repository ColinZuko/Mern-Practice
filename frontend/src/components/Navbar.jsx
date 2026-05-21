import { Link } from "react-router-dom"
import { pageData } from "./pageData"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
    navigationMenuTriggerStyle
} from "@/components/ui/navigation-menu"
import { Button } from "@/components/ui/button";
import logo from "../assets/logo.png"



export function Navbar() {
    return (
<NavigationMenu className="bg-white fixed w-full top-0 left-0 h-24 z-50 max-w-none justify-between border-b border-base-100 px-12 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
    
    {/* Left Side */}
    <div className="flex items-center">
        <Link to="/home" className="transition-opacity hover:opacity-90">
            <img src={logo} alt="Logo" className="h-14 w-auto object-contain" />
        </Link>
    </div>
    
    {/* Right Side */}
    <NavigationMenuList className="flex space-x-8 items-baseline">
        {pageData.map((page) => {
            return (
                <NavigationMenuItem key={page.path}>
                    <Link to={page.path} className="navItem">
                        <NavigationMenuLink 
                            className={`${navigationMenuTriggerStyle()} bg-transparent text-charcoal-800 hover:bg-transparent hover:text-primary text-sm font-bold uppercase tracking-widest transition-colors duration-200`}
                        >
                            {page.name}
                        </NavigationMenuLink>
                    </Link>
                </NavigationMenuItem>
            )
        })}
    </NavigationMenuList>
</NavigationMenu>
    )

}
