import { getPosts } from '../api'
import { useState, useEffect } from 'react'
import { BlogCard } from '../components/BlogCard'

export function Home() {
    const [posts, setPosts] = useState([])

    useEffect(() => {
        async function loadAllPosts() {
            const data = await getPosts();
            setPosts(data)
        }
        loadAllPosts()
    }, [])

    return (
        <>
            {posts.map((post) => {                
                return(
                    <BlogCard post={post} />
                )
            })}
        </>
    )
}
//ended on the blog card chapter