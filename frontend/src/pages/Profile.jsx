import { BlogCard } from "../components/BlogCard"
import { useState, useEffect } from "react"
import { getPosts } from "../api"
import * as jwt_decode from "jwt-decode"
import { Button } from "@/components/ui/button";



export function Profile() {

    const [posts, setPosts] = useState([])
    const [user, setUser] = useState({})

    useEffect(() => {
        async function loadUserData() {
            const token = sessionStorage.getItem("User");
            const decodedUser = jwt_decode.jwtDecode(token);
            const allPosts = await getPosts();
            const filteredPosts = allPosts.filter((post) => post.author == decodedUser._id);
            setPosts(filteredPosts);
            setUser(decodedUser);
        }
        loadUserData();
    }, []);

    console.log(user);

    return (
        <div className="flex flex-col items-center w-full mt-10">
            <div className="flex flex-col items-start w-[55vw] mb-8 text-left">
                <label className="scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0 w-full">Name</label>
                <h2 className="text-xl mb-4 w-full">{user.name}</h2>
                <label className="scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0 w-full">Email</label>
                <h2 className="text-xl mb-4 w-full">{user.email}</h2>
                <label className="scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0 w-full">Join Date</label>
                <h2 className="text-xl mb-4 w-full">{user.joinDate ? new Date(user.joinDate).toString().slice(4, 15) : ''}</h2>
                <Button
                    onClick={() => {
                        sessionStorage.removeItem("User");
                        window.location.reload();
                    }}
                    className="text-text mt-4 bg-background border-2 border-foreground hover:cursor-pointer hover:border-red-500 hover:text-red-500 hover:bg-background/80">
                    Log Out
                </Button> 
            </div>
            {posts.map((post) => {
                return (
                    <BlogCard key={post._id} post={post} />
                )
            })}
        </div>
    )
}
