import { getPost} from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getImage } from '../api';

export function ReadBlog() {

    const [post, setPost] = useState({})

    let params = useParams();
    const navigate = useNavigate();
    let id = params.id;

    useEffect(() => {
        async function loadPost() {
            let data = await getPost(id);
            let date = new Date(data.dateCreated)
            data.dateCreated = date.toString().slice(4, 15)
            console.log(data)
            setPost(data)
        }
        loadPost()
    }, [])

    return (
        <>
            <button onClick={() => navigate(-1)}>Back</button>
            <h1>{post.title}</h1>
            <h2>{post.description}</h2>
            {post.image?.data?.imageSource && (
    <img 
        src={post.image.data.imageSource.replace('application/octet-stream', 'image/png')} 
        alt="Blog cover" 
    />
)}
            <h3>{post.dateCreated}</h3>
            <p>{post.content}</p>
        </>
    )
}

//ended after image displaying, next istailwind setup 5:05:02