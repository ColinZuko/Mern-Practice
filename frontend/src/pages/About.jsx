import { Link } from "react-router-dom"

export function About() {
    return (
        <div className="w-1/3">
            <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">About Me</h1>
            <p className="leading-7 [&:not(:first-child)]:mt-2 text-left">Welcome to my blog website! Here I'll post interesting things about my life and experiences.</p>
            <p className="leading-7 [&:not(:first-child)]:mt-2 text-left">This platform also functions as a safe space for users to share about themselves.</p>
            <p className="leading-7 [&:not(:first-child)]:mt-2 text-left">Feel free to explore the blog posts and share your own stories!</p>
            <Link to="/createblog" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                Create a Blog Post
            </Link>
        </div>
    )
}