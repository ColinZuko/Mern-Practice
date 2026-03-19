import { useState } from 'react'
import { createPost } from '../api'


export function CreateBlog() {

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [content, setContent] = useState('')  

    async function handlesubmit(e) {
        e.preventDefault()

        let submitObject = {
            title: title,
            description: description,
            content: content,
            author: null,
            dateCreated: new Date()
        }

        await createPost(submitObject)

    }

    return (
        <form onSubmit={handlesubmit}>
            <label>Blog Post Title: </label>
            <input onChange={(e) => setTitle(e.target.value)} maxLength={100} required name="title" placeholder="Title" />
            <label>Blog Description: </label>
            <input onChange={(e) => setDescription(e.target.value)} maxLength={200} required name="description" placeholder="Description" />
            <label>Blog Content: </label>
            <textarea onChange={(e) => setContent(e.target.value)} maxLength={5000} required name="content" placeholder="Content" />
            <button type="submit">Submit</button>
        </form>
    )
}

//Stopped on the create blog chapter 