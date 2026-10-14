import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// A password field with an eye button to show or hide what you've typed.
// Takes the same props as a normal <input>.
export function PasswordInput({ className = "", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute bottom-0 right-1 flex h-11 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground cursor-pointer"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
