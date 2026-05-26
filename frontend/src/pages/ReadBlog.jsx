import { getPost } from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import axios from 'axios'; // 1. Ensure axios is imported

export function ReadBlog() {
    const [post, setPost] = useState({});
    let params = useParams();
    const navigate = useNavigate();
    let id = params.id;

    useEffect(() => {
        async function loadPost() {
            let data = await getPost(id);
            let date = new Date(data.dateCreated);
            data.dateCreated = date.toString().slice(4, 15);
            setPost(data);
        }

        const URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

        // 2. Add the dynamic logging engine here
  async function logView() {
    try {
        // Uses your dynamic URL variable and lets the global interceptor handle the token automatically
        await axios.patch(`${URL}/posts/${id}/view`);
    } catch (err) {
        console.error("Failed to update view analytics:", err);
    }
}

        loadPost();
        logView(); // 3. Fire the execution runner
    }, [id]);

    return (
        <div className='flex flex-col items-center justify-center mt-15 mb-20 w-1/2 mx-auto'>
            <Button onClick={() => navigate(-1)} className='mb-4 hover:cursor-pointer'>Back</Button>
            <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance mb-4">{post.title}</h1>
            <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 mb-4">{post.description}</h2>
            <div className='flex w-full justify-center my-4'>
                {post.image?.data?.imageSource && (
                    <img 
                        src={post.image.data.imageSource.replace('application/octet-stream', 'image/png')} 
                        alt="Blog cover" 
                        className='max-h-[50vw] my-4 rounded-md shadow-md'
                    />
                )}
            </div>

            <h3 className="scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight first:mt-0">{post.dateCreated}</h3>
            <p className="text-muted-foreground font-medium">By {post.authorName || "Unknown Author"}</p>
            <p className="leading-7 [&:not(:first-child)]:mt-6 whitespace-pre-wrap text-left w-full">{post.content}</p>
        </div>
    );
}