import { Link } from "react-router-dom"
import { pageData } from "./pageData"


export function Navbar() {
    return (
        <div className="navbar">
            {pageData.map((page) => {
                return (
                    <Link to={page.path} className="navItem">
                        <button>
                            {page.name}
                        </button>
                    </Link>
                )
            })}
            <button onClick={() => {
                sessionStorage.removeItem("User");
                window.location.reload();
            }}>
                Log Out
            </button>
        </div>
    )

}
