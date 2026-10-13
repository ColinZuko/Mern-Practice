import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CreateUser } from "../components/CreateUser";
import { Login } from "../components/Login";
import { useAuth } from "../useAuth";
import { Logo } from "../components/Logo";

export function Landing() {
  const { isLoggedIn } = useAuth();
  const [mode, setMode] = useState("login");

  if (isLoggedIn) return <Navigate to="/home" replace />;

  const isLogin = mode === "login";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Photo panel */}
      <div className="relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="font-serif text-4xl font-semibold leading-tight">
            Food tastes better when it's shared.
          </p>
          <p className="mt-3 text-white/80">Save the recipes you love and come back to them any time.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/home" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to recipes
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <Logo className="h-16 w-16" />
          <h1 className="mt-6 text-3xl font-semibold">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLogin
              ? "Sign in to see your saved recipes."
              : "Free, and lets you save recipes to cook later."}
          </p>

          <div className="mt-8">{isLogin ? <Login /> : <CreateUser />}</div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "New here? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setMode(isLogin ? "signup" : "login")}
              className="font-medium text-primary hover:underline cursor-pointer"
            >
              {isLogin ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
