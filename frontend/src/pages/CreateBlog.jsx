import { useState, useRef } from 'react'
import { createPost } from '../api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import * as jwt_decode from "jwt-decode"


export function CreateBlog() {

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [content, setContent] = useState('')  
    const [file, setFile] = useState()
    const [successMessage, setSuccessMessage] = useState('')

    const MAX_FILE_SIZE = 15000000; // 15MB

    const inputFile = useRef(null)

    async function handlesubmit(e) {
        e.preventDefault()

        const token = sessionStorage.getItem("User");
        const decodedUser = jwt_decode.jwtDecode(token);

        let submitObject = {
            title: title,
            description: description,
            content: content,
            author: decodedUser._id,
            authorName: decodedUser.name,
            dateCreated: new Date(),
            file: file
        }
        

        await createPost(submitObject)

        setTitle('')
        setDescription('')
        setContent('')
        setFile(null)
        if (inputFile.current) {
            inputFile.current.value = ""
        }
        
        setSuccessMessage('Blog post created successfully!')
        // Automatically hide the message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000)
    }

    function handleFileUpload(e){
        const file = e.target.files[0];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
        if (fileExtension != '.jpg' && fileExtension != '.jpeg' && fileExtension != '.png') {
            alert('Please upload a valid image file (jpg, jpeg, png)');
            inputFile.current.value = "";
            inputFile.current.type = "file";
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            alert('File size exceeds the maximum limit of 15MB');
            inputFile.current.value = "";
            inputFile.current.type = "file";
            return;
        }
        setFile(file);
    }

    return (
        <div className='flex flex-col items-center justify-center mt-20 w-full'>
            <form onSubmit={handlesubmit} className='w-1/3'>
                <Label className="mb-2">Blog Post Title: </Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required name="title" placeholder="Title" />
                <Label className="my-2">Blog Description: </Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} required name="description" placeholder="Description" />
                <Label className="my-2">Blog Content: </Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={10000} required name="content" placeholder="Content" className="min-h-[200px]" />
                <Label className="my-2" >Insert Header Image: </Label>
                <Input type="file" ref={inputFile} onChange={handleFileUpload} className="cursor-pointer hover:bg-accent" required/>
                <Button type="submit" className="mt-4">Submit</Button>
            {successMessage && <p className="text-green-500 text-center mt-4 font-medium">{successMessage}</p>}
            </form>
        </div>
    )
}
