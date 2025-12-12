import { useState, useEffect } from 'react'
import {  getPosts, getPost, createPost, updatePost, deletePost} from './api.js'
import './App.css'

function App() {


  const [posts, setPosts] = useState();

  function makePost() {
    let postObject = {
        title: "Sybau Daniel",
        description: "Description of daniel",
        content: "Daniel Sybau is a software developer...",
        author: "Daniel Sybau",
        dateCreated: new Date() 
    }


    createPost(postObject)
  }

  /*useEffect(() => {
    async function loadAllPosts() {
      let data = await getPosts();
      if (data) {
        setPosts(data);
      }
    }
    loadAllPosts();
  }, []);*/

  return (
    <>
      <button onClick={makePost}>
        Create Post
      </button>
    </>
  )
}

export default App
