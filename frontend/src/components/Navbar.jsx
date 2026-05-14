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


export function Navbar() {
    return (
        <NavigationMenu className="bg-primary fixed w-screen top-0 left-0 h-20 p-2">
            <NavigationMenuList>
                {pageData.map((page) => {
                    return (
                        <NavigationMenuItem>
                            <Link to={page.path} className="navItem">
                                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                    {page.name}
                                </NavigationMenuLink>
                            </Link>
                        </NavigationMenuItem>
                    )
                })}
            </NavigationMenuList>
            <Button
                onClick={() => {
                    sessionStorage.removeItem("User");
                    window.location.reload();
                }}
                className="text-primary-foreground background-transparent border-2 border-primary-foreground absolute right-4 hover:cursor-pointer"
            >
                Log Out
            </Button>
        </NavigationMenu>
    )

}
