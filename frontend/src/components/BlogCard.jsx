

export function BlogCard({ post }) 
    {
       return(
            <>
                <h1>{post.title}</h1>                   
                <h2>{post.description}</h2>
                <h3>{post.author}</h3>
                <p>{post.content}</p>
                <p>{post.dateCreated}</p>
            </>
       ) 

     
    }