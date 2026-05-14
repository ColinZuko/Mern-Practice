import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export function Contact() {

    function handleSubmit(e) {
        //call API function for future implementation
    }

    return (
        <div className="w-1/3"> 
            <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">Contact Me</h1>
            <p className="leading-7 [&:not(:first-child)]:mt-2 text-left">Have Questions or feedback? Feel free to reach out!</p>
            <p className="leading-7 [&:not(:first-child)]:mt-2 text-left">You can reach out to me at <a href="mailto:529486@student.saxion.nl" className="text-blue-500 hover:underline">529486@student.saxion.nl</a></p>
            <p className="leading-7 [&:not(:first-child)]:mt-2 text-left">Alternatively, you can fill out the form below to get in touch:</p>
            <form onSubmit={handleSubmit}>
                <Label htmlFor="name" className="text-left my-2">Name:</Label>
                <Input type="text" id="name" name="name" required />
                <Label htmlFor="email" className="text-left my-2">Email:</Label>
                <Input type="email" id="email" name="email" required />
                <Label htmlFor="message" className="text-left my-2">Message:</Label>
                <Textarea id="message" name="message" required />
                <Button type="submit" className="mt-4 cursor-pointer">Send Message</Button>
            </form>
        </div>
    )
}