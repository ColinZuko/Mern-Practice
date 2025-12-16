import {HashRouter as Router, Route, Routes} from 'react-router-dom'
import './App.css'
import {About} from '../pages/About.jsx'
import {Contact} from '../pages/Contact.jsx'
import {Landing} from '../pages/Landing.jsx'
import {Home} from '../pages/Home.jsx'
import {ReadBlog} from '../pages/ReadBlog.jsx'
import {CreateBlog} from '../pages/CreateBlog.jsx'
import {Profile} from '../pages/Profile.jsx'
import { Navbar } from '../components/Navbar.jsx'
import { Layout } from '../components/Layout.jsx'



function App() {

  //Pages


  //Landing page
  //Home Page(filtered by recency)
  //Read blog
  //Create blog
  //profile
  //About
  //Contact



  return (
    <Router>
      <Routes>
        <Route path='/' element={<Landing/>}/>
        <Route element={<Layout/>}>
          <Route path='/home' element={<Home/>}/>
          <Route path='/readblog/:id' element={<ReadBlog/>}/>
          <Route path='/createblog' element={<CreateBlog/>}/>
          <Route path='/profile' element={<Profile/>}/>
          <Route path='/about' element={<About/>}/>
          <Route path='/contact' element={<Contact/>}/>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
