import { useState } from "react";
import { Link } from "react-router-dom";
import { pageData } from "./pageData";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Menu, X } from "lucide-react"; // Icons for mobile toggle menu
import logo from "../assets/Logo.png";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <NavigationMenu className="bg-white fixed w-full top-0 left-0 h-24 z-50 max-w-none flex-col md:flex-row justify-between border-b border-base-100 px-6 md:px-12 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Top Row Wrapper: Handles logo placement and mobile menu toggle placement */}
      <div className="flex items-center justify-between w-full md:w-auto h-full">
        {/* Left Side (Logo) */}
        <Link to="/home" onClick={closeMenu} className="transition-opacity">
          <img
            src={logo}
            alt="ChefColin Logo"
            className="h-14 w-auto object-contain"
          />
        </Link>

        {/* Mobile Toggle Trigger Button (Hidden on Desktop) */}
        <button
          onClick={toggleMenu}
          type="button"
          className="md:hidden p-2 rounded-xl text-stone-600 hover:text-primary transition-colors cursor-pointer"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ======================================================= */}
      <NavigationMenuList className="hidden md:flex space-x-8 items-baseline">
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
          );
        })}
      </NavigationMenuList>

      {/* ======================================================= */}
      <div
        className={`absolute top-24 left-0 w-full bg-white border-b border-base-100 shadow-md md:hidden transition-all duration-300 ease-in-out z-40 overflow-hidden ${
          isOpen
            ? "max-h-[60vh] opacity-100 visible"
            : "max-h-0 opacity-0 invisible"
        }`}
      >
        <div className="flex flex-col px-6 py-6 space-y-4">
          {pageData.map((page) => (
            <Link
              key={page.path}
              to={page.path}
              onClick={closeMenu}
              className="text-stone-700 hover:text-primary text-sm font-bold uppercase tracking-widest py-2 transition-colors duration-200 border-b border-stone-50 last:border-none"
            >
              {page.name}
            </Link>
          ))}
        </div>
      </div>
    </NavigationMenu>
  );
}
