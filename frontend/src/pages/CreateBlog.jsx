import { useState, useRef, useEffect } from 'react'
import { createPost } from '../api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useNavigate } from 'react-router-dom'
import * as jwt_decode from "jwt-decode"

export function CreateBlog() {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [content, setContent] = useState('')  
    const [file, setFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null) // Holds the visual upload snapshot
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    const MAX_FILE_SIZE = 15000000; // 15MB
    const inputFile = useRef(null)
    const navigate = useNavigate()

    // Clean up memory leaks from your temporary local file URLs
    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    async function handlesubmit(e) {
        e.preventDefault()
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
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
            
            setSuccessMessage('Recipe published successfully!')
            
            // Redirect to dashboard profile page after a brief delay so they see success
            setTimeout(() => {
                navigate('/profile')
            }, 1500)

        } catch (err) {
            console.error(err);
            alert("Failed to save recipe entry.");
            setIsSubmitting(false);
        }
    }

    function handleFileUpload(e) {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
        if (fileExtension !== '.jpg' && fileExtension !== '.jpeg' && fileExtension !== '.png') {
            alert('Please upload a valid image file (jpg, jpeg, png)');
            clearFileInput();
            return;
        }
        if (selectedFile.size > MAX_FILE_SIZE) {
            alert('File size exceeds the maximum limit of 15MB');
            clearFileInput();
            return;
        }

        setFile(selectedFile);
        // Generate a fast memory URL to visually draw the recipe image thumbnail
        setImagePreview(URL.createObjectURL(selectedFile));
    }

    function clearFileInput() {
        setFile(null);
        setImagePreview(null);
        if (inputFile.current) inputFile.current.value = "";
    }

    return (
        <div className="w-full max-w-6xl mx-auto mt-24 px-4 pb-20 antialiased text-stone-900">
            {/* Header Identity Layout Block */}
            <div className="border-b border-stone-200 pb-4 mb-10">
                <h1 className="scroll-m-20 text-3xl font-bold tracking-tight text-balance text-primary">Share Your Favorite Recipe</h1>
                <p className="text-sm text-stone-500 mt-1">Publish your homemade recipe instructions, tips, and photography.</p>
            </div>

            {/* Split Grid Layout Framework */}
            <div className="grid lg:grid-cols-5 gap-12 items-start">
                
                {/* LEFT FLANK: THE WRITING FORM PANELS */}
                <form onSubmit={handlesubmit} className="lg:col-span-3 space-y-8 bg-white border border-stone-200/60 p-8 rounded-3xl shadow-sm">
                    
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-stone-500">Recipe Title</Label>
                        <Input 
                            id="title"
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            maxLength={100} 
                            required 
                            placeholder="e.g., Creamy Lemon Garlic Pasta" 
                            className="bg-stone-50/50 focus-visible:ring-ring rounded-xl py-5"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-stone-500">Short Summary</Label>
                        <Input 
                            id="description"
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                            maxLength={200} 
                            required 
                            placeholder="Briefly describe the dish flavor, cook times, or origins..." 
                            className="bg-stone-50/50 focus-visible:ring-ring rounded-xl py-5"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content" className="text-xs font-bold uppercase tracking-wider text-stone-500">Ingredients & Instructions</Label>
                        <Textarea 
                            id="content"
                            value={content} 
                            onChange={(e) => setContent(e.target.value)} 
                            maxLength={10000} 
                            required 
                            placeholder="List ingredients followed by clear step-by-step instructions..." 
                            className="min-h-[250px] bg-stone-50/50 focus-visible:ring-ring rounded-xl p-4 leading-relaxed whitespace-pre-wrap" 
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-stone-500">Cover Image</Label>
                        
                        {!imagePreview ? (
                            // Interactive empty-state trigger box container
                            <div 
                                onClick={() => inputFile.current?.click()}
                                className="border-2 border-dashed border-stone-200 hover:border-primary bg-stone-50/50 hover:bg-primary/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition duration-150 group"
                            >
                                <svg className="w-8 h-8 text-stone-400 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                <span className="text-sm font-medium text-stone-600 group-hover:text-primary">Click to upload image file</span>
                                <span className="text-xs text-stone-400">PNG, JPG or JPEG up to 15MB</span>
                            </div>
                        ) : (
                            // Interactive image uploaded display preview container
                            <div className="relative rounded-2xl overflow-hidden border border-stone-200 shadow-inner group aspect-[16/10]">
                                <img src={imagePreview} alt="Upload snapshot" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-150">
                                    <Button 
                                        type="button" 
                                        onClick={clearFileInput}
                                        className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs py-2 px-4 rounded-xl"
                                    >
                                        Remove Photo
                                    </Button>
                                </div>
                            </div>
                        )}

                        <input 
                            type="file" 
                            ref={inputFile} 
                            onChange={handleFileUpload} 
                            className="hidden" 
                            accept=".jpg,.jpeg,.png"
                        />
                    </div>

                    <div className="flex items-center gap-4 pt-4 border-t border-stone-100">
                        <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-sm px-6 py-3 shadow-md shadow-emerald-950/10 disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? "Publishing Recipe..." : "Publish Recipe"}
                        </Button>
                        {successMessage && <p className="text-emerald-600 text-sm font-semibold animate-pulse">{successMessage}</p>}
                    </div>
                </form>

                {/* RIGHT FLANK: THE STICKY REAL-TIME CARD PREVIEW BOX */}
                <div className="lg:col-span-2 lg:sticky lg:top-28 space-y-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-400 block px-1">Live Card Feed Preview</span>
                    <div className="border border-stone-200/60 p-4 rounded-3xl bg-stone-50/50 shadow-inner">
                        {/* Mock representation mapping onto your actual non-clipping component style configuration */}
                        <div className="flex flex-col bg-white border border-stone-200/60 rounded-2xl p-4 shadow-sm space-y-4 pointer-events-none opacity-80">
                            <div className="aspect-[16/10] w-full overflow-hidden bg-stone-100 rounded-xl relative">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview thumbnail" classname="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-stone-200/60 text-xs text-stone-400">No Snapshot Loaded</div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">{title || "Untitled Recipe Header"}</h3>
                                <p className="text-xs text-stone-500 line-clamp-2 min-h-8">{description || "Your recipe description will show right here..."}</p>
                            </div>
                            <div className="pt-2 border-t border-stone-100 text-[11px] font-medium text-stone-400 uppercase tracking-wider flex justify-between">
                                <span>Just Now</span>
                                <span>By You</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}