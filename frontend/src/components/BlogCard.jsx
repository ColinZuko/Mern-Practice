import { Link } from 'react-router-dom'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"


export function BlogCard({ post }){

        let date = new Date(post.dateCreated)
        let stringDate = date.toString()

       return(
        <Card className="flex w-[55vw] mx-auto min-h-44 flex flex-col justify-center my-4 hover:bg-muted">
            <Link to={`/readblog/${post._id}`} className='flex flex-col flex-grow justify-between w-full h-full p-4'>
                <CardHeader>
                    <CardTitle><h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 text-text">{post.title}</h2></CardTitle>
                    <CardDescription><h2>{post.description}</h2></CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground font-medium">By {post.authorName || "Unknown Author"}</p>
                </CardContent>
                <CardFooter>
                    <p>{stringDate.slice(4, 15)}</p>
                </CardFooter>
            </Link>
        </Card>
       ) 

     
    }

