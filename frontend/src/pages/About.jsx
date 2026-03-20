import { Link } from "react-router-dom"

export function About() {
    return (
        <div>
            <h1>About Me</h1>
            <p>Welcome to my blog website! Here I'll post interesting things about my life and experiences.</p>
            <p>This platform also functions as a safe space for users to share about themselves.</p>
            <p>Feel free to explore the blog posts and share your own stories!</p>
            <Link to="/createblog">Create a Blog Post</Link>
        </div>
    )
}