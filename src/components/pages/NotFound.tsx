import { Link } from "react-router-dom";
import '../../css/NotFound.css'

import Layout from '../base/BaseLayout'
import NavbarOption from '../base/Navbar'

export default function NotFound() {

    return (
        <Layout title="Pxosys">
            <div className="d-flex align-items-center justify-content-center vh-100 bg-light text-center">
                <div className="container">
                    <h1 className="display-1 fw-bold text-danger">404</h1>
                    <p className="fs-3"> <span className="text-danger">Opps!</span> Page not found.</p>
                    <p className="lead">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                    <Link to="/" className="btn btn-primary mt-3">Go to Home Page</Link>
                </div>
            </div>
        </Layout>
    );
}
