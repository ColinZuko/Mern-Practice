import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'
import {
  Card,

  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {getPost} from '../api';



export function BlogCard({ post }){

        let date = new Date(post.dateCreated)
        let stringDate = date.toString()

        const [imageUrl, setImageUrl] = useState(null);

        useEffect(() => {
            async function fetchFullPost() {
                // If the initial post prop already has the image, use it directly
                if (post.image?.data?.imageSource) {
                    setImageUrl(post.image.data.imageSource.replace('application/octet-stream', 'image/png'));
                } else if (post._id) {
                    // Otherwise, fetch the full post individually to get the image
                    const fullPost = await getPost(post._id);
                    if (fullPost?.image?.data?.imageSource) {
                        setImageUrl(fullPost.image.data.imageSource.replace('application/octet-stream', 'image/png'));
                    }
                }
            }
            fetchFullPost();
        }, [post]);

return (
  <Card className="flex flex-col h-full w-full overflow-hidden border border-stone-200 bg-white transition-all duration-200 hover:bg-stone-50 hover:shadow-md">
    <Link 
      to={`/readblog/${post._id}`} 
      className="flex flex-col flex-grow h-full w-full group"
    >
      {/* Visual Anchor Area: Image placed at top of card flow */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100 shrink-0">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={post.title} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-stone-200/50 text-xs font-medium text-stone-400">
            No image available
          </div>
        )}
      </div>

      {/* Main Content Body: Flex grows to fill vertical layout whitespace */}
      <CardHeader className="p-4 space-y-2 flex-grow">
        {/* Line clamping prevents structural overflow */}
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          {post.title}
        </h3>
        
        <p className="text-xs text-stone-500 line-clamp-2 min-h-8">
          {post.description}
        </p>

      </CardHeader>
      <div className="flex flex-wrap gap-1 mb-2 ml-2">
    {post.cuisines && post.cuisines.map((tag) => (
        <span 
            key={tag} 
            className="text-[9px] font-bold uppercase tracking-wider text-white bg-primary px-1.5 py-1.5 rounded-md"
        >
            {tag}
        </span>
    ))}
</div>

      {/* Meta Layout Sections */}
      <CardContent className="px-4 pb-2 pt-0 shrink-0">
        <p className="leading-7 [&:not(:first-child)]:mt-6">
          By {post.authorName || "Unknown Author"}
        </p>
      </CardContent>

      <CardFooter className="px-4 pb-4 pt-0 shrink-0 flex items-center justify-between text-[11px] font-medium text-stone-400 tracking-wider uppercase">
        <span>{stringDate.slice(4, 15)}</span>
        <span>{post.views || 0} views</span>
      </CardFooter>
    </Link>
  </Card>
)

     
    }
