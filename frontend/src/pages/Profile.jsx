import { BlogCard } from "../components/BlogCard"
import { useState, useEffect } from "react"
import { getPosts, deletePost } from "../api"
import * as jwt_decode from "jwt-decode"
import { Button } from "@/components/ui/button";




export function Profile() {

    const [posts, setPosts] = useState([])
    const [user, setUser] = useState({})

    const handleDelete = async (postId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this post?");
        if (!confirmDelete) {
            return;
        }
        try {
            const response = await deletePost(postId);
            if (response.status === 200) {
                // Remove the deleted post from the state
                setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
            }
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete the post. Please try again.");
        }
    };

    useEffect(() => {
        async function loadUserData() {
            const token = sessionStorage.getItem("User");
            const decodedUser = jwt_decode.jwtDecode(token);
            const allPosts = await getPosts();
            const filteredPosts = allPosts.filter((post) => post.author == decodedUser._id);
            filteredPosts.sort((a, b) => {
            return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
        });
            setPosts(filteredPosts);
            setUser(decodedUser);
        }
        loadUserData();
    }, []);

    console.log(user);

return (
    <div className="flex flex-col items-center w-[90vw] max-w-[1500px] mt-24 px-4 pb-20 space-y-12 mx-auto antialiased text-stone-900">
        
        {/* PROFILE INFORMATION SECTION */}
        <div className="flex flex-col items-start w-[50vw] bg-white border border-stone-200/60 rounded-3xl p-6 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Your Profile</span>
            
            <div className="space-y-4 w-full">
                <div className="border-b border-stone-100 pb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Name</label>
                    <h2 className="scroll-m-20 text-xl font-bold tracking-tight text-balance text-primary">{user.name}</h2>
                </div>
                
                <div className="border-b border-stone-100 pb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Email Address</label>
                    <h2 className="scroll-m-20 text-xl font-bold tracking-tight text-balance text-primary">{user.email}</h2>
                </div>
                
                <div className="pb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Member Since</label>
                    <h2 className="text-sm text-stone-500 mt-0.5">
                        {user.joinDate ? new Date(user.joinDate).toString().slice(4, 15) : 'N/A'}
                    </h2>
                </div>
            </div>

            <Button
                onClick={() => {
                    sessionStorage.removeItem("User");
                    window.location.reload();
                }}
                className="mt-6 border border-stone-200 bg-stone-50 hover:bg-red-50 text-stone-700 hover:text-red-600 font-medium rounded-xl text-xs px-4 py-2 transition-all duration-150 cursor-pointer"
            >
                Log Out
            </Button> 
        </div>

        {/* USER'S POSTS MANAGEMENT SECTION */}
        <div className="w-full space-y-6">
            <div className="border-b border-stone-200 pb-2">
                <h2 className="scroll-m-20 text-3xl font-bold tracking-tight text-balance text-primary">Your Published Recipes</h2>
                <p className="text-sm text-primary/80">Manage or permanently remove your content from the feed.</p>
            </div>
            
            {posts.length === 0 ? (
                <p className="text-stone-500 text-sm italic py-4">You haven't posted any recipes yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    {posts.map((post) => (
                        <div 
                            key={post._id} 
                            className="flex flex-col w-full bg-white border border-stone-200/60 rounded-2xl p-4 shadow-sm space-y-4"
                        >
                            {/* Recipe Card Body Container */}
                            <div className="w-full">
                                <BlogCard post={post} />
                            </div>

                            {/* Interactive Actions Control Panel Tray */}
                            <div className="flex justify-end pt-2 border-t border-stone-100">
                                <Button
                                    onClick={() => handleDelete(post._id)}
                                    className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-semibold text-xs px-4 py-2 rounded-xl transition duration-150 cursor-pointer"
                                >
                                    Delete Recipe
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

    </div>
)
}
