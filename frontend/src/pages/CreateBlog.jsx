import { useState, useRef } from 'react'
import { createPost } from '../api'


export function CreateBlog() {

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [content, setContent] = useState('')  
    const [file, setFile] = useState()

    const MAX_FILE_SIZE = 15000000; // 15MB

    const inputFile = useRef(null)

    async function handlesubmit(e) {
        e.preventDefault()

        let submitObject = {
            title: title,
            description: description,
            content: content,
            author: null,
            dateCreated: new Date(),
            file: file
        }

        await createPost(submitObject)

        setTitle('')
        setDescription('')
        setContent('')
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
        <form onSubmit={handlesubmit}>
            <label>Blog Post Title: </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required name="title" placeholder="Title" />
            <label>Blog Description: </label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} required name="description" placeholder="Description" />
            <label>Blog Content: </label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} required name="content" placeholder="Content" />
            <label>Insert Header Image: </label>
            <input type="file" ref={inputFile} onChange={handleFileUpload} required/>
            <button type="submit">Submit</button>
        </form>
    )
}

