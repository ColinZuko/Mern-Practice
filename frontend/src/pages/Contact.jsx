
export function Contact() {

    function handleSubmit(e) {
        //call API function for future implementation
    }

    return (
        <div>
            <h1>Contact Me</h1>
            <p>Have Questions or feedback? Feel free to reach out!</p>
            <p>You can reach out to me at <a href="mailto:example@email.com">example@email.com</a></p>
            <p>Alternatively, you can fill out the form below to get in touch:</p>
            <form onSubmit={handleSubmit}>
                    <label htmlFor="name">Name:</label>
                    <input type="text" id="name" name="name" required />
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" name="email" required />
                    <label htmlFor="message">Message:</label>
                    <textarea id="message" name="message" required></textarea>
                <button type="submit">Send Message</button>
            </form>
        </div>
    )
}