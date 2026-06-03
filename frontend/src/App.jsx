import { HashRouter as Router, Route, Routes } from "react-router-dom";
import "./App.css";
import { About } from "./pages/About";
import { Contact } from "./pages/Contact";
import { Landing } from "./pages/Landing";
import { Home } from "./pages/Home";
import { ReadBlog } from "./pages/ReadBlog";
import { CreateBlog } from "./pages/CreateBlog";
import { Profile } from "./pages/Profile";
import { Navbar } from "./components/Navbar";
import { Layout } from "./components/Layout";
import { use, useEffect } from "react";
import axios from "axios";
import { EditBlog } from "./components/EditBlog";

function App() {
  useEffect(() => {
    let token = sessionStorage.getItem("User");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/readblog/:id" element={<ReadBlog />} />
          <Route path="/createblog" element={<CreateBlog />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/edit-post/:id" element={<EditBlog />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
